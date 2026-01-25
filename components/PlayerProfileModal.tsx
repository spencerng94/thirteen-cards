import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile, Emote } from '../types';
import { fetchProfile, addFriend, getFriends, getPendingRequests, calculateLevel, fetchEmotes, removeFriend } from '../services/supabase';
import { VisualEmote } from './VisualEmote';

interface PlayerProfileModalProps {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  currentUserId: string;
  onClose: () => void;
  onRefreshProfile?: () => void;
  isMuted?: boolean;
  onToggleMute?: (playerId: string) => void;
  onFriendRemoved?: () => void; // Callback when friend is removed
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  playerId,
  playerName,
  playerAvatar,
  currentUserId,
  onClose,
  onRefreshProfile,
  isMuted = false,
  onToggleMute,
  onFriendRemoved
}) => {
  const [playerProfile, setPlayerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingFriend, setAddingFriend] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [pendingSent, setPendingSent] = useState(false);
  const [pendingReceived, setPendingReceived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [removingFriend, setRemovingFriend] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (playerId === 'guest' || playerId === currentUserId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPlayerProfile(null);
      
      try {
        // Add timeout to prevent hanging - wrap fetchProfile in a timeout
        const fetchProfileWithTimeout = (): Promise<UserProfile | null> => {
          return Promise.race([
            fetchProfile(playerId, undefined, undefined),
            new Promise<UserProfile | null>((resolve) => 
              setTimeout(() => resolve(null), 8000)
            )
          ]);
        };

        // Fetch remote emotes (don't block on this)
        fetchEmotes()
          .then(setRemoteEmotes)
          .catch(() => setRemoteEmotes([]));

        // Fetch player profile with timeout
        const profile = await fetchProfileWithTimeout();
        
        if (profile) {
          setPlayerProfile(profile);
          // Check friendship status (accepted, pending sent, pending received)
          try {
            const friends = await getFriends(currentUserId);
            const friendIds = friends.map(f => f.friend_id);
            const isAlreadyFriend = friendIds.includes(playerId);
            setIsFriend(isAlreadyFriend);
            
            // Check for pending requests only if not already friends
            if (!isAlreadyFriend) {
              const { sent, received } = await getPendingRequests(currentUserId);
              // Check if we sent a request to this player
              const sentToPlayer = sent.some(f => (f.receiver_id || f.friend_id) === playerId);
              setPendingSent(sentToPlayer);
              
              // Check if they sent a request to us
              const receivedFromPlayer = received.some(f => (f.sender_id || f.user_id) === playerId);
              setPendingReceived(receivedFromPlayer);
            } else {
              // Clear pending states if already friends
              setPendingSent(false);
              setPendingReceived(false);
            }
          } catch (friendError) {
            console.warn('Error checking friends list:', friendError);
            // Don't set error for friend check failure - it's not critical
          }
        } else {
          // Profile doesn't exist or timed out - this is normal for bots, new players, or UUIDs that aren't in DB
          // Set a more helpful error message
          setError('Profile not found. This player may be using a guest account or their profile hasn\'t been created yet.');
          setPlayerProfile(null);
        }
      } catch (e: any) {
        console.error('Error loading player profile:', e);
        // Provide more specific error messages
        if (e?.message === 'PROFILE_NOT_FOUND_404' || (e as any)?.isNotFound) {
          setError('Profile not found. This player may be using a guest account or their profile hasn\'t been created yet.');
        } else if (e?.message === 'Request timeout') {
          setError('Request timed out. The player may not have a profile, or there was a connection issue.');
        } else if (e?.message) {
          setError(`Failed to load profile: ${e.message}`);
        } else if (e?.error?.message) {
          setError(`Failed to load profile: ${e.error.message}`);
        } else {
          setError('Failed to load profile. Please try again.');
        }
        setPlayerProfile(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [playerId, currentUserId]);

  const handleAddFriend = async () => {
    if (!playerProfile || isFriend || pendingSent || addingFriend || playerId === 'guest' || playerId === currentUserId) return; // Self-check
    
    setAddingFriend(true);
    setError(null);
    try {
      const result = await addFriend(currentUserId, playerId);
      if (result.success) {
        // Set pending sent status (not isFriend - that's only for accepted friendships)
        setPendingSent(true);
        if (onRefreshProfile) {
          onRefreshProfile();
        }
      } else {
        setError(result.error || 'Unable to add friend. You may already be friends or the friend limit has been reached.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to add friend');
    } finally {
      setAddingFriend(false);
    }
  };

  const level = playerProfile ? calculateLevel(playerProfile.xp) : 1;
  const wins = playerProfile?.wins || 0;
  const games = playerProfile?.games_played || 0;
  const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : '0.0';
  const currentStreak = playerProfile?.current_streak || 0;
  const longestStreak = playerProfile?.longest_streak || 0;
  
  // Calculate account age in days
  const accountAgeDays = playerProfile && (playerProfile as any).created_at
    ? Math.floor((Date.now() - new Date((playerProfile as any).created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const content = (
    <div 
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-xl p-3 max-w-[280px] w-full shadow-2xl animate-in zoom-in-95 duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
        >
          <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
            <p className="text-white/60 text-sm">Loading profile...</p>
            <p className="text-white/40 text-xs mt-2">This may take a moment...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-rose-500 text-sm mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-all duration-200"
            >
              Close
            </button>
          </div>
        ) : !playerProfile ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-white/60 text-sm mb-4">Profile not available</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-all duration-200"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col items-center mb-3">
              <div className="relative w-12 h-12 mb-1.5">
                <div className="w-full h-full rounded-full border-2 border-white/20 bg-black/40 flex items-center justify-center overflow-hidden">
                  <VisualEmote trigger={playerAvatar} remoteEmotes={remoteEmotes} size="sm" />
                </div>
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-black text-[6px] font-black px-1 py-0.5 rounded-full border-2 border-yellow-300/50 shadow-[0_2px_4px_rgba(234,179,8,0.4)] backdrop-blur-sm">
                  <span className="text-[5px] opacity-80">LV</span> {level}
                </div>
              </div>
              <h2 className="text-sm font-black text-white mb-0.5">{playerName}</h2>
              {accountAgeDays !== null && (
                <p className="text-[8px] text-white/50">
                  Account age: {accountAgeDays} {accountAgeDays === 1 ? 'day' : 'days'}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="space-y-1.5 mb-3">
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="text-center">
                    <p className="text-[7px] text-white/60 uppercase tracking-wider mb-0.5">Wins</p>
                    <p className="text-base font-black text-emerald-400">{wins}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] text-white/60 uppercase tracking-wider mb-0.5">Games</p>
                    <p className="text-base font-black text-white">{games}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] text-white/60 uppercase tracking-wider mb-0.5">Win Rate</p>
                    <p className="text-base font-black text-blue-400">{winRate}%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="text-center">
                    <p className="text-[7px] text-white/60 uppercase tracking-wider mb-0.5">Current Streak</p>
                    <p className="text-base font-black text-yellow-400">{currentStreak}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[7px] text-white/60 uppercase tracking-wider mb-0.5">Longest Streak</p>
                    <p className="text-base font-black text-white">{longestStreak}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Friend Status Button */}
            {isFriend ? (
              <>
                <div className="w-full py-1.5 px-3 bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 font-bold rounded-lg text-center flex items-center justify-center gap-1.5 mb-1.5 text-xs">
                  <span>✓</span>
                  <span>Friends</span>
                </div>
                {/* Remove Friend Button */}
                <button
                  onClick={async () => {
                    if (!currentUserId || currentUserId === 'guest' || playerId === 'guest') return;
                    setRemovingFriend(true);
                    try {
                      await removeFriend(currentUserId, playerId);
                      onFriendRemoved?.();
                      onClose();
                    } catch (err: any) {
                      setError(err.message || 'Failed to remove friend');
                    } finally {
                      setRemovingFriend(false);
                    }
                  }}
                  disabled={removingFriend}
                  className="w-full py-1.5 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {removingFriend ? 'Removing...' : 'Remove Friend'}
                </button>
              </>
            ) : pendingSent ? (
              <div className="w-full py-1.5 px-3 bg-yellow-600/30 border border-yellow-500/50 text-yellow-300 font-bold rounded-lg text-center text-xs">
                Request Sent
              </div>
            ) : pendingReceived ? (
              <div className="w-full py-1.5 px-3 bg-blue-600/30 border border-blue-500/50 text-blue-300 font-bold rounded-lg text-center text-xs">
                Request Received
              </div>
            ) : (
              <button
                onClick={handleAddFriend}
                disabled={addingFriend}
                className="w-full py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/50 text-xs"
              >
                {addingFriend ? 'Adding...' : 'Add Friend'}
              </button>
            )}

            {/* Mute/Unmute Button */}
            {onToggleMute && playerId !== currentUserId && playerId !== 'guest' && (
              <button
                onClick={() => onToggleMute(playerId)}
                className={`w-full py-1.5 px-3 font-bold rounded-lg transition-all duration-300 shadow-lg mt-1.5 flex items-center justify-center gap-1.5 text-xs ${
                  isMuted
                    ? 'bg-red-600/90 hover:bg-red-700 text-white border-2 border-red-500/50 hover:shadow-red-500/50'
                    : 'bg-white/10 hover:bg-white/20 text-white/90 border-2 border-white/20 hover:border-white/30'
                }`}
              >
                {isMuted ? (
                  <>
                    <span className="text-sm">🔇</span>
                    <span>Unmute Player</span>
                  </>
                ) : (
                  <>
                    <span>Mute Player</span>
                  </>
                )}
              </button>
            )}

            {isMuted && (
              <div className="w-full py-1.5 px-4 bg-red-600/20 border border-red-500/30 text-red-300 text-xs font-semibold rounded-lg text-center mt-2 flex items-center justify-center gap-2">
                <span>🔇</span>
                <span>This player is muted</span>
              </div>
            )}

            {error && (
              <p className="mt-4 text-rose-500 text-sm text-center">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );

  return typeof window !== 'undefined' 
    ? createPortal(content, document.body)
    : content;
};
