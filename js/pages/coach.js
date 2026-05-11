// ================================================================
// GoHappy Care — Coach IA Familiar
// Asesor experto en crianza consciente, psicología infantil,
// sueño, alimentación, rabietas, deberes, pantallas, hermanos
// ================================================================
window.GoHappyCare = {

    // Categorías rápidas — labels y prompts según idioma
    get CATEGORIES() {
        const lang = window.GoHappyI18n?.lang || 'es';
        const T = window.t || (k => k);
        const PROMPTS_ES = {
            sleep:    'Tengo problemas con el sueño de mi hijo/a. ',
            food:     'Mi hijo/a no quiere comer bien. ',
            tantrums: 'Mi hijo/a tiene rabietas frecuentes. ',
            homework: 'Mi hijo/a no quiere hacer los deberes. ',
            screens:  'Mi hijo/a usa demasiado las pantallas. ',
            siblings: 'Mis hijos se pelean mucho entre ellos. ',
            school:   'Mi hijo/a no quiere ir al cole. ',
            emotions: 'Mi hijo/a está pasando por un momento emocional difícil. '
        };
        const PROMPTS_EN = {
            sleep:    'I have trouble with my child\'s sleep. ',
            food:     'My child won\'t eat well. ',
            tantrums: 'My child has frequent tantrums. ',
            homework: 'My child doesn\'t want to do homework. ',
            screens:  'My child uses screens too much. ',
            siblings: 'My kids fight a lot with each other. ',
            school:   'My child doesn\'t want to go to school. ',
            emotions: 'My child is going through a difficult emotional time. '
        };
        const P = lang === 'en' ? PROMPTS_EN : PROMPTS_ES;
        return [
            { emoji: '😴', label: T('care.cat.sleep'),    prompt: P.sleep },
            { emoji: '🍽️', label: T('care.cat.food'),     prompt: P.food },
            { emoji: '😤', label: T('care.cat.tantrums'), prompt: P.tantrums },
            { emoji: '📚', label: T('care.cat.homework'), prompt: P.homework },
            { emoji: '📱', label: T('care.cat.screens'),  prompt: P.screens },
            { emoji: '🤝', label: T('care.cat.siblings'), prompt: P.siblings },
            { emoji: '🎒', label: T('care.cat.school'),   prompt: P.school },
            { emoji: '💔', label: T('care.cat.emotions'), prompt: P.emotions }
        ];
    },

    SYSTEM_PROMPT: `Eres GoHappy Care, coach experto en psicología infantil, crianza consciente, sueño infantil, alimentación familiar y desarrollo emocional. Hablas español natural y cálido.

ESTILO DE RESPUESTA (OBLIGATORIO):
1. **Valida la emoción** del padre/madre primero (1 frase corta y empática)
2. **Explica por qué ocurre** según psicología/desarrollo (2-3 frases)
3. **Plan accionable** en 2-3 pasos concretos numerados
4. **Cierra con ánimo** (1 frase)

REGLAS:
- Máximo 220 palabras totales
- Usa "vosotros/vuestro" (España), no "ustedes"
- Máximo 2 emojis en toda la respuesta
- Si la pregunta es médica seria (fiebre alta, sangre, accidente), responde brevemente y recomienda pediatra inmediato
- NO uses listas con asteriscos crudos, usa numeración 1. 2. 3.
- NO añadas disclaimers largos al final`,

    _chatKey: 'GoHappy_coach_chat',
    _historial: [],
    _isWaiting: false,

    render: async (container) => {
        const user = window.GoHappyAuth.checkAuth();

        // Cargar historial guardado en localStorage
        try {
            const saved = localStorage.getItem(window.GoHappyCare._chatKey);
            window.GoHappyCare._historial = saved ? JSON.parse(saved) : [];
        } catch (e) { window.GoHappyCare._historial = []; }

        const T = window.t || (k => k);
        container.innerHTML = `
            <div class="care-page">
                <div class="unified-hero" style="padding-bottom: 22px !important;">
                    <div style="display:flex; align-items:center; gap:14px; position:relative; z-index:2;">
                        <div class="care-avatar-hero">🧡</div>
                        <div style="flex:1; min-width:0;">
                            <h2 style="margin-bottom:2px !important;">${T('care.title')}</h2>
                            <p style="margin-top:2px !important;">${T('care.subtitle')}</p>
                        </div>
                    </div>
                </div>

                <!-- Categorías rápidas -->
                <div class="care-categories" id="care-categories">
                    ${window.GoHappyCare.CATEGORIES.map(c => `
                        <button class="care-cat-chip" data-prompt="${c.prompt}">
                            <span class="care-cat-emoji">${c.emoji}</span>
                            <span class="care-cat-label">${c.label}</span>
                        </button>
                    `).join('')}
                </div>

                <!-- Chat -->
                <div class="care-chat" id="care-chat">
                    ${window.GoHappyCare._historial.length === 0
                        ? `<div class="care-welcome">
                            <div class="care-welcome-icon">🧡</div>
                            <h3>${T('care.welcome.title')}</h3>
                            <p>${T('care.welcome.text')}</p>
                        </div>`
                        : window.GoHappyCare._historial.map(m => window.GoHappyCare._renderBubble(m)).join('')
                    }
                </div>

                <!-- Input fijo abajo -->
                <div class="care-input-bar">
                    <input type="text" id="care-input"
                        placeholder="${T('care.placeholder')}"
                        autocomplete="off"
                        spellcheck="true"
                        maxlength="500">
                    <button id="care-send-btn" class="care-send-btn" aria-label="${T('common.send')}">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 2L11 13"/>
                            <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        // Estilos específicos
        const styleId = 'care-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .care-page { width:100%; min-height:100vh; box-sizing:border-box; padding-bottom: calc(var(--nav-total, 110px) + 80px); position: relative; }

                .care-avatar-hero {
                    width:54px; height:54px; flex-shrink:0;
                    background: linear-gradient(135deg, #FF8A65, #FF6B6B);
                    border-radius: 50%;
                    display:flex; align-items:center; justify-content:center;
                    font-size: 28px;
                    box-shadow: 0 8px 22px rgba(255,107,107,0.35);
                    border: 2px solid rgba(255,255,255,0.5);
                }

                .care-categories {
                    display:flex; gap:8px; padding: 0 16px 12px;
                    overflow-x:auto; scrollbar-width:none;
                    margin-top: -8px;
                }
                .care-categories::-webkit-scrollbar { display:none; }
                .care-cat-chip {
                    flex-shrink:0;
                    background: rgba(255,255,255,0.85);
                    backdrop-filter: blur(20px) saturate(180%);
                    border: 0.5px solid rgba(11,76,143,0.12);
                    border-radius: 999px;
                    padding: 8px 14px 8px 10px;
                    display:flex; align-items:center; gap:6px;
                    font-family: -apple-system, sans-serif;
                    font-size: 13px; font-weight: 700;
                    color: var(--cobalt);
                    cursor: pointer;
                    transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
                    box-shadow: 0 4px 12px rgba(11,76,143,0.06);
                }
                .care-cat-chip:active { transform: scale(0.92); background: var(--brand-bright); color: white; }
                .care-cat-emoji { font-size: 17px; }

                .care-chat {
                    padding: 16px 16px 24px;
                    display: flex; flex-direction: column; gap: 12px;
                    min-height: 200px;
                }

                .care-welcome {
                    text-align: center; padding: 32px 24px;
                    background: linear-gradient(135deg, rgba(255,138,101,0.06), rgba(11,113,252,0.04));
                    border-radius: 28px;
                    border: 0.5px dashed rgba(255,107,107,0.3);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
                }
                .care-welcome-icon { font-size: 56px; margin-bottom: 12px; }
                .care-welcome h3 {
                    font-family: 'Poppins', sans-serif; font-weight: 900;
                    color: var(--cobalt); font-size: 1.3rem; margin-bottom: 8px;
                }
                .care-welcome p {
                    font-size: 14px; color: var(--text-secondary);
                    line-height: 1.55;
                }

                .care-bubble {
                    max-width: 86%;
                    padding: 12px 16px;
                    border-radius: 22px;
                    font-size: 15px;
                    line-height: 1.5;
                    word-wrap: break-word;
                    animation: bubbleIn 0.35s cubic-bezier(0.19,1,0.22,1);
                }
                @keyframes bubbleIn {
                    from { opacity:0; transform: translateY(8px) scale(0.96); }
                    to   { opacity:1; transform: translateY(0) scale(1); }
                }
                .care-bubble.user {
                    align-self: flex-end;
                    background: var(--brand-bright);
                    color: white;
                    border-bottom-right-radius: 6px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.2),
                                0 6px 18px rgba(11,113,252,0.22);
                }
                .care-bubble.bot {
                    align-self: flex-start;
                    background: rgba(255,255,255,0.92);
                    backdrop-filter: blur(20px);
                    color: var(--text-primary);
                    border: 0.5px solid rgba(255,255,255,0.95);
                    border-bottom-left-radius: 6px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.95),
                                0 4px 14px rgba(11,76,143,0.06);
                }
                .care-bubble.bot p { margin: 0 0 8px; }
                .care-bubble.bot p:last-child { margin-bottom: 0; }
                .care-bubble.bot strong { color: var(--cobalt); font-weight: 800; }
                .care-bubble.bot ol, .care-bubble.bot ul { padding-left: 20px; margin: 6px 0; }
                .care-bubble.bot li { margin: 4px 0; }

                .care-bubble.typing {
                    background: rgba(255,255,255,0.92);
                    padding: 16px 18px;
                }
                .care-typing-dots { display: flex; gap: 5px; }
                .care-typing-dots span {
                    width: 8px; height: 8px; border-radius: 50%;
                    background: var(--cobalt-bright);
                    opacity: 0.4;
                    animation: typingPulse 1.2s infinite ease-in-out;
                }
                .care-typing-dots span:nth-child(2) { animation-delay: 0.18s; }
                .care-typing-dots span:nth-child(3) { animation-delay: 0.36s; }
                @keyframes typingPulse {
                    0%,80%,100% { opacity: 0.3; transform: scale(0.8); }
                    40%         { opacity: 1; transform: scale(1.1); }
                }

                .care-bubble-meta {
                    font-size: 11px; color: var(--text-tertiary);
                    margin: 4px 0 0; padding: 0 4px;
                }
                .care-bubble.user + .care-bubble-meta { text-align: right; }

                /* Input bar fija arriba del nav flotante */
                .care-input-bar {
                    position: fixed;
                    bottom: calc(var(--nav-total, 110px) + 8px);
                    left: 50%;
                    transform: translateX(-50%);
                    width: calc(100% - 24px);
                    max-width: 420px;
                    display: flex; gap: 8px; align-items: center;
                    padding: 8px 8px 8px 18px;
                    background: rgba(255,255,255,0.92);
                    backdrop-filter: blur(40px) saturate(200%);
                    border: 0.5px solid rgba(255,255,255,0.95);
                    border-radius: 36px;
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,0.95),
                        0 12px 32px rgba(11,76,143,0.14);
                    z-index: 999;
                }
                .care-input-bar input {
                    flex: 1;
                    border: none !important;
                    background: transparent !important;
                    padding: 10px 4px !important;
                    font-size: 16px !important;
                    color: var(--text-primary) !important;
                    margin: 0 !important;
                    outline: none !important;
                }
                .care-send-btn {
                    width: 44px; height: 44px;
                    border-radius: 50%;
                    background: var(--brand-bright);
                    color: white;
                    border: none;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    flex-shrink: 0;
                    box-shadow: 0 6px 18px rgba(11,113,252,0.32);
                    transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
                }
                .care-send-btn:active { transform: scale(0.88); }
                .care-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                .care-send-btn svg { display: block; transform: translateX(-1px); }
            `;
            document.head.appendChild(style);
        }

        // Bind eventos
        document.querySelectorAll('.care-cat-chip').forEach(chip => {
            chip.onclick = () => {
                const input = document.getElementById('care-input');
                input.value = chip.dataset.prompt;
                input.focus();
            };
        });

        const input = document.getElementById('care-input');
        const sendBtn = document.getElementById('care-send-btn');

        const send = () => {
            const text = input.value.trim();
            if (!text || window.GoHappyCare._isWaiting) return;
            input.value = '';
            window.GoHappyCare._handleUserMessage(text, user);
        };

        sendBtn.onclick = send;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
            }
        });

        // Auto-scroll al final si hay historial
        setTimeout(() => window.GoHappyCare._scrollToBottom(), 100);
    },

    _handleUserMessage: async (text, user) => {
        // Añadir mensaje usuario
        const userMsg = { role: 'user', text, time: Date.now() };
        window.GoHappyCare._historial.push(userMsg);
        window.GoHappyCare._appendBubble(userMsg);
        window.GoHappyCare._save();
        window.GoHappyCare._scrollToBottom();

        // Mostrar typing indicator
        window.GoHappyCare._isWaiting = true;
        window.GoHappyCare._showTyping();
        window.GoHappySound && window.GoHappySound.play('click');

        try {
            // Construir prompt con contexto e historial reciente
            const historialReciente = window.GoHappyCare._historial.slice(-6);
            const conversation = historialReciente
                .map(m => `${m.role === 'user' ? 'Padre/Madre' : 'Care'}: ${m.text}`)
                .join('\n\n');

            const childContext = user?.kidsAges
                ? `Edades de los niños: ${user.kidsAges}.`
                : '';

            const fullPrompt = `${window.GoHappyCare.SYSTEM_PROMPT}\n\n${childContext}\n\nCONVERSACIÓN HASTA AHORA:\n${conversation}\n\nRESPONDE como Care:`;

            const response = await window.GoHappyAI._callGemini(fullPrompt, false);

            window.GoHappyCare._removeTyping();

            if (!response || typeof response !== 'string') {
                throw new Error('Sin respuesta');
            }

            const botMsg = { role: 'bot', text: response.trim(), time: Date.now() };
            window.GoHappyCare._historial.push(botMsg);
            window.GoHappyCare._appendBubble(botMsg);
            window.GoHappyCare._save();
            window.GoHappyCare._scrollToBottom();

            window.GoHappySound && window.GoHappySound.play('like');

        } catch (e) {
            console.error('Care error:', e);
            window.GoHappyCare._removeTyping();
            const errorMsg = { role: 'bot', text: (window.t ? window.t('care.error') : 'Lo siento, no he podido responderte ahora mismo. Inténtalo de nuevo en unos segundos. 💙'), time: Date.now() };
            window.GoHappyCare._historial.push(errorMsg);
            window.GoHappyCare._appendBubble(errorMsg);
            window.GoHappyCare._save();
        } finally {
            window.GoHappyCare._isWaiting = false;
        }
    },

    _renderBubble: (m) => {
        const sec = window.GoHappySecurity;
        const safeText = sec ? sec.safe(m.text) : String(m.text).replace(/[<>]/g, '');
        // Convertir saltos de línea y negritas
        const html = safeText
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        return `<div class="care-bubble ${m.role}"><p>${html}</p></div>`;
    },

    _appendBubble: (m) => {
        const chat = document.getElementById('care-chat');
        if (!chat) return;
        // Si era el welcome inicial, lo eliminamos
        const welcome = chat.querySelector('.care-welcome');
        if (welcome) welcome.remove();
        chat.insertAdjacentHTML('beforeend', window.GoHappyCare._renderBubble(m));
    },

    _showTyping: () => {
        const chat = document.getElementById('care-chat');
        if (!chat) return;
        chat.insertAdjacentHTML('beforeend', `
            <div class="care-bubble bot typing" id="care-typing">
                <div class="care-typing-dots"><span></span><span></span><span></span></div>
            </div>
        `);
        window.GoHappyCare._scrollToBottom();
    },

    _removeTyping: () => {
        const t = document.getElementById('care-typing');
        if (t) t.remove();
    },

    _scrollToBottom: () => {
        const main = document.getElementById('main-content');
        if (main) main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
    },

    _save: () => {
        try {
            // Guardar máx 50 mensajes para no llenar localStorage
            const trimmed = window.GoHappyCare._historial.slice(-50);
            localStorage.setItem(window.GoHappyCare._chatKey, JSON.stringify(trimmed));
        } catch (e) { /* quota */ }
    },

    // Limpiar conversación (útil para botón "nueva consulta")
    clearChat: () => {
        window.GoHappyCare._historial = [];
        try { localStorage.removeItem(window.GoHappyCare._chatKey); } catch (e) {}
    }
};
