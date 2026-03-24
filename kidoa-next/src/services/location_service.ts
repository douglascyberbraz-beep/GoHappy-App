"use client";

import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export class LocationService {
    static async getCurrentPosition() {
        if (Capacitor.isNativePlatform()) {
            try {
                const coordinates = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true
                });
                return `${coordinates.coords.latitude}, ${coordinates.coords.longitude}`;
            } catch (e) {
                console.warn("Native GPS failed, falling back to browser.", e);
            }
        }
        
        // Browser fallback
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(`${pos.coords.latitude}, ${pos.coords.longitude}`),
                () => resolve("41.6520, -4.7286"), // Default Valladolid
                { enableHighAccuracy: true }
            );
        });
    }

    static async watchPosition(callback: (coords: string) => void): Promise<string | number> {
        if (Capacitor.isNativePlatform()) {
            return await Geolocation.watchPosition({
                enableHighAccuracy: true,
                timeout: 5000
            }, (pos) => {
                if (pos) {
                    callback(`${pos.coords.latitude}, ${pos.coords.longitude}`);
                }
            });
        }
        
        // Browser watch
        return navigator.geolocation.watchPosition(
            (pos) => callback(`${pos.coords.latitude}, ${pos.coords.longitude}`),
            null,
            { enableHighAccuracy: true }
        );
    }

    static async clearWatch(id: string | number) {
        if (Capacitor.isNativePlatform()) {
            await Geolocation.clearWatch({ id: id as string });
        } else {
            navigator.geolocation.clearWatch(id as number);
        }
    }
}
