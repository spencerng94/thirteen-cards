import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardCoverStyle } from './Card';
import { BrandLogo } from './BrandLogo';
import { AiDifficulty, UserProfile, BackgroundTheme, Emote, Rank, Suit, HubTab } from '../types';
import { SignOutButton } from './SignOutButton';
import { UserBar } from './UserBar';
import { calculateLevel, getXpForLevel, buyItem, DEFAULT_AVATARS, PREMIUM_AVATARS, getAvatarName, fetchEmotes } from '../services/supabase';
import { PREMIUM_BOARDS, BoardPreview, BoardSurface } from './UserHub';
import { SleeveArenaPreview, SUPER_PRESTIGE_SLEEVE_IDS, SLEEVES as ALL_STORE_SLEEVES, SOVEREIGN_IDS, CurrencyIcon, canAfford } from './Store';
import { audioService } from '../services/audio';
import { VisualEmote } from './VisualEmote';
import { EventsModal } from './EventsModal';

export type WelcomeTab = 'PROFILE' | 'CUSTOMIZE' | 'SETTINGS';

interface WelcomeScreenProps {
  onStart: (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL', coverStyle: CardCoverStyle, avatar: string, quickFinish?: boolean, difficulty?: AiDifficulty) => void;
  onSignOut: () => void;
  profile: UserProfile | null;
  onRefreshProfile: () => void;
  onOpenHub: (tab: HubTab) => void;
  onOpenStore: (tab?: 'SLEEVES' | 'AVATARS' | 'BOARDS') => void;
  onOpenGemPacks: () => void;
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
  onStart, onSignOut, profile, onRefreshProfile, onOpenHub, onOpenStore, onOpenGemPacks,
  playerName, setPlayerName, playerAvatar, setPlayerAvatar,
  cardCoverStyle, setCardCoverStyle, aiDifficulty, setAiDifficulty,
  quickFinish, setQuickFinish, soundEnabled, setSoundEnabled,
  backgroundTheme, setBackgroundTheme, isGuest,
  sleeveEffectsEnabled, setSleeveEffectsEnabled,
  playAnimationsEnabled, setPlayAnimationsEnabled
}) => {
  const [activeTab, setActiveTab] = useState<WelcomeTab>('PROFILE');
  const [customizeSubTab, setCustomizeSubTab] = useState<'SLEEVES' | 'BOARDS'>('SLEEVES');
  const [hideUnowned, setHideUnowned] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [previewSleeveStyle, setPreviewSleeveStyle] = useState<CardCoverStyle | null>(null);
  const [previewThemeId, setPreviewThemeId] = useState<BackgroundTheme | null>(null);
  const [density, setDensity] = useState<1 | 2 | 4>(2);
  const [eventsOpen, setEventsOpen] = useState(false);

  const [pendingPurchase, setPendingPurchase] = useState<{ id: string, name: string, price: number, currency: 'GOLD' | 'GEMS', type: 'SLEEVE' | 'AVATAR' | 'BOARD', style?: CardCoverStyle } | null>(null);
  const [awardItem, setAwardItem] = useState<{ id: string, name: string, type: 'SLEEVE' | 'AVATAR' | 'BOARD', style?: CardCoverStyle } | null>(null);

  useEffect(() => {
    fetchEmotes().then(setRemoteEmotes);
  }, []);

  const handleStartGame = (mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL') => {
    if (mode === 'SINGLE_PLAYER' || mode === 'MULTI_PLAYER') {
        audioService.playStartMatch();
    }
    onStart(playerName.trim() || 'GUEST', mode, cardCoverStyle, playerAvatar, quickFinish, aiDifficulty);
  };

  const handlePurchaseAttempt = (item: any, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD') => {
    if (!profile || buying) return;
    setPendingPurchase({
      id: type === 'AVATAR' ? item : item.id,
      name: type === 'AVATAR' ? getAvatarName(item, remoteEmotes) : item.name,
      price,
      currency: item.currency || 'GOLD',
      type,
      style: type === 'SLEEVE' ? item.style : undefined
    });
  };

  const executePurchase = async () => {
    if (!pendingPurchase || !profile || buying) return;
    const canAffordItem = pendingPurchase.currency === 'GEMS' ? (profile.gems >= pendingPurchase.price) : (profile.coins >= pendingPurchase.price);
    if (!canAffordItem) return;
    const purchaseId = pendingPurchase.id;
    setBuying(purchaseId);
    try {
      await buyItem(profile!.id, pendingPurchase.price, purchaseId, pendingPurchase.type, !!isGuest);
      audioService.playPurchase();
      setAwardItem({ id: purchaseId, name: pendingPurchase.name, type: pendingPurchase.type, style: pendingPurchase.style });
      setPendingPurchase(null);
      onRefreshProfile();
    } catch (err) { console.error(err); } finally { setBuying(null); }
  };

  const isSleeveUnlocked = (id: string) => profile?.unlocked_sleeves.includes(id) || ALL_STORE_SLEEVES.find(s => s.id === id)?.price === 0;
  const isBoardUnlocked = (id: string) => profile?.unlocked_boards.includes(id) || PREMIUM_BOARDS.find(b => b.id === id)?.price === 0;

  const renderProfileTab = () => {
    const currentLevel = profile ? calculateLevel(profile.xp) : 1;
    const nextLevelXp = getXpForLevel(currentLevel + 1);
    const curLevelXpFloor = getXpForLevel(currentLevel);
    const xpInRange = (profile?.xp || 0) - curLevelXpFloor;
    const rangeTotal = Math.max(1, nextLevelXp - curLevelXpFloor);
    const progress = Math.min(100, Math.max(0, (xpInRange / rangeTotal) * 100));

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <SectionLabel>PLAYER PROFILE</SectionLabel>
        <div onClick={() => onOpenHub('PROFILE')} className="flex flex-col items-center gap-6 bg-black/40 p-8 rounded-3xl border border-white/10 backdrop-blur-md cursor-pointer group hover:bg-black/60 transition-all active:scale-[0.98] relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <div className="relative">
              <div className="absolute inset-[-20px] bg-yellow-500/10 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
              <div className="relative w-28 h-28 rounded-full bg-black/40 border border-yellow-500/30 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500 overflow-hidden"><VisualEmote trigger={playerAvatar} remoteEmotes={remoteEmotes} size="xl" /></div>
           </div>
           <div className="flex flex-col items-center gap-1.5">
              <span className="text-white font-black text-xl md:text-2xl uppercase tracking-widest drop-shadow-lg">{playerName || 'CALLSIGN REQUIRED'}</span>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 group-hover:bg-yellow-500/10 group-hover:border-yellow-500/30 transition-all"><span className="text-[7px] font-black text-yellow-500/60 uppercase tracking-[0.4em]">Update Credentials</span></div>
           </div>
        </div>
        <div onClick={() => onOpenHub('LEVEL_REWARDS')} className="bg-black/40 backdrop-blur-md border border-white/5 p-5 rounded-3xl space-y-2 cursor-pointer hover:bg-white/[0.02] transition-colors group">
          <div className="flex justify-between items-end"><span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">Level {currentLevel}</span><span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">{nextLevelXp - (profile?.xp || 0)} XP TO RANK UP</span></div>
          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-yellow-500 transition-all duration-1000" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>
    );
  };

  const renderCustomizeTab = () => {
    const filteredSleeves = hideUnowned ? ALL_STORE_SLEEVES.filter(s => isSleeveUnlocked(s.id)) : ALL_STORE_SLEEVES;
    const filteredBoards = hideUnowned ? PREMIUM_BOARDS.filter(b => isBoardUnlocked(b.id)) : PREMIUM_BOARDS;
    const sleeveGridClass = density === 4 ? 'grid-cols-3' : density === 1 ? 'grid-cols-1' : 'grid-cols-2';
    const boardGridClass = density === 4 ? 'grid-cols-3' : density === 1 ? 'grid-cols-1' : 'grid-cols-2';
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <SectionLabel 
          rightElement={
            <div className="flex flex-col gap-4 w-full">
              <div className="flex items-center justify-center gap-4 bg-black/40 backdrop-blur-md px-4 py-2.5 rounded-[2rem] border border-white/5 shadow-inner">
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/5">
                  {( [1, 2, 4] as const).map((d) => (<button key={d} onClick={() => setDensity(d)} className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${density === d ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/50'}`}>{d === 1 ? <GridIcon1 /> : d === 2 ? <GridIcon2 /> : <GridIcon4 />}</button>))}
                </div>
                <div className="h-4 w-[1px] bg-white/10"></div>
                <button onClick={() => setHideUnowned(!hideUnowned)} className="flex items-center gap-3 group px-2"><span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${hideUnowned ? 'text-yellow-500' : 'text-white/40'}`}>OWNED</span><div className={`w-10 h-5 rounded-full relative transition-all duration-500 ${hideUnowned ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-white/10'}`}><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-lg ${hideUnowned ? 'translate-x-5' : 'translate-x-0'}`} /></div></button>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/60 rounded-2xl border border-white/5 shadow-inner">{(['SLEEVES', 'BOARDS'] as const).map(tab => (<button key={tab} onClick={() => setCustomizeSubTab(tab)} className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all ${customizeSubTab === tab ? 'bg-white/10 text-white shadow-md' : 'text-white/30 hover:text-white/50'}`}>{tab}</button>))}</div>
            </div>
          }
        >Visual Assets</SectionLabel>
        {customizeSubTab === 'SLEEVES' ? (
          <div className="animate-in fade-in duration-500"><div className={`grid ${sleeveGridClass} gap-3`}>{filteredSleeves.map(s => {
                const unlocked = isSleeveUnlocked(s.id);
                const active = cardCoverStyle === s.style;
                const isPrestige = PRESTIGE_SLEEVE_IDS.includes(s.style);
                const isSuperPrestige = SUPER_PRESTIGE_SLEEVE_IDS.includes(s.style);
                const isSovereign = SOVEREIGN_IDS.includes(s.style);
                return (<div key={s.id} onClick={() => { if (unlocked) setPreviewSleeveStyle(s.style); else if (!isSovereign) handlePurchaseAttempt(s, s.price, 'SLEEVE'); }} className={`relative group bg-black/40 backdrop-blur-sm border rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer transition-all hover:bg-black/60 ${active ? 'border-emerald-500/40' : 'border-white/5'}`}><SelectionCircle status={active ? 'equipped' : unlocked ? 'owned' : 'locked'} price={s.price} currency={s.currency} isEvent={isSovereign} onAction={() => !active && unlocked && setCardCoverStyle(s.style)} /><div className="relative group/card-wrap"><Card faceDown activeTurn={true} coverStyle={s.style} small className={`!w-12 !h-18 transition-transform duration-300 ${active ? 'scale-110 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'group-hover:scale-105'} ${!unlocked ? 'opacity-30' : ''}`} disableEffects={!sleeveEffectsEnabled} />{isPrestige && !isSuperPrestige && (<div className="absolute -top-1 -left-1 bg-black/80 rounded-full w-4 h-4 flex items-center justify-center border border-yellow-500/30 shadow-lg z-20 group-hover/card-wrap:scale-110 transition-transform"><span className="text-yellow-500 text-[8px] font-black">♠</span></div>)}{isSuperPrestige && (<div className="absolute -top-1.5 -left-1.5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full w-5 h-5 flex items-center justify-center border border-white shadow-lg z-20 group-hover/card-wrap:scale-110 transition-transform animate-pulse"><span className="text-white text-[10px] font-black">♥</span></div>)}</div><span className={`text-[8px] font-black uppercase tracking-tighter truncate w-full text-center ${active ? 'text-emerald-400' : unlocked ? (isSuperPrestige ? 'text-yellow-300' : 'text-white/60') : 'text-white/20'}`}>{s.name}</span></div>);
              })}</div></div>
        ) : (
          <div className="animate-in fade-in duration-500"><div className={`grid ${boardGridClass} gap-3 pb-4 px-1`}>{filteredBoards.map(b => {
                const unlocked = isBoardUnlocked(b.id);
                const active = backgroundTheme === b.id;
                return (<div key={b.id} onClick={() => unlocked ? setBackgroundTheme(b.id as BackgroundTheme) : handlePurchaseAttempt(b, b.price as number, 'BOARD')} className="flex flex-col items-center gap-2 cursor-pointer group relative"><div className="relative w-full"><SelectionCircle status={active ? 'equipped' : unlocked ? 'owned' : 'locked'} price={b.price as number} onAction={() => !active && unlocked && setBackgroundTheme(b.id as BackgroundTheme)} /><BoardPreview themeId={b.id} active={active} unlocked={unlocked} className="shadow-xl" /></div><span className={`text-[8px] font-black uppercase tracking-tighter truncate w-full text-center transition-colors ${active ? 'text-emerald-400' : unlocked ? 'text-white/60' : 'text-white/20'}`}>{b.name}</span></div>);
              })}</div></div>
        )}
      </div>
    );
  };

  const renderSettingsTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <SectionLabel>System Config</SectionLabel>
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5">
           <div className="flex flex-col gap-0.5"><span className="text-[10px] font-black text-white uppercase tracking-widest">Haptic Audio</span><span className="text-[7px] font-bold text-white/30 uppercase tracking-tight">Enable immersive arena sound effects</span></div>
           <button onClick={() => setSoundEnabled(!soundEnabled)} className={`w-12 h-6 rounded-full relative ${soundEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${soundEnabled ? 'translate-x-7' : 'translate-x-1'}`} /></button>
        </div>
        <div className="flex items-center justify-between bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/5">
           <div className="flex flex-col gap-0.5"><span className="text-[10px] font-black text-white uppercase tracking-widest">Card Play Animations</span><span className="text-[7px] font-bold text-white/30 uppercase tracking-tight">Organic card motion when tossed to arena</span></div>
           <button onClick={() => setPlayAnimationsEnabled(!playAnimationsEnabled)} className={`w-12 h-6 rounded-full relative ${playAnimationsEnabled ? 'bg-emerald-600' : 'bg-white/10'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${playAnimationsEnabled ? 'translate-x-7' : 'translate-x-1'}`} /></button>
        </div>
        <div className="space-y-3">
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest text-center">AI Difficulty</p>
          <div className="grid grid-cols-3 gap-2 p-1 bg-black/60 backdrop-blur-md rounded-xl border border-white/5">{(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map(d => (<button key={d} onClick={() => setAiDifficulty(d)} className={`py-2 rounded-lg text-[8px] font-black uppercase transition-all ${aiDifficulty === d ? (d === 'EASY' ? 'bg-emerald-600' : d === 'MEDIUM' ? 'bg-yellow-500 text-black' : 'bg-rose-600') : 'text-white/40 hover:text-white/60'}`}>{d}</button>))}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4">
      <BoardSurface themeId={backgroundTheme} />
      {previewSleeveStyle && <SleeveArenaPreview sleeveStyle={previewSleeveStyle} themeId={backgroundTheme} sleeveEffectsEnabled={sleeveEffectsEnabled} onClose={() => setPreviewSleeveStyle(null)} />}
      {eventsOpen && profile && <EventsModal onClose={() => setEventsOpen(false)} profile={profile} onRefreshProfile={onRefreshProfile} isGuest={isGuest} />}
      <div className="fixed top-8 left-8 z-[100] animate-in slide-in-from-left-2 fade-in duration-700 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-1.5"><button onClick={() => onOpenStore()} className="group relative w-12 h-12 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95"><div className="absolute inset-0 bg-yellow-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div><span className="text-xl group-hover:rotate-12 transition-transform duration-300">🏪</span></button><span className="text-[9px] font-black uppercase text-yellow-500/70 tracking-[0.2em] drop-shadow-sm">SHOP</span></div>
        <div className="flex flex-col items-center gap-1.5"><button onClick={() => setEventsOpen(true)} className="group relative w-12 h-12 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95"><div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div><span className="text-xl group-hover:scale-110 transition-transform duration-300">📅</span></button><span className="text-[9px] font-black uppercase text-emerald-500/70 tracking-[0.2em] drop-shadow-sm">EVENTS</span></div>
      </div>
      <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-right-2 fade-in duration-700 pointer-events-none">
        <UserBar profile={profile} isGuest={isGuest} avatar={playerAvatar} remoteEmotes={remoteEmotes} onClick={(tab) => onOpenHub(tab)} onOpenStore={onOpenStore} onOpenGemPacks={onOpenGemPacks} className="pointer-events-auto" />
      </div>
      <div className="max-w-2xl w-full z-10 flex flex-col items-center gap-1.5 mt-10 md:mt-0">
        <div className="animate-in fade-in duration-1000 mb-4 flex flex-col items-center gap-3"><div className="relative"><div className="drop-shadow-[0_40px_100px_rgba(0,0,0,0.95)]"><BrandLogo size="lg" /></div></div><div className="flex flex-col items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-1000 delay-500"><div className="flex items-center gap-3 px-6 py-2 rounded-full bg-red-950/40 border-2 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.3)]"><div className="relative flex items-center justify-center"><span className="absolute w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span><span className="relative w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444]"></span></div><span className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 whitespace-nowrap">BETA PHASE: ACTIVE TESTING</span></div></div></div>
        <div className="relative w-full bg-black/50 backdrop-blur-[40px] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] rounded-[3rem] overflow-hidden flex flex-col min-h-[500px]"><div className="flex border-b border-white/5 bg-white/[0.02]">{(['PROFILE', 'CUSTOMIZE', 'SETTINGS'] as WelcomeTab[]).map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-2 ${activeTab === tab ? 'text-yellow-500 border-yellow-500 bg-white/5' : 'text-gray-500 border-transparent hover:text-white hover:bg-white/[0.02]'}`}>{tab}</button>))}</div><div className="flex-1 p-6 md:p-10 overflow-hidden flex flex-col"><div key={activeTab} className="mb-4 flex items-center gap-4 animate-in fade-in slide-in-from-left-2 duration-500 overflow-hidden w-full"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse shrink-0"></div><span className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] font-mono whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0">{TAB_DESCRIPTIONS[activeTab]}</span><div className="h-[1px] w-8 md:w-16 bg-gradient-to-r from-white/10 to-transparent shrink-0"></div></div>{activeTab === 'PROFILE' && renderProfileTab()}{activeTab === 'CUSTOMIZE' && renderCustomizeTab()}{activeTab === 'SETTINGS' && renderSettingsTab()}</div><div className="p-8 border-t border-white/5 bg-white/[0.01] space-y-4"><LuxuryButton onClick={() => handleStartGame('MULTI_PLAYER')} variant="emerald" label="PLAY ONLINE" icon="⚔️" sublabel="MULTIPLAYER ARENA" /><LuxuryButton onClick={() => handleStartGame('SINGLE_PLAYER')} variant="gold" label="PLAY AI" icon="🤖" sublabel="BOT DUEL" /><div className="grid grid-cols-2 gap-4"><LuxuryButton onClick={() => handleStartGame('TUTORIAL')} variant="ghost" label="TUTORIAL" icon="🎓" sublabel="LEARN RULES" slim /><SignOutButton onSignOut={onSignOut} className="w-full" /></div></div></div>
      </div>
    </div>
  );
};