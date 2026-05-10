window.GoHappyToday = {
    render: async (container) => {
        const storedPrefs = JSON.parse(localStorage.getItem('GoHappy_family_prefs'));

        container.innerHTML = `
            <div class="today-hero-premium">
                <div class="today-hero-content">
                    <h2 class="today-welcome-title">✨ Tu día hoy</h2>
                    <p class="today-welcome-subtitle">Planes 'Done for You' para tu tribu</p>
                </div>
            </div>
            
            <div id="today-content" class="stagger-group" style="padding: 0 16px calc(var(--nav-total, 110px) + 24px); position: relative; z-index: 2;">
                <!-- TARJETA ASISTENTE MÁGICO (Liquid Glass AI) -->
                <div class="ai-capsule-card premium-glass" style="padding: 20px; border-radius: 28px; margin-bottom: 16px;">
                    <div class="ai-capsule-header" style="display:flex; align-items:center; gap:14px; margin-bottom:14px;">
                        <div class="ai-orb-mini pulse-glow" style="font-size:28px;">🤖</div>
                        <div class="ai-text">
                            <h3 style="font-size:15px; color:var(--cobalt); margin:0; font-weight:800;">¿Qué buscamos hoy?</h3>
                            <p style="font-size:12px; color:var(--text-secondary); margin:2px 0 0; font-weight:500;">Tu asistente GoHappy está listo</p>
                        </div>
                    </div>
                    <div class="ai-capsule-input-group" style="display:flex; gap:10px; align-items:center;">
                        <input id="ai-quick-input" type="text" placeholder="Dime algo divertido o una idea..." spellcheck="false" style="flex:1; margin:0;">
                        <button id="btn-ai-magic" class="ai-magic-btn">🪄</button>
                    </div>
                    <div id="ai-quick-response" class="ai-capsule-response" style="display: none; margin-top:12px; padding:12px; background:rgba(11,76,143,0.05); border-radius:14px; font-size:14px; color:var(--cobalt);"></div>
                </div>

                ${storedPrefs ? '<div class="center-text p-40"><div class="typing-dots"><span></span><span></span><span></span></div><p style="margin-top:15px; color:#64748b; font-weight:600;">Sincronizando magia...</p></div>' : ''}
            </div>
        `;

        const content = document.getElementById('today-content');

        if (!storedPrefs) {
            window.GoHappyToday.renderQuestionnaire(content);
            return;
        }

        const fetchAndRender = async (coords, preferences) => {
            // El control de límite real lo hace el server (cloud function rate limit por plan).
            // El cliente solo informa al usuario, no bloquea.
            console.log("TODAY: Fetching for", coords, preferences);
            content.innerHTML = `
                <div class="center-text p-40 entry-anim">
                    <div class="magic-loader" style="font-size: 45px; margin-bottom: 20px; animation: float 3s ease-in-out infinite;">✨</div>
                    <div class="typing-dots"><span></span><span></span><span></span></div>
                    <p style="margin-top:15px; font-weight:600; color:var(--primary-cobalt);">GoHappy IA está diseñando magia...</p>
                    <p style="font-size: 13px; color:var(--text-light); margin-top:5px;">Creando planes 'Done for You' basados en tu familia</p>
                </div>`;

            try {
                const activities = await window.GoHappyAI.getTodayActivities(coords, preferences);
                const sourceLabel = window.GoHappyAI._lastSource;

                // Solo contar uso si fue una llamada NUEVA a IA (no cache, no demo)
                if (sourceLabel === 'real') {
                    window.GoHappyAI.incrementTodayUsage();
                }

                renderActivities(activities);

                // Indicador visual del origen
                if (sourceLabel === 'real') {
                    window.GoHappyToast && window.GoHappyToast.success('✨ Planes generados por IA real', 2500);
                } else if (sourceLabel === 'cache') {
                    window.GoHappyToast && window.GoHappyToast.info('⚡ Planes desde caché', 2000);
                }
            } catch (err) {
                console.error("TODAY Load Error:", err);
                const mock = window.GoHappyAI._getMockData('today');
                renderActivities(mock);
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
                card.className = 'plan-card-premium entry-anim';
                card.style.animationDelay = `${idx * 0.15}s`;

                const priceText = act.price || 'Gratis';
                const isFree = priceText.toLowerCase().includes('grat');

                let highlightsHtml = '';
                if (Array.isArray(act.highlights) && act.highlights.length > 0) {
                    highlightsHtml = `
                        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px;">
                            ${act.highlights.map(h => `<span style="background:rgba(11,113,252,0.08); color:var(--primary-cobalt); padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700;">${h}</span>`).join('')}
                        </div>`;
                }

                let packingHtml = '';
                if (Array.isArray(act.packingList) && act.packingList.length > 0) {
                    packingHtml = `
                        <div style="background:rgba(255,184,48,0.08); border-radius:14px; padding:12px; margin-bottom:14px;">
                            <div style="font-size:11px; font-weight:800; color:#B8860B; text-transform:uppercase; margin-bottom:6px;">📦 Llevad con vosotros</div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                ${act.packingList.map(item => `<span style="background: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); color: #555;">✓ ${item}</span>`).join('')}
                            </div>
                        </div>`;
                }

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span class="age-badge" style="background: var(--primary-cobalt); color: white;">${act.age || 'Familiar'}</span>
                            ${act.typeLabel ? `<span class="age-badge" style="background: rgba(39, 174, 96, 0.1); color: #27AE60;">${act.typeLabel}</span>` : ''}
                        </div>
                        <span style="font-size: 13px; font-weight: 800; color: ${isFree ? '#27AE60' : '#E67E22'}; background: ${isFree ? 'rgba(39, 174, 96, 0.1)' : 'rgba(230, 126, 34, 0.1)'}; padding: 4px 10px; border-radius: 20px;">
                            ${priceText}
                        </span>
                    </div>
                    
                    <h3 style="color: var(--primary-cobalt); margin: 0 0 8px 0; font-size: 1.4rem; line-height: 1.25; font-weight: 900;">${act.title}</h3>
                    <p style="font-size: 0.95rem; color: #475569; line-height: 1.5; margin-bottom: 15px;">${act.summary}</p>
                    
                    ${highlightsHtml}
                    ${packingHtml}
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; background: rgba(255,255,255,0.6); padding: 12px; border-radius: 12px; box-shadow: inset 0 0 10px rgba(0,0,0,0.02);">
                        <div style="font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px;">
                            <span>🕒</span> <strong>${act.time}</strong>
                        </div>
                        <div style="font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px;">
                            <span>⏳</span> <strong>${act.duration || 'Flexible'}</strong>
                        </div>
                        <div style="font-size: 12px; color: var(--primary-cobalt); display: flex; align-items: center; gap: 6px; grid-column: span 2;">
                            <span>📍</span> <strong style="text-decoration: underline; cursor:pointer;" id="loc-link-${idx}">${act.location}</strong>
                            ${act.distanceDesc ? `<span style="color: #888; font-weight: normal; margin-left: 5px;">(${act.distanceDesc})</span>` : ''}
                        </div>
                    </div>

                    ${act.tip ? `<div style="background: linear-gradient(135deg, rgba(255, 214, 10, 0.1), rgba(255, 165, 0, 0.1)); padding: 12px 15px; border-radius: 12px; font-size: 12px; color: #856404; margin-bottom: 20px; display: flex; gap: 10px; align-items: center; border: 1px solid rgba(255, 214, 10, 0.3);">
                        <span style="font-size: 18px;">💡</span> <i>${act.tip}</i>
                    </div>` : ''}
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="action-btn-${idx}" class="btn-primary-gradient" style="flex: 2; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(11, 113, 252, 0.3);">${act.link ? '🎫 Ver Entradas Oficiales' : '✨ ¡Guardar Plan!'}</button>
                        <button id="map-btn-${idx}" class="btn-secondary" style="flex: 1; padding: 12px; border-radius: 14px; font-size: 13px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display:flex; align-items:center; justify-content:center; color: var(--primary-cobalt); font-weight: 700;">🗺️ Ruta</button>
                    </div>
                `;

                content.appendChild(card);

                const mapBtn = document.getElementById(`map-btn-${idx}`);
                if (mapBtn) {
                    mapBtn.onclick = () => {
                        window.GoHappyApp.navigate('map', { 
                            focus: act.location,
                            coords: act.coords || null,
                            zoom: 17
                        });
                        window.GoHappySound.play('magic');
                    };
                }

                const locLink = document.getElementById(`loc-link-${idx}`);
                if (locLink) {
                    locLink.onclick = () => {
                        window.GoHappyApp.navigate('map', { 
                            focus: act.location,
                            coords: act.coords || null,
                            zoom: 17
                        });
                    };
                }

                const actionBtn = document.getElementById(`action-btn-${idx}`);
                if (actionBtn) {
                    actionBtn.onclick = async () => {
                        if (act.link && act.link !== "") {
                            window.open(act.link, '_blank');
                        } else {
                            // Add points
                            if (window.GoHappyPoints) await window.GoHappyPoints.addPoints('QUEST');
                            
                            // Save to Activity (Firestore)
                            const user = window.GoHappyAuth.checkAuth();
                            if (user && !user.isGuest) {
                                try {
                                    await window.GoHappyDB.collection('activity').add({
                                        userId: user.uid,
                                        type: 'visit',
                                        title: act.title,
                                        description: `Plan familiar en ${act.location}`,
                                        points: 50,
                                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                                    });
                                } catch (e) { console.warn("Error saving activity:", e); }
                            }

                            window.GoHappyToast.points(`¡Plan "${act.title}" guardado! +50 pts 🎉`);
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
                localStorage.removeItem('GoHappy_family_prefs');
                window.GoHappyToday.render(container);
            };
        };

        // Lógica Asistente Mágico Quick Chat
        setTimeout(() => {
            const aiBtn = document.getElementById('btn-ai-magic');
            const aiInput = document.getElementById('ai-quick-input');
            const aiResponse = document.getElementById('ai-quick-response');

            if (aiBtn) {
                aiBtn.onclick = async () => {
                    const prompt = aiInput.value.trim();
                    if (!prompt) return;

                    aiBtn.innerHTML = '⏳';
                    aiResponse.style.display = 'block';
                    aiResponse.innerHTML = '<i>GoHappy IA está pensando...</i>';

                    try {
                        const response = await window.GoHappyAI.askAI(prompt);
                        aiResponse.innerHTML = `✨ ${response}`;
                    } catch (e) {
                        aiResponse.innerHTML = "❌ No he podido conectar con la magia ahora mismo.";
                    } finally {
                        aiBtn.innerHTML = '🪄';
                    }
                };
            }
        }, 500);

        // Get user location for context
        const initialCoords = window.lastKnownCoords || "41.6520, -4.7286";
        fetchAndRender(initialCoords, storedPrefs);
    },

    renderQuestionnaire: (container) => {
        container.innerHTML = `
            <div class="questionnaire-container entry-anim">
                <h3 style="color:var(--primary-cobalt); margin-bottom: 20px; font-weight:800;">¿Cómo es vuestro plan ideal? 👨‍👩‍👧‍👦</h3>
                
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
            localStorage.setItem('GoHappy_family_prefs', JSON.stringify(prefs));
            window.GoHappyToday.render(container.parentElement); // Re-render page
        };
    }
};

