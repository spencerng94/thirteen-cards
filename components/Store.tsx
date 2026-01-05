import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardCoverStyle } from './Card';
import { UserProfile, BackgroundTheme, Emote, Card as CardType } from '../types';
import { buyItem, DEFAULT_AVATARS, PREMIUM_AVATARS, getAvatarName, fetchEmotes, updateProfileSettings } from '../services/supabase';
import { PREMIUM_BOARDS, BoardPreview, BoardSurface } from './UserHub';
import { audioService } from '../services/audio';
import { VisualEmote } from './VisualEmote';
import { ITEM_REGISTRY } from '../constants/ItemRegistry';

/* Added missing SLEEVES and category constants for external import */
export const SUPER_PRESTIGE_SLEEVE_IDS: CardCoverStyle[] = ['WITS_END', 'DIVINE_ROYAL', 'EMPERORS_HUBRIS', 'ROYAL_CROSS'];
export const SOVEREIGN_IDS: CardCoverStyle[] = ['SOVEREIGN_SPADE', 'SOVEREIGN_CLUB', 'SOVEREIGN_DIAMOND', 'SOVEREIGN_HEART'];

export const SLEEVES: { id: string; name: string; style: CardCoverStyle; price: number; currency: 'GOLD' | 'GEMS' }[] = [
  { id: 'BLUE', name: 'Standard Blue', style: 'BLUE', price: 0, currency: 'GOLD' },
  { id: 'RED', name: 'Standard Red', style: 'RED', price: 0, currency: 'GOLD' },
  { id: 'PATTERN', name: 'Classic Pattern', style: 'PATTERN', price: 500, currency: 'GOLD' },
  { id: 'GOLDEN_IMPERIAL', name: 'Golden Imperial', style: 'GOLDEN_IMPERIAL', price: 2000, currency: 'GOLD' },
  { id: 'VOID_ONYX', name: 'Void Onyx', style: 'VOID_ONYX', price: 2500, currency: 'GOLD' },
  { id: 'ROYAL_JADE', name: 'Royal Jade', style: 'ROYAL_JADE', price: 3000, currency: 'GOLD' },
  { id: 'CRYSTAL_EMERALD', name: 'Crystal Emerald', style: 'CRYSTAL_EMERALD', price: 3500, currency: 'GOLD' },
  { id: 'DRAGON_SCALE', name: 'Dragon Scale', style: 'DRAGON_SCALE', price: 4000, currency: 'GOLD' },
  { id: 'NEON_CYBER', name: 'Neon Cyber', style: 'NEON_CYBER', price: 4500, currency: 'GOLD' },
  { id: 'PIXEL_CITY_LIGHTS', name: 'Pixel City Lights', style: 'PIXEL_CITY_LIGHTS', price: 5000, currency: 'GOLD' },
  { id: 'AMETHYST_ROYAL', name: 'Amethyst Royal', style: 'AMETHYST_ROYAL', price: 5500, currency: 'GOLD' },
  { id: 'CHERRY_BLOSSOM_NOIR', name: 'Cherry Blossom Noir', style: 'CHERRY_BLOSSOM_NOIR', price: 6000, currency: 'GOLD' },
  { id: 'AETHER_VOID', name: 'Aether Void', style: 'AETHER_VOID', price: 500, currency: 'GEMS' },
  { id: 'WITS_END', name: "Wit's End", style: 'WITS_END', price: 1000, currency: 'GEMS' },
  { id: 'DIVINE_ROYAL', name: 'Divine Royal', style: 'DIVINE_ROYAL', price: 1200, currency: 'GEMS' },
  { id: 'EMPERORS_HUBRIS', name: "Emperor's Hubris", style: 'EMPERORS_HUBRIS', price: 1500, currency: 'GEMS' },
  { id: 'ROYAL_CROSS', name: 'Royal Cross', style: 'ROYAL_CROSS', price: 2000, currency: 'GEMS' },
];

/**
 * Redesigned 'Auric Medallion'
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
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#goldMedalGrad)" stroke="#5D4037" strokeWidth="1.5" />
    <g transform="translate(50, 50)">
      <path d="M0 -24 L5 -5 L24 0 L5 5 L0 24 L-5 5 L-24 0 L-5 -5 Z" fill="#3E2723" opacity="0.8" />
    </g>
  </svg>
);

/**
 * Reverted to the vibrant 'Pink Shard' Gems icon
 */
const GemIconSVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(236,72,153,0.6)]">
    <defs>
      <linearGradient id="pinkGemShardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffb3d9" />
        <stop offset="40%" stopColor="#ff007f" />
        <stop offset="100%" stopColor="#4d0026" />
      </linearGradient>
    </defs>
    <path d="M50 5 L85 30 L85 70 L50 95 L15 70 L15 30 Z" fill="url(#pinkGemShardGrad)" stroke="white" strokeWidth="1" opacity="0.9" />
    <path d="M50 5 L50 95 M15 30 L85 30 M15 70 L85 70" stroke="white" strokeWidth="0.5" opacity="0.3" />
    <path d="M50 5 L85 30 L50 50 L15 30 Z" fill="white" opacity="0.2" />
  </svg>
);

/* Unique Item Icons */
const XpBoosterIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 25 V75 L50 95 L10 75 V25 Z" fill="url(#xpGrad)" stroke="white" strokeWidth="2" opacity="0.9" />
    <path d="M30 40 L50 20 L70 40 M30 65 L50 45 L70 65" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="50" cy="50" r="40" fill="white" opacity="0.05" />
  </svg>
);

const GoldBoosterIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="goldBoostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 25 V75 L50 95 L10 75 V25 Z" fill="url(#goldBoostGrad)" stroke="white" strokeWidth="2" opacity="0.9" />
    <text x="50" y="65" textAnchor="middle" fontSize="40" fontWeight="900" fill="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>$</text>
    <path d="M20 20 L40 10 M80 20 L60 10" stroke="white" strokeWidth="3" opacity="0.5" />
  </svg>
);

const VoucherIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="voucherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#064e3b" />
      </linearGradient>
    </defs>
    <rect x="10" y="25" width="80" height="50" rx="4" fill="url(#voucherGrad)" stroke="white" strokeWidth="2" opacity="0.9" />
    <circle cx="10" cy="50" r="8" fill="black" opacity="0.4" />
    <circle cx="90" cy="50" r="8" fill="black" opacity="0.4" />
    <path d="M30 40 H70 M30 50 H60 M30 60 H50" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <text x="75" y="60" textAnchor="middle" fontSize="18" fontWeight="900" fill="white" opacity="0.8">%</text>
  </svg>
);

export const CurrencyIcon: React.FC<{ type: 'GOLD' | 'GEMS'; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({ type, size = 'sm', className = "" }) => {
  const dim = size === 'xs' ? 'w-4 h-4' : size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-12 h-12' : size === 'xl' ? 'w-16 h-16' : 'w-8 h-8';
  return (
    <div className={`relative ${dim} flex items-center justify-center shrink-0 ${className}`}>
      <div className="w-full h-full relative z-10 transition-transform duration-300 hover:scale-125">
        {type === 'GOLD' ? <CoinIconSVG /> : <GemIconSVG />}
      </div>
    </div>
  );
};

/* Added missing canAfford helper */
export const canAfford = (profile: UserProfile, price: number, currency: 'GOLD' | 'GEMS' = 'GOLD') => {
  if (currency === 'GEMS') return (profile.gems || 0) >= price;
  return profile.coins >= price;
};

/* Added missing SleeveArenaPreview component */
export const SleeveArenaPreview: React.FC<{ sleeveStyle: CardCoverStyle; themeId: BackgroundTheme; sleeveEffectsEnabled: boolean; onClose: () => void }> = ({ sleeveStyle, themeId, sleeveEffectsEnabled, onClose }) => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in" onClick={onClose}>
        <BoardSurface themeId={themeId} isMini />
        <div className="relative z-10 flex flex-col items-center gap-8" onClick={e => e.stopPropagation()}>
            <div className="relative group">
                <div className="absolute inset-[-40px] bg-yellow-500/10 blur-[80px] rounded-full animate-pulse"></div>
                <Card faceDown activeTurn={true} coverStyle={sleeveStyle} className="!w-48 !h-72 shadow-[0_40px_80px_rgba(0,0,0,0.8)]" disableEffects={!sleeveEffectsEnabled} />
            </div>
            <button onClick={onClose} className="px-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all">Close Preview</button>
        </div>
    </div>
  );
};

