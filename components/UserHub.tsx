
import React, { useState } from 'react';
import { UserProfile, BackgroundTheme, AiDifficulty } from '../types';
import { calculateLevel, getXpForLevel, DEFAULT_AVATARS, PREMIUM_AVATARS, buyItem, getAvatarName } from '../services/supabase';
import { SignOutButton } from './SignOutButton';
import { CardCoverStyle, Card } from './Card';
import { audioService } from '../services/audio';

/**
 * Premium Board Configurations
 */
export const PREMIUM_BOARDS = [
  { 
    id: 'EMERALD', 
    name: 'Emerald Felt', 
    price: 0, 
    base: 'bg-[#0a3d23]', 
    colors: 'from-green-500/20 via-emerald-800/40 to-[#052e16]', 
    texture: true 
  },
  { 
    id: 'CYBER_BLUE', 
    name: 'Cobalt Neon', 
    price: 500, 
    base: 'bg-[#020617]', 
    colors: 'from-blue-600/20 via-indigo-950/40 to-black', 
    technoGrid: true 
  },
  { 
    id: 'CRIMSON_VOID', 
    name: 'Baccarat Red', 
    price: 1000, 
    base: 'bg-[#0a0000]', 
    colors: 'from-red-900/20 via-rose-950/40 to-black', 
    spotlight: 'rgba(220, 38, 38, 0.15)' 
  },
  { 
    id: 'CYBERPUNK_NEON', 
    name: 'Onyx Cyber', 
    price: 2500, 
    base: 'bg-[#050505]', 
    colors: 'from-fuchsia-600/10 via-purple-900/20 to-black', 
    technoGrid: true, 
    spotlight: 'rgba(217, 70, 239, 0.1)' 
  },
  { 
    id: 'GOLDEN_EMPEROR', 
    name: 'Imperial Gold', 
    price: 5000, 
    base: 'bg-[#0a0a05]', 
    colors: 'from-yellow-600/20 via-orange-950/40 to-black', 
    emperor: true, 
    spotlight: 'rgba(234, 179, 8, 0.2)' 
  }
];

export const ImperialGoldLayer: React.FC<{ opacity?: number }> = ({ opacity = 0.6 }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity }}>
    <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/oriental-tiles.png")' }}></div>
    <div className="absolute top-8 left-8 w-32 h-32 border-t-4 border-l-4 border-yellow-500/30 rounded-tl-3xl"></div>
    <div className="absolute top-8 right-8 w-32 h-32 border-t-4 border-r-4 border-yellow-500/30 rounded-tr-3xl"></div>
    <div className="absolute bottom-8 left-8 w-32 h-32 border-b-4 border-l-4 border-yellow-500/30 rounded-bl-3xl"></div>
    <div className="absolute bottom-8 right-8 w-32 h-32 border-b-4 border-r-4 border-yellow-500/30 rounded-br-3xl"></div>
  </div>
);

/**
 * High-Fidelity Board Preview
 * Used across selection menus to accurately represent terrain detail
 */
