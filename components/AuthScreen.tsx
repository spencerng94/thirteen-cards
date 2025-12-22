
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { BrandLogo } from './BrandLogo';

interface AuthScreenProps {
  onPlayAsGuest: () => void;
}

const LeiwenCorner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 40 40" className={`w-4 h-4 ${className}`} xmlns="http://www.w3.org/2000/svg">
    <path d="M 5 5 H 35 V 35 H 10 V 10 H 30 V 30 H 15 V 15 H 25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
  </svg>
);

export const AuthScreen: React.FC<AuthScreenProps> = ({ onPlayAsGuest }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      if (isSignUp) alert('Check your email for the confirmation link!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  return (
    <div className="min-h-screen w-full bg-[#031109] relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#092b15_0%,_#000000_100%)]"></div>
      
      <div className="max-w-md w-full z-10 flex flex-col items-center gap-8">
        <BrandLogo size="lg" className="animate-pulse duration-[3000ms]" />
        
        <div className="relative w-full bg-black/50 backdrop-blur-[40px] border border-white/10 p-8 md:p-10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
          <div className="absolute top-4 left-4 text-yellow-500/30"><LeiwenCorner /></div>
          <div className="absolute top-4 right-4 text-yellow-500/30 rotate-90"><LeiwenCorner /></div>
          <div className="absolute bottom-4 left-4 text-yellow-500/30 -rotate-90"><LeiwenCorner /></div>
          <div className="absolute bottom-4 right-4 text-yellow-500/30 rotate-180"><LeiwenCorner /></div>

          <h2 className="text-2xl font-black text-white text-center uppercase tracking-[0.3em] mb-8 font-serif">
            WELCOME BACK
          </h2>

          <div className="space-y-4 mb-8">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-4 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all active:scale-95 shadow-xl"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </button>
            
            <div className="flex items-center gap-4">
              <div className="flex-1 h-[1px] bg-white/10"></div>
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">or</span>
              <div className="flex-1 h-[1px] bg-white/10"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input
                type="email"
                placeholder="EMAIL ADDRESS"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 bg-black/60 border border-white/10 rounded-2xl text-white font-black tracking-widest uppercase focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 outline-none transition-all placeholder:text-white/10 text-xs"
                required
              />
              <input
                type="password"
                placeholder="PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-6 py-4 bg-black/60 border border-white/10 rounded-2xl text-white font-black tracking-widest uppercase focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 outline-none transition-all placeholder:text-white/10 text-xs"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 rounded-2xl text-black font-black uppercase tracking-widest text-xs shadow-lg hover:shadow-yellow-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Processing...' : (isSignUp ? 'Join Empire' : 'Enter Arena')}
              </button>
            </form>

            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-[10px] text-gray-500 font-black uppercase tracking-widest hover:text-white transition-colors"
            >
              {isSignUp ? 'Already a citizen? Login' : 'New to the court? Sign Up'}
            </button>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button
              onClick={onPlayAsGuest}
              className="w-full py-4 border border-white/5 hover:bg-white/5 rounded-2xl text-white/40 hover:text-white font-black uppercase tracking-[0.4em] text-[10px] transition-all active:scale-95"
            >
              Play as Guest
            </button>
          </div>

          {error && (
            <div className="absolute -bottom-16 left-0 w-full text-center px-4">
              <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-bounce">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
