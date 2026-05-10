window.GoHappyRanking = {
    render: async (container) => {
        container.innerHTML = `
            <div class="ranking-hero-premium">
                <div class="ranking-hero-content">
                    <h2 class="ranking-title">🏆 TOP TRIBU</h2>
                    <p class="ranking-subtitle">Los líderes que mueven la comunidad GoHappy</p>
                    
                    <div class="ranking-toggle-pills">
                        <button class="rank-toggle-btn active" data-tab="sites">🌟 Sitios</button>
                        <button class="rank-toggle-btn" data-tab="users">🤝 Miembros</button>
                    </div>
                </div>
            </div>
            
            <div id="ranking-list" class="ranking-display-area stagger-group">
                <div class="center-text p-40"><div class="typing-dots"><span></span><span></span><span></span></div></div>
            </div>
        `;

        const list = document.getElementById('ranking-list');

        const getPlaceholder = (type) => {
            const colors = {
                park: '#4CAF50',
                food: '#FF9800',
                museum: '#9C27B0',
                culture: '#E91E63',
                generic: '#2196F3'
            };
            const color = colors[type] || colors.generic;
            return `linear-gradient(135deg, ${color}, ${color}dd)`;
        };

        const renderSites = async () => {
            list.innerHTML = '<div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>';

            // Cargar reseñas reales de Firestore y agrupar por sitio
            let sorted = [];
            try {
                const snap = await window.GoHappyDB.collection('reviews')
                    .orderBy('createdAt', 'desc')
                    .limit(100)
                    .get();

                if (!snap.empty) {
                    // Agrupar por siteName y calcular media de rating
                    const byName = {};
                    snap.docs.forEach(d => {
                        const r = d.data();
                        if (!r.siteName) return;
                        if (!byName[r.siteName]) {
                            byName[r.siteName] = { name: r.siteName, ratings: [], lat: r.lat, lng: r.lng, type: 'community', isCommunity: true };
                        }
                        byName[r.siteName].ratings.push(r.rating || 0);
                    });

                    sorted = Object.values(byName).map(s => ({
                        ...s,
                        rating: Math.round((s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length) * 10) / 10,
                        reviews: s.ratings.length
                    })).sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 10);
                }
            } catch (e) {
                console.warn('[Ranking] Error cargando reseñas:', e);
            }

            // Fallback: si no hay reseñas, usar localizaciones de IA
            if (sorted.length === 0) {
                const locations = await window.GoHappyData.getLocations();
                sorted = [...locations].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);
            }

            if (sorted.length === 0) {
                list.innerHTML = '<p class="center-text p-40">¡Aún no hay sitios en el ranking!</p>';
                return;
            }

            // Podium split
            const top3 = sorted.slice(0, 3);
            const others = sorted.slice(3);

            let html = '<div class="podium-section">';

            // Order for podium: 2, 1, 3
            const pOrder = [1, 0, 2];
            pOrder.forEach(idx => {
                const site = top3[idx];
                if (!site) return;
                const pos = idx + 1;
                const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';
                const size = pos === 1 ? 'large' : 'medium';

                html += `
                    <div class="podium-card ${size} entry-anim" onclick="window.GoHappyRanking.goToMap('${site.id || ''}', ${site.lat || 0}, ${site.lng || 0})">
                        <div class="podium-rank">${medal}</div>
                        <div class="podium-image" style="background: ${site.image ? `url(${site.image})` : getPlaceholder(site.type)}; background-size: cover; background-position: center;">
                            ${!site.image ? '<span class="podium-icon">📍</span>' : ''}
                            ${site.isCommunity ? '<div style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.5);color:white;font-size:9px;padding:2px 6px;border-radius:8px;font-weight:800;">COMUNIDAD</div>' : ''}
                        </div>
                        <div class="podium-info">
                            <h4 class="truncate">${site.name}</h4>
                            <span class="stars">⭐ ${site.rating}${site.reviews ? ` <small style="opacity:.7">(${site.reviews})</small>` : ''}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            // Others list
            html += '<div class="ranking-rows">';
            others.forEach((site, i) => {
                html += `
                    <div class="ranking-row card-anim" onclick="window.GoHappyRanking.goToMap('${site.id || ''}', ${site.lat || 0}, ${site.lng || 0})">
                        <span class="row-rank">#${i + 4}</span>
                        <div class="row-thumb" style="background: ${site.image ? `url(${site.image})` : getPlaceholder(site.type)}; background-size: cover; position:relative;">
                            ${site.isCommunity ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:20px;">⭐</div>' : ''}
                        </div>
                        <div class="row-info">
                            <h4 class="truncate">${site.name}</h4>
                            <span class="row-type">${site.isCommunity ? `${site.reviews} reseñas` : (site.type || 'Lugar')}</span>
                        </div>
                        <div class="row-score">⭐ ${site.rating}</div>
                    </div>
                `;
            });
            html += '</div>';

            list.innerHTML = html;
        };

        const renderContributors = async () => {
            list.innerHTML = '<div class="center-text p-40"><div class="magic-loader">✨</div><p style="margin-top:10px; color:#64748b;">Calculando los puntos de la semana...</p></div>';
            let users = await window.GoHappyData.getContributors();
            const me = window.GoHappyAuth.checkAuth();
            if (me && !me.isGuest) {
                const myName = me.nickname || (me.email ? me.email.split('@')[0] : "Tú");
                if (!users.find(u => u.name === myName)) {
                    users.push({ name: myName, points: me.weeklyPoints || me.points || 0, rank: me.level || "Explorador", role: "Tú", special: true, avatar: me.photo || '👤' });
                }
            }
            users.sort((a, b) => b.points - a.points);

            const top3 = users.slice(0, 3);
            const others = users.slice(3);

            let html = '<div class="podium-section">';
            const pOrder = [1, 0, 2];
            pOrder.forEach(idx => {
                const user = top3[idx];
                if (!user) return;
                const pos = idx + 1;
                const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';
                const size = pos === 1 ? 'large' : 'medium';
                html += `
                    <div class="podium-card ${size} entry-anim ${user.special ? 'is-me' : ''}">
                        <div class="podium-rank">${medal}</div>
                        <div class="podium-avatar gradient-bg">${user.avatar || '👤'}</div>
                        <div class="podium-info">
                            <h4 class="truncate">${user.name}</h4>
                            <span class="points">${user.points} pts</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            html += '<div class="ranking-rows">';
            others.forEach((user, i) => {
                html += `
                    <div class="ranking-row card-anim ${user.special ? 'is-me' : ''}">
                        <span class="row-rank" style="font-weight: 800; color: #94a3b8; width: 35px;">#${i + 4}</span>
                        <div class="row-avatar gradient-bg small" style="width: 40px; height: 40px; font-size: 16px;">${user.avatar || '👤'}</div>
                        <div class="row-info">
                            <h4 class="truncate" style="font-weight: 700; color: var(--primary-cobalt);">${user.name}</h4>
                            <span class="row-type" style="font-size: 11px;">${user.rank || 'Explorador'}</span>
                        </div>
                        <div class="row-score" style="font-weight: 800; color: var(--accent-pink);">${user.points} <small>pts</small></div>
                    </div>
                `;
            });
            html += '</div>';

            html += `
                <div class="motivation-box entry-anim" style="background: linear-gradient(135deg, rgba(11, 113, 252, 0.05), rgba(11, 113, 252, 0.1)); padding: 20px; border-radius: 24px; margin-top: 30px; text-align: center; border: 1px dashed var(--primary-cobalt);">
                    <h4 style="color: var(--primary-cobalt); margin: 0 0 5px 0;">¡Tú puedes ser el próximo! 🚀</h4>
                    <p style="font-size: 12px; color: #64748b;">Reporta peligros en SAFE, haz reseñas en el MAPA o completa QUESTS para sumar puntos semanales.</p>
                </div>
            `;

            list.innerHTML = html;
        };

        await renderSites();

        container.querySelectorAll('.rank-toggle-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tab = e.target.dataset.tab;
                container.querySelectorAll('.rank-toggle-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                if (tab === 'sites') await renderSites();
                else await renderContributors();
                window.GoHappySound.play('click');
            });
        });
    },

    goToMap: (id, lat, lng) => {
        window.GoHappyApp.navigate('map');
        setTimeout(() => {
            if (window.GoHappyMap && window.GoHappyMap.instance) {
                window.GoHappyMap.instance.flyTo({
                    center: [lng, lat],
                    zoom: 16,
                    pitch: 0,
                    animate: true,
                    duration: 2000
                });

                // Wait for flyto to finish or markers to load
                setTimeout(() => {
                    const m = window.GoHappyMap.markers.find(m =>
                        (m.data && m.data.id && String(m.data.id) === String(id)) ||
                        (m.data && Math.abs(m.data.lat - lat) < 0.0001 && Math.abs(m.data.lng - lng) < 0.0001)
                    );
                    if (m) m.instance.togglePopup();
                }, 1000);
            }
        }, 600);
    }
};

