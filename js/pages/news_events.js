window.KindrNewsEvents = {
    render: async (container) => {
        container.innerHTML = `
            <div class="page-header sticky-header" style="flex-direction: column; align-items: stretch; gap: 15px; padding-bottom: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="color: var(--primary-navy); font-weight: 800;">🗞️ Noticias y Eventos</h2>
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

        const loadContent = async (tab) => {
            content.innerHTML = '<div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div><p>Cargando información personalizada...</p></div>';

            let coords = "41.6520, -4.7286"; // Valladolid default
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
                    });
                    if (pos) {
                        coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
                        locStatus.innerText = "📍 Información de tu zona";
                    }
                } catch (e) {
                    locStatus.innerText = "📍 Valladolid (Predeterminado)";
                }
            }

            if (tab === 'news') {
                const news = await window.KindrData.getNews(); // Simplified or IA based
                renderNews(news);
            } else if (tab === 'events') {
                const events = await window.KindrData.getEvents();
                renderEvents(events);
            } else if (tab === 'becas') {
                renderBecas();
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
                        <small style="color: #999; font-style: italic;">Fuente: ${item.source}</small>
                        <a href="${item.link || '#'}" class="btn-text" style="color: var(--primary-blue); font-weight: 700; text-decoration: none; font-size: 12px;">Leer noticia completa →</a>
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
                card.style.padding = '0';
                card.style.borderRadius = '24px';
                card.style.marginBottom = '15px';
                card.style.overflow = 'hidden';
                card.style.boxShadow = 'var(--shadow-soft)';

                card.innerHTML = `
                    <div style="height: 10px; background: linear-gradient(90deg, #FAD02E, #F28C28);"></div>
                    <div style="padding: 20px;">
                        <div style="font-size: 11px; font-weight: 800; color: #F28C28; margin-bottom: 5px;">📍 ${item.location}</div>
                        <h3 style="color: var(--primary-navy); margin: 0 0 10px 0;">${item.title}</h3>
                        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <span style="font-size: 12px; color: #666;">🕒 ${item.date}</span>
                            <span style="font-size: 12px; color: #666;">💰 ${item.price}</span>
                        </div>
                        <button class="btn-primary full-width" style="padding: 12px; border-radius: 12px; font-weight: 700;">Reservar Plaza / Ver más</button>
                    </div>
                `;
                content.appendChild(card);
            });
        };

        const renderBecas = () => {
            content.innerHTML = `
                <div class="becas-list" style="width: 92%; max-width: 500px;">
                    <div class="info-alert" style="background: #e3f2fd; padding: 15px; border-radius: 15px; margin-bottom: 20px; border-left: 5px solid var(--primary-blue);">
                        <p style="margin:0; font-size: 0.9rem; color: var(--primary-navy);"><strong>💡 Tip Kindr:</strong> Mantén activadas las notificaciones para no perderte ningún plazo de matriculación en tu zona.</p>
                    </div>
                    
                    <div class="beca-item premium-glass" style="padding: 20px; border-radius: 20px; margin-bottom: 15px; border: 1px solid #eee;">
                        <h4 style="color: var(--primary-navy); margin-bottom: 5px;">Ayudas para Comedor Escolar 2026</h4>
                        <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Plazo abierto hasta el 30 de Mayo de 2026. Disponible para Centros Públicos y Concertados.</p>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #27AE60; font-weight: 800; font-size: 11px;">🟢 PLAZO ABIERTO</span>
                            <button class="btn-text" style="color: var(--primary-blue); font-weight: 700;">Bases y Solicitud</button>
                        </div>
                    </div>

                    <div class="beca-item premium-glass" style="padding: 20px; border-radius: 20px; margin-bottom: 15px; border: 1px solid #eee;">
                        <h4 style="color: var(--primary-navy); margin-bottom: 5px;">Jornadas de Puertas Abiertas (Escuelas Infantiles)</h4>
                        <p style="font-size: 12px; color: #666; margin-bottom: 10px;">Consulta el calendario de visitas para el próximo curso escolar en Valladolid.</p>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: #666; font-weight: 800; font-size: 11px;">📅 PRÓXIMAMENTE</span>
                            <button class="btn-text" style="color: var(--primary-blue); font-weight: 700;">Ver centros</button>
                        </div>
                    </div>
                </div>
            `;
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