export const BoardPreview: React.FC<{ 
  themeId: string; 
  className?: string; 
  active?: boolean;
  unlocked?: boolean;
}> = ({ themeId, className = "", active, unlocked = true }) => {
  const theme = PREMIUM_BOARDS.find(b => b.id === themeId) || PREMIUM_BOARDS[0];
  
  return (
    <div className={`relative w-full aspect-[16/10] rounded-2xl overflow-hidden border transition-all duration-500 ${active ? 'border-yellow-500 shadow-2xl scale-[1.02]' : 'border-white/10 group-hover:border-white/20'} ${className}`}>
      {/* 1. Base Layer */}
      <div className={`absolute inset-0 ${theme.base}`}>
        
        {/* 2. Primary Color Diffusion */}
        <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${theme.colors} opacity-100 mix-blend-screen`}></div>
        
        {/* 3. Repeating Texture (Felt/Grain) */}
        {theme.texture && (
          <div className="absolute inset-0 opacity-[0.2] mix-blend-overlay" 
               style={{ backgroundImage: 'repeating-radial-gradient(circle at center, #fff 0, #fff 1px, transparent 0, transparent 100%)', backgroundSize: '3px 3px' }}></div>
        )}
        
        {/* 4. Techno-Grid Layer */}
        {theme.technoGrid && (
          <div className="absolute inset-0 opacity-[0.08]" 
               style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        )}
        
        {/* 5. Central Focus Lighting */}
        <div className="absolute inset-0" 
             style={{ backgroundImage: `radial-gradient(circle at center, ${theme.spotlight || 'rgba(255,255,255,0.05)'} 0%, transparent 80%)` }}></div>
        
        {/* 6. Imperial Decorative Layer (Scaled for Preview) */}
        {theme.emperor && (
          <div className="absolute inset-0 pointer-events-none opacity-40">
             <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-yellow-500/40 rounded-tl-lg"></div>
             <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-yellow-500/40 rounded-tr-lg"></div>
             <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-yellow-500/40 rounded-bl-lg"></div>
             <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-yellow-500/40 rounded-br-lg"></div>
          </div>
        )}

        {/* 7. Glossy Sheen Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none"></div>
      </div>

      {/* State Overlays */}
      {!unlocked && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center opacity-60">
            <span className="text-xs">🔒</span>
          </div>
        </div>
      )}
      
      {active && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-yellow-500 text-black flex items-center justify-center text-[10px] font-black shadow-lg animate-in zoom-in duration-300">
           ✓
        </div>
      )}
    </div>
  );
};

export type HubTab = 'PROFILE' | 'CUSTOMIZE' | 'SETTINGS';

interface UserHubProps {
  initialTab?: HubTab;
  onClose: () => void;
  profile: UserProfile | null;
  isGuest?: boolean;
  onRefreshProfile?: () => void;
  currentSleeve?: CardCoverStyle;
  onEquipSleeve?: (style: CardCoverStyle) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  playerAvatar: string;
  setPlayerAvatar: (avatar: string) => void;
  currentTheme?: BackgroundTheme;
  onChangeTheme?: (theme: BackgroundTheme) => void;
  soundEnabled?: boolean;
  setSoundEnabled?: (val: boolean) => void;
  isSinglePlayer?: boolean;
  spQuickFinish?: boolean;
  setSpQuickFinish?: (val: boolean) => void;
  currentDifficulty?: AiDifficulty;
  onChangeDifficulty?: (d: AiDifficulty) => void;
  onExitGame?: () => void;
  onSignOut: () => void;
  onOpenStore?: (tab?: 'SLEEVES' | 'AVATARS' | 'BOARDS') => void;
}

const StatBox: React.FC<{ label: string; value: string | number; icon: string; highlight?: boolean }> = ({ label, value, icon, highlight }) => (
  <div className={`relative bg-white/[0.03] border border-white/5 p-4 rounded-2xl transition-all hover:bg-white/[0.06] ${highlight ? 'ring-1 ring-yellow-500/20' : ''}`}>
    <div className="absolute top-2 right-3 text-lg opacity-10">{icon}</div>
    <p className="text-[7px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">{label}</p>
    <p className={`text-xl sm:text-2xl font-black tracking-tighter ${highlight ? 'text-yellow-500' : 'text-white'}`}>{value}</p>
  </div>
);

export const UserHub: React.FC<UserHubProps> = ({
  onClose,
  profile,
  playerName,
  setPlayerName,
  playerAvatar,
  setPlayerAvatar,
  onSignOut,
  onRefreshProfile,
  isGuest
}) => {
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<{ id: string, name: string, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD' } | null>(null);
  const [awardItem, setAwardItem] = useState<{ id: string, name: string, type: 'SLEEVE' | 'AVATAR' | 'BOARD' } | null>(null);

  if (!profile) return null;

  const currentLevel = calculateLevel(profile.xp);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const curLevelXpFloor = getXpForLevel(currentLevel);
  const rangeTotal = Math.max(1, nextLevelXp - curLevelXpFloor);
  const progress = Math.min(100, Math.max(0, ((profile.xp - curLevelXpFloor) / rangeTotal) * 100));

  const wins = profile.wins || 0;
  const games = profile.games_played || 0;
  const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : "0.0";

  const isAvatarUnlocked = (emoji: string) => profile?.unlocked_avatars?.includes(emoji) || DEFAULT_AVATARS.includes(emoji);

  const handlePurchaseAttempt = (emoji: string) => {
    if (profile.coins < 250) return;
    setPendingPurchase({ id: emoji, name: getAvatarName(emoji), price: 250, type: 'AVATAR' });
  };

  const executePurchase = async () => {
    if (!pendingPurchase || buying) return;
    setBuying(pendingPurchase.id);
    try {
      await buyItem(profile.id, pendingPurchase.price, pendingPurchase.id, pendingPurchase.type, !!isGuest);
      audioService.playPurchase();
      setAwardItem({ id: pendingPurchase.id, name: pendingPurchase.name, type: pendingPurchase.type });
      setPendingPurchase(null);
      onRefreshProfile?.();
    } catch (err) {
      console.error(err);
    } finally {
      setBuying(null);
    }
  };

  const allPossibleAvatars = [...DEFAULT_AVATARS, ...PREMIUM_AVATARS];
  const visibleAvatars = isCatalogExpanded ? allPossibleAvatars : allPossibleAvatars.slice(0, 10);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      
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
                      <div className="text-9xl drop-shadow-[0_0_40px_rgba(234,179,8,0.5)]">{awardItem.id}</div>
                  </div>
                  <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-yellow-200 to-yellow-500 uppercase tracking-tighter italic animate-award-text">ASSET SECURED</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500 mt-4 animate-award-text [animation-delay:0.2s]">{awardItem.name} • UNLOCKED</p>
                  <button onClick={() => setAwardItem(null)} className="mt-12 px-12 py-4 rounded-full bg-white text-black font-black uppercase tracking-[0.3em] text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl animate-award-text [animation-delay:0.4s]">DEPLOY ASSET</button>
              </div>
          </div>
      )}

      <div className="relative bg-[#050505] border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Compact Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex justify-between items-center relative">
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/30 uppercase italic tracking-widest font-serif leading-none">PLAYER DOSSIER</h2>
            <div className="flex items-center gap-2 mt-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
               <p className="text-[7px] font-black uppercase tracking-[0.4em] text-gray-500">Security Clearance Level A</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 group border border-red-500/20">
            <span className="text-lg font-black group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>

        {/* Condensed Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 sm:space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          
          {/* Identity & Rank Section - More compact for mobile */}
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="relative shrink-0">
                <div className="absolute inset-[-10px] bg-yellow-500/10 blur-[20px] rounded-full"></div>
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/40 border-2 border-yellow-500/20 flex items-center justify-center text-5xl sm:text-6xl shadow-inner group-hover:scale-105 transition-transform duration-500">
                    {playerAvatar}
                </div>
            </div>
            
            <div className="flex-1 w-full space-y-3 sm:space-y-4">
                <div className="space-y-1">
                    <p className="text-[7px] font-black uppercase tracking-[0.4em] text-yellow-500/40 text-center sm:text-left">Operator Handle</p>
                    <input 
                      type="text" 
                      value={playerName} 
                      onChange={e => setPlayerName(e.target.value.toUpperCase())} 
                      maxLength={12} 
                      className="w-full bg-black/40 border border-white/5 px-4 py-2 rounded-xl text-white font-black uppercase tracking-widest text-lg sm:text-xl text-center sm:text-left focus:border-yellow-500/30 outline-none transition-all shadow-inner" 
                    />
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.3em]">Mastery Level {currentLevel}</span>
                        <span className="text-[7px] font-black text-yellow-500/60 uppercase tracking-widest">{nextLevelXp - profile.xp} XP TO ASCEND</span>
                    </div>
                    <div className="relative h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-200 transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>
          </div>

          {/* Signature Archive - Grid Selection - Reduced Spacing */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 whitespace-nowrap">Signature Archive</span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {visibleAvatars.map(a => {
                const unlocked = isAvatarUnlocked(a);
                const active = playerAvatar === a;
                return (
                  <button 
                    key={a} 
                    title={getAvatarName(a)}
                    onClick={() => unlocked ? setPlayerAvatar(a) : handlePurchaseAttempt(a)} 
                    className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${active ? 'bg-yellow-500/20 ring-2 ring-yellow-500 scale-110' : unlocked ? 'bg-white/5 hover:bg-white/10' : 'opacity-20 grayscale hover:opacity-40'}`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
            
            {/* ENHANCED ICON TOGGLE BUTTON - REDUCED TOP PADDING */}
            <div className="flex flex-col items-center pt-1">
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
                <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/20 mt-1">
                    {isCatalogExpanded ? "MINIMIZE" : "EXPAND"}
                </span>
            </div>
          </div>

          {/* Tactical Analytics - Compact grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 whitespace-nowrap">Tactical Analytics</span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <StatBox label="Victories" value={wins} icon="🏆" />
                <StatBox label="Sorties" value={games} icon="⚔️" />
                <StatBox label="Win Factor" value={`${winRate}%`} icon="📈" highlight />
                <StatBox label="Currency" value={profile.coins.toLocaleString()} icon="💰" highlight />
            </div>
          </div>

          <SignOutButton onSignOut={onSignOut} className="!py-4 w-full" />
        </div>

        {/* Minimal Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-black/40 flex justify-between items-center opacity-40">
            <span className="text-[6px] font-black text-white/40 uppercase tracking-[0.5em]">COMMAND CORE v1.9 // SECURE CHANNEL</span>
            <div className="flex gap-2">
                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                <div className="w-1 h-1 rounded-full bg-white/20"></div>
            </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
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
