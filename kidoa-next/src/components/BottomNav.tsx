"use client";

import { motion } from "framer-motion";

const navItems = [
    { id: "map", label: "Mapa", icon: "🗺️" },
    { id: "today", label: "Today", icon: "📍" },
    { id: "tribu", label: "Tribu", icon: "🤝" },
    { id: "safe", label: "Safe", icon: "🛡️" },
    { id: "profile", label: "Perfil", icon: "👤" },
];

export default function BottomNav({ activePage, onNavigate }: { activePage: string, onNavigate: (id: string) => void }) {
    return (
        <div className="fixed bottom-[25px] left-1/2 -translate-x-1/2 w-[92%] max-w-[500px] h-[75px] bg-white/75 backdrop-blur-2xl rounded-[40px] flex justify-around items-center px-4 shadow-2xl z-[1500] border border-white/30">
            {navItems.map((item) => (
                <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onNavigate(item.id)}
                    className={`relative flex flex-col items-center justify-center transition-colors duration-300 ${item.id === "map" ? "-mt-10" : ""} ${activePage === item.id ? "text-blue-900" : "text-slate-400"}`}
                >
                    {item.id === "map" ? (
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-transform ${activePage === "map" ? "bg-blue-600 shadow-blue-400/50 -translate-y-2" : "bg-gradient-to-br from-blue-400 to-blue-900"}`}>
                            <span className="text-2xl">🗺️</span>
                        </div>
                    ) : (
                        <>
                            <span className="text-xl mb-1">{item.icon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                        </>
                    )}
                    
                    {activePage === item.id && item.id !== "map" && (
                        <motion.div 
                            layoutId="activeTab"
                            className="absolute -bottom-2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(76,201,240,1)]"
                        />
                    )}
                </motion.button>
            ))}
        </div>
    );
}
