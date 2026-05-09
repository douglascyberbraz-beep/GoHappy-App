/**
 * GoHappy — Firebase Cloud Functions v2
 * Proxy seguro para Gemini API. La clave NUNCA llega al cliente.
 * Node 18 · firebase-functions v5 · europe-west1
 */

const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// Clave Gemini como Secret de Firebase (nunca en código)
const GEMINI_KEY = defineSecret('GEMINI_KEY');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Límites por plan
const LIMITS = {
    guest:   { daily: 3,   monthly: 20  },
    free:    { daily: 10,  monthly: 100 },
    premium: { daily: 50,  monthly: 500 }
};

// CORS — solo nuestros dominios
const ALLOWED_ORIGINS = [
    'https://kindr-8d660.web.app',
    'https://kindr-8d660.firebaseapp.com',
    'https://douglascyberbraz-beep.github.io',
    'http://localhost:3000',
    'http://localhost:8080'
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function setCorsHeaders(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');
    res.set('Vary', 'Origin');
}

async function verifyToken(req) {
    const { getAuth } = require('firebase-admin/auth');
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return null;
    try {
        return await getAuth().verifyIdToken(header.slice(7));
    } catch { return null; }
}

async function checkRateLimit(uid, userLevel) {
    const limit = LIMITS[userLevel] || LIMITS.free;
    const today = new Date().toISOString().slice(0, 10);
    const month = new Date().toISOString().slice(0, 7);
    const ref = db.collection('_ratelimits').doc(uid);

    return db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const data = doc.exists ? doc.data() : {};
        const daily   = (data.date  === today) ? (data.daily   || 0) : 0;
        const monthly = (data.month === month) ? (data.monthly || 0) : 0;

        if (daily   >= limit.daily)   return { allowed: false, reason: `Límite diario alcanzado (${limit.daily}/día)` };
        if (monthly >= limit.monthly) return { allowed: false, reason: `Límite mensual alcanzado (${limit.monthly}/mes)` };

        t.set(ref, {
            uid, date: today, month,
            daily: daily + 1, monthly: monthly + 1,
            lastCall: FieldValue.serverTimestamp()
        }, { merge: true });

        return { allowed: true, remaining: limit.daily - daily - 1 };
    });
}

function sanitizePrompt(prompt) {
    if (typeof prompt !== 'string' || prompt.length > 8000) return null;
    const blocked = [
        /ignore (previous|above|all) instructions/i,
        /you are now/i, /pretend (you are|to be)/i,
        /act as (a|an) (different|new)/i, /\bDAN\b/, /jailbreak/i
    ];
    if (blocked.some(p => p.test(prompt))) return null;
    return prompt.trim();
}

// ── Gemini Proxy ──────────────────────────────────────────────────────────────
// invoker: 'public' permite que el navegador llame sin IAM auth.
// La autenticación real es por Firebase Auth Bearer token (ver verifyToken)
exports.geminiProxy = onRequest(
    { region: 'europe-west1', timeoutSeconds: 30, memory: '256MiB', secrets: [GEMINI_KEY], invoker: 'public' },
    async (req, res) => {
        setCorsHeaders(req, res);
        if (req.method === 'OPTIONS') return res.status(204).send('');
        if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

        const decoded = await verifyToken(req);
        if (!decoded) return res.status(401).json({ error: 'No autenticado.' });

        const uid = decoded.uid;

        let userLevel = decoded.firebase?.sign_in_provider === 'anonymous' ? 'guest' : 'free';
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const lvl = userDoc.data().level || '';
                if (lvl.includes('Oro') || lvl.includes('Premium')) userLevel = 'premium';
            }
        } catch {}

        const rate = await checkRateLimit(uid, userLevel);
        if (!rate.allowed) return res.status(429).json({ error: rate.reason });

        const { prompt, expectJson = true } = req.body || {};
        const clean = sanitizePrompt(prompt);
        if (!clean) return res.status(400).json({ error: 'Prompt inválido.' });

        try {
            const body = {
                contents: [{ parts: [{ text: clean }] }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                ]
            };
            if (expectJson) body.generationConfig = { response_mime_type: 'application/json' };

            const r = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY.value()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(25000)
            });

            if (!r.ok) {
                console.error('[Gemini] Error:', r.status, await r.text());
                return res.status(502).json({ error: 'Error en IA. Intenta de nuevo.' });
            }

            db.collection('_ailogs').add({
                uid, model: 'gemini-2.0-flash', expectJson, success: true,
                remainingToday: rate.remaining,
                timestamp: FieldValue.serverTimestamp()
            }).catch(() => {});

            res.set('X-RateLimit-Remaining', rate.remaining);
            return res.status(200).json(await r.json());

        } catch (e) {
            console.error('[geminiProxy]', e);
            return res.status(500).json({ error: 'Error interno.' });
        }
    }
);

