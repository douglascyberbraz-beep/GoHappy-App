"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useAppContext } from '../../context/AppContext';
import { AuthService } from '../../services/auth_service';
import AuthModal from "../AuthModal";

export default function ProfilePage() {
    const { user, playSound } = useAppContext();
    const [showAuth, setShowAuth] = useState(false);
    
    if (!user) {
        return (
            <div className="p-8 h-[70vh] flex flex-col items-center justify-center bg-slate-50 text-center">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-40 h-40 bg-blue-100 rounded-[56px] flex items-center justify-center text-7xl mb-10 shadow-inner tracking-tighter"
                >
                    💤
                </motion.div>
                <h2 className="text-3xl font-black text-blue-950 mb-4">Tu perfil está durmiendo</h2>
                <p className="text-slate-500 font-bold mb-10 px-6 leading-relaxed">Identifícate para desbloquear insignias, niveles y planes mágicos.</p>
                <button 
                    onClick={() => { playSound('click'); setShowAuth(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black px-12 py-5 rounded-[24px] shadow-2xl shadow-blue-600/30 active:scale-95 transition-all text-lg"
                >
                    Entrar en Kidoa ✨
                </button>
                {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
            </div>
        );
    }

    const progress = (user.points % 100);

    return (
        <div className="p-8 pb-32 h-full overflow-y-auto bg-slate-50">
            <header className="mb-10 flex justify-between items-center">
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                    <h1 className="text-4xl font-black text-blue-950 tracking-tighter">MI PERFIL</h1>
                    <p className="text-slate-400 mt-1 font-bold text-xs uppercase tracking-widest">{user.nickname} • Explorador Avanzado</p>
                </motion.div>
                <button 
                    onClick={() => { playSound('click'); AuthService.logout(); }}
                    className="w-14 h-14 bg-white hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center transition-all active:scale-90 text-2xl"
                >
                    🚪
                </button>
            </header>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[56px] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.04)] mb-10 relative overflow-hidden border border-slate-100"
            >
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex flex-col items-center gap-6 relative z-10">
                    <div className="relative">
                        <motion.div 
                            whileHover={{ scale: 1.05 }}
                            className="w-32 h-32 bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-6xl shadow-2xl shadow-blue-500/30 border-8 border-white p-2"
                        >
                            🧑‍🚀
                        </motion.div>
                        <motion.div 
                            animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -bottom-2 -right-2 bg-yellow-400 text-white px-4 py-2 rounded-2xl border-4 border-white flex items-center justify-center font-black text-[10px] shadow-lg tracking-widest uppercase"
                        >
                            Nivel {user.level || 1}
                        </motion.div>
                    </div>
                    
                    <div className="text-center">
                        <h2 className="text-3xl font-black text-slate-900 leading-none mb-2">{user.nickname}</h2>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">{user.email || "Invitado"}</span>
                    </div>

                    <div className="w-full mt-4">
                        <div className="flex justify-between items-end mb-3">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Experiencia Kidoa</span>
                            <span className="text-[10px] font-black text-blue-900 bg-blue-50 px-2 py-1 rounded-md">{user.points} Puntos</span>
                        </div>
                        <div className="w-full bg-slate-100 h-6 rounded-3xl overflow-hidden p-1 border border-slate-50">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

            <h3 className="text-[10px] font-black text-slate-400 mb-8 px-2 uppercase tracking-[0.4em] text-center">Coleccionables & Inventario</h3>
            <div className="grid grid-cols-2 gap-6">
                {[
                    { icon: "🏅", title: "Semilla Kidoa", active: true },
                    { icon: "🏔️", title: "Guía de Campo", active: true },
                    { icon: "📱", title: "IA Explorer", active: false },
                    { icon: "⛺", title: "Nómada Pro", active: false },
                ].map((item, i) => (
                    <motion.div 
                        key={i}
                        whileHover={item.active ? { y: -5, scale: 1.02 } : {}}
                        className={`p-8 rounded-[40px] border flex flex-col items-center gap-3 transition-all relative overflow-hidden ${item.active ? 'bg-white border-slate-100 shadow-sm' : 'bg-slate-50/50 border-slate-100 opacity-40 grayscale'}`}
                    >
                        {!item.active && <div className="absolute inset-0 bg-slate-100/10 flex items-center justify-center text-slate-300">🔒</div>}
                        <span className="text-5xl mb-1 drop-shadow-sm">{item.icon}</span>
                        <span className="font-black text-[9px] uppercase tracking-widest text-center text-slate-800">{item.title}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
