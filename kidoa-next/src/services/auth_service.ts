import { auth, db } from "./firebase";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updateProfile,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signInAnonymously
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

export class AuthService {
    private static async createUserProfileIfMissing(user: any, defaultNickname: string) {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
            await setDoc(userRef, {
                userId: user.uid,
                email: user.email || "Invitado",
                nickname: user.displayName || defaultNickname,
                points: 50, // Welcome bonus matching vanilla JS
                level: 1,
                role: 'user',
                createdAt: new Date()
            });
        }
    }

    static async register(email: string, pass: string, nickname: string) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;

            await updateProfile(user, { displayName: nickname });
            await this.createUserProfileIfMissing(user, nickname);

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

    static async googleLogin() {
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(auth, provider);
        await this.createUserProfileIfMissing(res.user, "Explorador");
        return res.user;
    }

    static async appleLogin() {
        const provider = new OAuthProvider('apple.com');
        const res = await signInWithPopup(auth, provider);
        await this.createUserProfileIfMissing(res.user, "Explorador Apple");
        return res.user;
    }

    static async guestLogin() {
        // Firebase anonymous auth
        const res = await signInAnonymously(auth);
        await this.createUserProfileIfMissing(res.user, "Explorador Invitado");
        return res.user;
    }

    static async logout() {
        await signOut(auth);
    }

    static async getUserProfile(uid: string) {
        const snap = await getDoc(doc(db, "users", uid));
        return snap.exists() ? snap.data() : null;
    }
}
