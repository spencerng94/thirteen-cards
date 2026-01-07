import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile, Emote } from '../types';
import { fetchProfile, addFriend, getFriends, calculateLevel, fetchEmotes } from '../services/supabase';
import { VisualEmote } from './VisualEmote';
import { getAvatarName } from '../services/supabase';

interface PlayerProfileModalProps {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  currentUserId: string;
  onClose: () => void;
  onRefreshProfile?: () => void;
  isMuted?: boolean;
  onToggleMute?: (playerId: string) => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  playerId,
  playerName,
  playerAvatar,
  currentUserId,
  onClose,
  onRefreshProfile,
  isMuted = false,
  onToggleMute
}) => {
  const [playerProfile, setPlayerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingFriend, setAddingFriend] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);

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
        // Fetch remote emotes
        const emotes = await fetchEmotes();
        setRemoteEmotes(emotes || []);

        // Fetch player profile
        // fetchProfile returns null if profile doesn't exist (not an error)
        const profile = await fetchProfile(playerId, undefined, undefined);
        
        if (profile) {
          setPlayerProfile(profile);
          // Check if already friends
          try {
            const friends = await getFriends(currentUserId);
            const friendIds = friends.map(f => f.friend_id);
            setIsFriend(friendIds.includes(playerId));
          } catch (friendError) {
            console.warn('Error checking friends list:', friendError);
            // Don't set error for friend check failure - it's not critical
          }
        } else {
          // Profile doesn't exist - this is normal for bots or new players
          // Set a more helpful error message
          setError('Profile not found. This player may not have a profile yet.');
          setPlayerProfile(null);
        }
      } catch (e: any) {
        console.error('Error loading player profile:', e);
        // Provide more specific error messages
        if (e?.message) {
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
    if (!playerProfile || isFriend || addingFriend || playerId === 'guest' || playerId === currentUserId) return; // Self-check
    
    setAddingFriend(true);
    setError(null);
    try {
      const success = await addFriend(currentUserId, playerId);
      if (success) {
        setIsFriend(true);
        if (onRefreshProfile) {
          onRefreshProfile();
        }
      } else {
        setError('Unable to add friend. You may already be friends or the friend limit has been reached.');
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
  const currentStreak = playerProfile?.current_streak || 0;
  const longestStreak = playerProfile?.longest_streak || 0;

  const content = (
    <div 
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-black/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200"
        >
          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
            <p className="text-white/60 text-sm">Loading profile...</p>
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
            <div className="flex flex-col items-center mb-8">
              <div className="relative w-24 h-24 mb-4">
                <div className="w-full h-full rounded-full border-2 border-white/20 bg-black/40 flex items-center justify-center overflow-hidden">
                  <VisualEmote trigger={playerAvatar} remoteEmotes={remoteEmotes} size="xl" />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-black px-3 py-1 rounded-full border-2 border-black shadow-lg">
                  Lv. {level}
                </div>
              </div>
              <h2 className="text-2xl font-black text-white mb-1">{playerName}</h2>
              <p className="text-sm text-white/60">{getAvatarName(playerAvatar, remoteEmotes)}</p>
            </div>

            {/* Stats */}
            <div className="space-y-4 mb-8">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Wins</p>
                    <p className="text-2xl font-black text-emerald-400">{wins}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Games</p>
                    <p className="text-2xl font-black text-white">{games}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Current Streak</p>
                    <p className="text-2xl font-black text-yellow-400">{currentStreak}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Longest Streak</p>
                    <p className="text-2xl font-black text-white">{longestStreak}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-center">
                  <p className="text-[10px] text-white/60 uppercase tracking-wider mb-1">Total XP</p>
                  <p className="text-2xl font-black text-yellow-500">{playerProfile.xp.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Add Friend Button */}
            {!isFriend && (
              <button
                onClick={handleAddFriend}
                disabled={addingFriend}
                className="w-full py-3 px-6 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-emerald-500/50"
              >
                {addingFriend ? 'Adding...' : 'Add Friend'}
              </button>
            )}

            {isFriend && (
              <div className="w-full py-3 px-6 bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 font-bold rounded-xl text-center">
                ✓ Friends
              </div>
            )}

            {/* Mute/Unmute Button */}
            {onToggleMute && playerId !== currentUserId && playerId !== 'guest' && (
              <button
                onClick={() => onToggleMute(playerId)}
                className={`w-full py-3 px-6 font-bold rounded-xl transition-all duration-300 shadow-lg mt-3 flex items-center justify-center gap-2 ${
                  isMuted
                    ? 'bg-red-600/90 hover:bg-red-700 text-white border-2 border-red-500/50 hover:shadow-red-500/50'
                    : 'bg-white/10 hover:bg-white/20 text-white/90 border-2 border-white/20 hover:border-white/30'
                }`}
              >
                {isMuted ? (
                  <>
                    <span className="text-lg">🔇</span>
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
              <div className="w-full py-2 px-6 bg-red-600/20 border border-red-500/30 text-red-300 text-sm font-semibold rounded-xl text-center mt-2 flex items-center justify-center gap-2">
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
