
import React, { useState, useEffect } from 'react';
import { Card, CardCoverStyle } from './Card';
import { UserProfile, BackgroundTheme, Emote, Rank, Suit, Card as CardType } from '../types';
import { buyItem, DEFAULT_AVATARS, PREMIUM_AVATARS, getAvatarName, fetchEmotes } from '../services/supabase';
import { PREMIUM_BOARDS, BoardPreview, BoardSurface } from './UserHub';
import { audioService } from '../services/audio';
import { VisualEmote } from './VisualEmote';

interface StoreProps {
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
}

interface StoreItem {
  id: string;
  name: string;
  price: number;
  type: 'SLEEVE' | 'AVATAR' | 'BOARD';
  style?: CardCoverStyle;
  description: string;
  tier: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
}

export const SLEEVES: StoreItem[] = [
  // COMMON
  { id: 'BLUE', name: 'Imperial Blue', price: 0, tier: 'COMMON', type: 'SLEEVE', style: 'BLUE', description: 'Standard navy finish.' },
  { id: 'RED', name: 'Dynasty Red', price: 0, tier: 'COMMON', type: 'SLEEVE', style: 'RED', description: 'Lustrous red finish.' },
  
  // RARE (Spades Theme)
  { id: 'AMETHYST_ROYAL', name: 'Royal Amethyst', price: 1500, tier: 'RARE', type: 'SLEEVE', style: 'AMETHYST_ROYAL', description: 'Velvet silk with silver filigree.' },
  { id: 'VOID_ONYX', name: 'Void Walker', price: 2000, tier: 'RARE', type: 'SLEEVE', style: 'VOID_ONYX', description: 'Matte black with indigo traces.' },
  { id: 'NEON_CYBER', name: 'Neon Circuit', price: 2500, tier: 'RARE', type: 'SLEEVE', style: 'NEON_CYBER', description: 'Active energetic circuitry.' },
  { id: 'SOVEREIGN_SPADE', name: 'Sovereign Spade', price: 3000, tier: 'RARE', type: 'SLEEVE', style: 'SOVEREIGN_SPADE', description: 'The original rare spade signature.' },

  // EPIC (Clubs Theme)
  { id: 'CHERRY_BLOSSOM_NOIR', name: 'Sakura Noir', price: 4500, tier: 'EPIC', type: 'SLEEVE', style: 'CHERRY_BLOSSOM_NOIR', description: 'Obsidian wood with glowing blossoms.' },
  { id: 'DRAGON_SCALE', name: 'Dragon Skin', price: 5000, tier: 'EPIC', type: 'SLEEVE', style: 'DRAGON_SCALE', description: 'Ancient high-heat forged plating.' },
  { id: 'CRYSTAL_EMERALD', name: 'Crystal Gem', price: 5500, tier: 'EPIC', type: 'SLEEVE', style: 'CRYSTAL_EMERALD', description: 'Prismatic diffraction surfacing.' },
  { id: 'PIXEL_CITY_LIGHTS', name: 'Pixel Lights', price: 6000, tier: 'EPIC', type: 'SLEEVE', style: 'PIXEL_CITY_LIGHTS', description: 'Nocturnal pixel glow.' },
  { id: 'SOVEREIGN_CLUB', name: 'Sovereign Club', price: 7500, tier: 'EPIC', type: 'SLEEVE', style: 'SOVEREIGN_CLUB', description: 'The original epic club signature.' },

  // LEGENDARY (Diamonds Theme)
  { id: 'AETHER_VOID', name: 'Aether Noir', price: 12000, tier: 'LEGENDARY', type: 'SLEEVE', style: 'AETHER_VOID', description: 'Clash of celestial light and darkness.' },
  { id: 'WITS_END', name: "Wit's End", price: 15000, tier: 'LEGENDARY', type: 'SLEEVE', style: 'WITS_END', description: 'Ethereal void pulsing with energy.' },
  { id: 'ROYAL_JADE', name: 'Imperial Jade', price: 18000, tier: 'LEGENDARY', type: 'SLEEVE', style: 'ROYAL_JADE', description: 'Polished emerald with gold trim.' },
  { id: 'DIVINE_ROYAL', name: 'Divine Royal', price: 20000, tier: 'LEGENDARY', type: 'SLEEVE', style: 'DIVINE_ROYAL', description: 'Ivory parchment with animated aura.' },
  { id: 'SOVEREIGN_DIAMOND', name: 'Sovereign Diamond', price: 25000, tier: 'LEGENDARY', type: 'SLEEVE', style: 'SOVEREIGN_DIAMOND', description: 'The original legendary diamond signature.' },

  // MYTHIC (Hearts Theme)
  { id: 'EMPERORS_HUBRIS', name: "Emperor's Hubris", price: 50000, tier: 'MYTHIC', type: 'SLEEVE', style: 'EMPERORS_HUBRIS', description: 'Liquid gold with an embossed dragon.' },
  { id: 'GOLDEN_IMPERIAL', name: 'Sun King', price: 75000, tier: 'MYTHIC', type: 'SLEEVE', style: 'GOLDEN_IMPERIAL', description: '24-karat polished gold leafing.' },
  { id: 'SOVEREIGN_HEART', name: 'Sovereign Heart', price: 100000, tier: 'MYTHIC', type: 'SLEEVE', style: 'SOVEREIGN_HEART', description: 'The ultimate Mythic heart signature.' },
];

