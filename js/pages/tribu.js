window.KindrTribu = {
    // Keep state cached in memory
    postsCache: null,
    activeTab: 'comunidad', // 'comunidad', 'eventos', 'noticias'

    render: async (container) => {
        container.innerHTML = `
            <div class="page-header sticky-header" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px;">
                <h2 id="tribu-title">🏘️ La Tribu</h2>
                <button class="btn-icon-pulse" id="tribu-action-btn">➕</button>
            </div>
            
            <div id="tribu-content" class="content-list stagger-group" style="padding-bottom: 100px; width: 100%; display: flex; flex-direction: column; align-items: center;">
                <div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>
            </div>

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
        await window.KindrTribu.loadComunidad(contentContainer);

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
            const user = window.KindrAuth.checkAuth();

            if (!user) {
                alert("Identifícate para participar en la Tribu.");
                return;
            }

            if (text && text.length <= 160) {
                const publishBtn = document.getElementById('publish-btn');
                publishBtn.disabled = true;
                publishBtn.textContent = 'Publicando...';

                try {
                    await window.KindrData.addTribuPost(text, user);
                    window.KindrPoints.addPoints('COMMENT');

                    if (window.KindrTribu.postsCache) {
                        window.KindrTribu.postsCache.unshift({
                            id: Date.now(),
                            user: user.nickname || "Tú",
                            avatar: user.photo || "😎",
                            time: "Ahora",
                            content: text,
                            likes: 0,
                            comments: 0
                        });
                        if (window.KindrTribu.activeTab === 'comunidad') {
                            window.KindrTribu.renderPosts(contentContainer, window.KindrTribu.postsCache);
                        }
                    }

                    modal.classList.add('hidden');
                    contentInput.value = '';
                    alert("¡Publicado! Has ganado 5 puntos.");
                } catch (e) {
                    alert("Error al publicar. Inténtalo de nuevo.");
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
        const posts = await window.KindrData.getTribuPosts();
        window.KindrTribu.postsCache = posts;
        window.KindrTribu.renderPosts(container, posts);
    },

    renderPosts: (container, postList) => {
        container.innerHTML = '';
        if (postList.length === 0) {
            container.innerHTML = '<p class="center-text p-20">No hay publicaciones aún. ¡Sé el primero!</p>';
            return;
        }
        postList.forEach(post => {
            const card = document.createElement('div');
            card.className = 'tribu-card entry-anim';
            card.innerHTML = `
                <div class="tribu-header">
                    <div class="tribu-avatar">${post.avatar}</div>
                    <div class="tribu-info">
                        <span class="tribu-user">${post.user}</span>
                        <span class="tribu-time">${post.time}</span>
                    </div>
                </div>
                <p class="tribu-content">${post.content}</p>
                <div class="tribu-actions">
                    <button class="action-btn">❤️ ${post.likes}</button>
                    <button class="action-btn">💬 ${post.comments}</button>
                    <button class="action-btn">🔗</button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    loadEventos: async (container) => {
        try {
            let userLoc = { lat: 41.6520, lng: -4.7286 }; // Valladolid default
            if (navigator.geolocation) {
                const pos = await new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 3000 });
                });
                if (pos) userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            }

            const events = await window.KindrAI.getEvents(`${userLoc.lat}, ${userLoc.lng}`);
            container.innerHTML = '';

            const filteredEvents = events.filter(ev => {
                if (!ev.lat || !ev.lng) return true;
                const dist = window.KindrEvents.getDistance(userLoc.lat, userLoc.lng, ev.lat, ev.lng);
                ev.distance = dist.toFixed(1);
                return dist <= 40; // Increased radius slightly for better variety
            });

            if (filteredEvents.length === 0) {
                container.innerHTML = '<p class="center-text p-20">No hay eventos cerca. ¡Vuelve pronto!</p>';
                return;
            }

            filteredEvents.forEach(item => {
                const card = document.createElement('div');
                card.className = 'event-card entry-anim';
                card.innerHTML = `
                    <div class="event-date-chip gradient-bg" style="padding: 5px 10px; border-radius: 10px; margin-bottom: 10px; display: inline-block;">
                        <span class="date" style="font-weight:700; font-size: 12px;">📅 ${item.date}</span>
                    </div>
                    <div class="card-body">
                        <span class="badge" style="background:#eee; color:#666; font-size:10px; margin-bottom:5px; display:inline-block;">📍 a ${item.distance || '?'} km</span>
                        <h3 style="margin: 5px 0; font-size: 1.1rem; color: var(--primary-navy);">${item.name}</h3>
                        <p style="font-size: 0.9rem; color: #555;">${item.info}</p>
                        <a href="${item.url}" target="_blank" class="btn-primary small full-width" style="margin-top:10px; text-decoration:none; display:inline-block; text-align:center; font-size: 12px; padding: 8px;">Ver Detalles</a>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (e) {
            container.innerHTML = '<p class="center-text p-20">Error al cargar eventos.</p>';
        }
    },

    loadNoticias: async (container) => {
        try {
            let userCoords = "41.6520, -4.7286";
            if (navigator.geolocation) {
                const pos = await new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 3000 });
                });
                if (pos) userCoords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
            }

            let news = await window.KindrAI.getNews(userCoords);
            container.innerHTML = '';

            news = news.filter(item =>
                !item.title.toUpperCase().includes('FACTOR X') &&
                !item.summary.toUpperCase().includes('FACTOR X')
            );

            if (news.length === 0) {
                container.innerHTML = '<p class="center-text p-20">Sin noticias hoy en tu zona.</p>';
                return;
            }

            news.forEach(item => {
                const card = document.createElement('div');
                card.className = 'news-card entry-anim';
                card.innerHTML = `
                    <div class="card-header" style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span class="badge" style="background: var(--primary-blue); color: white; font-size: 10px;">Novedad</span>
                        <span class="date" style="font-size: 10px; color: #888;">Hoy</span>
                    </div>
                    <h3 style="color: var(--primary-navy); margin: 10px 0; font-size: 1.1rem;">${item.title}</h3>
                    <p style="font-size: 0.9rem; color: #555; line-height: 1.4;">${item.summary}</p>
                    <div class="card-footer" style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 10px;">
                        <small style="color: #888; font-size: 10px;">Fuente: ${item.sourceName || 'Prensa'}</small>
                        <a href="${item.source}" target="_blank" class="btn-text" style="color: var(--primary-blue); font-weight: 600; text-decoration: none; font-size: 12px;">Leer más</a>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (e) {
            container.innerHTML = '<p class="center-text p-20">Error al cargar noticias.</p>';
        }
    }
};
