// ================================================================
// GoHappy Notifications Service — v1.0.0
// Puente nativo para Push, Local Notifications y Haptics.
// ================================================================
window.GoHappyNotifications = {

    init: async () => {
        // Detectar si estamos en plataforma nativa (Android/iOS)
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
        console.log(`[Notifications] Modo nativo: ${isNative}`);

        if (isNative) {
            await window.GoHappyNotifications.setupPush();
            await window.GoHappyNotifications.setupLocal();
        }
    },

    // ────────────────────────────────────────────────
    // PUSH NOTIFICATIONS (FCM)
    // ────────────────────────────────────────────────
    setupPush: async () => {
        const { PushNotifications } = window.Capacitor.Plugins;

        // Pedir permiso
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive !== 'granted') {
            perm = await PushNotifications.requestPermissions();
        }

        if (perm.receive === 'granted') {
            // Registrarse en Apple/Google para recibir el Token
            await PushNotifications.register();

            // Guardar el token en Firestore para que el servidor pueda enviarnos push
            PushNotifications.addListener('registration', (token) => {
                console.log('Push Registration Token:', token.value);
                window.GoHappyNotifications._saveTokenToFirestore(token.value);
            });

            // Acción cuando llega una notificación con la app abierta
            PushNotifications.addListener('pushNotificationReceived', (notification) => {
                window.GoHappyToast.info(`${notification.title}: ${notification.body}`);
                window.GoHappyNotifications.vibrate('MEDIUM');
            });

            // Acción cuando el usuario toca la notificación
            PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('Push Action:', notification.actionId);
                // Si la notificación dice "quest", llevar al usuario a misiones
                if (notification.notification.data.page) {
                    window.GoHappyApp.loadPage(notification.notification.data.page);
                }
            });
        }
    },

    // ────────────────────────────────────────────────
    // LOCAL NOTIFICATIONS (Recordatorios)
    // ────────────────────────────────────────────────
    setupLocal: async () => {
        const { LocalNotifications } = window.Capacitor.Plugins;
        await LocalNotifications.requestPermissions();
    },

    // Programar un recordatorio (ej: "¡No olvides tu quest diaria!")
    scheduleReminder: async (title, body, delayInMinutes = 60) => {
        if (!window.Capacitor?.isNativePlatform()) return;
        const { LocalNotifications } = window.Capacitor.Plugins;

        await LocalNotifications.schedule({
            notifications: [
                {
                    title,
                    body,
                    id: Math.floor(Math.random() * 10000),
                    schedule: { at: new Date(Date.now() + 1000 * 60 * delayInMinutes) },
                    sound: 'beep.wav',
                    extra: { page: 'quests' }
                }
            ]
        });
    },

    // ────────────────────────────────────────────────
    // HAPTICS (Vibración premium)
    // ────────────────────────────────────────────────
    vibrate: async (type = 'SUCCESS') => {
        if (!window.Capacitor?.isNativePlatform()) return;
        const { Haptics } = window.Capacitor.Plugins;
        
        switch (type) {
            case 'SUCCESS': await Haptics.notification({ type: 'SUCCESS' }); break;
            case 'ERROR':   await Haptics.notification({ type: 'ERROR' }); break;
            case 'LIGHT':   await Haptics.impact({ style: 'LIGHT' }); break;
            case 'MEDIUM':  await Haptics.impact({ style: 'MEDIUM' }); break;
            default:        await Haptics.vibrate();
        }
    },

    // ────────────────────────────────────────────────
    // PRIVADO: Vincular Token FCM al usuario
    // ────────────────────────────────────────────────
    _saveTokenToFirestore: async (token) => {
        const user = window.GoHappyAuth.checkAuth();
        if (user && !user.isGuest) {
            try {
                await window.GoHappyDB.collection('users').doc(user.uid).update({
                    fcmToken: token,
                    lastPlatform: window.Capacitor.getPlatform()
                });
            } catch (e) { console.warn('Error guardando FCM Token'); }
        }
    }
};
