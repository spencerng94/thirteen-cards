
import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';
import { UserProfile } from '../types';
import { buyItem, DEFAULT_AVATARS, PREMIUM_AVATARS } from '../services/supabase';

interface StoreProps {
  onClose: () => void;
  profile: UserProfile | null;
  onRefreshProfile: () => void;
  onEquipSleeve: (sleeve: CardCoverStyle) => void;
  currentSleeve: CardCoverStyle;
  playerAvatar: string;
  onEquipAvatar: (avatar: string) => void;
  isGuest?: boolean;
}

interface StoreItem {
  id: string;
  name: string;
  price: number;
  type: 'SLEEVE' | 'POWERUP' | 'AVATAR';
  style?: CardCoverStyle;
  description: string;
}

const SLEEVES: StoreItem[] = [
  { id: 'BLUE', name: 'Imperial Blue', price: 0, type: 'SLEEVE', style: 'BLUE', description: 'Standard issue navy finish.' },
  { id: 'RED', name: 'Dynasty Red', price: 0, type: 'SLEEVE', style: 'RED', description: 'Lustrous red for the bold.' },
  { id: 'PATTERN', name: 'Golden Lattice', price: 250, type: 'SLEEVE', style: 'PATTERN', description: 'Traditional geometric pattern.' },
  { id: 'ROYAL_JADE', name: 'Imperial Jade', price: 500, type: 'SLEEVE', style: 'ROYAL_JADE', description: 'Polished emerald marble.' },
  { id: 'CRYSTAL_EMERALD', name: 'Crystal Gem', price: 1500, type: 'SLEEVE', style: 'CRYSTAL_EMERALD', description: 'Prismatic diffraction.' },
  { id: 'GOLDEN_IMPERIAL', name: 'Sun King', price: 1000, type: 'SLEEVE', style: 'GOLDEN_IMPERIAL', description: '24-karat polished gold.' },
  { id: 'VOID_ONYX', name: 'Void Walker', price: 2000, type: 'SLEEVE', style: 'VOID_ONYX', description: 'Matte black with violet neon.' },
  { id: 'DRAGON_SCALE', name: 'Dragon Skin', price: 2500, type: 'SLEEVE', style: 'DRAGON_SCALE', description: 'Hardened scale plating.' },
  { id: 'NEON_CYBER', name: 'Neon Circuit', price: 3500, type: 'SLEEVE', style: 'NEON_CYBER', description: 'Active energetic core.' },
];

const POWERUPS: StoreItem[] = [
  { id: 'UNDO', name: 'Tactical Undo', price: 100, type: 'POWERUP', description: 'Rewind time for one single-player move.' },
];

