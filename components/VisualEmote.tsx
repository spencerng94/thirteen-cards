
import React from 'react';
import { Emote } from '../types';
import { getEmoteUrl, supabase } from '../services/supabase';
import { getWebpPath } from '../utils/imagePath';

interface VisualEmoteProps {
  trigger: string;
  remoteEmotes?: Emote[];
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const EMOJI_FALLBACK: Record<string, string> = {
  ':smile:': '😊', ':blush:': '😊', ':heart_eyes:': '😍', ':cool:': '😎',
  ':money_mouth_face:': '🤑', ':robot:': '🤖', ':devil:': '😈', ':annoyed:': '😒',
  ':girly:': '💅', ':shiba:': '🐕'
};

/**
 * VisualEmote handles rendering PNG assets from Supabase Storage.
 */
export const VisualEmote: React.FC<VisualEmoteProps> = ({ 
  trigger, 
  remoteEmotes = [], 
  className = "",
  size = 'md'
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  // If the primary URL fails, allow a one-time retry with a manually constructed URL
  const [overrideUrl, setOverrideUrl] = React.useState<string | null>(null);
  
  const emoteData = remoteEmotes.find(e => e.trigger_code === trigger);
  
  const sizeConfig = {
    sm: { dims: 'w-6 h-6', text: 'text-xl' },
    md: { dims: 'w-10 h-10', text: 'text-3xl' },
    lg: { dims: 'w-full h-full', text: 'text-5xl' },
    xl: { dims: 'w-full h-full', text: 'text-7xl' }
  };

  const { dims: dimClass, text: textClass } = sizeConfig[size];

  // Reset error state when trigger or emoteData changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    setOverrideUrl(null);
  }, [trigger, emoteData?.file_path]);

