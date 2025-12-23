
import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';
import { BrandLogo } from './BrandLogo';
import { AiDifficulty, UserProfile, BackgroundTheme } from '../types';
import { SignOutButton } from './SignOutButton';
import { UserBar } from './UserBar';
import { calculateLevel, getXpForLevel, buyItem, DEFAULT_AVATARS, PREMIUM_AVATARS, getAvatarName } from '../services/supabase';
import { PREMIUM_BOARDS, BoardPreview } from './UserHub';
import { audioService } from '../services/audio';

export type WelcomeTab = 'PROFILE' | 'CUSTOMIZE' | 'SETTINGS';

interface WelcomeScreenProps {
  onStart: (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL', coverStyle: CardCoverStyle, avatar: string, quickFinish?: boolean, difficulty?: AiDifficulty) => void;
  onSignOut: () => void;
  profile: UserProfile | null;
  onRefreshProfile: () => void;
  onOpenHub: (tab: WelcomeTab) => void;
  onOpenStore: () => void;
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
  { id: 'BLUE', name: 'Imperial Blue', price: 0, style: 'BLUE' as CardCoverStyle },
  { id: 'RED', name: 'Dynasty Red', price: 0, style: 'RED' as CardCoverStyle },
  { id: 'PATTERN', name: 'Golden Lattice', price: 250, style: 'PATTERN' as CardCoverStyle },
  { id: 'ROYAL_JADE', name: 'Imperial Jade', price: 500, style: 'ROYAL_JADE' as CardCoverStyle },
  { id: 'CRYSTAL_EMERALD', name: 'Crystal Gem', price: 1500, style: 'CRYSTAL_EMERALD' as CardCoverStyle },
  { id: 'GOLDEN_IMPERIAL', name: 'Sun King', price: 1000, style: 'GOLDEN_IMPERIAL' as CardCoverStyle },
  { id: 'VOID_ONYX', name: 'Void Walker', price: 2000, style: 'VOID_ONYX' as CardCoverStyle },
  { id: 'DRAGON_SCALE', name: 'Dragon Skin', price: 2500, style: 'DRAGON_SCALE' as CardCoverStyle },
  { id: 'NEON_CYBER', name: 'Neon Circuit', price: 3500, style: 'NEON_CYBER' as CardCoverStyle },
  { id: 'PIXEL_CITY_LIGHTS', name: 'Pixel City Lights', price: 3500, style: 'PIXEL_CITY_LIGHTS' as CardCoverStyle },
];

const TAB_DESCRIPTIONS: Record<WelcomeTab, string> = {
  PROFILE: "Overview Player Stats",
  CUSTOMIZE: "Configure Signature Assets",
  SETTINGS: "Select Gameplay Settings"
};

const SectionLabel: React.FC<{ children: React.ReactNode; rightElement?: React.ReactNode }> = ({ children, rightElement }) => (
  <div className="flex flex-col items-center mb-4 mt-2 px-2 w-full text-center">
    <div className="flex items-center justify-center gap-3 w-full">
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-yellow-500/30"></div>
      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500/70 italic whitespace-nowrap px-4">{children}</span>
      <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-yellow-500/30"></div>
    </div>
    {rightElement && <div className="mt-4 flex justify-center w-full">{rightElement}</div>}
  </div>
);

const SelectionCircle: React.FC<{ 
  status: 'equipped' | 'owned' | 'locked'; 
  price?: number; 
  onAction?: () => void;
}> = ({ status, price, onAction }) => {
  if (status === 'locked') {
    return (
      <div className="absolute top-2 right-2 z-20 px-1.5 py-0.5 bg-black/60 text-yellow-500 text-[7px] font-black rounded-full border border-white/10 flex items-center gap-1">
        <span>💰</span>
        <span>{price}</span>
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
          className="w-4 h-4 rounded-full border-2 border-white/20 bg-transparent hover:border-white/50 cursor-pointer transition-colors"
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
    <button onClick={onClick} className={`group relative w-full ${slim ? 'py-3.5 px-3' : 'py-5 px-4'} rounded-2xl border transition-all duration-500 active:scale-95 overflow-hidden ${theme.border} ${theme.shadow} shadow-[0_20px_40px_rgba(0,0,0,0.5)]`}>
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.bg} group-hover:scale-110 transition-transform duration-1000`}></div>
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.highlight} opacity-90 transition-opacity duration-500 group-hover:opacity-100`}></div>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
            <span className={`text-[11px] md:text-[13px] font-black uppercase tracking-[0.25em] font-serif ${theme.text} drop-shadow-md whitespace-nowrap`}>{label}</span>
            <span className="text-lg md:text-xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500">{icon}</span>
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
  onStart, onSignOut, profile, onRefreshProfile, onOpenHub, onOpenHub: onOpenSettings, onOpenStore,
  playerName, setPlayerName, playerAvatar, setPlayerAvatar,
  cardCoverStyle, setCardCoverStyle, aiDifficulty, setAiDifficulty,
  quickFinish, setQuickFinish, soundEnabled, setSoundEnabled,
  backgroundTheme, setBackgroundTheme, isGuest
}) => {
  const [activeTab, setActiveTab] = useState<WelcomeTab>('PROFILE');
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
  const [hideUnowned, setHideUnowned] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  // Purchase state for confirmation and award
  const [pendingPurchase, setPendingPurchase] = useState<{ id: string, name: string, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD', style?: CardCoverStyle } | null>(null);
  const [awardItem, setAwardItem] = useState<{ id: string, name: string, type: 'SLEEVE' | 'AVATAR' | 'BOARD', style?: CardCoverStyle } | null>(null);

  const handleStartGame = (mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL') => {
    if (mode === 'SINGLE_PLAYER' || mode === 'MULTI_PLAYER') {
        audioService.playStartMatch();
    }
    onStart(playerName.trim() || 'GUEST', mode, cardCoverStyle, playerAvatar, quickFinish, aiDifficulty);
  };

  const handlePurchaseAttempt = (item: any, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD') => {
    if (!profile || profile.coins < price || buying) return;
    
    setPendingPurchase({
      id: type === 'AVATAR' ? item : item.id,
      name: type === 'AVATAR' ? getAvatarName(item) : item.name,
      price,
      type,
      style: type === 'SLEEVE' ? item.style : undefined
    });
  };

  const executePurchase = async () => {
    if (!pendingPurchase || !profile || buying) return;
    setBuying(pendingPurchase.id);
    try {
      await buyItem(profile!.id, pendingPurchase.price, pendingPurchase.id, pendingPurchase.type, !!isGuest);
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

  const isSleeveUnlocked = (id: string) => profile?.unlocked_sleeves.includes(id) || SLEEVES.find(s => s.id === id)?.price === 0;
  const isAvatarUnlocked = (emoji: string) => profile?.unlocked_avatars?.includes(emoji) || DEFAULT_AVATARS.includes(emoji);
  const isBoardUnlocked = (id: string) => profile?.unlocked_boards.includes(id) || PREMIUM_BOARDS.find(b => b.id === id)?.price === 0;

  const renderProfileTab = () => {
    const allPossibleAvatars = [...DEFAULT_AVATARS, ...PREMIUM_AVATARS];
    const currentLevel = profile ? calculateLevel(profile.xp) : 1;
    const nextLevelXp = getXpForLevel(currentLevel + 1);
    const curLevelXpFloor = getXpForLevel(currentLevel);
    const xpInRange = (profile?.xp || 0) - curLevelXpFloor;
    const rangeTotal = Math.max(1, nextLevelXp - curLevelXpFloor);
    const progress = Math.min(100, Math.max(0, (xpInRange / rangeTotal) * 100));
    const visibleAvatars = isCatalogExpanded ? allPossibleAvatars : allPossibleAvatars.slice(0, 10);

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <SectionLabel>Identity Command</SectionLabel>
        <div className="flex flex-col items-center gap-4 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
           <div className="relative">
              <div className="absolute inset-[-8px] bg-yellow-500/10 blur-xl rounded-full"></div>
              <div className="relative w-20 h-20 rounded-full bg-black/40 border border-yellow-500/30 flex items-center justify-center text-5xl shadow-inner">
                {playerAvatar}
              </div>
           </div>
           <input 
              type="text" 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value.toUpperCase())}
              placeholder="ENTER CALLSIGN"
              maxLength={12}
              className="w-full max-w-xs bg-black/40 border border-white/10 px-6 py-3 rounded-2xl text-white font-black text-center uppercase tracking-widest focus:border-yellow-500/50 outline-none transition-all"
           />
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-3xl space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Level {currentLevel}</span>
            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">{nextLevelXp - (profile?.xp || 0)} XP TO RANK UP</span>
          </div>
          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-yellow-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {visibleAvatars.map(a => {
            const unlocked = isAvatarUnlocked(a);
            const active = playerAvatar === a;
            return (
              <button 
                key={a} 
                title={getAvatarName(a)}
                onClick={() => unlocked ? setPlayerAvatar(a) : handlePurchaseAttempt(a, 250, 'AVATAR')} 
                className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${active ? 'bg-yellow-500/20 ring-2 ring-yellow-500 scale-110' : unlocked ? 'bg-white/5 hover:bg-white/10' : 'opacity-20 grayscale hover:opacity-40'}`}
              >
                {a}
              </button>
            );
          })}
        </div>
        
        <div className="flex flex-col items-center">
            <button 
                onClick={() => setIsCatalogExpanded(!isCatalogExpanded)} 
                className={`group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 hover:border-yellow-500/40 hover:bg-white/[0.08] transition-all duration-500 active:scale-90 shadow-lg`}
                title={isCatalogExpanded ? "Collapse View" : "Expand All Options"}
            >
                <div className={`absolute inset-0 rounded-full bg-yellow-500/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`text-white/60 group-hover:text-yellow-500 transition-all duration-500 ${isCatalogExpanded ? 'rotate-180' : 'rotate-0'}`}
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
            <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/20 mt-1.5 group-hover:text-white/40 transition-colors">
                {isCatalogExpanded ? "MINIMIZE" : "EXPAND"}
            </span>
        </div>
      </div>
    );
  };

  const renderCustomizeTab = () => {
    const filteredSleeves = hideUnowned ? SLEEVES.filter(s => isSleeveUnlocked(s.id)) : SLEEVES;
    const filteredBoards = hideUnowned ? PREMIUM_BOARDS.filter(b => isBoardUnlocked(b.id)) : PREMIUM_BOARDS;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <SectionLabel 
          rightElement={
            <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-full border border-white/5">
              <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${hideUnowned ? 'text-yellow-500' : 'text-white/40'}`}>Owned Only</span>
              <button 
                onClick={() => setHideUnowned(!hideUnowned)}
                className={`w-10 h-5 rounded-full relative transition-all duration-500 ${hideUnowned ? 'bg-yellow-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-lg ${hideUnowned ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          }
        >
          Card Sleeve
        </SectionLabel>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredSleeves.map(s => {
            const unlocked = isSleeveUnlocked(s.id);
            const active = cardCoverStyle === s.style;
            return (
              <div key={s.id} onClick={() => unlocked ? setCardCoverStyle(s.style) : handlePurchaseAttempt(s, s.price, 'SLEEVE')} className={`relative group bg-white/[0.02] border rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:bg-white/[0.05] ${active ? 'border-emerald-500/40' : 'border-white/5'}`}>
                <SelectionCircle status={active ? 'equipped' : unlocked ? 'owned' : 'locked'} price={s.price} onAction={() => !active && unlocked && setCardCoverStyle(s.style)} />
                <Card faceDown coverStyle={s.style} small className={`!w-12 !h-18 transition-transform duration-300 ${active ? 'scale-110 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'group-hover:scale-105'} ${!unlocked ? 'opacity-30' : ''}`} />
                <span className={`text-[8px] font-black uppercase tracking-tighter truncate w-full text-center ${active ? 'text-emerald-400' : unlocked ? 'text-white/60' : 'text-white/20'}`}>{s.name}</span>
              </div>
            );
          })}
        </div>

        <SectionLabel>Board Themes</SectionLabel>
        <div className="grid grid-cols-2 gap-3 pb-4">
          {filteredBoards.map(b => {
            const unlocked = isBoardUnlocked(b.id);
            const active = backgroundTheme === b.id;
            return (
              <div key={b.id} onClick={() => unlocked ? setBackgroundTheme(b.id as BackgroundTheme) : handlePurchaseAttempt(b, b.price as number, 'BOARD')} className="flex flex-col items-center gap-2 cursor-pointer group">
                <BoardPreview 
                  themeId={b.id} 
                  active={active} 
                  unlocked={unlocked}
                  className="shadow-xl"
                />
                <span className={`text-[8px] font-black uppercase tracking-tighter truncate w-full text-center transition-colors ${active ? 'text-emerald-400' : unlocked ? 'text-white/60' : 'text-white/20'}`}>{b.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <SectionLabel>System Config</SectionLabel>
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5">
           <span className="text-[10px] font-black text-white uppercase tracking-widest">Haptic Audio</span>
           <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-12 h-6 rounded-full relative ${soundEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${soundEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
           </button>
        </div>
        <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5">
           <span className="text-[10px] font-black text-white uppercase tracking-widest">Single Player Turbo</span>
           <button onClick={() => setQuickFinish(!quickFinish)} className={`w-12 h-6 rounded-full relative ${quickFinish ? 'bg-yellow-500' : 'bg-white/10'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${quickFinish ? 'translate-x-7' : 'translate-x-1'}`} />
           </button>
        </div>
        <div className="space-y-3">
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest text-center">AI Aggression</p>
          <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-xl">
            {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map(d => {
              let activeClass = 'bg-yellow-500 text-black';
              if (d === 'EASY') activeClass = 'bg-emerald-600 text-white';
              if (d === 'HARD') activeClass = 'bg-rose-600 text-white';

              return (
                <button key={d} onClick={() => setAiDifficulty(d)} className={`py-2 rounded-lg text-[8px] font-black uppercase transition-all ${aiDifficulty === d ? activeClass : 'text-white/40 hover:text-white/60'}`}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#0a3d23] relative overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#115e34_0%,_#000000_100%)]"></div>
      
      {/* PURCHASE CONFIRMATION MODAL */}
      {pendingPurchase && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200">
              <div className="bg-[#0a0a0a] border border-yellow-500/20 w-full max-w-xs rounded-[2rem] p-8 flex flex-col items-center text-center shadow-[0_0_100px_rgba(234,179,8,0.15)]">
                  <div className="text-4xl mb-4">💳</div>
                  <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">Confirm Purchase?</h3>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-6">
                    Unlock <span className="text-white">{pendingPurchase.name}</span> for <span className="text-yellow-500">{pendingPurchase.price} GOLD</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3 w-full">
                      <button onClick={() => setPendingPurchase(null)} className="py-3 rounded-xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
                      <button 
                        onClick={executePurchase} 
                        disabled={!!buying}
                        className="py-3 rounded-xl bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                      >
                        {buying ? '...' : 'Confirm'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* ASSET SECURED AWARD ANIMATION */}
      {awardItem && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden">
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
              <div className="relative flex flex-col items-center text-center max-w-sm">
                  <div className="absolute inset-0 bg-yellow-500/10 blur-[120px] animate-pulse"></div>
                  <div className="relative mb-10 animate-award-pop">
                      {awardItem.type === 'AVATAR' ? (
                          <div className="text-9xl drop-shadow-[0_0_40px_rgba(234,179,8,0.5)]">{awardItem.id}</div>
                      ) : awardItem.type === 'SLEEVE' ? (
                          <Card faceDown coverStyle={awardItem.style} className="!w-40 !h-60 shadow-[0_40px_80px_rgba(0,0,0,1)] ring-2 ring-yellow-500/50" />
                      ) : (
                          <div className="w-64 aspect-[16/10] rounded-3xl overflow-hidden ring-2 ring-yellow-500/50 shadow-2xl">
                             {(() => {
                               const b = PREMIUM_BOARDS.find(b => b.id === awardItem.id);
                               return <div className={`absolute inset-0 ${b?.base}`}><div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${b?.colors} mix-blend-screen`}></div></div>;
                             })()}
                          </div>
                      )}
                  </div>
                  <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-yellow-200 to-yellow-500 uppercase tracking-tighter italic animate-award-text">ASSET SECURED</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500 mt-4 animate-award-text [animation-delay:0.2s]">{awardItem.name} • UNLOCKED</p>
                  <button onClick={() => setAwardItem(null)} className="mt-12 px-12 py-4 rounded-full bg-white text-black font-black uppercase tracking-[0.3em] text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl animate-award-text [animation-delay:0.4s]">DEPLOY ASSET</button>
              </div>
          </div>
      )}

      {/* SHOP BUTTON WITH SUBTEXT */}
      <div className="fixed top-8 left-8 z-[100] animate-in slide-in-from-left-2 fade-in duration-700 flex flex-col items-center gap-1.5">
        <button 
          onClick={onOpenStore}
          className="group relative w-12 h-12 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95"
        >
          <div className="absolute inset-0 bg-yellow-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-xl group-hover:rotate-12 transition-transform duration-300">🏪</span>
        </button>
        <span className="text-[9px] font-black uppercase text-yellow-500/70 tracking-[0.2em] drop-shadow-sm">SHOP</span>
      </div>

      <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-right-2 fade-in duration-700 pointer-events-none">
        <UserBar profile={profile} isGuest={isGuest} avatar={playerAvatar} onClick={() => onOpenHub('PROFILE')} className="pointer-events-auto" />
      </div>

      <div className="max-w-2xl w-full z-10 flex flex-col items-center gap-1.5 mt-10 md:mt-0">
        <div className="animate-in zoom-in fade-in duration-1000 drop-shadow-[0_0_50px_rgba(251,191,36,0.1)] mb-4 flex flex-col items-center gap-3">
          <BrandLogo size="lg" />
          
          {/* UPGRADED BETA WARNING INDICATOR */}
          <div className="flex flex-col items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-1000 delay-500">
            <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-red-950/40 border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
               <div className="relative flex items-center justify-center">
                  <span className="absolute w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  <span className="relative w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]"></span>
               </div>
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 whitespace-nowrap">BETA PHASE: ACTIVE TESTING</span>
            </div>
            {/* ONE LINER IMPLICATION */}
            <p className="text-[9px] font-black text-red-500/80 uppercase tracking-widest text-center px-4 max-w-md drop-shadow-sm">
                Expect protocol iterations, potential bugs, and intermittent connectivity as systems are calibrated.
            </p>
          </div>
        </div>

        <div className="relative w-full bg-black/50 backdrop-blur-[40px] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] rounded-[3rem] overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex border-b border-white/5 bg-white/[0.02]">
            {(['PROFILE', 'CUSTOMIZE', 'SETTINGS'] as WelcomeTab[]).map(tab => (
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

          <div className="flex-1 p-6 md:p-10 overflow-hidden flex flex-col">
            {/* TAGLINE HEADER */}
            <div key={activeTab} className="mb-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-500 overflow-hidden w-full">
               <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse shrink-0"></div>
               <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] font-mono whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0">
                  {TAB_DESCRIPTIONS[activeTab]}
               </span>
               <div className="h-[1px] w-8 md:w-16 bg-gradient-to-r from-white/10 to-transparent shrink-0"></div>
            </div>

            {activeTab === 'PROFILE' && renderProfileTab()}
            {activeTab === 'CUSTOMIZE' && renderCustomizeTab()}
            {activeTab === 'SETTINGS' && renderSettingsTab()}
          </div>

          <div className="p-8 border-t border-white/5 bg-white/[0.01] space-y-4">
            <LuxuryButton onClick={() => handleStartGame('MULTI_PLAYER')} variant="emerald" label="PLAY ONLINE" icon="⚔️" sublabel="MULTIPLAYER ARENA" />
            <LuxuryButton onClick={() => handleStartGame('SINGLE_PLAYER')} variant="gold" label="PLAY AI" icon="🤖" sublabel="BOT DUEL" />
            <div className="grid grid-cols-2 gap-4">
              <LuxuryButton onClick={() => handleStartGame('TUTORIAL')} variant="ghost" label="TUTORIAL" icon="🎓" sublabel="LEARN RULES" slim />
              <SignOutButton onSignOut={onSignOut} className="w-full" />
            </div>
          </div>
        </div>
        
        {/* FOOTER DISCLAIMER */}
        <p className="mt-4 text-[8px] font-black text-white/10 uppercase tracking-[0.6em] text-center max-w-xs mx-auto opacity-50 hover:opacity-100 transition-opacity">
          Protocol undergoing calibration. System variations may occur during testing phase.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }
        @keyframes awardPop {
            0% { transform: scale(0.5); opacity: 0; filter: blur(20px); }
            60% { transform: scale(1.1); opacity: 1; filter: blur(0); }
            100% { transform: scale(1); }
        }
        @keyframes awardText {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes awardParticle {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0) rotate(var(--rot)); opacity: 0; }
        }
        .animate-award-pop { animation: awardPop 0.8s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
        .animate-award-text { opacity: 0; animation: awardText 0.6s ease-out forwards; }
        .animate-award-particle { animation: awardParticle 1.2s ease-out forwards; }
      `}} />
    </div>
  );
};
