
import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';
import { BrandLogo } from './BrandLogo';
import { AiDifficulty, UserProfile, BackgroundTheme, Rank, Suit } from '../types';
import { SignOutButton } from './SignOutButton';
import { UserBar } from './UserBar';
import { calculateLevel, getXpForLevel, buyItem, DEFAULT_AVATARS, PREMIUM_AVATARS } from '../services/supabase';
import { PREMIUM_BOARDS, ImperialGoldLayer } from './UserHub';

export type WelcomeTab = 'PROFILE' | 'STORE' | 'SETTINGS';

interface WelcomeScreenProps {
  onStart: (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL', coverStyle: CardCoverStyle, avatar: string, quickFinish?: boolean, difficulty?: AiDifficulty) => void;
  onSignOut: () => void;
  profile: UserProfile | null;
  onRefreshProfile: () => void;
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
}

const SLEEVES = [
  { id: 'BLUE', name: 'Imperial Blue', price: 0, style: 'BLUE' as CardCoverStyle, desc: 'Standard issue.' },
  { id: 'RED', name: 'Dynasty Red', price: 0, style: 'RED' as CardCoverStyle, desc: 'Lustrous finish.' },
  { id: 'PATTERN', name: 'Golden Lattice', price: 250, style: 'PATTERN' as CardCoverStyle, desc: 'Traditional weave.' },
  { id: 'ROYAL_JADE', name: 'Imperial Jade', price: 500, style: 'ROYAL_JADE' as CardCoverStyle, desc: 'Polished marble.' },
  { id: 'CRYSTAL_EMERALD', name: 'Crystal Gem', price: 1500, style: 'CRYSTAL_EMERALD' as CardCoverStyle, desc: 'Prismatic diffraction.' },
  { id: 'GOLDEN_IMPERIAL', name: 'Sun King', price: 1000, style: 'GOLDEN_IMPERIAL' as CardCoverStyle, desc: '24K Polished.' },
  { id: 'VOID_ONYX', name: 'Void Walker', price: 2000, style: 'VOID_ONYX' as CardCoverStyle, desc: 'Deep cosmic.' },
  { id: 'DRAGON_SCALE', name: 'Dragon Skin', price: 2500, style: 'DRAGON_SCALE' as CardCoverStyle, desc: 'Hardened scale plating.' },
  { id: 'NEON_CYBER', name: 'Neon Circuit', price: 3500, style: 'NEON_CYBER' as CardCoverStyle, desc: 'Active energetic core.' },
];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center justify-center gap-4 mb-3">
    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-yellow-500/20"></div>
    <span className="text-[10px] font-black uppercase tracking-[0.6em] text-yellow-500/70 italic drop-shadow-sm">{children}</span>
    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-yellow-500/20"></div>
  </div>
);

/**
 * Dummy Game Table Preview Component for Welcome Screen
 */
