import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardCoverStyle } from './Card';
import { BrandLogo } from './BrandLogo';
import { AiDifficulty, UserProfile, BackgroundTheme, Emote, Rank, Suit, HubTab } from '../types';
import { SignOutButton } from './SignOutButton';
import { UserBar } from './UserBar';
import { calculateLevel, getXpForLevel, buyItem, DEFAULT_AVATARS, PREMIUM_AVATARS, getAvatarName, fetchEmotes, updateProfileSettings, fetchFinishers, buyFinisher, equipFinisher, Finisher } from '../services/supabase';
import { PREMIUM_BOARDS, BoardPreview, BoardSurface } from './UserHub';
import { SleeveArenaPreview, SUPER_PRESTIGE_SLEEVE_IDS, SLEEVES as ALL_STORE_SLEEVES, SOVEREIGN_IDS, CurrencyIcon, canAfford, CardSleevePreview, BoardThemePreview } from './Store';
import { FinisherPreview } from './FinisherPreview';
import { v4 as uuidv4 } from 'uuid';
import { audioService } from '../services/audio';
import { VisualEmote } from './VisualEmote';
import { EventsModal } from './EventsModal';
import { ITEM_REGISTRY } from '../constants/ItemRegistry';
import { CopyUsername } from './CopyUsername';
import { GuestBanner } from './GuestBanner';

export type WelcomeTab = 'PROFILE' | 'CUSTOMIZE' | 'SETTINGS';

interface WelcomeScreenProps {
  onStart: (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL', coverStyle: CardCoverStyle, avatar: string, quickFinish?: boolean, difficulty?: AiDifficulty) => void;
  onSignOut: () => void;
  profile: UserProfile | null;
  onRefreshProfile: () => void;
  onRetryProfileFetch?: () => void;
  profileFetchError?: { message: string; isNetworkError: boolean } | null;
  isSyncingData?: boolean;
  onOpenHub: (tab: HubTab) => void;
  onOpenStore: (tab?: 'SLEEVES' | 'EMOTES' | 'BOARDS' | 'GEMS') => void;
  onOpenGemPacks: () => void;
  onOpenFriends: () => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  playerAvatar: string;
  setPlayerAvatar: (avatar: string) => void;
  cardCoverStyle: CardCoverStyle;
  setCardCoverStyle: (style: CardCoverStyle) => void;
  aiDifficulty: AiDifficulty;
  setAiDifficulty: (d: AiDifficulty) => void;
  quickFinish: boolean;
  setQuickFinish: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  backgroundTheme: BackgroundTheme;
  setBackgroundTheme: (t: BackgroundTheme) => void;
  isGuest?: boolean;
  sleeveEffectsEnabled: boolean;
  setSleeveEffectsEnabled: (v: boolean) => void;
  playAnimationsEnabled: boolean;
  setPlayAnimationsEnabled: (v: boolean) => void;
  autoPassEnabled?: boolean;
  setAutoPassEnabled?: (v: boolean) => void;
  onLinkAccount?: () => void;
}

const PRESTIGE_SLEEVE_IDS: CardCoverStyle[] = [
  'ROYAL_JADE', 'CRYSTAL_EMERALD', 'GOLDEN_IMPERIAL', 'VOID_ONYX', 
  'DRAGON_SCALE', 'NEON_CYBER', 'PIXEL_CITY_LIGHTS', 'AMETHYST_ROYAL', 
  'CHERRY_BLOSSOM_NOIR', 'AETHER_VOID'
];

const TAB_DESCRIPTIONS: Record<WelcomeTab, string> = {
  PROFILE: "Overview Player Stats",
  CUSTOMIZE: "Configure Game Visuals",
  SETTINGS: "Select Gameplay Settings"
};

const GridIcon1 = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" fillOpacity="0.4" stroke="currentColor" strokeWidth="2" /></svg>
);
const GridIcon2 = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1" /><rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1" /><rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1" /><rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1" /></svg>
);
const GridIcon4 = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="4" height="4" rx="0.5" /><rect x="10" y="2" width="4" height="4" rx="0.5" /><rect x="18" y="2" width="4" height="4" rx="0.5" /><rect x="2" y="10" width="4" height="4" rx="0.5" /><rect x="10" y="10" width="4" height="4" rx="0.5" /><rect x="18" y="10" width="4" height="4" rx="0.5" /><rect x="2" y="18" width="4" height="4" rx="0.5" /><rect x="10" y="18" width="4" height="4" rx="0.5" /><rect x="18" y="18" width="4" height="4" rx="0.5" /></svg>
);

// Finisher Icons
const ShibaSlamIcon: React.FC<{ className?: string; remoteEmotes?: Emote[] }> = ({ className = '', remoteEmotes = [] }) => (
  <VisualEmote trigger=":shiba:" remoteEmotes={remoteEmotes} size="xl" className={className} />
);

const EtherealBladeIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bladeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
        <stop offset="30%" stopColor="#E0E7FF" stopOpacity="1" />
        <stop offset="60%" stopColor="#C7D2FE" stopOpacity="1" />
        <stop offset="100%" stopColor="#A5B4FC" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="bladeGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
        <stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
        <stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
      </linearGradient>
      <radialGradient id="bladeGlow" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#E0E7FF" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#A5B4FC" stopOpacity="0" />
      </radialGradient>
      <filter id="bladeGlowFilter">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="60" cy="60" r="55" fill="url(#bladeGlow)" opacity="0.5" />
    <g filter="url(#bladeGlowFilter)" transform="translate(60, 60) rotate(-45)">
      <path d="M -25 -3 L 25 -3 L 20 0 L 25 3 L -25 3 Z" fill="url(#bladeGradient)" opacity="0.95" />
      <path d="M -20 -1.5 L 20 -1.5 L 18 0 L 20 1.5 L -20 1.5 Z" fill="#FFFFFF" opacity="0.8" />
      <rect x="-30" y="-4" width="8" height="8" rx="1" fill="url(#bladeGold)" />
      <rect x="-32" y="-2" width="4" height="4" rx="0.5" fill="#FFD700" />
    </g>
  </svg>
);

/* Card-Themed Icons for Navigation */
const ShopCardIcon = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10">
    <defs>
      <linearGradient id="shopCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <filter id="shopGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Spade symbol - refined and elegant */}
    <path 
      d="M50 20 C58 35 85 42 85 58 C85 70 75 78 65 78 C58 78 52 75 50 72 C48 75 42 78 35 78 C25 78 15 70 15 58 C15 42 42 35 50 20 Z M48 72 L38 88 H62 L52 72 Z" 
      fill="url(#shopCardGrad)" 
      filter="url(#shopGlow)"
      stroke="#fbbf24" 
      strokeWidth="1.5"
    />
    {/* Coin/Gold symbol inside spade */}
    <circle cx="50" cy="55" r="10" fill="url(#shopCardGrad)" stroke="#fbbf24" strokeWidth="1" opacity="0.9" />
    <text x="50" y="60" textAnchor="middle" fontSize="14" fontWeight="900" fill="#1a1a1a">$</text>
  </svg>
);

