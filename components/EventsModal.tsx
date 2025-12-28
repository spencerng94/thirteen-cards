
import React, { useState, useMemo } from 'react';
import { UserProfile } from '../types';
import { CardCoverStyle } from './Card';
import { updateProfileSettings } from '../services/supabase';
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

const DailyBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-[#020a06]"></div>
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-teal-500/5 blur-[100px] rounded-full"></div>
    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent h-[200%] animate-[scanline_8s_linear_infinite]"></div>
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes scanline {
        from { transform: translateY(-50%); }
        to { transform: translateY(50%); }
      }
    `}} />
  </div>
);

const WeeklyBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-[#02040a]"></div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_70%)] animate-pulse"></div>
    <div className="absolute inset-0 opacity-[0.1] mix-blend-screen overflow-hidden">
       <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[repeating-conic-gradient(from_0deg,transparent_0deg,transparent_10deg,rgba(59,130,246,0.1)_10deg,rgba(59,130,246,0.1)_11deg)] animate-[spin_60s_linear_infinite]"></div>
    </div>
    {Array.from({ length: 15 }).map((_, i) => (
      <div 
        key={i}
        className="absolute w-[1px] h-12 bg-blue-500/40 animate-[weekly-scan_4s_linear_infinite]"
        style={{
          left: `${Math.random() * 100}%`,
          top: '-10%',
          animationDelay: `${Math.random() * 4}s`,
          opacity: 0.3
        }}
      />
    ))}
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes weekly-scan {
        0% { transform: translateY(0); opacity: 0; }
        10% { opacity: 0.6; }
        90% { opacity: 0.6; }
        100% { transform: translateY(120vh); opacity: 0; }
      }
    `}} />
  </div>
);

const NewPlayerBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-[#0a0802]"></div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.1)_0%,transparent_70%)] animate-pulse"></div>
    <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[40%] bg-yellow-500/10 blur-[100px] rounded-[100%]"></div>
    {Array.from({ length: 12 }).map((_, i) => (
      <div 
        key={i}
        className="absolute w-1 h-1 bg-yellow-400 rounded-full blur-[1px] animate-[float-sparkle_4s_ease-in-out_infinite]"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          opacity: 0.2
        }}
      />
    ))}
    <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes float-sparkle {
        0%, 100% { transform: translateY(0) scale(1); opacity: 0.1; }
        50% { transform: translateY(-20px) scale(1.5); opacity: 0.4; }
      }
    `}} />
  </div>
);

export const EventsModal: React.FC<EventsModalProps> = ({ onClose, profile, onRefreshProfile, isGuest }) => {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY' | 'NEW_PLAYER'>('DAILY');
  const [notification, setNotification] = useState<string | null>(null);

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
      current: 1
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

  const weeklyEvents: GameEvent[] = useMemo(() => [
    {
      id: 'weekly_bombs',
      title: 'PLAY 3 BOMBS',
      description: 'Deploy 3 bombs or quads during active play.',
      reward: { type: 'XP', value: 30 },
      target: 3,
      current: profile.event_stats?.weekly_bombs_played || 0
    },
    {
      id: 'weekly_play',
      title: 'PLAY 13 GAMES',
      description: 'Accumulate 13 match deployments.',
      reward: { type: 'GOLD', value: 30 },
      target: 13,
      current: profile.event_stats?.weekly_games_played || 0
    },
    {
      id: 'weekly_win',
      title: 'WIN 13 GAMES',
      description: 'Achieve 13 supreme victories.',
      reward: { type: 'GOLD', value: 60 },
      target: 13,
      current: profile.event_stats?.weekly_wins || 0
    }
  ], [profile.event_stats]);

  const newPlayerEvents: GameEvent[] = useMemo(() => {
    const days = [
      { id: 'np_1', val: 100 }, { id: 'np_2', val: 200 }, { id: 'np_3', val: 300 },
      { id: 'np_4', val: 400 }, { id: 'np_5', val: 500 }, { id: 'np_6', val: 600 },
    ];
    const base: GameEvent[] = days.map((d, i) => ({
      id: d.id,
      title: `ARRIVAL DAY ${i + 1}`,
      description: 'Consecutive login reward.',
      reward: { type: 'GOLD' as const, value: d.val },
      target: i + 1,
      current: profile.event_stats?.new_player_login_days || 1
    }));
    base.push({
      id: 'np_7',
      title: 'ELITE ASCENSION (DAY 7)',
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
        setNotification(`EVENT SUCCESSFULLY REDEEMED: ${event.reward.value} ${event.reward.type}`);
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const renderEventItem = (event: GameEvent) => {
    const isClaimed = profile.event_stats?.claimed_events?.includes(event.id);
    const isReady = event.current >= event.target;
    const accentColor = activeTab === 'DAILY' ? 'emerald' : activeTab === 'WEEKLY' ? 'blue' : 'yellow';
    
    return (
      <div key={event.id} className={`p-6 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden group ${isClaimed ? `bg-${accentColor}-500/5 border-${accentColor}-500/20 opacity-70` : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20'}`}>
        <div className="relative z-10 flex justify-between items-center gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-[12px] font-black text-white uppercase tracking-widest">{event.title}</h4>
              {isClaimed && <span className={`text-[8px] font-bold text-${accentColor}-500 uppercase tracking-tighter bg-${accentColor}-500/10 px-2 py-0.5 rounded-full border border-${accentColor}-500/20`}>Redeemed</span>}
            </div>
            <p className="text-[9px] text-white/40 font-medium uppercase tracking-widest">{event.description}</p>
          </div>
          
          <div className="flex flex-col items-end gap-3 shrink-0">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 rounded-full border border-white/5 shadow-inner">
                <span className={`text-[10px] font-black text-${accentColor}-500 tracking-tighter`}>
                   {event.reward.type === 'XP' ? '🎖️' : '💰'} {event.reward.type === 'SLEEVE' ? 'AMETHYST' : event.reward.value}
                </span>
             </div>
             
             <button 
               onClick={() => handleClaim(event)}
               disabled={isClaimed || !isReady}
               className={`flex items-center justify-center rounded-xl transition-all duration-300 ${isClaimed ? `w-10 h-10 bg-${accentColor}-600/20 text-${accentColor}-500 border border-${accentColor}-500/30` : isReady ? `px-8 py-2 bg-${accentColor}-600 text-white shadow-[0_0_20px_rgba(0,0,0,0.3)] active:scale-95 text-[9px] font-black uppercase tracking-widest` : 'px-8 py-2 bg-white/5 text-white/20 border border-white/5 text-[9px] font-black uppercase tracking-widest'}`}
             >
               {isClaimed ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
               ) : isReady ? 'REDEEM' : `${event.current}/${event.target}`}
             </button>
          </div>
        </div>
        {/* Subtle hover glow */}
        <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${accentColor}-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000`}></div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      
      {notification && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[400] px-8 py-4 bg-emerald-600 border-2 border-emerald-400 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-6 duration-500">
              {notification}
          </div>
      )}

      <div className="relative border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[3.5rem] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Background Layer */}
        {activeTab === 'DAILY' ? <DailyBackground /> : activeTab === 'WEEKLY' ? <WeeklyBackground /> : <NewPlayerBackground />}

        {/* Header */}
        <div className="relative z-10 p-10 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex justify-between items-start">
          <div className="flex flex-col">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/40 uppercase italic tracking-tighter leading-none">THIRTEEN EVENTS</h2>
            <div className="flex items-center gap-3 mt-3">
               <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'DAILY' ? 'bg-emerald-500 animate-pulse' : activeTab === 'WEEKLY' ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-yellow-500 shadow-[0_0_10px_#eab308]'}`}></div>
               <p className={`text-[9px] font-black uppercase tracking-[0.5em] ${activeTab === 'DAILY' ? 'text-emerald-500' : activeTab === 'WEEKLY' ? 'text-blue-500' : 'text-yellow-500'}`}>Current Game Events</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/[0.03] hover:bg-red-600/20 border border-white/10 text-gray-400 hover:text-white transition-all group flex items-center justify-center shadow-xl active:scale-90">
            <span className="text-2xl group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="relative z-10 px-10 pt-6 flex gap-8 border-b border-white/5">
            <button 
              onClick={() => setActiveTab('DAILY')}
              className={`pb-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'DAILY' ? 'text-emerald-400' : 'text-gray-600 hover:text-gray-400'}`}
            >
              DAILY EVENTS
              {activeTab === 'DAILY' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_15px_#10b981] rounded-t-full"></div>}
            </button>
            <button 
              onClick={() => setActiveTab('WEEKLY')}
              className={`pb-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'WEEKLY' ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}
            >
              WEEKLY EVENTS
              {activeTab === 'WEEKLY' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_#3b82f6] rounded-t-full"></div>}
            </button>
            {isNewPlayer && (
              <button 
                onClick={() => setActiveTab('NEW_PLAYER')}
                className={`pb-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'NEW_PLAYER' ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
              >
                NEW PLAYER EVENT
                {activeTab === 'NEW_PLAYER' && <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500 shadow-[0_0_15px_#eab308] rounded-t-full"></div>}
              </button>
            )}
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto p-10 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-5">
               {activeTab === 'DAILY' ? dailyEvents.map(renderEventItem) : activeTab === 'WEEKLY' ? weeklyEvents.map(renderEventItem) : newPlayerEvents.map(renderEventItem)}
            </div>
            
            <div className="pt-12 text-center pb-4 opacity-20">
                <span className="text-[8px] font-black text-white uppercase tracking-[0.8em]">Operational cycle active</span>
            </div>
        </div>

        <div className="relative z-10 p-6 bg-black/40 border-t border-white/5">
            {/* Minimal footer space */}
        </div>
      </div>
    </div>
  );
};
