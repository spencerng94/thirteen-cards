import React, { useEffect, useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { LoadingScreen } from './LoadingScreen';

/**
 * AuthCallback Component
 * 
 * SIMPLIFIED: This component only shows a loading spinner.
 * SessionProvider (the parent) handles all URL parsing and session management.
 * This prevents two components from fighting over the same URL tokens.
 * 
 * The SessionProvider's checkHashForTokens() function will:
 * 1. Extract access_token and refresh_token from URL hash
 * 2. Manually set session using supabase.auth.setSession()
 * 3. Clean hash from URL
 * 4. Update session state, which will cause this component to unmount
 * 
 * Supabase Redirect URL should be: https://your-domain.com/auth/callback
 */
export const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState('Completing sign-in...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for OAuth errors in URL (but don't process tokens - let SessionProvider do that)
    const hash = window.location.hash.substring(1);
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(hash);
    
    const errorParam = hashParams.get('error') || searchParams.get('error');
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
    
    if (errorParam) {
      console.error('AuthCallback: OAuth error detected:', errorParam, errorDescription);
      setError(errorDescription || errorParam || 'Authentication failed');
      setStatus('Authentication failed');
      
      // Clean URL and redirect after showing error
      window.history.replaceState(null, '', window.location.pathname);
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 5000);
      return;
    }
    
    // If no error, just show loading - SessionProvider will handle the rest
    console.log('AuthCallback: Showing loading spinner, SessionProvider will handle URL parsing');
    setStatus('Completing sign-in...');
    
    // Set a timeout to show error if SessionProvider doesn't complete within 10 seconds
    const timeout = setTimeout(() => {
      console.warn('AuthCallback: Timeout waiting for SessionProvider to complete sign-in');
      setError('Sign-in is taking longer than expected. Please try again.');
      setStatus('Sign-in timeout');
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center">
      <LoadingScreen 
        status={status}
        showGuestButton={false}
        onEnterGuest={() => {}} // Not used when showGuestButton is false
      />
      {error && (
        <div className="mt-4 px-4 py-2 bg-red-900/50 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-red-500/70 text-xs mt-1">Redirecting to home page...</p>
        </div>
      )}
    </div>
  );
};
