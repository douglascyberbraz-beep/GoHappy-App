"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import SplashScreen from "@/components/SplashScreen";
import { auth } from "@/services/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { LocationService } from "@/services/location_service";

// Lazy-loaded or conditional imports for pages would go here
// For now, we'll use placeholder components to establish the structure

export default function AppMain() {
    const [currentPage, setCurrentPage] = useState("map");
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showSplash, setShowSplash] = useState(true);
    const [coords, setCoords] = useState("41.6520, -4.7286");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });

        // Initialize Native Location Watcher
        const watchId = LocationService.watchPosition((newCoords) => {
            setCoords(newCoords);
        });

        return () => {
            unsubscribe();
            // Cleanup watch if possible (Geolocation plugin returns a callback or ID)
        };
    }, []);

    const pageVariants = {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.02 }
    };

    if (loading) return null; // Wait for Firebase

    return (
        <main className="relative h-screen w-full max-w-[600px] mx-auto bg-white overflow-hidden shadow-2xl">
            <AnimatePresence>
                {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
            </AnimatePresence>
            
            <div className={`h-full w-full pb-[110px] transition-all duration-700 ${showSplash ? 'blur-lg scale-95' : 'blur-0 scale-100'}`}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentPage}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.4, ease: "circOut" }}
                        className="h-full w-full"
                    >
                        {currentPage === "map" && <MapPage lastKnownCoords={coords} />}
                        {currentPage === "today" && <TodayPage lastKnownCoords={coords} />}
                        {currentPage === "tribu" && <PlaceholderPage title="La Tribu" icon="🤝" />}
                        {currentPage === "safe" && <PlaceholderPage title="Safe Zone" icon="🛡️" />}
                        {currentPage === "profile" && <PlaceholderPage title="Mi Perfil" icon="👤" />}
                    </motion.div>
                </AnimatePresence>
            </div>

            <BottomNav activePage={currentPage} onNavigate={setCurrentPage} />
        </main>
    );
}

// Sub-components (to be moved to separate files later)
function MapPage({ lastKnownCoords }: { lastKnownCoords: string }) {
    return (
        <div className="h-full w-full bg-slate-100 flex items-center justify-center relative">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[90%] bg-white rounded-full p-4 shadow-xl flex items-center gap-3 z-20">
                <span className="text-xl">✨</span>
                <input type="text" placeholder="Pregunta a Gemini..." className="bg-transparent border-none outline-none flex-1 text-sm font-medium" />
            </div>
            <div className="w-full h-full relative">
                 <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-slate-400 z-0">
                    Sincronizando Mapas 3D...
                 </div>
                 {/* El componente Map se encargará del renderizado pesado */}
            </div>
        </div>
    );
}

function TodayPage({ lastKnownCoords }: { lastKnownCoords: string }) {
    return (
        <div className="p-8 pb-32">
            <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">TODAY</h1>
                <p className="text-slate-500 mt-1">✨ Planes personalizados para hoy</p>
            </header>
            
            <div className="space-y-6">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white rounded-[32px] p-6 shadow-medium border border-blue-50">
                        <div className="flex justify-between mb-4">
                            <span className="bg-blue-50 text-blue-400 text-[10px] font-bold px-3 py-1 rounded-full">Familiar</span>
                            <span className="text-emerald-500 font-bold text-[10px] uppercase">Gratis</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-blue-900 mb-2">Buscando planes reales...</h3>
                        <p className="text-slate-600 text-sm leading-relaxed mb-4">Sincronizando con Kidoa IA para encontrar los mejores lugares cerca de ti.</p>
                        <div className="w-full h-10 bg-slate-50 rounded-2xl animate-pulse"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PlaceholderPage({ title, icon }: { title: string, icon: string }) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center">
            <span className="text-6xl mb-4">{icon}</span>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">{title}</h2>
            <p className="text-slate-500">Esta sección está siendo migrada a la versión Premium.</p>
        </div>
    );
}
