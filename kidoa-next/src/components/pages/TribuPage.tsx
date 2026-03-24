"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DataService } from "../../services/data_service";
import { KidoaAI } from "../../services/ai_service";
import { useAppContext } from "../../context/AppContext";

export default function TribuPage() {
    const { user, playSound } = useAppContext();
    const [rankings, setRankings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<any[]>([
        { role: 'ai', text: '¡Hola! Soy parte de la Tribu Kidoa. ¿En qué podemos ayudarte hoy?' }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadRankings() {
            try {
                const data = await DataService.getRankings();
                setRankings(data);
            } catch (e) {
                console.error("Error loading rankings:", e);
            } finally {
                setLoading(false);
            }
        }
        loadRankings();
    }, []);

    useEffect(() => {
        if (showChat) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, showChat]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;
        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsTyping(true);
        playSound('click');

        try {
            const res = await KidoaAI.tribeChat(userMsg, user || { nickname: 'Explorador', level: 1 });
            if (res && res.message) {
                setMessages(prev => [...prev, { 
                    role: 'ai', 
                    text: res.message, 
                    persona: res.persona, 
                    avatar: res.avatar 
                }]);
            } else {
                const fallback = typeof res === 'string' ? res : 'Vaya, parece que la Tribu está un poco ocupada ahora. Inténtalo de nuevo.';
                setMessages(prev => [...prev, { role: 'ai', text: fallback }]);
            }
            playSound('success');
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Vaya, parece que la Tribu está un poco ocupada ahora. Inténtalo de nuevo.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="p-8 pb-32 h-full overflow-y-auto bg-slate-50">
            <header className="mb-10 text-center">
                <motion.h1 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-black text-blue-950 tracking-tighter"
                >
                    LA TRIBU
                </motion.h1>
                <p className="text-slate-400 mt-1 font-bold text-xs uppercase tracking-widest">Comparte y crece con tu comunidad</p>
            </header>
            
            <div className="bg-white rounded-[48px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] mb-8 border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-xl font-black text-slate-900 mb-6 flex justify-between items-center">
                    <span>🏆 Ranking de Honor</span>
                    <span className="text-[10px] text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full font-black uppercase tracking-widest">Global</span>
                </h3>
                
                <div className="space-y-4">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl animate-pulse">
                                <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
                                <div className="flex-1 h-5 bg-slate-200 rounded-lg"></div>
                            </div>
                        ))
                    ) : rankings.map((u, idx) => (
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }} 
                            animate={{ x: 0, opacity: 1 }} 
                            transition={{ delay: idx * 0.1 }}
                            key={u.id || idx} 
                            className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-3xl hover:bg-white transition-all border border-transparent hover:border-slate-100 hover:shadow-lg"
                        >
                            <span className={`font-black text-2xl w-8 text-center ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-600' : 'text-slate-200'}`}>
                                {idx + 1}
                            </span>
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-2xl border border-slate-100">{u.avatar || "👟"}</div>
                            <div className="flex-1 font-black text-slate-800 text-lg truncate">{u.nickname}</div>
                            <div className="flex flex-col items-end">
                                <span className="font-black text-blue-600 text-sm">⭐ {u.points}</span>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none mt-1">Nivel {u.level || 1}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <button 
                onClick={() => { setShowChat(true); playSound('click'); }}
                className="w-full bg-slate-900 hover:bg-blue-900 text-white font-black py-6 rounded-[32px] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all text-xl flex items-center justify-center gap-4"
            >
                <span className="text-2xl">🤝</span> Unirse a la Tribu
            </button>

            {/* Chat Modal */}
            <AnimatePresence>
                {showChat && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[5000] flex items-end sm:items-center justify-center p-4 sm:p-0"
                    >
                        <motion.div 
                            initial={{ y: "100%" }} 
                            animate={{ y: 0 }} 
                            exit={{ y: "100%" }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="bg-white/95 backdrop-blur-3xl w-full max-w-2xl h-[90vh] sm:h-[700px] rounded-t-[56px] sm:rounded-[56px] shadow-[0_50px_100px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/20"
                        >
                            <header className="p-8 pb-6 border-b border-slate-100 flex justify-between items-center bg-white/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center text-2xl shadow-xl shadow-blue-500/20 text-white">
                                        🤝
                                    </div>
                                    <div>
                                        <h2 className="font-black text-2xl text-slate-900 leading-none">Chat de la Tribu</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">IA Conectada • En línea</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setShowChat(false); playSound('click'); }} 
                                    className="w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-3xl text-slate-900 text-xl transition-colors"
                                >
                                    ✕
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                                {messages.map((m, i) => (
                                    <motion.div 
                                        initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }} 
                                        animate={{ opacity: 1, x: 0 }}
                                        key={i} 
                                        className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                                    >
                                        {m.role === 'ai' && m.persona && (
                                            <div className="flex items-center gap-2 mb-2 ml-4">
                                                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm text-sm border border-slate-100">{m.avatar || '🤖'}</div>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.persona}</span>
                                            </div>
                                        )}
                                        <div className={`max-w-[85%] p-5 rounded-[32px] text-sm font-bold shadow-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-blue-600/20' : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'}`}>
                                            {m.text}
                                        </div>
                                    </motion.div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white p-5 rounded-[32px] rounded-bl-none border border-slate-100 shadow-sm flex gap-1.5">
                                            {[0, 0.2, 0.4].map(delay => (
                                                <motion.div 
                                                    key={delay} 
                                                    animate={{ y: [0, -5, 0] }} 
                                                    transition={{ duration: 0.6, repeat: Infinity, delay }} 
                                                    className="w-2 h-2 bg-slate-300 rounded-full" 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-8 bg-white/80 backdrop-blur-md border-t border-slate-100">
                                <div className="flex gap-4">
                                    <input 
                                        type="text" 
                                        value={input} 
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Escribe a la tribu..."
                                        className="flex-1 bg-slate-100 border-none rounded-[28px] px-8 py-5 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 transition-all"
                                    />
                                    <motion.button 
                                        whileTap={{ scale: 0.9 }}
                                        onClick={handleSend}
                                        className="w-16 h-16 bg-blue-600 text-white rounded-[28px] flex items-center justify-center shadow-xl shadow-blue-600/30 disabled:opacity-50 transition-all"
                                        disabled={isTyping || !input.trim()}
                                    >
                                        <span className="text-2xl">✈️</span>
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
