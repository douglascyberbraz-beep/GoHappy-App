// ================================================================
// GoHappy Moments — BeReal familiar
// Foto/momento rápido visible solo para tu Tribu (familia + invitados)
// Genera álbum mensual automático con IA
// ================================================================
window.GoHappyMoments = {

    PROMPTS: [
        "¿Qué estáis haciendo en familia ahora? 📸",
        "Capturad un momento bonito de hoy ✨",
        "Una sonrisa. Una foto. Un recuerdo. 💝",
        "¿Quién ha hecho reír a la familia hoy? 😂",
        "Mostrad el momento más happy del día 🌟",
        "Una foto que cuente vuestro día 📷",
        "El detalle pequeño que os hizo felices hoy 🎈"
    ],

    _currentPrompt: null,
    _photoData: null,

    render: async (container) => {
        const user = window.GoHappyAuth.checkAuth();

        // Prompt aleatorio del día (consistente por día)
        const dayHash = new Date().toDateString().split('').reduce((h,c) => h + c.charCodeAt(0), 0);
        window.GoHappyMoments._currentPrompt = window.GoHappyMoments.PROMPTS[dayHash % window.GoHappyMoments.PROMPTS.length];

        container.innerHTML = `
            <div class="moments-page">
                <div class="unified-hero">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; position:relative; z-index:2;">
                        <div style="flex:1;">
                            <h2>💝 Moments</h2>
                            <p>Vuestros recuerdos en familia, todo el año</p>
                        </div>
                    </div>
                </div>

                <!-- Prompt del día + botón captura -->
                <div class="moments-prompt-card" style="margin: 0 16px 16px;">
                    <div class="moments-prompt-icon">📸</div>
                    <div style="flex:1;">
                        <div class="moments-prompt-text">${window.GoHappyMoments._currentPrompt}</div>
                        <div class="moments-prompt-sub">Solo lo verá tu familia (Tribu privada)</div>
                    </div>
                </div>

                <button id="moments-capture-btn" class="btn-primary moments-capture-btn">
                    📷  Capturar momento
                </button>

                <!-- Hidden file input -->
                <input type="file" id="moments-file-input" accept="image/*" capture="environment" style="display:none;">

                <!-- Feed de momentos -->
                <div id="moments-feed" class="moments-feed stagger-group">
                    <div class="center-text p-40"><div class="typing-dots"><span></span><span></span><span></span></div><p style="margin-top:12px; color:var(--text-secondary); font-size:13px;">Cargando vuestros momentos...</p></div>
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

        // Cargar feed
        await window.GoHappyMoments._loadFeed(user);
    },

    _loadFeed: async (user) => {
        const feed = document.getElementById('moments-feed');
        if (!feed) return;

        try {
            // Determinar ámbito: familia si tiene, si no su propio uid
            const scope = user?.familyId || user?.uid || null;

            if (!scope) {
                feed.innerHTML = `
                    <div class="moments-empty">
                        <div class="moments-empty-icon">🔐</div>
                        <div class="moments-empty-title">Inicia sesión</div>
                        <div class="moments-empty-text">Para ver y compartir momentos con tu familia.</div>
                    </div>
                `;
                return;
            }

            // Query: últimos 30 días, ordenados desc
            const snap = await window.GoHappyDB.collection('moments')
                .where('familyId', '==', scope)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            if (snap.empty) {
                feed.innerHTML = `
                    <div class="moments-empty">
                        <div class="moments-empty-icon">📸</div>
                        <div class="moments-empty-title">Aún no hay momentos</div>
                        <div class="moments-empty-text">Sé el primero en capturar uno.<br>Toca el botón de arriba 👆</div>
                    </div>
                `;
                return;
            }

            const moments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            feed.innerHTML = moments.map(m => window.GoHappyMoments._renderMomentCard(m, user)).join('');

            // Bind reacciones
            feed.querySelectorAll('.reaction-btn').forEach(btn => {
                btn.onclick = () => window.GoHappyMoments._toggleReaction(btn.dataset.moment, btn.dataset.emoji, user);
            });

        } catch (e) {
            console.error('Moments _loadFeed error:', e);
            feed.innerHTML = `<div class="moments-empty"><div class="moments-empty-icon">⚠️</div><div class="moments-empty-title">No se pudo cargar</div><div class="moments-empty-text">Inténtalo de nuevo en unos segundos.</div></div>`;
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

        return `
            <div class="moment-card card-anim">
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
            </div>
        `;
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
        const modal = document.createElement('div');
        modal.className = 'modal entry-anim moment-preview-modal';
        modal.innerHTML = `
            <div class="auth-container">
                <h3 style="font-family:'Poppins',sans-serif; font-weight:900; color:var(--cobalt); font-size:1.3rem; margin-bottom:6px; text-align:center;">Tu momento ✨</h3>
                <p style="font-size:13px; color:var(--text-secondary); text-align:center; margin-bottom:18px;">Solo lo verá tu familia</p>
                <img class="preview-img" src="${imageData}" alt="preview">
                <textarea class="moment-caption-input" id="mc-caption" placeholder="Añade una nota (opcional)..." maxlength="200"></textarea>
                <button id="mc-publish" class="btn-primary" style="width:100%; height:54px; margin-bottom:10px;">📤  Compartir con la familia</button>
                <button id="mc-cancel" class="btn-plan-secondary" style="width:100%; height:48px;">Cancelar</button>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('mc-cancel').onclick = () => {
            modal.remove();
            window.GoHappyMoments._photoData = null;
        };

        document.getElementById('mc-publish').onclick = async () => {
            const caption = document.getElementById('mc-caption').value.trim().slice(0, 200);
            const publishBtn = document.getElementById('mc-publish');
            publishBtn.disabled = true;
            publishBtn.textContent = '⌛ Publicando...';

            try {
                await window.GoHappyMoments._publishMoment(imageData, caption, user);
                modal.remove();
                window.GoHappySound && window.GoHappySound.play('success');
                window.GoHappyToast.points('¡Momento compartido! +20 pts ✨');
                // Recargar feed
                setTimeout(() => window.GoHappyMoments._loadFeed(user), 500);
            } catch (e) {
                console.error('Publish error:', e);
                publishBtn.disabled = false;
                publishBtn.textContent = '📤  Compartir con la familia';
                window.GoHappyToast.error(e.message || 'No se pudo publicar.');
            }
        };
    },

    _publishMoment: async (imageData, caption, user) => {
        if (!user || user.isGuest) throw new Error('Inicia sesión para compartir momentos.');

        const familyId = user.familyId || user.uid;

        const moment = {
            userId: user.uid,
            userName: user.nickname || 'Familia',
            userPhoto: user.photo || '👤',
            familyId: familyId,
            caption: caption || '',
            imageData: imageData,  // base64 (max ~300KB tras compresión)
            reactions: { '❤️': [], '😂': [], '😮': [], '🥰': [] },
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await window.GoHappyDB.collection('moments').add(moment);

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

            // Refresh feed (visual update rápido)
            await window.GoHappyMoments._loadFeed(user);

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
