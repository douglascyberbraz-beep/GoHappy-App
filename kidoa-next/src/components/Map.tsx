"use client";

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function KidoaMap({ lastKnownCoords }: { lastKnownCoords: string }) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        const [lat, lng] = lastKnownCoords.split(',').map(Number);

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [lng, lat],
            zoom: 16,
            pitch: 0,
            antialias: true
        });

        map.current.on('load', () => {
            if (!map.current) return;
            
            // Custom Styling (Mirroring vanilla JS but in React)
            map.current.setPaintProperty('water', 'fill-color', '#4CC9F0');
            map.current.setPaintProperty('land', 'fill-color', '#F8FAFC');
        });

        return () => {
            map.current?.remove();
        };
    }, [lastKnownCoords]);

    return (
        <div className="relative w-full h-full overflow-hidden">
            <div ref={mapContainer} className="w-full h-full" />
            
            {/* Overlay UI */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[90%] z-10">
                <div className="flex items-center bg-white/90 backdrop-blur-xl rounded-full px-5 py-3 shadow-premium border border-white/20">
                    <span className="mr-3 text-lg">✨</span>
                    <input 
                        type="text" 
                        placeholder="Explora con KIDOA IA..." 
                        className="bg-transparent border-none outline-none flex-1 text-sm text-slate-900 font-semibold"
                    />
                </div>
            </div>
        </div>
    );
}
