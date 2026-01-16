import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';

/**
 * LoadingState enum for asset loading states
 */
export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

/**
 * Request queue manager to limit concurrent image fetches
 * Prevents iOS browsers from choking on too many simultaneous requests
 */
class RequestQueue {
  private queue: Array<() => void> = [];
  private activeCount = 0;
  private readonly maxConcurrent = 6;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        this.activeCount++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeCount--;
          this.processQueue();
        }
      });
      this.processQueue();
    });
  }

  private processQueue() {
    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const task = this.queue.shift();
      if (task) {
        task();
      }
    }
  }
}

// Global request queue instance
const requestQueue = new RequestQueue();

/**
 * Fallback asset URL - Imperial Noir card back placeholder
 * This is a high-quality fallback that should always be available
 * If this doesn't exist, we'll show a CSS-based placeholder instead
 */
const FALLBACK_ASSET_URL = 'https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/imperial_noir_card_back.webp';

/**
 * Log asset loading failure to Supabase event_stats
 */
const logAssetFailure = async (url: string, error: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Skip logging for guests

    // Get current profile to update event_stats
    const { data: profile } = await supabase
      .from('profiles')
      .select('event_stats')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    const currentStats = profile.event_stats || {};
    const assetFailures = (currentStats as any).asset_failures || {};
    
    // Track failures by URL (truncate long URLs)
    const urlKey = url.length > 100 ? url.substring(0, 100) : url;
    assetFailures[urlKey] = (assetFailures[urlKey] || 0) + 1;
    assetFailures[`${urlKey}_last_error`] = error;
    assetFailures[`${urlKey}_last_failure_time`] = new Date().toISOString();

    // Update event_stats with asset failure data
    await supabase
      .from('profiles')
      .update({
        event_stats: {
          ...currentStats,
          asset_failures
        }
      })
      .eq('id', user.id);
  } catch (err) {
    // Silent failure - don't break the app if logging fails
    console.warn('Failed to log asset failure:', err);
  }
};

/**
 * Load an image with timeout and retry logic
 */
const loadImageWithTimeout = (url: string, timeout: number = 5000): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let timeoutId: number | null = null;
    let resolved = false;

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      img.onload = null;
      img.onerror = null;
    };

    const handleSuccess = () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      
      // Verify image actually loaded (iOS quirk)
      if (img.complete && img.naturalWidth > 0) {
        resolve(img);
      } else {
        // Wait a bit and check again
        setTimeout(() => {
          if (img.complete && img.naturalWidth > 0) {
            resolve(img);
          } else {
            reject(new Error('Image loaded but invalid dimensions'));
          }
        }, 100);
      }
    };

    const handleError = (error: Event | string) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      
      // Check if image actually loaded (iOS sometimes fires onError even when image loads)
      if (img.complete && img.naturalWidth > 0) {
        resolve(img);
      } else {
        reject(typeof error === 'string' ? new Error(error) : new Error('Image failed to load'));
      }
    };

    img.onload = handleSuccess;
    img.onerror = handleError;

    // Set timeout
    timeoutId = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error(`Image load timeout after ${timeout}ms`));
      }
    }, timeout);

    img.src = url;
  });
};

/**
 * useImageCache hook - Robust asset loading with timeout, retry, and fallback
 * 
 * Features:
 * - 5-second timeout per attempt
 * - Up to 2 retries on failure
 * - Request queue limiting (max 6 concurrent)
 * - Intersection Observer support for lazy loading
 * - Automatic fallback to Imperial Noir card back
 * - Error logging to Supabase event_stats
 * - Never gets stuck in LOADING state
 * 
 * @param url - The image URL to load
 * @param options - Configuration options
 * @returns Object with loading state, image element, and error
 */
