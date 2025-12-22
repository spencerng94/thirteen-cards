
import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';
import { UserProfile, BackgroundTheme, AiDifficulty, Rank, Suit } from '../types';
import { buyItem, calculateLevel, getXpForLevel, DEFAULT_AVATARS, PREMIUM_AVATARS } from '../services/supabase';
import { SignOutButton } from './SignOutButton';

export type HubTab = 'STORE' | 'PROFILE' | 'SETTINGS';

interface UserHubProps {
  initialTab?: HubTab;
  onClose: () => void;
  profile: UserProfile | null;
  isGuest?: boolean;
  onRefreshProfile: () => void;
  onEquipSleeve: (sleeve: CardCoverStyle) => void;
  currentSleeve: CardCoverStyle;
  playerName: string;
  setPlayerName: (name: string) => void;
  playerAvatar: string;
  setPlayerAvatar: (avatar: string) => void;
  currentTheme: BackgroundTheme;
  onChangeTheme: (theme: BackgroundTheme) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  isSinglePlayer?: boolean;
  spQuickFinish?: boolean;
  setSpQuickFinish?: (val: boolean) => void;
  currentDifficulty?: AiDifficulty;
  onChangeDifficulty?: (d: AiDifficulty) => void;
  onExitGame?: () => void;
  onSignOut: () => void;
}

const SLEEVES = [
  { id: 'BLUE', name: 'Imperial Blue', price: 0, style: 'BLUE' as CardCoverStyle, desc: 'Standard issue navy finish.' },
  { id: 'RED', name: 'Dynasty Red', price: 0, style: 'RED' as CardCoverStyle, desc: 'Lustrous red for the bold.' },
  { id: 'PATTERN', name: 'Golden Lattice', price: 250, style: 'PATTERN' as CardCoverStyle, desc: 'Traditional geometric pattern.' },
  { id: 'ROYAL_JADE', name: 'Imperial Jade', price: 500, style: 'ROYAL_JADE' as CardCoverStyle, desc: 'Polished emerald marble.' },
  { id: 'GOLDEN_IMPERIAL', name: 'Sun King', price: 1000, style: 'GOLDEN_IMPERIAL' as CardCoverStyle, desc: '24-karat polished gold.' },
  { id: 'VOID_ONYX', name: 'Void Walker', price: 2000, style: 'VOID_ONYX' as CardCoverStyle, desc: 'Matte black with violet neon.' },
  { id: 'CRYSTAL_EMERALD', name: 'Crystal Gem', price: 1500, style: 'CRYSTAL_EMERALD' as CardCoverStyle, desc: 'Diffracting emerald core.' },
  { id: 'DRAGON_SCALE', name: 'Dragon Skin', price: 2500, style: 'DRAGON_SCALE' as CardCoverStyle, desc: 'Ancient high-heat plating.' },
  { id: 'NEON_CYBER', name: 'Neon Circuit', price: 3500, style: 'NEON_CYBER' as CardCoverStyle, desc: 'Active energetic circuitry.' },
];

export const PREMIUM_BOARDS = [
  { id: 'EMERALD', name: 'Grand Emerald', price: 0, desc: 'Classic Monte Carlo felt.', colors: 'from-emerald-400/60 via-green-900 to-green-950', base: 'bg-[#022c22]', border: 'border-yellow-600/50', texture: true },
  { id: 'CYBER_BLUE', name: 'Royal Cobalt', price: 0, desc: 'Deep sapphire luxury.', colors: 'from-blue-400/70 via-blue-900 to-slate-950', base: 'bg-[#040d21]', border: 'border-blue-400/50', texture: true, spotlight: 'rgba(59, 130, 246, 0.4)' },
  { id: 'CRIMSON_VOID', name: 'Baccarat Red', price: 0, desc: 'High-stakes burgundy leather.', colors: 'from-rose-500/60 via-rose-900 to-black', base: 'bg-[#2d0a0a]', border: 'border-rose-500/40', texture: true },
  { id: 'CYBERPUNK_NEON', name: 'Onyx Chrome', price: 2500, desc: 'Neo-Tokyo City Nights.', colors: 'from-fuchsia-600/40 via-slate-900 to-black', base: 'bg-[#020204]', border: 'border-cyan-500/40', spotlight: 'rgba(217, 70, 239, 0.3)', technoGrid: true },
  { id: 'GOLDEN_EMPEROR', name: 'Imperial Gold', price: 5000, desc: 'Throne Room Lacquer.', colors: 'from-[#ffd700]/40 via-[#4a0404] to-[#1a0101]', base: 'bg-[#2d0a0a]', border: 'border-[#ffd700] shadow-[0_0_40px_rgba(255,215,0,0.3)]', texture: false, emperor: true, spotlight: 'rgba(255, 215, 0, 0.5)' },
];

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-4 mb-6">
    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-yellow-500/20"></div>
    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500/80">{children}</span>
    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-yellow-500/20"></div>
  </div>
);