const DummyTablePreview: React.FC<{ themeId: BackgroundTheme; onClose: () => void }> = ({ themeId, onClose }) => {
  const theme = PREMIUM_BOARDS.find(b => b.id === themeId) || PREMIUM_BOARDS[0];
  
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
      <div className={`absolute inset-0 ${theme.base} overflow-hidden`}>
        <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${theme.colors} pointer-events-none opacity-100 mix-blend-screen`}></div>
        
        <div className="absolute inset-0 pointer-events-none" 
             style={{ backgroundImage: `radial-gradient(circle at center, ${theme.spotlight || 'rgba(255,255,255,0.05)'} 0%, transparent 70%)` }}></div>
        
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

        {/* Emperor Motif Layer */}
        {(theme as any).emperor && <ImperialGoldLayer opacity={1} />}

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_white_0%,_transparent_60%)] opacity-[0.1] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-5xl h-full flex flex-col items-center justify-center">
        <div className="absolute top-10 left-10 flex flex-col gap-3">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-[#ffd700] to-yellow-800 tracking-tighter drop-shadow-2xl font-serif">
                ARENA VISUALS
            </h1>
            <div className="px-6 py-2 bg-[#4a0404] border border-[#ffd700]/50 rounded-full text-[12px] font-black text-[#ffd700] tracking-[0.4em] uppercase shadow-2xl backdrop-blur-xl">
                {theme.name}
            </div>
        </div>
        <div className="relative w-full flex items-center justify-center gap-6 scale-150 py-16">
            <Card card={{ rank: Rank.Two, suit: Suit.Hearts, id: 'd1' }} className="rotate-[-12deg] shadow-[0_40px_80px_rgba(0,0,0,0.9)]" />
            <Card card={{ rank: Rank.King, suit: Suit.Hearts, id: 'd2' }} className="rotate-[8deg] shadow-[0_40px_80px_rgba(0,0,0,0.9)]" />
        </div>
        <div className="absolute bottom-16 w-full flex flex-col items-center gap-8">
            <div className="px-12 py-4 bg-white/10 border border-white/20 backdrop-blur-md text-white font-black rounded-full text-xs uppercase tracking-[0.3em] shadow-2xl">
                Luxury Tactical Surface Deployment
            </div>
        </div>
        <button 
          onClick={onClose}
          className="absolute top-10 right-10 w-16 h-16 rounded-full bg-black/90 border-2 border-white/30 text-white flex items-center justify-center text-3xl hover:bg-red-600 hover:border-red-400 transition-all active:scale-90 shadow-2xl z-[1001]"
        >
          ✕
        </button>
      </div>
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
    <button onClick={onClick} className={`group relative w-full ${slim ? 'py-3.5 px-3' : 'py-5 px-4'} rounded-2xl border transition-all duration-500 active:scale-95 overflow-hidden ${theme.border} ${theme.shadow} shadow-[0_20px_40px_rgba(0,0,0,0.5)]`}>
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.bg} group-hover:scale-110 transition-transform duration-1000`}></div>
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.highlight} opacity-90 transition-opacity duration-500 group-hover:opacity-100`}></div>
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_4s_infinite] pointer-events-none opacity-40"></div>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
            <span className={`text-[11px] md:text-[13px] font-black uppercase tracking-[0.25em] font-serif ${theme.text} drop-shadow-md`}>{label}</span>
            <span className="text-lg md:text-xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500">{icon}</span>
        </div>
        {sublabel && <span className={`text-[8px] font-black opacity-60 tracking-[0.3em] uppercase font-serif mt-1 ${theme.text}`}>{sublabel}</span>}
      </div>
    </button>
  );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onStart, onSignOut, profile, onRefreshProfile,
  playerName, setPlayerName, playerAvatar, setPlayerAvatar,
  cardCoverStyle, setCardCoverStyle, aiDifficulty, setAiDifficulty,
  quickFinish, setQuickFinish, soundEnabled, setSoundEnabled,
  backgroundTheme, setBackgroundTheme, isGuest
}) => {
  const [activeTab, setActiveTab] = useState<WelcomeTab>('PROFILE');
  const [storeTab, setStoreTab] = useState<'SLEEVES' | 'AVATARS' | 'BOARDS'>('SLEEVES');
  const [buying, setBuying] = useState<string | null>(null);
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
  const [previewThemeId, setPreviewThemeId] = useState<BackgroundTheme | null>(null);
  const [showGuestWarning, setShowGuestWarning] = useState<{ itemId: string, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD' } | null>(null);

  const handleStartGame = (mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL') => {
    onStart(playerName.trim() || 'GUEST', mode, cardCoverStyle, playerAvatar, quickFinish, aiDifficulty);
  };

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
      alert("Insufficient funds.");
    } finally {
      setBuying(null);
    }
  };

  const isSleeveUnlocked = (id: string) => {
    return profile?.unlocked_sleeves.includes(id) || SLEEVES.find(s => s.id === id)?.price === 0;
  };

  const isAvatarUnlocked = (emoji: string) => {
    return profile?.unlocked_avatars?.includes(emoji) || DEFAULT_AVATARS.includes(emoji);
  };

  const isBoardUnlocked = (id: string) => {
    return profile?.unlocked_boards.includes(id) || PREMIUM_BOARDS.find(b => b.id === id)?.price === 0;
  };

  const getThemeBtnStyle = (tId: BackgroundTheme) => {
    const isActive = backgroundTheme === tId;
    const isUnlocked = isBoardUnlocked(tId);
    
    if (!isUnlocked) return 'bg-black/40 text-white/10 border-white/5 grayscale opacity-40 cursor-not-allowed';
    if (!isActive) return 'bg-black/40 text-white/20 border-white/5 hover:text-white/40';

    switch (tId) {
      case 'EMERALD': return 'bg-emerald-600 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]';
      case 'CYBER_BLUE': return 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]';
      case 'CRIMSON_VOID': return 'bg-red-800 text-white border-red-500 shadow-[0_0_15px_rgba(153,27,27,0.3)]';
      case 'CYBERPUNK_NEON': return 'bg-slate-700 text-white border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]';
      case 'GOLDEN_EMPEROR': return 'bg-gradient-to-r from-yellow-500 via-[#ffd700] to-yellow-500 text-black border-yellow-300 shadow-[0_0_25px_rgba(255,215,0,0.5)]';
      default: return 'bg-yellow-500 text-black border-yellow-500';
    }
  };

  const renderProfileTab = () => {
    const allPossibleAvatars = [...DEFAULT_AVATARS, ...PREMIUM_AVATARS];
    const currentLevel = profile ? calculateLevel(profile.xp) : 1;
    const nextLevelXp = getXpForLevel(currentLevel + 1);
    const curLevelXpFloor = getXpForLevel(currentLevel);
    const xpInRange = (profile?.xp || 0) - curLevelXpFloor;
    const rangeTotal = nextLevelXp - curLevelXpFloor;
    const progress = Math.min(100, Math.max(0, (xpInRange / rangeTotal) * 100));

    const visibleAvatars = isCatalogExpanded ? allPossibleAvatars : allPossibleAvatars.slice(0, 10);

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-[400px] overflow-y-auto no-scrollbar pb-6 px-1">
        <SectionLabel>Identity Command</SectionLabel>
        <div className="flex flex-col items-center gap-6 bg-white/[0.02] p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative w-28 h-28 rounded-full bg-black/40 border-2 border-yellow-500/30 flex items-center justify-center text-6xl shadow-2xl">
            {playerAvatar}
            <div className="absolute inset-0 rounded-full border border-yellow-500/10 animate-[spin_12s_linear_infinite]"></div>
          </div>
          <div className="w-full space-y-4 relative z-10 text-center">
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[8px] font-black text-yellow-500/40 uppercase tracking-[0.6em]">Commander Callsign</span>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                maxLength={15}
                placeholder="ENTER CODENAME"
                className="w-full px-6 py-4 bg-black/60 border border-white/10 rounded-2xl text-center text-white font-black tracking-[0.3em] uppercase focus:border-yellow-500/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SectionLabel>Rank Progression</SectionLabel>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] relative overflow-hidden">
             <div className="flex justify-between items-end mb-4">
                <div>
                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Level</span>
                   <h4 className="text-4xl font-black text-white tracking-tighter mt-1">{currentLevel}</h4>
                </div>
                <div className="text-right">
                   <span className="text-[10px] font-black text-yellow-500/60 uppercase tracking-widest">XP to Next Level</span>
                   <p className="text-base font-black text-white mt-1">{profile?.xp || 0} / {nextLevelXp}</p>
                </div>
             </div>
             <div className="relative h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] transition-all duration-1000 ease-out" 
                  style={{ width: `${progress}%` }}
                >
                  <div className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_3s_infinite]"></div>
                </div>
             </div>
             <div className="flex justify-between mt-2 text-[8px] font-black uppercase tracking-[0.2em] text-white/20">
                <span>Battle Rank XP</span>
                <span>{Math.floor(progress)}% Progress</span>
             </div>
          </div>
        </div>

        <div className="space-y-4">
            <button 
                onClick={() => setIsCatalogExpanded(!isCatalogExpanded)}
                className="w-full flex items-center justify-between p-4 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl border border-white/10 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <span className="text-lg">📁</span>
                    <div className="text-left">
                        <span className="block text-[10px] font-black text-white uppercase tracking-widest">Identity Catalog</span>
                        <span className="block text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">{allPossibleAvatars.length} TOTAL SIGNATURES</span>
                    </div>
                </div>
                <div className={`transition-transform duration-500 ${isCatalogExpanded ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            <div className={`grid grid-cols-5 md:grid-cols-10 gap-2 p-4 bg-black/20 rounded-[2.5rem] border border-white/5 shadow-inner transition-all duration-700 overflow-hidden ${isCatalogExpanded ? 'opacity-100 max-h-[800px]' : 'opacity-100 max-h-[120px]'}`}>
                {visibleAvatars.map(a => {
                    const unlocked = isAvatarUnlocked(a);
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
                            className={`relative aspect-square flex items-center justify-center rounded-xl text-xl transition-all duration-300
                                ${active ? 'bg-yellow-500/20 ring-2 ring-yellow-500/50 scale-110 shadow-lg' : unlocked ? 'opacity-70 hover:opacity-100 hover:bg-white/10' : 'opacity-20 grayscale hover:opacity-40'}`}
                        >
                            {a}
                            {!unlocked && <div className="absolute inset-0 flex items-center justify-center text-[10px] pointer-events-none">🔒</div>}
                        </button>
                    );
                })}
                {!isCatalogExpanded && allPossibleAvatars.length > 10 && (
                    <button 
                        onClick={() => setIsCatalogExpanded(true)}
                        className="flex items-center justify-center rounded-xl bg-white/5 text-[10px] font-black text-white/40 hover:text-white/60 transition-all border border-dashed border-white/10"
                    >
                        +{allPossibleAvatars.length - 10}
                    </button>
                )}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#031109] relative overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#092b15_0%,_#000000_100%)]"></div>
      
      {/* Board Preview Modal */}
      {previewThemeId && (
        <DummyTablePreview themeId={previewThemeId} onClose={() => setPreviewThemeId(null)} />
      )}

      {/* Custom Guest Warning Modal */}
      {showGuestWarning && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
              <div className="max-w-md w-full bg-[#0a0f0d] border-2 border-yellow-500/20 rounded-[3rem] p-10 text-center space-y-6 shadow-[0_0_100px_rgba(234,179,8,0.2)]">
                  <div className="text-6xl animate-bounce">⚠️</div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Security Alert</h3>
                  <p className="text-gray-400 text-xs leading-relaxed uppercase tracking-widest font-medium">
                      Commander, you are in <span className="text-yellow-500">GUEST MODE</span>. 
                      Purchased items are stored only in this browser's local cache. 
                      If you clear your data or change devices, your items will be <span className="text-rose-500">PERMANENTLY LOST</span>.
                  </p>
                  <div className="flex flex-col gap-3">
                      <button 
                          onClick={() => executePurchase(showGuestWarning.itemId, showGuestWarning.price, showGuestWarning.type)}
                          className="w-full py-4 bg-yellow-500 text-black font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-yellow-400 transition-all active:scale-95 shadow-lg"
                      >
                          Deploy Gold Anyway
                      </button>
                      <button 
                          onClick={() => setShowGuestWarning(null)}
                          className="w-full py-3 bg-white/5 text-white/40 font-black rounded-xl uppercase tracking-widest text-[10px] hover:text-white/60 transition-all"
                      >
                          Abort Purchase
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-right-2 fade-in duration-700 pointer-events-none">
        <UserBar 
            profile={profile} 
            isGuest={isGuest} 
            avatar={playerAvatar} 
            onPromptAuth={() => {}}
            className="pointer-events-auto"
        />
      </div>

      <div className="max-w-2xl w-full z-10 flex flex-col items-center gap-1.5 mt-10 md:mt-0">
        <div className="animate-[logoEnter_1.5s_cubic-bezier(0.2,0,0.2,1)] drop-shadow-[0_0_50px_rgba(251,191,36,0.1)] mb-4">
          <BrandLogo size="lg" />
        </div>

        <div className="relative w-full bg-black/50 backdrop-blur-[40px] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] rounded-[3rem] overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex border-b border-white/5 bg-white/[0.02]">
            {(['PROFILE', 'STORE', 'SETTINGS'] as WelcomeTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-2
                  ${activeTab === tab 
                    ? 'text-yellow-500 border-yellow-500 bg-white/5' 
                    : 'text-gray-500 border-transparent hover:text-white hover:bg-white/[0.02]'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 md:p-10 overflow-hidden">
            {activeTab === 'PROFILE' && renderProfileTab()}

            {activeTab === 'STORE' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
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

                <div className="max-h-[350px] overflow-y-auto no-scrollbar pb-6">
                    {storeTab === 'SLEEVES' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {SLEEVES.map(s => {
                            const unlocked = isSleeveUnlocked(s.id);
                            const equipped = cardCoverStyle === s.style;
                            return (
                            <div key={s.id} className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-3 ${equipped ? 'bg-white/[0.05] border-yellow-500/30' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                                <div className="relative group">
                                    <Card faceDown coverStyle={s.style} small className="!w-12 !h-18" />
                                    {!unlocked && <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[7px] font-black px-1.5 py-0.5 rounded shadow">💰 {s.price}</div>}
                                </div>
                                <p className="text-[8px] font-black uppercase text-white/60">{s.name}</p>
                                <button
                                    disabled={equipped || (!unlocked && profile && profile.coins < s.price)}
                                    onClick={() => unlocked ? setCardCoverStyle(s.style) : handlePurchaseAttempt(s.id, s.price, 'SLEEVE')}
                                    className={`w-full py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all
                                        ${equipped ? 'bg-emerald-500/20 text-emerald-400' : 
                                        unlocked ? 'bg-white/10 text-white hover:bg-white/20' : 
                                        'bg-yellow-500 text-black hover:scale-105'}`}
                                >
                                    {equipped ? 'EQUIPPED' : unlocked ? 'EQUIP' : buying === s.id ? '...' : 'BUY'}
                                </button>
                            </div>
                            );
                        })}
                    </div>
                    ) : storeTab === 'AVATARS' ? (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                        {PREMIUM_AVATARS.map(emoji => {
                            const unlocked = isAvatarUnlocked(emoji);
                            const price = 250;
                            const canAfford = (profile?.coins || 0) >= price;
                            const equipped = playerAvatar === emoji;
                            return (
                                <div key={emoji} className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-3 ${equipped ? 'bg-white/[0.05] border-yellow-500/30' : 'bg-black/20 border-white/5 hover:border-white/20'}`}>
                                    <div className="text-3xl py-2">{emoji}</div>
                                    <button
                                        disabled={equipped || (!unlocked && !canAfford) || buying === emoji}
                                        onClick={() => unlocked ? setPlayerAvatar(emoji) : handlePurchaseAttempt(emoji, price, 'AVATAR')}
                                        className={`w-full py-1.5 rounded-xl font-black uppercase text-[7px] tracking-widest transition-all
                                            ${equipped ? 'bg-emerald-500/20 text-emerald-400' : 
                                            unlocked ? 'bg-white/10 text-white hover:bg-white/20' : 
                                            'bg-yellow-500 text-black hover:scale-105'}`}
                                    >
                                        {equipped ? 'USE' : unlocked ? 'EQUIP' : buying === emoji ? '...' : `💰 ${price}`}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {PREMIUM_BOARDS.map(b => {
                            const unlocked = isBoardUnlocked(b.id);
                            const equipped = backgroundTheme === b.id;
                            const canAfford = (profile?.coins || 0) >= b.price;
                            return (
                                <div key={b.id} className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-3 ${equipped ? 'bg-white/[0.05] border-yellow-500/30' : 'bg-black/20 border-white/5 hover:border-white/20'} relative group/board`}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setPreviewThemeId(b.id as BackgroundTheme); }}
                                        className="absolute top-2 left-2 p-2 rounded-full bg-black/60 border border-white/30 text-yellow-400 hover:text-white transition-all z-20 shadow-2xl"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </button>
                                    
                                    <div className="w-16 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] overflow-hidden relative shadow-lg">
                                        <div className={`absolute inset-0 ${b.base}`}>
                                            <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${b.colors} opacity-100 mix-blend-screen`}></div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase text-white/60">{b.name}</p>
                                        <p className="text-[6px] text-white/20 uppercase tracking-tighter mt-0.5">{b.desc}</p>
                                    </div>
                                    <button
                                        disabled={equipped || (!unlocked && !canAfford) || buying === b.id}
                                        onClick={() => unlocked ? setBackgroundTheme(b.id as BackgroundTheme) : handlePurchaseAttempt(b.id, b.price, 'BOARD')}
                                        className={`w-full py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all
                                            ${equipped ? 'bg-emerald-500/20 text-emerald-400' : 
                                            unlocked ? 'bg-white/10 text-white hover:bg-white/20' : 
                                            'bg-yellow-500 text-black hover:scale-105'}`}
                                >
                                        {equipped ? 'ACTIVE' : unlocked ? 'SET' : buying === b.id ? '...' : `BUY ${b.price}`}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    )}
                </div>
                
                <div className="mt-2 p-4 bg-black/40 rounded-2xl flex items-center justify-between border border-white/5">
                   <span className="text-[10px] font-black text-yellow-500">💰 {profile?.coins.toLocaleString() || 0} XIII GOLD</span>
                   <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Deployment Credits</span>
                </div>
              </div>
            )}

            {activeTab === 'SETTINGS' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-[400px] overflow-y-auto no-scrollbar pb-10">
                <div className="space-y-4">
                  <SectionLabel>Tactical Visuals</SectionLabel>
                  <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em] text-center">Deployment Card Sleeves</p>
                  <div className="grid grid-cols-3 gap-3 p-4 bg-black/20 rounded-[2.5rem] border border-white/5">
                    {SLEEVES.map(s => {
                      const unlocked = isSleeveUnlocked(s.id);
                      const active = cardCoverStyle === s.style;
                      return (
                        <button 
                         key={s.id}
                         disabled={!unlocked}
                         onClick={() => setCardCoverStyle(s.style)}
                         className={`relative flex flex-col items-center gap-2 transition-all ${!unlocked ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-105'}`}
                        >
                           <Card faceDown coverStyle={s.style} small className={`!w-12 !h-18 transition-all ${active ? 'ring-2 ring-yellow-500 shadow-lg' : 'border-white/5'}`} />
                           {!unlocked && <div className="absolute inset-0 flex items-center justify-center text-[10px]">🔒</div>}
                           <span className={`text-[6px] font-black uppercase tracking-tighter truncate w-full text-center ${active ? 'text-yellow-500' : 'text-white/20'}`}>{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2 bg-black/40 rounded-3xl border border-white/10">
                    {PREMIUM_BOARDS.map(t => {
                      const unlocked = isBoardUnlocked(t.id);
                      return (
                        <div key={t.id} className="relative group/board">
                            <button 
                                key={t.id} 
                                disabled={!unlocked}
                                onClick={() => setBackgroundTheme(t.id as BackgroundTheme)} 
                                className={`w-full py-3 rounded-2xl text-[7px] font-black uppercase transition-all border ${getThemeBtnStyle(t.id as BackgroundTheme)}`}
                            >
                                {t.name}
                                {!unlocked && <span className="ml-1">🔒</span>}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setPreviewThemeId(t.id as BackgroundTheme); }}
                                className="absolute -top-1 -right-1 p-1 rounded-full bg-black/90 border border-white/30 text-yellow-400 hover:text-white transition-all z-20 shadow-xl"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <SectionLabel>Bot Difficulty</SectionLabel>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                    {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map(d => (
                      <button key={d} onClick={() => setAiDifficulty(d)} className={`py-2.5 rounded-xl text-[9px] font-black tracking-widest transition-all ${aiDifficulty === d ? 'bg-yellow-500 text-black' : 'text-white/40'}`}>{d}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-4 rounded-3xl border border-white/5 flex items-center justify-between">
                    <span className="text-[8px] font-black text-white/60 uppercase">Audio</span>
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-10 h-5 rounded-full relative transition-all ${soundEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}`}></div></button>
                  </div>
                  <div className="bg-black/40 p-4 rounded-3xl border border-white/5 flex items-center justify-between">
                    <span className="text-[8px] font-black text-white/60 uppercase">Turbo</span>
                    <button onClick={() => setQuickFinish(!quickFinish)} className={`w-10 h-5 rounded-full relative transition-all ${quickFinish ? 'bg-emerald-600' : 'bg-white/10'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${quickFinish ? 'translate-x-6' : 'translate-x-1'}`}></div></button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 border-t border-white/5 bg-white/[0.01] space-y-4">
            <LuxuryButton onClick={() => handleStartGame('MULTI_PLAYER')} variant="emerald" label="PLAY ONLINE" icon="⚔️" sublabel="MULTIPLAYER ARENA" />
            <div className="grid grid-cols-2 gap-4">
              <LuxuryButton onClick={() => handleStartGame('SINGLE_PLAYER')} variant="gold" label="PLAY AI" icon="🤖" sublabel="BOT DUEL" slim />
              <LuxuryButton onClick={() => handleStartGame('TUTORIAL')} variant="ghost" label="TUTORIAL" icon="🎓" sublabel="LEARN RULES" slim />
            </div>
            <div className="pt-2 flex justify-center">
              <SignOutButton onSignOut={onSignOut} className="w-full !py-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