const EventsCardIcon = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10">
    <defs>
      <linearGradient id="eventsCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <filter id="eventsGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Heart symbol - proper card suit heart shape */}
    <path 
      d="M50 30 C50 30 35 20 25 25 C15 30 15 45 25 55 C35 65 50 80 50 80 C50 80 65 65 75 55 C85 45 85 30 75 25 C65 20 50 30 50 30 Z" 
      fill="url(#eventsCardGrad)" 
      filter="url(#eventsGlow)"
      stroke="#10b981" 
      strokeWidth="1.5"
    />
    {/* Star symbol inside heart */}
    <path 
      d="M50 55 L52 62 L59 62 L53 66 L55 73 L50 68 L45 73 L47 66 L41 62 L48 62 Z" 
      fill="#ffffff" 
      opacity="0.95"
      stroke="#10b981"
      strokeWidth="0.5"
    />
  </svg>
);

const ItemsCardIcon = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10">
    <defs>
      <linearGradient id="itemsCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ec4899" />
        <stop offset="100%" stopColor="#db2777" />
      </linearGradient>
      <filter id="itemsGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Diamond symbol - refined and elegant */}
    <path 
      d="M50 20 L75 50 L50 80 L25 50 Z" 
      fill="url(#itemsCardGrad)" 
      filter="url(#itemsGlow)"
      stroke="#ec4899" 
      strokeWidth="1.5"
    />
    {/* Small pips inside diamond - card motif */}
    <circle cx="50" cy="42" r="3.5" fill="#ffffff" opacity="0.95" />
    <circle cx="42" cy="50" r="2.5" fill="#ffffff" opacity="0.95" />
    <circle cx="58" cy="50" r="2.5" fill="#ffffff" opacity="0.95" />
  </svg>
);

const FriendsCardIcon = () => (
  <svg viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10">
    <defs>
      <linearGradient id="friendsCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <filter id="friendsGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Clubs symbol - proper card suit clubs shape with three rounded lobes and stem */}
    {/* Top left lobe */}
    <circle cx="35" cy="30" r="12" fill="url(#friendsCardGrad)" filter="url(#friendsGlow)" stroke="#3b82f6" strokeWidth="1.5" />
    {/* Top right lobe */}
    <circle cx="65" cy="30" r="12" fill="url(#friendsCardGrad)" filter="url(#friendsGlow)" stroke="#3b82f6" strokeWidth="1.5" />
    {/* Bottom lobe */}
    <circle cx="50" cy="50" r="12" fill="url(#friendsCardGrad)" filter="url(#friendsGlow)" stroke="#3b82f6" strokeWidth="1.5" />
    {/* Stem */}
    <path 
      d="M 50 62 L 50 85 L 45 85 L 45 75 L 50 75 Z" 
      fill="url(#friendsCardGrad)" 
      filter="url(#friendsGlow)"
      stroke="#3b82f6" 
      strokeWidth="1.5"
    />
    {/* Small white circles inside each lobe - card motif */}
    <circle cx="35" cy="30" r="5" fill="#ffffff" opacity="0.95" />
    <circle cx="65" cy="30" r="5" fill="#ffffff" opacity="0.95" />
    <circle cx="50" cy="50" r="5" fill="#ffffff" opacity="0.95" />
  </svg>
);

const SectionLabel: React.FC<{ children: React.ReactNode; rightElement?: React.ReactNode }> = ({ children, rightElement }) => (
  <div className="flex flex-col items-center mb-5 mt-2 px-2 w-full text-center">
    <div className="flex items-center justify-center gap-4 w-full">
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-yellow-500/40 to-yellow-500/60"></div>
      <span className="text-[11px] font-bold uppercase tracking-[0.4em] text-yellow-400/90 whitespace-nowrap px-5 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">{children}</span>
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-yellow-500/40 to-yellow-500/60"></div>
    </div>
    {rightElement && <div className="mt-5 flex justify-center w-full">{rightElement}</div>}
  </div>
);

const SelectionCircle: React.FC<{ 
  status: 'equipped' | 'owned' | 'locked'; 
  price?: number; 
  currency?: 'GOLD' | 'GEMS';
  onAction?: () => void;
  isEvent?: boolean;
}> = ({ status, price, currency = 'GOLD', onAction, isEvent }) => {
  if (status === 'locked') {
    return (
      <div className="absolute top-2 right-2 z-20 px-1.5 py-0.5 bg-black/60 text-yellow-500 text-[7px] font-black rounded-full border border-white/10 flex items-center gap-1">
        {isEvent ? (
            <span className="tracking-widest">EVENT</span>
        ) : (
            <>
                <CurrencyIcon type={currency} size="sm" />
                <span>{price}</span>
            </>
        )}
      </div>
    );
  }
  return (
    <div className="absolute top-2 right-2 z-20">
      {status === 'equipped' ? (
        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[7px] font-bold shadow-[0_0_8px_rgba(16,185,129,0.5)]">
          ✓
        </div>
      ) : (
        <div 
          onClick={(e) => { e.stopPropagation(); onAction?.(); }}
          className="w-4 h-4 rounded-full border-2 border-white/20 bg-transparent hover:border-white/50 cursor-pointer transition-colors duration-150"
        ></div>
      )}
    </div>
  );
};

