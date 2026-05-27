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

// LÍMITES DE PRODUCCIÓN — anti-abuse y control de coste
// Diseñados para uso humano normal, no para scrapers.
// Si un usuario legítimo se queja, podemos subirlos individualmente.
const LIMITS = {
    guest:   { daily: 5,    monthly: 30,    burst: 2  },  // anónimo: muy bajo
    free:    { daily: 50,   monthly: 800,   burst: 8  },  // normal
    premium: { daily: 500,  monthly: 8000,  burst: 30 }   // pagado: 10x
};

// Burst (anti-flood): máximo X llamadas en 60 segundos
const BURST_WINDOW_MS = 60 * 1000;

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
    'https://kindr-8d660.web.app',
    'https://kindr-8d660.firebaseapp.com',
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
        // checkRevoked: true detecta tokens revocados (logout/password change)
        return await getAuth().verifyIdToken(header.slice(7), true);
    } catch { return null; }
}

/**
 * AUDIT LOG — registra eventos críticos de seguridad para forensics
 * Inmutable: la collection _audit no se puede leer ni modificar desde cliente
 */
async function auditLog(event, data) {
    try {
        await db.collection('_audit').add({
            event,
            ...data,
            ts: FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.warn('[Audit] log error:', e?.message);
    }
}

async function checkRateLimit(uid, userLevel) {
    const limit = LIMITS[userLevel] || LIMITS.free;
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const month = new Date().toISOString().slice(0, 7);
    const ref = db.collection('_ratelimits').doc(uid);

    return db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const data = doc.exists ? doc.data() : {};
        const daily   = (data.date  === today) ? (data.daily   || 0) : 0;
        const monthly = (data.month === month) ? (data.monthly || 0) : 0;

        // Burst protection: contar llamadas en últimos 60s
        const recentCalls = Array.isArray(data.recentCalls) ? data.recentCalls : [];
        const inBurstWindow = recentCalls.filter(ts => (now - ts) < BURST_WINDOW_MS);

        if (inBurstWindow.length >= limit.burst) {
            return { allowed: false, reason: `Demasiadas peticiones (max ${limit.burst}/min). Espera un momento.` };
        }
        if (daily   >= limit.daily)   return { allowed: false, reason: `Límite diario alcanzado (${limit.daily}/día)` };
        if (monthly >= limit.monthly) return { allowed: false, reason: `Límite mensual alcanzado (${limit.monthly}/mes)` };

        // Mantener solo los últimos 20 timestamps (suficiente para burst window)
        const newRecentCalls = [...inBurstWindow, now].slice(-20);

        t.set(ref, {
            uid, date: today, month,
            daily: daily + 1, monthly: monthly + 1,
            recentCalls: newRecentCalls,
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

        // SEGURIDAD: bloquear origins no permitidos también del lado servidor
        // (CORS solo no es suficiente contra requests sin Origin como curl)
        const origin = req.headers.origin;
        if (origin && !ALLOWED_ORIGINS.includes(origin)) {
            auditLog('origin_blocked', { origin, ua: (req.headers['user-agent'] || '').slice(0, 100) });
            return res.status(403).json({ error: 'Origin no autorizado' });
        }

        const decoded = await verifyToken(req);
        if (!decoded) {
            auditLog('auth_failed', { ua: (req.headers['user-agent'] || '').slice(0, 100), origin: origin || 'none' });
            return res.status(401).json({ error: 'No autenticado.' });
        }

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

        // ── CACHE: para EVENTOS (useSearch), normalizar el key quitando el bloque
        //    CONTEXTO FAMILIAR. Así dos users de la misma ciudad comparten respuesta
        //    → 1 sola llamada Grounding sirve a todos los usuarios de Valladolid hoy
        let cacheKey;
        if (useSearch === true) {
            // Strip el bloque CONTEXTO FAMILIAR del prompt (líneas entre etiqueta y \n\n)
            const normalized = clean.replace(/CONTEXTO FAMILIAR DEL USUARIO[\s\S]*?(?=\n\n[A-Z]|$)/, '').trim();
            // Añadir día actual para que se renueve diariamente
            const dayBucket = new Date().toISOString().slice(0, 10);
            cacheKey = promptHash(normalized + '|D:' + dayBucket, expectJson);
        } else {
            cacheKey = promptHash(clean, expectJson);
        }
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
            let groundingFailedAll = false;

            const tryModels = async () => {
                for (const model of GEMINI_MODELS) {
                    try {
                        r = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_KEY.value()}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body),
                            signal: AbortSignal.timeout(MODEL_TIMEOUT_MS)
                        });
                        if (r.ok) { usedModel = model; return; }
                        if (r.status === 429 || r.status === 503) {
                            lastError = { status: r.status, body: (await r.text()).slice(0, 200) };
                            console.warn(`[Gemini] ${model} → ${r.status}`);
                            continue;
                        }
                        lastError = { status: r.status, body: (await r.text()).slice(0, 200) };
                        console.error(`[Gemini] ${model} → ${r.status}`);
                        return;
                    } catch (fetchErr) {
                        lastError = { status: 0, body: fetchErr?.message };
                        continue;
                    }
                }
                groundingFailedAll = true;
            };

            await tryModels();

            // FALLBACK INTELIGENTE: si TODOS los modelos fallaron CON grounding,
            // reintentar SIN grounding (mejor un evento aproximado que nada).
            // El modelo conoce lugares emblemáticos por entrenamiento.
            if (groundingFailedAll && needsSearch) {
                console.warn('[Gemini] Grounding saturado — fallback sin Search');
                delete body.tools;
                body.generationConfig = expectJson
                    ? { ...baseGenConfig, response_mime_type: 'application/json' }
                    : baseGenConfig;
                groundingFailedAll = false;
                r = null; lastError = null;
                await tryModels();
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

        const { questId, familyId, titulo, bonus, verified } = data;
        if (!questId || typeof questId !== 'string' || questId.length > 100) throw new HttpsError('invalid-argument', 'questId inválido');
        if (!familyId || typeof familyId !== 'string' || familyId.length > 100) throw new HttpsError('invalid-argument', 'familyId inválido');

        // Bonus solo aceptado entre 0.5 y 1.5 (verificación)
        const bonusFactor = (typeof bonus === 'number' && bonus >= 0.5 && bonus <= 1.5) ? bonus : 1.0;
        const isVerified = !!verified;

        // SEGURIDAD: validar membresía
        const familia = await db.collection('families').doc(familyId).get();
        if (!familia.exists || !familia.data().miembros.includes(auth.uid)) {
            throw new HttpsError('permission-denied', 'No eres miembro de esta familia.');
        }

        // SEGURIDAD CRÍTICA: leer puntos REALES de la quest desde DB (no confiar en cliente)
        const questDoc = await db.collection('quests').doc(questId).get();
        if (!questDoc.exists) {
            throw new HttpsError('not-found', 'Quest no existe');
        }
        const questData = questDoc.data();
        // La quest debe pertenecer a esta familia O ser una quest pública (familyId == null)
        if (questData.familyId && questData.familyId !== familyId) {
            auditLog('quest_wrong_family', { uid: auth.uid, questId, familyId, questFamily: questData.familyId });
            throw new HttpsError('permission-denied', 'Quest no pertenece a esta familia');
        }
        const basePuntos = (typeof questData.puntos === 'number' && questData.puntos >= 0 && questData.puntos <= 1000)
            ? questData.puntos
            : 50;
        const puntos = Math.round(basePuntos * bonusFactor);

        const hoy = new Date().toISOString().slice(0, 10);
        const registrosRef = db.collection('completadas').doc(familyId).collection('registros');

        const dup = await registrosRef.where('questId', '==', questId).where('fecha', '==', hoy).limit(1).get();
        if (!dup.empty) throw new HttpsError('already-exists', 'Ya completasteis esta misión hoy.');

        const safeTitulo = (typeof titulo === 'string' ? titulo : (questData.titulo || 'Misión')).slice(0, 120);

        await registrosRef.add({
            questId, titulo: safeTitulo, completadoPor: auth.uid,
            fecha: hoy, puntosGanados: puntos, verified: isVerified,
            timestamp: FieldValue.serverTimestamp()
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
// SEGURIDAD: solo el usuario nuevo (auth.uid) puede reclamar su propia referral
// Anti-fraude:
//   1. newUserId DEBE ser auth.uid (no aceptar IDs ajenos)
//   2. El usuario nuevo solo puede tener UNA referral en toda su historia
//   3. Doc _referrals con ID determinístico evita doble pago
//   4. La cuenta nueva debe tener < 24h (anti-cuenta-vieja-reclama-tarde)
exports.rewardReferrer = onCall({ region: 'europe-west1' }, async ({ data, auth }) => {
    if (!auth) throw new HttpsError('unauthenticated', 'Login requerido');

    const { referrerId } = data;
    const newUserId = auth.uid; // FORZADO desde auth — no del cliente

    if (!referrerId || typeof referrerId !== 'string' || referrerId.length > 100) {
        throw new HttpsError('invalid-argument', 'referrerId inválido');
    }
    if (referrerId === newUserId) {
        auditLog('referral_self_attempt', { uid: newUserId, referrerId });
        throw new HttpsError('failed-precondition', 'Self-referral prohibido');
    }

    // 1) Comprobar que la cuenta nueva sea RECIENTE (< 24h)
    const newUserDoc = await db.collection('users').doc(newUserId).get();
    if (!newUserDoc.exists) throw new HttpsError('not-found', 'Usuario inexistente');
    const createdAt = newUserDoc.data().createdAt;
    if (createdAt && createdAt.toMillis) {
        const ageMs = Date.now() - createdAt.toMillis();
        if (ageMs > 24 * 60 * 60 * 1000) {
            throw new HttpsError('failed-precondition', 'Referral expirado (>24h tras registro)');
        }
    }
    // 2) Verificar que este usuario nuevo NO haya reclamado ya OTRA referral
    if (newUserDoc.data().referredBy) {
        throw new HttpsError('already-exists', 'Este usuario ya tiene un referrer asignado');
    }

    // 3) Verificar que el referrer existe
    const referrerDoc = await db.collection('users').doc(referrerId).get();
    if (!referrerDoc.exists) throw new HttpsError('not-found', 'Referrer inexistente');

    // 4) Anti-doble-pago: _referrals doc con ID determinístico
    const referralId = `${referrerId}_${newUserId}`;
    const referralRef = db.collection('_referrals').doc(referralId);
    const existing = await referralRef.get();
    if (existing.exists) throw new HttpsError('already-exists', 'Ya reclamado');

    const REWARD = 1000;
    // Transacción atómica: marcar referral + sumar puntos + marcar referredBy en user nuevo
    await db.runTransaction(async (t) => {
        const fresh = await t.get(referralRef);
        if (fresh.exists) throw new HttpsError('already-exists', 'Race detectada');

        t.set(referralRef, {
            referrerId, newUserId, points: REWARD,
            timestamp: FieldValue.serverTimestamp()
        });
        t.update(db.collection('users').doc(referrerId), {
            points: FieldValue.increment(REWARD),
            weeklyPoints: FieldValue.increment(REWARD)
        });
        t.update(db.collection('users').doc(newUserId), {
            referredBy: referrerId
        });
    });

    return { ok: true, points: REWARD };
});

