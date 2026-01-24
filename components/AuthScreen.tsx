
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase, supabaseUrl, supabaseAnonKey } from '../src/lib/supabase';
import { BrandLogo } from './BrandLogo';
import { useSession } from './SessionProvider';
import { BoardSurface } from './UserHub';

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
    emerald: { bg: "from-[#064e3b] via-[#10b981] to-[#064e3b]", highlight: "from-[#10b981] via-[#34d399] to-[#059669]", text: "text-white", border: "border-emerald-400/50", accent: "text-emerald-300/90", shadow: "shadow-emerald-500/50" },
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

// Top 10 most used emotes for pre-loading
const TOP_EMOTES = [
  ':smile:', ':blush:', ':cool:', ':annoyed:', ':heart_eyes:',
  ':money_mouth_face:', ':robot:', ':devil:', ':girly:', ':shiba:'
];

// Pre-load emote images to warm the cache
const preloadEmotes = () => {
  if ('serviceWorker' in navigator && 'caches' in window && supabaseUrl) {
    // Get emote URLs from Supabase
    const emoteUrls = TOP_EMOTES.map(trigger => {
      const fileName = trigger === ':smile:' ? 'shiba_card.webp' :
                       trigger === ':blush:' ? 'blushing_card.webp' :
                       trigger === ':cool:' ? 'sunglasses_card.webp' :
                       trigger === ':annoyed:' ? 'annoyed_card.webp' :
                       trigger === ':heart_eyes:' ? 'seductive_card.webp' :
                       trigger === ':money_mouth_face:' ? 'chinese_card.webp' :
                       trigger === ':robot:' ? 'final_boss_card.webp' :
                       trigger === ':devil:' ? 'devil_card.webp' :
                       trigger === ':girly:' ? 'girly_card.webp' :
                       trigger === ':shiba:' ? 'shiba_card.webp' : '';
      if (!fileName) return null;
      return `${supabaseUrl}/storage/v1/object/public/emotes/${fileName}?v=3`;
    }).filter(Boolean) as string[];

    // Pre-fetch all emote images (use normal fetch, not no-cors, so service worker can intercept)
    emoteUrls.forEach(url => {
      fetch(url).catch(() => {
        // Silently fail - service worker will handle caching
      });
    });

    // Also try to cache via service worker if available
    if (navigator.serviceWorker.controller) {
      emoteUrls.forEach(url => {
        navigator.serviceWorker.controller?.postMessage({
          type: 'CACHE_URL',
          url: url
        });
      });
    }
  }
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ onPlayAsGuest }) => {
  const navigate = useNavigate();
  const { setIsRedirecting } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-load emotes when component mounts (Sign In screen)
  React.useEffect(() => {
    preloadEmotes();
  }, []);

  // Clear redirecting state after timeout to prevent app from being stuck
  React.useEffect(() => {
    // If redirecting state gets stuck, clear it after 15 seconds
    if (loading) {
      redirectTimeoutRef.current = setTimeout(() => {
        console.warn('AuthScreen: Redirect timeout - clearing isRedirecting to prevent stuck state');
        setIsRedirecting(false);
        setLoading(false);
        setError('Redirect is taking longer than expected. Please try again or check if popups are blocked.');
      }, 15000); // 15 second timeout
      
      return () => {
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
          redirectTimeoutRef.current = null;
        }
      };
    }
  }, [loading, setIsRedirecting]);

  const signInWithGoogle = async () => {
    // Clear any existing timeout
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = null;
    }
    
    setLoading(true);
    setError(null);
    
    // In Sign-In Function: The moment signInWithOAuth is called, set isRedirecting=true
    setIsRedirecting(true);
    
    try {
      // OAuth 'Clean Slate': Clear any existing session first
      try {
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session) {
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
      
      // Use Supabase's signInWithOAuth method - this handles the OAuth flow properly
      // and uses the correct Google OAuth client ID configured in Supabase dashboard
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('AuthScreen: Missing Supabase configuration');
        setError('Authentication configuration error. Please check your environment variables.');
        setLoading(false);
        setIsRedirecting(false); // Clear redirecting state on error
        return;
      }
      
      // Use Supabase's OAuth method which properly handles the flow
      const { data, error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
          queryParams: {
            prompt: 'consent'
          }
        }
      });
      
      // Handle errors (if redirect doesn't happen immediately)
      if (error) {
        console.error('AuthScreen: OAuth error from Supabase:', error);
        console.error('AuthScreen: Full error details:', JSON.stringify(error, null, 2));
        
        // Clear timeout on error
        if (redirectTimeoutRef.current) {
          clearTimeout(redirectTimeoutRef.current);
          redirectTimeoutRef.current = null;
        }
        
        // Provide more specific error messages
        let errorMessage = 'OAuth sign-in failed. ';
        if (error.message?.includes('invalid_client') || error.message?.includes('OAuth client')) {
          errorMessage += 'Google OAuth is not configured in Supabase. Please go to Supabase Dashboard → Authentication → Providers → Google and add your Google OAuth Client ID and Secret.';
        } else {
          errorMessage += error.message || 'Please check your Google OAuth configuration in Supabase dashboard.';
        }
        
        setError(errorMessage);
        setLoading(false);
        setIsRedirecting(false); // Clear redirecting state on error
        return;
      }
      
      // If we get here, the redirect should happen soon (though it usually happens immediately)
      // Don't reset loading as redirect is expected - timeout will handle it if redirect fails
      
    } catch (err: any) {
      console.error('AuthScreen: OAuth error:', err);
      
      // Clear timeout on error
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
      
      const errorMessage = err?.message || err?.error?.message || 'Failed to sign in with Google. Please try again.';
      setError(errorMessage);
      setLoading(false); // Reset loading state so button isn't stuck
      setIsRedirecting(false); // Clear redirecting state on error
    }
  };

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center p-6" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <BoardSurface themeId="EMERALD" />
      
      <div className="max-w-md w-full z-10 flex flex-col items-center gap-8">
        
        {/* Premium Logo Section - Matching WelcomeScreen styling */}
        <div className="relative animate-in fade-in duration-1000 mb-2">
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.2)_0%,transparent_70%)] blur-3xl opacity-50"></div>
            <div className="drop-shadow-[0_40px_100px_rgba(0,0,0,0.95)] relative z-10">
              <BrandLogo size="lg" />
            </div>
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
