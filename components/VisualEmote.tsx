
import React from 'react';
import { Emote } from '../types';
import { getEmoteUrl, supabase } from '../services/supabase';

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
  }, [trigger, emoteData?.file_path]);

  // If it's not a trigger code, render as centered emoji text (legacy/bot fallback)
  if (!trigger.startsWith(':') || !trigger.endsWith(':')) {
    return (
      <div className={`${className} ${dimClass} flex items-center justify-center overflow-hidden aspect-square`}>
        <span className={`${textClass} leading-none select-none flex items-center justify-center`}>{trigger}</span>
      </div>
    );
  }

  // Determine the URL using Supabase's getPublicUrl to properly handle nested folders
  // file_path should include folder structure if in subfolder (e.g., "round_3/filename.png")
  const url = React.useMemo(() => {
    if (emoteData?.file_path && emoteData.file_path.trim() !== '') {
      // Use Supabase's getPublicUrl method which properly handles nested folders
      try {
        // Ensure file_path doesn't have leading slashes
        const cleanPath = emoteData.file_path.replace(/^\//, '').trim();
        const { data, error: urlError } = supabase.storage.from('emotes').getPublicUrl(cleanPath);
        
        if (urlError) {
          console.error(`❌ VisualEmote: getPublicUrl error for "${trigger}":`, urlError);
        }
        
        if (data?.publicUrl) {
          // Add cache busting - getPublicUrl might already return a URL with query params
          const separator = data.publicUrl.includes('?') ? '&' : '?';
          const finalUrl = `${data.publicUrl}${separator}v=9`;
          
          // Log for problematic emotes
          const problematicTriggers = [':game_over:', ':doge_focus:', ':lunar_new_year:', ':the_mooner:'];
          if (problematicTriggers.includes(trigger.toLowerCase())) {
            console.log(`🔗 VisualEmote: Generated URL for "${trigger}":`, {
              file_path: cleanPath,
              publicUrl: data.publicUrl,
              finalUrl,
              method: 'getPublicUrl'
            });
          }
          
          return finalUrl;
        }
        // Fallback to manual construction if getPublicUrl fails
        console.warn(`⚠️ VisualEmote: getPublicUrl returned no data for "${trigger}", using manual URL`);
        // URL-encode the path segments to handle special characters and spaces
        const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
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
        // Fallback to manual construction
        const cleanPath = emoteData.file_path.replace(/^\//, '');
        return `https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/${cleanPath}?v=8`;
      }
    }
    return getEmoteUrl(trigger);
  }, [emoteData?.file_path, trigger]);

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
    } else if (emoteData) {
      // Log successful match for debugging
      if (isProblematic) {
        const fullUrl = emoteData.file_path 
          ? `https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/${emoteData.file_path}?v=6`
          : 'N/A';
        console.log(`✅ VisualEmote: Found emote for "${trigger}"`, {
          name: emoteData.name,
          trigger_code: emoteData.trigger_code,
          file_path: emoteData.file_path,
          url,
          fullUrl,
          hasValidPath: emoteData.file_path && typeof emoteData.file_path === 'string' && emoteData.file_path.trim() !== ''
        });
      }
    }
  }, [trigger, emoteData, remoteEmotes.length]);

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
    return (
      <div className={`${className} ${dimClass} flex items-center justify-center overflow-hidden aspect-square bg-white/5 rounded-full border border-white/10`}>
        <span className={`${textClass} leading-none select-none flex items-center justify-center`}>
          {EMOJI_FALLBACK[trigger] || '👤'}
        </span>
      </div>
    );
  }

  return (
    <div className={`${className} ${dimClass} flex items-center justify-center relative overflow-hidden rounded-full p-0 bg-transparent aspect-square`}>
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-full border border-white/10">
          <span className={`${textClass} leading-none select-none opacity-50`}>
            {EMOJI_FALLBACK[trigger] || emoteData?.fallback_emoji || '👤'}
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
              suggestedFix: `Check if file exists at: https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/${emoteData?.file_path}`
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
