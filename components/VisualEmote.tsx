
import React, { useMemo } from 'react';
import { Emote } from '../types';
import { getEmoteUrl, supabase } from '../services/supabase';
import { getWebpPath } from '../utils/imagePath';
import { CachedImage } from './CachedImage';

interface VisualEmoteProps {
  trigger: string;
  remoteEmotes?: Emote[];
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  useLazyLoading?: boolean; // Enable Intersection Observer for lazy loading
}

const EMOJI_FALLBACK: Record<string, string> = {
  ':smile:': '😊', ':blush:': '😊', ':heart_eyes:': '😍', ':cool:': '😎',
  ':money_mouth_face:': '🤑', ':robot:': '🤖', ':devil:': '😈', ':annoyed:': '😒',
  ':girly:': '💅', ':shiba:': '🐕'
};

/**
 * VisualEmote handles rendering PNG assets from Supabase Storage.
 * Now uses useImageCache hook for robust asset recovery with timeout, retry, and fallback.
 */
export const VisualEmote: React.FC<VisualEmoteProps> = ({ 
  trigger, 
  remoteEmotes = [], 
  className = "",
  size = 'md',
  useLazyLoading = false
}) => {
  const emoteData = remoteEmotes.find(e => e.trigger_code === trigger);
  
  const sizeConfig = {
    sm: { dims: 'w-6 h-6', text: 'text-xl' },
    md: { dims: 'w-10 h-10', text: 'text-3xl' },
    lg: { dims: 'w-full h-full', text: 'text-5xl' },
    xl: { dims: 'w-full h-full', text: 'text-7xl' }
  };

  const { dims: dimClass, text: textClass } = sizeConfig[size];

  // Determine the URL using Supabase's getPublicUrl to properly handle nested folders
  // file_path should include folder structure if in subfolder (e.g., "round_3/filename.png")
  // Convert .png to .webp for better performance
  const url = useMemo(() => {
    if (emoteData?.file_path && emoteData.file_path.trim() !== '') {
      // Use Supabase's getPublicUrl method which properly handles nested folders
      try {
        // Ensure file_path doesn't have leading slashes and convert to WebP
        const cleanPath = emoteData.file_path.replace(/^\//, '').trim();
        const webpPath = getWebpPath(cleanPath);
        const { data, error: urlError } = supabase.storage.from('emotes').getPublicUrl(webpPath);
        
        if (urlError) {
          console.error(`❌ VisualEmote: getPublicUrl error for "${trigger}":`, urlError);
        }
        
        if (data?.publicUrl) {
          // Add cache busting - getPublicUrl might already return a URL with query params
          const separator = data.publicUrl.includes('?') ? '&' : '?';
          const finalUrl = `${data.publicUrl}${separator}v=9`;
          return finalUrl;
        }
        // Fallback to manual construction if getPublicUrl fails
        const encodedPath = webpPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
        const manualUrl = `https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/${encodedPath}?v=9`;
        return manualUrl;
      } catch (error) {
        console.error(`❌ VisualEmote: Error getting public URL for "${trigger}":`, error);
        // Fallback to manual construction (convert to WebP)
        const cleanPath = emoteData.file_path.replace(/^\//, '');
        const webpPath = getWebpPath(cleanPath);
        return `https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/${webpPath}?v=8`;
      }
    }
    return getEmoteUrl(trigger);
  }, [emoteData?.file_path, trigger]);

  // Get fallback emoji
  const getFallbackEmoji = () => {
    if (EMOJI_FALLBACK[trigger]) {
      return EMOJI_FALLBACK[trigger];
    }
    // Only use database fallback if it's safe (not an apple emoji)
    const dbFallback = emoteData?.fallback_emoji?.trim();
    if (dbFallback) {
      const hasAppleEmoji = dbFallback.includes('🍎') || dbFallback.includes('🍏');
      if (!hasAppleEmoji) {
        return dbFallback;
      }
    }
    return '👤';
  };

  const safeFallback = getFallbackEmoji();

  // If it's not a trigger code, render as centered emoji text (legacy/bot fallback)
  if (!trigger.startsWith(':') || !trigger.endsWith(':')) {
    return (
      <div className={`${className} ${dimClass} flex items-center justify-center overflow-hidden aspect-square`}>
        <span className={`${textClass} leading-none select-none flex items-center justify-center`}>{trigger}</span>
      </div>
    );
  }

  // If no URL, show emoji fallback
  if (!url) {
    return (
      <div className={`${className} ${dimClass} flex items-center justify-center overflow-hidden aspect-square bg-white/5 rounded-full border border-white/10`}>
        <span className={`${textClass} leading-none select-none flex items-center justify-center`}>
          {safeFallback}
        </span>
      </div>
    );
  }

  // Use CachedImage component for persistent caching
  return (
    <div className={`${className} ${dimClass} flex items-center justify-center relative overflow-hidden rounded-full p-0 bg-transparent aspect-square`}>
      <CachedImage
        src={url}
        alt={trigger}
        className="w-full h-full object-cover object-center transform scale-[1.3] transition-all duration-500 hover:scale-[1.35] shrink-0"
        loading={useLazyLoading ? 'lazy' : 'eager'}
        style={{ 
          imageRendering: 'auto',
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
};
