import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { LoadingScreen } from './LoadingScreen';
import { useSession } from './SessionProvider';

/**
 * AuthCallback Component
 * 
 * PROACTIVE: This component actively handles the OAuth callback if SessionProvider doesn't.
 * Falls back to letting SessionProvider handle it, but also tries to process it directly.
 */
export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { setIsRedirecting } = useSession();
  const [status, setStatus] = useState('Completing sign-in...');
  const [error, setError] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    // Prevent double-processing
    if (hasProcessedRef.current) {
      return;
    }

    const processCallback = async () => {
      const hash = window.location.hash.substring(1);
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash);
      
      // Check for OAuth errors first
      const errorParam = hashParams.get('error') || searchParams.get('error');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
      
      if (errorParam) {
        console.error('AuthCallback: OAuth error detected:', errorParam, errorDescription);
        setError(errorDescription || errorParam || 'Authentication failed');
        setStatus('Authentication failed');
        setIsRedirecting(false);
        hasProcessedRef.current = true;
        
        // Clean URL and redirect after showing error
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(() => {
          navigate('/');
        }, 3000);
        return;
      }
      
      // Check for PKCE code in query params (Supabase PKCE flow)
      const code = searchParams.get('code');
      if (code) {
        hasProcessedRef.current = true;
        setStatus('Exchanging authorization code...');
        console.log('AuthCallback: Found PKCE code, attempting exchange...');
        
        try {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (!exchangeError && exchangeData?.session) {
            console.log('AuthCallback: ✅ PKCE exchange successful, user:', exchangeData.session.user.id);
            setIsRedirecting(false);
            setStatus('Sign-in successful! Redirecting...');
            
            // Clean the code from URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Redirect to home page
            setTimeout(() => {
              window.location.href = '/';
            }, 500);
          } else if (exchangeError) {
            console.error('AuthCallback: Error exchanging code:', exchangeError);
            
            // Retry on certain errors
            if (retryCountRef.current < maxRetries && (
              exchangeError.message?.includes('network') || 
              exchangeError.message?.includes('timeout') ||
              exchangeError.name === 'AbortError'
            )) {
              retryCountRef.current++;
              console.log(`AuthCallback: Retrying code exchange (attempt ${retryCountRef.current}/${maxRetries})...`);
              hasProcessedRef.current = false;
              setTimeout(() => {
                processCallback();
              }, 2000);
              return;
            }
            
            setError(exchangeError.message || 'Failed to complete sign-in. Please try again.');
            setStatus('Sign-in failed');
            setIsRedirecting(false);
            
            // Clean URL and redirect
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => {
              navigate('/');
            }, 5000);
          }
        } catch (err: any) {
          console.error('AuthCallback: Exception exchanging code:', err);
          
          // Retry on network errors
          if (retryCountRef.current < maxRetries && (
            err?.message?.includes('network') || 
            err?.message?.includes('timeout') ||
            err?.name === 'AbortError'
          )) {
            retryCountRef.current++;
            console.log(`AuthCallback: Retrying code exchange (attempt ${retryCountRef.current}/${maxRetries})...`);
            hasProcessedRef.current = false;
            setTimeout(() => {
              processCallback();
            }, 2000);
            return;
          }
          
          setError(err?.message || 'Failed to complete sign-in. Please try again.');
          setStatus('Sign-in failed');
          setIsRedirecting(false);
          
          // Clean URL and redirect
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            navigate('/');
          }, 5000);
        }
        return;
      }
      
      // Check for implicit flow tokens in hash (fallback)
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken) {
        hasProcessedRef.current = true;
        setStatus('Setting session...');
        console.log('AuthCallback: Found tokens in hash, setting session...');
        
        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (!sessionError && sessionData?.session) {
            console.log('AuthCallback: ✅ Session set successfully, user:', sessionData.session.user.id);
            setIsRedirecting(false);
            setStatus('Sign-in successful! Redirecting...');
            
            // Clean hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            
            // Redirect to home page
            setTimeout(() => {
              window.location.href = '/';
            }, 500);
          } else if (sessionError) {
            console.error('AuthCallback: Error setting session:', sessionError);
            setError(sessionError.message || 'Failed to set session. Please try again.');
            setStatus('Sign-in failed');
            setIsRedirecting(false);
            
            // Clean URL and redirect
            window.history.replaceState(null, '', window.location.pathname);
            setTimeout(() => {
              navigate('/');
            }, 5000);
          }
        } catch (err: any) {
          console.error('AuthCallback: Exception setting session:', err);
          setError(err?.message || 'Failed to set session. Please try again.');
          setStatus('Sign-in failed');
          setIsRedirecting(false);
          
          // Clean URL and redirect
          window.history.replaceState(null, '', window.location.pathname);
          setTimeout(() => {
            navigate('/');
          }, 5000);
        }
        return;
      }
      
      // No code or tokens found - wait for SessionProvider, but timeout after 10 seconds
      console.log('AuthCallback: No tokens/code found, waiting for SessionProvider...');
      setStatus('Waiting for session...');
      
      const timeout = setTimeout(() => {
        if (!hasProcessedRef.current) {
          console.warn('AuthCallback: Timeout waiting for SessionProvider to complete sign-in');
          setError('Sign-in is taking longer than expected. Please try again.');
          setStatus('Sign-in timeout');
          setIsRedirecting(false);
          
          // Redirect to home page
          setTimeout(() => {
            navigate('/');
          }, 3000);
        }
      }, 10000);
      
      return () => clearTimeout(timeout);
    };

    // Start processing immediately
    processCallback();
  }, [navigate, setIsRedirecting]);

  const handleGoBack = () => {
    setIsRedirecting(false);
    window.history.replaceState(null, '', '/');
    navigate('/');
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center">
      <LoadingScreen 
        status={status}
        showGuestButton={!!error} // Show button when there's an error
        onEnterGuest={handleGoBack}
      />
      {error && (
        <div className="mt-4 px-4 py-2 bg-red-900/50 border border-red-500 rounded-lg max-w-md">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={handleGoBack}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-semibold text-sm rounded transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold text-sm rounded transition-colors"
            >
              Retry
            </button>
          </div>
          {!error.includes('Redirecting') && (
            <p className="text-red-500/70 text-xs mt-2">Redirecting to home page in 5 seconds...</p>
          )}
        </div>
      )}
    </div>
  );
};
