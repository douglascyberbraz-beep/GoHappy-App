"use client";

import { motion } from "framer-motion";
import { useAppContext } from "../context/AppContext";

const navItems = [
    { id: "map", label: "Mapa", icon: "🗺️" },
    { id: "today", label: "Today", icon: "📍" },
    { id: "tribu", label: "Tribu", icon: "🤝" },
    { id: "safe", label: "Safe", icon: "🛡️" },
    { id: "profile", label: "Perfil", icon: "👤" },
];

export default function BottomNav({ activePage, onNavigate }: { activePage: string, onNavigate: (id: string) => void }) {
    const { playSound } = useAppContext();

    return (
        <div className="fixed bottom-[30px] left-1/2 -translate-x-1/2 w-[94%] max-w-[500px] h-[86px] bg-white/60 backdrop-blur-3xl rounded-[40px] flex justify-around items-center px-6 shadow-[0_30px_60px_rgba(0,0,0,0.12)] z-[3000] border border-white/40">
            {navItems.map((item) => (
                <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => {
                        playSound('click');
                        onNavigate(item.id);
                    }}
                    className={`relative flex flex-col items-center justify-center transition-all duration-500 ${item.id === "map" ? "-mt-12" : ""} ${activePage === item.id ? "text-blue-900" : "text-slate-400"}`}
                >
                    {item.id === "map" ? (
                        <div className={`w-18 h-18 rounded-[28px] flex items-center justify-center border-4 border-white shadow-2xl transition-all duration-500 ${activePage === "map" ? "bg-blue-600 shadow-blue-500/50 scale-110 -translate-y-2" : "bg-gradient-to-br from-blue-500 to-indigo-900"}`}>
                            <span className="text-3xl filter drop-shadow-md">🗺️</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <motion.span 
                                animate={activePage === item.id ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
                                className="text-2xl mb-1.5"
                            >
                                {item.icon}
                            </motion.span>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-opacity duration-300 ${activePage === item.id ? "opacity-100" : "opacity-40"}`}>{item.label}</span>
                        </div>
                    )}
                    
                    {activePage === item.id && item.id !== "map" && (
                        <motion.div 
                            layoutId="activeTab"
                            transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                            className="absolute -bottom-3 w-6 h-1 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                        />
                    )}
                </motion.button>
            ))}
        </div>
    );
}