// ── Completar Quest ───────────────────────────────────────────────────────────
exports.completeQuest = onCall(
    { region: 'europe-west1' },
    async ({ data, auth }) => {
        if (!auth) throw new HttpsError('unauthenticated', 'Login requerido');

        const { questId, familyId, puntos, titulo } = data;
        if (!questId || typeof questId !== 'string') throw new HttpsError('invalid-argument', 'questId inválido');
        if (!familyId || typeof familyId !== 'string') throw new HttpsError('invalid-argument', 'familyId inválido');
        if (typeof puntos !== 'number' || puntos < 0 || puntos > 500) throw new HttpsError('invalid-argument', 'puntos inválidos');

        const hoy = new Date().toISOString().slice(0, 10);
        const registrosRef = db.collection('completadas').doc(familyId).collection('registros');

        const dup = await registrosRef.where('questId', '==', questId).where('fecha', '==', hoy).limit(1).get();
        if (!dup.empty) throw new HttpsError('already-exists', 'Ya completasteis esta misión hoy.');

        const familia = await db.collection('families').doc(familyId).get();
        if (!familia.exists || !familia.data().miembros.includes(auth.uid)) {
            throw new HttpsError('permission-denied', 'No eres miembro de esta familia.');
        }

        await registrosRef.add({
            questId, titulo: titulo || 'Misión', completadoPor: auth.uid,
            fecha: hoy, puntosGanados: puntos, timestamp: FieldValue.serverTimestamp()
        });

        await db.collection('users').doc(auth.uid).update({
            points: FieldValue.increment(puntos),
            weeklyPoints: FieldValue.increment(puntos)
        });

        await db.collection('families').doc(familyId).update({
            puntosTotales: FieldValue.increment(puntos)
        });

        return { ok: true, puntos };
    }
);

// ── Validar Referido ──────────────────────────────────────────────────────────
exports.validateReferral = onCall({ region: 'europe-west1' }, async ({ data, auth }) => {
    if (!auth) throw new HttpsError('unauthenticated', 'Login requerido');
    const { code } = data;
    if (!code || typeof code !== 'string' || code.length > 20) throw new HttpsError('invalid-argument', 'Código inválido');

    const snap = await db.collection('users').where('referralCode', '==', code.toUpperCase().trim()).limit(1).get();
    if (snap.empty) return { valid: false };
    const ref = snap.docs[0];
    if (ref.id === auth.uid) return { valid: false };
    return { valid: true, referrerId: ref.id };
});

// ── Premiar Referidor ─────────────────────────────────────────────────────────
exports.rewardReferrer = onCall({ region: 'europe-west1' }, async ({ data, auth }) => {
    if (!auth) throw new HttpsError('unauthenticated', 'Login requerido');
    const { referrerId, newUserId } = data;
    if (!referrerId || referrerId === auth.uid) return { ok: false };

    const REWARD = 500;
    const ref = db.collection('users').doc(referrerId);
    await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) return;
        t.update(ref, { points: FieldValue.increment(REWARD), weeklyPoints: FieldValue.increment(REWARD) });
    });

    await db.collection('_referrals').doc(`${referrerId}_${newUserId}`).set({
        referrerId, newUserId, points: REWARD, timestamp: FieldValue.serverTimestamp()
    });

    return { ok: true, points: REWARD };
});
