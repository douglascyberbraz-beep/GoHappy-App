"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  nickname: string;
  points: number;
  level: string;
  isGuest?: boolean;
}

interface AppContextProps {
  user: UserProfile | null;
  loading: boolean;
  playSound: (type: 'click' | 'start' | 'success' | 'boop' | 'error') => void;
}

const AppContext = createContext<AppContextProps>({
  user: null,
  loading: true,
  playSound: () => {},
});

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [audioPool, setAudioPool] = useState<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    const sounds = {
      click: 'https://cdn.pixabay.com/audio/2022/03/15/audio_73268c2f16.mp3',
      start: 'https://cdn.pixabay.com/audio/2021/08/04/audio_985536554b.mp3',
      success: 'https://cdn.pixabay.com/audio/2022/03/24/audio_349d7936a7.mp3',
      boop: 'https://cdn.pixabay.com/audio/2022/03/10/audio_f69168b449.mp3',
      error: 'https://cdn.pixabay.com/audio/2022/01/18/audio_606f71d5b4.mp3'
    };
    
    const pool: Record<string, HTMLAudioElement> = {};
    Object.entries(sounds).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = 0.15;
      pool[key] = audio;
    });
    setAudioPool(pool);
  }, []);

  const playSound = (type: 'click' | 'start' | 'success' | 'boop' | 'error') => {
    try {
      const audio = audioPool[type];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch(e) {}
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Subscribe to user document to get live points updates
        const unsubDoc = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
             const data = docSnap.data();
             setUser({
               uid: firebaseUser.uid,
               email: data.email || "Invitado",
               nickname: data.nickname || "Explorador",
               points: data.points || 0,
               level: data.level || "Bronce",
               isGuest: firebaseUser.isAnonymous
             });
          } else {
             // Fallback if doc doesn't exist yet
             setUser({
               uid: firebaseUser.uid,
               email: firebaseUser.email || "Invitado",
               nickname: firebaseUser.displayName || "Explorador",
               points: 0,
               level: "Bronce",
               isGuest: firebaseUser.isAnonymous
             });
          }
          setLoading(false);
        });
        return () => unsubDoc();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AppContext.Provider value={{ user, loading, playSound }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
