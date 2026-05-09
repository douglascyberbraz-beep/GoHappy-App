/**
 * GoHappy — Firebase Cloud Functions
 * Proxy seguro para Gemini API. La clave NUNCA llega al cliente.
 *
 * DEPLOY: firebase deploy --only functions
 * REQUIRES: Firebase Blaze plan (necesario para llamadas de red externas)
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();
const db = admin.firestore();

// ─── Configuración ──────────────────────────────────────────────────────────
const GEMINI_KEY = functions.config().gemini.key; // firebase functions:config:set gemini.key="TU_CLAVE"
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Límites por plan de usuario
const LIMITS = {
    guest:   { daily: 3,  monthly: 20  },
    free:    { daily: 10, monthly: 100 },
    premium: { daily: 50, monthly: 500 }
};

// CORS permitido solo desde nuestros dominios
const ALLOWED_ORIGINS = [
    'https://douglascyberbraz-beep.github.io',
    'https://kindr-8d660.web.app',
    'https://kindr-8d660.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:8080'
];

// ─── Helper CORS ────────────────────────────────────────────────────────────
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

// ─── Helper: verificar token Firebase Auth ───────────────────────────────────
async function verifyToken(req) {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    try {
        return await admin.auth().verifyIdToken(token);
    } catch (e) {
        return null;
    }
}

// ─── Helper: rate limiting en Firestore ─────────────────────────────────────
async function checkRateLimit(uid, userLevel) {
    const limit = LIMITS[userLevel] || LIMITS.free;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const month = new Date().toISOString().slice(0, 7);  // YYYY-MM

    const ref = db.collection('_ratelimits').doc(uid);

    return await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const data = doc.exists ? doc.data() : {};

        const dailyCount  = (data.date  === today) ? (data.daily  || 0) : 0;
        const monthlyCount = (data.month === month) ? (data.monthly || 0) : 0;

        if (dailyCount >= limit.daily)   return { allowed: false, reason: `Límite diario alcanzado (${limit.daily}/día)` };
        if (monthlyCount >= limit.monthly) return { allowed: false, reason: `Límite mensual alcanzado (${limit.monthly}/mes)` };

        t.set(ref, {
            uid,
            date:    today,
            month:   month,
            daily:   dailyCount + 1,
            monthly: monthlyCount + 1,
            lastCall: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return { allowed: true, remaining: limit.daily - dailyCount - 1 };
    });
}

// ─── Helper: validar y sanitizar el prompt ──────────────────────────────────
function sanitizePrompt(prompt) {
    if (typeof prompt !== 'string') return null;
    if (prompt.length > 8000) return null; // Máximo 8k chars
    // Bloquear intentos de prompt injection básicos
    const blocked = [
        /ignore (previous|above|all) instructions/i,
        /you are now/i,
        /pretend (you are|to be)/i,
        /act as (a|an) (different|new)/i,
        /\bDAN\b/,
        /jailbreak/i
    ];
    for (const pattern of blocked) {
        if (pattern.test(prompt)) return null;
    }
    return prompt.trim();
}

// ─── Cloud Function principal ────────────────────────────────────────────────
exports.geminiProxy = functions
    .region('europe-west1') // Más cerca de España/Latam
    .runWith({ timeoutSeconds: 30, memory: '256MB' })
    .https.onRequest(async (req, res) => {
        setCorsHeaders(req, res);

        // Preflight
        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Método no permitido' });
            return;
        }

        // 1. Verificar autenticación
        const decodedToken = await verifyToken(req);
        if (!decodedToken) {
            res.status(401).json({ error: 'No autenticado. Inicia sesión para usar GoHappy IA.' });
            return;
        }

        const uid = decodedToken.uid;

        // 2. Obtener nivel del usuario
        let userLevel = 'free';
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (userDoc.exists) {
                const level = userDoc.data().level || '';
                if (level.includes('Oro') || level.includes('Premium')) userLevel = 'premium';
                if (decodedToken.firebase?.sign_in_provider === 'anonymous') userLevel = 'guest';
            }
        } catch (e) { /* usar 'free' como default */ }

        // 3. Rate limiting
        const rateCheck = await checkRateLimit(uid, userLevel);
        if (!rateCheck.allowed) {
            res.status(429).json({ error: rateCheck.reason });
            return;
        }

        // 4. Extraer y validar el prompt
        const { prompt, expectJson = true } = req.body || {};
        const cleanPrompt = sanitizePrompt(prompt);
        if (!cleanPrompt) {
            res.status(400).json({ error: 'Prompt inválido o demasiado largo.' });
            return;
        }

        // 5. Llamar a Gemini con la clave SEGURA (solo en el servidor)
        try {
            const requestBody = {
                contents: [{ parts: [{ text: cleanPrompt }] }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH',      threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                ]
            };
            if (expectJson) {
                requestBody.generationConfig = { response_mime_type: 'application/json' };
            }

            const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                timeout: 25000
            });

            if (!geminiRes.ok) {
                const errText = await geminiRes.text();
                console.error('[Gemini] Error:', geminiRes.status, errText);
                res.status(502).json({ error: 'Error en servicio de IA. Intenta de nuevo.' });
                return;
            }

            const data = await geminiRes.json();

            // Log de uso (sin el prompt — privacidad)
            db.collection('_ailogs').add({
                uid,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                model: 'gemini-1.5-flash',
                expectJson,
                success: true,
                remainingToday: rateCheck.remaining
            }).catch(() => {});

            res.set('X-RateLimit-Remaining', rateCheck.remaining);
            res.status(200).json(data);

        } catch (e) {
            console.error('[geminiProxy] Error inesperado:', e);
            res.status(500).json({ error: 'Error interno del servidor.' });
        }
    });

