import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import { KidoaAI } from "../../services/ai_service";

export default function SafePage({ lastKnownCoords }: { lastKnownCoords: string }) {
    const { playSound } = useAppContext();
    const [safetyLocations, setSafetyLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSafety() {
            setLoading(true);
            try {
                const res = await KidoaAI.getNearbySafety(lastKnownCoords || "41.6520, -4.7286");
                if (res && Array.isArray(res)) {
                    setSafetyLocations(res);
                }
            } catch (e) {
                console.error("Error loading safety info:", e);
            } finally {
                setLoading(false);
            }
        }
        loadSafety();
    }, [lastKnownCoords]);

    const [sosActive, setSosActive] = useState(false);

    return (
        <div className="p-8 pb-32 h-full overflow-y-auto bg-amber-50/50">
            <AnimatePresence>
                {sosActive && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[5000] bg-red-600 flex flex-col items-center justify-center p-8 text-white text-center"
                    >
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}
                            className="text-9xl mb-8"
                        >
                            🚨
                        </motion.div>
                        <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter">ALERTA SOS ACTIVA</h2>
                        <p className="text-xl font-bold mb-12 opacity-90">Tu tribu ha sido notificada. Mantén la calma, la ayuda está en camino.</p>
                        <button 
                            onClick={() => { playSound('click'); setSosActive(false); }}
                            className="bg-white text-red-600 font-black px-12 py-5 rounded-3xl text-xl shadow-2xl active:scale-95 transition-all"
                        >
                            CANCELAR ALERTA
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="mb-10">
                <motion.h1 
                    initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="text-4xl font-black text-red-900 tracking-tighter text-center"
                >
                    SAFE ZONE
                </motion.h1>
                <div className="flex justify-center mt-2">
                    <span className="text-[10px] bg-red-100 text-red-600 px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-sm">Protección Kidoa 🛡️</span>
                </div>
            </header>
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[48px] p-10 shadow-2xl shadow-red-500/5 mb-10 border border-red-50 relative overflow-hidden text-center"
            >
                <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                
                <div className="w-28 h-28 bg-gradient-to-br from-red-50 to-white rounded-[32px] flex items-center justify-center text-5xl mb-8 mx-auto shadow-inner border border-red-100/50">
                    🛡️
                </div>
                
                <h2 className="text-2xl font-black text-slate-900 mb-3">Botón SOS Familiar</h2>
                <p className="text-slate-500 text-sm mb-10 leading-relaxed max-w-[240px] mx-auto font-medium">
                    Avisa instantáneamente a tu tribu en caso de emergencia.
                </p>
                
                <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { playSound('error'); setSosActive(true); }}
                    className="w-full py-6 bg-red-600 text-white rounded-[32px] font-black text-xl shadow-[0_20px_40px_rgba(239,68,68,0.3)] flex justify-center items-center gap-4 relative overflow-hidden border-b-8 border-red-800 active:border-b-0 active:translate-y-1 transition-all"
                >
                    <span className="relative z-10 uppercase tracking-tighter">Activar Alerta SOS</span>
                    <motion.div 
                        animate={{ x: ["-200%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 bg-white/20 skew-x-12"
                    />
                </motion.button>
            </motion.div>

            <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">Ayuda Cercana</h3>
                <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md">IA LIVE</span>
            </div>

            <div className="space-y-4">
                {loading ? (
                    [1, 2].map(i => (
                        <div key={i} className="bg-white rounded-[32px] p-6 animate-pulse flex items-center gap-5">
                            <div className="w-16 h-16 bg-slate-100 rounded-[24px]"></div>
                            <div className="flex-1 space-y-3">
                                <div className="h-5 bg-slate-100 rounded-lg w-3/4"></div>
                                <div className="h-4 bg-slate-100 rounded-md w-1/2"></div>
                            </div>
                        </div>
                    ))
                ) : safetyLocations.map((loc, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-50 flex items-center gap-5 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group"
                        onClick={() => playSound('click')}
                    >
                        <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-3xl border transition-colors ${loc.type === 'hospital' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-100'}`}>
                            {loc.type === 'hospital' ? '🏥' : '👮'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-black text-slate-900 truncate text-lg leading-tight">{loc.name}</h3>
                            <p className="text-xs text-slate-400 font-bold truncate mt-1 uppercase tracking-tighter">{loc.address} • {loc.distance || '0.5 KM'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`font-black text-[9px] px-3 py-1.5 rounded-full uppercase tracking-widest ${loc.status === 'Abierto 24h' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                                {loc.status}
                            </span>
                            <span className="text-blue-500 text-lg group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
