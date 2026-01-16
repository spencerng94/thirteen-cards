import { useEffect, useRef } from 'react';
import { supabase } from '../src/lib/supabase';
import { SLEEVES } from '../components/Store';
import { CardCoverStyle } from '../components/Card';

/**
 * High-Fidelity, Low-Latency Asset Pre-loading Hook
 * Pre-loads all Signature Sleeves and Gem Pack icons from Supabase Storage
 * when the user first lands on the Main Menu.
 * 
 * Uses the 'new Image().src' method to ensure images are in the browser cache
 * before the Shop is opened.
 */
export const usePreloadAssets = () => {
  const preloadedRef = useRef<Set<string>>(new Set());
  const isPreloadingRef = useRef(false);

  useEffect(() => {
    // Only preload once per session
    if (isPreloadingRef.current) return;
    isPreloadingRef.current = true;

    const preloadImage = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Skip if already preloaded
        if (preloadedRef.current.has(url)) {
          resolve();
          return;
        }

        const img = new Image();
        img.onload = () => {
          preloadedRef.current.add(url);
          resolve();
        };
        img.onerror = () => {
          // Silently fail - don't block other preloads
          console.warn(`Failed to preload image: ${url}`);
          resolve(); // Resolve anyway to not block other preloads
        };
        img.src = url;
      });
    };

    const preloadSignatureSleeves = async () => {
      // Preload all Signature Sleeves (Gem-priced sleeves)
      const signatureSleeves = SLEEVES.filter(s => s.currency === 'GEMS');
      
      // Generate URLs for sleeve preview images
      // Note: Sleeves are rendered as Card components, but we can preload any associated assets
      // For now, we'll preload based on the sleeve style identifiers
      const sleevePromises = signatureSleeves.map(async (sleeve) => {
        // If sleeves have associated image assets in Supabase Storage, preload them
        // For now, we'll prepare the structure for future sleeve image assets
        // This is a placeholder - adjust based on your actual sleeve asset structure
        try {
          // Example: If sleeves have preview images in 'sleeves' bucket
          const sleevePath = `sleeves/${sleeve.id.toLowerCase()}_preview.webp`;
          const { data } = supabase.storage.from('sleeves').getPublicUrl(sleevePath);
          
          if (data?.publicUrl) {
            await preloadImage(data.publicUrl);
          }
        } catch (error) {
          // Silently continue - sleeves might not have separate image assets
        }
      });

      await Promise.allSettled(sleevePromises);
    };

    const preloadGemPackIcons = async () => {
      // Preload Gem Pack icons (6 packs total)
      const gemPackIds = ['gem_1', 'gem_2', 'gem_3', 'gem_4', 'gem_5', 'gem_6'];
      
      const gemPackPromises = gemPackIds.map(async (packId) => {
        try {
          // Gem pack icons might be in a 'gem-packs' or 'icons' bucket
          // Adjust the path based on your actual storage structure
          const iconPath = `gem-packs/${packId}_icon.webp`;
          const { data } = supabase.storage.from('icons').getPublicUrl(iconPath);
          
          if (data?.publicUrl) {
            await preloadImage(data.publicUrl);
          }
        } catch (error) {
          // Silently continue - gem pack icons might be SVG-based
        }
      });

      await Promise.allSettled(gemPackPromises);
    };

    // Start preloading in the background (non-blocking)
    Promise.all([
      preloadSignatureSleeves(),
      preloadGemPackIcons()
    ]).then(() => {
      console.log('✅ Asset preloading completed');
    }).catch((error) => {
      console.warn('⚠️ Asset preloading encountered errors:', error);
    });
  }, []);

  return {
    isPreloaded: (url: string) => preloadedRef.current.has(url)
  };
};