/**
 * Ornate Gold-Foil Dragon SVG
 */
const FoilDragonIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 512 512" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M480,256 C480,256 460,180 380,180 C300,180 320,320 220,320 C120,320 140,160 60,160 C30,160 32,200 32,256 C32,312 30,352 60,352 C140,352 120,192 220,192 C320,192 300,332 380,332 C460,332 480,256 480,256 Z" opacity="1" />
    <path d="M120,150 Q150,100 200,130 Q250,160 300,120" strokeWidth="1.5" opacity="0.6" />
    <path d="M30,256 L5,256 M507,256 L482,256" strokeWidth="4" />
    <circle cx="85" cy="185" r="4" fill="currentColor" />
    <path d="M180,320 L160,360 M220,320 L240,360" strokeWidth="3" opacity="0.8" />
    <text x="430" y="80" fontSize="70" className="font-serif italic font-black" stroke="none" fill="currentColor" filter="url(#goldFoilGlow)">龍</text>
  </svg>
);

/**
 * Swirling Auspicious Cloud (Xiangyun)
 */
const CloudIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20,60 Q10,60 10,50 Q10,40 25,40 Q25,20 45,20 Q65,20 65,40 Q85,40 85,60 Q85,80 65,80 Q55,80 50,75 Q45,80 35,80 Q20,80 20,60 Z" />
    <path d="M35,60 Q45,55 55,60" opacity="0.5" />
  </svg>
);

/**
 * Imperial Gold Visual Layer - Optimized for Red & Gold Luxury
 */
