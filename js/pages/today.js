window.KidoaToday = {
    render: async (container) => {
        const storedPrefs = JSON.parse(localStorage.getItem('kidoa_family_prefs'));

        container.innerHTML = `
            <div class="page-header sticky-header">
                <h2 style="color: var(--primary-navy); font-weight: 800; letter-spacing: 1px;">TODAY</h2>
                <div class="today-tagline" style="font-size: 0.9rem; color: var(--text-light); margin-top: 5px;">
                    ✨ Planes personalizados para hoy
                </div>
            </div>
            
            <div id="today-content" class="stagger-group" style="padding: 0 20px 110px 20px;">
                ${storedPrefs ? '<div class="center-text p-40"><div class="typing-dots"><span></span><span></span><span></span></div><p style="margin-top:15px; color:var(--text-light);">Buscando los mejores planes...</p></div>' : ''}
            </div>
        `;

        const content = document.getElementById('today-content');

        if (!storedPrefs) {
            window.KidoaToday.renderQuestionnaire(content);
            return;
        }

        const fetchAndRender = async (coords, preferences) => {
            // Check limits for free users
            const limitInfo = window.KidoaAI.checkTodayLimit();
            if (!limitInfo.canRequest) {
                content.innerHTML = `
                    <div class="usage-limit-banner entry-anim">
                        <span style="font-size: 1.5rem; display:block; margin-bottom:10px;">⏳</span>
                        <strong>Has alcanzado el límite diario (3/3)</strong><br>
                        Vuelve mañana para más planes o hazte <b>Premium</b> para consultas ilimitadas.
                        <button class="btn-primary-gradient" style="margin-top:15px; width:100%;" onclick="alert('Funcionalidad Premium próximamente')">Saber más sobre Premium</button>
                    </div>
                `;
                return;
            }

            console.log("TODAY: Fetching for", coords, preferences);
            try {
                const activities = await window.KidoaAI.getTodayActivities(coords, preferences);
                window.KidoaAI.incrementTodayUsage();
                renderActivities(activities);
            } catch (err) {
                console.error("TODAY Load Error:", err);
                content.innerHTML = '<div class="center-text p-40">Error al cargar planes. Reintenta pronto.</div>';
            }
        };

        const renderActivities = (activities) => {
            if (!activities || activities.length === 0) {
                content.innerHTML = `<div class="center-text p-40 text-light entry-anim">🏜️ No hay planes que encajen hoy. Prueba a cambiar tus preferencias.</div>`;
                appendRefineButton();
                return;
            }

            content.innerHTML = '';
            activities.forEach((act, idx) => {
                const card = document.createElement('div');
                card.className = 'today-card-premium entry-anim';
                card.style.animationDelay = `${idx * 0.1}s`;

                const priceText = act.price || 'Gratis';
                const isFree = priceText.toLowerCase().includes('grat');

                card.innerHTML = `
                    <div class="card-top">
                        <span class="age-badge">${act.age || 'Familiar'}</span>
                        <span style="font-size: 11px; font-weight: 700; color: ${isFree ? '#27AE60' : '#E67E22'};">${priceText}</span>
                    </div>
                    
                    <h3 style="color: var(--primary-navy); margin: 0 0 10px 0; font-size: 1.25rem; line-height: 1.3; font-weight: 800;">${act.title}</h3>
                    <p style="font-size: 0.95rem; color: #475569; line-height: 1.5; margin-bottom: 18px;">${act.summary}</p>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 16px;">
                        <div style="font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px;">
                            <span>🕒</span> <strong>${act.time}</strong>
                        </div>
                        <div style="font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px;">
                            <span>⏳</span> <strong>${act.duration || 'Flexible'}</strong>
                        </div>
                        <div style="font-size: 12px; color: var(--primary-navy); display: flex; align-items: center; gap: 6px; grid-column: span 2;">
                            <span>📍</span> <strong style="text-decoration: underline; cursor:pointer;" id="loc-link-${idx}">${act.location}</strong>
                        </div>
                    </div>

                    ${act.tip ? `<div style="background: rgba(255, 214, 10, 0.1); padding: 10px 15px; border-radius: 12px; font-size: 12px; color: #856404; margin-bottom: 20px; display: flex; gap: 8px; align-items: center;">✨ <i>${act.tip}</i></div>` : ''}
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="action-btn-${idx}" class="btn-primary-gradient" style="flex: 2;">${act.link ? 'Ver Entradas / Info' : '¡Me apunto!'}</button>
                        <button id="map-btn-${idx}" class="btn-secondary" style="flex: 1; padding: 12px; border-radius: 14px; font-size: 13px; background: #f1f5f9; border:none; display:flex; align-items:center; justify-content:center;">🗺️ Mapa</button>
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
                                speed: 1.5
                            });
                        }
                    }, 500);
                };

                document.getElementById(`loc-link-${idx}`).onclick = goToMap;
                document.getElementById(`map-btn-${idx}`).onclick = goToMap;

                const actionBtn = document.getElementById(`action-btn-${idx}`);
                if (actionBtn) {
                    actionBtn.onclick = () => {
                        if (act.link && act.link !== "") {
                            window.open(act.link, '_blank');
                        } else {
                            if (window.KidoaPoints) window.KidoaPoints.addPoints('QUEST');
                            alert(`¡Plan familiar aceptado! ✨\n\nHas marcado "${act.title}" como tu plan para hoy.\n\n¡Disfrutad mucho en familia! (+50 pts)`);
                            actionBtn.innerText = "¡Plan guardado! ✅";
                            actionBtn.style.background = "#27AE60";
                        }
                    };
                }
            });

            appendRefineButton();
        };

        const appendRefineButton = () => {
            const refineDiv = document.createElement('div');
            refineDiv.style.textAlign = 'center';
            refineDiv.style.padding = '20px 0';
            refineDiv.innerHTML = `
                <button class="btn-text" style="text-decoration: underline; font-size: 0.9rem;" id="refine-search">
                    ⚙️ Cambiar mis preferencias de familia
                </button>
            `;
            content.appendChild(refineDiv);
            document.getElementById('refine-search').onclick = () => {
                localStorage.removeItem('kidoa_family_prefs');
                window.KidoaToday.render(container);
            };
        };

        // Initial attempt
        const initialCoords = window.lastKnownCoords || "41.6520, -4.7286";
        fetchAndRender(initialCoords, storedPrefs);
    },

    renderQuestionnaire: (container) => {
        container.innerHTML = `
            <div class="questionnaire-container entry-anim">
                <h3 style="color:var(--primary-navy); margin-bottom: 20px; font-weight:800;">¿Cómo es vuestro plan ideal? 👨‍👩‍👧‍👦</h3>
                
                <div class="q-step" style="animation-delay: 0.1s">
                    <label class="q-label">¿Quiénes venís hoy?</label>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <div style="flex:1">
                            <span style="font-size:11px; color:#64748b;">Adultos</span>
                            <input type="number" id="q-adults" value="2" min="1" style="width:100%; padding:10px; border-radius:10px; border:1px solid #ddd;">
                        </div>
                        <div style="flex:1">
                            <span style="font-size:11px; color:#64748b;">Niños</span>
                            <input type="number" id="q-kids" value="2" min="0" style="width:100%; padding:10px; border-radius:10px; border:1px solid #ddd;">
                        </div>
                    </div>
                </div>

                <div class="q-step" style="animation-delay: 0.2s">
                    <label class="q-label">Edades de los niños (ej: 2 y 5 años)</label>
                    <input type="text" id="q-ages" placeholder="Ej: 3, 7..." style="width:100%; padding:12px; border-radius:12px; border:1px solid #ddd;">
                </div>

                <div class="q-step" style="animation-delay: 0.3s">
                    <label class="q-label">¿Qué os apetece?</label>
                    <div class="chip-group" data-id="environment">
                        <div class="option-chip selected" data-value="Both">Indiferente</div>
                        <div class="option-chip" data-value="Outdoor">Al aire libre 🌳</div>
                        <div class="option-chip" data-value="Indoor">Sitio cerrado 🏠</div>
                    </div>
                </div>

                <div class="q-step" style="animation-delay: 0.4s">
                    <label class="q-label">Presupuesto</label>
                    <div class="chip-group" data-id="budget">
                        <div class="option-chip selected" data-value="Any">Cualquiera</div>
                        <div class="option-chip" data-value="Free">Solo planes Gratis 💸</div>
                    </div>
                </div>

                <div class="q-step" style="animation-delay: 0.5s">
                    <label class="q-label">¿A qué distancia?</label>
                    <div class="chip-group" data-id="distance">
                        <div class="option-chip selected" data-value="Any">Cualquiera</div>
                        <div class="option-chip" data-value="Walking">Andando 🚶</div>
                        <div class="option-chip" data-value="ShortDrive">Cerca en coche 🚗</div>
                    </div>
                </div>

                <button id="save-prefs" class="btn-primary-gradient" style="width:100%; height:55px; margin-top:10px; font-size:1.1rem;">
                    Encontrar planes para nosotros ✨
                </button>
            </div>
        `;

        // Chip selection logic
        container.querySelectorAll('.option-chip').forEach(chip => {
            chip.onclick = () => {
                chip.parentElement.querySelectorAll('.option-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
            };
        });

        document.getElementById('save-prefs').onclick = () => {
            const prefs = {
                adults: document.getElementById('q-adults').value,
                kids: document.getElementById('q-kids').value,
                ages: document.getElementById('q-ages').value || 'Varias edades',
                environment: container.querySelector('[data-id="environment"] .selected').dataset.value,
                budget: container.querySelector('[data-id="budget"] .selected').dataset.value,
                distance: container.querySelector('[data-id="distance"] .selected').dataset.value,
                timestamp: Date.now()
            };
            localStorage.setItem('kidoa_family_prefs', JSON.stringify(prefs));
            window.KidoaToday.render(container.parentElement); // Re-render page
        };
    }
};
