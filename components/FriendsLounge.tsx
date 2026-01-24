import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserProfile } from '../types';
import { getFriends, addFriend, removeFriend, searchUsers, getUserByHandle, Friendship, getPendingRequests, acceptFriend, declineFriend } from '../services/supabase';
import { calculateLevel } from '../services/supabase';
import { CopyUsername } from './CopyUsername';
import { parseUsername } from '../utils/username';
import { socket, connectSocket } from '../services/socket';
import { SocketEvents } from '../types';
import { supabase } from '../src/lib/supabase';
import { Toast } from './Toast';

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

export const FriendsLounge: React.FC<FriendsLoungeProps> = ({ 
  onClose, 
  profile, 
  onRefreshProfile, 
  isGuest,
  onInviteFriend,
  currentRoomId
}) => {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingSent, setPendingSent] = useState<Friendship[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set()); // Track requests being sent
  const [onlineFriends, setOnlineFriends] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'friends' | 'sent' | 'received'>('friends');
  const [newRequestNotification, setNewRequestNotification] = useState<{ id: string; senderName: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (profile && !isGuest) {
      loadFriends();
      loadPendingRequests();
      setupRealtimeSubscription();
    }
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
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

  const loadPendingRequests = async () => {
    if (!profile || isGuest) return;
    try {
      const { sent, received } = await getPendingRequests(profile.id);
      setPendingSent(sent);
      setPendingReceived(received);
    } catch (e) {
      console.error('Error loading pending requests:', e);
    }
  };

  // Setup Supabase Realtime subscription for friend requests
  const setupRealtimeSubscription = () => {
    if (!profile || isGuest || subscriptionRef.current) return;
    
    subscriptionRef.current = supabase
      .channel('friend_requests')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `receiver_id=eq.${profile.id}`
        },
        async (payload) => {
          // New friend request received
          console.log('📨 New friend request received:', payload);
          
          // Fetch sender profile to show in notification
          const senderId = payload.new.sender_id;
          if (senderId) {
            try {
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('username, discriminator')
                .eq('id', senderId)
                .single();
              
              if (senderProfile) {
                const senderName = parseUsername(senderProfile.username || '', senderProfile.discriminator).full;
                setNewRequestNotification({ id: payload.new.id, senderName });
                
                // Show toast notification
                setToast({ message: `New friend request from ${senderName}!`, type: 'info' });
                setTimeout(() => setToast(null), 5000);
                
                // Reload pending requests
                await loadPendingRequests();
                
                // Auto-dismiss notification after 5 seconds
                setTimeout(() => {
                  setNewRequestNotification(null);
                }, 5000);
              }
            } catch (e) {
              console.error('Error fetching sender profile:', e);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friendships',
          filter: `receiver_id=eq.${profile.id}`
        },
        async (payload) => {
          // Friend request was accepted
          if (payload.new.status === 'accepted') {
            await loadFriends();
            await loadPendingRequests();
          }
        }
      )
      .subscribe();
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
      // Normalize the handle from URL (decode and trim)
      const normalizedHandle = decodeURIComponent(friendParam).trim();
      setSearchQuery(normalizedHandle);
      
      // If it looks like a valid handle (has # and 4-digit discriminator), try to add by handle
      if (normalizedHandle.includes('#')) {
        const parts = normalizedHandle.split('#');
        if (parts.length === 2 && /^\d{4}$/.test(parts[1].trim())) {
          // Valid handle format - try to add by handle after a delay
          const addTimeout = setTimeout(() => {
            handleAddByHandle();
          }, 300);
          // Clean up URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          return () => clearTimeout(addTimeout);
        }
      }
      
      // Otherwise, trigger regular search
      const searchTimeout = setTimeout(() => {
        handleSearch(normalizedHandle);
      }, 200);
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      return () => clearTimeout(searchTimeout);
    }
  }, [isGuest, profile, friends.length]); // Only run when friends list is loaded

  const handleAddFriend = async (friendId: string) => {
    if (!profile || isGuest || friendId === profile.id) return; // Self-check
    
    // Validate friendId is a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(friendId)) {
      setError('Invalid user ID. Please search for the user again.');
      return;
    }
    
    // Check if already friends or request pending
    const isAlreadyFriend = friends.some(f => f.friend_id === friendId);
    const isPendingSent = pendingSent.some(f => f.friend_id === friendId);
    const isPendingReceived = pendingReceived.some(f => (f.sender_id || f.user_id) === friendId);
    
    if (isAlreadyFriend) {
      setError('You are already friends with this user.');
      return;
    }
    
    if (isPendingSent) {
      setError('Friend request already sent.');
      return;
    }
    
    if (isPendingReceived) {
      // Auto-accept if they sent us a request
      try {
        await acceptFriend(profile.id, friendId);
        await loadFriends();
        await loadPendingRequests();
        setError(null);
      } catch (e: any) {
        setError(e.message || 'Failed to accept friend request');
      }
      return;
    }
    
    // Set loading state
    setSendingRequests(prev => new Set(prev).add(friendId));
    setError(null);
    
    try {
      // STEP 1: Use profile.id as sender_id (profile must exist in profiles table)
      if (!profile || !profile.id) {
        const errorMsg = 'Profile not found. Please initialize your profile first.';
        console.error('❌ Profile missing:', { profile });
        setError(errorMsg);
        setToast({ message: errorMsg, type: 'error' });
        setTimeout(() => setToast(null), 3000);
        setSendingRequests(prev => {
            const next = new Set(prev);
            next.delete(friendId);
            return next;
          });
        return;
      }
      
      const myUuid = profile.id;
      
      // STEP 2: Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(myUuid) || !uuidRegex.test(friendId)) {
        const errorMsg = 'Invalid user ID format.';
        setError(errorMsg);
        setSendingRequests(prev => {
          const next = new Set(prev);
          next.delete(friendId);
          return next;
        });
        return;
      }
      
      console.log(`📝 Attempting Friend Request: [${myUuid}] -> [${friendId}]`);
      
      // STEP 3: Perform insert
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({ 
          sender_id: myUuid, 
          receiver_id: friendId, 
          status: 'pending' 
        });
      
      console.log('📝 Insert Result:', { error: insertError });
      
      if (insertError) {
        // Detailed error logging
        console.error('❌ INSERT ERROR DETAILS:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          fullError: insertError
        });
        
        let errorMsg = 'Failed to send friend request.';
        
        if (insertError.code === '23505') {
          errorMsg = 'Friend request already pending or accepted.';
          console.warn('⚠️ Duplicate key error (23505): Request already exists');
        } else if (insertError.code === '42501') {
          errorMsg = 'RLS Policy Violation: The RLS policy is blocking this insert.';
          console.error('🚫 RLS POLICY VIOLATION (42501): Check Supabase Inbound/Insert policies for friendships table.');
        } else if (insertError.code === '23503') {
          errorMsg = 'Foreign Key Violation: The friend UUID does not exist.';
          console.error('🔗 FOREIGN KEY VIOLATION (23503): Receiver UUID not found in profiles');
        }
        
        setError(errorMsg);
        setToast({ message: errorMsg, type: 'error' });
        setTimeout(() => setToast(null), 3000);
        
        // Error already shown via toast
      } else {
        // SUCCESS: No error from Supabase
        console.log('✅ Friend request inserted successfully!');
        
        await loadPendingRequests();
        // Remove from search results
        setSearchResults(prev => prev.filter(u => u.id !== friendId));
        setError(null);
        // Keep in pendingRequests to show "Request Sent" state
        setPendingRequests(prev => new Set(prev).add(friendId));
        // Clear search input on success
        setSearchQuery('');
        // Show success toast
        setToast({ message: 'Friend request sent!', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (e: any) {
      console.error('❌ handleAddFriend - Unexpected error:', e);
      const errorMsg = e.message || 'An unexpected error occurred.';
      setError(errorMsg);
      setToast({ message: errorMsg, type: 'error' });
      setTimeout(() => setToast(null), 3000);
      
      // Error already shown via toast
    } finally {
      // Remove from sending state
      setSendingRequests(prev => {
        const next = new Set(prev);
        next.delete(friendId);
        return next;
      });
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    if (!profile || isGuest) return;
    try {
      await acceptFriend(profile.id, friendId);
      await loadFriends();
      await loadPendingRequests();
      setError(null);
      setToast({ message: 'Friend request accepted!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to accept friend request';
      setError(errorMsg);
      setToast({ message: errorMsg, type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDeclineRequest = async (senderId: string) => {
    if (!profile || isGuest) return;
    try {
      await declineFriend(profile.id, senderId);
      await loadPendingRequests();
      setError(null);
      setToast({ message: 'Friend request declined', type: 'info' });
      setTimeout(() => setToast(null), 3000);
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to decline friend request';
      setError(errorMsg);
      setToast({ message: errorMsg, type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleInviteFriend = (friendId: string) => {
    if (!currentRoomId || !profile) {
      setError('You must be in a room to invite friends.');
      return;
    }
    
    const friend = friends.find(f => f.friend_id === friendId);
    if (!friend || !friend.friend) return;
    
    const inviterName = parseUsername(profile.username || '', profile.discriminator).full;
    
    // Emit invite to server
    socket.emit(SocketEvents.SEND_GAME_INVITE, {
      receiverId: friendId,
      roomId: currentRoomId,
      inviterName
    });
    
    if (onInviteFriend) {
      onInviteFriend(currentRoomId);
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

  /**
   * Search for a user by discriminator (USERNAME#1234 format)
   * Returns the user profile if found, null otherwise
   */
  const searchByDiscriminator = async (handle: string): Promise<UserProfile | null> => {
    try {
      // Split handle into username and discriminator
      const parts = handle.split('#');
      if (parts.length !== 2) {
        return null;
      }
      
      const username = parts[0].trim();
      const discriminator = parts[1].trim();
      
      // Validate discriminator is 4 digits
      if (!/^\d{4}$/.test(discriminator)) {
        return null;
      }
      
      // Query profiles table for BOTH username and discriminator
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username) // Case-insensitive username match
        .eq('discriminator', discriminator) // Exact discriminator match
        .maybeSingle();
      
      if (error) {
        console.error('❌ Error searching profiles:', error);
        return null;
      }
      
      if (!data) {
        return null;
      }
      
      return { ...data, gems: data.gems ?? 0, turn_timer_setting: data.turn_timer_setting ?? 0 } as UserProfile;
    } catch (e) {
      console.error('❌ searchByDiscriminator error:', e);
      return null;
    }
  };

  /**
   * Robust handle search and add function
   * Handles authentication, search, validation, and insert with detailed error logging
   */
  const handleSearchAndAdd = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a handle in the format: Name#1234');
      return;
    }
    
    // Set loading state immediately
    setLoading(true);
    setError(null);
    
    // Track which user we're adding (for button state)
    let targetUserId: string | null = null;
    
    try {
      // STEP 1: PROFILE CHECK - Use profile.id as sender_id (profile must exist in profiles table)
      console.log('🔐 Step 1: Checking profile...');
      
      if (!profile || !profile.id) {
        console.error('❌ Profile missing:', { profile });
        const errorMsg = 'Profile not found. Please initialize your profile first.';
        setError(errorMsg);
        setToast({ message: errorMsg, type: 'error' });
        setTimeout(() => setToast(null), 3000);
        setLoading(false);
        return;
      }
      
      const myUuid = profile.id;
      console.log('✅ Profile UUID:', myUuid);
      
      // STEP 2: SEARCH BY DISCRIMINATOR
      console.log('🔍 Step 2: Searching for user by handle...');
      const normalizedQuery = searchQuery.trim().replace(/\s+/g, ' ');
      
      // Validate handle format
      if (!normalizedQuery.includes('#')) {
        const errorMsg = 'Please enter a handle in the format: Name#1234';
        setError(errorMsg);
        setLoading(false);
        return;
      }
      
      const user = await searchByDiscriminator(normalizedQuery);
      
      if (!user || !user.id) {
        const errorMsg = 'User not found. Check the spelling and #0000.';
        setError(errorMsg);
        setToast({ message: errorMsg, type: 'error' });
        setTimeout(() => setToast(null), 3000);
        setLoading(false);
        return;
      }
      
      targetUserId = user.id;
      console.log('✅ Found user:', { id: user.id, username: user.username, discriminator: user.discriminator });
      
      // STEP 3: VALIDATE UUIDS
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(myUuid)) {
        const errorMsg = 'Invalid sender UUID format.';
        console.error('❌ Invalid sender UUID:', myUuid);
        setError(errorMsg);
        setToast({ message: errorMsg, type: 'error' });
        setTimeout(() => setToast(null), 3000);
        setLoading(false);
        return;
      }
      
      if (!uuidRegex.test(targetUserId)) {
        const errorMsg = 'Invalid receiver UUID format.';
        console.error('❌ Invalid receiver UUID:', targetUserId);
        setError(errorMsg);
        setToast({ message: errorMsg, type: 'error' });
        setTimeout(() => setToast(null), 3000);
        setLoading(false);
        return;
      }
      
      console.log(`📝 Attempting Friend Request: [${myUuid}] -> [${targetUserId}]`);
      
      // Check if trying to add self
      if (myUuid === targetUserId) {
        const errorMsg = 'You cannot add yourself as a friend.';
        setError(errorMsg);
        setLoading(false);
        return;
      }
      
      // Check if already friends
      const friendIds = new Set(friends.map(f => f.friend_id));
      if (friendIds.has(targetUserId)) {
        const errorMsg = 'You are already friends with this user.';
        setError(errorMsg);
        setLoading(false);
        return;
      }
      
      // STEP 4: PERFORM THE INSERT WITH DETAILED ERROR LOGGING
      console.log('💾 Step 4: Inserting friend request...');
      
      const { error: insertError } = await supabase
        .from('friendships')
        .insert({ 
          sender_id: myUuid, 
          receiver_id: targetUserId, 
          status: 'pending' 
        });
      
      // Log insert result
      console.log('📝 Insert Result:', { error: insertError });
      
      if (insertError) {
        // Detailed error logging
        console.error('❌ INSERT ERROR DETAILS:', {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          fullError: insertError
        });
        
        let errorMsg = 'Failed to send friend request.';
        
        // Handle specific error codes
        if (insertError.code === '23505') {
          errorMsg = 'Friend request already pending or accepted.';
          console.warn('⚠️ Duplicate key error (23505): Request already exists');
        } else if (insertError.code === '42501') {
          errorMsg = 'RLS Policy Violation: The RLS policy is blocking this insert. Check Supabase policies.';
          console.error('🚫 RLS POLICY VIOLATION (42501): Check Supabase Inbound/Insert policies for friendships table.');
        } else if (insertError.code === '23503') {
          errorMsg = 'Foreign Key Violation: The friend UUID does not exist in the profiles table.';
          console.error('🔗 FOREIGN KEY VIOLATION (23503): Receiver UUID not found in profiles');
        }
        
        // Show error to user
        setError(errorMsg);
        setToast({ message: errorMsg, type: 'error' });
        setTimeout(() => setToast(null), 3000);
        
        // Show alert on iOS for debugging
        // Error already shown via toast
        
        setLoading(false);
        return;
      }
      
      // SUCCESS: No error from Supabase
      console.log('✅ Friend request inserted successfully!');
      
      // Update UI state
      setPendingRequests(prev => new Set(prev).add(targetUserId));
      await loadPendingRequests();
      
      // Add to search results
      setSearchResults([user]);
      
      // Clear search input
      setSearchQuery('');
      
      // Show success message
      setError(null);
      setToast({ message: 'Friend request sent!', type: 'success' });
      setTimeout(() => setToast(null), 3000);
      
    } catch (e: any) {
      console.error('❌ handleSearchAndAdd - Unexpected error:', e);
      const errorMsg = e.message || 'An unexpected error occurred.';
      setError(errorMsg);
      setToast({ message: errorMsg, type: 'error' });
      setTimeout(() => setToast(null), 3000);
      
      // Error already shown via toast
    } finally {
      // Always clear loading state
      setLoading(false);
    }
  };

  // Keep handleAddByHandle for backward compatibility, but use handleSearchAndAdd
  const handleAddByHandle = handleSearchAndAdd;

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
                      onClick={async () => {
                        // Get full handle with discriminator
                        const parsed = parseUsername(profile.username || '', profile.discriminator);
                        const fullHandle = parsed.full;
                        const shareUrl = `${window.location.origin}${window.location.pathname}?friend=${encodeURIComponent(fullHandle)}`;
                        
                        if (navigator.share) {
                          navigator.share({
                            title: 'Add me on XIII Cards!',
                            text: `Add me as a friend: ${fullHandle}`,
                            url: shareUrl
                          }).catch(() => {
                            // Fallback to clipboard if share fails
                            navigator.clipboard.writeText(fullHandle);
                          });
                        } else {
                          // Fallback to clipboard - copy the full handle
                          try {
                            await navigator.clipboard.writeText(fullHandle);
                          } catch (err) {
                            // Final fallback
                            const textArea = document.createElement('textarea');
                            textArea.value = fullHandle;
                            textArea.style.position = 'fixed';
                            textArea.style.opacity = '0';
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                          }
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
          {/* New Friend Request Notification */}
          {newRequestNotification && (
            <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-xl text-blue-300 text-sm font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
              <span>
                📨 <span className="font-bold">{newRequestNotification.senderName}</span> sent you a friend request!
              </span>
              <button
                onClick={() => setNewRequestNotification(null)}
                className="ml-4 text-blue-300/70 hover:text-blue-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
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
                      onClick={handleSearchAndAdd}
                      disabled={loading}
                      className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl text-blue-300 text-sm font-bold uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
                    >
                      {loading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Searching...
                        </>
                      ) : (
                        'Add by Handle'
                      )}
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
                        ) : sendingRequests.has(user.id) ? (
                          <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-xl text-blue-300 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Loading...
                          </div>
                        ) : pendingRequests.has(user.id) || pendingSent.some(f => f.friend_id === user.id) ? (
                          <div className="px-4 py-2 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300 text-xs font-bold uppercase tracking-wide">
                            Sent!
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAddFriend(user.id)}
                            disabled={loading || sendingRequests.has(user.id) || pendingRequests.has(user.id)}
                            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-xl text-blue-300 text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            // Show friends/pending lists when not searching
            <div className="space-y-3">
              {activeTab === 'friends' && (
                <>
                  {/* Pending Requests Section - At the top of Friends list */}
                  {pendingReceived.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-white uppercase tracking-wide">Pending Requests</h3>
                        <span className="text-xs text-white/50 bg-blue-500/20 px-2 py-1 rounded-full">
                          {pendingReceived.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {pendingReceived.map((request) => {
                          const sender = request.friend;
                          if (!sender) return null;
                          const senderLevel = calculateLevel(sender.xp || 0);
                          
                          return (
                            <div
                              key={request.id}
                              className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center shrink-0">
                                    {sender.avatar_url ? (
                                      <span className="text-xl sm:text-2xl">{sender.avatar_url}</span>
                                    ) : (
                                      <DefaultAvatarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400/70" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <CopyUsername username={sender.username} discriminator={sender.discriminator} className="text-base sm:text-lg" />
                                      <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                        Lv {senderLevel}
                                      </span>
                                    </div>
                                    <p className="text-xs text-white/50 mt-1">Wants to be friends</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => handleAcceptRequest(sender.id)}
                                    className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-xl text-green-300 text-xs font-bold uppercase tracking-wide transition-all active:scale-95 flex items-center gap-1.5"
                                    title="Accept"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleDeclineRequest(sender.id)}
                                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-300 text-xs font-bold uppercase tracking-wide transition-all active:scale-95 flex items-center gap-1.5"
                                    title="Decline"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Decline
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Friends List */}
              {loading && friends.length === 0 && pendingReceived.length === 0 ? (
                <div className="text-center py-12 text-white/50">Loading friends...</div>
              ) : friends.length === 0 && pendingReceived.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/50 text-sm mb-4">No friends yet</p>
                  <p className="text-white/30 text-xs">Search for users to add as friends</p>
                </div>
              ) : friends.length > 0 ? (
                <>
                  {pendingReceived.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-3">Friends</h3>
                    </div>
                  )}
                  {friends.map((friendship) => {
                  const friend = friendship.friend;
                  if (!friend) return null;
                  const friendLevel = calculateLevel(friend.xp || 0);
                      const isOnline = onlineFriends.has(friend.id);
                  
                  return (
                    <div
                      key={friendship.id}
                      className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
                    >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center shrink-0">
                                {friend.avatar_url ? (
                                  <span className="text-xl sm:text-2xl">{friend.avatar_url}</span>
                                ) : (
                                  <DefaultAvatarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400/70" />
                                )}
                                {/* Online indicator */}
                                {isOnline && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-[#0a0a0a] rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CopyUsername username={friend.username} className="text-base sm:text-lg" />
                                  <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                    Lv {friendLevel}
                                  </span>
                                  {isOnline && (
                                    <span className="text-xs font-semibold text-green-400 bg-green-500/20 px-2 py-0.5 rounded-full">
                                      Online
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-white/50 mt-1">
                                  {friend.wins || 0} wins • {friend.games_played || 0} games
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {currentRoomId && (
                                <button
                                  onClick={() => handleInviteFriend(friend.id)}
                                  className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-xl text-green-300 text-xs font-bold uppercase tracking-wide transition-all"
                                  title="Invite to Game"
                                >
                                  Invite
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveFriend(friend.id)}
                                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-300 text-xs font-bold uppercase tracking-wide transition-all"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
              
              {activeTab === 'received' && (
                <>
                  {loading && pendingReceived.length === 0 ? (
                    <div className="text-center py-12 text-white/50">Loading requests...</div>
                  ) : pendingReceived.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-white/50 text-sm">No pending requests</p>
                    </div>
                  ) : (
                    pendingReceived.map((request) => {
                      const sender = request.friend;
                      if (!sender) return null;
                      const senderLevel = calculateLevel(sender.xp || 0);
                      
                      return (
                        <div
                          key={request.id}
                          className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center shrink-0">
                                {sender.avatar_url ? (
                                  <span className="text-xl sm:text-2xl">{sender.avatar_url}</span>
                                ) : (
                                  <DefaultAvatarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400/70" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CopyUsername username={sender.username} discriminator={sender.discriminator} className="text-base sm:text-lg" />
                                  <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                    Lv {senderLevel}
                                  </span>
                                </div>
                                <p className="text-xs text-white/50 mt-1">Wants to be friends</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleAcceptRequest(sender.id)}
                                className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-xl text-green-300 text-xs font-bold uppercase tracking-wide transition-all active:scale-95 flex items-center gap-1.5"
                                title="Accept"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Accept
                              </button>
                              <button
                                onClick={() => handleDeclineRequest(sender.id)}
                                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-300 text-xs font-bold uppercase tracking-wide transition-all active:scale-95 flex items-center gap-1.5"
                                title="Decline"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
              
              {activeTab === 'sent' && (
                <>
                  {loading && pendingSent.length === 0 ? (
                    <div className="text-center py-12 text-white/50">Loading sent requests...</div>
                  ) : pendingSent.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-white/50 text-sm">No pending sent requests</p>
                    </div>
                  ) : (
                    pendingSent.map((request) => {
                      const friend = request.friend;
                      if (!friend) return null;
                      const friendLevel = calculateLevel(friend.xp || 0);
                      
                      return (
                        <div
                          key={request.id}
                          className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
                        >
                          <div className="flex items-center justify-between gap-4">
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
                                <p className="text-xs text-yellow-400/70 mt-1">Request pending...</p>
                              </div>
                            </div>
                            <div className="px-3 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-xl text-yellow-300 text-xs font-bold uppercase tracking-wide">
                              Pending
                            </div>
                      </div>
                    </div>
                  );
                })
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