export const ImperialGoldLayer: React.FC<{ opacity?: number }> = ({ opacity = 1 }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity }}>
    {/* Silk Fabric Texture (Subtle weave) */}
    <div className="absolute inset-0 opacity-[0.3] mix-blend-overlay"
         style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/pinstriped-suit.png")', backgroundSize: '100px' }}></div>
    
    {/* Deep Red Vignette */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.6)_100%)]"></div>

    {/* Auspicious Clouds - Floating Elegance */}
    <div className="absolute top-[15%] left-[10%] w-24 h-24 text-[#ffd700] opacity-20"><CloudIcon className="w-full h-full" /></div>
    <div className="absolute top-[20%] right-[15%] w-32 h-32 text-[#ffd700] opacity-10 rotate-12"><CloudIcon className="w-full h-full" /></div>
    <div className="absolute bottom-[20%] left-[20%] w-28 h-28 text-[#ffd700] opacity-15 -rotate-12"><CloudIcon className="w-full h-full" /></div>

    {/* Imperial Dragons - High Luster Gold Foil Look */}
    <div className="absolute top-[-5%] left-[-2%] w-[45%] aspect-square text-[#ffd700] opacity-[0.6] drop-shadow-[0_0_25px_rgba(255,215,0,0.5)] rotate-[-5deg]">
      <FoilDragonIcon className="w-full h-full" />
    </div>
    <div className="absolute bottom-[-5%] right-[-2%] w-[45%] aspect-square text-[#ffd700] opacity-[0.6] drop-shadow-[0_0_25px_rgba(255,215,0,0.5)] rotate-[175deg]">
      <FoilDragonIcon className="w-full h-full" />
    </div>

    {/* Gold Leaf Floating Particles */}
    <div className="absolute inset-0">
       {Array.from({ length: 35 }).map((_, i) => (
         <div 
           key={i} 
           className="absolute w-[4px] h-[4px] bg-[#ffd700] rounded-sm animate-[leafFloat_8s_infinite] opacity-0"
           style={{ 
             top: `${Math.random() * 100}%`, 
             left: `${Math.random() * 100}%`,
             animationDelay: `${Math.random() * 8}s`,
             boxShadow: '0 0 10px #ffd700',
             transform: `rotate(${Math.random() * 360}deg)`
           }}
         />
       ))}
    </div>

    <svg width="0" height="0" className="hidden">
      <defs>
        <filter id="goldFoilGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    </svg>

    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes leafFloat {
        0% { opacity: 0; transform: translateY(0) rotate(0deg) scale(0.5); }
        20% { opacity: 0.8; }
        80% { opacity: 0.8; }
        100% { opacity: 0; transform: translateY(-100px) rotate(360deg) scale(1.2); }
      }
    `}} />
  </div>
);

/**
 * Dummy Game Table Preview Component - Heavily tuned for GOLDEN_EMPEROR brightness
 */
const DummyTablePreview: React.FC<{ themeId: BackgroundTheme; onClose: () => void }> = ({ themeId, onClose }) => {
  const theme = PREMIUM_BOARDS.find(b => b.id === themeId) || PREMIUM_BOARDS[0];
  
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-4 animate-in fade-in duration-500 scale-in-95">
      <div className={`absolute inset-0 ${theme.base} overflow-hidden`}>
        {/* Deep Imperial Red Base with Radiant Shine */}
        <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${theme.colors} pointer-events-none opacity-100 mix-blend-screen`}></div>
        
        {/* Golden Throne Spotlight */}
        <div className="absolute inset-0 pointer-events-none" 
             style={{ backgroundImage: `radial-gradient(circle at center, ${theme.spotlight || 'rgba(255,255,255,0.05)'} 0%, transparent 70%)` }}></div>
        
        {theme.id === 'GOLDEN_EMPEROR' && <ImperialGoldLayer />}

        {theme.texture && (
          <div className="absolute inset-0 opacity-[0.2] mix-blend-overlay pointer-events-none"
               style={{ 
                 backgroundImage: 'repeating-radial-gradient(circle at center, #fff 0, #fff 1px, transparent 0, transparent 100%)',
                 backgroundSize: '3.5px 3.5px'
               }}></div>
        )}

        {(theme as any).technoGrid && (
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
               style={{ 
                 backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)',
                 backgroundSize: '40px 40px'
               }}></div>
        )}
        
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        
        {/* Embossed Border Glow */}
        <div className={`absolute inset-12 border-4 ${theme.border} rounded-[4rem] opacity-40 blur-md pointer-events-none`}></div>
        <div className={`absolute inset-12 border-2 ${theme.border} rounded-[4rem] opacity-70 pointer-events-none`}></div>
      </div>
      
      <div className="relative z-10 w-full max-w-5xl h-full flex flex-col items-center justify-center">
        <div className="absolute top-8 left-8 right-8 flex justify-between items-start">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-[#ffd700] to-yellow-600 tracking-tighter drop-shadow-2xl font-serif">
                    IMPERIAL COURT
                </h1>
                <div className="px-6 py-2 bg-[#4a0404] border border-[#ffd700]/50 rounded-full text-[11px] font-black text-[#ffd700] tracking-[0.3em] uppercase shadow-2xl backdrop-blur-md">
                    Theme: {theme.name}
                </div>
            </div>
            <button 
              onClick={onClose}
              className="group flex items-center gap-4 px-8 py-4 rounded-2xl bg-red-600/90 hover:bg-red-500 border border-white/20 text-white font-black uppercase tracking-[0.4em] text-xs shadow-2xl transition-all active:scale-95"
            >
              Exit Preview ✕
            </button>
        </div>

        <div className="w-full flex flex-col items-center gap-16">
            <div className="flex flex-col items-center gap-4 animate-bounce duration-[3s]">
                <div className="w-24 h-24 rounded-full bg-black/60 border-2 border-[#ffd700]/50 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(255,215,0,0.3)]">👤</div>
                <span className="text-xs font-black text-white uppercase tracking-widest bg-black/40 px-4 py-1 rounded-lg">Opponent</span>
            </div>

            <div className="relative w-full flex items-center justify-center gap-4 scale-150 py-12">
                <Card card={{ rank: Rank.Two, suit: Suit.Hearts, id: 'd1' }} className="rotate-[-10deg] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-4 border-white/10" />
                <Card card={{ rank: Rank.Ace, suit: Suit.Hearts, id: 'd2' }} className="rotate-[5deg] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border-4 border-white/10" />
            </div>

            <div className="flex flex-col items-center gap-8 w-full">
                <div className="flex gap-1 -space-x-12 px-12 overflow-visible">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <Card key={i} card={{ rank: Rank.Eight + (i % 5), suit: i % 4, id: `h${i}` }} className="shadow-2xl hover:-translate-y-8 transition-all duration-300" />
                    ))}
                </div>
            </div>
        </div>

        <div className="absolute bottom-12 flex gap-6">
            <div className="px-16 py-5 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-black rounded-2xl text-sm uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(16,185,129,0.4)] border border-emerald-400/50">
                Play Selected
            </div>
            <div className="px-10 py-5 bg-black/60 border border-white/10 text-white/60 font-black rounded-2xl text-sm uppercase tracking-[0.3em]">
                Pass
            </div>
        </div>
      </div>
    </div>
  );
};

