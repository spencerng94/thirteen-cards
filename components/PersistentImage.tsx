import React, { useState, useEffect, useRef } from 'react';

interface PersistentImageProps {
  src: string;
  alt?: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean; // For Mythic/Legendary items
}

/**
 * PersistentImage component that caches images in CacheStorage
 * Falls back to IndexedDB if CacheStorage is unavailable
 */
export function PersistentImage({
  src,
  alt = '',
  className = '',
  loading = 'lazy',
  onLoad,
  onError,
  priority = false
}: PersistentImageProps) {
  // Cache constants - defined inside component to avoid top-level initialization
  const CACHE_NAME = 'xiii-shop-images';
  const CACHE_VERSION = 1;
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const cacheCheckedRef = useRef(false);

  // Generate cache key from URL
  const getCacheKey = (url: string): string => {
    try {
      return url.split('?')[0]; // Remove query params for cache key
    } catch {
      return url;
    }
  };

  // Check CacheStorage first, then IndexedDB
  const getCachedImage = async (url: string): Promise<string | null> => {
    const cacheKey = getCacheKey(url);

    // Try CacheStorage first (faster, better for images)
    if ('caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          return URL.createObjectURL(blob);
        }
      } catch (error) {
        console.warn('CacheStorage access failed:', error);
      }
    }

    // Fallback to IndexedDB
    if ('indexedDB' in window) {
      try {
        return new Promise((resolve) => {
          const request = indexedDB.open(CACHE_NAME, CACHE_VERSION);
          
          request.onerror = () => resolve(null);
          
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const getRequest = store.get(cacheKey);
            
            getRequest.onsuccess = () => {
              if (getRequest.result) {
                const blob = getRequest.result.blob;
                resolve(URL.createObjectURL(blob));
              } else {
                resolve(null);
              }
            };
            
            getRequest.onerror = () => resolve(null);
          };
          
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('images')) {
              db.createObjectStore('images');
            }
          };
        });
      } catch (error) {
        console.warn('IndexedDB access failed:', error);
      }
    }

    return null;
  };

  // Cache image in both CacheStorage and IndexedDB
  const cacheImage = async (url: string, blob: Blob): Promise<void> => {
    const cacheKey = getCacheKey(url);

    // Cache in CacheStorage
    if ('caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(cacheKey, new Response(blob, {
          headers: { 'Content-Type': blob.type }
        }));
      } catch (error) {
        console.warn('Failed to cache in CacheStorage:', error);
      }
    }

    // Also cache in IndexedDB as backup
    if ('indexedDB' in window) {
      try {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(CACHE_NAME, CACHE_VERSION);
          
          request.onerror = () => reject(request.error);
          
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            store.put({ blob }, cacheKey);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
          };
          
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('images')) {
              db.createObjectStore('images');
            }
          };
        });
      } catch (error) {
        console.warn('Failed to cache in IndexedDB:', error);
      }
    }
  };

  // Load image with caching
  useEffect(() => {
    if (!src) return;

    let cancelled = false;
    setIsLoading(true);
    setHasError(false);

    const loadImage = async () => {
      try {
        // Check cache first
        const cachedUrl = await getCachedImage(src);
        
        if (cachedUrl && !cancelled) {
          setImageSrc(cachedUrl);
          setIsLoading(false);
          if (onLoad) onLoad();
          return;
        }

        // If not cached, fetch and cache
        if (!cancelled) {
          const response = await fetch(src, {
            mode: 'cors',
            cache: 'no-cache'
          });

          if (!response.ok) {
            throw new Error(`Failed to load image: ${response.statusText}`);
          }

          const blob = await response.blob();
          
          // Cache the image
          await cacheImage(src, blob);
          
          if (!cancelled) {
            const objectUrl = URL.createObjectURL(blob);
            setImageSrc(objectUrl);
            setIsLoading(false);
            if (onLoad) onLoad();
          }
        }
      } catch (error) {
        console.error('Error loading image:', error);
        if (!cancelled) {
          setHasError(true);
          setIsLoading(false);
          if (onError) onError();
        }
      }
    };

    // Priority images load immediately, others can be deferred
    if (priority || loading === 'eager') {
      loadImage();
    } else {
      // Use requestIdleCallback for non-priority images
      if ('requestIdleCallback' in window) {
        requestIdleCallback(loadImage, { timeout: 2000 });
      } else {
        setTimeout(loadImage, 100);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [src, loading, priority, onLoad, onError]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  if (hasError) {
    return (
      <div className={`${className} flex items-center justify-center bg-black/20 text-white/40`}>
        <span className="text-xs">Failed to load</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc || (priority ? src : undefined)}
      alt={alt}
      className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
      loading={priority ? 'eager' : loading}
      onLoad={() => {
        setIsLoading(false);
        if (onLoad) onLoad();
      }}
      onError={() => {
        setHasError(true);
        setIsLoading(false);
        if (onError) onError();
      }}
    />
  );
}
