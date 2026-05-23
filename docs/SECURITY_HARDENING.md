# GoHappy Security Hardening — v6.0.0

> **Estado:** Producción endurecida. Última auditoría: 2026-05-19.
> **Modelo de amenazas cubierto:** XSS, IDOR, privilege escalation, data leakage, abuse/spam, session hijacking, anti-bot, GDPR de menores.

---

## ✅ Capas de defensa activas

### 1. Network / Transport
| Defensa | Estado | Dónde |
|---|---|---|
| HTTPS forzado (HSTS preload) | ✅ | `firebase.json` headers |
| TLS 1.3 (Firebase/GitHub Pages default) | ✅ | infra |

### 2. Application headers
| Defensa | Estado | Notas |
|---|---|---|
| Content-Security-Policy (CSP) | ✅ | meta tag + `firebase.json` |
| X-Content-Type-Options: nosniff | ✅ | meta tag |
| X-Frame-Options: DENY | ✅ | `firebase.json` (no se puede vía meta) |
| Referrer-Policy: strict-origin-when-cross-origin | ✅ | meta tag |
| Permissions-Policy (camera/mic/geo controlados) | ✅ | meta tag |

> **Nota:** GitHub Pages no soporta custom HTTP headers, así que los meta-tags son la única defensa allí. **Mover hosting a Firebase Hosting** activa todos los headers HTTP.

### 3. Auth & Sesión
| Defensa | Estado |
|---|---|
| Firebase Auth con verifyIdToken(`checkRevoked: true`) | ✅ |
| HMAC-like integrity del localStorage (SubtleCrypto SHA-256) | ✅ `session_guard.js` |
| Auto-logout por inactividad (30 min) | ✅ |
| Logout sincronizado entre pestañas (BroadcastChannel) | ✅ |
| `window.GoHappyAuth` protegido contra reasignación | ✅ |
| Logout limpia localStorage + sessionStorage + caches | ✅ |

### 4. Firestore Rules
| Defensa | Estado |
|---|---|
| `safeString()` rechaza `<` y `>` (anti-XSS server) | ✅ |
| `isValidImageDataURI()` valida magic bytes JPEG/PNG/WebP | ✅ |
| Moments lectura restringida por familia/visibility | ✅ CRITICAL fix |
| Comments heredan privacidad del moment padre | ✅ CRITICAL fix |
| Family update: 3 casos (admin/join/self-leave) | ✅ |
| Activity solo del propio user | ✅ |
| Cap número de fields por doc (`keys().size() <= N`) | ✅ |
| Collections `_*` totalmente bloqueadas a cliente | ✅ |

### 5. Cloud Functions
| Defensa | Estado |
|---|---|
| `verifyIdToken` con `checkRevoked: true` | ✅ |
| CORS whitelist estricta | ✅ |
| Origin check explícito server-side (no solo CORS) | ✅ |
| Rate limits realistas (5/50/500 día por tier) | ✅ |
| Burst protection (max N/min) | ✅ |
| `completeQuest` lee puntos REALES de DB (no del cliente) | ✅ CRITICAL fix |
| `rewardReferrer` forza newUserId desde auth.uid + anti-doble | ✅ CRITICAL fix |
| Audit log de eventos sospechosos (`_audit` collection) | ✅ |
| Prompt injection blocker en sanitizePrompt | ✅ |

### 6. GDPR / Privacidad
| Defensa | Estado |
|---|---|
| Moments públicos requieren checkbox GDPR menores | ✅ |
| Datos personales (nickname/email) escapados en render | ✅ |
| Datos privados de familia solo leíbles por miembros | ✅ |
| Logout borra rastros completos | ✅ |
| Cookies banner GDPR | ✅ |
| Política de privacidad / Cookies / Legal documentos | ✅ |

---

## ⚠️ Configuración manual pendiente (alta prioridad)

### A. App Check con reCAPTCHA v3
**Estado:** infraestructura cliente lista (`config.js`), key no registrada.

**Pasos para activar:**
1. https://console.cloud.google.com/security/recaptcha → Crear key v3
2. Firebase Console → App Check → Web app → Add provider reCAPTCHA v3
3. Pegar la site key en `js/config.js`:
   ```js
   window.RECAPTCHA_V3_SITE_KEY = '6Lc...tu_key_aqui';
   ```
4. Firebase Console → App Check → Enforce en cada Cloud Function

**Impacto:** bloquea curl/bots/scrapers que no usen la app real.

### B. Restricciones de API Key (Firebase Web Key)
**Estado:** key pública (by-design), pero sin restricciones de dominio.

**Pasos:**
1. https://console.cloud.google.com/apis/credentials
2. Editar `AIzaSyDppR0-A8bEKT1sjJDst1N6uZV-EsTLSYo` (Browser key)
3. Application restrictions → HTTP referrers
4. Añadir: `https://douglascyberbraz-beep.github.io/*`, `https://gohappy-8d660.web.app/*`, `https://gohappy-8d660.firebaseapp.com/*`

**Impacto:** key inutilizable desde otros dominios aunque se publique.

### C. Migrar hosting de GitHub Pages → Firebase Hosting
**Por qué:** GitHub Pages NO soporta custom HTTP headers (HSTS, CSP, X-Frame-Options).
Firebase Hosting ya está configurado en `firebase.json` con todos los headers.

```bash
firebase deploy --only hosting:app
```

Después actualizar dominio público.

---

## 🔍 Auditoría continua

### Logs de seguridad (Firestore `_audit`)
Eventos capturados:
- `origin_blocked` — request desde dominio no permitido
- `auth_failed` — token Firebase inválido
- `referral_self_attempt` — intento de auto-referral
- `quest_wrong_family` — quest de otra familia

Consultar (admin SDK):
```js
db.collection('_audit').orderBy('ts', 'desc').limit(50).get()
```

### Comandos útiles
```bash
# Verificar reglas Firestore vigentes
firebase firestore:rules:get

# Ver últimos deploys
firebase functions:log --only geminiProxy -n 20

# Verificar sintaxis local
node --check js/services/*.js
```

---

## 🚨 Modelo de amenazas — qué NO cubrimos (por ahora)

- **End-to-end encryption** de moments privados (Firebase Admin tiene acceso técnico)
- **2FA / MFA** para login (Firebase Auth lo soporta, no activado)
- **Análisis de imágenes uploaded** para detectar contenido inapropiado (necesita Vision API)
- **DDoS a nivel de red** (mitigado por Cloud Run autoscaling, no por nuestro código)
- **Phishing de cuentas Google del usuario** (fuera de nuestro alcance)
- **Ataques físicos al dispositivo** (Firebase Auth requiere desbloqueo del device)

Si necesitamos cubrir alguno → roadmap separado.
