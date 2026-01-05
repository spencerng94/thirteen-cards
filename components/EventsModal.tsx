import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile } from '../types';
import { CardCoverStyle } from './Card';
import { updateProfileSettings, grantItem } from '../services/supabase';
import { audioService } from '../services/audio';
import { getWeeklyChallenges, getTimeUntilReset, Challenge } from '../constants/ChallengePool';

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
  reward: { type: 'XP' | 'GOLD' | 'SLEEVE' | 'BOOSTER' | 'GEMS'; value: number | string };
  target: number;
  current: number;
}

const DailyBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-[#020a06]"></div>
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse"></div>
    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
  </div>
);

const WeeklyBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-[#02040a]"></div>
    <div className="absolute inset-0 opacity-[0.1] mix-blend-screen overflow-hidden">
       <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[repeating-conic-gradient(from_0deg,transparent_0deg,transparent_10deg,rgba(59,130,246,0.1)_10deg,rgba(59,130,246,0.1)_11deg)] animate-[spin_60s_linear_infinite]"></div>
    </div>
  </div>
);

const ChallengeBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-[#0a0208]"></div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.1)_0%,transparent_70%)] animate-pulse"></div>
    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ff007f 0px, #ff007f 1px, transparent 1px, transparent 10px)', backgroundSize: '20px 20px' }}></div>
  </div>
);

