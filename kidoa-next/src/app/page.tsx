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

        const watchId = LocationService.watchPosition((newCoords) => {
            setCoords(newCoords);
        });
        return () => {};
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
                        className="h-full pt-4"
                    >
                        <header className="px-8 pb-4 flex justify-between items-center bg-white/50 backdrop-blur-md">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">🚀</div>
                                <h1 className="text-2xl font-black text-blue-900 tracking-tighter">KIDOA</h1>
                            </div>
                            <div className="flex gap-2">
                                <div className="bg-white/80 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Nivel {user?.level || 1}</span>
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                </div>
                            </div>
                        </header>

                        <div className="h-full">
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
