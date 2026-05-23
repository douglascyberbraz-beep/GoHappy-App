// ================================================================
// GoHappy Adventures — sucesora narrativa de Quests
// Una aventura activa por familia. 3-5 misiones encadenadas.
// Al completar TODAS: insignia + cuento personalizado.
// ================================================================
window.GoHappyAdventures = {

    // ─── CATÁLOGO de aventuras (Fase 1: estático, Fase 2 IA semanal) ───
    get CATALOG() {
        const lang = window.GoHappyI18n?.lang || 'es';
        const T = (es, en) => lang === 'en' ? en : es;

        return [
            {
                id: 'autumn-hunters',
                emoji: '🍂',
                titulo: T('Cazadores del Otoño', 'Autumn Hunters'),
                tema: T('otoño', 'autumn'),
                tagline: T('Sois detectives del bosque dorado', 'You are detectives of the golden forest'),
                introNarrativa: T(
                    'El bosque ha cambiado de color. Las hojas susurran secretos y las castañas esperan ser encontradas. Esta semana sois los Cazadores del Otoño — vuestra misión es descubrir 4 tesoros del bosque y traerlos a casa.',
                    'The forest has changed colour. Leaves whisper secrets and chestnuts wait to be found. This week you are the Autumn Hunters — your mission is to discover 4 forest treasures and bring them home.'
                ),
                color: '#D97706',
                misiones: [
                    { titulo: T('Recoged 5 hojas de colores distintos', 'Collect 5 leaves of different colors'), pista: T('Los parques con tilos y robles son ideales', 'Parks with linden and oak trees are ideal'), puntos: 30 },
                    { titulo: T('Encontrad una castaña Y un piñón', 'Find a chestnut AND a pine nut'), pista: T('Mira al suelo bajo los árboles', 'Look on the ground under trees'), puntos: 30 },
                    { titulo: T('Haced un dibujo familiar con las hojas pegadas', 'Make a family drawing with the leaves glued on'), pista: T('Cola blanca + cartulina = magia', 'White glue + cardboard = magic'), puntos: 50 },
                    { titulo: T('Cocinad algo con sabor a otoño', 'Cook something with autumn flavors'), pista: T('Calabaza asada, manzana al horno, bizcocho de canela', 'Roasted pumpkin, baked apple, cinnamon cake'), puntos: 60 }
                ],
                insignia: { emoji: '🍁', nombre: T('Familia Exploradora del Otoño', 'Autumn Explorer Family') },
                cuentoTitulo: T('Los {familia} y el Bosque Dorado', 'The {familia} and the Golden Forest')
            },
            {
                id: 'water-explorers',
                emoji: '💧',
                titulo: T('Exploradores del Agua', 'Water Explorers'),
                tema: T('agua', 'water'),
                tagline: T('Descubrid los secretos azules de vuestra ciudad', 'Discover the blue secrets of your city'),
                introNarrativa: T(
                    'El agua corre por vuestra ciudad sin que casi nadie la mire. Fuentes, ríos, lagos. Esta semana seguiréis su rastro. Cada gota cuenta una historia.',
                    'Water flows through your city and almost no one watches. Fountains, rivers, lakes. This week you will follow its trail. Every drop tells a story.'
                ),
                color: '#0EA5E9',
                misiones: [
                    { titulo: T('Encontrad la fuente más bonita del barrio', 'Find the prettiest fountain in your neighborhood'), pista: T('Las plazas suelen tener fuentes históricas', 'Squares often have historic fountains'), puntos: 30 },
                    { titulo: T('Visitad un río, lago o playa', 'Visit a river, lake or beach'), pista: T('Aunque sea pequeño, sirve', 'Even a small one counts'), puntos: 40 },
                    { titulo: T('Aprended sobre un animal acuático local', 'Learn about a local aquatic animal'), pista: T('Buscad juntos en libros o internet', 'Look together in books or online'), puntos: 30 },
                    { titulo: T('Hacer un experimento con agua en casa', 'Do a water experiment at home'), pista: T('Plantas absorben agua coloreada, hielo flota...', 'Plants absorb coloured water, ice floats...'), puntos: 50 }
                ],
                insignia: { emoji: '🌊', nombre: T('Familia del Agua', 'Water Family') },
                cuentoTitulo: T('El Viaje de los {familia} por el Río Secreto', 'The {familia} Journey through the Secret River')
            },
            {
                id: 'neighborhood-detectives',
                emoji: '🔍',
                titulo: T('Detectives del Barrio', 'Neighborhood Detectives'),
                tema: T('historia local', 'local history'),
                tagline: T('Vuestro barrio guarda misterios', 'Your neighborhood holds mysteries'),
                introNarrativa: T(
                    'Cada calle tiene historias que casi nadie conoce. Esta semana sois detectives buscando los secretos del barrio. Llevad lápiz y muchas ganas de preguntar.',
                    'Every street has stories almost no one knows. This week you are detectives looking for the secrets of the neighborhood. Bring a pencil and lots of questions.'
                ),
                color: '#7C3AED',
                misiones: [
                    { titulo: T('Encontrad la calle más antigua del barrio', 'Find the oldest street in the neighborhood'), pista: T('Suele tener placas con la fecha', 'Often has plaques with the date'), puntos: 30 },
                    { titulo: T('Buscad un detalle escondido en una fachada', 'Find a hidden detail in a façade'), pista: T('Gárgola, escudo, fecha tallada, mosaico...', 'Gargoyle, shield, carved date, mosaic...'), puntos: 40 },
                    { titulo: T('Hablad con un vecino mayor y escuchad una historia', 'Talk to an elderly neighbor and listen to a story'), pista: T('Los abuelos del barrio saben tesoros', 'Neighborhood grandparents know treasures'), puntos: 50 },
                    { titulo: T('Dibujad o fotografiad vuestro lugar favorito secreto', 'Draw or photograph your secret favorite place'), pista: T('Ese banco, ese muro pintado, esa esquina', 'That bench, that painted wall, that corner'), puntos: 30 }
                ],
                insignia: { emoji: '🕵️', nombre: T('Familia Detective', 'Detective Family') },
                cuentoTitulo: T('Los {familia} y el Misterio del Barrio Viejo', 'The {familia} and the Mystery of the Old Town')
            },
            {
                id: 'family-chefs',
                emoji: '🍳',
                titulo: T('Chefs Familiares', 'Family Chefs'),
                tema: T('cocina', 'cooking'),
                tagline: T('La cocina es el corazón del hogar', 'The kitchen is the heart of the home'),
                introNarrativa: T(
                    'Esta semana la familia se convierte en un equipo de cocina. Cada miembro propone, todos cocinan. Al final tendréis un mini recetario familiar.',
                    'This week the family becomes a kitchen team. Everyone proposes, everyone cooks. At the end you will have a mini family cookbook.'
                ),
                color: '#DC2626',
                misiones: [
                    { titulo: T('Cada miembro propone un plato que quiera probar', 'Each member proposes a dish they want to try'), pista: T('Que sea distinto entre todos', 'Make sure each is different'), puntos: 20 },
                    { titulo: T('Hacéis la lista de la compra juntos', 'Make the shopping list together'), pista: T('Reparted: cada uno escribe lo suyo', 'Share: each writes their own'), puntos: 30 },
                    { titulo: T('Comprad los ingredientes', 'Buy the ingredients'), pista: T('Mercado o súper, da igual', 'Market or supermarket, either'), puntos: 30 },
                    { titulo: T('Cocináis TODOS juntos en casa', 'Cook ALL together at home'), pista: T('Reparted tareas según edad', 'Share tasks by age'), puntos: 70 }
                ],
                insignia: { emoji: '👨‍🍳', nombre: T('Familia Cocinera', 'Cooking Family') },
                cuentoTitulo: T('La Cocina Mágica de los {familia}', 'The Magic Kitchen of the {familia}')
            },
            {
                id: 'living-room-astronauts',
                emoji: '🌌',
                titulo: T('Astronautas de Salón', 'Living-Room Astronauts'),
                tema: T('espacio', 'space'),
                tagline: T('No hace falta cohete para llegar a las estrellas', 'You dont need a rocket to reach the stars'),
                introNarrativa: T(
                    'Esta noche el salón es la nave. Esta semana es la misión. Volaréis sin moveros del sofá.',
                    'Tonight the living room is the ship. This week is the mission. You will fly without leaving the sofa.'
                ),
                color: '#1E40AF',
                misiones: [
                    { titulo: T('Mirad el cielo nocturno e identificad 3 constelaciones', 'Look at the night sky and identify 3 constellations'), pista: T('Apps gratis: SkyView, Stellarium', 'Free apps: SkyView, Stellarium'), puntos: 40 },
                    { titulo: T('Construid un cohete con cajas de cartón', 'Build a rocket with cardboard boxes'), pista: T('Lo que tengáis en casa, lo cutre vale', 'Whatever you have at home, rough is fine'), puntos: 50 },
                    { titulo: T('Inventad un planeta: dibujo, nombre y 3 reglas', 'Invent a planet: drawing, name and 3 rules'), pista: T('Cuanto más loco mejor', 'The crazier the better'), puntos: 40 },
                    { titulo: T('Ved un documental corto del espacio', 'Watch a short space documentary'), pista: T('YouTube: National Geographic Kids', 'YouTube: National Geographic Kids'), puntos: 30 }
                ],
                insignia: { emoji: '🚀', nombre: T('Familia Galáctica', 'Galactic Family') },
                cuentoTitulo: T('Los {familia} y el Planeta Inventado', 'The {familia} and the Invented Planet')
            },
            {
                id: 'family-gallery',
                emoji: '🎨',
                titulo: T('Galería Familiar', 'Family Gallery'),
                tema: T('arte', 'art'),
                tagline: T('Cada uno es un artista', 'Each one is an artist'),
                introNarrativa: T(
                    'Esta semana sois una familia de artistas. Cada uno crea su obra. El sábado se inaugura la galería.',
                    'This week you are a family of artists. Each one creates their work. The gallery opens on Saturday.'
                ),
                color: '#DB2777',
                misiones: [
                    { titulo: T('Cada miembro elige una técnica artística', 'Each member chooses an art technique'), pista: T('Acuarela, fotos, collage, plastilina...', 'Watercolor, photos, collage, clay...'), puntos: 20 },
                    { titulo: T('Crean obra inspirada en la misma palabra', 'Create a piece inspired by the same word'), pista: T('"Hogar", "verano", "secreto"...', '"Home", "summer", "secret"...'), puntos: 60 },
                    { titulo: T('Hacen una exposición en el salón', 'Make an exhibition in the living room'), pista: T('Cada obra con su título', 'Each piece with its title'), puntos: 40 },
                    { titulo: T('Voto familiar al favorito (cada uno explica el suyo)', 'Family vote for favorite (each explains theirs)'), pista: T('Vale: aplaudir mucho a todos', 'Tip: clap a lot for everyone'), puntos: 30 }
                ],
                insignia: { emoji: '🖼️', nombre: T('Familia Artista', 'Artist Family') },
                cuentoTitulo: T('La Galería Secreta de los {familia}', 'The Secret Gallery of the {familia}')
            }
        ];
    },

    // Estado en memoria
    _currentAdventure: null,

    render: async (container) => {
        const user = window.GoHappyAuth?.checkAuth?.();
        const lang = window.GoHappyI18n?.lang || 'es';
        const T = (es, en) => lang === 'en' ? en : es;

        container.innerHTML = `
            <div class="adventures-page" style="padding:0 0 120px;">
                <div class="unified-hero">
                    <h2>🗺️ ${T('Aventuras', 'Adventures')}</h2>
                    <p>${T('Momentos reales para crear recuerdos juntos', 'Real moments to create memories together')}</p>
                </div>
                <div id="adv-content" style="padding:0 14px;">
                    <div class="center-text p-40"><div class="typing-dots"><span></span><span></span><span></span></div></div>
                </div>
            </div>
        `;

        if (!user || user.isGuest) {
            document.getElementById('adv-content').innerHTML = `
                <div class="moments-empty" style="margin-top:40px;">
                    <div class="moments-empty-icon">🔐</div>
                    <div class="moments-empty-title">${T('Inicia sesión', 'Sign in')}</div>
                    <div class="moments-empty-text">${T('Para empezar vuestras aventuras', 'To start your adventures')}</div>
                </div>`;
            return;
        }

        if (!user.familyId) {
            document.getElementById('adv-content').innerHTML = `
                <div style="text-align:center; padding:40px 20px;">
                    <div style="font-size:60px;">👨‍👩‍👧</div>
                    <p style="color:var(--text-secondary); font-size:14px; margin:14px 0 22px;">${T('Necesitas pertenecer a una familia para vivir aventuras juntos.', 'You need to be in a family to live adventures together.')}</p>
                    <button onclick="window.GoHappyApp?.loadPage?.('profile')" class="btn-primary" style="padding:14px 28px; border-radius:999px; border:none; font-weight:800; cursor:pointer;">${T('Crear o unirme a una familia', 'Create or join a family')}</button>
                </div>`;
            return;
        }

        // Cargar aventura activa de Firestore
        try {
            const snap = await window.GoHappyDB
                .collection('families').doc(user.familyId)
                .collection('adventures')
                .where('estado', '==', 'activa')
                .limit(1).get();

            if (!snap.empty) {
                const adv = { docId: snap.docs[0].id, ...snap.docs[0].data() };
                window.GoHappyAdventures._currentAdventure = adv;
                window.GoHappyAdventures._renderActive(adv, user);
            } else {
                // Cargar insignias ganadas
                const compSnap = await window.GoHappyDB
                    .collection('families').doc(user.familyId)
                    .collection('adventures')
                    .where('estado', '==', 'completada')
                    .get();
                const completed = compSnap.docs.map(d => d.data().adventureId);
                window.GoHappyAdventures._renderAvailable(completed);
            }
        } catch (e) {
            console.error('Adventures load error:', e);
            document.getElementById('adv-content').innerHTML = `
                <div class="moments-empty"><div class="moments-empty-icon">⚠️</div>
                <div class="moments-empty-title">${T('Error al cargar', 'Could not load')}</div></div>`;
        }
    },

    // ─── Lista de aventuras disponibles para EMPEZAR ───
    _renderAvailable: (completedIds = []) => {
        const lang = window.GoHappyI18n?.lang || 'es';
        const T = (es, en) => lang === 'en' ? en : es;
        const sec = window.GoHappySecurity;
        const safe = (s) => sec ? sec.safe(s) : String(s || '');

        const catalog = window.GoHappyAdventures.CATALOG;
        const content = document.getElementById('adv-content');

        const completedCount = completedIds.length;
        const completedBadges = catalog
            .filter(a => completedIds.includes(a.id))
            .map(a => `<span title="${safe(a.insignia.nombre)}" style="font-size:22px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));">${a.insignia.emoji}</span>`)
            .join('');

        content.innerHTML = `
            ${completedCount > 0 ? `
                <div style="background:linear-gradient(135deg,rgba(255,215,0,0.10),rgba(255,165,0,0.12)); border:0.5px solid rgba(255,180,80,0.25); border-radius:16px; padding:14px 16px; margin-bottom:16px;">
                    <div style="font-size:11px; font-weight:800; color:#8B5C00; text-transform:uppercase; margin-bottom:8px;">🏆 ${T('Insignias ganadas', 'Badges earned')} (${completedCount})</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">${completedBadges}</div>
                </div>
            ` : ''}

            <div style="text-align:center; padding:8px 4px 18px;">
                <h3 style="font-family:'Poppins',sans-serif; color:var(--cobalt); font-weight:900; margin:0 0 6px; font-size:1.15rem;">${T('Elegid vuestra próxima aventura', 'Choose your next adventure')}</h3>
                <p style="color:var(--text-secondary); font-size:12.5px; margin:0;">${T('Una historia de 1 semana con misiones reales', 'A 1-week story with real missions')}</p>
            </div>

            <div style="display:flex; flex-direction:column; gap:12px;">
                ${catalog.map(adv => {
                    const isDone = completedIds.includes(adv.id);
                    const totalPts = adv.misiones.reduce((a, m) => a + (m.puntos || 0), 0);
                    return `
                        <div class="adv-card" data-adv-id="${adv.id}" style="
                            background:linear-gradient(135deg, rgba(255,255,255,0.95), ${adv.color}11);
                            border:0.5px solid ${adv.color}33;
                            border-radius:20px; padding:16px;
                            box-shadow:0 6px 18px rgba(11,76,143,0.08);
                            cursor:${isDone?'default':'pointer'};
                            position:relative; overflow:hidden;
                            ${isDone ? 'opacity:0.65;' : ''}
                        ">
                            ${isDone ? `<div style="position:absolute; top:10px; right:14px; background:rgba(39,174,96,0.15); color:#16A34A; padding:3px 10px; border-radius:999px; font-size:10px; font-weight:800;">✓ ${T('COMPLETADA', 'COMPLETED')}</div>` : ''}
                            <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:8px;">
                                <div style="font-size:38px; line-height:1; flex-shrink:0;">${adv.emoji}</div>
                                <div style="flex:1; min-width:0;">
                                    <h3 style="font-family:'Poppins',sans-serif; font-size:16px; font-weight:800; color:var(--cobalt); margin:0 0 2px;">${safe(adv.titulo)}</h3>
                                    <p style="font-size:11px; color:${adv.color}; font-weight:700; font-style:italic; margin:0;">${safe(adv.tagline)}</p>
                                </div>
                            </div>
                            <p style="font-size:13px; color:var(--text-primary); line-height:1.45; margin:0 0 12px;">${safe(adv.introNarrativa)}</p>
                            <div style="display:flex; gap:10px; align-items:center; margin-bottom:12px; flex-wrap:wrap;">
                                <span style="font-size:11px; background:rgba(11,76,143,0.06); color:var(--cobalt); padding:4px 9px; border-radius:999px; font-weight:700;">📋 ${adv.misiones.length} ${T('misiones', 'missions')}</span>
                                <span style="font-size:11px; background:rgba(11,76,143,0.06); color:var(--cobalt); padding:4px 9px; border-radius:999px; font-weight:700;">⭐ ${totalPts} pts</span>
                                <span style="font-size:11px; background:rgba(11,76,143,0.06); color:var(--cobalt); padding:4px 9px; border-radius:999px; font-weight:700;">${adv.insignia.emoji} ${T('insignia', 'badge')}</span>
                            </div>
                            ${!isDone ? `
                                <button class="adv-start-btn" data-id="${adv.id}" style="
                                    width:100%; padding:12px; border:none; border-radius:14px;
                                    background:linear-gradient(135deg, ${adv.color}, ${adv.color}DD);
                                    color:white; font-weight:800; font-size:13.5px; cursor:pointer;
                                    box-shadow:0 6px 16px ${adv.color}44;
                                ">🚀 ${T('Empezar esta aventura', 'Start this adventure')}</button>
                            ` : `
                                <div style="text-align:center; padding:8px; color:#16A34A; font-weight:800; font-size:13px;">
                                    ${adv.insignia.emoji} ${safe(adv.insignia.nombre)}
                                </div>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        content.querySelectorAll('.adv-start-btn').forEach(btn => {
            btn.onclick = () => window.GoHappyAdventures._startAdventure(btn.dataset.id);
        });
    },

    // ─── Empezar una aventura ───
    _startAdventure: async (advId) => {
        const user = window.GoHappyAuth?.checkAuth?.();
        if (!user || !user.familyId) return;
        const lang = window.GoHappyI18n?.lang || 'es';

        const adv = window.GoHappyAdventures.CATALOG.find(a => a.id === advId);
        if (!adv) return;

        try {
            const docData = {
                adventureId: advId,
                titulo: adv.titulo,
                emoji: adv.emoji,
                color: adv.color,
                tema: adv.tema,
                introNarrativa: adv.introNarrativa,
                tagline: adv.tagline,
                misiones: adv.misiones.map((m, idx) => ({
                    idx,
                    titulo: m.titulo,
                    pista: m.pista,
                    puntos: m.puntos,
                    completada: false,
                    proofPhoto: null,
                    completadoPor: null
                })),
                insignia: adv.insignia,
                cuentoTitulo: adv.cuentoTitulo,
                estado: 'activa',
                creadoPor: user.uid,
                fechaInicio: firebase.firestore.FieldValue.serverTimestamp()
            };

            await window.GoHappyDB
                .collection('families').doc(user.familyId)
                .collection('adventures').add(docData);

            window.GoHappySound?.play('success');
            window.GoHappyToast?.success(lang === 'en' ? '🚀 Adventure started!' : '🚀 ¡Aventura empezada!', 2500);
            // Recargar
            setTimeout(() => window.GoHappyAdventures.render(document.getElementById('main-content')), 600);
        } catch (e) {
            console.error('Start adventure:', e);
            window.GoHappyToast?.error(lang === 'en' ? 'Could not start adventure' : 'No se pudo empezar la aventura');
        }
    },

    // ─── Aventura ACTIVA ───
    _renderActive: (adv, user) => {
        const lang = window.GoHappyI18n?.lang || 'es';
        const T = (es, en) => lang === 'en' ? en : es;
        const sec = window.GoHappySecurity;
        const safe = (s) => sec ? sec.safe(s) : String(s || '');

        const content = document.getElementById('adv-content');
        const completed = adv.misiones.filter(m => m.completada).length;
        const total = adv.misiones.length;
        const progress = Math.round((completed / total) * 100);
        const allDone = completed === total;

        content.innerHTML = `
            <!-- Hero de la aventura -->
            <div style="
                background:linear-gradient(135deg, rgba(255,255,255,0.92), ${adv.color}15);
                border:0.5px solid ${adv.color}40;
                border-radius:22px; padding:18px; margin-bottom:14px;
                box-shadow:0 8px 22px rgba(11,76,143,0.10);
            ">
                <div style="display:flex; gap:14px; align-items:center; margin-bottom:10px;">
                    <div style="font-size:48px;">${adv.emoji}</div>
                    <div style="flex:1; min-width:0;">
                        <h2 style="font-family:'Poppins',sans-serif; color:var(--cobalt); font-weight:900; margin:0; font-size:1.25rem;">${safe(adv.titulo)}</h2>
                        <p style="font-size:12px; color:${adv.color}; font-weight:700; font-style:italic; margin:2px 0 0;">${safe(adv.tagline)}</p>
                    </div>
                </div>
                <p style="font-size:13px; color:var(--text-primary); line-height:1.5; margin:0 0 14px;">${safe(adv.introNarrativa)}</p>

                <!-- Progreso -->
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                    <span style="font-size:11px; font-weight:800; color:var(--cobalt);">${completed} / ${total} ${T('misiones', 'missions')}</span>
                    <span style="font-size:11px; color:var(--text-secondary); margin-left:auto;">${progress}%</span>
                </div>
                <div style="height:6px; background:rgba(11,76,143,0.10); border-radius:999px; overflow:hidden;">
                    <div style="height:100%; width:${progress}%; background:linear-gradient(135deg, ${adv.color}, ${adv.color}AA); border-radius:999px; transition:width 0.5s;"></div>
                </div>
            </div>

            ${allDone ? window.GoHappyAdventures._renderCompletionCard(adv) : ''}

            <!-- Lista de misiones -->
            <div style="display:flex; flex-direction:column; gap:10px;">
                ${adv.misiones.map((m, idx) => {
                    const done = m.completada;
                    return `
                        <div class="adv-mission" style="
                            background:rgba(255,255,255,0.95);
                            border:0.5px solid ${done ? 'rgba(39,174,96,0.30)' : 'rgba(11,76,143,0.10)'};
                            border-left:4px solid ${done ? '#27AE60' : adv.color};
                            border-radius:16px; padding:14px;
                            display:flex; gap:12px; align-items:flex-start;
                            ${done ? 'opacity:0.85;' : ''}
                        ">
                            <div style="
                                width:32px; height:32px; border-radius:50%; flex-shrink:0;
                                background:${done ? '#27AE60' : 'rgba(11,76,143,0.08)'};
                                color:${done ? 'white' : 'var(--cobalt)'};
                                display:flex; align-items:center; justify-content:center;
                                font-weight:900; font-size:14px;
                            ">${done ? '✓' : idx + 1}</div>
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:800; font-size:13.5px; color:var(--cobalt); line-height:1.3; ${done?'text-decoration:line-through;':''}">${safe(m.titulo)}</div>
                                ${m.pista && !done ? `<div style="font-size:11.5px; color:var(--text-secondary); margin-top:4px; line-height:1.4;">💡 ${safe(m.pista)}</div>` : ''}
                                ${done && m.proofPhoto ? `<img src="${m.proofPhoto}" style="width:80px; height:80px; object-fit:cover; border-radius:10px; margin-top:8px; box-shadow:0 2px 8px rgba(0,0,0,0.10);">` : ''}
                                ${!done ? `
                                    <button class="adv-do-btn" data-idx="${idx}" style="
                                        margin-top:8px; padding:8px 16px; border:none; border-radius:999px;
                                        background:${adv.color}; color:white; font-weight:800; font-size:12px;
                                        cursor:pointer;
                                    ">📷 ${T('Completar', 'Complete')} (+${m.puntos} pts)</button>
                                ` : `<div style="font-size:11px; color:#27AE60; font-weight:700; margin-top:4px;">✓ +${m.puntos} pts</div>`}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            ${!allDone ? `
                <button id="adv-abandon" style="margin-top:20px; padding:10px; background:transparent; color:var(--text-tertiary); border:none; font-size:11px; cursor:pointer; width:100%;">
                    ${T('Abandonar aventura', 'Abandon adventure')}
                </button>
            ` : ''}
        `;

        // Bind misiones
        content.querySelectorAll('.adv-do-btn').forEach(btn => {
            btn.onclick = () => window.GoHappyAdventures._completeMission(adv, parseInt(btn.dataset.idx), user);
        });
        // Abandonar
        const abandonBtn = document.getElementById('adv-abandon');
        if (abandonBtn) abandonBtn.onclick = async () => {
            if (!confirm(T('¿Seguro que quieres abandonar esta aventura?', 'Sure you want to abandon this adventure?'))) return;
            try {
                await window.GoHappyDB.collection('families').doc(user.familyId)
                    .collection('adventures').doc(adv.docId).update({ estado: 'abandonada' });
                window.GoHappyAdventures.render(document.getElementById('main-content'));
            } catch (e) {}
        };
    },

    // Card de celebración cuando se completan todas las misiones
    _renderCompletionCard: (adv) => {
        const lang = window.GoHappyI18n?.lang || 'es';
        const T = (es, en) => lang === 'en' ? en : es;
        const totalPts = adv.misiones.reduce((a, m) => a + (m.puntos || 0), 0);
        return `
            <div style="
                background:linear-gradient(135deg, ${adv.color}, ${adv.color}AA);
                color:white; text-align:center;
                padding:24px 18px; border-radius:22px; margin-bottom:16px;
                box-shadow:0 12px 30px ${adv.color}66;
            ">
                <div style="font-size:60px; line-height:1; animation:float 3s ease-in-out infinite;">${adv.insignia.emoji}</div>
                <h2 style="font-family:'Poppins',sans-serif; font-weight:900; margin:10px 0 4px; font-size:1.4rem;">¡${T('AVENTURA COMPLETADA', 'ADVENTURE COMPLETED')}!</h2>
                <p style="font-size:14px; opacity:0.95; margin:0 0 14px;">${adv.insignia.nombre}</p>
                <div style="background:rgba(255,255,255,0.18); border-radius:14px; padding:12px; margin:14px 0;">
                    <div style="font-size:11px; opacity:0.9; text-transform:uppercase; font-weight:800; margin-bottom:4px;">+${totalPts} ${T('puntos ganados', 'points earned')}</div>
                    <div style="font-size:13px; font-weight:700;">${T('La aventura quedará en vuestro álbum familiar', 'This adventure stays in your family album')}</div>
                </div>
                <button id="adv-finish" style="
                    margin-top:8px; padding:12px 28px; background:white; color:${adv.color};
                    border:none; border-radius:999px; font-weight:900; font-size:14px;
                    cursor:pointer; box-shadow:0 6px 16px rgba(0,0,0,0.18);
                ">✨ ${T('Guardar y empezar otra', 'Save and start another')}</button>
            </div>
            <script>
                document.getElementById('adv-finish')?.addEventListener('click', () => window.GoHappyAdventures._finalizeAdventure());
            </script>
        `;
    },

    _finalizeAdventure: async () => {
        const user = window.GoHappyAuth?.checkAuth?.();
        const adv = window.GoHappyAdventures._currentAdventure;
        if (!user || !adv) return;
        const lang = window.GoHappyI18n?.lang || 'es';
        const totalPts = adv.misiones.reduce((a, m) => a + (m.puntos || 0), 0);

        try {
            // Marcar completada
            await window.GoHappyDB
                .collection('families').doc(user.familyId)
                .collection('adventures').doc(adv.docId)
                .update({
                    estado: 'completada',
                    fechaFin: firebase.firestore.FieldValue.serverTimestamp()
                });

            // Añadir puntos al usuario
            await window.GoHappyDB.collection('users').doc(user.uid).update({
                points: firebase.firestore.FieldValue.increment(totalPts),
                weeklyPoints: firebase.firestore.FieldValue.increment(totalPts)
            });

            // Family context
            if (window.GoHappyContext) {
                window.GoHappyContext.addActivity('adventure_completed', {
                    title: adv.titulo, badge: adv.insignia.emoji, points: totalPts
                });
            }

            window.GoHappySound?.play('quest');
            window.GoHappyToast?.points(`🏆 +${totalPts} pts · ${adv.insignia.nombre}`, 4000);
            window.GoHappyAdventures._currentAdventure = null;
            setTimeout(() => window.GoHappyAdventures.render(document.getElementById('main-content')), 1500);
        } catch (e) {
            console.error('Finalize:', e);
            window.GoHappyToast?.error(lang === 'en' ? 'Could not finalize' : 'No se pudo finalizar');
        }
    },

    // ─── Completar una misión con foto ───
    _completeMission: async (adv, missionIdx, user) => {
        const lang = window.GoHappyI18n?.lang || 'es';
        const T = (es, en) => lang === 'en' ? en : es;
        const mission = adv.misiones[missionIdx];

        // Modal de foto
        const modal = document.createElement('div');
        modal.className = 'modal entry-anim';
        modal.style.cssText = 'z-index:9000;';
        modal.innerHTML = `
            <div class="auth-container" style="padding:20px;">
                <div class="auth-card premium-glass" style="padding:24px 20px; border-radius:28px; max-width:420px;">
                    <div style="text-align:center; margin-bottom:16px;">
                        <div style="font-size:36px;">${adv.emoji}</div>
                        <h3 style="font-family:'Poppins',sans-serif; color:var(--cobalt); font-weight:900; margin:8px 0 4px; font-size:1.1rem;">${T('Misión', 'Mission')} ${missionIdx + 1}</h3>
                        <p style="font-size:13px; color:var(--text-primary); margin:0;">${mission.titulo}</p>
                    </div>

                    <div style="background:linear-gradient(135deg,${adv.color}11,${adv.color}22); border:0.5px solid ${adv.color}40; border-radius:14px; padding:12px; margin-bottom:14px;">
                        <div style="font-size:12px; font-weight:800; color:${adv.color}; margin-bottom:4px;">📸 ${T('Foto como prueba (obligatorio)', 'Photo as proof (required)')}</div>
                        <div style="font-size:12px; color:var(--text-secondary); line-height:1.4;">${T('Una foto sencilla del momento. No hace falta arte, lo importante es el recuerdo.', 'A simple photo of the moment. No art needed, what matters is the memory.')}</div>
                    </div>

                    <input type="file" id="advm-file" accept="image/*" capture="environment" style="display:none;">
                    <div id="advm-preview" style="display:none; margin-bottom:12px;">
                        <img id="advm-img" src="" style="width:100%; max-height:240px; object-fit:cover; border-radius:14px;">
                    </div>

                    <button id="advm-pick" class="btn-primary" style="width:100%; padding:14px; border:none; border-radius:14px; font-weight:800; cursor:pointer; margin-bottom:10px;">
                        📷 ${T('Hacer/elegir foto', 'Take/pick photo')}
                    </button>
                    <button id="advm-submit" class="btn-primary" style="width:100%; padding:14px; border:none; border-radius:14px; font-weight:800; cursor:pointer; margin-bottom:10px; display:none; background:linear-gradient(135deg,${adv.color},${adv.color}DD);">
                        ✓ ${T('Confirmar misión cumplida', 'Confirm mission done')} (+${mission.puntos} pts)
                    </button>
                    <button class="btn-text full-width" onclick="this.closest('.modal').remove()" style="padding:8px;">${T('Cancelar', 'Cancel')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        let proofData = null;
        const fileInput = document.getElementById('advm-file');
        const previewDiv = document.getElementById('advm-preview');
        const submitBtn = document.getElementById('advm-submit');

        document.getElementById('advm-pick').onclick = () => fileInput.click();

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const max = 720;
                    const ratio = Math.min(max / img.width, max / img.height, 1);
                    canvas.width = img.width * ratio;
                    canvas.height = img.height * ratio;
                    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                    proofData = canvas.toDataURL('image/jpeg', 0.72);
                    document.getElementById('advm-img').src = proofData;
                    previewDiv.style.display = 'block';
                    submitBtn.style.display = 'block';
                    document.getElementById('advm-pick').style.display = 'none';
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        };

        submitBtn.onclick = async () => {
            if (!proofData) return;
            submitBtn.disabled = true;
            submitBtn.textContent = '⌛ ' + T('Guardando…', 'Saving…');
            try {
                // Actualizar la misión en el doc
                const updated = adv.misiones.map((m, idx) => idx === missionIdx
                    ? { ...m, completada: true, proofPhoto: proofData, completadoPor: user.uid, ts: Date.now() }
                    : m
                );
                await window.GoHappyDB
                    .collection('families').doc(user.familyId)
                    .collection('adventures').doc(adv.docId)
                    .update({ misiones: updated });

                // Puntos al usuario
                await window.GoHappyDB.collection('users').doc(user.uid).update({
                    points: firebase.firestore.FieldValue.increment(mission.puntos),
                    weeklyPoints: firebase.firestore.FieldValue.increment(mission.puntos)
                });

                window.GoHappySound?.play('quest');
                window.GoHappyToast?.points(`✓ +${mission.puntos} pts`, 2200);
                modal.remove();
                // Recargar para mostrar nuevo progreso
                window.GoHappyAdventures._currentAdventure = { ...adv, misiones: updated };
                window.GoHappyAdventures._renderActive(window.GoHappyAdventures._currentAdventure, user);
            } catch (e) {
                console.error('Mission complete:', e);
                submitBtn.disabled = false;
                submitBtn.textContent = '✓ ' + T('Confirmar', 'Confirm');
                window.GoHappyToast?.error(lang === 'en' ? 'Could not save' : 'No se pudo guardar');
            }
        };
    }
};
