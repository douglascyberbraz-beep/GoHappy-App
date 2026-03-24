"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../services/auth_service';
import { useAppContext } from '../context/AppContext';

export default function AuthModal({ onClose }: { onClose?: () => void }) {
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [nickname, setNickname] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loadingAuth, setLoadingAuth] = useState(false);
    
    const { playSound } = useAppContext();

    const handleAuth = async () => {
        setErrorMsg('');
        if (!email || !pass || (!isLoginMode && !nickname)) {
            setErrorMsg("Todos los campos son obligatorios.");
            return;
        }
        
        setLoadingAuth(true);
        playSound('click');
        try {
            if (isLoginMode) {
                await AuthService.login(email, pass);
            } else {
                await AuthService.register(email, pass, nickname);
            }
            playSound('success');
            if (onClose) onClose();
        } catch (e: any) {
            setErrorMsg(e.message || "Error de autenticación");
        }
        setLoadingAuth(false);
    };

    const handleSocial = async (provider: 'google' | 'apple' | 'guest') => {
        playSound('click');
        setLoadingAuth(true);
        try {
           if (provider === 'google') await AuthService.googleLogin();
           if (provider === 'apple') await AuthService.appleLogin();
           if (provider === 'guest') await AuthService.guestLogin();
           playSound('success');
           if (onClose) onClose();
        } catch (e: any) {
           setErrorMsg(`Error al conectar con ${provider}`);
        }
        setLoadingAuth(false);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-blue-900/40 backdrop-blur-md p-4 sm:p-0">
            <motion.div 
                initial={{ y: "100%", opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: "100%", opacity: 0, scale: 1.1 }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-[48px] p-10 shadow-[0_32px_80px_rgba(0,0,0,0.2)] border border-white/50 overflow-hidden relative"
            >
                {/* Decorative background blobs */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-400/20 rounded-full blur-[80px]" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-teal-400/10 rounded-full blur-[80px]" />
                
                <div className="relative z-10">
                    <header className="text-center mb-10">
                        <motion.div 
                            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
                            className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[28px] flex items-center justify-center text-4xl mb-6 mx-auto shadow-xl shadow-blue-500/20 border-4 border-white"
                        >
                            🚀
                        </motion.div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">KIDOA</h2>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Tu pasaporte a la aventura</p>
                    </header>

                    {errorMsg && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            className="bg-red-50 text-red-500 text-xs p-4 rounded-2xl mb-6 text-center font-bold border border-red-100"
                        >
                            {errorMsg}
                        </motion.div>
                    )}

                    <div className="space-y-4">
                        <AnimatePresence mode="wait">
                            {!isLoginMode && (
                                <motion.input 
                                    key="nick" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                    type="text" placeholder="¿Cómo te llamas?" value={nickname} onChange={(e) => setNickname(e.target.value)}
                                    className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 font-bold transition-all placeholder:text-slate-400"
                                />
                            )}
                        </AnimatePresence>
                        
                        <input 
                            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 font-bold transition-all placeholder:text-slate-400"
                        />
                        <input 
                            type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)}
                            className="w-full bg-slate-100 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 font-bold transition-all placeholder:text-slate-400"
                        />
                        
                        <button 
                            onClick={handleAuth}
                            disabled={loadingAuth}
                            className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-black text-lg rounded-2xl py-5 shadow-xl shadow-blue-600/20 disabled:opacity-50 mt-2"
                        >
                            {loadingAuth ? "Sincronizando..." : isLoginMode ? "Iniciar Sesión" : "Crear Mi Cuenta ✨"}
                        </button>

                        <button 
                            onClick={() => { setIsLoginMode(!isLoginMode); setErrorMsg(''); playSound('click'); }}
                            className="w-full text-blue-500 text-xs font-black uppercase tracking-widest hover:text-blue-700 transition-colors py-2"
                        >
                            {isLoginMode ? "¿Eres nuevo? Regístrate gratis" : "¿Ya tienes cuenta? Entra aquí"}
                        </button>
                    </div>

                    <div className="flex items-center gap-4 my-8">
                        <div className="h-px bg-slate-100 flex-1"></div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">O accede con</span>
                        <div className="h-px bg-slate-100 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button 
                            onClick={() => handleSocial('google')}
                            className="flex items-center justify-center gap-3 bg-white border border-slate-100 rounded-2xl py-4 font-bold text-slate-700 active:scale-95 transition-all shadow-sm hover:shadow-md"
                        >
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                            <span className="text-sm">Google</span>
                        </button>
                        <button 
                            onClick={() => handleSocial('apple')}
                            className="flex items-center justify-center gap-3 bg-black text-white rounded-2xl py-4 font-bold active:scale-95 transition-all shadow-lg"
                        >
                            <svg width="18" height="18" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                            <span className="text-sm">Apple</span>
                        </button>
                    </div>

                    <button 
                        onClick={() => handleSocial('guest')}
                        disabled={loadingAuth}
                        className="w-full bg-slate-50 border border-slate-100 text-slate-400 font-bold rounded-2xl py-4 active:scale-95 transition-all hover:bg-white text-xs uppercase tracking-widest"
                    >
                        Continuar como invitado
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
