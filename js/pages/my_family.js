// ================================================================
// GoHappy My Family — Página dedicada a tu Tribu privada
// Muestra: miembros, retos familiares, Moments privados, creación
// de retos personalizados (solo admin/creador)
// ================================================================
window.GoHappyMyFamily = {

    render: async (container) => {
        const user = window.GoHappyAuth?.checkAuth?.();
        const lang = window.GoHappyI18n?.lang || 'es';
        const T = (es, en) => lang === 'en' ? en : es;
        // Anti-XSS: escape estricto para todo string de usuario que vaya a innerHTML
        const sec = window.GoHappySecurity;
        const safe = (s) => sec ? sec.safe(s) : String(s || '').replace(/[<>&"'`]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));

        if (!user || user.isGuest) {
            container.innerHTML = `
                <div class="moments-empty" style="margin-top:40px;">
                    <div class="moments-empty-icon">🔐</div>
                    <div class="moments-empty-title">${T('Inicia sesión', 'Sign in')}</div>
                    <div class="moments-empty-text">${T('Para acceder a Mi Familia', 'To access My Family')}</div>
                </div>`;
            return;
        }

        if (!user.familyId) {
            container.innerHTML = `
                <div class="my-family-page" style="padding:24px 16px 120px;">
                    <div class="unified-hero">
                        <h2>👨‍👩‍👧 ${T('Mi Familia', 'My Family')}</h2>
                        <p>${T('Crea o únete a una familia para empezar', 'Create or join a family to start')}</p>
                    </div>
                    <div style="text-align:center; margin-top:40px;">
                        <div style="font-size:60px;">🏠</div>
                        <p style="color:var(--text-secondary); margin:14px 0 22px; font-size:14px;">
                            ${T('Aún no perteneces a ninguna familia.', 'You dont belong to any family yet.')}
                        </p>
                        <button id="mf-create-join-btn" class="btn-primary" style="padding:14px 28px; border-radius:999px; border:none; font-weight:800; cursor:pointer;">
                            ${T('Crear o unirme a una familia', 'Create or join a family')}
                        </button>
                    </div>
                </div>`;
            const btn = document.getElementById('mf-create-join-btn');
            if (btn) btn.onclick = () => window.GoHappyFamilyOnboarding?.show?.();
            return;
        }

        // Loading state
        container.innerHTML = `
            <div class="my-family-page" style="padding:14px 0 120px;">
                <div class="unified-hero" style="padding:16px 16px 22px;">
                    ${window.GoHappyPremium ? window.GoHappyPremium.greetingHTML() : ''}
                    <h2 id="mf-title">👨‍👩‍👧 ${T('Mi Familia', 'My Family')}</h2>
                    <p id="mf-sub">${T('Cargando…', 'Loading…')}</p>
                </div>

                <div id="mf-content" style="padding:0 14px;">
                    <div style="background:rgba(255,255,255,0.7); border-radius:18px; padding:24px; text-align:center;">
                        <div class="typing-dots"><span></span><span></span><span></span></div>
                    </div>
                </div>
            </div>
        `;

        try {
            // Cargar familia
            const familyDoc = await window.GoHappyDB.collection('families').doc(user.familyId).get();
            if (!familyDoc.exists) {
                document.getElementById('mf-content').innerHTML = `
                    <div class="moments-empty"><div class="moments-empty-icon">⚠️</div>
                    <div class="moments-empty-title">${T('Familia no encontrada', 'Family not found')}</div></div>`;
                return;
            }
            const family = { id: familyDoc.id, ...familyDoc.data() };
            const isAdmin = family.creadoPor === user.uid;
            // textContent es seguro contra XSS por defecto (escapa HTML automáticamente)
            document.getElementById('mf-title').textContent = `👨‍👩‍👧 ${family.nombre}`;
            document.getElementById('mf-sub').textContent = isAdmin
                ? T('Eres el anfitrión 👑', 'You are the host 👑')
                : T('Miembro de la familia', 'Family member');

            // Cargar miembros (paralelo)
            const memberDocsPromises = (family.miembros || []).map(uid =>
                window.GoHappyDB.collection('users').doc(uid).get().then(d => d.exists ? { uid, ...d.data() } : null).catch(() => null)
            );
            const memberDocs = (await Promise.all(memberDocsPromises)).filter(Boolean);

            // Cargar retos familiares (origen 'today_plan' o admin custom)
            const questsSnap = await window.GoHappyDB.collection('quests')
                .where('familyId', '==', family.id)
                .limit(30)
                .get();
            const customQuests = questsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                .filter(q => q.origen === 'today_plan' || q.origen === 'custom_admin');

            // Render
            const content = document.getElementById('mf-content');
            content.innerHTML = `
                <!-- Código invitación -->
                <div class="mf-card" style="background:linear-gradient(135deg,rgba(11,113,252,0.08),rgba(23,200,212,0.10)); border:0.5px solid rgba(11,113,252,0.20); border-radius:18px; padding:16px; margin-bottom:14px;">
                    <div style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase; margin-bottom:6px;">🔑 ${T('Código de invitación', 'Invitation code')}</div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-family:'Courier New',monospace; font-size:24px; font-weight:900; color:var(--cobalt); letter-spacing:3px;">${safe(family.codigoInvitacion)}</span>
                        <button id="mf-copy-code" style="margin-left:auto; padding:8px 14px; background:var(--brand-bright); color:white; border:none; border-radius:999px; font-weight:700; font-size:12px; cursor:pointer;">📋 ${T('Copiar', 'Copy')}</button>
                    </div>
                </div>

                <!-- Miembros -->
                <div class="mf-card" style="background:rgba(255,255,255,0.92); border-radius:18px; padding:16px; margin-bottom:14px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                        <h3 style="font-size:14px; font-weight:800; color:var(--cobalt); margin:0;">👥 ${T('Miembros', 'Members')} (${memberDocs.length}/6)</h3>
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:10px;">
                        ${memberDocs.map(m => {
                            const pts = parseInt(m.points) || 0;
                            const isPhoto = m.photo && (m.photo.startsWith('data:') || m.photo.startsWith('http'));
                            const inner = isPhoto
                                ? `<div style="width:100%;height:100%;background-image:url('${m.photo}');background-size:cover;background-position:center;border-radius:50%;"></div>`
                                : (m.photo || '👤');
                            const lvl = window.GoHappyPoints?.getLevelInfo?.(pts) || { ring:'linear-gradient(135deg,#A0E0B6,#65C18C)', shadow:'rgba(101,193,140,0.45)', name:'Novato' };
                            return `
                            <div style="display:flex; align-items:center; gap:10px; padding:6px 14px 6px 6px; background:rgba(11,76,143,0.05); border-radius:999px;">
                                <div class="gh-level-ring" data-level="${lvl.name}" title="${lvl.name}" style="
                                    position:relative; width:38px; height:38px; padding:2.5px; flex-shrink:0;
                                    border-radius:50%; background:${lvl.ring};
                                    box-shadow:0 0 8px ${lvl.shadow};
                                    display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box;
                                ">
                                    <div style="width:33px;height:33px;border-radius:50%;background:white;color:var(--cobalt);display:flex;align-items:center;justify-content:center;font-size:16px;overflow:hidden;box-sizing:border-box;">${inner}</div>
                                </div>
                                <div>
                                    <div style="font-size:12px; font-weight:800; color:var(--cobalt);">${safe(m.nickname || 'Tribu')}</div>
                                    <div style="font-size:10px; color:var(--text-secondary);">${pts} pts ${m.uid === family.creadoPor ? '· 👑' : ''}</div>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Retos familiares (vienen de Today guardados + custom admin) -->
                <div class="mf-card" style="background:rgba(255,255,255,0.92); border-radius:18px; padding:16px; margin-bottom:14px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                        <h3 style="font-size:14px; font-weight:800; color:var(--cobalt); margin:0;">⚔️ ${T('Retos de la familia', 'Family quests')}</h3>
                        ${isAdmin ? `<button id="mf-new-quest-btn" style="padding:6px 12px; background:var(--brand-bright); color:white; border:none; border-radius:999px; font-weight:700; font-size:11px; cursor:pointer;">+ ${T('Nuevo reto', 'New quest')}</button>` : ''}
                    </div>
                    <div id="mf-quests-list">
                        ${customQuests.length === 0
                            ? `<div style="text-align:center; padding:18px 8px; color:var(--text-secondary); font-size:13px;">${T('Sin retos personalizados todavía', 'No custom quests yet')}</div>`
                            : customQuests.map(q => `
                                <div style="display:flex; gap:10px; align-items:center; padding:10px; background:rgba(11,76,143,0.04); border-radius:12px; margin-bottom:8px;">
                                    <div style="font-size:24px; flex-shrink:0;">${q.icono || '🎯'}</div>
                                    <div style="flex:1; min-width:0;">
                                        <div style="font-weight:800; font-size:13px; color:var(--cobalt); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safe(q.titulo)}</div>
                                        <div style="font-size:11px; color:var(--text-secondary);">+${parseInt(q.puntos) || 0} pts · ${safe(q.frecuencia || 'semanal')}</div>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>

                <!-- Recuerdos de la familia (Moments privados) -->
                <div class="mf-card" style="background:rgba(255,255,255,0.92); border-radius:18px; padding:16px; margin-bottom:14px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                        <h3 style="font-size:14px; font-weight:800; color:var(--cobalt); margin:0;">📸 ${T('Recuerdos familiares', 'Family moments')}</h3>
                        <button data-goto="moments" style="padding:6px 12px; background:rgba(11,76,143,0.08); color:var(--cobalt); border:0.5px solid rgba(11,76,143,0.15); border-radius:999px; font-weight:700; font-size:11px; cursor:pointer;">${T('Ver todos', 'See all')} →</button>
                    </div>
                    <div id="mf-moments-grid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
                        <div style="aspect-ratio:1; background:rgba(11,76,143,0.06); border-radius:10px; display:flex; align-items:center; justify-content:center; color:var(--text-tertiary); font-size:12px;">${T('Cargando…', 'Loading…')}</div>
                    </div>
                </div>

                ${isAdmin ? `
                    <!-- Acciones admin -->
                    <button id="mf-delete-family" style="width:100%; margin-top:16px; padding:12px; background:rgba(239,68,68,0.08); color:#DC2626; border:0.5px solid rgba(239,68,68,0.30); border-radius:999px; font-weight:700; font-size:13px; cursor:pointer;">
                        ${T('🚪 Salir de la familia', '🚪 Leave family')}
                    </button>
                ` : `
                    <button id="mf-leave-family" style="width:100%; margin-top:16px; padding:12px; background:rgba(239,68,68,0.08); color:#DC2626; border:0.5px solid rgba(239,68,68,0.30); border-radius:999px; font-weight:700; font-size:13px; cursor:pointer;">
                        ${T('🚪 Salir de la familia', '🚪 Leave family')}
                    </button>
                `}
            `;

            // Cargar Moments preview (último 6)
            try {
                const momentsSnap = await window.GoHappyDB.collection('moments')
                    .where('familyId', '==', family.id)
                    .orderBy('createdAt', 'desc')
                    .limit(6)
                    .get();
                const moments = momentsSnap.docs.map(d => d.data());
                const grid = document.getElementById('mf-moments-grid');
                if (moments.length === 0) {
                    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:14px; color:var(--text-secondary); font-size:12px;">${T('Aún no hay recuerdos. ¡Compartid el primero!', 'No memories yet. Share the first one!')}</div>`;
                } else {
                    grid.innerHTML = moments.map(m => `
                        <div style="aspect-ratio:1; border-radius:10px; overflow:hidden; cursor:pointer; background:${m.imageData ? `url(${m.imageData})` : 'rgba(11,76,143,0.06)'}; background-size:cover; background-position:center;" data-goto="moments"></div>
                    `).join('');
                }
            } catch (e) {
                console.warn('Family moments preview error:', e?.message);
            }

            // Bind handlers
            const copyBtn = document.getElementById('mf-copy-code');
            if (copyBtn) copyBtn.onclick = async () => {
                try {
                    await navigator.clipboard.writeText(family.codigoInvitacion);
                    copyBtn.textContent = '✓ ' + T('Copiado', 'Copied');
                    window.GoHappyToast?.success(T('Código copiado', 'Code copied'), 2000);
                    setTimeout(() => copyBtn.textContent = '📋 ' + T('Copiar', 'Copy'), 2500);
                } catch (e) {}
            };

            const newQuestBtn = document.getElementById('mf-new-quest-btn');
            if (newQuestBtn) newQuestBtn.onclick = () => window.GoHappyMyFamily._openCreateQuestModal(family, T);

            container.querySelectorAll('[data-goto]').forEach(el => {
                el.onclick = () => window.GoHappyApp?.loadPage?.(el.dataset.goto);
            });

            const leaveBtn = document.getElementById('mf-leave-family') || document.getElementById('mf-delete-family');
            if (leaveBtn) leaveBtn.onclick = async () => {
                if (!confirm(T('¿Seguro que quieres salir? Perderás progreso compartido.', 'Sure you want to leave? Shared progress will be lost.'))) return;
                try {
                    if (window.GoHappyFamilies?.leaveFamily) {
                        await window.GoHappyFamilies.leaveFamily();
                        window.GoHappyToast?.success(T('Has salido de la familia', 'You left the family'));
                        window.GoHappyApp?.loadPage?.('profile');
                    }
                } catch (e) {
                    window.GoHappyToast?.error(e?.message || T('Error al salir', 'Error leaving'));
                }
            };
        } catch (e) {
            console.error('MyFamily render error:', e);
            document.getElementById('mf-content').innerHTML = `
                <div class="moments-empty"><div class="moments-empty-icon">⚠️</div>
                <div class="moments-empty-title">${T('Error al cargar', 'Could not load')}</div></div>`;
        }
    },

    // Modal para que el ADMIN cree un reto custom
    _openCreateQuestModal: (family, T) => {
        const modal = document.createElement('div');
        modal.className = 'modal entry-anim';
        modal.style.cssText = 'z-index:9000;';
        modal.innerHTML = `
            <div class="auth-container" style="padding:20px;">
                <div class="auth-card premium-glass" style="padding:28px 22px; border-radius:32px; max-width:420px;">
                    <h3 style="color:var(--primary-cobalt); text-align:center; font-weight:900; margin-bottom:8px;">⚔️ ${T('Nuevo reto familiar', 'New family quest')}</h3>
                    <p style="font-size:12px; color:var(--text-secondary); text-align:center; margin-bottom:20px;">${T('Crea un reto personalizado y la recompensa que vais a ganar', 'Create a custom quest and your reward')}</p>

                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">${T('Título del reto', 'Quest title')}</label>
                    <input id="cq-title" type="text" maxlength="60" placeholder="${T('Ej: Cocinar paella el domingo', 'E.g.: Cook paella on Sunday')}" style="width:100%; padding:12px 14px; border:0.5px solid rgba(11,76,143,0.15); border-radius:14px; margin:6px 0 14px; font-size:14px; outline:none; box-sizing:border-box;">

                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">${T('Descripción', 'Description')}</label>
                    <textarea id="cq-desc" maxlength="200" rows="3" placeholder="${T('Detalles del reto…', 'Quest details…')}" style="width:100%; padding:12px 14px; border:0.5px solid rgba(11,76,143,0.15); border-radius:14px; margin:6px 0 14px; font-size:13px; outline:none; resize:none; box-sizing:border-box; font-family:inherit;"></textarea>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;">
                        <div>
                            <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">${T('Icono', 'Icon')}</label>
                            <select id="cq-icon" style="width:100%; padding:11px; border:0.5px solid rgba(11,76,143,0.15); border-radius:14px; margin-top:6px; font-size:16px; background:white; outline:none;">
                                <option value="🎯">🎯</option><option value="🌳">🌳</option><option value="🍳">🍳</option>
                                <option value="📚">📚</option><option value="🎨">🎨</option><option value="🏃">🏃</option>
                                <option value="🎲">🎲</option><option value="🎬">🎬</option><option value="🧩">🧩</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">${T('Puntos', 'Points')}</label>
                            <input id="cq-points" type="number" min="10" max="500" value="100" style="width:100%; padding:11px; border:0.5px solid rgba(11,76,143,0.15); border-radius:14px; margin-top:6px; font-size:14px; outline:none; box-sizing:border-box;">
                        </div>
                    </div>

                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">🎁 ${T('Recompensa familiar (al completarlo)', 'Family reward (when done)')}</label>
                    <input id="cq-reward" type="text" maxlength="80" placeholder="${T('Ej: Pizza casera el viernes', 'E.g.: Homemade pizza on Friday')}" style="width:100%; padding:12px 14px; border:0.5px solid rgba(11,76,143,0.15); border-radius:14px; margin:6px 0 18px; font-size:13px; outline:none; box-sizing:border-box;">

                    <button id="cq-save" class="btn-primary" style="width:100%; padding:14px; border-radius:14px; border:none; font-weight:800; cursor:pointer;">✨ ${T('Crear reto', 'Create quest')}</button>
                    <button class="btn-text full-width" style="margin-top:10px; padding:8px;" onclick="this.closest('.modal').remove()">${T('Cancelar', 'Cancel')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('cq-save').onclick = async () => {
            const title = document.getElementById('cq-title').value.trim();
            const desc = document.getElementById('cq-desc').value.trim();
            const icon = document.getElementById('cq-icon').value;
            const points = parseInt(document.getElementById('cq-points').value) || 100;
            const reward = document.getElementById('cq-reward').value.trim();

            if (!title || title.length < 3) {
                window.GoHappyToast?.warning(T('Pon un título', 'Add a title'));
                return;
            }

            const saveBtn = document.getElementById('cq-save');
            saveBtn.disabled = true;
            saveBtn.textContent = '⌛ ' + T('Creando…', 'Creating…');

            try {
                const fullDesc = reward ? `${desc}\n\n🎁 ${T('Recompensa', 'Reward')}: ${reward}` : desc;
                const res = await window.GoHappyQuests.createCustomQuest({
                    titulo: title,
                    descripcion: fullDesc,
                    icono: icon,
                    puntos: points,
                    categoria: 'familiar',
                    frecuencia: 'semanal',
                    origen: 'custom_admin'
                });
                if (res?.ok) {
                    window.GoHappySound?.play('success');
                    window.GoHappyToast?.success(T('✨ Reto creado para la familia', '✨ Quest created for the family'), 2500);
                    modal.remove();
                    // Refrescar
                    setTimeout(() => window.GoHappyApp?.loadPage?.('my_family'), 500);
                } else {
                    throw new Error(res?.error || 'unknown');
                }
            } catch (e) {
                saveBtn.disabled = false;
                saveBtn.textContent = '✨ ' + T('Crear reto', 'Create quest');
                window.GoHappyToast?.error(T('No se pudo crear: ', 'Could not create: ') + (e?.message || ''));
            }
        };
    }
};