export const Store: React.FC<StoreProps> = ({ onClose, profile, onRefreshProfile, onEquipSleeve, currentSleeve, playerAvatar, onEquipAvatar, isGuest }) => {
  const [activeTab, setActiveTab] = useState<'SLEEVES' | 'AVATARS' | 'POWERUPS'>('SLEEVES');
  const [buying, setBuying] = useState<string | null>(null);
  const [showGuestWarning, setShowGuestWarning] = useState<{ itemId: string, price: number, type: 'SLEEVE' | 'POWERUP' | 'AVATAR' } | null>(null);

  const handlePurchaseAttempt = (itemId: string, price: number, type: 'SLEEVE' | 'POWERUP' | 'AVATAR') => {
    if (!profile || profile.coins < price || buying) return;
    if (isGuest) {
      setShowGuestWarning({ itemId, price, type });
    } else {
      executePurchase(itemId, price, type);
    }
  };

  const executePurchase = async (itemId: string, price: number, type: 'SLEEVE' | 'POWERUP' | 'AVATAR') => {
    setBuying(itemId);
    setShowGuestWarning(null);
    try {
      await buyItem(profile!.id, price, itemId, type, !!isGuest);
      onRefreshProfile();
    } catch (err) {
      alert("Purchase failed. Insufficient funds or connection error.");
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

  const renderSleeveItem = (item: StoreItem) => {
    const unlocked = isUnlockedSleeve(item.id);
    const canAfford = (profile?.coins || 0) >= item.price;
    const isEquipped = currentSleeve === item.style;

    return (
      <div key={item.id} className="relative group bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 flex flex-col items-center gap-4 transition-all hover:bg-white/[0.05] hover:border-yellow-500/30">
        <div className="absolute top-4 right-4 z-10">
          {unlocked ? (
            <span className="text-[7px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-400/20 uppercase tracking-widest">OWNED</span>
          ) : (
            <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
              <span className="text-[10px]">💰</span>
              <span className="text-[9px] font-black text-yellow-500">{item.price}</span>
            </div>
          )}
        </div>

        <div className="py-4 perspective-1000 group-hover:scale-110 transition-transform duration-500">
          <Card faceDown coverStyle={item.style} className="!w-24 !h-36 shadow-2xl" />
        </div>

        <div className="text-center space-y-1">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">{item.name}</h3>
          <p className="text-[9px] text-white/40 leading-tight uppercase tracking-tighter max-w-[140px]">{item.description}</p>
        </div>

        <div className="w-full mt-auto pt-4">
          <button
            onClick={() => unlocked ? (item.style && onEquipSleeve(item.style)) : handlePurchaseAttempt(item.id, item.price, 'SLEEVE')}
            disabled={isEquipped || (!unlocked && !canAfford) || buying === item.id}
            className={`w-full py-2.5 rounded-xl font-black uppercase text-[9px] tracking-[0.2em] transition-all
              ${isEquipped ? 'bg-emerald-500/20 text-emerald-400' : 
                unlocked ? 'bg-white/5 text-white hover:bg-white/10 border border-white/5' : 
                canAfford ? 'bg-yellow-500 text-black hover:scale-105 shadow-lg' : 'bg-white/5 text-white/20'}
            `}
          >
            {isEquipped ? 'EQUIPPED' : unlocked ? 'EQUIP' : buying === item.id ? '...' : `BUY • ${item.price}`}
          </button>
        </div>
      </div>
    );
  };

  const renderAvatarItem = (emoji: string) => {
    const unlocked = isUnlockedAvatar(emoji);
    const price = 250;
    const canAfford = (profile?.coins || 0) >= price;
    const isEquipped = playerAvatar === emoji;

    return (
      <div key={emoji} className="relative group bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 flex flex-col items-center gap-4 transition-all hover:bg-white/[0.05] hover:border-yellow-500/30">
        <div className="text-5xl py-4 group-hover:scale-125 transition-transform duration-300 drop-shadow-xl">{emoji}</div>
        <button
            onClick={() => unlocked ? onEquipAvatar(emoji) : handlePurchaseAttempt(emoji, price, 'AVATAR')}
            disabled={isEquipped || (!unlocked && !canAfford) || buying === emoji}
            className={`w-full py-2 rounded-xl font-black uppercase text-[8px] tracking-widest transition-all
                ${isEquipped ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/20' : 
                unlocked ? 'bg-white/5 text-white/80 hover:bg-white/10' : 
                canAfford ? 'bg-yellow-500 text-black shadow-lg hover:scale-105' : 'bg-white/5 text-white/20'}
            `}
        >
            {isEquipped ? 'ACTIVE' : unlocked ? 'EQUIP' : buying === emoji ? '...' : `💰 ${price}`}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      {/* Custom Guest Warning Modal */}
      {showGuestWarning && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
              <div className="max-w-md w-full bg-[#0a0f0d] border-2 border-yellow-500/20 rounded-[3rem] p-10 text-center space-y-6 shadow-[0_0_100px_rgba(234,179,8,0.2)]">
                  <div className="text-6xl animate-bounce">⚠️</div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Security Alert</h3>
                  <p className="text-gray-400 text-xs leading-relaxed uppercase tracking-widest font-medium">
                      Commander, you are in <span className="text-yellow-500">GUEST MODE</span>. 
                      Purchased items are stored only in this browser's local cache. 
                      Proceeding means your items are <span className="text-rose-500">PERMANENTLY LOST</span> if you clear your cache.
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

      <div className="relative bg-black/60 backdrop-blur-3xl border border-white/10 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/5 pointer-events-none"></div>

        {/* Header */}
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row gap-6 justify-between items-center bg-white/[0.02]">
          <div className="flex flex-col">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase tracking-tighter">XIII STORE</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mt-1">Upgrade your arena presence</p>
          </div>

          <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/10">
            <button 
              onClick={() => setActiveTab('SLEEVES')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'SLEEVES' ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              Sleeves
            </button>
            <button 
              onClick={() => setActiveTab('AVATARS')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'AVATARS' ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              Identity
            </button>
            <button 
              onClick={() => setActiveTab('POWERUPS')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'POWERUPS' ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
            >
              Power-ups
            </button>
          </div>

          <button onClick={onClose} className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white transition-all active:scale-90">✕</button>
        </div>

        {/* Scrollable Grid */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeTab === 'SLEEVES' ? SLEEVES.map(renderSleeveItem) : 
             activeTab === 'AVATARS' ? PREMIUM_AVATARS.map(renderAvatarItem) :
             POWERUPS.map(item => (
                <div key={item.id} className="relative group bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 flex flex-col items-center gap-4 transition-all hover:bg-white/[0.05]">
                    <div className="text-5xl py-4">⚡</div>
                    <h3 className="text-sm font-black text-white uppercase">{item.name}</h3>
                    <button 
                        onClick={() => handlePurchaseAttempt(item.id, item.price, 'POWERUP')}
                        disabled={(profile?.coins || 0) < item.price || buying === item.id}
                        className="w-full py-2 bg-yellow-500 text-black rounded-xl font-black text-[8px] uppercase"
                    >
                        BUY • {item.price}
                    </button>
                </div>
             ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="text-lg">💰</span>
              <div>
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Balance</p>
                <p className="text-sm font-black text-yellow-500">{profile?.coins.toLocaleString() || 0} XIII GOLD</p>
              </div>
           </div>
           <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em]">Items are permanent unlocks linked to your ID</p>
        </div>
      </div>
    </div>
  );
};
