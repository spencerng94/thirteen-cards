import React, { useState, useEffect } from 'react';
import { Card, CardCoverStyle } from './Card';
import { UserProfile, BackgroundTheme, Emote, Card as CardType } from '../types';
import { buyItem, DEFAULT_AVATARS, PREMIUM_AVATARS, getAvatarName, fetchEmotes } from '../services/supabase';
import { PREMIUM_BOARDS, BoardPreview, BoardSurface } from './UserHub';
import { audioService } from '../services/audio';
import { VisualEmote } from './VisualEmote';

/**
 * Redesigned 'Auric Medallion' - Satisfying, heavy gold currency.
 */
const CoinIconSVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">
    <defs>
      <linearGradient id="goldMedalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF9C4" />
        <stop offset="25%" stopColor="#FBC02D" />
        <stop offset="50%" stopColor="#F9A825" />
        <stop offset="75%" stopColor="#E65100" />
        <stop offset="100%" stopColor="#3E2723" />
      </linearGradient>
      <filter id="innerSoftBevel">
        <feOffset dx="0" dy="1" />
        <feGaussianBlur stdDeviation="0.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="out" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#goldMedalGrad)" stroke="#5D4037" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="40" fill="#3E2723" opacity="0.2" />
    <circle cx="50" cy="50" r="38" fill="url(#goldMedalGrad)" stroke="#8B6508" strokeWidth="0.5" filter="url(#innerSoftBevel)" />
    <g transform="translate(50, 50)">
      <path d="M0 -24 L5 -5 L24 0 L5 5 L0 24 L-5 5 L-24 0 L-5 -5 Z" fill="#3E2723" opacity="0.8" />
      <path d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z" fill="white" opacity="0.5" />
    </g>
    <path d="M20 30 Q 30 15 55 20" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
  </svg>
);

/**
 * Redesigned 'Cosmic Shard' - Ultra-high tier crystalline currency.
 */
const GemIconSVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
    <defs>
      <linearGradient id="cosmicShardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FAE8FF" />
        <stop offset="30%" stopColor="#F472B6" />
        <stop offset="60%" stopColor="#9D174D" />
        <stop offset="100%" stopColor="#4C0519" />
      </linearGradient>
      <filter id="coreRadiance">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <ellipse cx="50" cy="50" rx="46" ry="18" fill="none" stroke="#F472B6" strokeWidth="0.5" opacity="0.4" transform="rotate(-25 50 50)" />
    <ellipse cx="50" cy="50" rx="42" ry="14" fill="none" stroke="#FAE8FF" strokeWidth="1" opacity="0.6" transform="rotate(35 50 50)" />
    <path d="M50 5 L88 35 L88 65 L50 95 L12 65 L12 35 Z" fill="url(#cosmicShardGrad)" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M50 5 L50 95 M12 35 L88 35 M12 65 L88 65" stroke="white" strokeWidth="0.5" opacity="0.4" />
    <path d="M50 35 L88 50 L50 65 L12 50 Z" fill="white" opacity="0.2" />
    <circle cx="50" cy="50" r="8" fill="white" filter="url(#coreRadiance)" className="animate-pulse" />
    <path d="M50 38 L53 50 L65 53 L53 56 L50 68 L47 56 L35 53 L47 50 Z" fill="white" />
    <path d="M30 20 L40 10" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
  </svg>
);