export const SUPER_PRESTIGE_SLEEVE_IDS = ['SOVEREIGN_HEART', 'AETHER_VOID', 'WITS_END', 'EMPERORS_HUBRIS', 'GOLDEN_IMPERIAL', 'VOID_ONYX', 'ROYAL_JADE', 'CRYSTAL_EMERALD', 'DRAGON_SCALE', 'NEON_CYBER', 'PIXEL_CITY_LIGHTS', 'AMETHYST_ROYAL', 'CHERRY_BLOSSOM_NOIR'];

export const TIER_COLORS: Record<string, string> = {
  COMMON: 'text-white border-white/20 bg-white/5',
  RARE: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  EPIC: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  LEGENDARY: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  MYTHIC: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
};

const TIER_SUIT_MAP: Record<string, string> = {
  RARE: '♠',
  EPIC: '♣',
  LEGENDARY: '♦',
  MYTHIC: '♥'
};

const TIER_INFO_DATA: { id: string, name: string, vibe: string, suit?: string, items: CardCoverStyle[] }[] = [
  { id: 'COMMON', name: 'Common', vibe: 'Simple, flat colors, matte finish.', items: ['BLUE', 'RED'] },
  { id: 'RARE', name: 'Rare', vibe: 'Slight metallic sheen, clean lines.', suit: 'Spades ♠', items: ['AMETHYST_ROYAL', 'VOID_ONYX', 'NEON_CYBER', 'SOVEREIGN_SPADE'] },
  { id: 'EPIC', name: 'Epic', vibe: 'Glowing edges, subtle patterns.', suit: 'Clubs ♣', items: ['CHERRY_BLOSSOM_NOIR', 'DRAGON_SCALE', 'CRYSTAL_EMERALD', 'PIXEL_CITY_LIGHTS', 'SOVEREIGN_CLUB'] },
  { id: 'LEGENDARY', name: 'Legendary', vibe: 'Animated effects, gold foil, 3D depth.', suit: 'Diamonds ♦', items: ['AETHER_VOID', 'WITS_END', 'ROYAL_JADE', 'DIVINE_ROYAL', 'SOVEREIGN_DIAMOND'] },
  { id: 'MYTHIC', name: 'Mythic', vibe: 'Particle effects, changing colors, unique frames.', suit: 'Hearts ♥', items: ['EMPERORS_HUBRIS', 'GOLDEN_IMPERIAL', 'SOVEREIGN_HEART'] },
];

const TierSystemModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 animate-in fade-in duration-300" onClick={onClose}>
    <div className="bg-[#080808] border border-white/10 w-full max-w-3xl max-h-[85vh] rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
      <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-widest font-serif leading-none">SLEEVE TIERING</h2>
          <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500 mt-2">Asset Rarity Documentation</p>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90"><span className="text-xl">✕</span></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {TIER_INFO_DATA.map(tier => (
          <div key={tier.id} className={`p-6 rounded-[2rem] border ${TIER_COLORS[tier.id]} space-y-4 relative overflow-hidden group`}>
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
               <span className="text-7xl font-black uppercase italic">{tier.name}</span>
            </div>
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                 <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor]`} style={{ color: tier.id === 'COMMON' ? '#fff' : tier.id === 'RARE' ? '#60a5fa' : tier.id === 'EPIC' ? '#c084fc' : tier.id === 'LEGENDARY' ? '#fbbf24' : '#fb7185' }}></div>
                 <h3 className="text-lg font-black uppercase tracking-widest">{tier.name}</h3>
              </div>
              {tier.suit && <span className="text-sm font-black opacity-60 italic">{tier.suit} Set</span>}
            </div>

            <div className="space-y-1">
              <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">Visual Vibe</span>
              <p className="text-[10px] text-white/80 leading-relaxed uppercase">{tier.vibe}</p>
            </div>

            <div className="pt-2 border-t border-white/5">
              <span className="text-[7px] font-black text-white/20 uppercase tracking-widest block mb-4">Signature Assets</span>
              <div className="grid grid-cols-5 gap-3">
                {tier.items.map(style => (
                  <div key={style} className="flex flex-col items-center gap-1 group/sleeve">
                    <Card faceDown coverStyle={style} small className="!w-12 !h-18 shadow-xl transition-transform group-hover/sleeve:scale-105 activeTurn={true} />
                    <span className="text-[6px] font-black text-white/20 uppercase tracking-tighter truncate w-full text-center group-hover/sleeve:text-white/40 transition-colors">
                      {style.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const SleeveArenaPreview: React.FC<{
  sleeveStyle: CardCoverStyle;
  themeId: BackgroundTheme;
  sleeveEffectsEnabled: boolean;
  onClose: () => void;
}> = ({ sleeveStyle, themeId, sleeveEffectsEnabled, onClose }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden" onClick={onClose}>
      <BoardSurface themeId={themeId} isMini />
      <div className="relative z-10 w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-8 flex justify-between items-start">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black text-white tracking-[0.2em] drop-shadow-2xl uppercase italic">ARENA DEPLOYMENT</h1>
            <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.6em] mt-2">Active Sleeve Signature Loaded</p>
          </div>
          <button onClick={onClose} className="group flex items-center gap-3 px-8 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
            <span className="group-hover:-translate-x-1 transition-transform">RETURN ←</span>
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-white/10 blur-[100px] rounded-full scale-150 animate-pulse"></div>
            <div className="transform rotate-[-6deg] hover:rotate-0 transition-transform duration-700">
              <Card faceDown activeTurn={true} coverStyle={sleeveStyle} className="!w-64 !h-[380px] shadow-[0_60px_120px_rgba(0,0,0,0.8)] ring-1 ring-white/20 rounded-[2rem]" disableEffects={!sleeveEffectsEnabled} />
            </div>
          </div>
        </div>
        
        <div className="p-12 flex justify-center">
           <div className="bg-black/40 backdrop-blur-xl px-10 py-4 rounded-full border border-white/10">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.8em]">Preview Mode // {sleeveStyle}</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export const DummyTablePreview: React.FC<{
  themeId: BackgroundTheme;
  onClose: () => void;
}> = ({ themeId, onClose }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden" onClick={onClose}>
      <BoardSurface themeId={themeId} isMini />
      <div className="relative z-10 w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-8 flex justify-between items-start">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black text-white tracking-[0.2em] drop-shadow-2xl uppercase italic">ARENA SURFACE PREVIEW</h1>
            <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.6em] mt-2">Surface Profile Loaded</p>
          </div>
          <button onClick={onClose} className="group flex items-center gap-3 px-8 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
            <span className="group-hover:-translate-x-1 transition-transform">RETURN ←</span>
          </button>
        </div>
        <div className="flex-1"></div>
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

export const Store: React.FC<StoreProps> = ({ 
  onClose, profile, onRefreshProfile, onEquipSleeve, 
  currentSleeve, playerAvatar, onEquipAvatar, currentTheme, onEquipBoard, isGuest, 
  initialTab = 'SLEEVES' 
}) => {
  const [activeTab, setActiveTab] = useState<'SLEEVES' | 'AVATARS' | 'BOARDS'>(initialTab as any);
  const [buying, setBuying] = useState<string | null>(null);
  const [previewThemeId, setPreviewThemeId] = useState<BackgroundTheme | null>(null);
  const [previewSleeveStyle, setPreviewSleeveStyle] = useState<CardCoverStyle | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [density, setDensity] = useState<1 | 2 | 4>(2);
  const [hideOwned, setHideOwned] = useState(false);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [showTierInfo, setShowTierInfo] = useState(false);
  
  const [pendingPurchase, setPendingPurchase] = useState<{ id: string, name: string, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD', style?: CardCoverStyle } | null>(null);
  const [awardItem, setAwardItem] = useState<{ id: string, name: string, type: 'SLEEVE' | 'AVATAR' | 'BOARD', style?: CardCoverStyle } | null>(null);

  useEffect(() => { 
    setActiveTab(initialTab as any);
    if (typeof fetchEmotes === 'function') fetchEmotes().then(setRemoteEmotes);
  }, [initialTab]);

  const isUnlockedSleeve = (itemId: string) => profile?.unlocked_sleeves.includes(itemId) || SLEEVES.find(s => s.id === itemId)?.price === 0;
  const isUnlockedAvatar = (avatar: string) => profile?.unlocked_avatars?.includes(avatar) || DEFAULT_AVATARS.includes(avatar);
  const isUnlockedBoard = (id: string) => profile?.unlocked_boards.includes(id) || PREMIUM_BOARDS.find(b => b.id === id)?.price === 0;

  const handlePurchaseAttempt = (item: any, isAvatar: boolean = false, isBoard: boolean = false) => {
    if (!profile) return;
    const id = isAvatar ? item : item.id;
    const price = isAvatar ? 250 : item.price;
    const type = isAvatar ? 'AVATAR' : isBoard ? 'BOARD' : 'SLEEVE';
    
    setPendingPurchase({
      id,
      name: isAvatar ? getAvatarName(id, remoteEmotes) : item.name,
      price,
      type,
      style: isAvatar ? undefined : item.style
    });
  };

  const executePurchase = async () => {
    if (!pendingPurchase || !profile || buying) return;
    if (profile.coins < pendingPurchase.price) return;
    setBuying(pendingPurchase.id);
    try {
      await buyItem(profile!.id, pendingPurchase.price, pendingPurchase.id, pendingPurchase.type as any, !!isGuest);
      audioService.playPurchase();
      setAwardItem({
        id: pendingPurchase.id,
        name: pendingPurchase.name,
        type: pendingPurchase.type,
        style: pendingPurchase.style
      });
      setPendingPurchase(null);
      onRefreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setBuying(null);
    }
  };

  const renderItemCard = (item: any, isAvatar: boolean = false, isBoard: boolean = false) => {
    const unlocked = isAvatar ? isUnlockedAvatar(item) : isBoard ? isUnlockedBoard(item.id) : isUnlockedSleeve(item.id);
    if (hideOwned && unlocked) return null;

    const id = isAvatar ? item : item.id;
    const price = isAvatar ? 250 : item.price;
    const canAfford = (profile?.coins || 0) >= price;
    const itemName = isAvatar ? getAvatarName(item, remoteEmotes) : item.name;
    const tier = item.tier || 'COMMON';
    
    let isEquipped = false;
    if (isAvatar) isEquipped = playerAvatar === item;
    else if (isBoard) isEquipped = currentTheme === item.id;
    else isEquipped = currentSleeve === item.style;

    const cardPadding = density === 4 ? 'p-2 sm:p-3' : density === 2 ? 'p-4 sm:p-6' : 'p-8 sm:p-10';
    const visualSize = density === 4 ? 'scale-100' : density === 2 ? 'scale-100' : 'scale-110';
    const nameSize = density === 4 ? 'text-[7px]' : 'text-[9px] sm:text-[10px]';

    return (
      <div 
        key={id} 
        onClick={() => {
            if (unlocked) {
                if (isAvatar) setPreviewAvatar(item);
                else if (isBoard) setPreviewThemeId(item.id);
                else setPreviewSleeveStyle(item.style);
            } else {
                handlePurchaseAttempt(item, isAvatar, isBoard);
            }
        }} 
        className={`relative group bg-white/[0.02] border border-white/5 rounded-[2rem] ${cardPadding} flex flex-col items-center gap-1 sm:gap-3 transition-all hover:bg-white/[0.04] hover:border-yellow-500/20 shadow-xl cursor-pointer`}
      >
        <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-2">
          {unlocked && isEquipped && (
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[7px] sm:text-[8px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.5)]">✓</div>
          )}
          {!isAvatar && !isBoard && tier !== 'COMMON' && (
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border shadow-[0_0_10px_rgba(0,0,0,0.5)] ${TIER_COLORS[tier]}`}>
              {TIER_SUIT_MAP[tier]}
            </div>
          )}
          {!isAvatar && !isBoard && tier === 'COMMON' && (
            <div className={`px-2 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest border ${TIER_COLORS[tier]}`}>
              {tier}
            </div>
          )}
        </div>

        <div className={`py-1 sm:py-3 flex-1 flex flex-col items-center justify-center w-full transition-transform duration-300 ${visualSize}`}>
          {isAvatar ? (
            <div className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
               <VisualEmote trigger={item} remoteEmotes={remoteEmotes} size="lg" />
            </div>
          ) : isBoard ? (
            <div className="w-full">
              <BoardPreview themeId={item.id} unlocked={unlocked} active={isEquipped} hideActiveMarker={true} />
            </div>
          ) : (
           <div className="relative group/card">
              <Card faceDown coverStyle={item.style} activeTurn={true} className={`${density === 4 ? '!w-16 !h-24' : '!w-24 !h-36'} shadow-2xl group-hover:scale-110 transition-transform`} />
           </div>
          )}
        </div>

        <span className={`${nameSize} font-black uppercase text-center tracking-widest text-white/50 truncate w-full px-1 mb-1 group-hover:text-yellow-500/80 transition-colors`}>
            {itemName}
        </span>

        <div className="w-full mt-auto">
          <button
            onClick={(e) => { e.stopPropagation(); unlocked ? (isAvatar ? onEquipAvatar(item) : isBoard ? onEquipBoard(item.id) : onEquipSleeve(item.style)) : handlePurchaseAttempt(item, isAvatar, isBoard); }}
            disabled={isEquipped || (!unlocked && !canAfford) || buying === id}
            className={`
              w-full py-2 rounded-xl font-black uppercase ${density === 4 ? 'text-[7px]' : 'text-[8px] sm:text-[9px]'} tracking-[0.15em] transition-all 
              ${isEquipped 
                ? 'bg-emerald-600 text-white shadow-lg' 
                : unlocked 
                  ? 'bg-white/5 text-white/80 hover:bg-white/10' 
                  : canAfford 
                    ? 'bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-black shadow-lg hover:scale-105 active:scale-95' 
                    : 'bg-white/[0.03] text-white/10 border border-white/5 cursor-not-allowed grayscale'}
            `}
          >
            {buying === id ? '...' : isEquipped ? 'Active' : unlocked ? 'Equip' : `💰 ${price}`}
          </button>
        </div>
      </div>
    );
  };

  const gridClass = density === 4 
    ? 'grid-cols-3' 
    : density === 1 
      ? 'grid-cols-1' 
      : 'grid-cols-2 lg:grid-cols-4';

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
              {isUnlockedAvatar(previewAvatar!) ? (
                <button 
                  onClick={() => { onEquipAvatar(previewAvatar!); setPreviewAvatar(null); }}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] transition-all shadow-xl ${playerAvatar === previewAvatar ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default' : 'bg-emerald-600 text-white hover:scale-105 active:scale-95'}`}
                  disabled={playerAvatar === previewAvatar}
                >
                  {playerAvatar === previewAvatar ? 'EQUIPPED' : 'EQUIP'}
                </button>
              ) : (
                <button 
                  onClick={() => { setPreviewAvatar(null); handlePurchaseAttempt(previewAvatar, true); }}
                  disabled={(profile && profile.coins < 250) || !!buying}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-black font-black uppercase tracking-[0.25em] text-[11px] shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  {buying === previewAvatar ? 'UNREELING...' : `UNLOCK | 💰 250`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {pendingPurchase && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="fixed top-8 left-8 z-[300] animate-in slide-in-from-left-4 fade-in duration-500 pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-3xl border border-yellow-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                      <span className="text-lg drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">💰</span>
                      <div className="flex flex-col">
                          <span className="text-[8px] font-black text-yellow-500/60 uppercase tracking-widest leading-none">Your Gold</span>
                          <span className="text-sm font-black text-white font-mono tracking-tighter leading-none mt-0.5">
                              {profile?.coins.toLocaleString()}
                          </span>
                      </div>
                  </div>
              </div>

              <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-xs rounded-[3rem] p-8 pt-20 flex flex-col items-center text-center shadow-[0_0_100px_rgba(234,179,8,0.15)] relative">
                  <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
                      <div className="absolute inset-[-40px] bg-yellow-500/10 blur-[60px] rounded-full animate-pulse"></div>
                      
                      {pendingPurchase.type === 'BOARD' ? (
                          <div className="w-56 aspect-[16/10] rounded-3xl overflow-hidden border-2 border-yellow-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
                             <BoardPreview themeId={pendingPurchase.id} hideActiveMarker={true} />
                          </div>
                      ) : pendingPurchase.type === 'SLEEVE' ? (
                          <div className="transform rotate-[-4deg]">
                             <Card faceDown coverStyle={pendingPurchase.style} className="!w-32 !h-48 shadow-[0_25px_60px_rgba(0,0,0,0.9)] border-2 border-yellow-500/40 rounded-2xl" activeTurn={true} />
                          </div>
                      ) : (
                          <div className="w-32 h-32 rounded-full bg-black border-2 border-yellow-500/40 shadow-[0_0_40px_rgba(234,179,8,0.4)] flex items-center justify-center overflow-hidden">
                             <VisualEmote trigger={pendingPurchase.id} remoteEmotes={remoteEmotes} size="lg" />
                          </div>
                      )}
                  </div>

                  <h3 className="text-white font-black uppercase tracking-tight text-2xl mb-2 mt-6 font-serif italic whitespace-nowrap">Secure Asset?</h3>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-8 px-4 leading-relaxed">
                    Unlock <span className="text-white font-bold">{pendingPurchase.name}</span> for <span className="text-yellow-500 font-bold">{pendingPurchase.price} GOLD</span>
                  </p>
                  
                  <div className="flex flex-col gap-3 w-full">
                      <div className="grid grid-cols-2 gap-3 w-full">
                          <button onClick={() => setPendingPurchase(null)} className="py-3.5 rounded-xl bg-white/5 border border-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all active:scale-95">Cancel</button>
                          <button 
                            onClick={executePurchase} 
                            disabled={!!buying || (profile && profile.coins < pendingPurchase.price)}
                            className="py-3.5 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 text-black text-[10px] font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(234,179,8,0.2)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                          >
                            {buying ? '...' : 'Confirm'}
                          </button>
                      </div>
                      
                      {pendingPurchase.type === 'SLEEVE' && (
                        <button 
                          onClick={() => setPreviewSleeveStyle(pendingPurchase.style!)}
                          className="w-full py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all active:scale-95"
                        >
                          🔍 PREVIEW ARENA
                        </button>
                      )}

                      {pendingPurchase.type === 'BOARD' && (
                        <button 
                          onClick={() => setPreviewThemeId(pendingPurchase.id as BackgroundTheme)}
                          className="w-full py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white/60 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all active:scale-95"
                        >
                          🔍 PREVIEW BOARD
                        </button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {awardItem && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden" onClick={e => e.stopPropagation()}>
              {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="absolute w-2 h-2 rounded-sm bg-yellow-500/40 animate-award-particle" style={{
                      left: '50%',
                      top: '50%',
                      '--tx': `${(Math.random() - 0.5) * 600}px`,
                      '--ty': `${(Math.random() - 0.5) * 600}px`,
                      '--rot': `${Math.random() * 360}deg`,
                      animationDelay: `${Math.random() * 0.2}s`
                  } as any}></div>
              ))}
              
              <div className="relative flex flex-col items-center text-center max-sm:px-4">
                  <div className="absolute inset-0 bg-yellow-500/10 blur-[120px] animate-pulse"></div>
                  
                  <div className="relative mb-10 animate-award-pop">
                      {awardItem.type === 'AVATAR' ? (
                          <div className="w-40 h-40 flex items-center justify-center">
                            <VisualEmote trigger={awardItem.id} remoteEmotes={remoteEmotes} size="xl" />
                          </div>
                      ) : awardItem.type === 'SLEEVE' ? (
                          <div className="relative">
                            <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full scale-150"></div>
                            <Card faceDown activeTurn={true} coverStyle={awardItem.style} className="!w-40 !h-60 shadow-[0_40px_80px_rgba(0,0,0,1)] ring-2 ring-yellow-500/50" />
                          </div>
                      ) : (
                          <div className="w-64 aspect-[16/10] rounded-3xl overflow-hidden ring-2 ring-yellow-500/50 shadow-2xl">
                             <BoardPreview themeId={awardItem.id} active={false} />
                          </div>
                      )}
                  </div>

                  <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-yellow-200 to-yellow-500 uppercase tracking-tighter italic animate-award-text">ASSET SECURED</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500 mt-4 animate-award-text [animation-delay:0.2s]">{awardItem.name} • UNLOCKED</p>
                  
                  <button 
                    onClick={() => setAwardItem(null)} 
                    className="mt-12 px-12 py-4 rounded-full bg-white text-black font-black uppercase tracking-[0.3em] text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl animate-award-text [animation-delay:0.4s]"
                  >
                    DEPLOY ASSET
                  </button>
              </div>
          </div>
      )}

      <div className="relative bg-[#050505] border border-white/10 w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-50">
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 sm:gap-2.5 shadow-2xl group cursor-default">
                <span className="text-base sm:text-lg drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] animate-pulse">💰</span>
                <span className="text-[11px] sm:text-[13px] font-black text-white leading-none tracking-tighter font-mono">
                    {profile?.coins.toLocaleString()}
                </span>
            </div>
        </div>

        <button 
            onClick={onClose} 
            className="absolute top-4 sm:top-6 right-4 sm:right-6 z-50 w-7 h-7 sm:w-8 sm:h-8 bg-white/[0.03] hover:bg-red-600 border border-white/10 text-white rounded-lg flex items-center justify-center transition-all active:scale-90 group shadow-2xl"
        >
            <span className="text-xs sm:text-sm font-black group-hover:rotate-90 transition-transform">✕</span>
        </button>

        <div className="px-4 sm:px-8 pb-1 flex flex-col items-center justify-center mt-12 sm:mt-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/40 uppercase tracking-tighter italic font-serif leading-none px-2">XIII SHOP</h2>
            </div>
            <p className="text-[8px] sm:text-[9px] font-black tracking-[0.6em] sm:tracking-[0.8em] text-gray-600 mt-1 sm:mt-2 uppercase">UP YOUR GAME</p>
          </div>

          <div className="flex flex-col items-center gap-2 sm:gap-4 mt-3 sm:mt-5 w-full">
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/60 rounded-full border border-white/10 w-full max-sm:max-w-[280px] max-w-sm sm:max-w-md shadow-inner">
              {(['SLEEVES', 'AVATARS', 'BOARDS'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-1.5 sm:py-2 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>{tab}</button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-6 bg-black/40 p-1 rounded-full border border-white/5 shadow-inner max-w-full">
               <div className="flex gap-0.5 sm:gap-1 pr-2 sm:pr-6 border-r border-white/10">
                  {( [1, 2, 4] as const).map((d) => (
                    <button 
                      key={d} 
                      onClick={() => setDensity(d)} 
                      className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all ${density === d ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/50'}`}
                    >
                      {d === 1 ? <GridIcon1 /> : d === 2 ? <GridIcon2 /> : <GridIcon4 />}
                    </button>
                  ))}
               </div>

               <div className="flex items-center gap-4 px-2">
                 <button 
                   onClick={() => setHideOwned(!hideOwned)} 
                   className="flex items-center gap-2 sm:gap-3 group cursor-pointer"
                 >
                   <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-colors ${hideOwned ? 'text-yellow-500' : 'text-white/30'} whitespace-nowrap`}>Owned</span>
                   <div className={`w-8 h-4 sm:w-10 sm:h-5 rounded-full relative transition-all duration-500 ${hideOwned ? 'bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-white/5 border border-white/10'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-500 ease-out ${hideOwned ? 'translate-x-4 sm:translate-x-5 bg-white' : 'translate-x-0.5 bg-white/20'}`}></div>
                   </div>
                 </button>

                 {activeTab === 'SLEEVES' && (
                    <button 
                      onClick={() => setShowTierInfo(true)}
                      className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-yellow-500 hover:bg-yellow-500 hover:text-black transition-all shadow-xl active:scale-90 group"
                    >
                      <span className="text-[10px] font-black italic">i</span>
                    </button>
                 )}
               </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 pt-1 sm:pt-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className={`grid ${gridClass} gap-2.5 sm:gap-6 md:gap-8`}>
            {activeTab === 'SLEEVES' ? SLEEVES.map(s => renderItemCard(s)) : activeTab === 'AVATARS' ? PREMIUM_AVATARS.map(a => renderItemCard(a, true)) : PREMIUM_BOARDS.map(b => renderItemCard(b, false, true))}
          </div>
        </div>
        
        <div className="px-6 py-2 sm:py-3 border-t border-white/5 bg-black/40 flex justify-between items-center opacity-30">
            <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.5em] sm:tracking-[0.6em]">THIRTEEN ARMORY // SECURE TRANSFERS</span>
            <div className="flex gap-2">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white/20"></div>
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white/20"></div>
            </div>
        </div>
      </div>
    </div>
  );
};
