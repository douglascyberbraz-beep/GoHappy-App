"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/BottomNav";
import SplashScreen from "../components/SplashScreen";
import AuthModal from "../components/AuthModal";
import { useAppContext } from "../context/AppContext";
import { LocationService } from "../services/location_service";
import MapPage from "../components/Map";

import TodayPage from "./../components/pages/TodayPage";
import ProfilePage from "./../components/pages/ProfilePage";
import TribuPage from "./../components/pages/TribuPage";
import SafePage from "./../components/pages/SafePage";

export default function AppMain() {
    const [currentPage, setCurrentPage] = useState("map");
    const [showSplash, setShowSplash] = useState(true);
    const [coords, setCoords] = useState("41.6520, -4.7286");
    const { user, loading } = useAppContext();

    useEffect(() => {
        // Nuclear cleanup of old Service Workers and Caches from the previous version
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    registration.unregister();
                }
            });
            // Clear old caches if any
            if ('caches' in window) {
                caches.keys().then(names => {
                    for (let name of names) caches.delete(name);
                });
            }
        }

        let watchId: string | number;
        
        const startWatching = async () => {
            watchId = await LocationService.watchPosition((newCoords) => {
                setCoords(newCoords);
            });
        };
        
        startWatching();
        
        return () => {
            if (watchId !== undefined) LocationService.clearWatch(watchId);
        };
    }, []);

    const pageVariants = {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.02 }
    };

    const [targetDetails, setTargetDetails] = useState<any>(null);
    const [targetCoords, setTargetCoords] = useState<string | null>(null);

    if (loading) return null;

    const navigateToMap = (coords: string, details?: any) => {
        setTargetDetails(details);
        setTargetCoords(coords);
        setCoords(coords);
        setCurrentPage("map");
    };

    return (
        <main className="fixed inset-0 bg-slate-100 overflow-hidden font-sans text-slate-900 select-none">
            <AnimatePresence mode="wait">
                {showSplash ? (
                    <SplashScreen onComplete={() => setShowSplash(false)} />
                ) : (
                    <motion.div 
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full relative"
                    >
                        <header className="absolute top-0 left-0 right-0 px-8 py-6 flex justify-between items-end z-[2000] pointer-events-none">
                            <div className="flex items-center gap-3 pointer-events-auto">
                                <motion.div 
                                    whileTap={{ scale: 0.9 }}
                                    className="w-12 h-12 bg-blue-600 rounded-[18px] flex items-center justify-center text-2xl shadow-xl shadow-blue-500/40 border border-blue-400/50 text-white"
                                >
                                    🚀
                                </motion.div>
                                <h1 className="text-2xl font-black text-blue-900 tracking-tighter drop-shadow-sm">KIDOA</h1>
                            </div>
                            <div className="flex gap-2 pointer-events-auto">
                                <motion.div 
                                    whileHover={{ y: -2 }}
                                    className="bg-white/70 backdrop-blur-xl px-6 py-2.5 rounded-[20px] shadow-lg border border-white/50 flex items-center gap-3"
                                >
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Lvl {user?.level || 1}</span>
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981] animate-pulse" />
                                </motion.div>
                            </div>
                        </header>

                        <div className="h-full pt-24 overflow-hidden">
                            {currentPage === "map" && <MapPage lastKnownCoords={coords} targetCoords={targetCoords} targetDetails={targetDetails} />}
                            {currentPage === "today" && <TodayPage lastKnownCoords={coords} onNavigateToMap={navigateToMap} />}
                            {currentPage === "tribu" && <TribuPage />}
                            {currentPage === "safe" && <SafePage lastKnownCoords={coords} />}
                            {currentPage === "profile" && <ProfilePage />}
                        </div>

                        <BottomNav activePage={currentPage} onNavigate={(id) => setCurrentPage(id)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
