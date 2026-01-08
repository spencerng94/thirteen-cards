import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { LoadingScreen } from './LoadingScreen';

/**
 * AuthCallback Component
 * 
 * Dedicated route for handling OAuth implicit flow tokens.
 * This runs outside the main App component lifecycle to prevent AbortError
 * from React re-renders or Strict Mode double-mounting.
 * 
 * Flow (Implicit):
 * 1. Extract access_token and refresh_token from URL hash
 * 2. Manually set session using supabase.auth.setSession()
 * 3. Clean hash from URL
 * 4. Redirect to home page (/) once complete
 * 
 * Supabase Redirect URL should be: https://your-domain.com/auth/callback
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Completing sign-in...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('🔵 AuthCallback: Component mounted, starting OAuth callback handler (Implicit flow)');
      console.log('🔵 AuthCallback: Current URL:', window.location.href);
      console.log('🔵 AuthCallback: Hash:', window.location.hash || 'missing');
      console.log('🔵 AuthCallback: Search:', window.location.search || 'missing');
      console.log('🔵 AuthCallback: Pathname:', window.location.pathname);
      
      try {
        // Check both hash (implicit) and query params (PKCE)
        const hash = window.location.hash.substring(1); // Remove #
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(hash);
        
        // Try hash first (implicit flow)
        let accessToken = hashParams.get('access_token');
        let refreshToken = hashParams.get('refresh_token');
        let errorParam = hashParams.get('error');
        let errorDescription = hashParams.get('error_description');
        let code = searchParams.get('code');
        
        // If no hash tokens, check query params (PKCE flow)
        if (!accessToken && !code) {
          console.log('🔵 AuthCallback: No tokens in hash, checking query params for PKCE code...');
          code = searchParams.get('code');
          errorParam = searchParams.get('error') || errorParam;
          errorDescription = searchParams.get('error_description') || errorDescription;
        }
        
        console.log('🔵 AuthCallback: Extracted params -', {
          hasHash: !!hash,
          hasAccessToken: !!accessToken,
          hasCode: !!code,
          error: errorParam || 'none'
        });

        // Check for OAuth errors
        if (errorParam) {
          console.error('AuthCallback: OAuth error received:', errorParam, errorDescription);
          setError(errorDescription || errorParam || 'Authentication failed');
          setStatus('Authentication failed');
          
          // Clean hash and redirect to home after showing error briefly
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 3000);
          return;
        }

        // Handle PKCE flow (code exchange)
        if (code && !accessToken) {
          console.log('AuthCallback: PKCE code found, exchanging for session...');
          setStatus('Exchanging authorization code...');
          
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('AuthCallback: Error exchanging code for session:', exchangeError);
            setError(exchangeError.message || 'Failed to complete sign-in');
            setStatus('Sign-in failed');
            
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
            
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => {
              window.location.href = window.location.origin;
            }, 3000);
            return;
          }
          
          console.log('AuthCallback: PKCE exchange successful! Session obtained:', exchangeData.session.user.id);
          setStatus('Sign-in successful! Redirecting...');
          
          // Clean the code from URL
          window.history.replaceState(null, '', window.location.pathname);
          sessionStorage.setItem('thirteen_oauth_redirect', 'true');
          
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 1000);
          return;
        }
        
        // Handle Implicit flow (hash tokens)
        if (!accessToken && !code) {
          console.error('AuthCallback: No access_token or code found');
          setError('No authentication data received');
          setStatus('Authentication failed');
          
          // Clean URL and redirect to home
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 3000);
          return;
        }

        if (accessToken) {
          console.log('AuthCallback: Hash tokens found, setting session manually...');
          setStatus('Setting session...');

          // Manually set session using tokens from hash (Implicit flow)
          // This bypasses the need for background cookies
          const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

        if (setSessionError) {
          console.error('AuthCallback: Error setting session:', setSessionError);
          setError(setSessionError.message || 'Failed to set session');
          setStatus('Sign-in failed');
          
          // Clean hash and redirect to home
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 3000);
          return;
        }

        if (!sessionData?.session) {
          console.error('AuthCallback: Session set but no session data received');
          setError('No session received from authentication');
          setStatus('Sign-in failed');
          
          // Clean hash and redirect to home
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            window.location.href = window.location.origin;
          }, 3000);
          return;
        }

          if (!setSessionError && sessionData?.session) {
            console.log('AuthCallback: Session set successfully! User:', sessionData.session.user.id);
            setStatus('Sign-in successful! Redirecting...');

            // Clean the hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Set flag to indicate we're redirecting from OAuth callback
            sessionStorage.setItem('thirteen_oauth_redirect', 'true');

            // Small delay to show success message, then redirect to home
            setTimeout(() => {
              window.location.href = window.location.origin;
            }, 1000);
            return;
          }
          
          if (setSessionError) {
            console.error('AuthCallback: Error setting session from hash:', setSessionError);
            setError(setSessionError.message || 'Failed to set session');
            setStatus('Sign-in failed');
            
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => {
              window.location.href = window.location.origin;
            }, 3000);
            return;
          }
        }

      } catch (err: any) {
        console.error('AuthCallback: Exception during OAuth callback:', err);
        setError(err.message || 'An unexpected error occurred');
        setStatus('Sign-in failed');
        
        // Clean hash and redirect to home
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