export const useImageCache = (
  url: string | null | undefined,
  options: {
    enabled?: boolean;
    retries?: number;
    timeout?: number;
    fallbackUrl?: string;
    useIntersectionObserver?: boolean;
  } = {}
) => {
  const {
    enabled = true,
    retries = 2,
    timeout = 5000,
    fallbackUrl = FALLBACK_ASSET_URL,
    useIntersectionObserver = false
  } = options;

  const [state, setState] = useState<LoadingState>(LoadingState.IDLE);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(url || null);
  
  const attemptRef = useRef(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasSuccessfulImageRef = useRef(false); // Track if we've successfully loaded an image

  // Reset state when URL changes
  useEffect(() => {
    if (url !== currentUrl) {
      setCurrentUrl(url || null);
      setState(LoadingState.IDLE);
      setImage(null);
      setError(null);
      attemptRef.current = 0;
      hasSuccessfulImageRef.current = false; // Reset successful image flag
      
      // Cleanup previous abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [url, currentUrl]);

  // Load image function
  const loadImage = useCallback(async (targetUrl: string, attempt: number): Promise<void> => {
    if (!enabled || !targetUrl) {
      setState(LoadingState.IDLE);
      return;
    }

    // Only set to LOADING if we don't already have a successful image
    // This prevents blinking when retrying after a successful load
    if (!hasSuccessfulImageRef.current) {
      setState(LoadingState.LOADING);
    }
    setError(null);

    try {
      // Use request queue to limit concurrent requests
      const img = await requestQueue.enqueue(() => loadImageWithTimeout(targetUrl, timeout));
      
      // Success - image loaded
      setImage(img);
      setState(LoadingState.SUCCESS);
      hasSuccessfulImageRef.current = true; // Mark that we've successfully loaded
      attemptRef.current = 0; // Reset attempt counter on success
    } catch (err: any) {
      const errorMessage = err?.message || 'Unknown error';
      
      // Log failure to Supabase
      logAssetFailure(targetUrl, errorMessage).catch(() => {
        // Silent failure
      });

      // Check if we should retry
      if (attempt < retries) {
        attemptRef.current = attempt + 1;
        // Retry with exponential backoff
        // Don't change state during retry if we already have an image - prevents blinking
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 5000);
        setTimeout(() => {
          loadImage(targetUrl, attempt + 1);
        }, backoffDelay);
      } else {
        // All retries exhausted - try fallback
        if (fallbackUrl && targetUrl !== fallbackUrl) {
          console.warn(`Asset failed after ${attempt + 1} attempts, using fallback:`, targetUrl);
          attemptRef.current = 0;
          loadImage(fallbackUrl, 0);
        } else {
          // Fallback also failed or no fallback - only set to ERROR if we don't have an image
          // This prevents clearing a successfully loaded image
          if (!hasSuccessfulImageRef.current) {
            setState(LoadingState.ERROR);
            setError(err);
            setImage(null);
          }
        }
      }
    }
  }, [enabled, timeout, retries, fallbackUrl]);

  // Intersection Observer setup for lazy loading
  useEffect(() => {
    if (!useIntersectionObserver || !containerRef.current || !currentUrl) {
      // If not using intersection observer, load immediately
      if (currentUrl && enabled && state === LoadingState.IDLE) {
        loadImage(currentUrl, 0);
      }
      return;
    }

    // Set up Intersection Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && state === LoadingState.IDLE) {
            // Element is about to enter viewport - start loading
            loadImage(currentUrl, 0);
            // Disconnect observer after first trigger
            if (observerRef.current) {
              observerRef.current.disconnect();
              observerRef.current = null;
            }
          }
        });
      },
      {
        rootMargin: '50px' // Start loading 50px before entering viewport
      }
    );

    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [currentUrl, enabled, useIntersectionObserver, state, loadImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    image,
    error,
    isLoading: state === LoadingState.LOADING,
    isSuccess: state === LoadingState.SUCCESS,
    isError: state === LoadingState.ERROR,
    containerRef: useIntersectionObserver ? containerRef : undefined
  };
};
