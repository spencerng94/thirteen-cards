
import React, { useState, useEffect } from 'react';
import { Card, CardCoverStyle } from './Card';
import { UserProfile, BackgroundTheme } from '../types';
import { buyItem, DEFAULT_AVATARS, PREMIUM_AVATARS, getAvatarName } from '../services/supabase';
import { PREMIUM_BOARDS, BoardPreview, BoardSurface } from './UserHub';
import { audioService } from '../services/audio';

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
}

const SLEEVES: StoreItem[] = [
  { id: 'BLUE', name: 'Imperial Blue', price: 0, type: 'SLEEVE', style: 'BLUE', description: 'Standard navy finish.' },
  { id: 'RED', name: 'Dynasty Red', price: 0, type: 'SLEEVE', style: 'RED', description: 'Lustrous red finish.' },
  { id: 'PATTERN', name: 'Golden Lattice', price: 250, type: 'SLEEVE', style: 'PATTERN', description: 'Traditional geometric.' },
  { id: 'ROYAL_JADE', name: 'Imperial Jade', price: 500, type: 'SLEEVE', style: 'ROYAL_JADE', description: 'Polished emerald marble.' },
  { id: 'CRYSTAL_EMERALD', name: 'Crystal Gem', price: 1500, type: 'SLEEVE', style: 'CRYSTAL_EMERALD', description: 'Prismatic diffraction.' },
  { id: 'GOLDEN_IMPERIAL', name: 'Sun King', price: 1000, type: 'SLEEVE', style: 'GOLDEN_IMPERIAL', description: '24-karat polished gold.' },
  { id: 'VOID_ONYX', name: 'Void Walker', price: 2000, type: 'SLEEVE', style: 'VOID_ONYX', description: 'Matte black violet neon.' },
  { id: 'DRAGON_SCALE', name: 'Dragon Skin', price: 2500, type: 'SLEEVE', style: 'DRAGON_SCALE', description: 'Ancient high-heat plating.' },
  { id: 'NEON_CYBER', name: 'Neon Circuit', price: 3500, type: 'SLEEVE', style: 'NEON_CYBER', description: 'Active energetic circuitry.' },
  { id: 'PIXEL_CITY_LIGHTS', name: 'Pixel City Lights', price: 3500, type: 'SLEEVE', style: 'PIXEL_CITY_LIGHTS', description: 'Nocturnal pixel glow.' },
  { id: 'AMETHYST_ROYAL', name: 'Royal Amethyst', price: 4500, type: 'SLEEVE', style: 'AMETHYST_ROYAL', description: 'Velvet silk with silver filigree.' },
  { id: 'CHERRY_BLOSSOM_NOIR', name: 'Sakura Noir', price: 5000, type: 'SLEEVE', style: 'CHERRY_BLOSSOM_NOIR', description: 'Obsidian wood with glowing blossoms.' },
];

