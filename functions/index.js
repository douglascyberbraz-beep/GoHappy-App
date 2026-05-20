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

// Modelos: FLASH-LITE PRIMERO porque es 2-3x más rápido y tiene 10x más cuota.
// La calidad para nuestro caso (planes/eventos) es suficiente.
// Solo subimos a flash regular si lite falla.
const GEMINI_MODELS = [
    'gemini-2.5-flash-lite',       // ~1-2s respuesta, máxima cuota → DEFAULT
    'gemini-flash-lite-latest',    // alias estable lite
    'gemini-2.5-flash',            // fallback calidad alta (~3-5s)
    'gemini-flash-latest'          // último fallback
];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Cache TTL — respuestas idénticas se sirven desde caché
// Eventos y planes son muy estables → 6h es razonable y reduce llamadas drásticamente
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

// Timeout por modelo (corto para fallar rápido y probar el siguiente)
const MODEL_TIMEOUT_MS = 12000;

// BETA TEST MODE: TODOS los usuarios disfrutan PREMIUM ilimitado
// Al lanzar producción, restablecer límites por plan
const LIMITS = {
    guest:   { daily: 9999, monthly: 99999 },
    free:    { daily: 9999, monthly: 99999 },
    premium: { daily: 9999, monthly: 99999 }
};

// Hash simple para cachear por prompt+expectJson
function promptHash(prompt, expectJson) {
    const str = (expectJson ? 'J:' : 'T:') + prompt;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

// CORS — solo nuestros dominios
const ALLOWED_ORIGINS = [
    'https://gohappy-8d660.web.app',
    'https://gohappy-8d660.firebaseapp.com',
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

        const { prompt, expectJson = true, useSearch } = req.body || {};
        const clean = sanitizePrompt(prompt);
        if (!clean) return res.status(400).json({ error: 'Prompt inválido.' });

        // ── CACHE: buscar respuesta cacheada para este prompt ──
        const cacheKey = promptHash(clean, expectJson);
        try {
            const cacheDoc = await db.collection('_aicache').doc(cacheKey).get();
            if (cacheDoc.exists) {
                const cached = cacheDoc.data();
                const age = Date.now() - (cached.savedAt?.toMillis?.() || 0);
                if (age < CACHE_TTL_MS && cached.response) {
                    res.set('X-Cache', 'HIT');
                    res.set('X-RateLimit-Remaining', rate.remaining);
                    return res.status(200).json(cached.response);
                }
            }
        } catch (e) { /* cache miss, continuar */ }

        // Search Grounding consume cuota baja en tier free → solo activar cuando es ESENCIAL.
        // Prioridad 1: el cliente lo pide explícitamente con `useSearch: true`.
        // Prioridad 2 (legacy): inferir por keywords MUY estrictos (solo eventos/agendas reales).
        let needsSearch;
        if (typeof useSearch === 'boolean') {
            needsSearch = useSearch;
        } else {
            needsSearch = /\beventos? real(es)?\b|\bagenda cultural\b|\bevents? near\b|\bconciertos?\b|\bfestival\b|\bcuentacuentos\b|\bmarionetas\b|\bferia\b|\bexposici[oó]n\b|\btalleres? infantiles?\b/i.test(clean);
        }

        try {
            let finalPrompt = clean;
            // Si pedimos JSON Y necesitamos search, recordar al modelo formato estricto
            if (needsSearch && expectJson) {
                finalPrompt = clean + '\n\nIMPORTANTE: Responde EXCLUSIVAMENTE con JSON válido (array u objeto). NO uses markdown, NO añadas comentarios ni texto antes o después. Empieza directamente con [ o {.';
            }

            const body = {
                contents: [{ parts: [{ text: finalPrompt }] }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                ]
            };

            // GenerationConfig optimizada para velocidad
            const baseGenConfig = {
                temperature: 0.7,          // creatividad moderada (más rápido que 0.9+)
                topP: 0.85,                 // limita exploración → respuestas más rápidas
                maxOutputTokens: 2048,      // suficiente para 6 eventos/planes JSON
                candidateCount: 1
            };

            if (needsSearch) {
                // Activar Search Grounding (no compatible con response_mime_type=json)
                body.tools = [{ googleSearch: {} }];
                body.generationConfig = baseGenConfig;
            } else if (expectJson) {
                body.generationConfig = { ...baseGenConfig, response_mime_type: 'application/json' };
            } else {
                body.generationConfig = baseGenConfig;
            }

            // Intentar cada modelo en orden hasta encontrar uno disponible
            let r = null;
            let usedModel = null;
            let lastError = null;

            for (const model of GEMINI_MODELS) {
                try {
                    r = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_KEY.value()}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                        signal: AbortSignal.timeout(MODEL_TIMEOUT_MS)
                    });

                    if (r.ok) {
                        usedModel = model;
                        break;
                    }

                    // 429 (rate limit) o 503 (no disponible) → intentar siguiente modelo
                    if (r.status === 429 || r.status === 503) {
                        const errBody = await r.text();
                        lastError = { status: r.status, body: errBody.slice(0, 200) };
                        console.warn(`[Gemini] ${model} → ${r.status}, intentando siguiente`);
                        continue;
                    }

                    // 400, 401, otros → error real, no retry
                    const errBody = await r.text();
                    lastError = { status: r.status, body: errBody.slice(0, 200) };
                    console.error(`[Gemini] ${model} → ${r.status}: ${errBody.slice(0, 200)}`);
                    break;
                } catch (fetchErr) {
                    console.warn(`[Gemini] ${model} fetch error:`, fetchErr?.message);
                    lastError = { status: 0, body: fetchErr?.message };
                    continue;
                }
            }

            // Ningún modelo funcionó
            if (!r || !r.ok) {
                if (lastError?.status === 429) {
                    return res.status(429).json({
                        error: 'Todos los modelos IA están saturados. Reintenta en 1 minuto.',
                        retryAfter: 60
                    });
                }
                if (lastError?.status === 400) {
                    return res.status(400).json({ error: 'Petición a IA inválida.' });
                }
                return res.status(502).json({
                    error: 'IA no disponible temporalmente. Intenta de nuevo.',
                    debug: lastError?.status || 'unknown'
                });
            }

            const data = await r.json();

            // Guardar en caché solo respuestas válidas
            if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                db.collection('_aicache').doc(cacheKey).set({
                    response: data,
                    savedAt: FieldValue.serverTimestamp(),
                    expectJson
                }).catch(() => {});
            }

            db.collection('_ailogs').add({
                uid, model: usedModel, expectJson, success: true,
                remainingToday: rate.remaining,
                timestamp: FieldValue.serverTimestamp()
            }).catch(() => {});

            res.set('X-Cache', 'MISS');
            res.set('X-Model', usedModel);
            res.set('X-RateLimit-Remaining', rate.remaining);
            return res.status(200).json(data);

        } catch (e) {
            console.error('[geminiProxy] Exception:', e?.message || e);
            return res.status(500).json({ error: 'Error interno del servidor IA.' });
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

    const REWARD = 1000;
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