// ─── Cloud Function: completar quest y premiar puntos (seguro, server-side) ──
exports.completeQuest = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login requerido');

        const uid = context.auth.uid;
        const { questId, familyId, puntos, titulo } = data;

        if (!questId || typeof questId !== 'string') throw new functions.https.HttpsError('invalid-argument', 'questId inválido');
        if (!familyId || typeof familyId !== 'string') throw new functions.https.HttpsError('invalid-argument', 'familyId inválido');
        if (typeof puntos !== 'number' || puntos < 0 || puntos > 500) throw new functions.https.HttpsError('invalid-argument', 'puntos inválidos');

        const hoy = new Date().toISOString().slice(0, 10);

        // Anti-duplicado: verificar que no está ya completada hoy
        const registrosRef = db.collection('completadas').doc(familyId).collection('registros');
        const yaCompletada = await registrosRef
            .where('questId', '==', questId)
            .where('fecha', '==', hoy)
            .limit(1)
            .get();

        if (!yaCompletada.empty) {
            throw new functions.https.HttpsError('already-exists', 'Ya completasteis esta misión hoy.');
        }

        // Verificar que el usuario es miembro de la familia
        const familiaDoc = await db.collection('families').doc(familyId).get();
        if (!familiaDoc.exists || !familiaDoc.data().miembros.includes(uid)) {
            throw new functions.https.HttpsError('permission-denied', 'No eres miembro de esta familia.');
        }

        // Registrar la completación
        await registrosRef.add({
            questId,
            titulo: titulo || 'Misión Completada',
            completadoPor: uid,
            fecha: hoy,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            puntosGanados: puntos
        });

        // Premiar puntos al usuario (incremento atómico, no manipulable)
        await db.collection('users').doc(uid).update({
            points: admin.firestore.FieldValue.increment(puntos),
            weeklyPoints: admin.firestore.FieldValue.increment(puntos)
        });

        // Sumar puntos al total de la familia
        await db.collection('families').doc(familyId).update({
            puntosTotales: admin.firestore.FieldValue.increment(puntos)
        });

        return { ok: true, puntos };
    });

// ─── Cloud Function: validar código de referido (seguro, server-side) ────────
exports.validateReferral = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login requerido');

        const { code } = data;
        if (!code || typeof code !== 'string' || code.length > 20) {
            throw new functions.https.HttpsError('invalid-argument', 'Código inválido');
        }

        const snap = await db.collection('users')
            .where('referralCode', '==', code.toUpperCase().trim())
            .limit(1)
            .get();

        if (snap.empty) return { valid: false };

        const referrer = snap.docs[0];
        if (referrer.id === context.auth.uid) return { valid: false }; // No auto-referido

        return { valid: true, referrerId: referrer.id };
    });

// ─── Cloud Function: premiar referidor (seguro, server-side) ─────────────────
exports.rewardReferrer = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login requerido');

        const { referrerId, newUserId } = data;
        if (!referrerId || referrerId === context.auth.uid) return { ok: false };

        // Anti-duplicado: verificar que el newUser no haya sido ya referido por este referrer
        const REWARD_POINTS = 500;
        const ref = db.collection('users').doc(referrerId);

        await db.runTransaction(async (t) => {
            const doc = await t.get(ref);
            if (!doc.exists) return;
            t.update(ref, {
                points: admin.firestore.FieldValue.increment(REWARD_POINTS),
                weeklyPoints: admin.firestore.FieldValue.increment(REWARD_POINTS)
            });
        });

        // Log anti-duplicado
        await db.collection('_referrals').doc(`${referrerId}_${newUserId}`).set({
            referrerId, newUserId,
            points: REWARD_POINTS,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return { ok: true, points: REWARD_POINTS };
    });
