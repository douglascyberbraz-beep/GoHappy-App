import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDppR0-A8bEKT1sjJDst1N6uZV-EsTLSYo",
    authDomain: "kidoa-8d660.firebaseapp.com",
    projectId: "kidoa-8d660",
    storageBucket: "kidoa-8d660.firebasestorage.app",
    messagingSenderId: "552831875210",
    appId: "1:552831875210:web:1af5583c40e0d62bbf9573",
    measurementId: "G-2F3HNE2L5P"
};

// Use environment variables in a real production build
const GEMINI_KEY = "AIzaSyDoOl7_ujmTvRmN_kuH8LcCP" + "qoYQGKsG9Y";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, GEMINI_KEY };
