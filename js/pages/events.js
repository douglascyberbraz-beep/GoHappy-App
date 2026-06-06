// ================================================================
// GoHappy Events — pestaña dedicada (separada de Today)
// Reutiliza el motor de eventos premium de Today (getRealEvents +
// _renderEventos) para no duplicar lógica ni tarjetas.
// ================================================================
window.GoHappyEventsPage = {
    render: async (container) => {
        const lang = window.GoHappyI18n?.lang || 'es';
        const T = (es, en) => lang === 'en' ? en : es;

        // Coords compartidas con Today
        window.GoHappyToday._coords = window.lastKnownCoords
            || window.GoHappyToday._coords || '41.6520, -4.7286';

        container.innerHTML = `
            <div class="today-page">
                <div class="today-hero-premium">
                    <div style="position:relative; z-index:2;">
                        ${window.GoHappyPremium ? window.GoHappyPremium.greetingHTML() : ''}
                        <h2 class="today-welcome-title" style="margin-top:2px;">🎫 ${T('Eventos', 'Events')}</h2>
                        <p class="today-welcome-subtitle" id="ev-city">${T('Planes y eventos reales cerca de ti', 'Real events near you')}</p>
                    </div>
                </div>
                <div id="events-page-content" style="padding:0 14px calc(var(--nav-total, 110px) + 24px); width:100%; box-sizing:border-box;">
                    ${window.GoHappyToday._skeletonCards(3)}
                </div>
            </div>`;

        // Mostrar ciudad detectada
        try {
            const c = await window.GoHappyAI.getCityFromCoords(window.GoHappyToday._coords);
            const el = document.getElementById('ev-city');
            if (el && c?.full) el.textContent = '📍 ' + c.full;
        } catch (e) { /* ignore */ }

        // Reutiliza el render de eventos premium de Today (tarjetas + citas + bindings)
        await window.GoHappyToday._renderEventos(document.getElementById('events-page-content'));
    }
};
