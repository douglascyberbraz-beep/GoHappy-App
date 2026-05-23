# GoHappy Family — Checklist de Pre-Lanzamiento

> **Versión actual:** v6.0.0 (beta endurecida)
> **Objetivo:** llegar a App Store + Google Play con confianza total.
> **Tiempo estimado total:** 12–20 horas distribuidas en 2–3 semanas.

Marca cada item al completarlo. Si bloqueas en alguno, pasa al siguiente.

---

## 🔴 FASE 1 — SEGURIDAD HARDENING FINAL
> Hacer **1 semana antes** del envío a tiendas.

### 1.1 Migrar hosting GitHub Pages → Firebase Hosting (20 min + 24h DNS)
- [ ] Verificar que `firebase.json` ya tiene la config de hosting `app`
- [ ] Deploy: `firebase deploy --only hosting:app`
- [ ] Comprobar dominios live:
  - `https://gohappy-8d660.web.app/` ✅
  - `https://gohappy-8d660.firebaseapp.com/` ✅
- [ ] (Opcional) Configurar dominio custom `app.gohappyfamily.com`:
  - Firebase Console → Hosting → Add custom domain
  - Añadir TXT/A records en tu proveedor DNS
  - Esperar verificación (15 min – 24h)
- [ ] Actualizar el README y la landing apuntando al nuevo dominio
- [ ] **Por qué:** GitHub Pages no soporta HSTS preload ni X-Frame-Options HTTP reales

### 1.2 App Check con reCAPTCHA v3 (30 min)
- [ ] Ir a https://console.cloud.google.com/security/recaptcha
- [ ] Crear key v3 → asignar dominios: `*.firebaseapp.com`, `*.web.app`, tu dominio custom
- [ ] Copiar la **site key** (no la secret)
- [ ] Firebase Console → App Check → Web app → Add provider reCAPTCHA v3 → pegar key
- [ ] Editar `js/config.js`:
  ```js
  window.RECAPTCHA_V3_SITE_KEY = '6Lc...tu_key_real';
  ```
- [ ] Commit + push + deploy hosting
- [ ] **Esperar 24-48h** observando "Unverified requests" en App Check console
- [ ] Cuando 99% sea "Verified": Firebase Console → App Check → cada función → **Enforce**
- [ ] **Por qué:** bloquea curl/bots/scrapers que no usen tu app real

### 1.3 Restringir Firebase Web API Key (5 min)
- [ ] https://console.cloud.google.com/apis/credentials
- [ ] Localizar `AIzaSyDppR0-A8bEKT1sjJDst1N6uZV-EsTLSYo` (Browser key)
- [ ] Application restrictions → **HTTP referrers**
- [ ] Añadir:
  ```
  https://*.firebaseapp.com/*
  https://*.web.app/*
  https://gohappyfamily.com/*
  https://*.gohappyfamily.com/*
  https://douglascyberbraz-beep.github.io/*
  ```
- [ ] Save
- [ ] **Por qué:** inutiliza la key si alguien la copia y la usa desde otro dominio

### 1.4 Activar Multi-Factor Authentication (opcional, 15 min)
- [ ] Firebase Console → Authentication → Settings → MFA
- [ ] Habilitar SMS o TOTP
- [ ] Añadir UI en `auth.js` para enrolar 2FA (opcional para usuarios)
- [ ] **Por qué:** opcional, pero útil para usuarios que paguen Premium

### 1.5 Backup automático Firestore (10 min)
- [ ] Habilitar facturación en proyecto (necesario para Storage donde van backups)
- [ ] `gcloud firestore export gs://gohappy-backups/$(date +%Y%m%d)`
- [ ] Cloud Scheduler → cron diario `0 3 * * *` ejecutando el export
- [ ] **Por qué:** recovery ante incidente o ransomware

---

## 🟠 FASE 2 — LEGAL & COMPLIANCE GDPR
> Hacer **2 semanas antes** del envío.

### 2.1 Rellenar datos legales reales
- [ ] Editar `js/pages/legal.js` y reemplazar placeholders:
  - [ ] Razón social
  - [ ] CIF/NIF
  - [ ] Domicilio fiscal completo
  - [ ] Email DPO (data protection officer)
  - [ ] Email contacto soporte
  - [ ] Número de inscripción en AEPD (si aplica)
- [ ] Política de cookies con tabla detallada de cookies usadas
- [ ] Términos de uso con jurisdicción (España + UK)