const LuxuryButton: React.FC<{ 
  onClick: () => void; 
  variant: 'gold' | 'emerald' | 'ghost'; 
  label: string; 
  icon: string;
  sublabel?: string;
  slim?: boolean;
}> = ({ onClick, variant, label, icon, sublabel, slim }) => {
  const themes = {
    gold: { bg: "from-[#3d280a] via-[#b8860b] to-[#3d280a]", highlight: "from-[#b8860b] via-[#fbf5b7] to-[#8b6508]", text: "text-black", border: "border-yellow-300/40", accent: "text-yellow-900/60", shadow: "shadow-yellow-900/40" },
    emerald: { bg: "from-[#064e3b] via-[#059669] to-[#064e3b]", highlight: "from-[#059669] via-[#34d399] to-[#047857]", text: "text-white", border: "border-yellow-500/50", accent: "text-yellow-400/80", shadow: "shadow-emerald-950/60" },
    ghost: { bg: "from-black via-zinc-900 to-black", highlight: "from-zinc-900 via-zinc-800 to-black", text: "text-yellow-500/90", border: "border-yellow-500/20", accent: "text-yellow-600/40", shadow: "shadow-black/60" }
  };
  const theme = themes[variant];
  return (
    <button onClick={onClick} className={`group relative w-full ${slim ? 'py-3.5 px-3' : 'py-5 px-4'} rounded-2xl border transition-all duration-300 ResolutionEase active:scale-95 overflow-hidden ${theme.border} ${theme.shadow} shadow-[0_20px_40px_rgba(0,0,0,0.5)]`}>
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.bg} group-hover:scale-110 transition-transform duration-700`}></div>
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.highlight} opacity-90 transition-opacity duration-200 group-hover:opacity-100`}></div>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
            <span className={`text-[11px] md:text-[13px] font-black uppercase tracking-[0.25em] font-serif ${theme.text} drop-shadow-md whitespace-nowrap`}>{label}</span>
            <span className="text-lg md:text-xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300">{icon}</span>
        </div>
        {sublabel && (
          <span className={`text-[8px] font-black opacity-60 tracking-[0.3em] uppercase font-serif mt-1 ${theme.text} whitespace-nowrap overflow-hidden text-ellipsis max-w-full px-2`}>
            {sublabel}
          </span>
        )}
      </div>
    </button>
  );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onStart, onSignOut, profile, onRefreshProfile, onRetryProfileFetch, profileFetchError, isSyncingData = false, onOpenHub, onOpenStore, onOpenGemPacks, onOpenFriends,
  playerName, setPlayerName, playerAvatar, setPlayerAvatar,
  cardCoverStyle, setCardCoverStyle, aiDifficulty, setAiDifficulty,
  quickFinish, setQuickFinish, soundEnabled, setSoundEnabled,
  backgroundTheme, setBackgroundTheme, isGuest,
  sleeveEffectsEnabled, setSleeveEffectsEnabled,
  playAnimationsEnabled, setPlayAnimationsEnabled,
  autoPassEnabled = false, setAutoPassEnabled,
  onLinkAccount
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WelcomeTab>('PROFILE');
  const [customizeSubTab, setCustomizeSubTab] = useState<'SLEEVES' | 'BOARDS' | 'FINISHERS'>('SLEEVES');
  const [hideUnowned, setHideUnowned] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [finishers, setFinishers] = useState<Finisher[]>([]);
  const [previewSleeveStyle, setPreviewSleeveStyle] = useState<CardCoverStyle | null>(null);
  const [showSleevePreview, setShowSleevePreview] = useState(false);
  const [showBoardPreview, setShowBoardPreview] = useState(false);
  const [showFinisherPreview, setShowFinisherPreview] = useState(false);
  const [previewingFinisher, setPreviewingFinisher] = useState<Finisher | null>(null);
  const [density, setDensity] = useState<1 | 2 | 4>(2);
  const [eventsOpen, setEventsOpen] = useState(false);

  const [pendingPurchase, setPendingPurchase] = useState<{ 
      id: string, 
      name: string, 
      description: string,
      price: number, 
      currency: 'GOLD' | 'GEMS', 
      type: 'SLEEVE' | 'AVATAR' | 'BOARD' | 'FINISHER', 
      style?: CardCoverStyle,
      animation_key?: string,
      unlocked: boolean,
      equipped: boolean
  } | null>(null);

  // Hard Lock: Prevent multiple simultaneous fetches during re-renders
  // Ref-Lock: Track if we've already attempted a fetch (prevents double-fetch in React Strict Mode)
  const isFetchingEmotesRef = useRef(false);
  const isFetchingFinishersRef = useRef(false);
  const emotesFetchedRef = useRef(false);
  const finishersFetchedRef = useRef(false);
  const lastProfileIdRef = useRef<string | null>(null);
  const hasAttemptedFetchRef = useRef(false); // Ref-Lock: Prevent double-fetch in React Strict Mode

  useEffect(() => {
    // PART 1 FIX: Do not trigger fetchEmotes or fetchFinishers until profile.id is explicitly defined
    // For authenticated users, wait for profile.id; for guests, allow fetching
    const currentProfileId = profile?.id;
    const hasValidProfileId = currentProfileId && currentProfileId !== 'guest' && currentProfileId !== 'pending' && currentProfileId !== '';
    
    // For authenticated users, require a valid profile.id before fetching
    if (!isGuest && !hasValidProfileId) {
      console.log(`WelcomeScreen: Waiting for profile.id before fetching emotes/finishers - currentProfileId: ${currentProfileId}`);
      return;
    }
    
    // Ref-Lock: Prevent double-fetch in React Strict Mode
    // If we've already attempted a fetch for this profile ID, don't fetch again
    if (hasAttemptedFetchRef.current && currentProfileId === lastProfileIdRef.current) {
      console.log('WelcomeScreen: Already attempted fetch for this profile ID, skipping (React Strict Mode guard)');
      return;
    }
    
    // Update last profile ID and mark that we've attempted a fetch
    lastProfileIdRef.current = currentProfileId || null;
    
    // Only fetch if we haven't already fetched successfully
    if (emotesFetchedRef.current && finishersFetchedRef.current) {
      console.log('WelcomeScreen: Data already fetched successfully, skipping duplicate fetches');
      return;
    }
    
    // Mark that we've attempted a fetch (Ref-Lock for React Strict Mode)
    hasAttemptedFetchRef.current = true;
    
    console.log(`WelcomeScreen: Profile ID confirmed (${currentProfileId}), fetching emotes/finishers...`);
    
    // HARD LOCK: Fetch emotes only once, prevent multiple simultaneous fetches
    // Use global cache - if fetch is already in progress, it will return the same promise
    if (!emotesFetchedRef.current && !isFetchingEmotesRef.current) {
      isFetchingEmotesRef.current = true;
      console.log('WelcomeScreen: Fetching emotes...');
      fetchEmotes()
        .then((emotes) => {
          setRemoteEmotes(emotes || []);
          emotesFetchedRef.current = true;
          console.log(`✅ WelcomeScreen: Loaded ${emotes?.length || 0} emotes`);
        })
        .catch((err: any) => {
          // Silently handle AbortError - global cache will handle retries
          if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
            console.warn('WelcomeScreen: Emotes fetch aborted (global cache will retry)');
            emotesFetchedRef.current = false; // Allow retry
            hasAttemptedFetchRef.current = false; // Reset ref-lock on abort to allow retry
          } else {
            console.error('WelcomeScreen: Error fetching emotes:', err);
            setRemoteEmotes([]);
          }
        })
        .finally(() => {
          isFetchingEmotesRef.current = false;
        });
    }
    
    // HARD LOCK: Fetch finishers only once, prevent multiple simultaneous fetches
    // Use global cache - if fetch is already in progress, it will return the same promise
    if (!finishersFetchedRef.current && !isFetchingFinishersRef.current) {
      isFetchingFinishersRef.current = true;
      console.log('WelcomeScreen: Fetching finishers...');
      fetchFinishers()
        .then((finishersData) => {
          console.log(`⚔️ CUSTOMIZE: Loaded ${finishersData?.length || 0} finishers from Supabase`);
          if (finishersData && finishersData.length > 0) {
            console.log('📋 Finishers:', finishersData.map(f => ({ id: f.id, name: f.name, animation_key: f.animation_key, price: f.price })));
          }
          setFinishers(finishersData || []);
          finishersFetchedRef.current = true;
        })
        .catch((err: any) => {
          // Silently handle AbortError - global cache will handle retries
          if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
            console.warn('WelcomeScreen: Finishers fetch aborted (global cache will retry)');
            finishersFetchedRef.current = false; // Allow retry
            hasAttemptedFetchRef.current = false; // Reset ref-lock on abort to allow retry
          } else {
            console.error('❌ WelcomeScreen: Error fetching finishers:', err);
            setFinishers([]);
          }
        })
        .finally(() => {
          isFetchingFinishersRef.current = false;
        });
    }
  }, [profile?.id, isGuest]); // Only depend on profile ID and guest status

  const handleStartGame = (mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL') => {
    if (mode === 'SINGLE_PLAYER' || mode === 'MULTI_PLAYER') {
        audioService.playStartMatch();
    }
    onStart(playerName.trim() || 'GUEST', mode, cardCoverStyle, playerAvatar, quickFinish, aiDifficulty);
  };

  const handlePurchaseAttempt = (item: any, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD' | 'FINISHER', unlocked: boolean, equipped: boolean) => {
    if (!profile || buying) return;
    setPendingPurchase({
      id: type === 'AVATAR' ? item : item.id,
      name: type === 'AVATAR' ? getAvatarName(item, remoteEmotes) : item.name,
      description: type === 'AVATAR' ? 'A high-fidelity elite avatar signature.' : type === 'FINISHER' ? 'A legendary cinematic finisher that plays when you win a match. Feel the main character energy.' : (item.description || ITEM_REGISTRY[item.id]?.description || 'A signature XIII cosmetic upgrade.'),
      price,
      currency: type === 'FINISHER' ? 'GEMS' : (item.currency || 'GOLD'),
      type,
      style: type === 'SLEEVE' ? item.style : undefined,
      animation_key: type === 'FINISHER' ? item.animation_key : undefined,
      unlocked,
      equipped
    });
  };

  const executePurchase = async () => {
    if (!pendingPurchase || !profile || buying) return;

    if (pendingPurchase.unlocked) {
        if (pendingPurchase.type === 'SLEEVE') setCardCoverStyle(pendingPurchase.style as CardCoverStyle);
        else if (pendingPurchase.type === 'BOARD') setBackgroundTheme(pendingPurchase.id as BackgroundTheme);
        else if (pendingPurchase.type === 'AVATAR') setPlayerAvatar(pendingPurchase.id);
        else if (pendingPurchase.type === 'FINISHER' && pendingPurchase.animation_key) {
          await equipFinisher(profile.id, pendingPurchase.animation_key);
          onRefreshProfile();
        }
        setPendingPurchase(null);
        return;
    }

    const canAffordItem = pendingPurchase.currency === 'GEMS' ? ((profile.gems || 0) >= pendingPurchase.price) : (profile.coins >= pendingPurchase.price);
    if (!canAffordItem) return;
    const purchaseId = pendingPurchase.id;
    setBuying(purchaseId);
    try {
      if (pendingPurchase.type === 'FINISHER') {
        await buyFinisher(profile.id, purchaseId);
      } else {
      await buyItem(profile!.id, pendingPurchase.price, purchaseId, pendingPurchase.type, !!isGuest, pendingPurchase.currency);
      }
      audioService.playPurchase();
      setPendingPurchase(null);
      onRefreshProfile();
    } catch (err) { console.error(err); } finally { setBuying(null); }
  };

  const isSleeveUnlocked = (id: string) => profile?.unlocked_sleeves.includes(id) || ALL_STORE_SLEEVES.find(s => s.id === id)?.price === 0;
  const isBoardUnlocked = (id: string) => profile?.unlocked_boards.includes(id) || PREMIUM_BOARDS.find(b => b.id === id)?.price === 0;
  const isFinisherUnlocked = (animationKey: string) => profile?.unlocked_finishers?.includes(animationKey) || false;

  const hasUnclaimedRewards = useMemo(() => {
    return (profile?.event_stats?.ready_to_claim?.length || 0) > 0;
  }, [profile?.event_stats?.ready_to_claim]);

  const renderProfileTab = () => {
    const currentLevel = profile ? calculateLevel(profile.xp) : 1;
    const nextLevelXp = getXpForLevel(currentLevel + 1);
    const curLevelXpFloor = getXpForLevel(currentLevel);
    // Defensive check: ensure XP is at least the floor of current level (fixes legacy user issues)
    const safeXp = Math.max(curLevelXpFloor, profile?.xp || 0);
    const xpInRange = safeXp - curLevelXpFloor;
    const rangeTotal = Math.max(1, nextLevelXp - curLevelXpFloor);
    const progress = Math.min(100, Math.max(0, (xpInRange / rangeTotal) * 100));

    return (
      <div className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <SectionLabel>PLAYER PROFILE</SectionLabel>
        
        {/* Condensed Premium Profile Card */}
        <div 
          onClick={() => onOpenHub('PROFILE')} 
          className="relative flex items-center gap-4 sm:gap-5 bg-white/[0.03] backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/10 cursor-pointer group hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300 active:scale-[0.98] overflow-hidden"
        >
          {/* Subtle Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Avatar - Clickable */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onOpenHub('PROFILE');
            }}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/[0.08] border border-white/20 flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:border-white/30 transition-all duration-300 overflow-hidden shrink-0"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
            <VisualEmote trigger={playerAvatar} remoteEmotes={remoteEmotes} size="lg" />
          </div>
          
          {/* Username and Level */}
          <div className="shrink-0 flex flex-col gap-1.5">
            {profile && !isGuest && profile.username ? (
              <div className="flex items-center gap-2">
                <CopyUsername 
                  username={profile.username}
                  discriminator={profile.discriminator}
                  className="[&>span]:text-base [&>span]:sm:text-lg [&>span]:font-bold [&>span]:drop-shadow-md" 
                />
              </div>
            ) : isSyncingData ? (
              // AbortError or syncing - show "Syncing data..." spinner
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="text-sm font-semibold text-white/70 truncate drop-shadow-md">
                  Syncing data...
                </span>
              </div>
            ) : profileFetchError ? (
              // Network error - show error with retry button
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-red-400 truncate drop-shadow-md">
                  {profileFetchError.message || 'Failed to load profile'}
                </span>
                {onRetryProfileFetch && (
                  <button
                    onClick={onRetryProfileFetch}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : (
              // No profile and no error = 404 (new user) - show "USERNAME REQUIRED"
              <span className="text-base sm:text-lg font-bold text-white truncate drop-shadow-md">
                {playerName || 'USERNAME REQUIRED'}
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 bg-white/[0.08] border border-white/10 rounded-lg">
                <span className="text-xs font-semibold text-white/80 tracking-tight">Lv {currentLevel}</span>
              </div>
           </div>
          </div>

          {/* Level Progress - Right Side */}
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onOpenHub('LEVEL_REWARDS');
            }}
            className="flex-1 flex flex-col gap-1.5 justify-center ml-4"
          >
            <div className="flex justify-end">
              <span className="text-[11px] sm:text-xs font-bold text-yellow-400 uppercase tracking-wider drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                {nextLevelXp - (profile?.xp || 0)} XP TO RANK UP
              </span>
            </div>
            <div className="w-full h-3 sm:h-4 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.7)] transition-all duration-700 relative overflow-hidden" 
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] bg-[length:200%_100%] animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomizeTab = () => {
    const filteredSleeves = hideUnowned ? ALL_STORE_SLEEVES.filter(s => isSleeveUnlocked(s.id)) : ALL_STORE_SLEEVES;
    const filteredBoards = hideUnowned ? PREMIUM_BOARDS.filter(b => isBoardUnlocked(b.id)) : PREMIUM_BOARDS;
    const filteredFinishers = hideUnowned 
      ? (finishers || []).filter(f => isFinisherUnlocked(f.animation_key)) 
      : (finishers || []);
    const gridClass = density === 4 ? 'grid-cols-3' : density === 1 ? 'grid-cols-1' : 'grid-cols-2';
    
    // Debug logging
    if (customizeSubTab === 'FINISHERS') {
      console.log('🎯 CUSTOMIZE FINISHERS:', {
        totalFinishers: (finishers || []).length,
        filteredFinishers: filteredFinishers.length,
        hideUnowned,
        finishers: (finishers || []).map(f => ({ id: f.id, name: f.name, animation_key: f.animation_key }))
      });
    }
    
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <SectionLabel 
          rightElement={
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center justify-center gap-4 bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/20 shadow-lg">
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/10">
                  {( [1, 2, 4] as const).map((d) => (
                    <button 
                      key={d} 
                      onClick={() => setDensity(d)} 
                      className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${
                        density === d 
                          ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                          : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                      }`}
                    >
                      {d === 1 ? <GridIcon1 /> : d === 2 ? <GridIcon2 /> : <GridIcon4 />}
                    </button>
                  ))}
                </div>
                <div className="h-5 w-[1px] bg-white/20"></div>
                <button 
                  onClick={() => setHideUnowned(!hideUnowned)} 
                  className="flex items-center gap-3 group px-2"
                >
                  <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-300 ${
                    hideUnowned ? 'text-yellow-400' : 'text-white/50'
                  }`}>
                    OWNED
                  </span>
                  <div className={`w-11 h-6 rounded-full relative transition-all duration-300 ${
                    hideUnowned 
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                      : 'bg-white/10'
                  }`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-lg ${
                      hideUnowned ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-gradient-to-br from-black/40 to-black/60 rounded-2xl border border-white/10">
                {(['SLEEVES', 'BOARDS', 'FINISHERS'] as const).map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => setCustomizeSubTab(tab)} 
                    className={`py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
                      customizeSubTab === tab 
                        ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 text-white shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                        : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          }
        >Visual Assets</SectionLabel>
        {customizeSubTab === 'SLEEVES' ? (
          <div className="animate-in fade-in duration-200">
            <div className={`grid ${gridClass} gap-3 sm:gap-4 md:gap-5 pb-8`}>
              {filteredSleeves.map(s => {
                const unlocked = isSleeveUnlocked(s.id);
                const isEquipped = cardCoverStyle === s.style;
                return (
                  <div 
                    key={s.id} 
                    onClick={() => handlePurchaseAttempt(s, s.price, 'SLEEVE', unlocked, isEquipped)} 
                    className="relative group bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] border-2 border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center transition-all duration-500 hover:border-yellow-500/40 hover:bg-gradient-to-br hover:from-white/[0.12] hover:via-white/[0.06] hover:to-white/[0.12] hover:shadow-[0_0_40px_rgba(251,191,36,0.2)] cursor-pointer h-full overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute -inset-10 bg-gradient-to-br from-yellow-500/10 via-transparent to-pink-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
                      <div className="relative group/card">
                        <div className="absolute -inset-2 bg-gradient-to-br from-yellow-500/20 via-transparent to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                        <Card 
                          faceDown 
                          coverStyle={s.style} 
                          className={`!w-24 !h-36 sm:!w-28 sm:!h-40 shadow-[0_8px_32px_rgba(0,0,0,0.8)] transition-transform duration-500 ${!unlocked ? 'opacity-30' : ''} ${isEquipped ? 'ring-2 ring-emerald-500/50' : 'group-hover:scale-110'}`}
                          disableEffects={!sleeveEffectsEnabled}
                        />
                        </div>
                      
                      <div className="flex flex-col items-center text-center px-2">
                        <span className="text-xs sm:text-sm font-bold text-white/90 uppercase tracking-wide drop-shadow-md">
                          {s.name}
                        </span>
                    </div>
                    </div>

                    <button className={`relative z-10 w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 mt-auto transition-all duration-300 overflow-hidden group/btn ${
                      unlocked 
                        ? isEquipped
                          ? 'bg-gradient-to-br from-emerald-600/30 to-emerald-700/30 text-emerald-300 border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                          : 'bg-gradient-to-br from-emerald-600/30 to-emerald-700/30 text-emerald-300 border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-500 text-black border-2 border-yellow-400/50 shadow-[0_0_25px_rgba(251,191,36,0.4)] hover:shadow-[0_0_35px_rgba(251,191,36,0.6)]'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                      {isEquipped ? (
                        <span className="relative z-10">EQUIPPED</span>
                      ) : unlocked ? (
                        <span className="relative z-10">EQUIP</span>
                      ) : (
                        <div className="relative z-10 flex items-center gap-1">
                          <span>{s.price}</span>
                          <CurrencyIcon type={s.currency} size="sm" />
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : customizeSubTab === 'BOARDS' ? (
          <div className="animate-in fade-in duration-200">
            <div className={`grid ${gridClass} gap-3 sm:gap-4 md:gap-5 pb-8`}>
              {filteredBoards.map(b => {
                const unlocked = isBoardUnlocked(b.id);
                const isEquipped = backgroundTheme === b.id;
                return (
                  <div 
                    key={b.id} 
                    onClick={() => handlePurchaseAttempt(b, b.price as number, 'BOARD', unlocked, isEquipped)} 
                    className="relative group bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] border-2 border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center transition-all duration-500 hover:border-yellow-500/40 hover:bg-gradient-to-br hover:from-white/[0.12] hover:via-white/[0.06] hover:to-white/[0.12] hover:shadow-[0_0_40px_rgba(251,191,36,0.2)] cursor-pointer h-full overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute -inset-10 bg-gradient-to-br from-yellow-500/10 via-transparent to-pink-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
                      <div className="relative w-full group/board">
                        <div className="absolute -inset-2 bg-gradient-to-br from-yellow-500/20 via-transparent to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover/board:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative w-full h-[140px] sm:h-[160px] md:h-[180px]">
                          <BoardPreview themeId={b.id} unlocked={unlocked} active={isEquipped} hideActiveMarker className="w-full h-full" />
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center text-center px-2">
                        <span className="text-xs sm:text-sm font-bold text-white/90 uppercase tracking-wide drop-shadow-md">
                          {b.name}
                        </span>
                      </div>
                    </div>

                    <button className={`relative z-10 w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 mt-auto transition-all duration-300 overflow-hidden group/btn ${
                      unlocked 
                        ? isEquipped
                          ? 'bg-gradient-to-br from-emerald-600/30 to-emerald-700/30 text-emerald-300 border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                          : 'bg-gradient-to-br from-emerald-600/30 to-emerald-700/30 text-emerald-300 border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-500 text-black border-2 border-yellow-400/50 shadow-[0_0_25px_rgba(251,191,36,0.4)] hover:shadow-[0_0_35px_rgba(251,191,36,0.6)]'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                      {isEquipped ? (
                        <span className="relative z-10">EQUIPPED</span>
                      ) : unlocked ? (
                        <span className="relative z-10">EQUIP</span>
                      ) : (
                        <div className="relative z-10 flex items-center gap-1">
                          <span>{b.price}</span>
                          <CurrencyIcon type="GOLD" size="sm" />
                        </div>
                      )}
                    </button>
                    </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            {filteredFinishers.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-white/50 text-sm font-medium uppercase tracking-wide mb-2">
                  {(finishers || []).length === 0 
                    ? 'Loading finishers...' 
                    : hideUnowned 
                      ? 'No owned finishers' 
                      : 'No finishers available'}
                </p>
                {(finishers || []).length === 0 && (
                  <>
                    <p className="text-white/30 text-xs mb-2">Please wait while we load the finishers</p>
                    <p className="text-yellow-400/60 text-[10px] mt-4 px-4">
                      If finishers don't load, check the browser console for errors. 
                      Make sure VITE_SUPABASE_ANON_KEY is set in your deployment environment.
                    </p>
                  </>
                )}
                {hideUnowned && (finishers || []).length > 0 && (
                  <p className="text-white/30 text-xs mt-2">Turn off "OWNED" filter to see all finishers</p>
                )}
              </div>
            ) : (
              <div className={`grid ${gridClass} gap-3 sm:gap-4 md:gap-5 pb-8`}>
                {filteredFinishers.map(f => {
                const unlocked = isFinisherUnlocked(f.animation_key);
                const isEquipped = profile?.equipped_finisher === f.animation_key;
                return (
                  <div 
                    key={f.id} 
                    onClick={() => handlePurchaseAttempt(f, f.price, 'FINISHER', unlocked, isEquipped)} 
                    className="relative group bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] border-2 border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center transition-all duration-500 hover:border-yellow-500/40 hover:bg-gradient-to-br hover:from-white/[0.12] hover:via-white/[0.06] hover:to-white/[0.12] hover:shadow-[0_0_40px_rgba(251,191,36,0.2)] cursor-pointer h-full overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute -inset-10 bg-gradient-to-br from-yellow-500/10 via-transparent to-pink-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
                      <div className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.8)] border-2 group-hover:scale-110 transition-all duration-500 overflow-hidden ${
                        f.animation_key === 'shiba_slam' 
                          ? 'bg-gradient-to-br from-yellow-500/20 via-orange-500/15 to-yellow-500/20 border-yellow-500/30' 
                          : f.animation_key === 'kiss_my_shiba'
                          ? 'bg-gradient-to-br from-pink-500/20 via-rose-500/15 to-pink-500/20 border-pink-500/30'
                          : 'bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-blue-500/20 border-blue-500/30'
                      }`}>
                        {f.animation_key === 'shiba_slam' ? (
                          <ShibaSlamIcon className="w-full h-full p-3 sm:p-4" remoteEmotes={remoteEmotes} />
                        ) : f.animation_key === 'ethereal_blade' ? (
                          <EtherealBladeIcon className="w-full h-full p-3 sm:p-4" />
                        ) : f.animation_key === 'kiss_my_shiba' ? (
                          <VisualEmote trigger=":shiba_butt:" remoteEmotes={remoteEmotes} size="xl" />
                        ) : (
                          <div className="text-4xl">⚔️</div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-center text-center px-2">
                        <span className="text-xs sm:text-sm font-bold text-white/90 uppercase tracking-wide drop-shadow-md">
                          {f.name}
                        </span>
                      </div>
                    </div>

                    <button className={`relative z-10 w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 mt-auto transition-all duration-300 overflow-hidden group/btn ${
                      unlocked 
                        ? isEquipped
                          ? 'bg-gradient-to-br from-emerald-600/30 to-emerald-700/30 text-emerald-300 border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                          : 'bg-gradient-to-br from-emerald-600/30 to-emerald-700/30 text-emerald-300 border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-500 text-black border-2 border-yellow-400/50 shadow-[0_0_25px_rgba(251,191,36,0.4)] hover:shadow-[0_0_35px_rgba(251,191,36,0.6)]'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                      {isEquipped ? (
                        <span className="relative z-10">EQUIPPED</span>
                      ) : unlocked ? (
                        <span className="relative z-10">EQUIP</span>
                      ) : (
                        <div className="relative z-10 flex items-center gap-1">
                          <span>{f.price}</span>
                          <CurrencyIcon type="GEMS" size="sm" />
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSettingsTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <SectionLabel>System Config</SectionLabel>
      <div className="space-y-4">
        {/* Premium Setting Cards */}
        <div className="relative flex items-center justify-between bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Haptic Audio</span>
            <span className="text-[8px] font-medium text-white/40 uppercase tracking-tight">Enable immersive arena sound effects</span>
          </div>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className={`relative z-10 w-14 h-7 rounded-full transition-all duration-300 ${
              soundEnabled 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.5)]' 
                : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-lg ${
              soundEnabled ? 'translate-x-7' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        
        <div className="relative flex items-center justify-between bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Card Play Animations</span>
            <span className="text-[8px] font-medium text-white/40 uppercase tracking-tight">Organic card motion when tossed to arena</span>
          </div>
          <button 
            onClick={() => setPlayAnimationsEnabled(!playAnimationsEnabled)} 
            className={`relative z-10 w-14 h-7 rounded-full transition-all duration-300 ${
              playAnimationsEnabled 
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.5)]' 
                : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-lg ${
              playAnimationsEnabled ? 'translate-x-7' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        
        <div className="relative flex items-center justify-between bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10 flex flex-col gap-1">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">Sleeve Face Effects</span>
            <span className="text-[8px] font-medium text-white/40 uppercase tracking-tight">Visual flair and glows on active card faces</span>
          </div>
          <button 
            onClick={() => setSleeveEffectsEnabled(!sleeveEffectsEnabled)} 
            className={`relative z-10 w-14 h-7 rounded-full transition-all duration-300 ${
              sleeveEffectsEnabled 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.5)]' 
                : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-lg ${
              sleeveEffectsEnabled ? 'translate-x-7' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        
        {setAutoPassEnabled && (
          <div className="relative flex items-center justify-between bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">Auto-Pass</span>
              <span className="text-[8px] font-medium text-white/40 uppercase tracking-tight">Automatically pass when no moves are possible</span>
            </div>
            <button 
              onClick={() => setAutoPassEnabled(!autoPassEnabled)} 
              className={`relative z-10 w-14 h-7 rounded-full transition-all duration-300 ${
                autoPassEnabled 
                  ? 'bg-gradient-to-r from-rose-500 to-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.5)]' 
                  : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-lg ${
                autoPassEnabled ? 'translate-x-7' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        )}
        
        {setQuickFinish && (
          <div className="relative flex items-center justify-between bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5 backdrop-blur-xl p-5 rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 flex flex-col gap-1">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">Turbo Finish</span>
              <span className="text-[8px] font-medium text-white/40 uppercase tracking-tight">End AI matches instantly upon your victory</span>
            </div>
            <button 
              onClick={() => setQuickFinish(!quickFinish)} 
              className={`relative z-10 w-14 h-7 rounded-full transition-all duration-300 ${
                quickFinish 
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-[0_0_20px_rgba(234,179,8,0.5)]' 
                  : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-lg ${
                quickFinish ? 'translate-x-7' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        )}
        
        {/* Premium AI Difficulty Selector */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider text-center">AI Difficulty</p>
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-md rounded-2xl border border-white/10">
            {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map(d => (
              <button 
                key={d} 
                onClick={() => setAiDifficulty(d)} 
                className={`relative py-3 rounded-xl text-[9px] font-bold uppercase transition-all duration-300 overflow-hidden ${
                  aiDifficulty === d 
                    ? (d === 'EASY' 
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]' 
                        : d === 'MEDIUM' 
                        ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-black shadow-[0_0_20px_rgba(234,179,8,0.5)]' 
                        : 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)]')
                    : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {aiDifficulty === d && (
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                )}
                <span className="relative z-10">{d}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Legal Links */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <SectionLabel>Legal</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/privacy')}
              className="relative flex items-center justify-center bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5 backdrop-blur-xl p-3 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-[9px] font-bold text-white uppercase tracking-wider text-center">Privacy</span>
              </div>
            </button>
            <button
              onClick={() => navigate('/terms')}
              className="relative flex items-center justify-center bg-gradient-to-br from-white/5 via-white/[0.02] to-white/5 backdrop-blur-xl p-3 rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-[9px] font-bold text-white uppercase tracking-wider text-center">Terms</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const hasVoucher = useMemo(() => (profile?.inventory?.items['GENERAL_10_OFF'] || 0) > 0, [profile]);
  const [applyVoucher, setApplyVoucher] = useState(false);

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6">
      <BoardSurface themeId={backgroundTheme} />
      
      {/* Premium Ambient Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(234,179,8,0.03)_0%,transparent_70%)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.02)_0%,transparent_50%)] pointer-events-none"></div>
      
      {previewSleeveStyle && <SleeveArenaPreview sleeveStyle={previewSleeveStyle} themeId={backgroundTheme} sleeveEffectsEnabled={sleeveEffectsEnabled} onClose={() => setPreviewSleeveStyle(null)} />}
      {showSleevePreview && pendingPurchase?.type === 'SLEEVE' && (
        <CardSleevePreview 
          sleeveStyle={pendingPurchase.style!} 
          themeId={backgroundTheme} 
          sleeveEffectsEnabled={sleeveEffectsEnabled}
          onClose={() => setShowSleevePreview(false)}
        />
      )}
      {showBoardPreview && pendingPurchase?.type === 'BOARD' && (
        <BoardThemePreview 
          themeId={pendingPurchase.id as BackgroundTheme}
          onClose={() => setShowBoardPreview(false)}
        />
      )}
      {showFinisherPreview && previewingFinisher && (
        <FinisherPreview
          finisherKey={previewingFinisher.animation_key}
          finisherName={previewingFinisher.name}
          onClose={() => {
            setShowFinisherPreview(false);
            setPreviewingFinisher(null);
          }}
        />
      )}
      {eventsOpen && profile && <EventsModal onClose={() => setEventsOpen(false)} profile={profile} onRefreshProfile={onRefreshProfile} isGuest={isGuest} />}
      
      {/* Purchase / Equip Modal for Customize */}
      {pendingPurchase && profile && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-6" onClick={() => setPendingPurchase(null)}>
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-sm rounded-[3rem] p-8 flex flex-col items-center text-center shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black uppercase text-2xl mb-2 italic">
                {pendingPurchase.unlocked ? 'ASSET PROFILE' : 'SECURE ASSET?'}
            </h3>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-6">
                {pendingPurchase.unlocked ? 'Configure elite signature' : `Unlock ${pendingPurchase.name}`}
            </p>
            
            {/* Visual Preview in Modal */}
            <div className="w-full aspect-[16/10] bg-black/40 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center mb-6 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex items-center justify-center flex-1">
                {pendingPurchase.type === 'SLEEVE' ? (
                    <Card faceDown activeTurn={true} coverStyle={pendingPurchase.style} className="!w-24 !h-36 shadow-2xl group-hover:scale-110 transition-transform duration-700" />
                ) : pendingPurchase.type === 'BOARD' ? (
                    <div className="w-full h-full p-2"><BoardPreview themeId={pendingPurchase.id} unlocked={true} hideActiveMarker className="!border-none !rounded-2xl" /></div>
                ) : pendingPurchase.type === 'FINISHER' ? (
                    <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
                      {pendingPurchase.animation_key === 'shiba_slam' ? (
                        <ShibaSlamIcon className="w-full h-full p-4" remoteEmotes={remoteEmotes} />
                      ) : pendingPurchase.animation_key === 'ethereal_blade' ? (
                        <EtherealBladeIcon className="w-full h-full p-4" />
                      ) : pendingPurchase.animation_key === 'sanctum_snap' ? (
                        <VisualEmote trigger=":chinese:" remoteEmotes={remoteEmotes} size="xl" />
                      ) : pendingPurchase.animation_key === 'seductive_finish' ? (
                        <VisualEmote trigger=":heart_eyes:" remoteEmotes={remoteEmotes} size="xl" />
                      ) : pendingPurchase.animation_key === 'kiss_my_shiba' ? (
                        <VisualEmote trigger=":shiba_butt:" remoteEmotes={remoteEmotes} size="xl" />
                      ) : (
                        <div className="text-6xl">⚔️</div>
                      )}
                    </div>
                ) : (
                    <div className="w-32 h-32 flex items-center justify-center"><VisualEmote trigger={pendingPurchase.id} remoteEmotes={remoteEmotes} size="xl" /></div>
                  )}
                </div>
                {pendingPurchase.type === 'SLEEVE' && (
                  <button 
                    onClick={() => setShowSleevePreview(true)}
                    className="relative z-10 mt-2 mb-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/20 text-[9px] font-black uppercase tracking-[0.25em] text-white hover:bg-white/15 transition-all"
                  >
                    Preview Sleeve
                  </button>
                )}
                {pendingPurchase.type === 'BOARD' && (
                  <button 
                    onClick={() => setShowBoardPreview(true)}
                    className="relative z-10 mt-2 mb-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/20 text-[9px] font-black uppercase tracking-[0.25em] text-white hover:bg-white/15 transition-all"
                  >
                    Preview Board
                  </button>
                )}
                {pendingPurchase.type === 'FINISHER' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const finisher = finishers.find(f => f.id === pendingPurchase.id);
                      if (finisher) {
                        setPreviewingFinisher(finisher);
                        setShowFinisherPreview(true);
                      }
                    }}
                    className="relative z-10 mt-2 mb-3 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 text-[9px] font-black uppercase tracking-[0.25em] text-yellow-300 hover:bg-gradient-to-r hover:from-yellow-500/30 hover:to-amber-500/30 hover:border-yellow-500/60 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                  >
                    Preview
                  </button>
                )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full mb-6 text-center">
              <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                {pendingPurchase.description}
              </p>
            </div>
            
            {!pendingPurchase.unlocked && (
                <div className="w-full flex items-center justify-center gap-4 mb-8">
                   <div className={`text-2xl font-black ${applyVoucher ? 'text-gray-600 line-through' : 'text-white'}`}>{pendingPurchase.price}</div>
                   {applyVoucher && <div className="text-3xl font-black text-emerald-400">{Math.floor(pendingPurchase.price * 0.9)}</div>}
                   <CurrencyIcon type={pendingPurchase.currency} size="sm" />
                </div>
            )}

            {hasVoucher && !pendingPurchase.unlocked && (
              <button 
                onClick={() => setApplyVoucher(!applyVoucher)}
                className={`w-full mb-6 p-4 rounded-2xl border transition-all flex items-center justify-between ${applyVoucher ? 'bg-emerald-500/10 border-emerald-500' : 'bg-white/5 border-white/10'}`}
              >
                <div className="flex flex-col items-start">
                   <span className="text-[10px] font-black uppercase text-emerald-400">GENERAL_10_OFF</span>
                   <span className="text-[7px] font-bold text-white/30 uppercase mt-0.5">Apply Tactical Discount</span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${applyVoucher ? 'border-emerald-500 bg-emerald-500' : 'border-white/20'}`}>
                  {applyVoucher && <span className="text-[8px]">✓</span>}
                </div>
              </button>
            )}

            <div className="grid grid-cols-2 gap-3 w-full">
              <button onClick={() => setPendingPurchase(null)} className="py-4 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest">Abort</button>
              <button onClick={executePurchase} disabled={pendingPurchase.equipped} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg ${pendingPurchase.equipped ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-yellow-500 text-black'}`}>
                {pendingPurchase.equipped ? 'EQUIPPED' : pendingPurchase.unlocked ? 'EQUIP' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-6 sm:top-8 left-4 sm:left-8 z-[100] animate-in slide-in-from-left-2 fade-in duration-500 flex flex-col items-center gap-3 sm:gap-4">
        {/* SHOP Button */}
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => onOpenStore()} 
            className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-yellow-500/20 via-yellow-600/15 to-yellow-500/20 backdrop-blur-xl border-2 border-yellow-500/30 flex items-center justify-center shadow-[0_8px_30px_rgba(234,179,8,0.3)] transition-all duration-300 hover:scale-110 hover:border-yellow-500/50 hover:shadow-[0_12px_40px_rgba(234,179,8,0.5)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 blur-xl rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.2)_0%,transparent_70%)] rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300">
              <ShopCardIcon />
            </div>
          </button>
          <span className="text-[10px] sm:text-[11px] font-black uppercase text-yellow-400 tracking-wider drop-shadow-[0_2px_8px_rgba(234,179,8,0.4)]">SHOP</span>
        </div>

        {/* EVENTS Button */}
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => setEventsOpen(true)} 
            className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-500/20 via-emerald-600/15 to-emerald-500/20 backdrop-blur-xl border-2 border-emerald-500/30 flex items-center justify-center shadow-[0_8px_30px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-110 hover:border-emerald-500/50 hover:shadow-[0_12px_40px_rgba(16,185,129,0.5)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 blur-xl rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.2)_0%,transparent_70%)] rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
              <EventsCardIcon />
            </div>
            {hasUnclaimedRewards && (
              <div className="absolute -top-1 -right-1 flex items-center justify-center z-20">
                <span className="absolute w-5 h-5 bg-rose-600 rounded-full animate-ping opacity-75"></span>
                <span className="relative w-4 h-4 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full border-2 border-white/30 shadow-[0_0_15px_rgba(244,63,94,0.8)]"></span>
              </div>
            )}
          </button>
          <span className="text-[10px] sm:text-[11px] font-black uppercase text-emerald-400 tracking-wider drop-shadow-[0_2px_8px_rgba(16,185,129,0.4)]">EVENTS</span>
        </div>

        {/* ITEMS Button */}
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => onOpenHub('INVENTORY')} 
            className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-500/20 via-pink-600/15 to-pink-500/20 backdrop-blur-xl border-2 border-pink-500/30 flex items-center justify-center shadow-[0_8px_30px_rgba(236,72,153,0.3)] transition-all duration-300 hover:scale-110 hover:border-pink-500/50 hover:shadow-[0_12px_40px_rgba(236,72,153,0.5)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-pink-600/20 blur-xl rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.2)_0%,transparent_70%)] rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300">
              <ItemsCardIcon />
            </div>
          </button>
          <span className="text-[10px] sm:text-[11px] font-black uppercase text-pink-400 tracking-wider drop-shadow-[0_2px_8px_rgba(236,72,153,0.4)]">ITEMS</span>
        </div>

        {/* FRIENDS Button */}
        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => onOpenFriends()} 
            className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500/20 via-blue-600/15 to-blue-500/20 backdrop-blur-xl border-2 border-blue-500/30 flex items-center justify-center shadow-[0_8px_30px_rgba(59,130,246,0.3)] transition-all duration-300 hover:scale-110 hover:border-blue-500/50 hover:shadow-[0_12px_40px_rgba(59,130,246,0.5)] active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-600/20 blur-xl rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.2)_0%,transparent_70%)] rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 group-hover:rotate-6 group-hover:scale-110 transition-transform duration-300">
              <FriendsCardIcon />
            </div>
          </button>
          <span className="text-[10px] sm:text-[11px] font-black uppercase text-blue-400 tracking-wider drop-shadow-[0_2px_8px_rgba(59,130,246,0.4)]">FRIENDS</span>
        </div>
      </div>
      <div className="fixed top-6 sm:top-8 right-4 sm:right-8 z-[100] animate-in slide-in-from-right-2 fade-in duration-500 pointer-events-none">
        <UserBar profile={profile} isGuest={isGuest} avatar={playerAvatar} remoteEmotes={remoteEmotes} onClick={(tab) => onOpenHub(tab)} onOpenStore={onOpenStore} onOpenGemPacks={onOpenGemPacks} className="pointer-events-auto" />
      </div>
      <div className="max-w-3xl w-full z-10 flex flex-col items-center gap-6 mt-10 md:mt-0">
        {/* Guest Banner - Only show if guest */}
        {isGuest && profile && onLinkAccount && (
          <div className="w-full animate-in fade-in slide-in-from-top-4 duration-500">
            <GuestBanner profile={profile} onLinkAccount={onLinkAccount} />
          </div>
        )}
        
        {/* Premium Logo Section */}
        <div className="animate-in fade-in duration-700 mb-2 flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.2)_0%,transparent_70%)] blur-3xl opacity-50"></div>
            <div className="drop-shadow-[0_40px_100px_rgba(0,0,0,0.95)] relative z-10">
              <BrandLogo size="lg" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2.5 animate-in slide-in-from-top-4 fade-in duration-700 delay-300">
            <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-gradient-to-r from-red-950/50 via-red-900/40 to-red-950/50 backdrop-blur-md border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.4)]">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-75"></span>
                <span className="relative w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]"></span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-400 whitespace-nowrap">BETA PHASE: ACTIVE TESTING</span>
            </div>
          </div>
        </div>

        {/* Premium Main Container */}
        <div className="relative w-full group">
          {/* Dramatic Glow Effects */}
          <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 via-emerald-500/20 to-yellow-500/20 rounded-[3.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          <div className="absolute -inset-0.5 bg-gradient-to-br from-white/5 via-transparent to-transparent rounded-[3.5rem] opacity-50"></div>
          
          <div className="relative w-full bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[3.5rem] overflow-hidden flex flex-col min-h-[600px]">
            {/* Premium Tab Navigation */}
            <div className="relative flex border-b border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-sm">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)] opacity-50"></div>
              {(['PROFILE', 'CUSTOMIZE', 'SETTINGS'] as WelcomeTab[]).map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`relative flex-1 py-5 text-[11px] font-bold uppercase tracking-[0.3em] transition-all duration-300 border-b-2 ${
                    activeTab === tab 
                      ? 'text-yellow-400 border-yellow-400/60 bg-gradient-to-b from-yellow-500/10 to-transparent shadow-[0_4px_20px_rgba(234,179,8,0.2)]' 
                      : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/[0.02]'
                  }`}
                >
                  {activeTab === tab && (
                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent"></div>
                  )}
                  <span className="relative z-10">{tab}</span>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 md:p-10 overflow-hidden flex flex-col relative">
              {/* Subtle Background Pattern */}
              <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '40px 40px'
              }}></div>
              
              <div key={activeTab} className="relative z-10 mb-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-300 overflow-hidden w-full">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.6)] animate-pulse shrink-0"></div>
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-[0.25em] font-mono whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0">
                  {TAB_DESCRIPTIONS[activeTab]}
                </span>
                <div className="h-[1px] w-12 md:w-24 bg-gradient-to-r from-white/20 via-yellow-500/30 to-transparent shrink-0"></div>
              </div>
              
              {activeTab === 'PROFILE' && renderProfileTab()}
              {activeTab === 'CUSTOMIZE' && renderCustomizeTab()}
              {activeTab === 'SETTINGS' && renderSettingsTab()}
            </div>

            {/* Premium Action Buttons Section */}
            <div className="relative p-8 border-t border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent backdrop-blur-sm">
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(234,179,8,0.03)_50%,transparent_100%)]"></div>
              <div className="relative z-10 space-y-4">
                <LuxuryButton onClick={() => handleStartGame('MULTI_PLAYER')} variant="emerald" label="PLAY ONLINE" icon="⚔️" sublabel="MULTIPLAYER ARENA" />
                <LuxuryButton onClick={() => handleStartGame('SINGLE_PLAYER')} variant="gold" label="PLAY AI" icon="🤖" sublabel="BOT DUEL" />
                <div className="grid grid-cols-2 gap-4">
                  <LuxuryButton onClick={() => handleStartGame('TUTORIAL')} variant="ghost" label="TUTORIAL" icon="🎓" sublabel="LEARN RULES" slim />
                  <SignOutButton onSignOut={onSignOut} className="w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />
    </div>
  );
};