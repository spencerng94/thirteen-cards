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
  
  // Fetch Lock: Prevent multiple fetches during initialization
  const hasInitialLoadRun = useRef(false);

  // Fetch initial gem count
  // Network Hardening: Auto-retry on AbortError (Supabase uses AbortController internally)
  const fetchGemCount = useCallback(async (currentUserId: string, retryCount: number = 0): Promise<void> => {
    const maxRetries = 3;
    const retryDelay = 500; // 500ms delay between retries
    
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('gems')
        .eq('id', currentUserId)
        .maybeSingle();

      if (fetchError) {
        // Check if it's an AbortError - auto-retry up to maxRetries times
        const isAbortError = fetchError.name === 'AbortError' || fetchError.message?.includes('aborted') || fetchError.message?.includes('signal is aborted');
        
        if (isAbortError && retryCount < maxRetries) {
          console.warn(`useGemBalance: AbortError on attempt ${retryCount + 1}/${maxRetries}, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1))); // Exponential backoff
          return fetchGemCount(currentUserId, retryCount + 1);
        }
        
        // If AbortError after max retries, just log and return (will retry on next render)
        if (isAbortError) {
          console.warn('useGemBalance: AbortError after max retries, will retry on next render');
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
      // Check if it's an AbortError - auto-retry up to maxRetries times
      const isAbortError = err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('signal is aborted');
      
      if (isAbortError && retryCount < maxRetries) {
        console.warn(`useGemBalance: AbortError exception on attempt ${retryCount + 1}/${maxRetries}, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1))); // Exponential backoff
        return fetchGemCount(currentUserId, retryCount + 1);
      }
      
      // If AbortError after max retries, just log and return (will retry on next render)
      if (isAbortError) {
        console.warn('useGemBalance: AbortError after max retries, will retry on next render');
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
  useEffect(() => {
    // Fetch Lock: Only run once during initialization
    if (hasInitialLoadRun.current) {
      console.log('useGemBalance: Initial load already run, skipping...');
      return;
    }
    
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      try {
        // Mark as run immediately to prevent duplicate fetches
        hasInitialLoadRun.current = true;
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          // No user logged in
          setUserId(null);
          setGemCount(null);
          setIsLoading(false);
          return;
        }

        setUserId(user.id);

        // Fetch initial gem count - no AbortController, must finish
        await fetchGemCount(user.id);

        // Set up realtime subscription for the profiles table
        channel = supabase
          .channel(`gem-balance-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`, // Only listen to changes for this user
            },
            (payload) => {
              console.log('Gem balance change detected:', payload);

              // Handle UPDATE events
              if (payload.eventType === 'UPDATE' && payload.new) {
                const newGems = (payload.new as any).gems;
                if (typeof newGems === 'number') {
                  setGemCount(newGems);
                  console.log('Gem balance updated to:', newGems);
                }
              }
              // Handle INSERT events (new profile created)
              else if (payload.eventType === 'INSERT' && payload.new) {
                const newGems = (payload.new as any).gems;
                if (typeof newGems === 'number') {
                  setGemCount(newGems);
                  console.log('New profile created with gems:', newGems);
                }
              }
              // Handle DELETE events (profile deleted)
              else if (payload.eventType === 'DELETE') {
                setGemCount(0);
                console.log('Profile deleted, resetting gem count to 0');
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Successfully subscribed to gem balance changes');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Error subscribing to gem balance changes');
              setError('Failed to subscribe to realtime updates');
            }
          });
      } catch (err: any) {
        console.error('Failed to set up gem balance subscription:', err);
        setError(err.message || 'Failed to set up subscription');
        setIsLoading(false);
      }
    };

    setupSubscription();

    // Cleanup: Unsubscribe when component unmounts or user changes
    return () => {
      if (channel) {
        console.log('Unsubscribing from gem balance changes');
        channel.unsubscribe();
        supabase.removeChannel(channel);
      }
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
