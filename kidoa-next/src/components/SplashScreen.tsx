"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "../context/AppContext";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const { playSound } = useAppContext();

    useEffect(() => {
        // Play start sound when splash appears
        playSound('start');
    }, []);

    return (
        <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 2.5, ease: "easeInOut" }}
            onAnimationComplete={onComplete}
            className="fixed inset-0 z-[5000] bg-white flex flex-col items-center justify-center p-8"
        >
            <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ 
                    duration: 1.2, 
                    type: "spring",
                    stiffness: 80,
                    damping: 15
                }}
                className="relative w-64 h-64 mb-8"
            >
                <div className="absolute inset-0 bg-blue-200 rounded-full blur-[80px] opacity-40 animate-pulse" />
                <motion.img 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    src="/assets/logo.png" 
                    alt="Kidoa Logo" 
                    className="w-full h-full object-contain relative z-10 drop-shadow-2xl"
                />
            </motion.div>
            
            <div className="text-center overflow-hidden">
                <motion.h1 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
                    className="text-5xl font-black text-blue-900 tracking-tighter mb-2"
                >
                    KIDOA
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 1 }}
                    className="text-blue-400/80 font-bold uppercase tracking-[0.3em] text-[10px]"
                >
                    Explora • Juega • Crece
                </motion.p>
            </div>

            <div className="absolute bottom-20 flex gap-2">
                {[0, 0.2, 0.4].map((delay, i) => (
                    <motion.div 
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay }}
                        className="w-2 h-2 bg-blue-500 rounded-full" 
                    />
                ))}
            </div>
        </motion.div>
    );
}
