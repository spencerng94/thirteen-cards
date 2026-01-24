import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, BackgroundTheme } from '../types';
import { CardCoverStyle, Card } from './Card';
import { claimEvent, grantItem, updateProfileSettings } from '../services/supabase';
import { audioService } from '../services/audio';
import { getWeeklyChallenges, getTimeUntilReset, Challenge } from '../constants/ChallengePool';
import { ITEM_REGISTRY } from '../constants/ItemRegistry';

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
  reward: { type: 'XP' | 'GOLD' | 'SLEEVE' | 'BOOSTER'; value: number | string };
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

// Item Icon Components (simplified versions from Store)
const XpBoosterIcon = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <circle cx="50" cy="50" r="42" fill="#3b82f6" stroke="white" strokeWidth="2" opacity="0.95" />
    <text x="50" y="62" textAnchor="middle" fontSize="32" fontWeight="900" fill="white">⚡</text>
  </svg>
);

const GoldBoosterIcon = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <circle cx="50" cy="50" r="42" fill="#fbbf24" stroke="white" strokeWidth="2" opacity="0.95" />
    <text x="50" y="62" textAnchor="middle" fontSize="32" fontWeight="900" fill="white">$</text>
  </svg>
);

const EmoteChestIcon = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="chestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <rect x="20" y="30" width="60" height="50" rx="5" fill="url(#chestGrad)" stroke="white" strokeWidth="2" />
    <path d="M20 30 L30 20 L70 20 L80 30" fill="url(#chestGrad)" stroke="white" strokeWidth="2" />
    <circle cx="50" cy="55" r="12" fill="white" opacity="0.3" />
    <text x="50" y="60" textAnchor="middle" fontSize="20" fill="white">🎁</text>
  </svg>
);

const getItemIcon = (id: string, type: string) => {
  if (id.includes('XP')) return <XpBoosterIcon />;
  if (id.includes('GOLD')) return <GoldBoosterIcon />;
  if (id === 'EMOTE_CHEST') return <EmoteChestIcon />;
  return <span className="text-4xl">📦</span>;
};

