# 🚀 GoHappy — Guía de Beta v2.9.1

## ¿Qué hay listo?
- ✅ Todos los bugs críticos corregidos
- ✅ Proyecto Android generado (`npx cap add android`)  
- ✅ Firebase Hosting configurado con seguridad
- ✅ PWA instalable en iOS y Android sin necesidad de tiendas
- ✅ Reglas Firestore blindadas (escritas, falta desplegar)
- ✅ Proxy Gemini IA (escrito, falta plan Blaze para activar)

---

## PASO 1 — Despliega Firebase (OBLIGATORIO antes de probar)

Abre una terminal en la carpeta del proyecto:

```bash
cd C:\Users\Dougl\.gemini\antigravity\scratch\kidoa-app

# Instala Firebase CLI si no lo tienes
npm install -g firebase-tools

# Inicia sesión
firebase login

# Despliega reglas de Firestore + índices (CRÍTICO para seguridad)
firebase deploy --only firestore:rules,firestore:indexes

# Despliega la app como PWA (URL pública para pruebas)
firebase deploy --only hosting
```

Cuando termine, la app estará disponible en:
**https://gohappy-8d660.web.app**

---

## PASO 2 — Activa Firebase Auth (en Firebase Console)

1. Ve a https://console.firebase.google.com → Proyecto gohappy-8d660
2. **Authentication → Sign-in method** → Activa:
   - ✅ Email/Contraseña
   - ✅ Google
   - ✅ Anónimo
3. **Authentication → Authorized domains** → Añade:
   - `gohappy-8d660.web.app`
   - `douglascyberbraz-beep.github.io`
   - `localhost` (para desarrollo)

---

## PASO 3 — Activa la IA Gemini (plan Blaze de Firebase)

Sin este paso, la app funciona perfectamente pero muestra datos de
demostración en lugar de contenido real de IA.

1. Ve a https://console.firebase.google.com → Upgrade to Blaze
   (Es pago por uso — el free tier es generoso, no esperes cargos)
2. En la terminal:

```bash
# Instalar dependencias de las Cloud Functions
cd functions
npm install
cd ..

# Configurar tu clave de Gemini (se guarda segura en el servidor)
firebase functions:config:set gemini.key="AIzaSy_TU_CLAVE_REAL_AQUI"

# Desplegar las Cloud Functions
firebase deploy --only functions

# Verificar que funcionan
firebase functions:log
```

---

## PASO 4 — Beta en Android

### Requisitos
- Android Studio instalado (https://developer.android.com/studio)
- `google-services.json` descargado de Firebase Console

### Obtener google-services.json
1. Firebase Console → gohappy-8d660 → Configuración del proyecto
2. Pestaña "Tus apps" → Añadir app → Android
3. Package name: `com.gohappyfamily.app`
4. Descarga `google-services.json`
5. **Colócalo en:** `android/app/google-services.json`

### Construir el APK de Beta
```bash
# En la carpeta del proyecto:
node scripts/build-www.js        # Actualiza los archivos web
npx cap sync android             # Sincroniza con el proyecto Android

# Abrir en Android Studio
npx cap open android
```

En Android Studio:
1. Espera que Gradle sincronice (1-2 min la primera vez)
2. **Build → Generate Signed Bundle / APK**
3. Selecciona **APK** → **debug** (para beta)
4. El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`
5. Compártelo directamente o usa Firebase App Distribution

### Distribución vía Firebase App Distribution (recomendado)
```bash
# En Firebase Console → App Distribution → Añade el APK
# O via CLI:
firebase appdistribution:distribute android/app/build/outputs/apk/debug/app-debug.apk \
  --app 1:552831875210:android:TU_APP_ID_ANDROID \
  --groups "beta-testers"
```

---

## PASO 5 — Beta en iOS

⚠️ **Requiere Mac con Xcode instalado**

Desde un Mac, con el proyecto sincronizado:

### Obtener GoogleService-Info.plist
1. Firebase Console → gohappy-8d660 → Configuración del proyecto
2. Pestaña "Tus apps" → Añadir app → iOS
3. Bundle ID: `com.gohappyfamily.app`
4. Descarga `GoogleService-Info.plist`
5. **Lo añades en Xcode** al proyecto (ver abajo)

### Construir y subir a TestFlight
```bash
# Desde el Mac, en la carpeta del proyecto:
node scripts/build-www.js
npx cap sync ios
npx cap open ios
```

En Xcode:
1. Arrastra `GoogleService-Info.plist` al proyecto (junto a `Info.plist`)
2. Signing & Capabilities → Selecciona tu Apple Developer Team
3. Bundle Identifier: `com.gohappyfamily.app`
4. Añade capabilities: Push Notifications, Background Modes
5. **Product → Archive**
6. Distribuye a TestFlight para beta

---

## PASO 6 — PWA (prueba inmediata en cualquier dispositivo)

Sin instalar nada, la URL de Firebase Hosting funciona como app:

### En Android (Chrome):
1. Abre Chrome → `https://gohappy-8d660.web.app`
2. Menú ⋮ → "Añadir a pantalla de inicio"
3. Se instala como app nativa

### En iPhone/iPad (Safari):
1. Abre Safari → `https://gohappy-8d660.web.app`
2. Botón Compartir → "Añadir a pantalla de inicio"
3. Se instala con icono en el Home

---

## PASO 7 — Checklist de pruebas Beta

### Autenticación
- [ ] Registro con email y contraseña funciona
- [ ] Login con email y contraseña funciona
- [ ] Login con Google funciona
- [ ] Modo invitado funciona
- [ ] Logout funciona y limpia sesión

### Funcionalidades
- [ ] Mapa 3D carga y muestra ubicación
- [ ] Today: muestra actividades (IA o demo si no hay Blaze)
- [ ] Quests: se muestran las misiones, se pueden completar
- [ ] Safe: se muestran alertas comunitarias
- [ ] Tribu: se pueden leer y publicar posts
- [ ] Ranking: se muestran los top usuarios
- [ ] News: se muestran noticias (IA o demo)
- [ ] Profile: muestra datos del usuario y puntos

### Rendimiento
- [ ] App carga en < 3 segundos
- [ ] Navegación entre páginas es fluida
- [ ] Funciona sin conexión (Service Worker)
- [ ] No hay errores en la consola del navegador

---

## Resumen de comandos rápidos

```bash
# Actualizar web y sincronizar con Android
node scripts/build-www.js && npx cap sync android

# Desplegar todo en Firebase
firebase deploy --only hosting,firestore:rules,firestore:indexes

# Abrir en Android Studio
npx cap open android

# Ver logs en tiempo real
firebase functions:log --only geminiProxy
```

---

## URL de la Beta PWA
🌐 **https://gohappy-8d660.web.app**
(disponible tras ejecutar el Paso 1)
