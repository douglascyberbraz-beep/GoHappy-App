import { GEMINI_KEY } from "./firebase";

export class KidoaAI {
    static async callGemini(prompt: string, expectJson: boolean = true) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: expectJson ? { responseMimeType: "application/json" } : {}
                })
            });

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (expectJson) {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.warn("AI JSON Parse Error:", text);
                    return null;
                }
            }
            return text;
        } catch (e) {
            console.error("AI Service Error:", e);
            return null;
        }
    }

    static async getTodayActivities(coords: string, prefs: any) {
        const prompt = `
            ACTÚA COMO UN GUÍA LOCAL EXPERTO PARA FAMILIAS.
            UBICACIÓN: ${coords} (Lat, Lng)
            FAMILIA: ${prefs.adults} adultos, ${prefs.kids} niños (Edades: ${prefs.ages}).
            PREFERENCIAS: Ambiente ${prefs.environment}, Presupuesto ${prefs.budget}.

            OBJETIVO: Devuelve 3 planes REALES y ESPECÍFICOS para HOY.
            REGLAS ESTRICTAS:
            1. PROHIBIDO INVENTAR: Usa solo lugares reales que existan en Google Maps en esa zona.
            2. NO USAR EJEMPLOS GENÉRICOS.
            3. Si no hay planes reales, devuelve una lista vacía [].
            4. Formato JSON: [{id, title, summary, location, lat, lng, time, duration, price, age, tip, link}]
        `;
        return await this.callGemini(prompt, true);
    }
}