export const EventsModal: React.FC<EventsModalProps> = ({ onClose, profile, onRefreshProfile, isGuest }) => {
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY' | 'CHALLENGES' | 'NEW_PLAYER'>('DAILY');
  const [notification, setNotification] = useState<string | null>(null);
  const [resetTime, setResetTime] = useState(getTimeUntilReset());
  const [rewardPreview, setRewardPreview] = useState<{ type: 'ITEM' | 'SLEEVE'; id: string; name: string; description: string; style?: CardCoverStyle } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setResetTime(getTimeUntilReset()), 60000);
    return () => clearInterval(interval);
  }, []);

  const dailyEvents: GameEvent[] = useMemo(() => {
    // Check if daily_login has been claimed today
    const isDailyLoginClaimed = profile.event_stats?.claimed_events?.includes('daily_login');
    
    // Daily login: if not claimed today, user can claim it (viewing events page = logged in)
    // If claimed today, show as completed (current = 1)
    const dailyLoginCurrent = isDailyLoginClaimed ? 1 : 1; // Always available if not claimed (viewing events = logged in)
    
    return [
      { 
        id: 'daily_login', 
        title: 'DAILY LOGIN', 
        description: 'Log in today', 
        reward: { type: 'GOLD', value: 100 }, 
        target: 1, 
        current: dailyLoginCurrent 
      },
      { id: 'daily_play', title: 'FIRST MATCH', description: 'Play 1 game', reward: { type: 'XP', value: 25 }, target: 1, current: profile.event_stats?.daily_games_played || 0 },
      { id: 'daily_win', title: 'DAILY VICTORY', description: 'Win 1 match', reward: { type: 'BOOSTER', value: 'XP_2X_30M' }, target: 1, current: profile.event_stats?.daily_wins || 0 },
      { id: 'daily_play_3', title: 'ARENA WARRIOR', description: 'Play 3 games', reward: { type: 'GOLD', value: 50 }, target: 3, current: profile.event_stats?.daily_games_played || 0 },
      { id: 'daily_win_2', title: 'DOUBLE CROWN', description: 'Win 2 matches', reward: { type: 'BOOSTER', value: 'XP_2X_10M' }, target: 2, current: profile.event_stats?.daily_wins || 0 },
      { id: 'daily_play_5', title: 'ARENA CHAMPION', description: 'Play 5 games', reward: { type: 'BOOSTER', value: 'GOLD_2X_10M' }, target: 5, current: profile.event_stats?.daily_games_played || 0 },
      { id: 'daily_win_3', title: 'TRIPLE THREAT', description: 'Win 3 matches', reward: { type: 'GOLD', value: 100 }, target: 3, current: profile.event_stats?.daily_wins || 0 }
    ];
  }, [profile.event_stats, profile.last_daily_claim]);

  const weeklyEvents: GameEvent[] = useMemo(() => [
    { id: 'weekly_play', title: 'VETERAN STATUS', description: 'Play 10 games', reward: { type: 'GOLD', value: 150 }, target: 10, current: profile.event_stats?.weekly_games_played || 0 },
    { id: 'weekly_win', title: 'ARENA DOMINANCE', description: 'Win 7 matches', reward: { type: 'GOLD', value: 300 }, target: 7, current: profile.event_stats?.weekly_wins || 0 },
    { id: 'weekly_bombs', title: 'DEMOLITION EXPERT', description: 'Play 5 bombs or quads', reward: { type: 'BOOSTER', value: 'GOLD_2X_30M' }, target: 5, current: profile.event_stats?.weekly_bombs_played || 0 },
    { id: 'weekly_chops', title: 'MASTER CHOPPER', description: 'Perform 5 successful Chops', reward: { type: 'BOOSTER', value: 'XP_2X_30M' }, target: 5, current: profile.event_stats?.weekly_chops_performed || 0 },
    { id: 'weekly_streak', title: 'WIN STREAK', description: 'Win 3 matches in a row', reward: { type: 'BOOSTER', value: 'STREAK_PROTECTION' }, target: 3, current: profile.current_streak || 0 },
    { id: 'weekly_hands', title: 'HAND MASTER', description: 'Play 50 hands', reward: { type: 'XP', value: 200 }, target: 50, current: profile.event_stats?.total_hands_played || 0 }
  ], [profile.event_stats, profile.current_streak]);

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

  const newPlayerEvents: GameEvent[] = useMemo(() => [
    { 
      id: 'new_player_online_game', 
      title: 'FRIENDLY MATCH', 
      description: 'Play 1 game online with friends', 
      reward: { type: 'BOOSTER', value: 'EMOTE_CHEST' }, 
      target: 1, 
      current: profile.event_stats?.online_games_played || 0 
    },
    { 
      id: 'new_player_gem_purchase', 
      title: 'PREMIUM SUPPORTER', 
      description: 'Buy any amount of gems', 
      reward: { type: 'SLEEVE', value: 'ROYAL_CROSS' }, 
      target: 1, 
      current: (profile.event_stats?.gems_purchased || 0) > 0 ? 1 : 0 
    }
  ], [profile.event_stats]);

  const handleClaim = async (event: GameEvent) => {
    const isClaimed = profile.event_stats?.claimed_events?.includes(event.id);
    if (isClaimed) return;
    
    // Handle BOOSTER type rewards separately (uses grantItem)
    if (event.reward.type === 'BOOSTER') {
      try {
        await grantItem(profile.id, event.reward.value as string);
        // Still need to mark event as claimed
        const updates: Partial<UserProfile> = {
          event_stats: {
            ...(profile.event_stats || {} as any),
            claimed_events: [...(profile.event_stats?.claimed_events || []), event.id],
            ready_to_claim: (profile.event_stats?.ready_to_claim || []).filter(id => id !== event.id)
          }
        };
        await updateProfileSettings(profile.id || 'guest', updates);
        audioService.playPurchase();
        onRefreshProfile();
        setNotification(`CLAIMED: ${event.reward.value}`);
        setTimeout(() => setNotification(null), 3000);
      } catch (e) {
        console.error('❌ Failed to claim booster reward:', e);
        setNotification('Failed to claim reward');
        setTimeout(() => setNotification(null), 3000);
      }
      return;
    }

    // Use atomic claimEvent function for XP, GOLD, GEMS, SLEEVE
    try {
      const result = await claimEvent(
        profile.id || 'guest',
        event.id,
        event.reward.type,
        event.reward.value,
        !!isGuest
      );

      if (!result.success) {
        console.error('❌ Claim failed:', { error: result.error, errorCode: result.errorCode, eventId: event.id });
        setNotification(result.error || 'Failed to claim reward');
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      audioService.playPurchase();
      onRefreshProfile();
      setNotification(`CLAIMED: ${event.reward.value}`);
      setTimeout(() => setNotification(null), 3000);
    } catch (e: any) {
      console.error('❌ Claim exception:', e);
      setNotification('Failed to claim reward');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const renderEventItem = (event: GameEvent) => {
    const isClaimed = profile.event_stats?.claimed_events?.includes(event.id);
    const isReady = !isClaimed && (profile.event_stats?.ready_to_claim?.includes(event.id) || event.current >= event.target);
    const progress = Math.min(100, (event.current / event.target) * 100);
    
    const getAccentStyles = () => {
      if (activeTab === 'DAILY') {
        return {
          bg: isReady ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5' : 'bg-white/[0.03]',
          border: isReady ? 'border-emerald-400/30' : 'border-white/10',
          shadow: isReady ? 'shadow-[0_0_20px_rgba(16,185,129,0.2)]' : '',
          glow: 'from-emerald-500/20 via-transparent to-emerald-500/20',
          progress: isReady ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_12px_#f59e0b]' : 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_#10b981]'
        };
      } else if (activeTab === 'WEEKLY') {
        return {
          bg: isReady ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/5' : 'bg-white/[0.03]',
          border: isReady ? 'border-blue-400/30' : 'border-white/10',
          shadow: isReady ? 'shadow-[0_0_20px_rgba(59,130,246,0.2)]' : '',
          glow: 'from-blue-500/20 via-transparent to-blue-500/20',
          progress: isReady ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_12px_#f59e0b]' : 'bg-gradient-to-r from-blue-500 to-blue-400 shadow-[0_0_8px_#3b82f6]'
        };
      } else if (activeTab === 'NEW_PLAYER') {
        return {
          bg: isReady ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/5' : 'bg-white/[0.03]',
          border: isReady ? 'border-purple-400/30' : 'border-white/10',
          shadow: isReady ? 'shadow-[0_0_20px_rgba(168,85,247,0.2)]' : '',
          glow: 'from-purple-500/20 via-transparent to-purple-500/20',
          progress: isReady ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_12px_#f59e0b]' : 'bg-gradient-to-r from-purple-500 to-purple-400 shadow-[0_0_8px_#a855f7]'
        };
      } else {
        return {
          bg: isReady ? 'bg-gradient-to-br from-pink-500/10 to-pink-600/5' : 'bg-white/[0.03]',
          border: isReady ? 'border-pink-400/30' : 'border-white/10',
          shadow: isReady ? 'shadow-[0_0_20px_rgba(236,72,153,0.2)]' : '',
          glow: 'from-pink-500/20 via-transparent to-pink-500/20',
          progress: isReady ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_12px_#f59e0b]' : 'bg-gradient-to-r from-pink-500 to-pink-400 shadow-[0_0_8px_#ec4899]'
        };
      }
    };
    
    const accentStyles = getAccentStyles();
    
    const getRewardDisplay = () => {
      if (event.reward.type === 'XP') return { icon: '🎖️', label: `${event.reward.value} XP`, color: 'text-blue-400', clickable: false };
      if (event.reward.type === 'BOOSTER') {
        const itemId = event.reward.value as string;
        const item = ITEM_REGISTRY[itemId];
        if (item) {
          // Determine icon based on item type
          let icon = '⚡';
          if (itemId === 'EMOTE_CHEST') icon = '🎁';
          else if (itemId.includes('XP')) icon = '⚡';
          else if (itemId.includes('GOLD')) icon = '💰';
          else if (item.type === 'VOUCHER') icon = '🎫';
          
          // Determine color based on item type and rarity
          let color = 'text-yellow-400';
          if (itemId === 'EMOTE_CHEST') color = 'text-purple-400';
          else if (itemId.includes('XP')) color = 'text-blue-400';
          else if (itemId.includes('GOLD')) color = 'text-yellow-400';
          else if (item.type === 'VOUCHER') color = item.rarity === 'EPIC' ? 'text-pink-400' : 'text-emerald-400';
          
          return { 
            icon, 
            label: item.name.toUpperCase(), 
            color, 
            clickable: true,
            itemId,
            item
          };
        }
        return { icon: '⚡', label: 'BOOSTER', color: 'text-yellow-400', clickable: false };
      }
      if (event.reward.type === 'SLEEVE') {
        return { 
          icon: '🃏', 
          label: event.reward.value as string, 
          color: 'text-yellow-400',
          clickable: true,
          sleeveStyle: event.reward.value as CardCoverStyle
        };
      }
      return { icon: '💰', label: `${event.reward.value}`, color: 'text-yellow-400', clickable: false };
    };
    
    const rewardDisplay = getRewardDisplay();
    
    const handleRewardClick = () => {
      if (!rewardDisplay.clickable) return;
      
      if (rewardDisplay.sleeveStyle) {
        // Show sleeve preview
        setRewardPreview({
          type: 'SLEEVE',
          id: rewardDisplay.sleeveStyle,
          name: rewardDisplay.label,
          description: `Exclusive card sleeve: ${rewardDisplay.label}`,
          style: rewardDisplay.sleeveStyle
        });
      } else if (rewardDisplay.itemId && rewardDisplay.item) {
        // Show item preview
        setRewardPreview({
          type: 'ITEM',
          id: rewardDisplay.itemId,
          name: rewardDisplay.item.name,
          description: rewardDisplay.item.description
        });
      }
    };
    
    return (
      <div key={event.id} className={`relative rounded-xl sm:rounded-2xl border transition-all duration-500 overflow-hidden group ${isClaimed ? 'bg-white/5 border-white/10 opacity-60' : `${accentStyles.bg} ${accentStyles.border} ${accentStyles.shadow} hover:border-white/20`}`}>
        {/* Glow effect for ready events */}
        {isReady && !isClaimed && (
          <div className={`absolute inset-0 bg-gradient-to-r ${accentStyles.glow} animate-pulse pointer-events-none`}></div>
        )}
        
        <div className="relative z-10 p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <h4 className={`text-[12px] sm:text-[14px] font-black text-white uppercase tracking-wide truncate ${isReady && !isClaimed ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : ''}`}>{event.title}</h4>
                {isClaimed && <span className="text-emerald-400 text-base shrink-0">✓</span>}
              </div>
              <p className="text-[9px] sm:text-[10px] text-white/50 font-medium uppercase tracking-wide leading-tight line-clamp-1">{event.description}</p>
              
            {!isClaimed && (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out relative ${accentStyles.progress}`} 
                      style={{ width: `${progress}%` }}
                    >
                      {progress > 0 && (
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-[shimmer_2s_infinite]"></div>
                      )}
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-tight shrink-0 ${isReady ? 'text-amber-400' : 'text-white/50'}`}>
                    {Math.min(event.current, event.target)}/{event.target}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div 
                onClick={handleRewardClick}
                className={`bg-black/60 backdrop-blur-sm px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border transition-all ${isReady ? 'border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-white/10'} ${rewardDisplay.color} ${
                  rewardDisplay.clickable 
                    ? 'cursor-pointer hover:scale-105 hover:border-white/30 hover:bg-black/80 active:scale-95' 
                    : ''
                }`}
                title={rewardDisplay.clickable ? 'Click to view details' : undefined}
              >
                <div className="flex items-center gap-1.5">
                  {rewardDisplay.itemId && rewardDisplay.item ? (
                    <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                      {getItemIcon(rewardDisplay.itemId, rewardDisplay.item.type)}
                    </div>
                  ) : rewardDisplay.sleeveStyle ? (
                    <div className="w-8 h-11 sm:w-10 sm:h-14 flex items-center justify-center shrink-0">
                      <Card 
                        faceDown 
                        activeTurn={true} 
                        coverStyle={rewardDisplay.sleeveStyle} 
                        small
                        className="!w-8 !h-11 sm:!w-10 sm:!h-14 shadow-lg"
                      />
                    </div>
                  ) : (
                    <span className="text-sm sm:text-base">{rewardDisplay.icon}</span>
                  )}
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight hidden sm:inline">{rewardDisplay.label}</span>
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight sm:hidden">{event.reward.type === 'XP' ? event.reward.value : event.reward.type === 'BOOSTER' ? '⚡' : event.reward.value}</span>
                  {rewardDisplay.clickable && (
                    <span className="text-[8px] opacity-50 ml-0.5" title="Click for details">ℹ️</span>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => handleClaim(event)} 
                disabled={isClaimed || !isReady} 
                className={`flex items-center justify-center rounded-lg sm:rounded-xl transition-all duration-300 relative overflow-hidden w-9 sm:w-10 h-9 sm:h-10 ${
                  isClaimed 
                    ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 cursor-default' 
                    : isReady 
                      ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 text-black shadow-[0_0_25px_rgba(251,191,36,0.5)] hover:scale-110 active:scale-95 border-2 border-yellow-300 cursor-pointer' 
                      : 'bg-white/5 text-white/20 border border-white/10 cursor-not-allowed'
                }`}
              >
                <span className={`text-lg sm:text-xl transition-all ${isReady && !isClaimed ? 'drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]' : ''}`}>✓</span>
                {isReady && !isClaimed && (
                  <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none rounded-lg sm:rounded-xl"></div>
                )}
              </button>
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      {notification && <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[400] px-8 py-4 bg-emerald-600 border-2 border-emerald-400 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-2xl animate-in slide-in-from-top-6">{notification}</div>}
      <div className="relative border border-white/10 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        {activeTab === 'DAILY' ? <DailyBackground /> : activeTab === 'WEEKLY' ? <WeeklyBackground /> : activeTab === 'CHALLENGES' ? <ChallengeBackground /> : <ChallengeBackground />}
        <div className="relative z-10 p-4 sm:p-6 border-b border-white/5 flex justify-between items-start">
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase italic tracking-tighter leading-none">XIII EVENTS</h2>
            <p className="text-[8px] sm:text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] mt-1">Complete missions to earn rewards</p>
            {(activeTab === 'CHALLENGES' || activeTab === 'WEEKLY') && (
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[7px] sm:text-[8px] font-black uppercase tracking-[0.4em] ${activeTab === 'CHALLENGES' ? 'text-pink-400/60' : 'text-blue-400/60'}`}>
                  {activeTab === 'CHALLENGES' ? `Reset: ${resetTime}` : `Reset: ${resetTime}`}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/[0.03] hover:bg-red-600/20 border border-white/10 text-gray-400 flex items-center justify-center transition-all shrink-0 ml-2"><span className="text-lg sm:text-xl">✕</span></button>
        </div>
        <div className="relative z-10 px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 flex gap-3 sm:gap-6 border-b border-white/5 bg-black/20 overflow-x-auto scrollbar-hide">
            {['DAILY', 'WEEKLY', 'CHALLENGES', 'NEW_PLAYER'].map(tab => {
              const tabCount = tab === 'DAILY' ? dailyEvents.length : tab === 'WEEKLY' ? weeklyEvents.length : tab === 'CHALLENGES' ? weeklyChallenges.length : newPlayerEvents.length;
              const completedCount = tab === 'DAILY' 
                ? dailyEvents.filter(e => profile.event_stats?.claimed_events?.includes(e.id)).length
                : tab === 'WEEKLY'
                ? weeklyEvents.filter(e => profile.event_stats?.claimed_events?.includes(e.id)).length
                : tab === 'CHALLENGES'
                ? weeklyChallenges.filter(e => profile.event_stats?.claimed_events?.includes(e.id)).length
                : newPlayerEvents.filter(e => profile.event_stats?.claimed_events?.includes(e.id)).length;
              
              return (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab as any)} 
                  className={`pb-2 sm:pb-3 px-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] transition-all relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <span>{tab === 'DAILY' ? 'DAILY' : tab === 'WEEKLY' ? 'WEEKLY' : tab === 'CHALLENGES' ? 'CHALLENGES' : 'NEW PLAYER'}</span>
                  <span className={`text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40'}`}>
                    {completedCount}/{tabCount}
                  </span>
                  {activeTab === tab && (
                    <div className={`absolute bottom-0 left-0 w-full h-0.5 sm:h-1 rounded-t-full ${tab === 'DAILY' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : tab === 'WEEKLY' ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : tab === 'CHALLENGES' ? 'bg-pink-500 shadow-[0_0_15px_#ff007f]' : 'bg-purple-500 shadow-[0_0_15px_#a855f7]'}`}></div>
                  )}
              </button>
              );
            })}
        </div>
        <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 sm:space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-2 sm:space-y-3 pb-4">
              {activeTab === 'DAILY' ? dailyEvents.map(renderEventItem) : activeTab === 'WEEKLY' ? weeklyEvents.map(renderEventItem) : activeTab === 'CHALLENGES' ? weeklyChallenges.map(renderEventItem) : newPlayerEvents.map(renderEventItem)}
            </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
        .animate-shimmer { animation: shimmer 2s infinite linear; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
      
      {/* Reward Preview Modal */}
      {rewardPreview && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={() => setRewardPreview(null)}>
          <div className="relative border border-white/20 w-full max-w-md rounded-3xl overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Premium Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#000000]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.08)_0%,transparent_70%)]"></div>
            
            {/* Header */}
            <div className="relative z-10 p-6 border-b border-white/20 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent flex justify-between items-center">
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 via-purple-300 to-purple-500 uppercase italic tracking-tight">
                REWARD PREVIEW
              </h3>
              <button 
                onClick={() => setRewardPreview(null)} 
                className="w-10 h-10 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border-2 border-white/20 hover:border-white/30 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="relative z-10 p-6 space-y-6">
              {/* Preview */}
              <div className="flex justify-center">
                {rewardPreview.type === 'SLEEVE' ? (
                  <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-br from-yellow-500/20 via-transparent to-pink-500/20 rounded-3xl blur-xl"></div>
                    <Card 
                      faceDown 
                      activeTurn={true} 
                      coverStyle={rewardPreview.style!} 
                      className="!w-32 !h-48 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10" 
                    />
                  </div>
                ) : (
                  <div className="relative w-32 h-32 bg-gradient-to-br from-black/60 to-black/40 rounded-3xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.6)] border-2 border-white/10 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
                    <div className="absolute -inset-2 bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                      {getItemIcon(rewardPreview.id, ITEM_REGISTRY[rewardPreview.id]?.type || 'COSMETIC')}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Additional Item Details */}
              {rewardPreview.type === 'ITEM' && ITEM_REGISTRY[rewardPreview.id] && (
                <div className="space-y-2 pt-2 border-t border-white/10">
                  {ITEM_REGISTRY[rewardPreview.id].boosterType && (
                    <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                      <span className="font-semibold">Type:</span>
                      <span className="uppercase">{ITEM_REGISTRY[rewardPreview.id].boosterType} Booster</span>
                      {ITEM_REGISTRY[rewardPreview.id].multiplier && (
                        <span className="text-yellow-400 font-bold">×{ITEM_REGISTRY[rewardPreview.id].multiplier}</span>
                      )}
                    </div>
                  )}
                  {ITEM_REGISTRY[rewardPreview.id].durationMs && (
                    <div className="text-xs text-white/50 text-center">
                      Duration: {Math.floor(ITEM_REGISTRY[rewardPreview.id].durationMs! / 60000)} minutes
                    </div>
                  )}
                  {ITEM_REGISTRY[rewardPreview.id].gamesRemaining && (
                    <div className="text-xs text-white/50 text-center">
                      Applies to: {ITEM_REGISTRY[rewardPreview.id].gamesRemaining} games
                    </div>
                  )}
                </div>
              )}
              
              {/* Info */}
              <div className="text-center space-y-2">
                <h4 className="text-xl font-bold text-white uppercase tracking-wide">{rewardPreview.name}</h4>
                <p className="text-sm text-white/70 leading-relaxed">{rewardPreview.description}</p>
                {rewardPreview.type === 'ITEM' && ITEM_REGISTRY[rewardPreview.id]?.rarity && (
                  <div className="pt-2">
                    <span className={`text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full ${
                      ITEM_REGISTRY[rewardPreview.id].rarity === 'MYTHIC' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' :
                      ITEM_REGISTRY[rewardPreview.id].rarity === 'LEGENDARY' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50' :
                      ITEM_REGISTRY[rewardPreview.id].rarity === 'EPIC' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/50' :
                      ITEM_REGISTRY[rewardPreview.id].rarity === 'RARE' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50' :
                      'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                    }`}>
                      {ITEM_REGISTRY[rewardPreview.id].rarity}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};