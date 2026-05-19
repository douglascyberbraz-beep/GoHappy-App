// ================================================================
// GoHappy Events API — Eventos reales desde proveedores oficiales
// Estrategia: Ticketmaster Discovery (UK/ES) + fallback Search Grounding
// ----------------------------------------------------------------
// IMPORTANTE: Eventbrite cerró su Search API pública en 2020.
// Solo es útil si tienes acuerdos con organizadores concretos.
// Por eso usamos Ticketmaster Discovery que SÍ está abierta.
//
// SETUP:
//   1. Regístrate en https://developer.ticketmaster.com/ (gratis, 5000 calls/día)
//   2. Copia tu Consumer Key en window.TICKETMASTER_KEY
//   3. Descomenta el script en index.html
// ================================================================
window.GoHappyEvents = {

    // Cache client-side (1h) para no malgastar la cuota
    _CACHE_TTL: 60 * 60 * 1000,

    _cacheKey: (lat, lng, when) => `gh_events_${lat.toFixed(2)}_${lng.toFixed(2)}_${when}`,

    _getCached: (key) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const { ts, data } = JSON.parse(raw);
            if (Date.now() - ts < window.GoHappyEvents._CACHE_TTL) return data;
        } catch (e) {}
        return null;
    },

    _setCached: (key, data) => {
        try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch (e) {}
    },

    // Mapea fecha humana → rango ISO
    _dateRange: (when) => {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);
        if (when === 'hoy' || when === 'today') {
            end.setHours(23, 59, 59, 999);
        } else if (when === 'manana' || when === 'tomorrow') {
            start.setDate(now.getDate() + 1); start.setHours(0,0,0,0);
            end.setDate(now.getDate() + 1);   end.setHours(23,59,59,999);
        } else if (when === 'finde' || when === 'weekend') {
            // Próximo sábado y domingo
            const dow = now.getDay(); // 0=Sun
            const daysToSat = (6 - dow + 7) % 7 || 0;
            start.setDate(now.getDate() + daysToSat); start.setHours(0,0,0,0);
            end.setDate(start.getDate() + 1); end.setHours(23,59,59,999);
        } else {
            end.setDate(now.getDate() + 14);
        }
        return {
            startDateTime: start.toISOString().split('.')[0] + 'Z',
            endDateTime:   end.toISOString().split('.')[0] + 'Z'
        };
    },

    // Llamada principal — devuelve array de eventos con shape común
    getEvents: async (lat, lng, when = 'finde', radiusKm = 25) => {
        if (!lat || !lng) return [];

        const cacheKey = window.GoHappyEvents._cacheKey(lat, lng, when);
        const cached = window.GoHappyEvents._getCached(cacheKey);
        if (cached) return cached;

        if (!window.TICKETMASTER_KEY) {
            console.info('[Events] Ticketmaster no configurado — usa Gemini Grounding como fallback');
            return [];
        }

        const country = window.GoHappyI18n?.country === 'GB' ? 'GB' : 'ES';
        const { startDateTime, endDateTime } = window.GoHappyEvents._dateRange(when);

        try {
            const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
            url.searchParams.set('apikey', window.TICKETMASTER_KEY);
            url.searchParams.set('latlong', `${lat},${lng}`);
            url.searchParams.set('radius', radiusKm);
            url.searchParams.set('unit', 'km');
            url.searchParams.set('countryCode', country);
            url.searchParams.set('startDateTime', startDateTime);
            url.searchParams.set('endDateTime', endDateTime);
            url.searchParams.set('size', '20');
            url.searchParams.set('sort', 'date,asc');
            // Familiares: clasificación que incluye family/arts
            url.searchParams.set('classificationName', 'family,arts,music,sports');

            const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
            if (!res.ok) {
                console.warn('[Events] Ticketmaster', res.status);
                return [];
            }
            const data = await res.json();
            const events = (data?._embedded?.events || []).map(e => ({
                title: e.name,
                date:  e.dates?.start?.localDate,
                time:  e.dates?.start?.localTime,
                location: e._embedded?.venues?.[0]?.name || '',
                city:  e._embedded?.venues?.[0]?.city?.name || '',
                lat:   e._embedded?.venues?.[0]?.location?.latitude,
                lng:   e._embedded?.venues?.[0]?.location?.longitude,
                price: e.priceRanges?.[0]
                    ? `${e.priceRanges[0].min}-${e.priceRanges[0].max} ${e.priceRanges[0].currency}`
                    : (window.GoHappyI18n?.lang === 'en' ? 'Check site' : 'Ver web'),
                image: e.images?.find(i => i.ratio === '16_9')?.url || e.images?.[0]?.url,
                link:  e.url,
                linkText: window.GoHappyI18n?.lang === 'en' ? 'Buy tickets' : 'Comprar entradas',
                ages:  'Familia',
                tip:   '',
                source: 'ticketmaster'
            }));

            window.GoHappyEvents._setCached(cacheKey, events);
            return events;
        } catch (e) {
            console.warn('[Events] error:', e?.message);
            return [];
        }
    }
};
