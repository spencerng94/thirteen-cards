// Service Worker for XIII App - Static Asset Caching
// Cache Version - Update this to trigger cache invalidation
const CACHE_VERSION = "v1";
const STATIC_CACHE_NAME = `xiii-static-assets-${CACHE_VERSION}`;
const LOGO_CACHE_NAME = `xiii-logo-${CACHE_VERSION}`;

// Get Supabase URL from environment or use default
const SUPABASE_URL = 'https://spaxxexmyiczdrbikdjp.supabase.co';

// Assets to cache on install - Full URLs for Supabase storage
const STATIC_ASSETS = [
  // Emotes - Top 10 most used
  `${SUPABASE_URL}/storage/v1/object/public/emotes/shiba_card.webp`,
  `${SUPABASE_URL}/storage/v1/object/public/emotes/blushing_card.webp`,
  `${SUPABASE_URL}/storage/v1/object/public/emotes/sunglasses_card.webp`,
  `${SUPABASE_URL}/storage/v1/object/public/emotes/annoyed_card.webp`,
  `${SUPABASE_URL}/storage/v1/object/public/emotes/seductive_card.webp`,
  `${SUPABASE_URL}/storage/v1/object/public/emotes/chinese_card.webp`,
  `${SUPABASE_URL}/storage/v1/object/public/emotes/final_boss_card.webp`,
  `${SUPABASE_URL}/storage/v1/object/public/emotes/devil_card.webp`,
  `${SUPABASE_URL}/storage/v1/object/public/emotes/girly_card.webp`,
  `${SUPABASE_URL}/storage/v1/object/public/emotes/blushing_card_2.webp`,
];

// Install event - Pre-cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker, version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      // Cache assets that are available
      return Promise.allSettled(
        STATIC_ASSETS.map((url) => {
          return fetch(url).then((response) => {
            if (response.ok) {
              return cache.put(url, response);
            }
          }).catch((err) => {
            console.warn('[SW] Failed to cache:', url, err);
          });
        })
      );
    })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker, version:', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (cacheName.startsWith('xiii-static-assets-') && cacheName !== STATIC_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          if (cacheName.startsWith('xiii-logo-') && cacheName !== LOGO_CACHE_NAME) {
            console.log('[SW] Deleting old logo cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  return self.clients.claim();
});

// Handle messages from client (for pre-loading)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_URL') {
    const url = event.data.url;
    event.waitUntil(
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return fetch(url).then((response) => {
          if (response.ok) {
            return cache.put(url, response);
          }
        }).catch((err) => {
          console.warn('[SW] Failed to cache URL from message:', url, err);
        });
      })
    );
  }
});

// Fetch event - Cache strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Allow Supabase storage requests (cross-origin)
  const isSupabaseStorage = url.hostname.includes('supabase.co') && url.pathname.includes('/storage/');
  
  // Skip cross-origin requests (except Supabase storage)
  if (!url.origin.includes(self.location.origin) && !isSupabaseStorage) {
    return;
  }
  
  // Cache-First Strategy for static assets (emotes, textures, images)
  const isStaticAsset = 
    url.pathname.match(/\.(png|svg|webp|jpg|jpeg)$/i) ||
    url.pathname.includes('/storage/v1/object/public/emotes/') ||
    url.pathname.includes('/storage/v1/object/public/') ||
    url.hostname.includes('supabase.co') && url.pathname.includes('/storage/') ||
    url.pathname.includes('image_7b62ec') || // Emerald Felt texture
    url.pathname.includes('image_'); // Other texture images
  
  if (isStaticAsset) {
    // Stale-While-Revalidate for logo
    if (url.pathname.includes('image_1f536c') || url.pathname.includes('logo')) {
      event.respondWith(
        caches.open(LOGO_CACHE_NAME).then((cache) => {
          return cache.match(event.request).then((cachedResponse) => {
            // Return cached version immediately
            const fetchPromise = fetch(event.request).then((networkResponse) => {
              // Update cache with fresh version
              if (networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            }).catch(() => {
              // If network fails, return cached version
              return cachedResponse;
            });
            
            // Return cached version immediately, update in background
            return cachedResponse || fetchPromise;
          });
        })
      );
      return;
    }
    
    // Cache-First for all other static assets
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Serve from cache immediately for 60FPS snappy feel
            return cachedResponse;
          }
          
          // If not in cache, fetch and cache
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return a placeholder or fallback if fetch fails
            return new Response('Asset not available', { status: 404 });
          });
        });
      })
    );
    return;
  }
});