export const UserHub: React.FC<UserHubProps> = ({
  initialTab = 'PROFILE',
  onClose,
  profile,
  isGuest,
  onRefreshProfile,
  onEquipSleeve,
  currentSleeve,
  playerName,
  setPlayerName,
  playerAvatar,
  setPlayerAvatar,
  currentTheme,
  onChangeTheme,
  soundEnabled,
  setSoundEnabled,
  isSinglePlayer,
  spQuickFinish,
  setSpQuickFinish,
  currentDifficulty,
  onChangeDifficulty,
  onExitGame,
  onSignOut
}) => {
  const [activeTab, setActiveTab] = useState<HubTab>(initialTab);
  const [storeTab, setStoreTab] = useState<'SLEEVES' | 'AVATARS' | 'BOARDS'>('SLEEVES');
  const [buying, setBuying] = useState<string | null>(null);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState<BackgroundTheme | null>(null);
  const [showGuestWarning, setShowGuestWarning] = useState<{ itemId: string, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD' } | null>(null);

  const handlePurchaseAttempt = (itemId: string, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD') => {
    if (!profile || profile.coins < price || buying) return;
    if (isGuest) {
      setShowGuestWarning({ itemId, price, type });
    } else {
      executePurchase(itemId, price, type);
    }
  };

  const executePurchase = async (itemId: string, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD') => {
    setBuying(itemId);
    setShowGuestWarning(null);
    try {
      await buyItem(profile!.id, price, itemId, type, !!isGuest);
      onRefreshProfile();
    } catch (err) {
      alert(`Insufficient XIII GOLD.`);
    } finally {
      setBuying(null);
    }
  };

  const isUnlockedSleeve = (itemId: string) => {
    return profile?.unlocked_sleeves.includes(itemId) || SLEEVES.find(s => s.id === itemId)?.price === 0;
  };

  const isUnlockedAvatar = (avatar: string) => {
    return profile?.unlocked_avatars?.includes(avatar) || DEFAULT_AVATARS.includes(avatar);
  };

  const isBoardUnlocked = (id: string) => {
    return profile?.unlocked_boards.includes(id) || PREMIUM_BOARDS.find(b => b.id === id)?.price === 0;
  };

  const getThemeBtnStyle = (tId: BackgroundTheme) => {
    const isActive = currentTheme === tId;
    const isUnlocked = isBoardUnlocked(tId);

    if (!isUnlocked) return 'bg-white/5 text-white/10 opacity-40 grayscale cursor-not-allowed';
    if (!isActive) return 'bg-white/5 text-white/30 hover:text-white/60';

    switch (tId) {
      case 'EMERALD': return 'bg-emerald-600 text-white border-emerald-400 shadow-lg scale-[1.02]';
      case 'CYBER_BLUE': return 'bg-blue-600 text-white border-blue-400 shadow-lg scale-[1.02]';
      case 'CRIMSON_VOID': return 'bg-rose-900 text-white border-rose-500 shadow-lg scale-[1.02]';
      case 'CYBERPUNK_NEON': return 'bg-slate-800 text-white border-cyan-400 shadow-lg scale-[1.02]';
      case 'GOLDEN_EMPEROR': return 'bg-gradient-to-r from-yellow-600 via-[#ffd700] to-yellow-600 text-black border-yellow-300 shadow-xl scale-[1.05]';
      default: return 'bg-yellow-500 text-black shadow-lg scale-[1.02]';
    }
  };

  const renderStore = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/10 w-fit mx-auto">
            {(['SLEEVES', 'AVATARS', 'BOARDS'] as const).map(t => (
                <button
                    key={t}
                    onClick={() => setStoreTab(t)}
                    className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${storeTab === t ? 'bg-yellow-500 text-black shadow-lg scale-105' : 'text-white/40 hover:text-white'}`}
                >
                    {t}
                </button>
            ))}
        </div>

        {storeTab === 'SLEEVES' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SLEEVES.map(item => {
                const unlocked = isUnlockedSleeve(item.id);
                const canAfford = (profile?.coins || 0) >= item.price;
                const isEquipped = currentSleeve === item.style;

                return (
                <div key={item.id} className="relative group bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 flex flex-col items-center gap-4 transition-all hover:bg-white/[0.05] hover:border-yellow-500/30">
                    {!unlocked && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
                        <span className="text-[10px]">💰</span>
                        <span className="text-[9px] font-black text-yellow-500">{item.price}</span>
                    </div>
                    )}
                    <div className="py-2 transform transition-transform group-hover:scale-110">
                    <Card faceDown coverStyle={item.style} className="!w-20 !h-30 shadow-2xl" />
                    </div>
                    <div className="text-center">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">{item.name}</h3>
                    <p className="text-[8px] text-white/30 uppercase tracking-tighter mt-1">{item.desc}</p>
                    </div>
                    <button
                    onClick={() => unlocked ? onEquipSleeve(item.style!) : handlePurchaseAttempt(item.id, item.price, 'SLEEVE')}
                    disabled={isEquipped || (!unlocked && !canAfford) || buying === item.id}
                    className={`w-full py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all
                        ${isEquipped ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/20' : 
                        unlocked ? 'bg-white/5 text-white hover:bg-white/10' : 
                        canAfford ? 'bg-yellow-500 text-black shadow-lg hover:scale-105' : 'bg-white/5 text-white/20'}
                    `}
                    >
                    {isEquipped ? 'Equipped' : unlocked ? 'Equip' : buying === item.id ? '...' : `Buy ${item.price}`}
                    </button>
                </div>
                );
            })}
            </div>
        ) : storeTab === 'AVATARS' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 pb-10">
                {PREMIUM_AVATARS.map(emoji => {
                    const unlocked = isUnlockedAvatar(emoji);
                    const price = 250;
                    const canAfford = (profile?.coins || 0) >= price;
                    const isEquipped = playerAvatar === emoji;

                    return (
                        <div key={emoji} className="relative bg-white/[0.02] border border-white/5 rounded-3xl p-4 flex flex-col items-center gap-3 transition-all hover:bg-white/[0.05]">
                            <div className="text-4xl py-2 drop-shadow-lg">{emoji}</div>
                            <button
                                onClick={() => unlocked ? setPlayerAvatar(emoji) : handlePurchaseAttempt(emoji, price, 'AVATAR')}
                                disabled={isEquipped || (!unlocked && !canAfford) || buying === emoji}
                                className={`w-full py-2 rounded-xl font-black uppercase text-[8px] tracking-widest transition-all
                                    ${isEquipped ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/20' : 
                                    unlocked ? 'bg-white/5 text-white/80 hover:bg-white/10' : 
                                    canAfford ? 'bg-yellow-500 text-black shadow-lg hover:scale-105' : 'bg-white/5 text-white/20'}
                                `}
                            >
                                {isEquipped ? 'Active' : unlocked ? 'Use' : buying === emoji ? '...' : `💰 ${price}`}
                            </button>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
                {PREMIUM_BOARDS.map(b => {
                    const unlocked = isBoardUnlocked(b.id);
                    const canAfford = (profile?.coins || 0) >= b.price;
                    const isEquipped = currentTheme === b.id;

                    return (
                        <div key={b.id} className="relative group bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 flex flex-col items-center gap-4 transition-all hover:bg-white/[0.05] hover:border-yellow-500/30">
                            <button 
                                onClick={() => setPreviewThemeId(b.id as BackgroundTheme)}
                                className="absolute top-4 left-4 p-3 rounded-full bg-black/60 border border-white/20 text-yellow-400 hover:text-white hover:border-yellow-400 hover:bg-yellow-400/20 transition-all z-20 group/icon shadow-2xl"
                                title="Inspect Board"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover/icon:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>

                            {!unlocked && (
                            <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full border border-white/10 shadow-lg">
                                <span className="text-[11px]">💰</span>
                                <span className="text-[10px] font-black text-yellow-500">{b.price}</span>
                            </div>
                            )}
                            
                            <div className="relative w-full aspect-[16/10] rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
                                <div className={`absolute inset-0 ${b.base}`}>
                                    <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${b.colors} opacity-100 mix-blend-screen`}></div>
                                    {b.texture && (
                                      <div className="absolute inset-0 opacity-[0.2] mix-blend-overlay"
                                           style={{ 
                                             backgroundImage: 'repeating-radial-gradient(circle at center, #fff 0, #fff 1px, transparent 0, transparent 100%)',
                                             backgroundSize: '2.5px 2.5px'
                                           }}></div>
                                    )}
                                    {(b as any).technoGrid && (
                                      <div className="absolute inset-0 opacity-[0.08]"
                                           style={{ 
                                             backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.5) 1px, transparent 1px)',
                                             backgroundSize: '20px 20px'
                                           }}></div>
                                    )}
                                    {(b as any).emperor && (
                                      <>
                                        <ImperialGoldLayer opacity={1} />
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,215,0,0.2)_0%,_transparent_70%)] pointer-events-none"></div>
                                      </>
                                    )}
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white drop-shadow-lg">Inspect Arena</span>
                                </div>
                            </div>

                            <div className="text-center w-full space-y-1">
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">{b.name}</h3>
                                <p className="text-[9px] text-white/40 uppercase line-clamp-1 italic">{b.desc}</p>
                            </div>
                            <button
                                onClick={() => unlocked ? onChangeTheme(b.id as BackgroundTheme) : handlePurchaseAttempt(b.id, b.price, 'BOARD')}
                                disabled={isEquipped || (!unlocked && !canAfford) || buying === b.id}
                                className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all
                                    ${isEquipped ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/20' : 
                                    unlocked ? 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10' : 
                                    canAfford ? 'bg-yellow-500 text-black shadow-lg hover:scale-105' : 'bg-white/5 text-white/20'}
                                `}
                            >
                                {isEquipped ? 'Currently Active' : unlocked ? 'Apply Theme' : buying === b.id ? '...' : `Secure for ${b.price} GOLD`}
                            </button>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );

  const renderProfile = () => {
    if (!profile) return null;
    const allPossibleAvatars = [...DEFAULT_AVATARS, ...PREMIUM_AVATARS];
    const visibleAvatars = isCatalogExpanded ? allPossibleAvatars : allPossibleAvatars.slice(0, 10);
    const currentLevel = calculateLevel(profile.xp);
    const nextLevelXp = getXpForLevel(currentLevel + 1);
    const curLevelXpFloor = getXpForLevel(currentLevel);
    const rangeTotal = Math.max(1, nextLevelXp - curLevelXpFloor);
    const progress = Math.min(100, Math.max(0, ((profile.xp - curLevelXpFloor) / rangeTotal) * 100));
    
    return (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col md:flex-row items-center gap-8 bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
          <div className="relative group">
            <div className="absolute inset-[-10px] bg-yellow-500/10 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative w-32 h-32 rounded-full bg-black/40 border-2 border-yellow-500/30 flex items-center justify-center text-7xl shadow-inner">
              {playerAvatar}
            </div>
          </div>
          <div className="flex-1 w-full space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-yellow-500/60 uppercase tracking-[0.4em] ml-1">Commander ID</span>
              <input 
                type="text" 
                value={playerName} 
                onChange={e => setPlayerName(e.target.value.toUpperCase())}
                maxLength={12}
                className="w-full bg-black/40 border border-white/10 px-6 py-4 rounded-2xl text-white font-black uppercase tracking-widest focus:border-yellow-500/50 outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Total Victories</p>
                 <p className="text-2xl font-black text-white mt-1">{profile.wins} 🏆</p>
               </div>
               <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Vault Balance</p>
                 <p className="text-2xl font-black text-yellow-500 mt-1">{profile.coins.toLocaleString()} 💰</p>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
           <SectionHeader>Combat Statistics</SectionHeader>
           <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col items-center">
                 <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Games Played</span>
                 <span className="text-xl font-black text-white mt-1">{profile.games_played || 0}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col items-center">
                 <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Games Won</span>
                 <span className="text-xl font-black text-emerald-400 mt-1">{profile.wins || 0}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex flex-col items-center">
                 <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Win Rate</span>
                 <span className="text-xl font-black text-yellow-500 mt-1">{Math.round(((profile.wins || 0) / (profile.games_played || 1)) * 100)}%</span>
              </div>
           </div>
        </div>

        {isGuest && (
          <div className="bg-rose-600/10 border border-rose-500/20 p-6 rounded-[2rem] space-y-4">
             <div className="flex items-center gap-4">
                <span className="text-3xl">⚠️</span>
                <div>
                   <h4 className="text-sm font-black text-rose-400 uppercase tracking-widest">Unsecured Session</h4>
                   <p className="text-[9px] text-white/40 uppercase tracking-tight">Your progress is stored locally. If you clear browser data, it will be LOST.</p>
                </div>
             </div>
             {profile.coins >= 1000 && (
                <button 
                  onClick={onSignOut}
                  className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs hover:bg-rose-500 transition-all shadow-xl shadow-rose-950/20"
                >
                  Sign Up to Secure {profile.coins} XIII GOLD
                </button>
             )}
          </div>
        )}

        <div className="space-y-4">
          <SectionHeader>Rank Progression</SectionHeader>
          <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden">
             <div className="flex justify-between items-end mb-4">
                <div>
                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Current Rank</span>
                   <h4 className="text-4xl font-black text-white tracking-tighter mt-1">Level {currentLevel}</h4>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black text-yellow-500/60 uppercase tracking-widest">XP TO NEXT RANK</span>
                   <p className="text-lg font-black text-white mt-1">{nextLevelXp - (profile?.xp || 0)} XP NEEDED</p>
                </div>
             </div>
             <div className="relative h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] transition-all duration-1000 ease-out" 
                  style={{ width: `${progress}%` }}
                >
                  <div className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_3s_infinite]"></div>
                </div>
             </div>
             <div className="flex justify-between mt-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                <span>Tier: {currentLevel < 10 ? 'Recruit' : currentLevel < 25 ? 'Veteran' : 'Master'}</span>
                <span>{profile?.xp.toLocaleString() || 0} / {nextLevelXp.toLocaleString()} TOTAL XP</span>
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <button 
              onClick={() => setIsCatalogExpanded(!isCatalogExpanded)}
              className="w-full flex items-center justify-between p-5 bg-white/[0.03] hover:bg-white/[0.06] rounded-[2rem] border border-white/10 transition-all group mb-2"
          >
              <div className="flex items-center gap-4">
                  <span className="text-2xl">📁</span>
                  <div className="text-left">
                      <span className="block text-xs font-black text-white uppercase tracking-widest">Identity Collection</span>
                      <span className="block text-[8px] font-black text-white/30 uppercase tracking-[0.3em]">{allPossibleAvatars.length} TOTAL SIGNATURES</span>
                  </div>
              </div>
              <div className={`transition-transform duration-500 ${isCatalogExpanded ? 'rotate-180' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
              </div>
          </button>

          <div className={`grid grid-cols-5 md:grid-cols-10 gap-3 p-4 bg-black/20 rounded-[2rem] border border-white/5 transition-all duration-500 overflow-hidden ${isCatalogExpanded ? 'opacity-100 max-h-[1000px]' : 'opacity-100 max-h-[140px]'}`}>
            {visibleAvatars.map(a => {
              const unlocked = isUnlockedAvatar(a);
              const active = playerAvatar === a;
              return (
                <button 
                  key={a} 
                  onClick={() => {
                    if (unlocked) setPlayerAvatar(a);
                    else {
                      setActiveTab('STORE');
                      setStoreTab('AVATARS');
                    }
                  }} 
                  className={`relative aspect-square flex items-center justify-center text-2xl rounded-xl transition-all 
                    ${active ? 'bg-yellow-500/20 ring-2 ring-yellow-500 shadow-lg scale-110' : unlocked ? 'bg-white/5 hover:bg-white/10' : 'opacity-30 grayscale hover:opacity-50 hover:grayscale-0'}`}
                >
                  {a}
                  {!unlocked && <div className="absolute inset-0 flex items-center justify-center text-[10px] pointer-events-none">🔒</div>}
                </button>
              );
            })}
            {!isCatalogExpanded && allPossibleAvatars.length > 10 && (
                <button 
                    onClick={() => setIsCatalogExpanded(true)}
                    className="flex items-center justify-center rounded-xl bg-white/5 text-xs font-black text-white/40 hover:text-white/60 transition-all border border-dashed border-white/10 aspect-square"
                >
                    +{allPossibleAvatars.length - 10}
                </button>
            )}
          </div>
          <p className="text-center text-[8px] font-black text-white/20 uppercase tracking-widest mt-2">
            Click locked items to visit the XIII Store
          </p>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-white/20 transition-all">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-yellow-500 text-xl group-hover:scale-110 transition-transform">
                {soundEnabled ? '🔊' : '🔇'}
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-widest">Arena Audio</p>
              </div>
           </div>
           <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-14 h-7 rounded-full relative transition-all duration-300 ${soundEnabled ? 'bg-emerald-600/80' : 'bg-white/10'}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${soundEnabled ? 'translate-x-8' : 'translate-x-1'}`}></div>
           </button>
        </div>

        {isSinglePlayer && setSpQuickFinish && (
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex items-center justify-between group hover:border-white/20 transition-all">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-yellow-500 text-xl group-hover:scale-110 transition-transform">⚡</div>
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-widest">Turbo Finish</p>
                </div>
             </div>
             <button onClick={() => setSpQuickFinish(!spQuickFinish)} className={`w-14 h-7 rounded-full relative transition-all duration-300 ${spQuickFinish ? 'bg-yellow-500/80' : 'bg-white/10'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${spQuickFinish ? 'translate-x-8' : 'translate-x-1'}`}></div>
             </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <SectionHeader>Tactical Visuals</SectionHeader>
        
        {/* Card Cover Selection in Settings */}
        <div className="space-y-4">
          <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em] px-2">Deployment Card Sleeves</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 p-4 bg-black/20 rounded-[2.5rem] border border-white/5">
             {SLEEVES.map(s => {
               const unlocked = isUnlockedSleeve(s.id);
               const active = currentSleeve === s.style;
               return (
                 <button 
                  key={s.id}
                  disabled={!unlocked}
                  onClick={() => onEquipSleeve(s.style!)}
                  className={`relative flex flex-col items-center gap-2 group transition-all ${!unlocked ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                 >
                    {active && <div className="absolute inset-[-10px] bg-yellow-500/10 blur-xl rounded-full animate-pulse"></div>}
                    <Card faceDown coverStyle={s.style} small className={`!w-12 !h-18 transition-all ${active ? 'ring-2 ring-yellow-500 shadow-lg' : 'border-white/5'}`} />
                    {!unlocked && <div className="absolute inset-0 flex items-center justify-center text-[10px]">🔒</div>}
                    <span className={`text-[6px] font-black uppercase tracking-tighter truncate w-full text-center ${active ? 'text-yellow-500' : 'text-white/20'}`}>{s.name}</span>
                 </button>
               );
             })}
          </div>
          <p className="text-center text-[7px] font-black text-white/10 uppercase tracking-[0.2em]">Owned Items Only • Visit Store for More</p>
        </div>

        <div className="space-y-4">
          <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em] px-2">Arena Atmosphere</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-black/20 rounded-[2.5rem] border border-white/5">
            {PREMIUM_BOARDS.map(t => {
              const isUnlocked = isBoardUnlocked(t.id);
              return (
                <div key={t.id} className="relative group/board">
                    <button 
                        disabled={!isUnlocked}
                        onClick={() => onChangeTheme(t.id as BackgroundTheme)} 
                        className={`relative w-full flex flex-col items-center gap-2 py-3 rounded-xl transition-all ${getThemeBtnStyle(t.id as BackgroundTheme)}`}
                    >
                        <div className={`w-12 h-8 rounded-lg border border-white/20 overflow-hidden relative shadow-lg`}>
                             <div className={`absolute inset-0 ${t.base}`}>
                                <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${t.colors} opacity-100 mix-blend-screen`}></div>
                             </div>
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-tighter truncate w-full text-center">{t.name}</span>
                        {!isUnlocked && <div className="absolute inset-0 flex items-center justify-center text-[10px] pointer-events-none">🔒</div>}
                    </button>
                    {/* Magnifying Glass Button in Settings Grid */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setPreviewThemeId(t.id as BackgroundTheme); }}
                        className="absolute -top-1 -right-1 p-2 rounded-full bg-black/80 border border-white/30 text-yellow-400 hover:text-white transition-opacity z-30 shadow-2xl"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isSinglePlayer && currentDifficulty && onChangeDifficulty && (
        <div className="space-y-4">
          <SectionHeader>Combat Difficulty</SectionHeader>
          <div className="grid grid-cols-3 gap-3 p-1.5 bg-black/20 rounded-2xl border border-white/5">
            {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map(d => {
              const isActive = currentDifficulty === d;
              const btnClass = isActive 
                ? (d === 'EASY' ? 'bg-green-600 text-white' : d === 'HARD' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black')
                : 'text-white/40 hover:text-white';
              return (
                <button key={d} onClick={() => onChangeDifficulty(d)} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${btnClass}`}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
        {onExitGame && (
          <button onClick={onExitGame} className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] text-white/60 transition-all active:scale-95">Leave Arena</button>
        )}
        <SignOutButton onSignOut={onSignOut} className="!py-4" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      
      {/* FULL SCREEN BOARD PREVIEW OVERLAY */}
      {previewThemeId && (
        <DummyTablePreview themeId={previewThemeId} onClose={() => setPreviewThemeId(null)} />
      )}

      {/* Custom Guest Warning Modal */}
      {showGuestWarning && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
              <div className="max-w-md w-full bg-[#0a0f0d] border-2 border-yellow-500/20 rounded-[3rem] p-10 text-center space-y-6 shadow-[0_0_100px_rgba(234,179,8,0.2)]">
                  <div className="text-6xl animate-bounce">🛡️</div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Secure Your Loot</h3>
                  <p className="text-gray-400 text-xs leading-relaxed uppercase tracking-widest font-medium">
                      Commander, as a <span className="text-yellow-500">GUEST</span>, your purchases are tethered to this browser. 
                      Clearing local storage or switching devices will result in <span className="text-rose-500">LOSS OF ACCESS</span>. 
                      Create an account to anchor your identity permanently.
                  </p>
                  <div className="flex flex-col gap-3">
                      <button 
                          onClick={() => executePurchase(showGuestWarning.itemId, showGuestWarning.price, showGuestWarning.type)}
                          className="w-full py-4 bg-yellow-500 text-black font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-yellow-400 transition-all active:scale-95 shadow-lg"
                      >
                          Deploy Gold Regardless
                      </button>
                      <button 
                          onClick={() => setShowGuestWarning(null)}
                          className="w-full py-3 bg-white/5 text-white/40 font-black rounded-xl uppercase tracking-widest text-[10px] hover:text-white/60 transition-all"
                      >
                          Abort Maneuver
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="relative bg-black/60 backdrop-blur-3xl border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)] flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex flex-col md:flex-row gap-8 justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase tracking-tighter italic">COMMAND CENTER</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500/80 animate-pulse"></span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">
                {activeTab} MANAGEMENT INTERFACE
              </span>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/10">
            {(['PROFILE', 'STORE', 'SETTINGS'] as HubTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-yellow-500 text-black shadow-lg scale-105' : 'text-white/40 hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="hidden md:flex w-12 h-12 rounded-full items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white transition-all active:scale-90 group">
             <span className="text-2xl group-hover:rotate-90 transition-transform duration-300">✕</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {activeTab === 'STORE' && renderStore()}
          {activeTab === 'PROFILE' && renderProfile()}
          {activeTab === 'SETTINGS' && renderSettings()}
        </div>

        <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                 <span className="text-xl">🎖️</span>
                 <div>
                    <p className="text-[7px] font-black text-white/20 uppercase tracking-widest">Vaulted XP</p>
                    <p className="text-sm font-black text-white">{profile?.xp.toLocaleString() || 0}</p>
                 </div>
              </div>
              <div className="h-8 w-[1px] bg-white/10"></div>
              <div className="flex items-center gap-3">
                 <span className="text-xl">💰</span>
                 <div>
                    <p className="text-[7px] font-black text-white/20 uppercase tracking-widest">XIII GOLD</p>
                    <p className="text-sm font-black text-yellow-500">{profile?.coins.toLocaleString() || 0}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
