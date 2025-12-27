
import React from 'react';
import { Emote } from '../types';
import { getEmoteUrl } from '../services/supabase';

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
  const emoteData = remoteEmotes.find(e => e.trigger_code === trigger);
  
  const sizeConfig = {
    sm: { dims: 'w-6 h-6', text: 'text-xl' },
    md: { dims: 'w-10 h-10', text: 'text-3xl' },
    lg: { dims: 'w-full h-full', text: 'text-5xl' },
    xl: { dims: 'w-full h-full', text: 'text-7xl' }
  };

  const { dims: dimClass, text: textClass } = sizeConfig[size];

  // If it's not a trigger code, render as centered emoji text (legacy/bot fallback)
  if (!trigger.startsWith(':') || !trigger.endsWith(':')) {
    return (
      <div className={`${className} ${dimClass} flex items-center justify-center overflow-hidden aspect-square`}>
        <span className={`${textClass} leading-none select-none flex items-center justify-center`}>{trigger}</span>
      </div>
    );
  }

  // Determine the URL with cache busting (v=3)
  const url = emoteData?.file_path 
    ? `https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/${emoteData.file_path}?v=3` 
    : getEmoteUrl(trigger);

  if (!url) {
    return (
      <div className={`${className} ${dimClass} flex items-center justify-center overflow-hidden aspect-square`}>
        <span className={`${textClass} leading-none select-none flex items-center justify-center`}>{EMOJI_FALLBACK[trigger] || '👤'}</span>
      </div>
    );
  }

  return (
    <div className={`${className} ${dimClass} flex items-center justify-center relative overflow-hidden rounded-full p-0 bg-transparent aspect-square`}>
      <img 
        src={url} 
        alt={trigger}
        className="w-full h-full object-cover object-center transform scale-[1.5] transition-transform duration-500 hover:scale-[1.6] shrink-0"
        style={{ 
          imageRendering: 'auto',
          backgroundColor: 'transparent',
        }}
        onError={(e) => {
          // Fallback to centered emoji if storage fetch fails
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const span = document.createElement('span');
            span.className = `${textClass} leading-none select-none flex items-center justify-center h-full w-full`;
            span.innerText = EMOJI_FALLBACK[trigger] || '👤';
            parent.appendChild(span);
          }
        }}
      />
    </div>
  );
};