const DummyTablePreview: React.FC<{ themeId: BackgroundTheme; onClose: () => void }> = ({ themeId, onClose }) => {
  const theme = PREMIUM_BOARDS.find(b => b.id === themeId) || PREMIUM_BOARDS[0];
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden" onClick={onClose}>
      <BoardSurface themeId={themeId} />

      <div className="relative z-10 w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Top Bar Navigation */}
        <div className="p-8 flex justify-between items-start">
            <div className="flex flex-col">
              <h1 className="text-4xl font-black text-white tracking-[0.2em] drop-shadow-[0_0_30px_rgba(0,0,0,0.5)] font-serif uppercase italic">ARENA PREVIEW</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.6em] drop-shadow-md">{theme.name} Terrain Profile</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="px-10 py-5 rounded-2xl bg-red-600/90 text-white font-black uppercase tracking-[0.4em] text-xs shadow-2xl transition-all hover:bg-red-500 hover:scale-105 active:scale-95 border border-white/20"
            >
              EXIT PREVIEW ✕
            </button>
        </div>

        {/* Scaled Dummy Hand for context */}
        <div className="mt-auto p-12 flex flex-col items-center gap-6 bg-gradient-to-t from-black/40 to-transparent">
            <div className="flex -space-x-12 opacity-50 grayscale-[0.2] scale-90">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="transform hover:-translate-y-4 transition-transform duration-300">
                      <Card faceDown coverStyle="GOLDEN_IMPERIAL" />
                    </div>
                ))}
            </div>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.8em]">Tactical Interface Simulated</p>
        </div>
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
  const [density, setDensity] = useState<1 | 2 | 4>(2);
  const [hideOwned, setHideOwned] = useState(false);
  
  // Purchase states
  const [pendingPurchase, setPendingPurchase] = useState<{ id: string, name: string, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD', style?: CardCoverStyle } | null>(null);
  const [awardItem, setAwardItem] = useState<{ id: string, name: string, type: 'SLEEVE' | 'AVATAR' | 'BOARD', style?: CardCoverStyle } | null>(null);

  useEffect(() => { setActiveTab(initialTab as any); }, [initialTab]);

  const isUnlockedSleeve = (itemId: string) => profile?.unlocked_sleeves.includes(itemId) || SLEEVES.find(s => s.id === itemId)?.price === 0;
  const isUnlockedAvatar = (avatar: string) => profile?.unlocked_avatars?.includes(avatar) || DEFAULT_AVATARS.includes(avatar);
  const isUnlockedBoard = (id: string) => profile?.unlocked_boards.includes(id) || PREMIUM_BOARDS.find(b => b.id === id)?.price === 0;

  const handlePurchaseAttempt = (item: any, isAvatar: boolean = false, isBoard: boolean = false) => {
    if (!profile) return;
    const id = isAvatar ? item : item.id;
    const price = isAvatar ? 250 : item.price;
    const type = isAvatar ? 'AVATAR' : isBoard ? 'BOARD' : 'SLEEVE';
    
    if (profile.coins < price) return;

    setPendingPurchase({
      id,
      name: isAvatar ? getAvatarName(id) : item.name,
      price,
      type,
      style: isAvatar ? undefined : item.style
    });
  };

  const executePurchase = async () => {
    if (!pendingPurchase || !profile || buying) return;
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
    const itemName = isAvatar ? getAvatarName(item) : item.name;
    
    let isEquipped = false;
    if (isAvatar) isEquipped = playerAvatar === item;
    else if (isBoard) isEquipped = currentTheme === item.id;
    else isEquipped = currentSleeve === item.style;

    const cardPadding = density === 4 ? 'p-2 sm:p-3' : density === 2 ? 'p-4 sm:p-6' : 'p-8 sm:p-10';
    const visualSize = density === 4 ? 'scale-[0.8]' : density === 2 ? 'scale-100' : 'scale-110';
    const nameSize = density === 4 ? 'text-[7px]' : 'text-[9px] sm:text-[10px]';

    return (
      <div key={id} className={`relative group bg-white/[0.02] border border-white/5 rounded-[2rem] ${cardPadding} flex flex-col items-center gap-1 sm:gap-3 transition-all hover:bg-white/[0.04] hover:border-yellow-500/20 shadow-xl`}>
        <div className="absolute top-2.5 right-2.5 z-10">
          {!unlocked ? (
            <div className={`flex items-center gap-1 bg-black/40 ${density === 4 ? 'px-1 py-0.5' : 'px-1.5 py-0.5'} rounded-full border border-yellow-500/20 shadow-lg backdrop-blur-sm`}>
              <span className={density === 4 ? 'text-[6px]' : 'text-[8px]'}>💰</span>
              <span className={`font-black tracking-tighter ${canAfford ? 'text-yellow-500' : 'text-gray-600'} ${density === 4 ? 'text-[6px]' : 'text-[8px]'}`}>{price}</span>
            </div>
          ) : isEquipped ? (
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[7px] sm:text-[8px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.5)]">✓</div>
          ) : (
            <div onClick={(e) => { e.stopPropagation(); if (isAvatar) onEquipAvatar(item); else if (isBoard) onEquipBoard(item.id); else onEquipSleeve(item.style); }} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white/20 bg-transparent hover:border-white/50 cursor-pointer transition-colors"></div>
          )}
        </div>

        <div className={`py-1 sm:py-3 flex-1 flex flex-col items-center justify-center w-full transition-transform duration-300 ${visualSize}`}>
          {isAvatar ? <div className="text-4xl sm:text-6xl group-hover:scale-125 transition-transform duration-500">{item}</div> : 
           isBoard ? <div className="w-full cursor-pointer" onClick={() => setPreviewThemeId(item.id)}>
             {/* Pass hideActiveMarker to prevent redundant yellow and green checkboxes in store */}
             <BoardPreview themeId={item.id} unlocked={unlocked} active={isEquipped} hideActiveMarker={true} />
           </div> :
           <Card faceDown coverStyle={item.style} className={`${density === 4 ? '!w-12 !h-18 sm:!w-14 sm:!h-20' : '!w-24 !h-36'} shadow-2xl group-hover:scale-110 transition-transform`} />}
        </div>

        <span className={`${nameSize} font-black uppercase text-center tracking-widest text-white/50 truncate w-full px-1 mb-1 group-hover:text-yellow-500/80 transition-colors`}>
            {itemName}
        </span>

        <div className="w-full mt-auto">
          <button
            onClick={() => unlocked ? (isAvatar ? onEquipAvatar(item) : isBoard ? onEquipBoard(item.id) : onEquipSleeve(item.style)) : handlePurchaseAttempt(item, isAvatar, isBoard)}
            disabled={(isEquipped) || (!unlocked && !canAfford) || buying === id}
            className={`w-full py-2 rounded-xl font-black uppercase ${density === 4 ? 'text-[7px]' : 'text-[8px] sm:text-[9px]'} tracking-[0.15em] transition-all ${isEquipped ? 'bg-emerald-600 text-white shadow-lg' : unlocked ? 'bg-white/5 text-white/80 hover:bg-white/10' : canAfford ? 'bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 text-black shadow-lg' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
          >
            {buying === id ? '...' : isEquipped ? 'Active' : unlocked ? 'Equip' : 'Buy'}
          </button>
        </div>
      </div>
    );
  };

  const gridClass = activeTab === 'AVATARS' && density === 4 ? 'grid-cols-3' : density === 1 ? 'grid-cols-1' : density === 2 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      {previewThemeId && <DummyTablePreview themeId={previewThemeId} onClose={() => setPreviewThemeId(null)} />}
      
      {/* PURCHASE CONFIRMATION MODAL */}
      {pendingPurchase && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200">
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
                        disabled={buying === pendingPurchase.id}
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
              
              <div className="relative flex flex-col items-center text-center max-sm:px-4">
                  <div className="absolute inset-0 bg-yellow-500/10 blur-[120px] animate-pulse"></div>
                  
                  <div className="relative mb-10 animate-award-pop">
                      {awardItem.type === 'AVATAR' ? (
                          <div className="text-9xl drop-shadow-[0_0_40px_rgba(234,179,8,0.5)]">{awardItem.id}</div>
                      ) : awardItem.type === 'SLEEVE' ? (
                          <div className="relative">
                            <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full scale-150"></div>
                            <Card faceDown coverStyle={awardItem.style} className="!w-40 !h-60 shadow-[0_40px_80px_rgba(0,0,0,1)] ring-2 ring-yellow-500/50" />
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
            <h2 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/40 uppercase tracking-tighter italic font-serif leading-none">XIII SHOP</h2>
            <p className="text-[8px] sm:text-[9px] font-black tracking-[0.6em] sm:tracking-[0.8em] text-gray-600 mt-1 sm:mt-2 uppercase">UP YOUR GAME</p>
          </div>

          <div className="flex flex-col items-center gap-2 sm:gap-4 mt-3 sm:mt-5 w-full">
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/60 rounded-full border border-white/10 w-full max-w-sm sm:max-w-md shadow-inner">
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

               <button 
                 onClick={() => setHideOwned(!hideOwned)} 
                 className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2 group cursor-pointer"
               >
                 <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest transition-colors ${hideOwned ? 'text-yellow-500' : 'text-white/30'} whitespace-nowrap`}>Owned</span>
                 <div className={`w-8 h-4 sm:w-10 sm:h-5 rounded-full relative transition-all duration-500 ${hideOwned ? 'bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-white/5 border border-white/10'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-500 ease-out ${hideOwned ? 'translate-x-4 sm:translate-x-5 bg-white' : 'translate-x-0.5 bg-white/20'}`}></div>
                 </div>
               </button>
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
