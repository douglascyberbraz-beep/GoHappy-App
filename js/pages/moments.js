// ================================================================
// GoHappy Moments — BeReal familiar
// Foto/momento rápido visible solo para tu Tribu (familia + invitados)
// Genera álbum mensual automático con IA
// ================================================================
window.GoHappyMoments = {

    get PROMPTS() {
        const lang = window.GoHappyI18n?.lang || 'es';
        if (lang === 'en') return [
            "What's the family doing right now? 📸",
            "Capture a beautiful moment today ✨",
            "A smile. A photo. A memory. 💝",
            "Who made the family laugh today? 😂",
            "Show the happiest moment of your day 🌟",
            "A photo that tells your day 📷",
            "The little detail that made you happy today 🎈"
        ];
        return [
            "¿Qué estáis haciendo en familia ahora? 📸",
            "Capturad un momento bonito de hoy ✨",
            "Una sonrisa. Una foto. Un recuerdo. 💝",
            "¿Quién ha hecho reír a la familia hoy? 😂",
            "Mostrad el momento más happy del día 🌟",
            "Una foto que cuente vuestro día 📷",
            "El detalle pequeño que os hizo felices hoy 🎈"
        ];
    },

    _currentPrompt: null,
    _photoData: null,
    _currentFeed: 'family',  // 'family' | 'community'

    render: async (container) => {
        const user = window.GoHappyAuth.checkAuth();

        // Prompt aleatorio del día (consistente por día)
        const dayHash = new Date().toDateString().split('').reduce((h,c) => h + c.charCodeAt(0), 0);
        window.GoHappyMoments._currentPrompt = window.GoHappyMoments.PROMPTS[dayHash % window.GoHappyMoments.PROMPTS.length];

        const T = window.t || (k => k);
        container.innerHTML = `
            <div class="moments-page">
                <div class="unified-hero">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; position:relative; z-index:2;">
                        <div style="flex:1;">
                            <h2>${T('moments.title')}</h2>
                            <p>${T('moments.subtitle')}</p>
                        </div>
                    </div>
                </div>

                <!-- Toggle Familia / Comunidad -->
                <div class="moments-feed-toggle" style="display:flex; gap:6px; margin:0 16px 14px; padding:5px; background:rgba(255,255,255,0.88); border-radius:999px; border:0.5px solid rgba(11,76,143,0.10); box-shadow:0 4px 14px rgba(11,76,143,0.06);">
                    <button class="m-feed-pill active" data-feed="family" style="flex:1; padding:10px; border:none; border-radius:999px; background:var(--brand-bright); color:white; font-weight:800; font-size:12.5px; cursor:pointer; box-shadow:0 4px 12px rgba(11,113,252,0.28);">
                        👨‍👩‍👧 ${(window.GoHappyI18n?.lang === 'en') ? 'My Family' : 'Mi Familia'}
                    </button>
                    <button class="m-feed-pill" data-feed="community" style="flex:1; padding:10px; border:none; border-radius:999px; background:transparent; color:var(--text-secondary); font-weight:700; font-size:12.5px; cursor:pointer;">
                        🌍 ${(window.GoHappyI18n?.lang === 'en') ? 'Community' : 'Comunidad'}
                    </button>
                </div>

                <!-- Prompt del día + botón captura -->
                <div class="moments-prompt-card" style="margin: 0 16px 16px;">
                    <div class="moments-prompt-icon">📸</div>
                    <div style="flex:1;">
                        <div class="moments-prompt-text">${window.GoHappyMoments._currentPrompt}</div>
                        <div class="moments-prompt-sub" id="moments-privacy-sub">${T('moments.privacy')}</div>
                    </div>
                </div>

                <button id="moments-capture-btn" class="btn-primary moments-capture-btn">
                    ${T('moments.capture')}
                </button>

                <!-- Hidden file input -->
                <input type="file" id="moments-file-input" accept="image/*" capture="environment" style="display:none;">

                <!-- Feed de momentos -->
                <div id="moments-feed" class="moments-feed stagger-group">
                    <div class="center-text p-40"><div class="typing-dots"><span></span><span></span><span></span></div><p style="margin-top:12px; color:var(--text-secondary); font-size:13px;">${(window.GoHappyI18n?.lang === 'en') ? 'Loading your moments…' : 'Cargando vuestros momentos…'}</p></div>
                </div>

                <!-- Spacer para nav flotante -->
                <div style="height: 110px;"></div>
            </div>
        `;

        // Inyectar estilos específicos de moments (si no existen)
        const styleId = 'moments-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .moments-page { width:100%; box-sizing:border-box; overflow-x:hidden; min-height:100vh; }

                .moments-prompt-card {
                    display:flex; align-items:center; gap:14px;
                    background: linear-gradient(135deg, rgba(11,113,252,0.08), rgba(23,200,212,0.12));
                    border: 0.5px solid rgba(23,200,212,0.3);
                    border-radius: 24px; padding: 16px 18px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
                }
                .moments-prompt-icon {
                    width: 48px; height: 48px; flex-shrink: 0;
                    background: linear-gradient(135deg, #0B71FC, #17C8D4);
                    border-radius: 50%;
                    display:flex; align-items:center; justify-content:center;
                    font-size: 24px;
                    box-shadow: 0 8px 20px rgba(11,113,252,0.3);
                }
                .moments-prompt-text {
                    font-family: 'Poppins', sans-serif;
                    font-size: 14px; font-weight: 800; color: var(--cobalt);
                    line-height: 1.3;
                }
                .moments-prompt-sub {
                    font-size: 11px; color: var(--text-secondary);
                    margin-top: 4px; font-weight: 500;
                }

                .moments-capture-btn {
                    width: calc(100% - 32px) !important;
                    margin: 0 16px 20px !important;
                    height: 56px !important;
                    font-size: 16px !important;
                    font-weight: 800 !important;
                    box-shadow: 0 12px 32px rgba(11,113,252,0.32) !important;
                }

                .moments-feed {
                    padding: 0 16px;
                    display: flex; flex-direction: column; gap: 16px;
                }

                .moment-card {
                    background: rgba(255,255,255,0.92);
                    backdrop-filter: blur(30px) saturate(180%);
                    border: 0.5px solid rgba(255,255,255,0.95);
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,0.95),
                        0 8px 28px rgba(11,76,143,0.08);
                }

                .moment-header {
                    display: flex; align-items: center; gap: 12px;
                    padding: 14px 16px 10px;
                }
                .moment-avatar {
                    width: 38px; height: 38px; border-radius: 50%;
                    background: linear-gradient(135deg, #0B71FC, #17C8D4);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 18px; color: white;
                    box-shadow: 0 4px 12px rgba(11,76,143,0.18);
                    flex-shrink: 0;
                }
                .moment-meta { flex: 1; min-width: 0; }
                .moment-author {
                    font-weight: 800; font-size: 14px; color: var(--cobalt);
                    line-height: 1.2; margin: 0;
                }
                .moment-time {
                    font-size: 11px; color: var(--text-tertiary);
                    margin-top: 2px;
                }

                .moment-image {
                    width: 100%; max-height: 380px; object-fit: cover;
                    display: block; background: #f0f7ff;
                }

                .moment-caption {
                    padding: 12px 16px 6px;
                    font-size: 14px; color: var(--text-primary);
                    line-height: 1.5;
                }

                .moment-reactions {
                    display: flex; gap: 8px; padding: 10px 14px 14px;
                    flex-wrap: wrap;
                }
                .reaction-btn {
                    background: rgba(11,76,143,0.06);
                    border: 0.5px solid rgba(11,76,143,0.1);
                    border-radius: 999px;
                    padding: 6px 12px;
                    font-size: 13px; font-weight: 700;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), background 0.2s;
                    display: flex; align-items: center; gap: 5px;
                }
                .reaction-btn:active { transform: scale(0.92); }
                .reaction-btn.reacted {
                    background: linear-gradient(135deg, rgba(11,113,252,0.12), rgba(23,200,212,0.18));
                    border-color: rgba(23,200,212,0.4);
                    color: var(--cobalt);
                    font-weight: 800;
                }
                .reaction-count { font-size: 12px; }

                /* ─── Comentarios familiares ─── */
                .comments-toggle {
                    display: flex; align-items: center; gap: 6px;
                    margin: 4px 14px 14px;
                    padding: 7px 14px;
                    background: rgba(11,76,143,0.06);
                    color: var(--cobalt);
                    border: 0.5px solid rgba(11,76,143,0.10);
                    border-radius: 999px;
                    font-size: 12.5px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: background 0.18s;
                }
                .comments-toggle:hover { background: rgba(11,76,143,0.10); }
                .comments-panel {
                    border-top: 0.5px solid rgba(11,76,143,0.08);
                    padding: 12px 16px 14px;
                    background: rgba(244,248,255,0.5);
                }
                .comments-list {
                    display: flex; flex-direction: column; gap: 10px;
                    margin-bottom: 12px;
                    max-height: 320px;
                    overflow-y: auto;
                }
                .comments-empty, .comments-loading {
                    text-align: center;
                    font-size: 12px;
                    color: var(--text-tertiary);
                    padding: 14px 8px;
                    font-style: italic;
                }
                .comment-item {
                    display: flex; gap: 10px; align-items: flex-start;
                }
                .comment-avatar-small {
                    width: 30px; height: 30px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--cobalt), var(--cyan, #17C8D4));
                    color: white;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 14px;
                    flex-shrink: 0;
                    box-shadow: 0 2px 6px rgba(11,76,143,0.18);
                }
                .comment-body {
                    flex: 1; min-width: 0;
                    background: white;
                    border-radius: 14px;
                    padding: 8px 12px;
                    box-shadow: 0 1px 3px rgba(11,76,143,0.06);
                }
                .comment-meta {
                    display: flex; align-items: baseline; gap: 8px;
                    font-size: 12px; color: var(--cobalt);
                    margin-bottom: 2px;
                }
                .comment-meta strong { font-weight: 800; }
                .comment-time {
                    font-size: 10.5px; font-weight: 500;
                    color: var(--text-tertiary);
                }
                .comment-text {
                    font-size: 13px;
                    color: var(--text-primary);
                    line-height: 1.4;
                    word-wrap: break-word;
                    overflow-wrap: anywhere;
                }
                .comment-compose {
                    display: flex; gap: 8px; align-items: center;
                }
                .comment-input {
                    flex: 1; min-width: 0;
                    background: white;
                    border: 0.5px solid rgba(11,76,143,0.12);
                    border-radius: 999px;
                    padding: 9px 14px;
                    font-size: 13px;
                    color: var(--text-primary);
                    font-family: -apple-system, sans-serif;
                    outline: none;
                }
                .comment-input:focus { border-color: var(--cobalt); }
                .comment-send-btn {
                    width: 36px; height: 36px;
                    border-radius: 50%;
                    background: var(--brand-bright);
                    color: white;
                    border: none;
                    font-size: 18px; font-weight: 800;
                    cursor: pointer;
                    flex-shrink: 0;
                    box-shadow: 0 4px 10px rgba(11,113,252,0.28);
                }
                .comment-send-btn:active { transform: scale(0.92); }
                .comment-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

                /* ─── Banner "Hace 1 año" ─── */
                .one-year-ago-banner {
                    display: flex; align-items: center; gap: 12px;
                    margin: 0 0 18px;
                    padding: 14px 16px;
                    background: linear-gradient(135deg, rgba(255,200,100,0.18), rgba(255,150,80,0.14));
                    border: 0.5px solid rgba(255,180,80,0.32);
                    border-radius: 18px;
                    box-shadow: 0 4px 14px rgba(255,150,50,0.10);
                }
                .oya-icon { font-size: 28px; flex-shrink: 0; }
                .oya-text { flex: 1; min-width: 0; }
                .oya-title {
                    font-weight: 800; font-size: 13px;
                    color: #8B5C00;
                    margin-bottom: 2px;
                }
                .oya-sub {
                    font-size: 12px; color: #6B4500;
                    overflow: hidden; text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .oya-thumb {
                    width: 56px; height: 56px;
                    border-radius: 12px; object-fit: cover;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
                }

                .moments-empty {
                    text-align: center; padding: 40px 24px;
                    background: rgba(255,255,255,0.6);
                    border-radius: 24px;
                    border: 1px dashed rgba(11,76,143,0.15);
                }
                .moments-empty-icon { font-size: 48px; margin-bottom: 12px; }
                .moments-empty-title {
                    font-family: 'Poppins', sans-serif;
                    font-size: 16px; font-weight: 800; color: var(--cobalt);
                    margin-bottom: 6px;
                }
                .moments-empty-text {
                    font-size: 13px; color: var(--text-secondary);
                    line-height: 1.5;
                }

                /* Modal preview antes de subir */
                .moment-preview-modal .preview-img {
                    width: 100%; max-height: 380px; object-fit: cover;
                    border-radius: 16px;
                    margin-bottom: 14px;
                    background: #f0f7ff;
                }
                .moment-caption-input {
                    width: 100% !important;
                    min-height: 70px !important;
                    border-radius: 16px !important;
                    padding: 12px 14px !important;
                    font-size: 14px !important;
                    margin-bottom: 14px !important;
                    resize: none !important;
                    font-family: -apple-system, sans-serif !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Bind eventos
        const fileInput = document.getElementById('moments-file-input');
        const captureBtn = document.getElementById('moments-capture-btn');

        captureBtn.onclick = () => {
            if (!user || user.isGuest) {
                window.GoHappyToast.warning('Inicia sesión con cuenta real para capturar momentos.');
                return;
            }
            fileInput.click();
        };

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            window.GoHappyMoments._handleImageSelected(file, user);
        };

        // Bind toggle Familia / Comunidad
        container.querySelectorAll('.m-feed-pill').forEach(pill => {
            pill.onclick = () => {
                const feed = pill.dataset.feed;
                if (feed === window.GoHappyMoments._currentFeed) return;
                window.GoHappyMoments._currentFeed = feed;

                // Visual
                container.querySelectorAll('.m-feed-pill').forEach(p => {
                    if (p.dataset.feed === feed) {
                        p.style.background = 'var(--brand-bright)';
                        p.style.color = 'white';
                        p.style.boxShadow = '0 4px 12px rgba(11,113,252,0.28)';
                        p.style.fontWeight = '800';
                    } else {
                        p.style.background = 'transparent';
                        p.style.color = 'var(--text-secondary)';
                        p.style.boxShadow = 'none';
                        p.style.fontWeight = '700';
                    }
                });

                // Actualizar texto de privacidad
                const sub = document.getElementById('moments-privacy-sub');
                if (sub) {
                    const lang = window.GoHappyI18n?.lang || 'es';
                    sub.textContent = feed === 'community'
                        ? (lang === 'en' ? '🌍 Public feed — choose audience when sharing' : '🌍 Feed público — eliges audiencia al compartir')
                        : (lang === 'en' ? 'Only your family will see this (private Tribe)' : 'Solo lo verá tu familia (Tribu privada)');
                }

                // Recargar feed
                window.GoHappyMoments._knownIds = new Set();
                window.GoHappyMoments._loadFeed(user);
            };
        });

        // Cargar feed
        await window.GoHappyMoments._loadFeed(user);
    },

    // Listener en tiempo real (familia social)
    _unsubFeed: null,
    _knownIds: new Set(),

    _loadFeed: async (user) => {
        const feed = document.getElementById('moments-feed');
        if (!feed) return;

        // Cleanup listener anterior si lo había
        if (window.GoHappyMoments._unsubFeed) {
            try { window.GoHappyMoments._unsubFeed(); } catch (e) {}
            window.GoHappyMoments._unsubFeed = null;
        }

        const scope = user?.familyId || user?.uid || null;
        const lang = window.GoHappyI18n?.lang || 'es';

        if (!scope) {
            feed.innerHTML = `
                <div class="moments-empty">
                    <div class="moments-empty-icon">🔐</div>
                    <div class="moments-empty-title">${lang === 'en' ? 'Sign in' : 'Inicia sesión'}</div>
                    <div class="moments-empty-text">${lang === 'en' ? 'To see and share moments with your family.' : 'Para ver y compartir momentos con tu familia.'}</div>
                </div>
            `;
            return;
        }

        // Construir query según feed activo
        const feedMode = window.GoHappyMoments._currentFeed || 'family';
        let query;
        if (feedMode === 'community') {
            // Feed comunidad: todos los moments públicos
            query = window.GoHappyDB.collection('moments')
                .where('visibility', '==', 'public')
                .orderBy('createdAt', 'desc')
                .limit(50);
        } else {
            // Feed familia: todos los moments de mi familia (privados + propios públicos)
            query = window.GoHappyDB.collection('moments')
                .where('familyId', '==', scope)
                .orderBy('createdAt', 'desc')
                .limit(50);
        }

        // Real-time listener — auto-refresca cuando otro miembro publica
        try {
            window.GoHappyMoments._unsubFeed = query
                .onSnapshot((snap) => {
                    if (snap.empty) {
                        const T = window.t || (k => k);
                        feed.innerHTML = `
                            <div class="moments-empty">
                                <div class="moments-empty-icon">📸</div>
                                <div class="moments-empty-title">${T('moments.empty.title')}</div>
                                <div class="moments-empty-text">${T('moments.empty.text')}</div>
                            </div>
                        `;
                        return;
                    }

                    const moments = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Detectar nuevos posts de OTROS miembros (no mío) → toast
                    const newOnes = moments.filter(m => !window.GoHappyMoments._knownIds.has(m.id));
                    const hasInitialLoad = window.GoHappyMoments._knownIds.size > 0;
                    if (hasInitialLoad) {
                        newOnes
                            .filter(m => m.userId !== user.uid)
                            .forEach(m => {
                                const author = m.userName || (lang === 'en' ? 'Family member' : 'Alguien de la familia');
                                window.GoHappyToast && window.GoHappyToast.info(
                                    lang === 'en' ? `📸 ${author} just shared a moment` : `📸 ${author} ha compartido un momento`,
                                    3500
                                );
                            });
                    }
                    moments.forEach(m => window.GoHappyMoments._knownIds.add(m.id));

                    // Banner "Hace 1 año"
                    const oneYearAgoHtml = window.GoHappyMoments._buildOneYearAgo(moments, user);

                    feed.innerHTML = oneYearAgoHtml + moments.map(m => window.GoHappyMoments._renderMomentCard(m, user)).join('');

                    // Bind reacciones
                    feed.querySelectorAll('.reaction-btn').forEach(btn => {
                        btn.onclick = () => window.GoHappyMoments._toggleReaction(btn.dataset.moment, btn.dataset.emoji, user);
                    });

                    // Bind comentarios — toggle panel
                    feed.querySelectorAll('.comments-toggle').forEach(btn => {
                        btn.onclick = () => window.GoHappyMoments._toggleCommentsPanel(btn.dataset.moment, user);
                    });
                    // Bind enviar comentario
                    feed.querySelectorAll('.comment-send-btn').forEach(btn => {
                        btn.onclick = () => window.GoHappyMoments._sendComment(btn.dataset.moment, user);
                    });
                    feed.querySelectorAll('.comment-input').forEach(inp => {
                        inp.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                window.GoHappyMoments._sendComment(inp.dataset.moment, user);
                            }
                        });
                    });
                }, (err) => {
                    console.error('Moments listener error:', err);
                    feed.innerHTML = `<div class="moments-empty"><div class="moments-empty-icon">⚠️</div><div class="moments-empty-title">${lang === 'en' ? 'Could not load' : 'No se pudo cargar'}</div></div>`;
                });
        } catch (e) {
            console.error('Moments _loadFeed setup error:', e);
        }
    },

    _renderMomentCard: (m, user) => {
        const sec = window.GoHappySecurity;
        const safeAuthor = sec ? sec.safe(m.userName || 'Familia') : (m.userName || 'Familia');
        const safeCaption = sec ? sec.safe(m.caption || '') : (m.caption || '');
        const safeAvatar = m.userPhoto || '👤';

        const time = m.createdAt?.toDate ? m.createdAt.toDate() : new Date();
        const timeStr = window.GoHappyMoments._timeAgo(time);

        const reactions = m.reactions || { '❤️': [], '😂': [], '😮': [], '🥰': [] };
        const myUid = user?.uid;

        const reactionsHtml = ['❤️','😂','😮','🥰'].map(emoji => {
            const list = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];
            const count = list.length;
            const reacted = myUid && list.includes(myUid);
            return `<button class="reaction-btn ${reacted ? 'reacted' : ''}" data-moment="${m.id}" data-emoji="${emoji}">
                <span>${emoji}</span>${count > 0 ? `<span class="reaction-count">${count}</span>` : ''}
            </button>`;
        }).join('');

        const lang = window.GoHappyI18n?.lang || 'es';
        const commentsCount = m.commentsCount || 0;
        const commentsLabel = lang === 'en'
            ? (commentsCount === 0 ? 'Comment' : `${commentsCount} comment${commentsCount > 1 ? 's' : ''}`)
            : (commentsCount === 0 ? 'Comentar' : `${commentsCount} comentario${commentsCount > 1 ? 's' : ''}`);

        return `
            <div class="moment-card card-anim" data-moment-id="${m.id}">
                <div class="moment-header">
                    <div class="moment-avatar">${safeAvatar}</div>
                    <div class="moment-meta">
                        <h4 class="moment-author">${safeAuthor}</h4>
                        <div class="moment-time">${timeStr}</div>
                    </div>
                </div>
                ${m.imageData ? `<img class="moment-image" src="${m.imageData}" alt="momento">` : ''}
                ${safeCaption ? `<div class="moment-caption">${safeCaption}</div>` : ''}
                <div class="moment-reactions">${reactionsHtml}</div>
                <button class="comments-toggle" data-moment="${m.id}">
                    💬 <span class="comments-label">${commentsLabel}</span>
                </button>
                <div class="comments-panel" id="comments-${m.id}" style="display:none;">
                    <div class="comments-list" id="comments-list-${m.id}">
                        <div class="comments-loading">${lang === 'en' ? 'Loading…' : 'Cargando…'}</div>
                    </div>
                    <div class="comment-compose">
                        <div class="comment-avatar-small">${user?.photo || '👤'}</div>
                        <input class="comment-input" data-moment="${m.id}" type="text" placeholder="${lang === 'en' ? 'Write a comment…' : 'Escribe un comentario…'}" maxlength="280">
                        <button class="comment-send-btn" data-moment="${m.id}">↑</button>
                    </div>
                </div>
            </div>
        `;
    },

    // ─── Banner "Hace 1 año" (memoria nostálgica) ───
    _buildOneYearAgo: (moments, user) => {
        const lang = window.GoHappyI18n?.lang || 'es';
        const today = new Date();
        const targetMonth = today.getMonth();
        const targetDay = today.getDate();
        const targetYear = today.getFullYear() - 1;

        const memory = moments.find(m => {
            const d = m.createdAt?.toDate ? m.createdAt.toDate() : null;
            if (!d) return false;
            return d.getFullYear() === targetYear && d.getMonth() === targetMonth && d.getDate() === targetDay;
        });
        if (!memory) return '';

        const author = memory.userName || (lang === 'en' ? 'Family' : 'Familia');
        const caption = String(memory.caption || '').slice(0, 60);
        return `
            <div class="one-year-ago-banner">
                <div class="oya-icon">🗓️</div>
                <div class="oya-text">
                    <div class="oya-title">${lang === 'en' ? '1 year ago today' : 'Hace 1 año, tal día como hoy'}</div>
                    <div class="oya-sub">${author}${caption ? ' · ' + caption : ''}</div>
                </div>
                ${memory.imageData ? `<img class="oya-thumb" src="${memory.imageData}" alt="">` : ''}
            </div>
        `;
    },

    // ─── COMENTARIOS familiares ───
    _toggleCommentsPanel: async (momentId, user) => {
        const panel = document.getElementById(`comments-${momentId}`);
        if (!panel) return;
        const isOpen = panel.style.display !== 'none';
        if (isOpen) {
            panel.style.display = 'none';
            return;
        }
        panel.style.display = 'block';
        await window.GoHappyMoments._loadComments(momentId, user);
    },

    _loadComments: async (momentId, user) => {
        const list = document.getElementById(`comments-list-${momentId}`);
        if (!list) return;
        const lang = window.GoHappyI18n?.lang || 'es';
        try {
            const snap = await window.GoHappyDB
                .collection('moments').doc(momentId)
                .collection('comments')
                .orderBy('createdAt', 'asc')
                .limit(50)
                .get();
            if (snap.empty) {
                list.innerHTML = `<div class="comments-empty">${lang === 'en' ? 'Be the first to comment 💬' : 'Sé el primero en comentar 💬'}</div>`;
                return;
            }
            const sec = window.GoHappySecurity;
            const safe = (s) => sec ? sec.safe(s || '') : String(s || '').replace(/[<>]/g, '');
            list.innerHTML = snap.docs.map(d => {
                const c = d.data();
                const time = c.createdAt?.toDate ? window.GoHappyMoments._timeAgo(c.createdAt.toDate()) : '';
                return `
                    <div class="comment-item">
                        <div class="comment-avatar-small">${c.userPhoto || '👤'}</div>
                        <div class="comment-body">
                            <div class="comment-meta">
                                <strong>${safe(c.userName || 'Familia')}</strong>
                                <span class="comment-time">${time}</span>
                            </div>
                            <div class="comment-text">${safe(c.text)}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.warn('comments load error:', e?.message);
            list.innerHTML = `<div class="comments-empty">${lang === 'en' ? 'Could not load comments' : 'No se han podido cargar los comentarios'}</div>`;
        }
    },

    _sendComment: async (momentId, user) => {
        if (!user || user.isGuest) return;
        const input = document.querySelector(`.comment-input[data-moment="${momentId}"]`);
        if (!input) return;
        const text = input.value.trim().slice(0, 280);
        if (!text) return;
        const lang = window.GoHappyI18n?.lang || 'es';

        const btn = document.querySelector(`.comment-send-btn[data-moment="${momentId}"]`);
        if (btn) btn.disabled = true;
        input.disabled = true;

        try {
            await window.GoHappyDB
                .collection('moments').doc(momentId)
                .collection('comments')
                .add({
                    userId: user.uid,
                    userName: user.nickname || user.email?.split('@')[0] || 'Familia',
                    userPhoto: user.photo || '👤',
                    text,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            // Incrementar contador en el doc padre (best-effort)
            try {
                await window.GoHappyDB.collection('moments').doc(momentId).update({
                    commentsCount: firebase.firestore.FieldValue.increment(1)
                });
            } catch (e) {}

            input.value = '';
            await window.GoHappyMoments._loadComments(momentId, user);
            window.GoHappySound && window.GoHappySound.play('like');
        } catch (e) {
            console.warn('send comment error:', e?.message);
            window.GoHappyToast && window.GoHappyToast.error(lang === 'en' ? 'Could not post comment' : 'No se pudo publicar el comentario');
        } finally {
            input.disabled = false;
            if (btn) btn.disabled = false;
        }
    },

    _handleImageSelected: async (file, user) => {
        try {
            // 1. Comprimir imagen a max 800px y JPEG quality 0.7
            const compressed = await window.GoHappyMoments._compressImage(file, 800, 0.72);
            window.GoHappyMoments._photoData = compressed;

            // 2. Mostrar modal preview con caption opcional
            window.GoHappyMoments._showPreviewModal(compressed, user);
        } catch (e) {
            console.error('Image processing error:', e);
            window.GoHappyToast.error('No se pudo procesar la imagen.');
        }
    },

    _compressImage: (file, maxSize = 800, quality = 0.72) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;
                    if (width > height && width > maxSize) {
                        height = (maxSize / width) * height;
                        width = maxSize;
                    } else if (height > maxSize) {
                        width = (maxSize / height) * width;
                        height = maxSize;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    _showPreviewModal: (imageData, user) => {
        const T = window.t || (k => k);
        const lang = window.GoHappyI18n?.lang || 'es';
        const modal = document.createElement('div');
        modal.className = 'modal entry-anim moment-preview-modal';
        modal.innerHTML = `
            <div class="auth-container">
                <h3 style="font-family:'Poppins',sans-serif; font-weight:900; color:var(--cobalt); font-size:1.3rem; margin-bottom:6px; text-align:center;">${T('moments.preview.title')}</h3>
                <p style="font-size:13px; color:var(--text-secondary); text-align:center; margin-bottom:14px;">${T('moments.preview.sub')}</p>
                <img class="preview-img" src="${imageData}" alt="preview">
                <textarea class="moment-caption-input" id="mc-caption" placeholder="${T('moments.preview.caption')}" maxlength="200"></textarea>

                <!-- Selector de audiencia -->
                <div style="margin: 14px 0; display:flex; gap:8px;">
                    <button type="button" class="mc-aud-btn active" data-aud="family" style="flex:1; padding:12px 8px; border:1px solid var(--cobalt); border-radius:14px; background:rgba(11,113,252,0.10); color:var(--cobalt); font-weight:800; font-size:13px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px;">
                        <span style="font-size:22px;">👨‍👩‍👧</span>
                        <span>${lang === 'en' ? 'Only my family' : 'Solo mi familia'}</span>
                        <span style="font-weight:500; font-size:10px; color:var(--text-secondary);">${lang === 'en' ? 'Private' : 'Privado'}</span>
                    </button>
                    <button type="button" class="mc-aud-btn" data-aud="public" style="flex:1; padding:12px 8px; border:0.5px solid rgba(11,76,143,0.18); border-radius:14px; background:white; color:var(--text-primary); font-weight:700; font-size:13px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px;">
                        <span style="font-size:22px;">🌍</span>
                        <span>${lang === 'en' ? 'Community' : 'Comunidad'}</span>
                        <span style="font-weight:500; font-size:10px; color:var(--text-secondary);">${lang === 'en' ? 'Public' : 'Público'}</span>
                    </button>
                </div>

                <!-- Aviso GDPR menores (solo se muestra si elige público) -->
                <div id="mc-gdpr-warn" style="display:none; background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(239,68,68,0.08)); border:1px solid rgba(245,158,11,0.32); border-radius:14px; padding:12px; margin-bottom:14px; font-size:12px; color:#92400E; line-height:1.4;">
                    <strong style="color:#B45309;">⚠️ ${lang === 'en' ? 'Protect minors' : 'Protección de menores'}</strong><br>
                    ${lang === 'en'
                        ? 'If kids appear in the photo, please cover/blur their faces before sharing publicly. By law in EU, minors faces need consent of both parents to be shared.'
                        : 'Si aparecen menores en la foto, por favor tapa o difumina sus caras antes de compartir públicamente. Por ley en la UE, las caras de menores requieren consentimiento de ambos padres.'}
                    <label style="display:flex; align-items:flex-start; gap:8px; margin-top:10px; cursor:pointer;">
                        <input type="checkbox" id="mc-gdpr-check" style="margin-top:2px; transform:scale(1.2);">
                        <span style="font-weight:700; color:#7C2D12;">${lang === 'en' ? 'I confirm minors faces are not visible or are blurred.' : 'Confirmo que las caras de menores NO son visibles o están difuminadas.'}</span>
                    </label>
                </div>

                <button id="mc-publish" class="btn-primary" style="width:100%; height:54px; margin-bottom:10px;">${T('moments.publish')}</button>
                <button id="mc-cancel" class="btn-plan-secondary" style="width:100%; height:48px;">${T('moments.cancel')}</button>
            </div>
        `;
        document.body.appendChild(modal);

        // Estado de audiencia
        let audience = 'family';
        modal.querySelectorAll('.mc-aud-btn').forEach(btn => {
            btn.onclick = () => {
                audience = btn.dataset.aud;
                modal.querySelectorAll('.mc-aud-btn').forEach(b => {
                    if (b.dataset.aud === audience) {
                        b.style.border = '1px solid var(--cobalt)';
                        b.style.background = 'rgba(11,113,252,0.10)';
                        b.style.color = 'var(--cobalt)';
                        b.style.fontWeight = '800';
                        b.classList.add('active');
                    } else {
                        b.style.border = '0.5px solid rgba(11,76,143,0.18)';
                        b.style.background = 'white';
                        b.style.color = 'var(--text-primary)';
                        b.style.fontWeight = '700';
                        b.classList.remove('active');
                    }
                });
                document.getElementById('mc-gdpr-warn').style.display = audience === 'public' ? 'block' : 'none';
            };
        });

        document.getElementById('mc-cancel').onclick = () => {
            modal.remove();
            window.GoHappyMoments._photoData = null;
        };

        document.getElementById('mc-publish').onclick = async () => {
            const caption = document.getElementById('mc-caption').value.trim().slice(0, 200);
            const publishBtn = document.getElementById('mc-publish');

            // Validación GDPR menores si público
            if (audience === 'public') {
                const gdprCheck = document.getElementById('mc-gdpr-check');
                if (!gdprCheck?.checked) {
                    window.GoHappyToast?.warning(lang === 'en'
                        ? 'Confirm minors faces are protected before publishing publicly'
                        : 'Confirma que las caras de menores están protegidas antes de publicar en público', 4000);
                    return;
                }
            }

            publishBtn.disabled = true;
            publishBtn.textContent = '⌛ ' + (window.t ? window.t('common.loading') : 'Publicando...');

            try {
                await window.GoHappyMoments._publishMoment(imageData, caption, user, audience);

                // Sprint 2: extraer intereses del caption → family_context
                try {
                    if (window.GoHappyContext && caption) {
                        const INTERESTS = [
                            { tag:'nature',     re:/parque|park|playa|beach|monta[ñn]a|mountain|bosque|forest|naturaleza|nature/i },
                            { tag:'museum',    re:/museo|museum|exposici[oó]n|exhibition/i },
                            { tag:'sports',    re:/f[uú]tbol|football|deporte|sport|bici|bike|patin|skat|natac|swim/i },
                            { tag:'food',      re:/restaur|comida|food|helado|ice ?cream|pizza|brunch/i },
                            { tag:'culture',   re:/teatro|theater|concierto|concert|cine|cinema|libro|book/i },
                            { tag:'animals',   re:/zoo|acuario|aquarium|animal|perro|dog|gato|cat|granja|farm/i },
                            { tag:'water',     re:/piscina|pool|playa|beach|r[ií]o|river|lago|lake/i },
                            { tag:'adventure', re:/aventura|adventure|escalada|climb|tirolina|zipline|kart/i }
                        ];
                        const text = caption.toLowerCase();
                        INTERESTS.forEach(({ tag, re }) => {
                            if (re.test(text)) window.GoHappyContext.addInterest(tag);
                        });
                        window.GoHappyContext.addActivity('moment_shared', { caption: caption.slice(0, 80) });
                    }
                } catch (e) { /* ignore */ }

                modal.remove();
                window.GoHappySound && window.GoHappySound.play('success');
                window.GoHappyToast.points(window.t ? window.t('moments.published') : '¡Momento compartido! +20 pts ✨');
                // Real-time listener refresca solo
            } catch (e) {
                console.error('Publish error:', e);
                publishBtn.disabled = false;
                publishBtn.textContent = window.t ? window.t('moments.publish') : '📤  Compartir con la familia';
                window.GoHappyToast.error(e.message || (window.t ? window.t('moments.publish.fail') : 'No se pudo publicar.'));
            }
        };
    },

    _publishMoment: async (imageData, caption, user, audience = 'family') => {
        // Diagnóstico claro: distinguir entre los 3 estados
        if (!user || !user.uid) {
            throw new Error('No estás identificado. Pulsa "Iniciar sesión" arriba.');
        }
        if (user.isGuest) {
            throw new Error('Como invitado no puedes publicar. Regístrate gratis (10s) para compartir momentos.');
        }
        // Verificar que Firebase Auth coincide con la sesión local
        const fbUser = window.GoHappyAuthReal?.currentUser;
        if (!fbUser || fbUser.uid !== user.uid) {
            throw new Error('Tu sesión expiró. Recarga la página y vuelve a iniciar sesión.');
        }
        if (fbUser.isAnonymous) {
            throw new Error('Las cuentas anónimas no pueden publicar. Regístrate gratis para participar.');
        }

        const familyId = user.familyId || user.uid;

        // Si user.photo es data URI larga (>100 chars), guardamos emoji por defecto
        // para no inflar cada doc de moment con miles de bytes
        const userPhotoSafe = (user.photo && user.photo.startsWith('data:') && user.photo.length > 100)
            ? '👤'
            : (user.photo || '👤');

        const moment = {
            userId: user.uid,
            userName: user.nickname || 'Familia',
            userPhoto: userPhotoSafe,
            familyId: familyId,
            caption: caption || '',
            imageData: imageData,  // base64 (max ~300KB tras compresión)
            reactions: { '❤️': [], '😂': [], '😮': [], '🥰': [] },
            visibility: audience === 'public' ? 'public' : 'family',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await window.GoHappyDB.collection('moments').add(moment);
        } catch (e) {
            console.error('[Moments] publish error:', e?.code, e?.message);
            if (e?.code === 'permission-denied') {
                throw new Error('Permiso denegado por las reglas. ¿Foto muy grande o caption con HTML?');
            }
            throw new Error('No se pudo publicar: ' + (e?.message || e?.code || 'error desconocido'));
        }

        // Actividad para Memories
        try {
            await window.GoHappyDB.collection('activity').add({
                userId: user.uid,
                type: 'moment_shared',
                title: caption ? caption.slice(0, 60) : 'Momento compartido',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                points: 20
            });
        } catch (e) { /* no critico */ }

        // Sumar puntos
        if (window.GoHappyPoints) {
            try { await window.GoHappyPoints.addPoints('PHOTO_VIDEO'); } catch (e) {}
        }
    },

    _toggleReaction: async (momentId, emoji, user) => {
        if (!user || user.isGuest) return;
        try {
            const ref = window.GoHappyDB.collection('moments').doc(momentId);
            const doc = await ref.get();
            if (!doc.exists) return;

            const data = doc.data();
            const reactions = data.reactions || {};
            const list = Array.isArray(reactions[emoji]) ? reactions[emoji] : [];

            const myUid = user.uid;
            let newList;
            if (list.includes(myUid)) {
                newList = list.filter(u => u !== myUid);
            } else {
                newList = [...list, myUid];
            }

            const updated = { ...reactions, [emoji]: newList };
            await ref.update({ reactions: updated });
            // El listener real-time refresca el feed automáticamente
            window.GoHappySound && window.GoHappySound.play('like');
        } catch (e) {
            console.warn('toggleReaction error:', e);
        }
    },

    _timeAgo: (date) => {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60)    return 'Ahora mismo';
        if (seconds < 3600)  return `Hace ${Math.floor(seconds/60)} min`;
        if (seconds < 86400) return `Hace ${Math.floor(seconds/3600)} h`;
        if (seconds < 604800) return `Hace ${Math.floor(seconds/86400)} d`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
};
