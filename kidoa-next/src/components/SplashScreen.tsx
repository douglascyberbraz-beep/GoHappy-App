"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 2, ease: "easeInOut" }}
            onAnimationComplete={onComplete}
            className="fixed inset-0 z-[2000] bg-white flex flex-col items-center justify-center p-8"
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                    duration: 0.8, 
                    type: "spring",
                    stiffness: 100 
                }}
                className="relative w-64 h-64 mb-6"
            >
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-30 animate-pulse" />
                <img 
                    src="/assets/logo.png" 
                    alt="Kidoa Logo" 
                    className="w-full h-full object-contain relative z-10 brightness-105 contrast-105"
                    style={{ mixBlendMode: 'multiply' }}
                />
            </motion.div>
            
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
            >
                <h1 className="text-4xl font-black text-blue-900 tracking-widest mb-2">KIDOA</h1>
                <p className="text-slate-400 font-medium italic">Explora, juega y crece en familia</p>
            </motion.div>

            <div className="absolute bottom-16 flex gap-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
        </motion.div>
    );
}
