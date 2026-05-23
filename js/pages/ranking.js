window.GoHappyRanking = {

    /**
     * Función ÚNICA para renderizar el podio.
     * Usada tanto por renderSites() como por renderContributors()
     * → garantiza paridad visual 100% (NO puede divergir)
     *
     * items: array de 0-3 elementos con { name, score, avatar, onclick, special }
     */
    _renderPodium: (items) => {
        const podStyle = 'display:flex; gap:8px; align-items:flex-end; justify-content:center; padding:24px 12px 16px; margin:0 12px 12px; width:calc(100% - 24px); box-sizing:border-box; overflow:visible;';
        let out = `<div class="podium-section" style="${podStyle}">`;
        const pOrder = [1, 0, 2];  // 2º, 1º, 3º (visualmente)
        pOrder.forEach(idx => {
            const item = items[idx];
            if (!item) return;
            const pos = idx + 1;
            const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';
            const isLarge = pos === 1;
            const safeName = String(item.name || '').replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&#39;','"':'&quot;'}[c])).slice(0, 18);
            const safeAvatar = String(item.avatar || '👤').slice(0, 4);
            const safeScore = String(item.score || '').replace(/[<>]/g, '');

            const cardStyle = [
                'flex:1 1 0', 'min-width:0', 'max-width:32%',
                'padding:14px 6px', 'text-align:center', 'box-sizing:border-box',
                `background:${item.special?'linear-gradient(135deg,rgba(23,200,212,0.12),rgba(11,113,252,0.08))':'rgba(255,255,255,0.92)'}`,
                'backdrop-filter:blur(20px) saturate(180%)',
                `border:0.5px solid ${item.special?'rgba(23,200,212,0.45)':(isLarge?'rgba(23,200,212,0.4)':'rgba(255,255,255,0.95)')}`,
                'border-radius:20px',
                `box-shadow:0 ${isLarge?'12px 28px':'8px 20px'} rgba(11,76,143,${isLarge?'0.14':'0.09'})`,
                'display:flex', 'flex-direction:column', 'align-items:center', 'gap:6px',
                `min-height:${isLarge?'170px':'150px'}`,
                item.onclick ? 'cursor:pointer' : '',
                isLarge ? 'transform:translateY(-6px)' : ''
            ].filter(Boolean).join(';');

            const clickAttr = item.onclick ? `onclick="${item.onclick}"` : '';

            out += `
                <div class="podium-card ${isLarge?'large':'medium'} ${item.special?'is-me':''}" ${clickAttr} style="${cardStyle}">
                    <div style="font-size:24px; line-height:1;">${medal}</div>
                    <div style="width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; color:white; flex-shrink:0; background:linear-gradient(135deg,#0B4C8F,#17C8D4); box-shadow:0 4px 12px rgba(11,76,143,0.18);">${safeAvatar}</div>
                    <div style="width:100%; min-width:0; padding:0 2px;">
                        <h4 style="font-size:11px; font-weight:800; color:#0B4C8F; margin:0; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeName}</h4>
                        <div style="font-size:10.5px; font-weight:700; color:#64748b; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${safeScore}</div>
                    </div>
                </div>
            `;
        });
        out += '</div>';
        return out;
    },

    render: async (container) => {
        const T = window.t || (k => k);
        container.innerHTML = `
            <div class="ranking-page">
                <div class="ranking-hero-premium">
                    <div class="ranking-hero-content" style="text-align:center; position:relative; z-index:2;">
                        <h2 class="ranking-title">${T('ranking.title')}</h2>
                        <p class="ranking-subtitle">${T('ranking.subtitle')}</p>
                    </div>
                </div>

                <!-- Toggle SEPARADO del hero para no solaparse con el podio -->
                <div class="ranking-toggle-pills">
                    <button class="rank-toggle-btn active" data-tab="sites">${T('ranking.sites')}</button>
                    <button class="rank-toggle-btn" data-tab="users">${T('ranking.members')}</button>
                </div>

                <div id="ranking-list" class="ranking-display-area stagger-group">
                    <div class="center-text p-40"><div class="typing-dots"><span></span><span></span><span></span></div></div>
                </div>
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

            // Usar UNA función compartida → garantiza paridad visual con Miembros
            let html = window.GoHappyRanking._renderPodium(top3.map(site => ({
                name: site.name || 'Lugar',
                score: `⭐ ${site.rating || '0'}`,
                avatar: site.isCommunity ? '⭐' : '📍',
                onclick: `window.GoHappyRanking.goToMap('${(site.id || '').replace(/'/g, '')}', ${site.lat || 0}, ${site.lng || 0})`,
                special: false
            })));

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

            // Misma función compartida → garantiza paridad visual con Sitios
            let html = window.GoHappyRanking._renderPodium(top3.map(user => ({
                name: user.name || 'Tribu',
                score: `${user.points || 0} pts`,
                avatar: user.avatar || '👤',
                onclick: null,
                special: !!user.special
            })));

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
                <div class="motivation-box entry-anim" style="background: linear-gradient(135deg, rgba(11, 113, 252, 0.05), rgba(11, 113, 252, 0.1)); padding: 20px; border-radius: 24px; margin: 30px 16px 0; text-align: center; border: 1px dashed var(--primary-cobalt);">
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

