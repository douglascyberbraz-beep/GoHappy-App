window.GoHappyNewsEvents = {
    render: async (container) => {
        container.innerHTML = `
            <div class="unified-hero">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                    <div style="flex:1;">
                        <h2>🗞️ News</h2>
                        <p>Noticias, eventos y becas de tu zona</p>
                    </div>
                    <span id="loc-status" style="font-size:10px; color:var(--cobalt); background:rgba(11,76,143,0.08); backdrop-filter:blur(10px); padding:6px 12px; border-radius:999px; font-weight:700; white-space:nowrap; align-self:center; border:0.5px solid rgba(11,76,143,0.12);">📍 Detectando…</span>
                </div>

                <div class="tab-scroller" style="display:flex; gap:8px; margin-top:18px; overflow-x:auto; padding:4px;">
                    <button class="tab-btn active" data-tab="news" style="background:linear-gradient(135deg,#0B71FC,#17C8D4); color:white; border:none; padding:9px 18px; border-radius:999px; font-weight:700; font-size:12px; white-space:nowrap; cursor:pointer; box-shadow:0 6px 16px rgba(11,113,252,0.28);">Noticias</button>
                    <button class="tab-btn" data-tab="events" style="background:rgba(11,76,143,0.08); color:var(--cobalt); border:0.5px solid rgba(11,76,143,0.12); padding:9px 18px; border-radius:999px; font-weight:700; font-size:12px; white-space:nowrap; cursor:pointer;">Eventos</button>
                    <button class="tab-btn" data-tab="becas" style="background:rgba(11,76,143,0.08); color:var(--cobalt); border:0.5px solid rgba(11,76,143,0.12); padding:9px 18px; border-radius:999px; font-weight:700; font-size:12px; white-space:nowrap; cursor:pointer;">Becas</button>
                </div>
            </div>
            
            <div id="news-events-content" class="content-list stagger-group" style="padding-bottom: 100px; width: 100%; display: flex; flex-direction: column; align-items: center;">
                <div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>
            </div>
        `;

        const content = document.getElementById('news-events-content');
        const locStatus = document.getElementById('loc-status');
        let currentTab = 'news';

        // Reactive Sync — evitar memory leak: remover listener anterior si existe
        if (window.GoHappyNewsEvents._locSyncListener) {
            window.removeEventListener('GoHappy-location-sync', window.GoHappyNewsEvents._locSyncListener);
        }
        window.GoHappyNewsEvents._locSyncListener = () => {
            if (window.GoHappyApp.currentPage === 'news_events') {
                locStatus.innerText = "📍 Información de tu zona sincronizada";
                loadContent(currentTab);
            }
        };
        window.addEventListener('GoHappy-location-sync', window.GoHappyNewsEvents._locSyncListener);

        const loadContent = async (tab) => {
            currentTab = tab;
            content.innerHTML = '<div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div><p>Cargando información personalizada...</p></div>';

            let coords = window.lastKnownCoords || "41.6520, -4.7286";

            if (!window.lastKnownCoords && navigator.geolocation) {
                try {
                    const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
                    });
                    if (pos) {
                        window.lastKnownCoords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
                        coords = window.lastKnownCoords;
                        locStatus.innerText = "📍 Información de tu zona";
                    }
                } catch (e) {
                    locStatus.innerText = "📍 Información Regional (Predeterminada)";
                }
            } else if (window.lastKnownCoords) {
                locStatus.innerText = "📍 Información de tu zona";
            }

            try {
                if (tab === 'news') {
                    const news = await window.GoHappyData.getNews(coords);
                    if (news && news.length > 0) renderNews(news);
                    else content.innerHTML = '<div class="p-40 center-text text-light">No hemos encontrado noticias en tu zona hoy. 🏜️</div>';
                } else if (tab === 'events') {
                    const events = await window.GoHappyData.getEvents(coords);
                    if (events && events.length > 0) renderEvents(events);
                    else content.innerHTML = '<div class="p-40 center-text text-light">No hay eventos próximos registrados cerca de ti. 🎭</div>';
                } else if (tab === 'becas') {
                    const becas = await window.GoHappyData.getBecas(coords);
                    if (becas && becas.length > 0) renderBecas(becas);
                    else content.innerHTML = '<div class="p-40 center-text text-light">No hay becas activas en este momento. 💎</div>';
                }
            } catch (e) {
                console.error("Error loading news content:", e);
                content.innerHTML = '<div class="p-40 center-text text-light" style="color:red;">Error al cargar información personalizada.</div>';
            }
        };

        const renderNews = (items) => {
            content.innerHTML = '';
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'news-mag-card entry-anim';
                card.innerHTML = `
                    <div class="news-mag-header">
                        <span class="news-mag-tag">📰 Noticia Local</span>
                        <h3 class="news-mag-title">${item.title}</h3>
                    </div>
                    <div class="news-mag-body">
                        <p class="news-mag-text">${item.summary}</p>
                        <div class="news-mag-footer">
                            <span class="news-mag-source">${item.sourceName || 'Oficial'} • ${item.date || 'Hoy'}</span>
                            <a href="${item.link || '#'}" target="_blank" class="news-mag-link">Leer más →</a>
                        </div>
                    </div>
                `;
                content.appendChild(card);
            });
        };

        const renderEvents = (items) => {
            content.innerHTML = '';
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'event-card-premium entry-anim';

                card.innerHTML = `
                    <div class="news-mag-tag" style="margin-bottom: 5px;">📍 ${item.location}</div>
                    <h3 style="color: var(--primary-navy); margin: 0 0 10px 0;">${item.title}</h3>
                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <span style="font-size: 12px; color: #666;">🕒 ${item.date}</span>
                        <span style="font-size: 12px; color: #666;">💰 ${item.price}</span>
                    </div>
                `;
                content.appendChild(card);
            });
        };

        const renderBecas = (items) => {
            content.innerHTML = '<div class="becas-list"></div>';
            const listContainer = content.querySelector('.becas-list');

            items.forEach((item, idx) => {
                const card = document.createElement('div');
                card.className = 'beca-item entry-anim';

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span style="color: ${item.statusColor === 'green' ? '#27AE60' : '#E67E22'}; font-weight: 800; font-size: 10px; background: ${item.statusColor === 'green' ? 'rgba(39,174,96,0.1)' : 'rgba(230,126,34,0.1)'}; padding: 4px 10px; border-radius: 20px;">
                            ${item.status || 'PLAZO ABIERTO'}
                        </span>
                        <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">⏳ ${item.deadline || 'Consultar'}</span>
                    </div>
                    <h4 style="color: var(--primary-cobalt); margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 800;">${item.title}</h4>
                    <p style="font-size: 13px; color: #475569; margin-bottom: 15px; line-height: 1.4;">${item.description}</p>
                    
                    <div class="beca-details" style="background: rgba(255,255,255,0.5); border-radius: 12px; padding: 12px; margin-bottom: 15px; font-size: 12px; border: 1px solid rgba(0,0,0,0.03);">
                        <div style="margin-bottom: 8px;"><strong style="color: var(--primary-cobalt);">📋 Requisitos:</strong> ${item.requirements || 'Consultar bases oficiales.'}</div>
                        <div><strong style="color: var(--primary-cobalt);">🚀 Cómo pedirla:</strong> ${item.howToApply || 'A través de la sede electrónica.'}</div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <button id="beca-btn-${idx}" class="btn-primary-gradient" style="padding: 10px 20px; border-radius: 12px; font-size: 12px; font-weight: 700; border: none; width: 100%; box-shadow: 0 4px 10px rgba(11, 113, 252, 0.1);">
                            ${item.linkText || 'Ver Detalles y Web Oficial'}
                        </button>
                    </div>
                `;
                listContainer.appendChild(card);

                const becaBtn = document.getElementById(`beca-btn-${idx}`);
                if (becaBtn) {
                    becaBtn.onclick = () => {
                        if (item.link && item.link !== "") {
                            window.open(item.link, '_blank');
                        } else {
                            window.GoHappyToast.info(`Consulta las bases oficiales de "${item.title}" en la sede electrónica de tu ayuntamiento o comunidad autónoma.`, 6000);
                        }
                    };
                }
            });
        };

        // Tab Logic — actualiza estilos inline al cambiar
        const updateTabStyles = () => {
            container.querySelectorAll('.tab-btn').forEach(b => {
                if (b.classList.contains('active')) {
                    b.style.background = 'var(--brand-bright)';
                    b.style.color = 'white';
                    b.style.border = 'none';
                    b.style.boxShadow = '0 6px 16px rgba(11,113,252,0.28)';
                } else {
                    b.style.background = 'rgba(11,76,143,0.08)';
                    b.style.color = 'var(--cobalt)';
                    b.style.border = '0.5px solid rgba(11,76,143,0.12)';
                    b.style.boxShadow = 'none';
                }
            });
        };

        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateTabStyles();
                loadContent(btn.dataset.tab);
            });
        });

        // Init news
        loadContent('news');
    }
};

