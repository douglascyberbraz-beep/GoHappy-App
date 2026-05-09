// ─────────────────────────────────────────────────────────────────────────────
// GoHappy — Configuración de Firebase
// ─────────────────────────────────────────────────────────────────────────────
// NOTA TÉCNICA: La Firebase Web API Key es PUBLIC BY DESIGN.
// La seguridad de Firebase se basa en Firestore Security Rules + Auth,
// NO en ocultar esta clave. Ver: https://firebase.google.com/docs/projects/api-keys
// ─────────────────────────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey:            "AIzaSyDppR0-A8bEKT1sjJDst1N6uZV-EsTLSYo",
    authDomain:        "kindr-8d660.firebaseapp.com",
    projectId:         "kindr-8d660",
    storageBucket:     "kindr-8d660.firebasestorage.app",
    messagingSenderId: "552831875210",
    appId:             "1:552831875210:web:1af5583c40e0d62bbf9573",
    measurementId:     "G-2F3HNE2L5P"
};

// ─────────────────────────────────────────────────────────────────────────────
// SEGURIDAD — Gemini API Proxy
// La clave de Gemini NUNCA está en el código cliente.
// Todas las llamadas pasan por nuestro Cloud Function autenticado.
//
// DEPLOY del proxy:
//   1. cd functions && npm install
//   2. firebase functions:config:set gemini.key="TU_CLAVE_AQUI"
//   3. firebase deploy --only functions
//
// Una vez desplegado, activa el proxy:
//   window.GEMINI_PROXY_ACTIVE = true  (ya está en true por defecto)
// ─────────────────────────────────────────────────────────────────────────────

// URL del Cloud Function proxy (Gen 2 = Cloud Run, region europe-west1)
window.GEMINI_PROXY_URL = 'https://geminiproxy-cwdjjopdga-ew.a.run.app';

// true = usar proxy seguro (producción) | false = usar mock data (sin función desplegada)
window.GEMINI_PROXY_ACTIVE = true;

// Clave legacy eliminada — NO PONER CLAVES AQUÍ
// Si el proxy no está desplegado todavía, la app mostrará datos de demostración
// hasta que actives las Cloud Functions.
window.GEMINI_KEY = null; // <-- explícitamente null: sin acceso directo

// ─────────────────────────────────────────────────────────────────────────────
// Inicializar Firebase
// ─────────────────────────────────────────────────────────────────────────────
if (window.firebase) {
    try {
        firebase.initializeApp(firebaseConfig);
        window.GoHappyFirebaseApp = firebase.app();
        window.GoHappyAuthReal    = firebase.auth();
        window.GoHappyDB          = firebase.firestore();

        // Persistencia offline (permite usar la app sin conexión)
        window.GoHappyDB.enablePersistence({ synchronizeTabs: true }).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('[GoHappy] Persistencia: múltiples pestañas abiertas.');
            } else if (err.code === 'unimplemented') {
                console.warn('[GoHappy] Persistencia offline no soportada en este navegador.');
            }
        });

        // Dominios autorizados de Firebase Auth (añadir en Firebase Console si cambian)
        // - douglascyberbraz-beep.github.io
        // - kindr-8d660.web.app
        // - localhost (solo dev)

        console.log('[GoHappy] Firebase inicializado correctamente ✓');
    } catch (e) {
        console.error('[GoHappy] Error inicializando Firebase:', e);
    }
} else {
    console.error('[GoHappy] Error: Firebase SDK no cargado.');
}