  // Determine the URL using Supabase's getPublicUrl to properly handle nested folders
  // file_path should include folder structure if in subfolder (e.g., "round_3/filename.png")
  // Convert .png to .webp for better performance
  const url = React.useMemo(() => {
    if (overrideUrl) return overrideUrl;
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
          
          // Log for problematic emotes
          return finalUrl;
        }
        // Fallback to manual construction if getPublicUrl fails
        console.warn(`⚠️ VisualEmote: getPublicUrl returned no data for "${trigger}", using manual URL`);
        // URL-encode the path segments to handle special characters and spaces
        const encodedPath = webpPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
        const manualUrl = `https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/${encodedPath}?v=9`;
        
        const problematicTriggers = [':game_over:', ':doge_focus:', ':lunar_new_year:', ':the_mooner:'];
        if (problematicTriggers.includes(trigger.toLowerCase())) {
          console.warn(`⚠️ VisualEmote: Using manual URL for "${trigger}":`, {
            file_path: cleanPath,
            encodedPath,
            manualUrl,
            reason: 'getPublicUrl returned no data'
          });
        }
        
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
  }, [emoteData?.file_path, trigger, overrideUrl]);

  // Debug logging for missing emotes (only log once per trigger to avoid spam)
  React.useEffect(() => {
    const problematicTriggers = [':game_over:', ':doge_focus:', ':lunar_new_year:', ':the_mooner:'];
    const isProblematic = problematicTriggers.includes(trigger.toLowerCase());
    
    if (!emoteData && remoteEmotes.length > 0 && trigger) {
      if (isProblematic) {
        console.error(`❌ VisualEmote: CRITICAL - No emote data found for "${trigger}"`, {
          availableTriggers: remoteEmotes.map(e => `${e.name} (${e.trigger_code})`),
          remoteEmotesCount: remoteEmotes.length,
          searchingFor: trigger
        });
      } else {
        console.warn(`⚠️ VisualEmote: No emote data found for trigger "${trigger}"`, {
          availableTriggers: remoteEmotes.slice(0, 5).map(e => `${e.name} (${e.trigger_code})`),
          remoteEmotesCount: remoteEmotes.length,
          searchingFor: trigger
        });
      }
    }
  }, [trigger, emoteData, remoteEmotes.length]);

  // If it's not a trigger code, render as centered emoji text (legacy/bot fallback)
  // This check must come AFTER all hooks are called
  if (!trigger.startsWith(':') || !trigger.endsWith(':')) {
    return (
      <div className={`${className} ${dimClass} flex items-center justify-center overflow-hidden aspect-square`}>
        <span className={`${textClass} leading-none select-none flex items-center justify-center`}>{trigger}</span>
      </div>
    );
  }

  // Don't show fallback emoji if we have valid emote data - show a placeholder instead
  if (!url || imageError) {
    // If we have emote data but image failed, show a placeholder (not emoji)
    if (emoteData && emoteData.file_path) {
      return (
        <div className={`${className} ${dimClass} flex items-center justify-center overflow-hidden aspect-square bg-gradient-to-br from-yellow-500/20 via-amber-500/20 to-orange-500/20 rounded-full border-2 border-yellow-500/30`}>
          <div className="text-center">
            <div className="text-xs font-bold text-yellow-400/60 uppercase tracking-wider">Loading...</div>
            <div className="text-[8px] text-yellow-500/40 mt-1 truncate max-w-full px-1">{emoteData.name}</div>
          </div>
        </div>
      );
    }
    // Only show emoji fallback if we don't have emote data at all
    // Always use hardcoded fallback, never database fallback (which might be apple emoji)
    const safeFallback = EMOJI_FALLBACK[trigger] || '👤';
    return (
      <div className={`${className} ${dimClass} flex items-center justify-center overflow-hidden aspect-square bg-white/5 rounded-full border border-white/10`}>
        <span className={`${textClass} leading-none select-none flex items-center justify-center`}>
          {safeFallback}
        </span>
      </div>
    );
  }

  // Get the proper fallback emoji - prefer hardcoded fallback over database fallback
  const getFallbackEmoji = () => {
    // First check hardcoded fallbacks (these are reliable and never Apple emojis)
    if (EMOJI_FALLBACK[trigger]) {
      return EMOJI_FALLBACK[trigger];
    }
    // Only use database fallback if it's safe (not an apple emoji)
    const dbFallback = emoteData?.fallback_emoji?.trim();
    if (dbFallback) {
      // Check for Apple emoji characters - be very strict
      // Apple emoji (🍎) is U+1F34E, but we should check for any suspicious single-character emojis
      // that might be Apple-specific renderings
      const hasAppleEmoji = dbFallback.includes('🍎') || 
                           dbFallback.includes('🍏') ||
                           // If it's a single emoji character and not in our safe list, be cautious
                           (dbFallback.length <= 2 && !EMOJI_FALLBACK[trigger]);
      
      if (!hasAppleEmoji) {
        return dbFallback;
      }
      // If database fallback is Apple emoji, log it and use default
      console.warn(`⚠️ VisualEmote: Database fallback_emoji for "${trigger}" contains Apple emoji, using safe fallback instead`);
    }
    // Default fallback - never use Apple emojis
    return '👤';
  };

  return (
    <div className={`${className} ${dimClass} flex items-center justify-center relative overflow-hidden rounded-full p-0 bg-transparent aspect-square`}>
      {!imageLoaded && !imageError && url && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-full border border-white/10">
          <span className={`${textClass} leading-none select-none opacity-50`}>
            {/* During loading, only use hardcoded safe fallbacks, never database fallback */}
            {EMOJI_FALLBACK[trigger] || '👤'}
          </span>
        </div>
      )}
      <img 
        src={url} 
        alt={trigger}
        className={`w-full h-full object-cover object-center transform scale-[1.5] transition-all duration-500 hover:scale-[1.6] shrink-0 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          imageRendering: 'auto',
          backgroundColor: 'transparent',
        }}
        onLoad={() => {
          setImageLoaded(true);
          setImageError(false);
        }}
        onError={(e) => {
          const errorTarget = e.target as HTMLImageElement;
          const problematicTriggers = [':game_over:', ':doge_focus:', ':lunar_new_year:', ':the_mooner:'];
          const isProblematic = problematicTriggers.includes(trigger.toLowerCase());
          // One-time manual retry with encoded path and cache-bust to avoid showing Apple emoji fallback
          if (!overrideUrl && emoteData?.file_path) {
            const cleanPath = emoteData.file_path.replace(/^\//, '').trim();
            const webpPath = getWebpPath(cleanPath);
            const encodedPath = webpPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
            const retryUrl = `https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/${encodedPath}?v=10&retry=${Date.now()}`;
            console.warn(`⚠️ VisualEmote: Retrying with manual URL for "${trigger}" after load error`, { retryUrl, originalUrl: url });
            setOverrideUrl(retryUrl);
            setImageError(false);
            setImageLoaded(false);
            return;
          }
          
          if (isProblematic) {
            console.error(`❌ VisualEmote: CRITICAL - Failed to load image for "${trigger}"`, {
              url,
              emoteData: emoteData ? {
                name: emoteData.name,
                trigger_code: emoteData.trigger_code,
                file_path: emoteData.file_path,
                hasValidPath: emoteData.file_path && typeof emoteData.file_path === 'string' && emoteData.file_path.trim() !== ''
              } : null,
              imageSrc: errorTarget.src,
              naturalWidth: errorTarget.naturalWidth,
              naturalHeight: errorTarget.naturalHeight,
              error: 'Image failed to load - check file_path in database',
              fullUrl: errorTarget.src,
              suggestedFix: `Check if file exists at: https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/${emoteData?.file_path ? getWebpPath(emoteData.file_path) : ''}`
            });
            
            // Try to fetch the URL to see what the actual error is
            fetch(errorTarget.src)
              .then(async response => {
                const statusText = response.statusText;
                const responseText = await response.text().catch(() => 'Could not read response');
                console.error(`❌ HTTP Status for "${trigger}": ${response.status} ${statusText}`, {
                  url: errorTarget.src,
                  file_path: emoteData?.file_path,
                  responsePreview: responseText.substring(0, 200),
                  suggestion: response.status === 400 
                    ? '400 Bad Request - File path may be invalid or file may not exist. Check: 1) File name matches exactly (case-sensitive), 2) File exists in Supabase storage, 3) File path in database is correct'
                    : response.status === 404
                    ? '404 Not Found - File does not exist at this path in Supabase storage bucket "emotes"'
                    : 'Unknown error - Check Supabase storage bucket permissions and file path'
                });
              })
              .catch(err => {
                console.error(`❌ Network error for "${trigger}":`, err);
              });
          } else {
            console.error(`❌ VisualEmote: Failed to load image for "${trigger}"`, {
              url,
              emoteData: emoteData ? {
                name: emoteData.name,
                trigger_code: emoteData.trigger_code,
                file_path: emoteData.file_path
              } : null,
              imageSrc: errorTarget.src
            });
          }
          setImageError(true);
          setImageLoaded(false);
        }}
      />
    </div>
  );
};
