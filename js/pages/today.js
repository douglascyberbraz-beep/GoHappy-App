window.KidoaToday = {
    render: async (container) => {
        container.innerHTML = `
            <div class="page-header sticky-header">
                <h2 style="color: var(--primary-navy); font-weight: 800; letter-spacing: 1px;">TODAY</h2>
                <div class="today-tagline" style="font-size: 0.9rem; color: var(--text-light); margin-top: 5px;">
                    ✨ Planes personalizados para hoy cerca de ti
                </div>
            </div>
            
            <div id="today-content" class="content-list stagger-group" style="padding-bottom: 110px;">
                <div class="center-text p-40">
                    <div class="typing-dots"><span></span><span></span><span></span></div>
                    <p style="margin-top:15px; color:var(--text-light);">Buscando los mejores planes...</p>
                </div>
            </div>
        `;

        const content = document.getElementById('today-content');

        // Safety Fallback (Valladolid) after 6 seconds if still loading
        const fallbackTimer = setTimeout(() => {
            if (content.querySelector('.typing-dots')) {
                console.log("TODAY: GPS Timeout, using fallback.");
                fetchAndRender("41.6520, -4.7286");
            }
        }, 6000);

        const fetchAndRender = async (coords) => {
            if (content.dataset.loaded === coords) return;
            console.log("TODAY: Fetching for", coords);
            try {
                const activities = await window.KidoaData.getTodayActivities(coords);
                content.dataset.loaded = coords;
                renderActivities(activities);
            } catch (err) {
                console.error("TODAY Load Error:", err);
                content.innerHTML = '<div class="center-text p-40">Error al cargar planes. Reintenta pronto.</div>';
            }
        };

        // Reactive Sync
        window.addEventListener('kidoa-location-sync', (e) => {
            if (window.KidoaApp.currentPage === 'today') {
                fetchAndRender(e.detail);
            }
        });

        // Initial attempt
        const initialCoords = window.lastKnownCoords || "41.6520, -4.7286";
        fetchAndRender(initialCoords);

        const renderActivities = (activities) => {
            if (!activities || activities.length === 0) {
                content.innerHTML = `
                    <div class="center-text p-40 text-light entry-anim">
                        <span style="font-size: 3rem;">🏜️</span>
                        <p>No se han encontrado planes para hoy en tu zona.</p>
                        <button class="btn-text" onclick="window.KidoaApp.loadPage('today')" style="margin-top:20px; text-decoration:underline;">Reintentar</button>
                    </div>`;
                return;
            }

            content.innerHTML = '';
            activities.forEach((act, idx) => {
                const card = document.createElement('div');
                card.className = 'today-card premium-glass entry-anim';
                card.style.animationDelay = `${idx * 0.1}s`;
                card.style.padding = '20px';
                card.style.borderRadius = '24px';
                card.style.marginBottom = '15px';
                card.style.border = '1px solid rgba(255,255,255,0.6)';
                card.style.boxShadow = 'var(--shadow-medium)';
                card.style.position = 'relative';

                const priceText = act.price || 'Gratis';
                const isFree = priceText.toLowerCase().includes('grat');

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <span style="background: rgba(76, 201, 240, 0.15); color: var(--primary-navy); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800;">${act.age || 'Para todos'}</span>
                        <span style="font-size: 11px; font-weight: 700; color: ${isFree ? '#27AE60' : '#E67E22'};">${priceText}</span>
                    </div>
                    
                    <h3 style="color: var(--primary-navy); margin: 0 0 8px 0; font-size: 1.2rem; line-height: 1.3;">${act.title}</h3>
                    <p style="font-size: 0.9rem; color: #555; line-height: 1.5; margin-bottom: 15px;">${act.summary}</p>
                    
                    <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px;">
                        <div style="font-size: 13px; color: #666; display: flex; align-items: center; gap: 8px;">
                            <span>🕒</span> <strong>${act.time}</strong>
                        </div>
                        <div id="loc-btn-${idx}" style="font-size: 13px; color: var(--primary-blue); display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 600;">
                            <span>📍</span> <span>${act.location}</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="action-btn-${idx}" class="btn-primary-gradient" style="flex: 2; padding: 12px; border-radius: 14px; font-size: 13px;">${act.link ? 'Ver más / Info' : '¡Me apunto!'}</button>
                        <button id="map-btn-${idx}" class="btn-secondary" style="flex: 1; padding: 12px; border-radius: 14px; font-size: 13px; background: #f0f4f8; border:none; display:flex; align-items:center; justify-content:center;">🗺️ Mapa</button>
                    </div>
                `;

                content.appendChild(card);

                const goToMap = () => {
                    window.KidoaApp.loadPage('map');
                    setTimeout(() => {
                        if (window.KidoaMap && window.KidoaMap.instance) {
                            window.KidoaMap.instance.flyTo({
                                center: [act.lng || -4.7286, act.lat || 41.6520],
                                zoom: 16,
                                pitch: 0,
                                speed: 1.5
                            });
                        }
                    }, 500);
                };

                document.getElementById(`loc-btn-${idx}`).onclick = goToMap;
                document.getElementById(`map-btn-${idx}`).onclick = goToMap;

                const actionBtn = document.getElementById(`action-btn-${idx}`);
                if (actionBtn) {
                    actionBtn.onclick = () => {
                        if (act.link && act.link !== "") {
                            window.open(act.link, '_blank');
                        } else {
                            if (window.KidoaPoints) window.KidoaPoints.addPoints('QUEST');
                            alert(`¡Plan familiar aceptado! Te has apuntado a: ${act.title}.\n\n¡Disfrutad mucho de la experiencia! ✨ (Has ganado +50 puntos Kidoa)`);
                            actionBtn.innerText = "¡Apuntado! ✅";
                            actionBtn.style.background = "linear-gradient(135deg, #27AE60, #2ECC71)";
                            actionBtn.style.color = "white";
                        }
                    };
                }
            });
        };
    }
};