export const EventsModal: React.FC<EventsModalProps> = ({ onClose, profile, onRefreshProfile, isGuest }) => {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY' | 'CHALLENGES'>('DAILY');
  const [notification, setNotification] = useState<string | null>(null);
  const [resetTime, setResetTime] = useState(getTimeUntilReset());

  useEffect(() => {
    const interval = setInterval(() => setResetTime(getTimeUntilReset()), 60000);
    return () => clearInterval(interval);
  }, []);

  const dailyEvents: GameEvent[] = useMemo(() => [
    { id: 'daily_play', title: 'PLAY 1 GAME', description: 'Complete 1 full match in the arena.', reward: { type: 'XP', value: 15 }, target: 1, current: profile.event_stats?.daily_games_played || 0 },
    { id: 'daily_win', title: 'WIN 1 GAME', description: 'Secure 1st place in any match.', reward: { type: 'BOOSTER', value: 'XP_2X_30M' }, target: 1, current: profile.event_stats?.daily_wins || 0 }
  ], [profile.event_stats]);

  const weeklyEvents: GameEvent[] = useMemo(() => [
    { id: 'weekly_bombs', title: 'DEMOLITION EXPERT', description: 'Deploy 3 bombs or quads during active play.', reward: { type: 'BOOSTER', value: 'GOLD_2X_30M' }, target: 3, current: profile.event_stats?.weekly_bombs_played || 0 },
    { id: 'weekly_play', title: 'VETERAN STATUS', description: 'Accumulate 13 match deployments.', reward: { type: 'GOLD', value: 100 }, target: 13, current: profile.event_stats?.weekly_games_played || 0 },
    { id: 'weekly_win', title: 'ARENA DOMINANCE', description: 'Achieve 13 supreme victories.', reward: { type: 'GOLD', value: 250 }, target: 13, current: profile.event_stats?.weekly_wins || 0 }
  ], [profile.event_stats]);

  const weeklyChallenges: GameEvent[] = useMemo(() => {
    const pool = getWeeklyChallenges();
    return pool.map(ch => ({
      id: ch.id,
      title: ch.title,
      description: ch.description,
      /* Fixed: Simplified reward logic as rewardType is already defined in the Challenge object */
      reward: { type: ch.rewardType as any, value: ch.rewardValue },
      target: ch.target,
      current: profile.event_stats?.weekly_challenge_progress?.[ch.id] || 0
    }));
  }, [profile.event_stats]);

  const handleClaim = async (event: GameEvent) => {
    const isClaimed = profile.event_stats?.claimed_events?.includes(event.id);
    if (isClaimed) return;
    audioService.playPurchase();
    
    let updates: Partial<UserProfile> = {
      event_stats: {
        ...(profile.event_stats || {} as any),
        claimed_events: [...(profile.event_stats?.claimed_events || []), event.id],
        ready_to_claim: (profile.event_stats?.ready_to_claim || []).filter(id => id !== event.id)
      }
    };

    if (event.reward.type === 'XP') updates.xp = (profile.xp || 0) + (event.reward.value as number);
    else if (event.reward.type === 'GOLD') updates.coins = (profile.coins || 0) + (event.reward.value as number);
    else if (event.reward.type === 'GEMS') updates.gems = (profile.gems || 0) + (event.reward.value as number);
    else await grantItem(profile.id, event.reward.value as string);

    try {
      await updateProfileSettings(profile.id || 'guest', updates);
      onRefreshProfile();
      setNotification(`CLAIMED: ${event.reward.value}`);
      setTimeout(() => setNotification(null), 3000);
    } catch (e) { console.error(e); }
  };

  const renderEventItem = (event: GameEvent) => {
    const isClaimed = profile.event_stats?.claimed_events?.includes(event.id);
    const isReady = !isClaimed && (profile.event_stats?.ready_to_claim?.includes(event.id) || event.current >= event.target);
    const progress = Math.min(100, (event.current / event.target) * 100);
    const accent = activeTab === 'DAILY' ? 'emerald' : activeTab === 'WEEKLY' ? 'blue' : 'pink';
    
    return (
      <div key={event.id} className={`p-6 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden group ${isClaimed ? 'bg-white/5 border-white/5 opacity-50' : 'bg-white/[0.02] border-white/10'}`}>
        <div className="relative z-10 flex justify-between items-center gap-6">
          <div className="flex-1 space-y-3">
            <h4 className="text-[13px] font-black text-white uppercase tracking-widest">{event.title}</h4>
            <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest leading-relaxed">{event.description}</p>
            {!isClaimed && (
              <div className="space-y-1.5 w-full max-w-[240px]">
                <div className="flex justify-between items-center text-[8px] font-black text-white/30 uppercase tracking-tighter">
                  <span>Progress</span><span>{Math.min(event.current, event.target)} / {event.target}</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className={`h-full transition-all duration-1000 ease-out ${isReady ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : `bg-${accent}-500 shadow-[0_0_8px_currentColor]`}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-4 shrink-0">
             <div className="bg-black/40 px-3 py-1.5 rounded-full border border-white/5 text-yellow-500 text-[10px] font-black tracking-tighter">
                {event.reward.type === 'XP' ? '🎖️' : event.reward.type === 'GEMS' ? '💎' : event.reward.type === 'BOOSTER' ? '⚡' : '💰'} {event.reward.value.toString().split('_')[0]}
             </div>
             <button onClick={() => handleClaim(event)} disabled={isClaimed || !isReady} className={`flex items-center justify-center rounded-xl transition-all duration-300 relative overflow-hidden h-10 ${isClaimed ? 'w-10 bg-emerald-600/20 text-emerald-500' : isReady ? 'px-10 bg-gradient-to-r from-yellow-400 to-amber-600 text-black shadow-lg animate-pulse' : 'px-10 bg-white/5 text-white/20Cursor-not-allowed'}`}>
               {isClaimed ? '✓' : isReady ? 'CLAIM' : `${Math.floor(progress)}%`}
             </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      {notification && <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[400] px-8 py-4 bg-emerald-600 border-2 border-emerald-400 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-2xl animate-in slide-in-from-top-6">{notification}</div>}
      <div className="relative border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[3.5rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        {activeTab === 'DAILY' ? <DailyBackground /> : activeTab === 'WEEKLY' ? <WeeklyBackground /> : <ChallengeBackground />}
        <div className="relative z-10 p-10 border-b border-white/5 flex justify-between items-start">
          <div className="flex flex-col">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase italic tracking-tighter leading-none">XIII EVENTS</h2>
            {activeTab === 'CHALLENGES' && (
              <div className="flex items-center gap-3 mt-4">
                <span className="text-[8px] font-black text-pink-400/60 uppercase tracking-[0.4em]">Next Rotation in: {resetTime}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/[0.03] hover:bg-red-600/20 border border-white/10 text-gray-400 flex items-center justify-center transition-all"><span className="text-2xl">✕</span></button>
        </div>
        <div className="relative z-10 px-10 pt-6 flex gap-10 border-b border-white/5 bg-black/20">
            {['DAILY', 'WEEKLY', 'CHALLENGES'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`pb-5 text-[11px] font-black uppercase tracking-[0.25em] transition-all relative ${activeTab === tab ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}>
                {tab === 'DAILY' ? 'DAILY EVENTS' : tab === 'WEEKLY' ? 'WEEKLY OPS' : 'CHALLENGES'}
                {activeTab === tab && <div className={`absolute bottom-0 left-0 w-full h-1 rounded-t-full ${tab === 'DAILY' ? 'bg-emerald-500' : tab === 'WEEKLY' ? 'bg-blue-500' : 'bg-pink-500 shadow-[0_0_15px_#ff007f]'}`}></div>}
              </button>
            ))}
        </div>
        <div className="relative z-10 flex-1 overflow-y-auto p-10 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-5 pb-10">
              {activeTab === 'DAILY' ? dailyEvents.map(renderEventItem) : activeTab === 'WEEKLY' ? weeklyEvents.map(renderEventItem) : weeklyChallenges.map(renderEventItem)}
            </div>
        </div>
        <div className="relative z-10 p-6 bg-black/60 border-t border-white/5 flex items-center justify-center"><span className="text-[8px] font-black text-white/20 uppercase tracking-[0.6em]">Tactical Data Stream: SECURE</span></div>
      </div>
    </div>
  );
};