import { auth, db } from "./firebase";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export class AuthService {
    static async register(email: string, pass: string, nickname: string) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;

            // Update Auth Profile
            await updateProfile(user, { displayName: nickname });

            // Create Firestore Profile
            await setDoc(doc(db, "users", user.uid), {
                userId: user.uid,
                email: email,
                nickname: nickname,
                points: 100, // Initial reward
                level: 1,
                role: 'user',
                createdAt: new Date()
            });

            // Wait for consistency
            await new Promise(r => setTimeout(r, 1500));
            return user;
        } catch (e) {
            console.error("Registration Error:", e);
            throw e;
        }
    }

    static async login(email: string, pass: string) {
        return await signInWithEmailAndPassword(auth, email, pass);
    }

    static async logout() {
        await signOut(auth);
    }

    static async getUserProfile(uid: string) {
        const snap = await getDoc(doc(db, "users", uid));
        return snap.exists() ? snap.data() : null;
    }
}
