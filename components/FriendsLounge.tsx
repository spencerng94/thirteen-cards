import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile } from '../types';
import { getFriends, addFriend, removeFriend, searchUsers, getUserByHandle, Friendship } from '../services/supabase';
import { calculateLevel } from '../services/supabase';
import { CopyUsername } from './CopyUsername';

// Default avatar icon component for when avatar_url is null
const DefaultAvatarIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

interface FriendsLoungeProps {
  onClose: () => void;
  profile: UserProfile | null;
  onRefreshProfile: () => void;
  isGuest?: boolean;
}

export const FriendsLounge: React.FC<FriendsLoungeProps> = ({ onClose, profile, onRefreshProfile, isGuest }) => {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile && !isGuest) {
      loadFriends();
    }
  }, [profile, isGuest]);

  const loadFriends = async () => {
    if (!profile || isGuest) return;
    setLoading(true);
    try {
      const friendsList = await getFriends(profile.id);
      setFriends(friendsList);
    } catch (e) {
      console.error('Error loading friends:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !profile || isGuest) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchUsers(query);
      // Filter out current user and existing friends
      const friendIds = new Set(friends.map(f => f.friend_id));
      const filtered = results.filter(
        u => u.id !== profile.id && !friendIds.has(u.id) // Self-check: filter out current user
      );
      setSearchResults(filtered);
    } catch (e) {
      console.error('Error searching users:', e);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle deep linking: if URL has ?friend=Name#1234, fill search bar and search
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const friendParam = params.get('friend');
    if (friendParam && !isGuest && profile) {
      setSearchQuery(friendParam);
      // Trigger search after a short delay to ensure friends list is loaded
      const searchTimeout = setTimeout(() => {
        handleSearch(friendParam);
      }, 200);
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      return () => clearTimeout(searchTimeout);
    }
  }, [isGuest, profile, friends.length]); // Only run when friends list is loaded

  const handleAddFriend = async (friendId: string) => {
    if (!profile || isGuest || friendId === profile.id) return; // Self-check
    
    // Immediately set pending status to prevent spam
    setPendingRequests(prev => new Set(prev).add(friendId));
    setError(null);
    
    try {
      const success = await addFriend(profile.id, friendId);
      if (success) {
        await loadFriends();
        // Remove from search results
        setSearchResults(prev => prev.filter(u => u.id !== friendId));
        setError(null);
        // Keep pending status for a moment, then remove (friend was added)
        setTimeout(() => {
          setPendingRequests(prev => {
            const next = new Set(prev);
            next.delete(friendId);
            return next;
          });
        }, 2000);
      } else {
        // Request failed, remove pending status
        setPendingRequests(prev => {
          const next = new Set(prev);
          next.delete(friendId);
          return next;
        });
        setError('Unable to add friend. You may already be friends.');
      }
    } catch (e: any) {
      // Remove pending status on error
      setPendingRequests(prev => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
      setError(e.message || 'Failed to add friend');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!profile || isGuest) return;
    setLoading(true);
    try {
      await removeFriend(profile.id, friendId);
      await loadFriends();
    } catch (e) {
      console.error('Error removing friend:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddByHandle = async () => {
    if (!profile || isGuest || !searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if the query looks like a valid handle (contains #)
      if (!searchQuery.includes('#')) {
        setError('Please enter a handle in the format: Name#1234');
        setLoading(false);
        return;
      }
      
      const parts = searchQuery.split('#');
      if (parts.length !== 2 || !/^\d{4}$/.test(parts[1].trim())) {
        setError('Invalid handle format. Use: Name#1234');
        setLoading(false);
        return;
      }
      
      // Look up user by exact handle
      const user = await getUserByHandle(searchQuery.trim());
      
      if (!user) {
        setError('User not found. Please check the handle and try again.');
        setLoading(false);
        return;
      }
      
      // Check if already friends
      const friendIds = new Set(friends.map(f => f.friend_id));
      if (friendIds.has(user.id)) {
        setError('You are already friends with this user.');
        setLoading(false);
        return;
      }
      
      // Check if trying to add self
      if (user.id === profile.id) {
        setError('You cannot add yourself as a friend.');
        setLoading(false);
        return;
      }
      
      // Add the friend
      await handleAddFriend(user.id);
      
      // Add to search results so it shows up
      setSearchResults([user]);
      
    } catch (e: any) {
      setError(e.message || 'Failed to add friend by handle');
    } finally {
      setLoading(false);
    }
  };

  // Check if the search query looks like a valid handle
  const isValidHandle = useMemo(() => {
    if (!searchQuery.trim() || !searchQuery.includes('#')) return false;
    const parts = searchQuery.split('#');
    return parts.length === 2 && /^\d{4}$/.test(parts[1].trim());
  }, [searchQuery]);

  const friendCount = friends.length;
  const maxFriends = 20;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="relative border border-white/20 w-full max-w-2xl max-h-[95vh] rounded-3xl overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Premium Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#000000]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]"></div>

        {/* Header */}
        <div className="relative z-10 p-6 sm:p-8 border-b border-white/20 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col gap-2 flex-1">
              <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-blue-300 to-blue-500 uppercase italic tracking-tight font-serif leading-none drop-shadow-[0_4px_20px_rgba(59,130,246,0.3)]">
                FRIENDS LOUNGE
              </h2>
              <div className="flex items-center gap-4">
                <p className="text-xs sm:text-sm font-semibold text-white/60 uppercase tracking-wide">
                  {friendCount} / {maxFriends} Friends
                </p>
                {profile && !isGuest && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-white/40 uppercase tracking-wide">Your ID:</span>
                    <CopyUsername username={profile.username} discriminator={profile.discriminator} className="text-sm" />
                    <button
                      onClick={() => {
                        const shareUrl = `${window.location.origin}${window.location.pathname}?friend=${encodeURIComponent(profile.username || '')}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'Add me on XIII Cards!',
                            text: `Add me as a friend: ${profile.username}`,
                            url: shareUrl
                          }).catch(() => {
                            // Fallback to clipboard if share fails
                            navigator.clipboard.writeText(shareUrl);
                          });
                        } else {
                          // Fallback to clipboard
                          navigator.clipboard.writeText(shareUrl);
                        }
                      }}
                      className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-300 text-[10px] font-bold uppercase tracking-wide transition-all"
                      title="Share My ID"
                    >
                      Share
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border-2 border-white/20 hover:border-white/30 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95 group backdrop-blur-sm shadow-lg shrink-0"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mt-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={isGuest || !profile ? "Sign in to search for users..." : "Search or add by handle (e.g., Name#1234)..."}
              disabled={isGuest || !profile}
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {searchQuery && !isGuest && profile && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm font-semibold">
              {error}
            </div>
          )}

          {searchQuery.trim() ? (
            // Show search results when searching
            <div className="space-y-3">
              {loading && searchResults.length === 0 ? (
                <div className="text-center py-12 text-white/50">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-white/50">No users found</p>
                  {isValidHandle && (
                    <button
                      onClick={handleAddByHandle}
                      disabled={loading}
                      className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl text-blue-300 text-sm font-bold uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add by Handle
                    </button>
                  )}
                </div>
              ) : (
                searchResults.map((user) => {
                  const userLevel = calculateLevel(user.xp || 0);
                  return (
                    <div
                      key={user.id}
                      className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center shrink-0">
                            {user.avatar_url ? (
                              <span className="text-xl sm:text-2xl">{user.avatar_url}</span>
                            ) : (
                              <DefaultAvatarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400/70" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CopyUsername username={user.username} className="text-base sm:text-lg" />
                              <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                Lv {userLevel}
                              </span>
                            </div>
                            <p className="text-xs text-white/50 mt-1">
                              {user.wins || 0} wins • {user.games_played || 0} games
                            </p>
                          </div>
                        </div>
                        {profile && user.id === profile.id ? (
                          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/30 text-xs font-bold uppercase tracking-wide">
                            You
                          </div>
                        ) : friendCount >= maxFriends ? (
                          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/30 text-xs font-bold uppercase tracking-wide">
                            Limit
                          </div>
                        ) : pendingRequests.has(user.id) ? (
                          <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-xl text-yellow-300 text-xs font-bold uppercase tracking-wide">
                            Pending
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddFriend(user.id)}
                            disabled={loading || pendingRequests.has(user.id)}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl text-blue-300 text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            // Show friends list when not searching
            <div className="space-y-3">
              {loading && friends.length === 0 ? (
                <div className="text-center py-12 text-white/50">Loading friends...</div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/50 text-sm mb-4">No friends yet</p>
                  <p className="text-white/30 text-xs">Search for users to add as friends</p>
                </div>
              ) : (
                friends.map((friendship) => {
                  const friend = friendship.friend;
                  if (!friend) return null;
                  const friendLevel = calculateLevel(friend.xp || 0);
                  
                  return (
                    <div
                      key={friendship.id}
                      className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center shrink-0">
                            {friend.avatar_url ? (
                              <span className="text-xl sm:text-2xl">{friend.avatar_url}</span>
                            ) : (
                              <DefaultAvatarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400/70" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CopyUsername username={friend.username} className="text-base sm:text-lg" />
                              <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                Lv {friendLevel}
                              </span>
                            </div>
                            <p className="text-xs text-white/50 mt-1">
                              {friend.wins || 0} wins • {friend.games_played || 0} games
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-300 text-xs font-bold uppercase tracking-wide transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