export const Store: React.FC<{
  onClose: () => void; profile: UserProfile | null; onRefreshProfile: () => void;
  onEquipSleeve: (sleeve: CardCoverStyle) => void; currentSleeve: CardCoverStyle;
  playerAvatar: string; onEquipAvatar: (avatar: string) => void;
  currentTheme: BackgroundTheme; onEquipBoard: (theme: BackgroundTheme) => void;
  isGuest?: boolean; initialTab?: 'SLEEVES' | 'AVATARS' | 'BOARDS' | 'ITEMS';
}> = ({ onClose, profile, onRefreshProfile, onEquipSleeve, currentSleeve, playerAvatar, onEquipAvatar, currentTheme, onEquipBoard, isGuest, initialTab = 'SLEEVES' }) => {
  const [activeTab, setActiveTab] = useState<'SLEEVES' | 'AVATARS' | 'BOARDS' | 'ITEMS'>(initialTab);
  const [pendingPurchase, setPendingPurchase] = useState<any>(null);
  const [applyVoucher, setApplyVoucher] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);

  useEffect(() => { if (typeof fetchEmotes === 'function') fetchEmotes().then(setRemoteEmotes); }, []);

  const hasVoucher = useMemo(() => (profile?.inventory?.items['GENERAL_10_OFF'] || 0) > 0, [profile]);

  const executePurchase = async () => {
    if (!pendingPurchase || !profile || buying) return;
    
    if (pendingPurchase.unlocked) {
        // Just equip if already unlocked
        if (pendingPurchase.type === 'SLEEVE') onEquipSleeve(pendingPurchase.style);
        else if (pendingPurchase.type === 'AVATAR') onEquipAvatar(pendingPurchase.id);
        else if (pendingPurchase.type === 'BOARD') onEquipBoard(pendingPurchase.id);
        setPendingPurchase(null);
        return;
    }

    const originalPrice = pendingPurchase.price;
    const finalPrice = applyVoucher ? Math.floor(originalPrice * 0.9) : originalPrice;
    
    setBuying(pendingPurchase.id);
    try {
      if (applyVoucher) {
        const inv = profile.inventory || { items: {}, active_boosters: {} };
        const updates: Partial<UserProfile> = {
          inventory: { ...inv, items: { ...inv.items, 'GENERAL_10_OFF': inv.items['GENERAL_10_OFF'] - 1 } }
        };
        await updateProfileSettings(profile.id, updates);
      }
      await buyItem(profile.id, finalPrice, pendingPurchase.id, pendingPurchase.type, !!isGuest, pendingPurchase.currency);
      audioService.playPurchase();
      setPendingPurchase(null);
      onRefreshProfile();
    } catch (err) { console.error(err); } finally { setBuying(null); }
  };

  const getItemIcon = (id: string, type: string) => {
    if (id.includes('XP')) return <XpBoosterIcon />;
    if (id.includes('GOLD')) return <GoldBoosterIcon />;
    if (type === 'VOUCHER' || id.includes('OFF')) return <VoucherIcon />;
    return <span className="text-4xl">📦</span>;
  };

  const renderItemCard = (item: any, isAvatar = false, isBoard = false, isItem = false) => {
    const id = isAvatar ? item : item.id;
    
    let unlocked = false;
    if (isAvatar) unlocked = profile?.unlocked_avatars?.includes(item) || DEFAULT_AVATARS.includes(item);
    else if (isBoard) unlocked = profile?.unlocked_boards.includes(id) || id === 'EMERALD';
    else if (isItem) unlocked = false;
    else unlocked = profile?.unlocked_sleeves.includes(id);

    const price = isAvatar ? 250 : item.price;
    const currency = isAvatar || isBoard ? 'GOLD' : (item.currency || 'GOLD');
    
    const isEquipped = isAvatar ? playerAvatar === item : isBoard ? currentTheme === item.id : !isItem && currentSleeve === item.style;
    const isExclusive = item.isEventExclusive || ITEM_REGISTRY[id]?.isEventExclusive;

    if (isExclusive && !unlocked) return null;

    return (
      <div key={id} onClick={() => setPendingPurchase({ 
          id, 
          name: isAvatar ? getAvatarName(id, remoteEmotes) : item.name, 
          description: isAvatar ? 'A high-fidelity elite avatar signature.' : (item.description || ITEM_REGISTRY[id]?.description || 'A signature XIII cosmetic upgrade.'),
          price, 
          currency, 
          type: isAvatar ? 'AVATAR' : isBoard ? 'BOARD' : isItem ? 'ITEM' : 'SLEEVE', 
          style: item.style,
          unlocked,
          equipped: isEquipped
      })} className="relative group bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 flex flex-col items-center transition-all hover:bg-white/[0.04] cursor-pointer h-full">
        
        <div className="flex flex-col items-center gap-3 mb-4 w-full">
          {isAvatar ? (
            <div className="w-24 h-24 flex items-center justify-center"><VisualEmote trigger={item} remoteEmotes={remoteEmotes} size="lg" /></div>
          ) : isBoard ? (
            <BoardPreview themeId={item.id} unlocked={unlocked} active={isEquipped} hideActiveMarker />
          ) : isItem ? (
            <div className="w-20 h-20 bg-black/40 rounded-3xl flex items-center justify-center shadow-inner border border-white/5 group-hover:scale-110 transition-transform duration-500">
               {getItemIcon(id, item.type)}
            </div>
          ) : (
            <Card faceDown coverStyle={item.style} className="!w-20 !h-30" />
          )}
          
          <div className="flex flex-col items-center text-center px-1">
            <span className="text-[10px] font-black uppercase text-white/50">{isAvatar ? getAvatarName(item, remoteEmotes) : item.name}</span>
            {isItem && <span className="text-[7px] text-white/30 uppercase mt-1 font-bold line-clamp-2">{item.description}</span>}
          </div>
        </div>

        <button className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 mt-auto ${unlocked ? 'bg-emerald-600/20 text-emerald-400' : 'bg-yellow-500 text-black shadow-lg'}`}>
          {isEquipped ? 'EQUIPPED' : unlocked ? 'EQUIP' : (
            <>
              <span>{price}</span>
              <CurrencyIcon type={currency} size="xs" />
            </>
          )}
        </button>
      </div>
    );
  };

  const storeItems = useMemo(() => {
    return Object.values(ITEM_REGISTRY).filter(item => !item.isEventExclusive && item.type !== 'COSMETIC');
  }, []);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in" onClick={onClose}>
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
            <div className="w-full aspect-[16/10] bg-black/40 rounded-[2rem] border border-white/5 flex items-center justify-center mb-6 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent"></div>
                {pendingPurchase.type === 'SLEEVE' ? (
                    <Card faceDown activeTurn={true} coverStyle={pendingPurchase.style} className="!w-24 !h-36 shadow-2xl group-hover:scale-110 transition-transform duration-700" />
                ) : pendingPurchase.type === 'BOARD' ? (
                    <div className="w-full h-full p-2"><BoardPreview themeId={pendingPurchase.id} unlocked={true} hideActiveMarker className="!border-none !rounded-2xl" /></div>
                ) : pendingPurchase.type === 'AVATAR' ? (
                    <div className="w-32 h-32 flex items-center justify-center"><VisualEmote trigger={pendingPurchase.id} remoteEmotes={remoteEmotes} size="xl" /></div>
                ) : (
                    <div className="w-24 h-24 flex items-center justify-center">{getItemIcon(pendingPurchase.id, pendingPurchase.type)}</div>
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
      <div className="relative bg-[#050505] border border-white/10 w-full max-w-5xl max-h-[90vh] rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="absolute top-6 left-6 z-50 flex flex-col gap-2 items-start">
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2"><CurrencyIcon type="GOLD" size="sm" /><span className="text-[13px] font-black text-white font-mono">{profile?.coins.toLocaleString()}</span></div>
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2"><CurrencyIcon type="GEMS" size="sm" /><span className="text-[13px] font-black text-white font-mono">{(profile?.gems || 0).toLocaleString()}</span></div>
        </div>
        
        <div className="absolute top-6 right-6 z-50">
          <button 
            onClick={onClose} 
            className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white transition-all active:scale-90 shadow-xl"
          >
            <span className="text-[10px] font-black uppercase tracking-widest transition-transform group-hover:-translate-x-1">← Back</span>
          </button>
        </div>

        <div className="px-8 mt-24 mb-12 flex flex-col items-center">
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase tracking-tighter italic font-serif">XIII SHOP</h2>
          <div className="grid grid-cols-4 gap-2 mt-6 w-full max-w-2xl p-1 bg-white/5 rounded-full">
            {(['SLEEVES', 'AVATARS', 'BOARDS', 'ITEMS'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2 rounded-full text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-yellow-500 text-black' : 'text-white/40 hover:text-white'}`}>{tab}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pb-12 auto-rows-fr">
            {activeTab === 'SLEEVES' ? SLEEVES.map(s => renderItemCard(s)) : 
             activeTab === 'AVATARS' ? PREMIUM_AVATARS.map(a => renderItemCard(a, true)) : 
             activeTab === 'BOARDS' ? PREMIUM_BOARDS.map(b => renderItemCard(b, false, true)) :
             storeItems.map(i => renderItemCard(i, false, false, true))}
          </div>
        </div>
      </div>
    </div>
  );
};