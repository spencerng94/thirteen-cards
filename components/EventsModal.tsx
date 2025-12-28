
import React, { useState, useMemo } from 'react';
import { UserProfile } from '../types';
/* Fix: Import CardCoverStyle from Card.tsx instead of types.ts */
import { CardCoverStyle } from './Card';
import { updateProfileSettings, fetchGuestProfile } from '../services/supabase';
import { audioService } from '../services/audio';

interface EventsModalProps {
  onClose: () => void;
  profile: UserProfile;
  onRefreshProfile: () => void;
  isGuest?: boolean;
}

interface GameEvent {
  id: string;
  title: string;
  description: string;
  reward: { type: 'XP' | 'GOLD' | 'SLEEVE'; value: number | string };
  target: number;
  current: number;
}

export const EventsModal: React.FC<EventsModalProps> = ({ onClose, profile, onRefreshProfile, isGuest }) => {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'NEW_PLAYER'>('DAILY');
  const [notification, setNotification] = useState<string | null>(null);

  // Check if player is within first 90 days
  const isNewPlayer = useMemo(() => {
    if (!profile.created_at) return true;
    const created = new Date(profile.created_at).getTime();
    const now = Date.now();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    return now - created < ninetyDays;
  }, [profile.created_at]);

  const dailyEvents: GameEvent[] = useMemo(() => [
    {
      id: 'daily_login',
      title: 'DAILY LOGIN',
      description: 'Establish arena connection today.',
      reward: { type: 'XP', value: 10 },
      target: 1,
      current: 1 // Always 1 if they are seeing this
    },
    {
      id: 'daily_play',
      title: 'PLAY 1 GAME',
      description: 'Complete 1 full match in the arena.',
      reward: { type: 'GOLD', value: 10 },
      target: 1,
      current: profile.event_stats?.daily_games_played || 0
    },
    {
      id: 'daily_win',
      title: 'WIN 1 GAME',
      description: 'Secure 1st place in any match.',
      reward: { type: 'GOLD', value: 20 },
      target: 1,
      current: profile.event_stats?.daily_wins || 0
    }
  ], [profile.event_stats]);

  const newPlayerEvents: GameEvent[] = useMemo(() => {
    const days = [
      { id: 'np_1', val: 100 },
      { id: 'np_2', val: 200 },
      { id: 'np_3', val: 300 },
      { id: 'np_4', val: 400 },
      { id: 'np_5', val: 500 },
      { id: 'np_6', val: 600 },
    ];
    
    /* Fix: Explicitly type base as GameEvent[] to prevent strict type inference of reward.type as "GOLD" on line 86 */
    const base: GameEvent[] = days.map((d, i) => ({
      id: d.id,
      title: `Arrival Day ${i + 1}`,
      description: 'Consecutive login reward.',
      reward: { type: 'GOLD' as const, value: d.val },
      target: i + 1,
      current: profile.event_stats?.new_player_login_days || 1
    }));

    base.push({
      id: 'np_7',
      title: 'Elite Ascension (Day 7)',
      description: 'Final arrival reward. Includes Royal Amethyst Signature.',
      reward: { type: 'SLEEVE', value: 'AMETHYST_ROYAL' },
      target: 7,
      current: profile.event_stats?.new_player_login_days || 1
    });

    return base;
  }, [profile.event_stats]);

  const handleClaim = async (event: GameEvent) => {
    if (profile.event_stats?.claimed_events?.includes(event.id)) return;
    
    audioService.playPurchase();
    
    let updates: Partial<UserProfile> = {
      event_stats: {
        ...(profile.event_stats || { daily_games_played: 0, daily_wins: 0, new_player_login_days: 1 }),
        claimed_events: [...(profile.event_stats?.claimed_events || []), event.id]
      }
    };

    if (event.reward.type === 'XP') {
      updates.xp = (profile.xp || 0) + (event.reward.value as number);
    } else if (event.reward.type === 'GOLD') {
      updates.coins = (profile.coins || 0) + (event.reward.value as number);
    } else if (event.reward.type === 'SLEEVE') {
      const sleeveId = event.reward.value as string;
      if (profile.unlocked_sleeves.includes(sleeveId)) {
        updates.coins = (profile.coins || 0) + 1500;
        setNotification("Sleeve 'Royal Amethyst' already owned. Converted to 1,500 Gold.");
      } else {
        updates.unlocked_sleeves = [...profile.unlocked_sleeves, sleeveId];
        updates.coins = (profile.coins || 0) + 1300;
      }
    }

    await updateProfileSettings(profile.id || 'guest', updates);
    onRefreshProfile();
    if (!notification && event.reward.type !== 'SLEEVE') {
        setNotification(`Protocol Success: Claimed ${event.reward.value} ${event.reward.type}`);
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const renderEventItem = (event: GameEvent) => {
    const isClaimed = profile.event_stats?.claimed_events?.includes(event.id);
    const isReady = event.current >= event.target;
    
    return (
      <div key={event.id} className={`p-5 rounded-3xl border transition-all ${isClaimed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'}`}>
        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest">{event.title}</h4>
              {isClaimed && <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Claimed</span>}
            </div>
            <p className="text-[9px] text-gray-500 font-medium uppercase tracking-tight">{event.description}</p>
          </div>
          
          <div className="flex flex-col items-end gap-3 shrink-0">
             <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/5">
                <span className="text-[9px] font-black text-yellow-500 tracking-tighter">
                   {event.reward.type === 'XP' ? '🎖️' : '💰'} {event.reward.type === 'SLEEVE' ? 'AMETHYST' : event.reward.value}
                </span>
             </div>
             
             <button 
               onClick={() => handleClaim(event)}
               disabled={isClaimed || !isReady}
               className={`flex items-center justify-center rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${isClaimed ? 'w-10 h-10 bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' : isReady ? 'px-6 py-1.5 bg-emerald-600 text-white shadow-lg active:scale-95' : 'px-6 py-1.5 bg-white/5 text-white/30 border border-white/5'}`}
             >
               {isClaimed ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
               ) : isReady ? 'CLAIM' : `${event.current}/${event.target}`}
             </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      
      {notification && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[400] px-6 py-3 bg-emerald-600 border border-emerald-400 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-2xl animate-in slide-in-from-top-4">
              {notification}
          </div>
      )}

      <div className="relative bg-[#050505] border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/40 uppercase italic tracking-tighter leading-none">THIRTEEN EVENTS</h2>
            <p className="text-[8px] font-black uppercase tracking-[0.6em] text-emerald-500 mt-2">Active Strategic Tasks</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white transition-all group flex items-center justify-center shadow-xl active:scale-90">
            <span className="text-xl group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-8 pt-4 flex gap-4 border-b border-white/5">
            <button 
              onClick={() => setActiveTab('DAILY')}
              className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'DAILY' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
            >
              DAILY EVENTS
              {activeTab === 'DAILY' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>}
            </button>
            {isNewPlayer && (
              <button 
                onClick={() => setActiveTab('NEW_PLAYER')}
                className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'NEW_PLAYER' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
              >
                NEW PLAYER EVENT
                {activeTab === 'NEW_PLAYER' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-500 shadow-[0_0_10px_#eab308]"></div>}
              </button>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {activeTab === 'DAILY' ? dailyEvents.map(renderEventItem) : newPlayerEvents.map(renderEventItem)}
            
            <div className="pt-8 text-center">
                <p className="text-[8px] font-bold text-white/10 uppercase tracking-[0.4em]">Strategic updates refresh every 24 cycles</p>
            </div>
        </div>

        <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center">
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[7px] font-black text-emerald-500/60 uppercase tracking-widest">Protocol Active</span>
            </div>
        </div>
      </div>
    </div>
  );
};
