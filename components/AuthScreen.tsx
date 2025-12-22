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

const LuxuryButton: React.FC<{ 
  onClick?: () => void; 
  variant: 'gold' | 'emerald' | 'ghost'; 
  label: string; 
  icon?: React.ReactNode;
  sublabel?: string;
  slim?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
}> = ({ onClick, variant, label, icon, sublabel, slim, type = "button", disabled }) => {
  const themes = {
    gold: { bg: "from-[#3d280a] via-[#b8860b] to-[#3d280a]", highlight: "from-[#b8860b] via-[#fbf5b7] to-[#8b6508]", text: "text-black", border: "border-yellow-300/40", accent: "text-yellow-900/60", shadow: "shadow-yellow-900/40" },
    emerald: { bg: "from-[#064e3b] via-[#059669] to-[#064e3b]", highlight: "from-[#059669] via-[#34d399] to-[#047857]", text: "text-white", border: "border-yellow-500/50", accent: "text-yellow-400/80", shadow: "shadow-emerald-950/60" },
    ghost: { bg: "from-black via-zinc-900 to-black", highlight: "from-zinc-900 via-zinc-800 to-black", text: "text-yellow-500/90", border: "border-yellow-500/20", accent: "text-yellow-600/40", shadow: "shadow-black/60" }
  };
  const theme = themes[variant];
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`group relative w-full ${slim ? 'py-3 px-3' : 'py-5 px-4'} rounded-2xl border transition-all duration-500 active:scale-95 overflow-hidden ${theme.border} ${theme.shadow} shadow-[0_20px_40px_rgba(0,0,0,0.5)] disabled:opacity-30 disabled:grayscale disabled:pointer-events-none`}
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.bg} group-hover:scale-110 transition-transform duration-1000`}></div>
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.highlight} opacity-90 transition-opacity duration-500 group-hover:opacity-100`}></div>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
            <span className={`text-[11px] md:text-[13px] font-black uppercase tracking-[0.25em] font-serif ${theme.text} drop-shadow-md`}>{label}</span>
            {icon && <span className="flex items-center justify-center group-hover:scale-110 transition-transform duration-500">{icon}</span>}
        </div>
        {sublabel && <span className={`text-[8px] font-black opacity-60 tracking-[0.3em] uppercase font-serif mt-1 ${theme.text}`}>{sublabel}</span>}
      </div>
    </button>
  );
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onPlayAsGuest }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
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
            WELCOME TO XIII
          </h2>

          <div className="space-y-4 mb-8">
            <LuxuryButton 
              onClick={signInWithGoogle}
              variant="emerald"
              label="SIGN IN WITH GOOGLE"
              sublabel="SECURE AUTHENTICATION"
              icon={<img src="https://www.google.com/favicon.ico" alt="G" className="w-4 h-4 ml-1 drop-shadow-sm" />}
            />
            
            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-[1px] bg-white/10"></div>
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">ENCRYPTED LOGIN</span>
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
              <LuxuryButton 
                type="submit"
                variant="gold"
                disabled={loading || !email.trim() || !password.trim()}
                label={loading ? "PROCESSING..." : (isSignUp ? "JOIN EMPIRE" : "ENTER ARENA")}
                sublabel={isSignUp ? "CREATE NEW RECORDS" : "ESTABLISH CONNECTION"}
                icon={<span className="text-xl">⚔️</span>}
              />
            </form>

            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-[10px] text-gray-500 font-black uppercase tracking-widest hover:text-white transition-colors py-2"
            >
              {isSignUp ? 'ALREADY A CITIZEN? LOGIN' : 'NEW TO THE COURT? SIGN UP'}
            </button>
          </div>

          <div className="pt-6 border-t border-white/5">
            <LuxuryButton 
              onClick={onPlayAsGuest}
              variant="ghost"
              label="PLAY AS GUEST"
              sublabel="QUICK PLAY"
              icon={<span className="text-xl">🕶️</span>}
            />
          </div>

          {error && (
            <div className="absolute -bottom-12 left-0 w-full text-center px-4">
              <p className="text-red-500 text-[9px] font-black uppercase tracking-widest animate-pulse">ERROR: {error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
