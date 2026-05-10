// GoHappy Sound System - Web Audio API (no external files needed)
window.GoHappySound = (() => {
    let ctx = null;

    const getCtx = () => {
        if (!ctx) {
            try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    };

    const playTone = (frequency, type, duration, volume = 0.15, delay = 0, fadeOut = true) => {
        const ac = getCtx();
        if (!ac) return;
        try {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, ac.currentTime + delay);
            gain.gain.setValueAtTime(volume, ac.currentTime + delay);
            if (fadeOut) gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
            osc.start(ac.currentTime + delay);
            osc.stop(ac.currentTime + delay + duration + 0.05);
        } catch (e) { }
    };

    const sounds = {
        // Navigation click - subtle, satisfying
        click: () => {
            playTone(880, 'sine', 0.08, 0.08);
        },

        // App start - arpegio alegre mayor (Do-Mi-Sol-Do-Mi alto) tipo "felicidad"
        start: () => {
            // Arpegio principal con timbre suave
            [[523, 0], [659, 0.08], [784, 0.16], [1047, 0.26], [1319, 0.38]].forEach(([f, d]) => {
                playTone(f, 'sine', 0.4, 0.10, d);
            });
            // Campanilleo brillante superpuesto (más agudo, volumen bajo)
            [[2093, 0.1], [2637, 0.3]].forEach(([f, d]) => {
                playTone(f, 'sine', 0.18, 0.04, d);
            });
        },

        // Magic shimmer — para transición de splash a app
        magic: () => {
            [[1568, 0], [2093, 0.05], [2637, 0.12]].forEach(([f, d]) => {
                playTone(f, 'sine', 0.25, 0.06, d);
            });
        },

        // Points earned - uplifting fanfare
        points: () => {
            [[523, 0], [784, 0.08], [1047, 0.16], [1319, 0.25]].forEach(([f, d]) => {
                playTone(f, 'sine', 0.3, 0.12, d);
            });
        },

        // Quest complete - triumphant
        quest: () => {
            [[392, 0], [523, 0.1], [659, 0.2], [784, 0.3], [1047, 0.4]].forEach(([f, d]) => {
                playTone(f, 'triangle', 0.4, 0.13, d);
            });
        },

        // Success - clean positive
        success: () => {
            playTone(523, 'sine', 0.12, 0.1);
            playTone(784, 'sine', 0.2, 0.1, 0.12);
        },

        // Error - soft negative
        error: () => {
            playTone(220, 'sawtooth', 0.15, 0.06);
            playTone(185, 'sawtooth', 0.15, 0.06, 0.15);
        },

        // Alert ping - attention grabber
        alert: () => {
            playTone(1047, 'sine', 0.1, 0.1);
            playTone(1047, 'sine', 0.1, 0.1, 0.18);
        },

        // Like / heart
        like: () => {
            playTone(660, 'sine', 0.1, 0.08);
            playTone(880, 'sine', 0.12, 0.08, 0.1);
        },

        // Map open - adventure sound
        map: () => {
            playTone(392, 'triangle', 0.18, 0.1);
            playTone(523, 'triangle', 0.18, 0.1, 0.15);
        }
    };

    return {
        play: (type) => {
            try {
                if (sounds[type]) sounds[type]();
            } catch (e) { }
        },
        unlock: () => {
            // Call once after user gesture to unlock AudioContext on mobile
            getCtx();
        }
    };
})();
