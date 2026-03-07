window.KidoaAI = {
    // Especialización en Crianza
    SYSTEM_PROMPT: `Eres KIDOA IA, la asistente oficial de la App KIDOA, experta líder en crianza consciente, salud infantil (0-15 años), psicología positiva y nutrición. 
    Tu misión es ayudar a padres modernos a encontrar planes y soluciones basados ESTRICTAMENTE en su zona geográfica actual.
    - Estilo: Empático, ultra-personalizado, premium.
    - Geografía: Identifica SIEMPRE la ciudad y provincia de las coordenadas proporcionadas y limita la información a esa zona.
    - Seguridad: Si detectas consultas médicas críticas, ofrece consejos de calma pero siempre recomienda visitar al pediatra.`,

    // Buscar Noticias Regionales
    getNews: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Actúa como periodista local. Ubicación del usuario: ${coordinates}.
        1. Identifica la CIUDAD y PROVINCIA de estas coordenadas.
        2. Busca 3 noticias o avisos oficiales REALES de HOY sobre crianza, parques, colegios o vida familiar específicos de esa ciudad o provincia.
        3. Prioriza fuentes oficiales (ayuntamientos, juntas regionales, diarios locales).
        4. No menciones otras regiones. Solo información de su zona o provincia autonoma.
        Formato JSON: [ { "title": "", "summary": "", "link": "url", "sourceName": "Fuente Local", "date": "Hoy" } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Buscar Eventos Infantiles (0-15 años)
    getEvents: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Busca eventos infantiles (0-15 años) cerca de ${coordinates}.
        1. Identifica la CIUDAD de estas coordenadas.
        2. Busca eventos REALES para los próximos 7 días: teatro infantil, música, aire libre, talleres.
        3. Solo eventos en su municipio o municipios colindantes (su zona).
        Formato JSON: [ { "title": "", "date": "", "location": "Sitio Real", "price": "", "lat": NUM, "lng": NUM } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Buscar Becas y Ayudas
    getBecas: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Ubicación: ${coordinates}.
        1. Identifica la PROVINCIA y COMUNIDAD AUTÓNOMA.
        2. Busca 3 becas o ayudas familiares activas en el boletín oficial de esa comunidad (ej: BOCYL, DOGC, BOCM, etc.) o del ayuntamiento local.
        3. Keywords: niños, crianza, infantil, educación.
        Formato JSON: [ { "title": "", "description": "", "status": "PLAZO ABIERTO", "statusColor": "green", "linkText": "Ver bases oficiales" } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    getTodayActivities: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Actúa como un planificador de ocio familiar experto y creativo. Ubicación del usuario: ${coordinates}.
        Tu misión es generar el hub "TODAY" (¿Qué hacer hoy?).
        1. Identifica la CIUDAD y PROVINCIA de estas coordenadas.
        2. Genera 4-5 actividades para HOY mismo. 
        3. IMPORTANTE: No te limites solo a eventos oficiales. CREA PLANES basados en la geografía local:
           - "Picnic familiar en el Parque [Nombre]" (detallando qué llevar y mejor zona).
           - "Ruta de exploración de estatuas/fuentes por el centro".
           - "Tarde de juegos tradicionales en la Plaza [Nombre]".
           - "Visita al mirador de [Nombre] para ver el atardecer".
           - Además de museos, cine o talleres si los hay.
        4. Para cada actividad, necesito: 
           - Título MUY ATRACTIVO y EMOCIONANTE.
           - Resumen breve inspirador.
           - Horarios específicos sugeridos para HOY.
           - Ubicación exacta (nombre del sitio real).
           - Coordenadas REALES (lat, lng) para el punto de encuentro.
           - Precio (o "Gratis" / "Bajo coste").
           - Enlace de interés si existe (o vacío).
           - Edad recomendada clara.
        5. Formato JSON estricto: [ { "title": "", "summary": "", "time": "", "location": "", "lat": NUM, "lng": NUM, "price": "", "link": "", "age": "" } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Generador Dinámico de Mapa (Basado en Coordenadas)
    getDynamicLocations: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Actúa como guía turístico local familiar. Genera 8 sitios reales increíbles para ir con niños (parques, museos, ludotecas, restaurantes kid-friendly) en un radio cercano de las coordenadas GPS: ${coordinates}.
        Devuélvelos en formato JSON estricto para mapearlos directamente.
        Asegúrate de incluir sus nombres reales locales, no te inventes nombres de comercios si no existen, dales coordenadas muy cercanas al usuario.
        Formato esperado:
        [ { "id": UID_NUMERICO_UNICO, "name": "Nombre Real", "type": "park"|"museum"|"school"|"theater"|"kidzone"|"food", "lat": NUMERO, "lng": NUMERO, "rating": NUMERO_4_A_5, "reviews": NUMERO } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Búsqueda Semántica Dinámica
    searchDynamicLocations: async (query, coordinates = "41.6520, -4.7286") => {
        const prompt = `El usuario, ubicado en las coordenadas: ${coordinates}, ha buscado: "${query}".
        Recomienda 4 o 5 lugares locales reales que resuelvan perfectamente esta necesidad.
        Formato esperado JSON:
        [ { "id": UID_NUMERICO_UNICO, "name": "Nombre Real", "type": "park"|"museum"|"school"|"theater"|"kidzone"|"food"|"generic", "lat": NUMERO, "lng": NUMERO, "rating": 4.8, "reviews": 120 } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Generar Misiones Contextuales
    generateLocalQuests: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Crea 2 'Misiones Familiares' (Quests) divertidas y muy específicas para jugar hoy basadas en lugares REALES cerca de estas coordenadas GPS: ${coordinates}.
        Ejemplo: "Encuentra la estatua en la Plaza de Zorrilla", "Haz un mini picnic en el Parque Ribera de Castilla".
        Ten en cuenta el clima actual típico de la zona.
        Formato JSON estricto: [ { "id": "q_ai_1", "title": "Nombre divertido", "description": "Breve descripción", "type": "EXPLORATION"|"CREATIVITY", "category": "Misión", "difficulty": "fácil"|"media", "points": 100, "objectives": ["Paso 1", "Paso 2"], "totalSteps": 2, "status": "active" } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Generar Alerta/Consejo de Seguridad (Clima o Noticias)
    getDailySafeInsight: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Genera un consejo rápido de seguridad o meteorología infantil (1 o 2 frases) para una familia que se encuentra ahora mismo en la zona de las coordenadas GPS: ${coordinates}.
        Ejemplo: "Atención: Hoy se esperan lluvias a partir de las 17h, no olvides llevar paraguas y calzado adecuado."
        Formato texto plano.`;

        return await window.KidoaAI._callGemini(prompt, false); // False = Devuelve texto, no JSON
    },

    // Generar Topic Diario para la Tribu
    getDailyTribuTopic: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Genera un post para un foro de padres ('La Tribu') en la ciudad correspondiente a las coordenadas GPS: ${coordinates}.
        Debe ser un debate o consejo interesante sobre crianza y la vida en esa ciudad específica.
        Formato JSON estricto: { "authorKey": "KIDOA_IA", "title": "El Debate del Día 🤖", "content": "Contenido del debate..." }`;
        return await window.KidoaAI._callGemini(prompt, true);
    },

    // Chat Especializado
    chat: async (userMessage, history = []) => {
        const prompt = `${window.KidoaAI.SYSTEM_PROMPT}\n\nHistorial: ${JSON.stringify(history)}\nUsuario: ${userMessage}`;
        const response = await window.KidoaAI._callGemini(prompt, false); // false = return text, not json
        return response;
    },

    // Helper para llamadas a Gemini
    _callGemini: async (prompt, expectJson = true) => {
        if (!window.GEMINI_KEY || window.GEMINI_KEY.includes('PEGAR_AQUI')) {
            return window.KidoaAI._getMockData(prompt);
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${window.GEMINI_KEY}`, {
                method: 'POST',
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;

            if (expectJson) {
                const cleanJson = text.replace(/```json|```/g, '').trim();
                return JSON.parse(cleanJson);
            }
            return text;
        } catch (e) {
            console.error("Error en KidoaAI:", e);
            return expectJson ? [] : "Lo siento, tengo problemas para conectarme ahora mismo.";
        }
    },

    _getMockData: (prompt) => {
        // Fallback robusto para demos sin internet/clave
        if (prompt.includes('noticia')) return [
            { title: "Bono Cuidado Regional", summary: "Nuevas ayudas para la conciliación familiar disponibles este mes.", source: "https://ejemplo.es", sourceName: "BOE" }
        ];
        return [];
    }
};
