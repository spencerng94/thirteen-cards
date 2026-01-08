import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { LoadingScreen } from './LoadingScreen';

/**
 * AuthCallback Component
 * 
 * Dedicated route for handling OAuth code exchange.
 * This runs outside the main App component lifecycle to prevent AbortError
 * from React re-renders or Strict Mode double-mounting.
 * 
 * Flow:
 * 1. Extract code from URL query parameters
 * 2. Exchange code for session using supabase.auth.exchangeCodeForSession()
 * 3. Redirect to home page (/) once complete
 * 
 * Supabase Redirect URL should be: https://your-domain.com/auth/callback
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing sign-in...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('🔵 AuthCallback: Component mounted, starting OAuth callback handler');
      console.log('🔵 AuthCallback: Current URL:', window.location.href);
      try {
        // Extract code from URL query parameters
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        console.log('🔵 AuthCallback: Extracted params - code:', code ? 'present' : 'missing', 'error:', errorParam || 'none');

        // Check for OAuth errors
        if (errorParam) {
          console.error('AuthCallback: OAuth error received:', errorParam, errorDescription);
          setError(errorDescription || errorParam || 'Authentication failed');
          setStatus('Authentication failed');
          
          // Redirect to home after showing error briefly
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 3000);
          return;
        }

        if (!code) {
          console.error('AuthCallback: No code parameter found in URL');
          setError('No authorization code received');
          setStatus('Authentication failed');
          
          // Redirect to home
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 3000);
          return;
        }

        console.log('AuthCallback: Code found, exchanging for session...');
        setStatus('Exchanging authorization code...');

        // Exchange code for session
        // This is the critical call that must complete before redirecting
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('AuthCallback: Error exchanging code for session:', exchangeError);
          setError(exchangeError.message || 'Failed to complete sign-in');
          setStatus('Sign-in failed');
          
          // Clean URL and redirect to home
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 3000);
          return;
        }

        if (!exchangeData?.session) {
          console.error('AuthCallback: Exchange completed but no session received');
          setError('No session received from authentication');
          setStatus('Sign-in failed');
          
          // Clean URL and redirect to home
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 3000);
          return;
        }

        console.log('AuthCallback: Code exchange successful! Session obtained:', exchangeData.session.user.id);
        setStatus('Sign-in successful! Redirecting...');

        // Clean the code from URL
        window.history.replaceState(null, '', window.location.pathname);
        
        // Set flag to indicate we're redirecting from OAuth callback
        // This helps App.tsx know to skip safety timeout and wait for onAuthStateChange
        sessionStorage.setItem('thirteen_oauth_redirect', 'true');

        // Small delay to show success message, then redirect to home
        setTimeout(() => {
          // Use window.location.origin to redirect to home page
          // This will trigger App.tsx to aggressively check for session
          window.location.href = window.location.origin;
        }, 1000);

      } catch (err: any) {
        console.error('AuthCallback: Exception during OAuth callback:', err);
        setError(err.message || 'An unexpected error occurred');
        setStatus('Sign-in failed');
        
        // Clean URL and redirect to home
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => {
          window.location.href = window.location.origin;
        }, 3000);
      }
    };

    // Run the callback handler
    handleOAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center">
      <LoadingScreen 
        status={status}
        showGuestButton={false}
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
