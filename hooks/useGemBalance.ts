import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

/**
 * Hook for managing gem balance with realtime updates
 * Fetches initial gem count and subscribes to realtime changes in the profiles table
 */
export const useGemBalance = () => {
  const [gemCount, setGemCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Hard Lock: Prevent multiple subscription attempts during initialization
  const isInitializing = useRef(false);
  // Track if subscription is active to prevent aborting during handshake
  const subscriptionActive = useRef(false);
  // Track the current channel to prevent cleanup during initial connection
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Track which userId we've subscribed to, to prevent re-subscription on re-renders
  const subscribedUserIdRef = useRef<string | null>(null);

  // Fetch initial gem count
  // Network Hardening: No auto-retry on AbortError - wait for next state change
  const fetchGemCount = useCallback(async (currentUserId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('gems')
        .eq('id', currentUserId)
        .maybeSingle();

      if (fetchError) {
        // Check if it's an AbortError - don't retry, just log and return (will retry on next render)
        const isAbortError = fetchError.name === 'AbortError' || fetchError.message?.includes('aborted') || fetchError.message?.includes('signal is aborted');
        
        if (isAbortError) {
          console.warn('useGemBalance: AbortError detected, will retry on next render when state is stable');
          setIsLoading(false);
          return;
        }
        
        throw fetchError;
      }

      if (data) {
        setGemCount(data.gems ?? 0);
      } else {
        // Profile doesn't exist yet, default to 0
        setGemCount(0);
      }
    } catch (err: any) {
      // Check if it's an AbortError - don't retry, just log and return (will retry on next render)
      const isAbortError = err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('signal is aborted');
      
      if (isAbortError) {
        console.warn('useGemBalance: AbortError exception, will retry on next render when state is stable');
        setIsLoading(false);
        return;
      }
      
      console.error('Failed to fetch gem count:', err);
      setError(err.message || 'Failed to fetch gem count');
      setGemCount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get current user and set up subscription
  // Hard Lock: Prevent multiple subscription attempts and abort during handshake
  useEffect(() => {
    // HARD LOCK: The very first check - if already initializing, return immediately
    if (isInitializing.current) {
      return;
    }
    
    // Hard Lock: Set the lock immediately to prevent any other renders from triggering this
    isInitializing.current = true;
    
    const setupSubscription = async () => {
      
      try {
        // Check for session first - if no session exists, return early with balance 0
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          // No session exists - return early with balance 0 instead of throwing error
          setUserId(null);
          setGemCount(0);
          setIsLoading(false);
          subscribedUserIdRef.current = null;
          isInitializing.current = false; // Unlock
          return;
        }

        // Get current user - wait for stable userId
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user || !user.id || user.id === 'pending') {
          // No user logged in or userId not stable yet
          setUserId(null);
          setGemCount(0);
          setIsLoading(false);
          subscribedUserIdRef.current = null;
          isInitializing.current = false; // Unlock
          return;
        }

        // Wait for userId to be stable (not 'pending')
        const stableUserId = user.id;
        if (!stableUserId || stableUserId === 'pending') {
          isInitializing.current = false; // Unlock to allow retry
          return;
        }

        // If we've already subscribed to this user, skip re-subscription
        if (subscribedUserIdRef.current === stableUserId && subscriptionActive.current) {
          setUserId(stableUserId);
          isInitializing.current = false; // Unlock
          return;
        }

        setUserId(stableUserId);
        subscribedUserIdRef.current = stableUserId; // Track which user we're subscribing to

        // Fetch initial gem count - no AbortController, must finish
        await fetchGemCount(stableUserId);

        // Set up realtime subscription for the profiles table
        // Store channel in ref to prevent cleanup during handshake
        channelRef.current = supabase
          .channel(`gem-balance-${stableUserId}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${stableUserId}`, // Only listen to changes for this user
            },
            (payload) => {

              // Handle UPDATE events
              if (payload.eventType === 'UPDATE' && payload.new) {
                const newGems = (payload.new as any).gems;
                if (typeof newGems === 'number') {
                  setGemCount(newGems);
                }
              }
              // Handle INSERT events (new profile created)
              else if (payload.eventType === 'INSERT' && payload.new) {
                const newGems = (payload.new as any).gems;
                if (typeof newGems === 'number') {
                  setGemCount(newGems);
                }
              }
              // Handle DELETE events (profile deleted)
              else if (payload.eventType === 'DELETE') {
                setGemCount(0);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              subscriptionActive.current = true; // Mark as active
              isInitializing.current = false; // Unlock after successful subscription
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Error subscribing to gem balance changes');
              setError('Failed to subscribe to realtime updates');
              subscriptionActive.current = false;
              subscribedUserIdRef.current = null; // Reset on error
              isInitializing.current = false; // Unlock on error
            } else if (status === 'CLOSED') {
              subscriptionActive.current = false;
              subscribedUserIdRef.current = null; // Reset when closed
            }
          });
      } catch (err: any) {
        // Check if it's an AbortError - silence it, don't trigger state updates
        const isAbortError = err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('signal is aborted');
        
        if (isAbortError) {
          console.warn('useGemBalance: Subscription setup was aborted (silenced - no state update)');
          // Don't set error state - just log and unlock to allow retry
          subscribedUserIdRef.current = null; // Reset on abort
          isInitializing.current = false;
          return;
        }
        
        console.error('Failed to set up gem balance subscription:', err);
        setError(err.message || 'Failed to set up subscription');
        setIsLoading(false);
        subscribedUserIdRef.current = null; // Reset on error
        isInitializing.current = false; // Unlock on error
      }
    };

    setupSubscription();

    // Cleanup: Only unsubscribe if subscription is fully active (not during handshake)
    return () => {
      // Don't abort during initial handshake - wait for subscription to be active
      // Only cleanup if we're actually unmounting or userId changed, not on every re-render
      if (channelRef.current && subscriptionActive.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        subscriptionActive.current = false;
        subscribedUserIdRef.current = null;
      } else if (channelRef.current && !subscriptionActive.current) {
        // If we have a channel but it's not active yet, just clear the ref
        // Don't unsubscribe during handshake to avoid AbortError
        channelRef.current = null;
      }
      // Note: We don't unlock isInitializing here if subscription is active
      // The unlock happens in the subscribe callback when status is SUBSCRIBED
      // This prevents cleanup from running during the initial handshake
    };
  }, [fetchGemCount]);

  // Manual refresh function (optional, for cases where you need to force a refresh)
  const refresh = useCallback(async () => {
    if (userId) {
      await fetchGemCount(userId);
    }
  }, [userId, fetchGemCount]);

  return {
    gemCount,
    isLoading,
    error,
    userId,
    refresh,
  };
};