### 2.2 Registro en Agencia Española de Protección de Datos (AEPD)
- [ ] Inscribir el tratamiento de datos (gratuito)
- [ ] https://sedeagpd.gob.es/sede-electronica-web/
- [ ] **Crítico** porque tratáis datos de **menores** (necesita consentimiento parental)

### 2.3 ICO Registration (UK GDPR)
- [ ] https://ico.org.uk/registration/
- [ ] Tarifa £40-£60/año
- [ ] **Crítico** para operar en UK con datos de menores

### 2.4 Acuerdo con Google (Firebase) DPA
- [ ] Firebase Console → Settings → Data processing → Aceptar Cloud Data Processing Addendum
- [ ] Descargar PDF firmado y archivarlo

### 2.5 Auditoría de PII en logs y analytics
- [ ] Revisar que NO se loguean emails/nicknames en `console.log`
- [ ] Si usas GA4: configurar IP anonymization
- [ ] Si usas Sentry: configurar `beforeSend` que strippea PII

---

## 🟡 FASE 3 — TRANSICIÓN PWA → NATIVO (Capacitor)

### 3.1 Build Android (Google Play)
- [ ] Verificar `capacitor.config.json` con datos reales
- [ ] `npx cap sync android`
- [ ] Generar keystore signing:
  ```bash
  keytool -genkey -v -keystore gohappy-release.keystore -alias gohappy -keyalg RSA -keysize 2048 -validity 25000
  ```
- [ ] **GUARDAR keystore en lugar seguro** (sin él no puedes actualizar la app)
- [ ] Configurar `android/app/build.gradle` con `signingConfigs`
- [ ] Build AAB: `cd android && ./gradlew bundleRelease`
- [ ] Output: `android/app/build/outputs/bundle/release/app-release.aab`

### 3.2 Build iOS (App Store)
- [ ] Mac con Xcode 15+
- [ ] Cuenta Apple Developer activa (€99/año)
- [ ] `npx cap sync ios`
- [ ] Abrir en Xcode: `npx cap open ios`
- [ ] Configurar Bundle Identifier, Team, Provisioning Profile
- [ ] Archive → Distribute → App Store Connect

### 3.3 Iconos y splash screens
- [ ] Generar todos los tamaños con https://www.appicon.co o `@capacitor/assets`
- [ ] Verificar que se vean bien en notch/Dynamic Island
- [ ] Splash screen 2732×2732 base (iOS iPad Pro)

---

## 🟢 FASE 4 — APP STORES (CONTENIDO)

### 4.1 Google Play Console (€25 una sola vez)
- [ ] Crear cuenta dev https://play.google.com/console/
- [ ] Crear app → ficha completa
- [ ] **Capturas requeridas:**
  - 2-8 screenshots por dispositivo (phone/tablet)
  - Tamaño mínimo 320×320
  - Recomendado 1080×1920 (vertical)
- [ ] **Icono 512×512** alta resolución
- [ ] **Banner promo 1024×500**
- [ ] **Vídeo opcional** YouTube 30s
- [ ] Descripción corta (80 chars): *"App familiar para planes, recuerdos y momentos juntos"*
- [ ] Descripción larga (4000 chars): contar la propuesta de valor
- [ ] Categoría: **Familia** o **Estilo de vida**
- [ ] Clasificación de contenido (cuestionario) — declarar que es para todas las edades
- [ ] **Política privacidad URL** (debe ser pública y accesible)
- [ ] Información de contacto: email + sitio web

### 4.2 Cuestionarios obligatorios
- [ ] **Programa familias** (Designed for Families) — porque tratáis menores
- [ ] **Data Safety form** — declarar exactamente qué datos recogéis:
  - Email ✓ (cuenta)
  - Nombre ✓ (perfil)
  - Fotos ✓ (Moments)
  - Ubicación aproximada ✓ (planes)
  - **NO** ubicación precisa permanente
  - **NO** datos bancarios
- [ ] **Encryption in transit** ✓ (HTTPS/TLS)
- [ ] **Data deletion** — usuario puede borrar cuenta (implementar endpoint en Profile)

### 4.3 App Store Connect (necesita Mac)
- [ ] https://appstoreconnect.apple.com
- [ ] Crear app → Bundle ID = `com.gohappy.family`
- [ ] **Capturas requeridas:**
  - iPhone 6.7" (iPhone 15 Pro Max): mínimo 3, max 10
  - iPhone 6.5"
  - iPad 12.9" si soportáis tablet
- [ ] App Privacy → Data Types form (similar a Play)
- [ ] Edad rating: 4+
- [ ] **App Review Information:**
  - Cuenta demo: `demo@gohappy.test` / contraseña
  - Notas para reviewer explicando que tratáis menores y cómo

