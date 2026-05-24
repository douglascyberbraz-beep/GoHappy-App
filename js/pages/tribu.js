window.GoHappyTribu = {
    // Keep state cached in memory
    postsCache: null,
    activeTab: 'comunidad', // 'comunidad', 'eventos', 'noticias'

    render: async (container) => {
        const lang = window.GoHappyI18n?.lang || 'es';
        const sub = lang === 'en'
            ? 'Share and connect with families like yours'
            : 'Comparte y conecta con familias como la tuya';
        container.innerHTML = `
            <div class="unified-hero">
                <h2 id="tribu-title">🏘️ Tribu</h2>
                <p>${sub}</p>
            </div>
            
            <div id="tribu-content" class="content-list stagger-group" style="padding-bottom: 100px; width: 100%; display: flex; flex-direction: column; align-items: center;">
                <div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>
            </div>

            <button class="fab-btn" id="tribu-action-btn">➕</button>

            <!-- New Post Modal -->
            <div id="post-modal" class="modal hidden">
                <div class="auth-container slide-up-anim">
                    <div class="auth-card">
                        <h3>Nueva Publicación</h3>
                        <textarea id="post-content" maxlength="160" placeholder="¿Qué quieres compartir? (Max 160 carácteres)" class="post-input"></textarea>
                        <div class="char-count">0/160</div>
                        <button id="publish-btn" class="btn-primary full-width">Publicar</button>
                        <button id="close-post-btn" class="btn-text" style="margin-top:10px;">Cancelar</button>
                    </div>
                </div>
            </div>
        `;

        const contentContainer = document.getElementById('tribu-content');
        const actionBtn = document.getElementById('tribu-action-btn');

        // Direct load community
        await window.GoHappyTribu.loadComunidad(contentContainer);

        // Modal Logic (only for Comunidad)
        const modal = document.getElementById('post-modal');
        const contentInput = document.getElementById('post-content');

        actionBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            contentInput.focus();
        });

        document.getElementById('close-post-btn').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        document.getElementById('publish-btn').addEventListener('click', async () => {
            const text = contentInput.value.trim();
            const user = window.GoHappyAuth.checkAuth();
            const fbUser = window.GoHappyAuthReal?.currentUser;

            if (!user || !user.uid) {
                window.GoHappyToast.warning(window.L('No estás identificado. Pulsa el botón de login arriba.', 'You are not signed in. Tap the login button at the top.'));
                return;
            }
            if (user.isGuest || fbUser?.isAnonymous) {
                window.GoHappyToast.warning(window.L('Como invitado no puedes publicar. Regístrate gratis para participar en la Tribu.', 'Guests cannot post. Sign up free to take part in the Tribe.'), 4500);
                return;
            }
            if (!fbUser || fbUser.uid !== user.uid) {
                window.GoHappyToast.error(window.L('Tu sesión expiró. Recarga la página.', 'Your session expired. Reload the page.'), 4500);
                return;
            }

            // Validar contenido antes de publicar
            const sec = window.GoHappySecurity;
            if (sec && !sec.validate.postContent(text)) {
                window.GoHappyToast.error('El mensaje debe tener entre 1 y 160 caracteres.');
                return;
            }
            if (sec && !sec.isClean(text)) {
                window.GoHappyToast.error('Contenido no permitido. Por favor revisa tu mensaje.');
                return;
            }
            // Rate limiting local: máx 3 posts por minuto
            if (sec && !sec.checkLocalRateLimit('tribu_post', 3)) {
                window.GoHappyToast.warning(window.L('Estás publicando demasiado rápido. Espera un momento. 🙏', 'You are posting too fast. Please wait a moment. 🙏'));
                return;
            }

            if (text && text.length <= 160) {
                const publishBtn = document.getElementById('publish-btn');
                publishBtn.disabled = true;
                publishBtn.textContent = 'Publicando...';

                try {
                    await window.GoHappyData.addTribuPost(text, user);
                    window.GoHappyPoints.addPoints('COMMENT');

                    if (window.GoHappyTribu.postsCache) {
                        window.GoHappyTribu.postsCache.unshift({
                            id: Date.now(),
                            user: user.nickname || "Tú",
                            avatar: user.photo || "😎",
                            time: "Ahora",
                            content: text,
                            likes: 0,
                            comments: 0
                        });
                        if (window.GoHappyTribu.activeTab === 'comunidad') {
                            window.GoHappyTribu.renderPosts(contentContainer, window.GoHappyTribu.postsCache);
                        }
                    }

                    modal.classList.add('hidden');
                    contentInput.value = '';
                    window.GoHappyToast.points(window.L('¡Publicado! Has ganado 5 puntos. 🎉', 'Posted! You earned 5 points. 🎉'));
                } catch (e) {
                    console.error('[Tribu] publish error:', e);
                    window.GoHappyToast.error(e?.message || 'Error al publicar.', 4500);
                } finally {
                    publishBtn.disabled = false;
                    publishBtn.textContent = 'Publicar';
                }
            }
        });

        contentInput.addEventListener('input', () => {
            const count = contentInput.value.length;
            document.querySelector('.char-count').innerText = `${count}/160`;
            document.querySelector('.char-count').style.color = count > 160 ? 'red' : '#666';
        });
    },

    loadComunidad: async (container) => {
        const posts = await window.GoHappyData.getTribuPosts();
        window.GoHappyTribu.postsCache = posts;
        window.GoHappyTribu.renderPosts(container, posts);

        // Async AI Topic Injection
        setTimeout(async () => {
            if (window.GEMINI_PROXY_ACTIVE && window.GoHappyAI?.getDailyTribuTopic) {
                try {
                    let coords = "41.6520, -4.7286";
                    try {
                        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 }));
                        if (pos) coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
                    } catch (e) { }

                    const aiTopic = await window.GoHappyAI.getDailyTribuTopic(coords);
                    if (aiTopic && aiTopic.title) {
                        const aiPost = {
                            id: 'ai-topic',
                            user: "GoHappy IA",
                            avatar: "🤖",
                            time: aiTopic.date || "Ahora",
                            content: `<strong>${aiTopic.title}</strong><br><br>${aiTopic.content}`,
                            likes: aiTopic.likes || 12,
                            comments: aiTopic.comments || 4,
                            isAI: true
                        };
                        window.GoHappyTribu.postsCache.unshift(aiPost);
                        // Only re-render if still on comunidad tab
                        if (window.GoHappyTribu.activeTab === 'comunidad') {
                            window.GoHappyTribu.renderPosts(container, window.GoHappyTribu.postsCache);
                        }
                    }
                } catch (e) {
                    console.warn("Error loading AI Topic:", e);
                }
            }
        }, 500);
    },

    renderPosts: (container, postList) => {
        container.innerHTML = '';
        if (postList.length === 0) {
            container.innerHTML = '<p class="center-text p-20">No hay publicaciones aún. ¡Sé el primero!</p>';
            return;
        }
        const sec = window.GoHappySecurity;
        postList.forEach(post => {
            const card = document.createElement('div');
            card.className = `tribu-card entry-anim ${post.isAI ? 'ai-sponsored-card' : ''}`;
            // El estilo lo da premium.css — ya no inyectamos inline

            // Sanitizar todo el contenido de usuario antes de inyectar en DOM
            const safeAvatar  = sec ? sec.safe(post.avatar)  : (post.avatar  || '😊');
            const safeUser    = sec ? sec.safe(post.user)    : (post.user    || 'Usuario');
            const safeTime    = sec ? sec.safe(post.time)    : (post.time    || '');
            // El contenido del post puede incluir <strong> y <br> si viene de la IA
            const safeContent = post.isAI
                ? (sec ? sec.safePost(post.content) : post.content)
                : (sec ? sec.safe(post.content) : post.content);

            card.innerHTML = `
                <div class="tribu-header">
                    <div class="tribu-avatar" style="${post.isAI ? 'background: var(--primary-cobalt); box-shadow: 0 0 10px var(--accent-cyan);' : ''}">${safeAvatar}</div>
                    <div class="tribu-info">
                        <span class="tribu-user" style="${post.isAI ? 'font-weight: 900; color: var(--primary-cobalt);' : ''}">${safeUser}${post.isAI ? ' ✨ <em style="font-size:11px;opacity:0.7">(Oficial)</em>' : ''}</span>
                        <span class="tribu-time">${safeTime}</span>
                    </div>
                </div>
                <p class="tribu-content" style="${post.isAI ? 'font-size: 14px; line-height: 1.5; color: var(--primary-cobalt);' : ''}">${safeContent}</p>
                <div class="tribu-actions">
                    <button class="action-btn">❤️ ${parseInt(post.likes) || 0}</button>
                    <button class="action-btn">💬 ${parseInt(post.comments) || 0}</button>
                    <button class="action-btn">🔗</button>
                </div>
            `;
            container.appendChild(card);
        });
    }
};

