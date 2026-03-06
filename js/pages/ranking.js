window.KindrRanking = {
    render: async (container) => {
        container.innerHTML = `
            <div class="page-header center-text">
                <h2 style="color: var(--primary-navy); font-weight: 800;">🏆 Ranking KINDR</h2>
                <div class="tab-scroller">
                    <button class="tab-btn active" data-tab="sites">Top Sitios</button>
                    <button class="tab-btn" data-tab="users">Contribuidores</button>
                </div>
            </div>
            
            <div id="ranking-list" class="content-list stagger-group" style="padding-bottom: 20px;">
                <div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>
            </div>
        `;

        const list = document.getElementById('ranking-list');

        const formatName = (name) => {
            const parts = name.split(' ');
            if (parts.length > 1) {
                // Return "I. Surname" as requested (P. Gomez)
                return `${parts[0][0]}. ${parts[parts.length - 1]}`;
            }
            return name;
        };

        const renderSites = async () => {
            list.innerHTML = '<div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
            const locations = await window.KindrData.getLocations();
            const sorted = [...locations].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 10);
            list.innerHTML = '';
            sorted.forEach((site, index) => {
                const card = document.createElement('div');
                card.className = `ranking-card rank-${index + 1} entry-anim`;
                card.style.cursor = 'pointer';
                let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `<span class="rank-num">#${index + 1}</span>`;
                card.innerHTML = `
                    <div class="rank-position" style="font-size: 1.5rem; min-width: 40px; display: flex; justify-content: center;">${medal}</div>
                    <div class="rank-info" style="flex: 1; padding: 0 10px;">
                        <h3 style="margin: 0; font-size: 1rem; color: var(--primary-navy);">${site.name}</h3>
                        <span class="rank-badge" style="font-size: 0.75rem; color: #888;">${site.type || 'Lugar'}</span>
                    </div>
                    <div class="rank-score" style="font-weight: 800; color: #FBC02D;">⭐ ${site.rating || '?'}</div>
                `;

                // Clicking triggers map navigation
                card.onclick = () => {
                    // Navigate to Map
                    window.KindrApp.loadPage('tribu'); // Note: The user might expect the map tab? 
                    // Actually we need to make sure the app loads the MAP page and sets the view
                    window.KindrApp.navigate('map');
                    setTimeout(() => {
                        if (window.KindrMap && window.KindrMap.instance) {
                            window.KindrMap.instance.flyTo([site.lat, site.lng], 16);
                            // Open popup after fly
                            const m = window.KindrMap.markers.find(m => m.data.id === site.id);
                            if (m) m.instance.openPopup();
                        }
                    }, 500);
                };
                list.appendChild(card);
            });
        };

        const renderContributors = async () => {
            list.innerHTML = '<div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
            let users = await window.KindrData.getContributors();

            // Inject current user
            const me = window.KindrAuth.checkAuth();
            if (me && !me.isGuest) {
                users.push({
                    name: me.nickname || me.email,
                    points: me.points,
                    rank: me.level,
                    role: "Tú",
                    special: true
                });
            }

            users.sort((a, b) => b.points - a.points);

            let htmlStr = '';
            users.forEach((user, idx) => {
                const displayName = user.special ? user.name : formatName(user.name);
                if (user.special) {
                    htmlStr += `
                        <div class="contributor-card gold-border entry-anim">
                            <div style="font-size: 1.5rem;">⭐</div>
                            <div style="flex:1">
                                <h4 style="color:var(--primary-navy)">Tu Posición</h4>
                                <p style="font-size:0.8rem">${displayName}</p>
                            </div>
                            <div class="points-badge">${user.points} pts</div>
                        </div>
                    `;
                } else {
                    htmlStr += `
                        <div class="ranking-card entry-anim">
                            <div class="rank-position">#${idx + 1}</div>
                            <div class="rank-info"><h3>${displayName}</h3><span class="rank-badge">${user.rank}</span></div>
                            <div class="rank-score">${user.points} pts</div>
                        </div>
                    `;
                }
            });
            list.innerHTML = htmlStr;
        };

        // Initial Render
        await renderSites();

        // Tab Logic
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tab = e.target.dataset.tab;
                container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                if (tab === 'sites') await renderSites();
                else await renderContributors();
                window.KindrSound.play('click');
            });
        });
    }
};