export const CurrencyIcon: React.FC<{ type: 'GOLD' | 'GEMS'; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({ type, size = 'sm', className = "" }) => {
  const dim = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-12 h-12' : size === 'xl' ? 'w-16 h-16' : 'w-8 h-8';
  const glowColor = type === 'GEMS' ? 'rgba(236, 72, 153, 0.4)' : 'rgba(251, 191, 36, 0.3)';

  return (
    <div className={`relative ${dim} flex items-center justify-center shrink-0 ${className}`}>
      <div 
        className="absolute inset-[-30%] rounded-full blur-md opacity-60"
        style={{ background: `radial-gradient(circle, white 0%, ${glowColor} 70%, transparent 100%)` }}
      />
      <div className="w-full h-full relative z-10 transition-transform duration-500 hover:scale-125 hover:rotate-12">
        {type === 'GOLD' ? <CoinIconSVG /> : <GemIconSVG />}
      </div>
    </div>
  );
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

const DummyTablePreview: React.FC<{ themeId: BackgroundTheme; onClose: () => void }> = ({ themeId, onClose }) => (
  <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden" onClick={onClose}>
     <BoardSurface themeId={themeId} isMini />
     <div className="relative z-10 w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-8 flex justify-between items-start">
            <div className="flex flex-col flex-1 min-w-0 mr-4">
              <h1 className="text-4xl font-black text-white tracking-[0.2em] drop-shadow-2xl uppercase italic truncate">ARENA PREVIEW</h1>
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.6em] mt-2 truncate">Surface Profile Loaded</p>
            </div>
            <button onClick={onClose} className="shrink-0 group flex items-center gap-3 px-8 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
              <span className="group-hover:-translate-x-1 transition-transform">RETURN ←</span>
            </button>
        </div>
     </div>
  </div>
);

export const SleeveArenaPreview: React.FC<{ sleeveStyle: CardCoverStyle; themeId: BackgroundTheme; sleeveEffectsEnabled: boolean; onClose: () => void }> = ({ sleeveStyle, themeId, sleeveEffectsEnabled, onClose }) => {
  const cards: CardType[] = [{ id: 'p1', rank: 15, suit: 3 }, { id: 'p2', rank: 14, suit: 0 }, { id: 'p3', rank: 3, suit: 0 }];
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden" onClick={onClose}>
      <BoardSurface themeId={themeId} isMini />
      <div className="relative z-10 w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-8 flex justify-between items-start">
            <div className="flex flex-col flex-1 min-w-0 mr-4">
              <h1 className="text-4xl font-black text-white tracking-[0.2em] drop-shadow-2xl uppercase italic truncate">ARENA PREVIEW</h1>
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.6em] mt-2 truncate">Visual Profile: {sleeveStyle.replace(/_/g, ' ')}</p>
            </div>
            <button onClick={onClose} className="shrink-0 group flex items-center gap-3 px-8 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
              <span className="group-hover:-translate-x-1 transition-transform">RETURN ←</span>
            </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-12">
            <div className="flex flex-col items-center gap-4">
                <div className="flex -space-x-12 sm:-space-x-8">
                    {cards.map((c, i) => (
                      <div key={c.id} style={{ transform: `rotate(${(i - 1) * 10}deg) translateY(${i === 1 ? '-20px' : '0px'})` }} className="shadow-2xl">
                        <Card card={c} coverStyle={sleeveStyle} disableEffects={!sleeveEffectsEnabled} />
                      </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

interface StoreItem {
  id: string;
  name: string;
  price: number;
  currency: 'GOLD' | 'GEMS';
  type: 'SLEEVE' | 'AVATAR' | 'BOARD';
  style?: CardCoverStyle;
  description: string;
  tier: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
}

export const canAfford = (item: StoreItem, userGold: number, userGems: number): boolean => {
  if (item.price <= 0) return item.price === 0;
  if (item.currency === 'GEMS') return userGems >= item.price;
  return userGold >= item.price;
};

export const SOVEREIGN_IDS: CardCoverStyle[] = ['SOVEREIGN_SPADE', 'SOVEREIGN_CLUB', 'SOVEREIGN_DIAMOND', 'SOVEREIGN_HEART'];
export const SUPER_PRESTIGE_SLEEVE_IDS: CardCoverStyle[] = ['WITS_END', 'DIVINE_ROYAL', 'EMPERORS_HUBRIS', 'ROYAL_CROSS'];

export const SLEEVES: StoreItem[] = [
  { id: 'BLUE', name: 'Imperial Blue', price: 0, currency: 'GOLD', tier: 'COMMON', type: 'SLEEVE', style: 'BLUE', description: 'Standard navy finish.' },
  { id: 'RED', name: 'Dynasty Red', price: 0, currency: 'GOLD', tier: 'COMMON', type: 'SLEEVE', style: 'RED', description: 'Lustrous red finish.' },
  { id: 'PATTERN', name: 'Golden Lattice', price: 1000, currency: 'GOLD', tier: 'COMMON', type: 'SLEEVE', style: 'PATTERN', description: 'Geometric gold weave.' },
  { id: 'AMETHYST_ROYAL', name: 'Royal Amethyst', price: 5000, currency: 'GOLD', tier: 'RARE', type: 'SLEEVE', style: 'AMETHYST_ROYAL', description: 'Velvet silk with silver filigree.' },
  { id: 'VOID_ONYX', name: 'Void Walker', price: 8500, currency: 'GOLD', tier: 'RARE', type: 'SLEEVE', style: 'VOID_ONYX', description: 'Matte black with indigo traces.' },
  { id: 'NEON_CYBER', name: 'Neon Circuit', price: 12500, currency: 'GOLD', tier: 'RARE', type: 'SLEEVE', style: 'NEON_CYBER', description: 'Active energetic circuitry.' },
  { id: 'PIXEL_CITY_LIGHTS', name: 'Pixel Lights', price: 25000, currency: 'GOLD', tier: 'EPIC', type: 'SLEEVE', style: 'PIXEL_CITY_LIGHTS', description: 'Nocturnal pixel glow.' },
  { id: 'CHERRY_BLOSSOM_NOIR', name: 'Sakura Noir', price: 250, currency: 'GEMS', tier: 'EPIC', type: 'SLEEVE', style: 'CHERRY_BLOSSOM_NOIR', description: 'Obsidian wood with glowing blossoms.' },
  { id: 'DRAGON_SCALE', name: 'Dragon Skin', price: 350, currency: 'GEMS', tier: 'EPIC', type: 'SLEEVE', style: 'DRAGON_SCALE', description: 'Ancient high-heat forged plating.' },
  { id: 'CRYSTAL_EMERALD', name: 'Crystal Gem', price: 450, currency: 'GEMS', tier: 'EPIC', type: 'SLEEVE', style: 'CRYSTAL_EMERALD', description: 'Prismatic diffraction surfacing.' },
  { id: 'AETHER_VOID', name: 'Aether Noir', price: 1000, currency: 'GEMS', tier: 'LEGENDARY', type: 'SLEEVE', style: 'AETHER_VOID', description: 'Clash of celestial light and darkness.' },
  { id: 'WITS_END', name: "Wit's End", price: 1250, currency: 'GEMS', tier: 'LEGENDARY', type: 'SLEEVE', style: 'WITS_END', description: 'Ethereal void pulsing with energy.' },
  { id: 'ROYAL_JADE', name: 'Imperial Jade', price: 1500, currency: 'GEMS', tier: 'LEGENDARY', type: 'SLEEVE', style: 'ROYAL_JADE', description: 'Polished emerald with gold trim.' },
  { id: 'DIVINE_ROYAL', name: 'Divine Royal', price: 2000, currency: 'GEMS', tier: 'LEGENDARY', type: 'SLEEVE', style: 'DIVINE_ROYAL', description: 'Ivory parchment with animated aura.' },
  { id: 'ROYAL_CROSS', name: 'Royal Cross', price: 5000, currency: 'GEMS', tier: 'MYTHIC', type: 'SLEEVE', style: 'ROYAL_CROSS', description: 'Monochrome excellence.' },
  { id: 'EMPERORS_HUBRIS', name: "Emperor's Hubris", price: 7500, currency: 'GEMS', tier: 'MYTHIC', type: 'SLEEVE', style: 'EMPERORS_HUBRIS', description: 'Liquid gold with an embossed dragon.' },
  { id: 'GOLDEN_IMPERIAL', name: 'Sun King', price: 10000, currency: 'GEMS', tier: 'MYTHIC', type: 'SLEEVE', style: 'GOLDEN_IMPERIAL', description: '24-karat polished gold leafing.' },
  { id: 'SOVEREIGN_SPADE', name: 'Sovereign Spade', price: -1, currency: 'GOLD', tier: 'RARE', type: 'SLEEVE', style: 'SOVEREIGN_SPADE', description: 'Claim at Level 10.' },
  { id: 'SOVEREIGN_CLUB', name: 'Sovereign Club', price: -1, currency: 'GOLD', tier: 'EPIC', type: 'SLEEVE', style: 'SOVEREIGN_CLUB', description: 'Claim at Level 20.' },
  { id: 'SOVEREIGN_DIAMOND', name: 'Sovereign Diamond', price: -1, currency: 'GOLD', tier: 'LEGENDARY', type: 'SLEEVE', style: 'SOVEREIGN_DIAMOND', description: 'Claim at Level 30.' },
  { id: 'SOVEREIGN_HEART', name: 'Sovereign Heart', price: -1, currency: 'GOLD', tier: 'MYTHIC', type: 'SLEEVE', style: 'SOVEREIGN_HEART', description: 'Claim at Level 40.' },
];

export const TIER_COLORS: Record<string, string> = {
  COMMON: 'text-white border-white/20 bg-white/5',
  RARE: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  EPIC: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  LEGENDARY: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  MYTHIC: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
};

const TIER_SUIT_MAP: Record<string, string> = { RARE: '♠', EPIC: '♣', LEGENDARY: '♦', MYTHIC: '♥' };

const TIER_INFO_DATA = [
  { id: 'COMMON', name: 'Common', vibe: 'Simple, flat colors.', items: ['Imperial Blue', 'Dynasty Red'] },
  { id: 'RARE', name: 'Rare', vibe: 'Slight metallic sheen.', items: ['Royal Amethyst', 'Sovereign Spade'] },
  { id: 'EPIC', name: 'Epic', vibe: 'Glowing edges.', items: ['Sakura Noir', 'Sovereign Club'] },
  { id: 'LEGENDARY', name: 'Legendary', vibe: 'Animated effects.', items: ['Aether Noir', 'Sovereign Diamond'] },
  { id: 'MYTHIC', name: 'Mythic', vibe: 'Particle effects.', items: ['Royal Cross', 'Sovereign Heart'] },
];

const TierSystemModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 animate-in fade-in duration-300" onClick={onClose}>
    <div className="bg-[#080808] border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <h2 className="text-2xl font-black text-white uppercase italic tracking-widest font-serif leading-none">SLEEVE TIERING</h2>
        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90"><span className="text-xl">✕</span></button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {TIER_INFO_DATA.map(tier => (
          <div key={tier.id} className={`p-6 rounded-[2rem] border ${TIER_COLORS[tier.id]} space-y-2`}>
            <h3 className="text-lg font-black uppercase tracking-widest">{tier.name}</h3>
            <p className="text-[10px] text-white/60 uppercase">{tier.vibe}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const Store: React.FC<{
  onClose: () => void;
  profile: UserProfile | null;
  onRefreshProfile: () => void;
  onEquipSleeve: (sleeve: CardCoverStyle) => void;
  currentSleeve: CardCoverStyle;
  playerAvatar: string;
  onEquipAvatar: (avatar: string) => void;
  currentTheme: BackgroundTheme;
  onEquipBoard: (theme: BackgroundTheme) => void;
  isGuest?: boolean;
  initialTab?: 'SLEEVES' | 'AVATARS' | 'BOARDS';
}> = ({ 
  onClose, profile, onRefreshProfile, onEquipSleeve, 
  currentSleeve, playerAvatar, onEquipAvatar, currentTheme, onEquipBoard, isGuest, 
  initialTab = 'SLEEVES' 
}) => {
  const [activeTab, setActiveTab] = useState<'SLEEVES' | 'AVATARS' | 'BOARDS'>(initialTab);
  const [buying, setBuying] = useState<string | null>(null);
  const [previewThemeId, setPreviewThemeId] = useState<BackgroundTheme | null>(null);
  const [previewSleeveStyle, setPreviewSleeveStyle] = useState<CardCoverStyle | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [density, setDensity] = useState<1 | 2 | 4>(2);
  const [hideOwned, setHideOwned] = useState(false);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [showTierInfo, setShowTierInfo] = useState(false);
  
  const [pendingPurchase, setPendingPurchase] = useState<{ id: string, name: string, price: number, currency: 'GOLD' | 'GEMS', type: 'SLEEVE' | 'AVATAR' | 'BOARD', style?: CardCoverStyle } | null>(null);
  const [awardItem, setAwardItem] = useState<{ id: string, name: string, type: 'SLEEVE' | 'AVATAR' | 'BOARD', style?: CardCoverStyle } | null>(null);

  useEffect(() => { 
    setActiveTab(initialTab);
    if (typeof fetchEmotes === 'function') fetchEmotes().then(setRemoteEmotes);
  }, [initialTab]);

  const isUnlockedSleeve = (itemId: string) => profile?.unlocked_sleeves.includes(itemId) || SLEEVES.find(s => s.id === itemId)?.price === 0;
  const isAvatarUnlocked = (avatar: string) => profile?.unlocked_avatars?.includes(avatar) || DEFAULT_AVATARS.includes(avatar);
  const isUnlockedBoard = (id: string) => profile?.unlocked_boards.includes(id) || PREMIUM_BOARDS.find(b => b.id === id)?.price === 0;

  const handlePurchaseAttempt = (item: any, isAvatar: boolean = false, isBoard: boolean = false) => {
    if (!profile) return;
    const id = isAvatar ? item : item.id;
    const price = isAvatar ? 250 : item.price;
    const currency = isAvatar ? 'GOLD' : (isBoard ? 'GOLD' : item.currency);
    if (!isAvatar && !isBoard && price === -1) return;
    const type = isAvatar ? 'AVATAR' : isBoard ? 'BOARD' : 'SLEEVE';
    setPendingPurchase({ id, name: isAvatar ? getAvatarName(id, remoteEmotes) : item.name, price, currency: currency as any, type, style: isAvatar ? undefined : item.style });
  };

  const executePurchase = async () => {
    if (!pendingPurchase || !profile || buying) return;
    const itemAsStoreItem = SLEEVES.find(s => s.id === pendingPurchase.id) || PREMIUM_BOARDS.find(b => b.id === pendingPurchase.id) || { price: pendingPurchase.price, currency: pendingPurchase.currency } as any;
    if (!canAfford(itemAsStoreItem, profile.coins, profile.gems)) return;
    setBuying(pendingPurchase.id);
    try {
      await buyItem(profile!.id, pendingPurchase.price, pendingPurchase.id, pendingPurchase.type, !!isGuest);
      audioService.playPurchase();
      setAwardItem({ id: pendingPurchase.id, name: pendingPurchase.name, type: pendingPurchase.type, style: pendingPurchase.style });
      setPendingPurchase(null);
      onRefreshProfile();
    } catch (err) { console.error(err); } finally { setBuying(null); }
  };

  const renderItemCard = (item: any, isAvatar: boolean = false, isBoard: boolean = false) => {
    const unlocked = isAvatar ? isAvatarUnlocked(item) : isBoard ? isUnlockedBoard(item.id) : isUnlockedSleeve(item.id);
    if (hideOwned && unlocked) return null;
    const id = isAvatar ? item : item.id;
    const price = isAvatar ? 250 : item.price;
    const currency = isAvatar ? 'GOLD' : (isBoard ? 'GOLD' : item.currency);
    const userGold = profile?.coins || 0;
    const userGems = profile?.gems || 0;
    const affordable = isAvatar || isBoard ? userGold >= price : canAfford(item, userGold, userGems);
    const tier = item.tier || 'COMMON';
    let isEquipped = isAvatar ? playerAvatar === item : isBoard ? currentTheme === item.id : currentSleeve === item.style;
    const cardPadding = density === 4 ? 'p-2 sm:p-3' : density === 2 ? 'p-4 sm:p-6' : 'p-8 sm:p-10';

    return (
      <div key={id} onClick={() => { if (unlocked) { if (isAvatar) setPreviewAvatar(item); else if (isBoard) setPreviewThemeId(item.id); else setPreviewSleeveStyle(item.style); } else { handlePurchaseAttempt(item, isAvatar, isBoard); } }} className={`relative group bg-white/[0.02] border border-white/5 rounded-[2rem] ${cardPadding} flex flex-col items-center gap-1 sm:gap-3 transition-all hover:bg-white/[0.04] hover:border-yellow-500/20 shadow-xl cursor-pointer`}>
        {!isAvatar && !isBoard && tier !== 'COMMON' && (
          <div className="absolute top-2.5 left-2.5 z-20">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border shadow-[0_0_10px_rgba(0,0,0,0.5)] ${TIER_COLORS[tier]}`}>{TIER_SUIT_MAP[tier]}</div>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5 z-20">
          {unlocked && isEquipped && <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[7px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.5)]">✓</div>}
        </div>
        <div className={`py-1 sm:py-3 flex-1 flex flex-col items-center justify-center w-full transition-transform duration-300`}>
          {isAvatar ? (
            <div className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center group-hover:scale-110 transition-transform duration-500"><VisualEmote trigger={item} remoteEmotes={remoteEmotes} size="lg" /></div>
          ) : isBoard ? (
            <div className="w-full"><BoardPreview themeId={item.id} unlocked={unlocked} active={isEquipped} hideActiveMarker={true} /></div>
          ) : (
            <div className="relative group/card"><Card faceDown coverStyle={item.style} activeTurn={true} className={`${density === 4 ? '!w-16 !h-24' : '!w-24 !h-36'} shadow-2xl group-hover:scale-110 transition-transform`} /></div>
          )}
        </div>
        <span className={`${density === 4 ? 'text-[7px]' : 'text-[9px] sm:text-[10px]'} font-black uppercase text-center tracking-widest text-white/50 truncate w-full mb-1`}>{isAvatar ? getAvatarName(item, remoteEmotes) : item.name}</span>
        <div className="w-full mt-auto">
          <button onClick={(e) => { e.stopPropagation(); if (unlocked) { if (isAvatar) onEquipAvatar(item); else if (isBoard) onEquipBoard(item.id); else onEquipSleeve(item.style); } else { handlePurchaseAttempt(item, isAvatar, isBoard); } }} disabled={isEquipped || (!unlocked && !affordable && price !== -1) || buying === id} className={`w-full py-2 rounded-xl font-black uppercase tracking-[0.15em] text-[8px] sm:text-[8.5px] transition-all ${isEquipped ? 'bg-emerald-600 text-white shadow-lg' : unlocked ? 'bg-white/5 text-white/80 hover:bg-white/10' : price === -1 ? 'bg-white/[0.05] text-yellow-500 border border-yellow-500/20 cursor-default' : affordable ? 'bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-black shadow-lg hover:scale-105 active:scale-95' : 'bg-white/[0.03] text-white/10 border border-white/5 cursor-not-allowed grayscale'}`}>
            {buying === id ? '...' : isEquipped ? 'Active' : unlocked ? 'Equip' : price === -1 ? 'LOCKED' : <div className="flex items-center justify-center gap-1"><CurrencyIcon type={currency as any} size="sm" /><span>{price.toLocaleString()}</span></div>}
          </button>
        </div>
      </div>
    );
  };

  const gridClass = density === 4 ? 'grid-cols-3' : density === 1 ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      {showTierInfo && <TierSystemModal onClose={() => setShowTierInfo(false)} />}
      {previewThemeId && <DummyTablePreview themeId={previewThemeId} onClose={() => setPreviewThemeId(null)} />}
      {previewSleeveStyle && <SleeveArenaPreview sleeveStyle={previewSleeveStyle} themeId={currentTheme} sleeveEffectsEnabled={profile?.sleeve_effects_enabled !== false} onClose={() => setPreviewSleeveStyle(null)} />}
      {previewAvatar && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-200" onClick={() => setPreviewAvatar(null)}>
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[3rem] p-10 flex flex-col items-center text-center shadow-[0_0_150px_rgba(251,191,36,0.1)] relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewAvatar(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><span className="text-xl font-black">✕</span></button>
            <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-black/60 border border-yellow-500/20 flex items-center justify-center mb-8 overflow-hidden shadow-inner">
               <VisualEmote trigger={previewAvatar} remoteEmotes={remoteEmotes} size="xl" />
            </div>
            <h3 className="text-white font-black uppercase tracking-widest text-lg mb-2">{getAvatarName(previewAvatar, remoteEmotes)}</h3>
            <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em] mb-10 italic">Elite Signature Series</p>
            <div className="w-full">
              {isAvatarUnlocked(previewAvatar) ? (
                <button onClick={() => { onEquipAvatar(previewAvatar); setPreviewAvatar(null); }} className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] transition-all shadow-xl ${playerAvatar === previewAvatar ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default' : 'bg-emerald-600 text-white hover:scale-105 active:scale-95'}`} disabled={playerAvatar === previewAvatar}>{playerAvatar === previewAvatar ? 'EQUIPPED' : 'EQUIP'}</button>
              ) : (
                <button onClick={() => handlePurchaseAttempt(previewAvatar, true)} disabled={profile.coins < 250 || !!buying} className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-black font-black uppercase tracking-[0.25em] text-[11px] shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">{buying === previewAvatar ? 'UNREELING...' : `UNLOCK | 💰 250`}</button>
              )}
            </div>
          </div>
        </div>
      )}
      {pendingPurchase && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[3rem] p-8 pt-20 flex flex-col items-center text-center shadow-[0_0_100px_rgba(234,179,8,0.15)] relative">
                  <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                      <div className="absolute inset-[-40px] bg-yellow-500/10 blur-[60px] rounded-full animate-pulse"></div>
                      {pendingPurchase.type === 'BOARD' ? <div className="w-56 aspect-[16/10] rounded-3xl overflow-hidden border-2 border-yellow-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative"><BoardPreview themeId={pendingPurchase.id} hideActiveMarker={true} /></div> : pendingPurchase.type === 'SLEEVE' ? <div className="transform rotate-[-4deg]"><Card faceDown coverStyle={pendingPurchase.style} className="!w-32 !h-48 shadow-[0_25px_60px_rgba(0,0,0,0.9)] border-2 border-yellow-500/40 rounded-2xl" activeTurn={true} /></div> : <div className="w-32 h-32 rounded-full bg-black border-2 border-yellow-500/40 shadow-[0_0_40px_rgba(234,179,8,0.4)] flex items-center justify-center overflow-hidden"><VisualEmote trigger={pendingPurchase.id} remoteEmotes={remoteEmotes} size="lg" /></div>}
                  </div>
                  <h3 className="text-white font-black uppercase tracking-tight text-2xl mb-2 mt-6 font-serif italic whitespace-nowrap">Secure Asset?</h3>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-8 px-4 leading-relaxed flex items-center justify-center gap-1 flex-wrap">Unlock <span className="text-white font-bold">{pendingPurchase.name}</span> for <span className="text-white font-bold">{pendingPurchase.price}</span> <CurrencyIcon type={pendingPurchase.currency} size="sm" /></p>
                  <div className="flex flex-col gap-3 w-full">
                      <div className="grid grid-cols-2 gap-3 w-full">
                          <button onClick={() => setPendingPurchase(null)} className="py-3.5 rounded-xl bg-white/5 border border-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all active:scale-95">Cancel</button>
                          <button onClick={executePurchase} disabled={!!buying || (pendingPurchase.currency === 'GOLD' ? (profile?.coins || 0) < (pendingPurchase.price as number) : pendingPurchase.currency === 'GEMS' ? (profile?.gems || 0) < (pendingPurchase.price as number) : false)} className="py-3.5 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 text-black text-[10px] font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(234,179,8,0.2)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">{buying ? '...' : 'Confirm'}</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      {awardItem && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="relative flex flex-col items-center text-center max-sm:px-4"><h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-yellow-200 to-yellow-500 uppercase tracking-tighter italic animate-award-text">ASSET SECURED</h2><p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500 mt-4 animate-award-text">{(awardItem as any).name} • UNLOCKED</p><button onClick={() => setAwardItem(null)} className="mt-12 px-12 py-4 rounded-full bg-white text-black font-black uppercase tracking-[0.3em] text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl animate-award-text">DEPLOY ASSET</button></div>
          </div>
      )}
      <div className="relative bg-[#050505] border border-white/10 w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-50 flex flex-col gap-2">
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 sm:gap-2.5 shadow-2xl cursor-default"><CurrencyIcon type="GOLD" size="sm" /><span className="text-[11px] sm:text-[13px] font-black text-white tracking-tighter font-mono">{profile?.coins.toLocaleString()}</span></div>
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 sm:gap-2.5 shadow-2xl cursor-default"><CurrencyIcon type="GEMS" size="sm" /><span className="text-[11px] sm:text-[13px] font-black text-white/90 tracking-tighter font-mono">{(profile?.gems || 0).toLocaleString()}</span></div>
        </div>
        <button onClick={onClose} className="absolute top-4 sm:top-6 right-4 sm:right-6 z-50 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.03] hover:bg-red-600 border border-white/10 text-white rounded-lg flex items-center justify-center transition-all group shadow-2xl"><span className="text-xs sm:text-sm font-black group-hover:rotate-90 transition-transform">✕</span></button>
        <div className="px-4 sm:px-8 pb-1 flex flex-col items-center justify-center mt-20 sm:mt-12"><h2 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/40 uppercase tracking-tighter italic font-serif px-2">XIII SHOP</h2><p className="text-[8px] sm:text-[9px] font-black tracking-[0.6em] sm:tracking-[0.8em] text-gray-600 mt-1 uppercase">UP YOUR GAME</p>
          <div className="flex flex-col items-center gap-2 mt-3 w-full">
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/60 rounded-full border border-white/10 w-full max-sm:max-w-[320px] max-w-xl shadow-inner">
              {(['SLEEVES', 'AVATARS', 'BOARDS'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-1.5 sm:py-2 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>{tab}</button>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 bg-black/40 p-1 rounded-full border border-white/5 shadow-inner">
              <div className="flex gap-0.5 pr-2 border-r border-white/10">
                {([1, 2, 4] as const).map(d => (<button key={d} onClick={() => setDensity(d)} className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${density === d ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/50'}`}>{d === 1 ? <GridIcon1 /> : d === 2 ? <GridIcon2 /> : <GridIcon4 />}</button>))}
              </div>
              <div className="flex items-center gap-4 px-2">
                <button onClick={() => setHideOwned(!hideOwned)} className="flex items-center gap-2 group cursor-pointer"><span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${hideOwned ? 'text-yellow-500' : 'text-white/30'}`}>Owned</span><div className={`w-8 h-4 rounded-full relative transition-all duration-500 ${hideOwned ? 'bg-emerald-600' : 'bg-white/5 border border-white/10'}`}><div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-500 ${hideOwned ? 'translate-x-4 bg-white' : 'translate-x-0.5 bg-white/20'}`}></div></div></button>
                {activeTab === 'SLEEVES' && (<button onClick={() => setShowTierInfo(true)} className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all shadow-xl active:scale-90 group"><span className="text-[10px] font-black italic">i</span></button>)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className={`grid ${gridClass} gap-2.5 sm:gap-6`}>{activeTab === 'SLEEVES' ? SLEEVES.map(s => renderItemCard(s)) : activeTab === 'AVATARS' ? PREMIUM_AVATARS.map(a => renderItemCard(a, true)) : PREMIUM_BOARDS.map(b => renderItemCard(b, false, true))}</div>
        </div>
      </div>
    </div>
  );
};