---

## 🔵 FASE 5 — MONETIZACIÓN (si vas a cobrar Premium)

### 5.1 Sistema de pago
Opción A — Suscripciones in-app (recomendado):
- [ ] Google Play Billing Library
- [ ] StoreKit (iOS)
- [ ] Configurar suscripción "Premium €4,99/mes" en ambas tiendas
- [ ] Backend validación de recibos

Opción B — Stripe (web):
- [ ] Cuenta Stripe con verificación
- [ ] Webhook a Cloud Function para activar `user.tier = 'premium'`
- [ ] ⚠️ Apple/Google NO permiten Stripe en apps móviles para suscripciones digitales

Opción C — RevenueCat (más fácil, comisión)
- [ ] Cuenta gratis hasta $10k/mes ingresos
- [ ] Abstrae App Store + Play Store + Stripe
- [ ] SDK integrado vía Capacitor

### 5.2 Actualizar Cloud Function rate limits
- [ ] Cuando un user actualice a premium, su `level` debe pasar de `free` → `premium`
- [ ] Verificar que `LIMITS.premium` se aplica correctamente

---

## 🟣 FASE 6 — OBSERVABILIDAD Y SOPORTE

### 6.1 Error tracking
- [ ] Cuenta Sentry gratis (5k errors/mes)
- [ ] Añadir SDK a `index.html`:
  ```html
  <script src="https://browser.sentry-cdn.com/8.x/bundle.tracing.min.js"></script>
  <script>Sentry.init({ dsn: 'tu-dsn', tracesSampleRate: 0.1 });</script>
  ```
- [ ] `beforeSend` para strippear PII
- [ ] Cubrir errores de Cloud Functions también

### 6.2 Analytics privacy-friendly
- [ ] GA4 con consentMode + IP anonymization (gratis)
- [ ] Plausible (€9/mes) si quieres sin cookies
- [ ] Eventos clave: signup, family_created, plan_saved, quest_completed, moment_shared, premium_upgrade

### 6.3 Soporte al usuario
- [ ] Email funcional: `hola@gohappyfamily.app` (Google Workspace o Zoho free)
- [ ] FAQ pública en `gohappyfamily.com/faq`
- [ ] Crear plantillas de respuesta para preguntas frecuentes
- [ ] (Opcional) Chat con Crisp/Intercom

### 6.4 Status page (opcional, 10 min)
- [ ] https://stats.uptimerobot.com (gratis)
- [ ] Monitorear: hosting, proxy IA, Firestore
- [ ] Email alert si caída >5 min

---

## ⚪ FASE 7 — PRUEBAS FINALES PRE-LANZAMIENTO

### 7.1 Testing E2E manual
- [ ] **Usuario nuevo (España):**
  - [ ] Registro con email
  - [ ] Crea familia
  - [ ] Invita 2 familiares (otro email)
  - [ ] Completa onboarding
  - [ ] Genera plan en Today
  - [ ] Completa quest con foto
  - [ ] Sube moment privado
  - [ ] Sube moment público con GDPR check
  - [ ] Comenta moment
  - [ ] Pregunta a Care
  - [ ] Cambia avatar
  - [ ] Cierra sesión y vuelve a entrar
  - [ ] Sale de familia
- [ ] **Mismo flujo en UK** (forzar `localStorage.GoHappy_lang='en'`) — todo en inglés
- [ ] **Usuario invitado** — solo lectura, sin features de familia

### 7.2 Performance audit
- [ ] Lighthouse score:
  - [ ] Performance ≥ 85
  - [ ] Accessibility ≥ 90
  - [ ] Best Practices ≥ 90
  - [ ] SEO ≥ 90
  - [ ] PWA ≥ 90
- [ ] Core Web Vitals en móvil real:
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1

### 7.3 Cross-browser / device
- [ ] Safari iOS 16+ (PWA install)
- [ ] Chrome Android 12+
- [ ] Firefox móvil
- [ ] Edge desktop
- [ ] Modo offline (PWA)
- [ ] Modo dark (verificar legibilidad)

### 7.4 Cuentas demo para review
- [ ] Crear `demo@gohappy.app` con datos plausibles (1 familia, 3 quests, 5 moments)
- [ ] Documentar credenciales en App Store / Play Console
- [ ] Asegurar que no expira

---

## 🌐 FASE 8 — MARKETING Y COMUNICACIÓN

### 8.1 Landing oficial
- [ ] Verificar `landing/index.html` con info final
- [ ] CTAs apuntando a tiendas (no a la web)
- [ ] Sección "Press kit" con logos descargables
- [ ] OG tags para previews en redes
- [ ] Sitemap.xml + robots.txt

