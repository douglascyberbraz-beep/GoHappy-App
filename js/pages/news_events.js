window.GoHappyNewsEvents = {
    render: async (container) => {
        container.innerHTML = `
            <div class="page-header sticky-header" style="flex-direction: column; align-items: stretch; gap: 15px; padding-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="color: var(--primary-navy); font-weight: 800; letter-spacing: 1px;">NEWS</h2>
                    <span id="loc-status" style="font-size: 10px; color: #888; background: #eee; padding: 4px 8px; border-radius: 10px;">📍 Detectando ubicación...</span>
                </div>
                
                <div class="tab-scroller">
                    <button class="tab-btn active" data-tab="news">Noticias Locales</button>
                    <button class="tab-btn" data-tab="events">Eventos Próximos</button>
                    <button class="tab-btn" data-tab="becas">Becas y Ayudas</button>
                </div>
            </div>
            
            <div id="news-events-content" class="content-list stagger-group" style="padding-bottom: 100px; width: 100%; display: flex; flex-direction: column; align-items: center;">
                <div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>
            </div>
        `;

        const content = document.getElementById('news-events-content');
        const locStatus = document.getElementById('loc-status');

        // Reactive Sync
        window.addEventListener('GoHappy-location-sync', (e) => {
            if (window.GoHappyApp.currentPage === 'news_events') {
                locStatus.innerText = "📍 Información de tu zona sincronizada";
                loadContent(currentTab || 'news');
            }
        });

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
        };

        const renderNews = (items) => {
            content.innerHTML = '';
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'news-card entry-anim';
                card.style.width = '92%';
                card.style.maxWidth = '500px';
                card.style.background = 'white';
                card.style.padding = '18px';
                card.style.borderRadius = '24px';
                card.style.marginBottom = '12px';
                card.style.boxShadow = 'var(--shadow-soft)';

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="font-size: 10px; color: var(--primary-blue); font-weight: 800; text-transform: uppercase;">Noticia Regional</span>
                        <span style="font-size: 10px; color: #888;">${item.date || 'Reciente'}</span>
                    </div>
                    <h3 style="color: var(--primary-navy); margin: 0 0 10px 0; font-size: 1.1rem; line-height: 1.3;">${item.title}</h3>
                    <p style="font-size: 0.9rem; color: #555; line-height: 1.5; margin-bottom: 15px;">${item.summary}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f0f0f0; padding-top: 12px;">
                        <small style="color: #999; font-style: italic;">Fuente: ${item.sourceName || item.source || 'GoHappy Local Info'}</small>
                        <a href="${item.link}" target="_blank" class="btn-text" style="color: var(--primary-blue); font-weight: 700; text-decoration: none; font-size: 12px;">Leer noticia completa →</a>
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
                card.style.width = '92%';
                card.style.maxWidth = '500px';
                card.style.background = 'white';
                card.style.padding = '20px';
                card.style.borderRadius = '24px';
                card.style.marginBottom = '15px';
                card.style.boxShadow = 'var(--shadow-soft)';

                card.innerHTML = `
                    <div style="font-size: 11px; font-weight: 800; color: #F28C28; margin-bottom: 5px;">📍 ${item.location}</div>
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
            content.innerHTML = '<div class="becas-list" style="width: 92%; max-width: 500px;"></div>';
            const listContainer = content.querySelector('.becas-list');

            items.forEach((item, idx) => {
                const card = document.createElement('div');
                card.className = 'beca-item premium-glass entry-anim';
                card.style.padding = '20px';
                card.style.borderRadius = '20px';
                card.style.marginBottom = '15px';
                card.style.border = '1px solid #eee';

                card.innerHTML = `
                    <h4 style="color: var(--primary-navy); margin-bottom: 5px;">${item.title}</h4>
                    <p style="font-size: 12px; color: #666; margin-bottom: 10px;">${item.description}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: ${item.statusColor || '#27AE60'}; font-weight: 800; font-size: 11px;">${item.status}</span>
                        <button id="beca-btn-${idx}" class="btn-text" style="color: var(--primary-blue); font-weight: 700;">${item.linkText || 'Ver Bases'}</button>
                    </div>
                `;
                listContainer.appendChild(card);

                const becaBtn = document.getElementById(`beca-btn-${idx}`);
                if (becaBtn) {
                    becaBtn.onclick = () => {
                        if (item.link && item.link !== "") {
                            window.open(item.link, '_blank');
                        } else {
                            alert(`ℹ️ Información sobre: ${item.title}\n\nPuedes consultar las bases oficiales y los requisitos completos de esta ayuda familiar buscando en la sede electrónica de tu ayuntamiento o comunidad autónoma.`);
                        }
                    };
                }
            });
        };

        // Tab Logic
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadContent(btn.dataset.tab);
            });
        });

        // Init news
        loadContent('news');
    }
};

