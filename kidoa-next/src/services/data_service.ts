import { db } from "./firebase";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    orderBy, 
    limit,
    Timestamp 
} from "firebase/firestore";
import { KidoaAI } from "./ai_service";

export class DataService {
    static async getLocations(coords: string) {
        // Try AI first for real locations in the area
        const aiPlaces = await KidoaAI.callGemini(`Busca lugares reales para niños cerca de ${coords}. Devuelve JSON.`, true);
        if (aiPlaces && aiPlaces.length > 0) return aiPlaces;

        // Fallback to Firestore community reviews
        const q = query(collection(db, "reviews"), limit(20));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    static async addReview(userId: string, siteName: string, rating: number, text: string, lat: number, lng: number) {
        return await addDoc(collection(db, "reviews"), {
            userId,
            siteName,
            rating,
            text,
            lat,
            lng,
            createdAt: Timestamp.now()
        });
    }

    static async getNewsAndEvents(coords: string) {
        const prompt = `Busca NOTICIAS y EVENTOS REALES para familias en ${coords}. Devuelve JSON: {news: [], events: []}`;
        return await KidoaAI.callGemini(prompt, true);
    }
}
