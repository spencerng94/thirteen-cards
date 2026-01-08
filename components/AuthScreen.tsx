
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // OAuth 'Clean Slate': Clear any existing session first
      console.log('AuthScreen: OAuth Clean Slate - Clearing existing session before OAuth flow');
      try {
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session) {
          console.log('AuthScreen: Found existing session, signing out first...');
          await supabase.auth.signOut();
          // Wait a moment for sign-out to complete
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (signOutError: any) {
        console.warn('AuthScreen: Error clearing session before OAuth:', signOutError);
        // Continue with OAuth even if sign-out fails
      }
      
      // Determine redirect URL based on platform
      // For web: Use dedicated /auth/callback route to handle code exchange
      const isNative = Capacitor.isNativePlatform();
      const redirectTo = isNative 
        ? 'com.playthirteen.app://' // Custom scheme for native apps
        : `${window.location.origin}/auth/callback`; // Dedicated callback route for web
      
      console.log('AuthScreen: Initiating Google OAuth flow...', { 
        platform: isNative ? 'native' : 'web',
        redirectTo 
      });
      
      // Trigger Google OAuth with PKCE flow
      // Note: signInWithOAuth may redirect immediately, which can cause the promise
      // to be interrupted. We handle this gracefully.
      const oauthPromise = supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false, // Ensure browser redirect happens
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          }
        }
      });
      
      // Handle the promise - it might redirect before resolving (this is normal)
      oauthPromise
        .then(({ data, error }: { data: any; error: any }) => {
          if (error) {
            console.error('AuthScreen: OAuth error from Supabase:', error);
            setError(error.message || 'OAuth sign-in failed');
            setLoading(false);
          } else {
            console.log('AuthScreen: OAuth flow initiated successfully', { data });
            // If we get here without redirect, the redirect should happen soon
            // Don't reset loading as redirect is expected
          }
        })
        .catch((oauthError: any) => {
          // Only show error if it's not a redirect interruption
          if (oauthError?.code !== 'AUTH_REDIRECT' && 
              !oauthError?.message?.includes('redirect')) {
            console.error('AuthScreen: OAuth promise rejected:', oauthError);
            setError(oauthError?.message || 'Failed to initiate OAuth sign-in');
            setLoading(false);
          } else {
            console.log('AuthScreen: OAuth redirect initiated (promise interrupted - this is normal)');
          }
        });
      
      // For PKCE flow, Supabase will redirect the browser automatically
      // The redirect typically happens immediately, so the promise may never resolve
      // This is expected behavior - we don't await it to avoid blocking
      
    } catch (err: any) {
      console.error('AuthScreen: OAuth error:', err);
      const errorMessage = err?.message || err?.error?.message || 'Failed to sign in with Google. Please try again.';
      setError(errorMessage);
      setLoading(false); // Reset loading state so button isn't stuck
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#031109] relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#092b15_0%,_#000000_100%)]"></div>
      
      <div className="max-w-md w-full z-10 flex flex-col items-center gap-8">
        
        {/* COMPLETELY STATIC LOGO ASSEMBLY - Removed all overlay/wrapper animations */}
        <div className="relative animate-in fade-in duration-1000">
            <div className="drop-shadow-[0_30px_60px_rgba(0,0,0,0.9)]">
               <BrandLogo size="lg" />
            </div>
        </div>
        
        <div className="relative w-full bg-black/50 backdrop-blur-[40px] border border-white/10 p-8 md:p-10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
          <div className="absolute top-4 left-4 text-yellow-500/30"><LeiwenCorner /></div>
          <div className="absolute top-4 right-4 text-yellow-500/30 rotate-90"><LeiwenCorner /></div>
          <div className="absolute bottom-4 left-4 text-yellow-500/30 -rotate-90"><LeiwenCorner /></div>
          <div className="absolute bottom-4 right-4 text-yellow-500/30 rotate-180"><LeiwenCorner /></div>

          <h2 className="text-2xl font-black text-white text-center uppercase tracking-[0.3em] mb-8 font-serif">
            WELCOME TO XIII
          </h2>

          <div className="space-y-6 mb-8">
            <LuxuryButton 
              onClick={signInWithGoogle}
              variant="emerald"
              label={loading ? "CONNECTING..." : "SIGN IN WITH GOOGLE"}
              sublabel="SECURE AUTHENTICATION"
              disabled={loading}
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              }
            />
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

      {/* Legal Footer */}
      <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center">
        <p className="text-white/40 text-[9px] font-medium text-center px-4">
          By playing, you agree to our{' '}
          <button
            onClick={() => navigate('/terms')}
            className="text-yellow-400/80 hover:text-yellow-400 underline underline-offset-2 transition-colors"
          >
            Terms
          </button>
          {' '}and{' '}
          <button
            onClick={() => navigate('/privacy')}
            className="text-blue-400/80 hover:text-blue-400 underline underline-offset-2 transition-colors"
          >
            Privacy
          </button>
          .
        </p>
      </div>
    </div>
  );
};