### 8.2 Redes sociales
- [ ] Instagram @gohappyfamily — perfil profesional
- [ ] TikTok — primer post mostrando demo de 30s
- [ ] LinkedIn — anuncio de lanzamiento
- [ ] Twitter/X — opcional

### 8.3 Email marketing
- [ ] Lista de waitlist (Substack gratis, Mailchimp 500 free)
- [ ] Email de lanzamiento con CTA a tiendas
- [ ] Newsletter mensual con tips familia + features nuevas

### 8.4 Prensa / partners
- [ ] Lista de medios familia/parenting españoles (Bebés y Más, Mamis y Bebés, Padres Modernos)
- [ ] Press release de 1 página
- [ ] Influencers familia (5-10 contactos micro-influencers para review gratuita)

---

## 🚀 DÍA DEL LANZAMIENTO

### Pre-launch (24-48h antes)
- [ ] App Check Enforce activado en cada función
- [ ] API Key restrictions activas
- [ ] Status page funcionando
- [ ] Sentry recibiendo errores OK
- [ ] Backup Firestore reciente verificado
- [ ] Cuentas demo testeadas
- [ ] Capturas y descripción finales en ambas tiendas
- [ ] Tier premium configurado y testeado
- [ ] Email soporte monitoreado activamente

### Día D
- [ ] Approval recibido de Apple/Google
- [ ] Pulsar "Release" en ambas consolas
- [ ] Post en redes sociales
- [ ] Email a waitlist
- [ ] Monitorear Sentry y Firebase console primeras 24h
- [ ] Responder reviews y emails de soporte rápidamente

### Post-launch (primeros 7 días)
- [ ] Diario: revisar errores Sentry
- [ ] Diario: responder reviews tiendas
- [ ] Diario: revisar `_audit` collection por intentos sospechosos
- [ ] Semanal: revisar métricas (signups, retention, premium conversion)
- [ ] Iterar bugs críticos → hotfix release

---

## 📊 KPIs a monitorear post-launch

| Métrica | Objetivo mes 1 | Objetivo mes 3 |
|---|---|---|
| Descargas totales | 500 | 5.000 |
| Usuarios activos diarios (DAU) | 100 | 1.000 |
| Familias creadas | 200 | 2.000 |
| Conversión a Premium | 3% | 8% |
| Crash-free sessions | >99% | >99.5% |
| Rating tiendas | ≥4.0 | ≥4.5 |
| Respuesta soporte | <24h | <12h |

---

## 🧯 PLAN DE CONTINGENCIA

### Si Apple/Google rechazan la app
- Causas frecuentes en apps de familia:
  - Falta de mecanismo de borrado de cuenta (Apple lo exige obligatoriamente)
  - Datos de menores sin consentimiento parental visible
  - Capturas que no representan funcionalidad real
- Tiempo de re-review: 24-48h tras corregir

### Si hay incidente de seguridad
- [ ] Plan documentado: `docs/INCIDENT_RESPONSE.md` (crear cuando llegue el momento)
- [ ] Revocar tokens: `firebase auth:export users.json && firebase auth:import users.json --hash-algo=...`
- [ ] Audit log `_audit` collection para forensics
- [ ] Notificación a usuarios afectados (obligatorio GDPR si hay brecha de datos)

### Si la Cloud Function se cae
- [ ] Frontend muestra mensaje claro de "IA no disponible"
- [ ] Skeleton screens evitan UI rota
- [ ] Cache local de 6h sigue sirviendo respuestas previas

---

## ✅ CHECKLIST EXPRESS (mínimo viable lanzamiento)

Si tienes prisa, esto es **lo absolutamente imprescindible** sin lo cual NO debes lanzar:

- [ ] Migrar hosting a Firebase
- [ ] App Check con reCAPTCHA v3 enforced
- [ ] API Key restrictions
- [ ] Datos legales reales en `legal.js`
- [ ] Política privacidad pública
- [ ] Mecanismo de borrado de cuenta
- [ ] Email soporte funcional
- [ ] Cuenta demo para Apple/Google
- [ ] Capturas reales de 3 dispositivos por tienda
- [ ] Sentry o equivalente para errores
- [ ] Backup Firestore programado

Todo lo demás puedes hacerlo después del lanzamiento si vas iterando.

---

*Actualiza este checklist a medida que tachas items. Cuando llegues al lanzamiento, archívalo en `docs/launch_log_v1.md` con fechas reales de cada paso.*
