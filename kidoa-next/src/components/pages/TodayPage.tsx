"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { KidoaAI } from "../../services/ai_service";
import { useAppContext } from "../../context/AppContext";

export default function TodayPage({ 
    lastKnownCoords, 
    onNavigateToMap 
}: { 
    lastKnownCoords: string,
    onNavigateToMap: (coords: string, details?: any) => void 
}) {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<any[]>([]);
    const [extraInfo, setExtraInfo] = useState<any>(null);
    const [loadingExtra, setLoadingExtra] = useState(true);
    const { playSound } = useAppContext();

    useEffect(() => {
        async function loadAIPlanes() {
            setLoading(true);
            try {
                const prefs = { adults: 2, kids: 1, ages: "5", environment: "parques y aire libre", budget: "económico" };
                const res = await KidoaAI.getTodayActivities(lastKnownCoords || "41.6520, -4.7286", prefs);
                if (res && Array.isArray(res)) setEvents(res);
                else if (res && res.plans) setEvents(res.plans);
            } catch (e) {
                console.error("Error loading AI plans:", e);
            } finally {
                setLoading(false);
            }
        }
        
        async function loadExtra() {
            setLoadingExtra(true);
            try {
                const res = await KidoaAI.getNewsAndScholarships();
                setExtraInfo(res);
            } catch (e) {
                console.error("Error loading news/scholarships:", e);
            } finally {
                setLoadingExtra(false);
            }
        }

        loadAIPlanes();
        loadExtra();
    }, [lastKnownCoords]);

    return (
        <div className="p-8 pb-32 h-full overflow-y-auto bg-slate-50">
            <header className="mb-10">
                <motion.h1 
                    initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    className="text-4xl font-black text-blue-950 tracking-tighter"
                >
                    TODAY
                </motion.h1>
                <p className="text-slate-400 mt-1 font-bold text-xs uppercase tracking-widest">✨ Magia personalizada para hoy</p>
            </header>
            
            {/* Activities Section */}
            <div className="space-y-8 mb-16">
                {loading ? (
                    [1, 2].map(i => (
                        <div key={i} className="bg-white rounded-[40px] p-8 shadow-xl border border-slate-50 animate-pulse">
                            <div className="h-48 bg-slate-100 rounded-[32px] mb-6"></div>
                            <div className="h-8 bg-slate-100 rounded-xl w-3/4 mb-3"></div>
                            <div className="h-4 bg-slate-100 rounded-lg w-1/2"></div>
                        </div>
                    ))
                ) : events.map((ev: any, idx: number) => (
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }}
                        key={idx} className="bg-white rounded-[48px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 group transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <div className="relative h-64 bg-slate-200">
                            <img src={ev.imageUrl || `https://images.unsplash.com/photo-1518173946687-a4c8a9833d8e?q=80&w=600&h=400&fit=crop`} className="w-full h-full object-cover" alt={ev.title} />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                            <div className="absolute bottom-8 left-8 right-8">
                                <span className="bg-blue-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full w-fit mb-3 block shadow-lg shadow-blue-500/30 uppercase tracking-widest">{ev.price || "Gratis"}</span>
                                <h3 className="text-3xl font-black text-white leading-none">{ev.title}</h3>
                            </div>
                        </div>
                        <div className="p-8">
                            <p className="text-slate-500 font-medium text-sm mb-6 leading-relaxed">{ev.summary}</p>
                            <div className="bg-blue-50/50 backdrop-blur-sm rounded-3xl p-5 mb-6 border border-blue-100/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Kidoa Insight 💡</span>
                                <p className="text-xs text-blue-900 font-bold mt-1">{ev.expertTip}</p>
                            </div>
                            <button 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[24px] font-black text-lg transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-3" 
                                onClick={() => {
                                    playSound('success');
                                    onNavigateToMap(`${ev.lat},${ev.lng}`, ev);
                                }}
                            >
                                Vamos Allá 🚀
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* News and Scholarships Section */}
            <header className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Ecosistema Kidoa 🌍</h2>
            </header>

            <div className="grid grid-cols-1 gap-6">
                {loadingExtra ? (
                    <div className="h-40 bg-white rounded-[40px] animate-pulse"></div>
                ) : extraInfo && (
                    <>
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="bg-indigo-600 rounded-[40px] p-8 text-white shadow-2xl shadow-indigo-600/20 relative overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-4 py-2 rounded-full">Actualidad</span>
                            <h3 className="text-xl font-black mt-4 leading-tight">{extraInfo.news.title}</h3>
                            <p className="text-sm text-indigo-100 mt-3 opacity-80 leading-relaxed">{extraInfo.news.summary}</p>
                            <a 
                                onClick={() => playSound('click')}
                                href={extraInfo.news.url} target="_blank" className="text-[10px] font-black underline mt-6 block opacity-60 hover:opacity-100 transition-opacity"
                            >
                                Fuente: {extraInfo.news.source} ↗
                            </a>
                        </motion.div>

                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl relative overflow-hidden"
                        >
                            <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mb-16 -mr-16"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">Beca / Ayuda</span>
                            <h3 className="text-xl font-black mt-4 text-slate-900 leading-tight">{extraInfo.scholarship.title}</h3>
                            <p className="text-sm text-slate-500 mt-3 leading-relaxed">{extraInfo.scholarship.summary}</p>
                            <div className="flex justify-between items-center mt-8">
                                <span className="text-xs font-black text-red-500 bg-red-50 px-3 py-1 rounded-full">Cierra: {extraInfo.scholarship.deadline}</span>
                                <button 
                                    onClick={() => playSound('click')}
                                    className="text-sm font-black text-emerald-600 underline hover:text-emerald-800 transition-colors"
                                >
                                    Ver Detalles
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
}
