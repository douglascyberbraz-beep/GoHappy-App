window.GoHappyRanking = {

    /**
     * Render del podio con CLASES ÚNICAS (.gh-pod-v2-*)
     * que NO comparte nombres con ningún CSS legacy → imposible interferencia
     */
    _renderPodium: (items) => {
        // Inyectar CSS único una sola vez
        if (!document.getElementById('gh-pod-v2-styles')) {
            const s = document.createElement('style');
            s.id = 'gh-pod-v2-styles';
            s.textContent = `
                .gh-pod-v2-section {
                    display: flex !important;
                    gap: 6px !important;
                    align-items: flex-end !important;
                    justify-content: center !important;
                    padding: 28px 20px 16px !important;
                    margin: 0 8px 12px !important;
                    width: calc(100% - 16px) !important;
                    box-sizing: border-box !important;
                    overflow: visible !important;
                    background: transparent !important;
                    border: none !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                }
                .gh-pod-v2-card {
                    flex: 1 1 0 !important;
                    min-width: 0 !important;
                    max-width: 29% !important;
                    width: auto !important;
                    padding: 14px 4px !important;
                    text-align: center !important;
                    box-sizing: border-box !important;
                    background: rgba(255,255,255,0.96) !important;
                    -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
                    backdrop-filter: blur(20px) saturate(180%) !important;
                    border: 0.5px solid rgba(255,255,255,0.95) !important;
                    border-radius: 18px !important;
                    box-shadow: 0 8px 20px rgba(11,76,143,0.10) !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 6px !important;
                    min-height: 150px !important;
                    height: auto !important;
                    color: var(--text-primary, #0F172A) !important;
                    position: relative !important;
                    transform: none;
                }
                .gh-pod-v2-card.large {
                    min-height: 168px !important;
                    border: 0.5px solid rgba(23,200,212,0.4) !important;
                    box-shadow: 0 12px 28px rgba(11,76,143,0.14) !important;
                    transform: translateY(-6px) !important;
                }
                .gh-pod-v2-card.is-me {
                    background: linear-gradient(135deg,rgba(23,200,212,0.14),rgba(11,113,252,0.08)) !important;
                    border-color: rgba(23,200,212,0.5) !important;
                }
                .gh-pod-v2-medal {
                    font-size: 24px !important;
                    line-height: 1 !important;
                    margin: 0 !important;
                }
                .gh-pod-v2-avatar {
                    width: 44px !important;
                    height: 44px !important;
                    border-radius: 50% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-size: 20px !important;
                    color: white !important;
                    flex-shrink: 0 !important;
                    background: linear-gradient(135deg,#0B4C8F,#17C8D4) !important;
                    box-shadow: 0 4px 12px rgba(11,76,143,0.18) !important;
                    background-size: cover !important;
                    background-position: center !important;
                    overflow: hidden !important;
                }
                .gh-pod-v2-info {
                    width: 100% !important;
                    min-width: 0 !important;
                    padding: 0 2px !important;
                }
                .gh-pod-v2-name {
                    font-size: 11.5px !important;
                    font-weight: 800 !important;
                    color: #0B4C8F !important;
                    margin: 0 !important;
                    line-height: 1.2 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                .gh-pod-v2-score {
                    font-size: 10.5px !important;
                    font-weight: 700 !important;
                    color: #64748b !important;
                    margin-top: 3px !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
            `;
            document.head.appendChild(s);
        }

        let out = `<div class="gh-pod-v2-section">`;
        const pOrder = [1, 0, 2];
        pOrder.forEach(idx => {
            const item = items[idx];
            if (!item) return;
            const pos = idx + 1;
            const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';
            const isLarge = pos === 1;
            const safeName = String(item.name || '').replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&#39;','"':'&quot;'}[c])).slice(0, 18);
            // photo/avatar puede venir como emoji corto O como data: URI larga
            const rawAvatar = String(item.avatar || '👤');
            const isUrl = /^https?:\/\//.test(rawAvatar) || rawAvatar.startsWith('data:');
            const safeAvatar = isUrl ? rawAvatar : rawAvatar.slice(0, 6);
            const safeScore = String(item.score || '').replace(/[<>]/g, '');
            const clickAttr = item.onclick ? `onclick="${item.onclick}" style="cursor:pointer;"` : '';
            // Aro de nivel: extraer pts del score si viene como "1250 pts"
            const ptsNum = parseInt(String(item.score || '').replace(/[^\d]/g, '')) || 0;
            const lvl = window.GoHappyPoints?.getLevelInfo?.(ptsNum) || { ring:'linear-gradient(135deg,#A0E0B6,#65C18C)', shadow:'rgba(101,193,140,0.45)', name:'Novato' };
            const innerAvatarStyle = isUrl
                ? `background-image:url('${safeAvatar}'); background-size:cover; background-position:center; font-size:0;`
                : '';
            const avatarHtml = `
                <div class="gh-level-ring" data-level="${lvl.name}" title="${lvl.name}" style="
                    position:relative; width:50px; height:50px; padding:3px; flex-shrink:0;
                    border-radius:50%; background:${lvl.ring};
                    box-shadow:0 0 12px ${lvl.shadow};
                    display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box;
                ">
                    <div class="gh-pod-v2-avatar" style="width:44px !important; height:44px !important; ${innerAvatarStyle}">${isUrl ? '' : safeAvatar}</div>
                </div>`;

            out += `
                <div class="gh-pod-v2-card ${isLarge?'large':''} ${item.special?'is-me':''}" ${clickAttr}>
                    <div class="gh-pod-v2-medal">${medal}</div>
                    ${avatarHtml}
                    <div class="gh-pod-v2-info">
                        <h4 class="gh-pod-v2-name">${safeName}</h4>
                        <div class="gh-pod-v2-score">${safeScore}</div>
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
                const av = String(user.avatar || '👤');
                const isUrl = /^https?:\/\//.test(av) || av.startsWith('data:');
                const lvl = window.GoHappyPoints?.getLevelInfo?.(user.points || 0) || { ring:'linear-gradient(135deg,#A0E0B6,#65C18C)', shadow:'rgba(101,193,140,0.45)', name:'Novato' };
                const avatarInner = isUrl
                    ? `<div style="width:34px;height:34px;border-radius:50%;background-image:url('${av}');background-size:cover;background-position:center;"></div>`
                    : `<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#0B4C8F,#17C8D4);color:white;display:flex;align-items:center;justify-content:center;font-size:14px;">${av}</div>`;
                html += `
                    <div class="ranking-row card-anim ${user.special ? 'is-me' : ''}">
                        <span class="row-rank" style="font-weight: 800; color: #94a3b8; width: 35px;">#${i + 4}</span>
                        <div class="gh-level-ring" data-level="${lvl.name}" title="${lvl.name}" style="
                            position:relative; width:42px; height:42px; padding:2.5px; flex-shrink:0;
                            border-radius:50%; background:${lvl.ring};
                            box-shadow:0 0 8px ${lvl.shadow};
                            display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box;
                        ">${avatarInner}</div>
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

