import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { UserProfile, Emote } from '../types';
import { getFriends, addFriend, removeFriend, searchUsers, getUserByHandle, Friendship, getPendingRequests, acceptFriend, declineFriend, cancelSentRequest } from '../services/supabase';
import { calculateLevel } from '../services/supabase';
import { CopyUsername } from './CopyUsername';
import { parseUsername } from '../utils/username';
import { socket, connectSocket } from '../services/socket';
import { SocketEvents } from '../types';
import { supabase } from '../src/lib/supabase';
import { Toast } from './Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { VisualEmote } from './VisualEmote';
import { PlayerProfileModal } from './PlayerProfileModal';
import { CreateLobbyModal } from './CreateLobbyModal';

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
  onPendingCountChange?: (count: number) => void;
  onInviteFriend?: (friendId: string) => void;
  currentRoomId?: string;
  remoteEmotes?: Emote[];
}

export const FriendsLounge: React.FC<FriendsLoungeProps> = ({ 
  onClose, 
  profile, 
  onRefreshProfile, 
  isGuest,
  onInviteFriend,
  currentRoomId,
  onPendingCountChange,
  remoteEmotes = []
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
  // Differential status tracking - only update individual friend statuses
  const [friendStatuses, setFriendStatuses] = useState<Record<string, 'online' | 'offline' | 'in_game'>>({});
  const [friendPresence, setFriendPresence] = useState<Map<string, { status: 'online' | 'in_game'; roomId?: string }>>(new Map());
  const [activeTab, setActiveTab] = useState<'friends' | 'sent' | 'received'>('friends');
  const [newRequestNotification, setNewRequestNotification] = useState<{ id: string; senderName: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{ id: string; name: string; avatar: string } | null>(null);
  const [selectedFriendForInvite, setSelectedFriendForInvite] = useState<UserProfile | null>(null);
  const [showCreateLobbyModal, setShowCreateLobbyModal] = useState(false);
  const subscriptionRef = useRef<any>(null);
  
  // Track pending count for badge
  const pendingCount = pendingReceived.length;
  
  // Notify parent of pending count changes
  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [pendingCount, onPendingCountChange]);

  // FIX THE INFINITE LOOP: Use useCallback for loadFriends to prevent unnecessary re-renders
  const loadFriends = useCallback(async () => {
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
  }, [profile?.id, isGuest]);

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
  }, [profile?.id, isGuest, loadFriends]);

  // Request initial statuses on mount - ONLY after socket is connected AND authenticated
  useEffect(() => {
    if (!socket || isGuest || !profile) return;

    let hasRequested = false; // Prevent duplicate requests
    let isAuthenticated = false;
    let handleInitialStatusesEventRef: ((data: { statuses: Record<string, 'online' | 'in_game'> }) => void) | null = null;

    // INITIAL STATUS FETCH: Add a 'socket.on("initial_statuses", (data) => { ... })' listener
    // This listener should be set up once and persist
    const setupInitialStatusesListener = () => {
      if (handleInitialStatusesEventRef) {
        socket.off('initial_statuses', handleInitialStatusesEventRef);
      }
      
      handleInitialStatusesEventRef = (data: { statuses: Record<string, 'online' | 'in_game'> }) => {
        console.log('📥 Received initial_statuses event (raw data):', data);
        console.log('📥 Statuses object keys:', Object.keys(data.statuses || {}));
        console.log('📥 Statuses object values:', Object.entries(data.statuses || {}));
        
        // IMPORTANT: Log the 'data' received. If the server sends an object like { "083b...": "online" }, make sure you convert that to the proper state
        if (data?.statuses) {
          const updatedStatuses: Record<string, 'online' | 'offline' | 'in_game'> = {};
          Object.entries(data.statuses).forEach(([userId, status]) => {
            // Convert status to proper format - ensure it's a string
            updatedStatuses[userId] = (typeof status === 'string' ? status : (status ? 'online' : 'offline')) as 'online' | 'offline' | 'in_game';
          });
          
          setFriendStatuses(prev => {
            const merged = { ...prev, ...updatedStatuses };
            console.log('📋 Updated friendStatuses from initial_statuses event:', merged);
            return merged;
          });
        }
      };
      
      socket.on('initial_statuses', handleInitialStatusesEventRef);
      console.log('✅ Registered initial_statuses event listener');
    };

    // SEQUENTIAL AUTHENTICATION: Wait for auth_ready event (fires after userId is mapped in onlineUsers Map)
    const handleAuthReady = (data: { userId: string }) => {
      if (data.userId === profile.id) {
        isAuthenticated = true;
        console.log('✅ Auth ready confirmed - userId is mapped in server, can now request initial statuses');
        // Set up the listener before requesting
        setupInitialStatusesListener();
        // Trigger status request if socket is connected
        if (socket.connected && !hasRequested) {
          requestInitialStatuses();
        }
      }
    };
    
    // Also listen for authenticated_success as fallback
    const handleAuthenticatedSuccess = (data: { userId: string }) => {
      if (data.userId === profile.id && !isAuthenticated) {
        console.log('✅ Authentication success received (fallback)');
        // Set up the listener
        setupInitialStatusesListener();
        // Wait a bit for auth_ready, but if it doesn't come, proceed anyway
        setTimeout(() => {
          if (!isAuthenticated && socket.connected && !hasRequested) {
            console.log('⏳ Auth ready not received, proceeding with status request...');
            isAuthenticated = true;
            requestInitialStatuses();
          }
        }, 500);
      }
    };

    const requestInitialStatuses = () => {
      // Verify socket is actually connected before requesting
      if (!socket.connected) {
        console.warn('⚠️ Socket not connected when requesting initial statuses');
        return;
      }

      // Verify authentication completed
      if (!isAuthenticated) {
        console.warn('⚠️ Not authenticated yet, cannot request initial statuses');
        return;
      }
      
      // Prevent duplicate requests
      if (hasRequested) {
        console.log('📋 Initial statuses already requested, skipping...');
        return;
      }
      
      hasRequested = true;
      console.log('📡 Requesting initial statuses for', friends.length, 'friends');
      
      // Get friend IDs to send to server - ensure we include all friend IDs
      const friendIds = new Set(friends.map(f => f.friend_id).filter(Boolean));
      const friendIdsArray = Array.from(friendIds);
      
      // REQUEST_INITIAL_STATUSES LOGGING: Log each friend ID being requested
      friendIdsArray.forEach(friendId => {
        console.log(`📡 Emitting request_initial_statuses for: [${friendId}]`);
      });
      console.log('📡 Socket Status Request: Sending IDs', friendIdsArray);
      
      if (friendIds.size === 0) {
        console.warn('⚠️ No friend IDs to send - friends list may be empty or friend_id is missing');
        console.warn('⚠️ Friends array:', friends);
      }
      
      socket.emit(SocketEvents.GET_INITIAL_STATUSES, (response: { statuses: Record<string, 'online' | 'in_game'> }) => {
        console.log('📥 Received initial_statuses callback (raw response):', response);
        if (response?.statuses) {
          // Filter statuses to only include friends
          const filteredStatuses: Record<string, 'online' | 'in_game'> = {};
          Object.entries(response.statuses).forEach(([userId, status]) => {
            if (friendIds.has(userId)) {
              filteredStatuses[userId] = status;
            }
          });
          
          // FORCED BROADCAST: Log if count is 0
          if (Object.keys(filteredStatuses).length === 0) {
            console.warn('⚠️ FORCED BROADCAST: Initial statuses returned 0 friends online');
            console.warn('⚠️ Friend IDs sent to server:', Array.from(friendIds));
            console.warn('⚠️ Response statuses received:', response.statuses);
            if (friendIds.size === 0) {
              console.error('❌ ISSUE: friendIds is empty - the Supabase fetch may have failed');
            } else {
              console.warn('⚠️ friendIds is not empty, but no friends are showing as online');
              console.warn('⚠️ This suggests the server may not have the friends in onlineUsers Map');
            }
          }
          
          // STATUS STATE UPDATE: Ensure status is correctly updated
          // Status should be a string ('online' | 'offline' | 'in_game'), not boolean
          setFriendStatuses(prev => {
            const updated = { ...prev };
            Object.entries(filteredStatuses).forEach(([userId, status]) => {
              // Ensure status is a string, not boolean
              updated[userId] = status as 'online' | 'offline' | 'in_game';
            });
            console.log('📋 Updated friendStatuses state:', updated);
            return updated;
          });
          
          // Also update presence map
          const presenceMap = new Map<string, { status: 'online' | 'in_game'; roomId?: string }>();
          Object.entries(filteredStatuses).forEach(([userId, status]) => {
            presenceMap.set(userId, { status });
          });
          setFriendPresence(presenceMap);
          
          console.log('📋 Initial statuses received:', Object.keys(filteredStatuses).length, 'friends online out of', friends.length, 'total friends');
          console.log('📋 Friend IDs:', Array.from(friendIds));
          console.log('📋 Online friend IDs:', Object.keys(filteredStatuses));
        } else {
          console.warn('⚠️ No statuses in response:', response);
        }
      });
    };

    // Listen for auth_ready event (primary) and authenticated_success (fallback)
    socket.on(SocketEvents.AUTH_READY, handleAuthReady);
    socket.on(SocketEvents.AUTHENTICATED_SUCCESS, handleAuthenticatedSuccess);

    // Wait for socket connection AND authentication before requesting statuses
    const handleConnect = () => {
      if (!socket.connected) {
        console.warn('⚠️ Socket connect event fired but socket.connected is false');
        return;
      }
      
      // TEST BOTH SIDES: Log socket ID when connected
      console.log(`✅ Socket connected, Socket ID is: [${socket.id}]`);
      console.log('✅ Socket connected, waiting for authentication...');
      // Don't request statuses yet - wait for authenticated_success
    };

    socket.on('connect', handleConnect);
    
    // If socket is already connected, check if we're authenticated
    if (socket.connected) {
      console.log('📡 Socket already connected, checking authentication status...');
      // Give a small delay to allow authentication to complete
      setTimeout(() => {
        if (isAuthenticated && !hasRequested) {
          requestInitialStatuses();
        }
      }, 500);
    } else {
      console.log('⏳ Socket not connected yet, waiting for connect event...');
    }
    
    // Set up initial_statuses listener if socket is already connected
    if (socket.connected) {
      setupInitialStatusesListener();
    } else {
      socket.once('connect', () => {
        setupInitialStatusesListener();
      });
    }
    
    // Cleanup: remove listeners on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off(SocketEvents.AUTH_READY, handleAuthReady);
      socket.off(SocketEvents.AUTHENTICATED_SUCCESS, handleAuthenticatedSuccess);
      if (handleInitialStatusesEventRef) {
        socket.off('initial_statuses', handleInitialStatusesEventRef);
      }
      hasRequested = false;
      isAuthenticated = false;
    };
  }, [socket, isGuest, profile?.id]); // FIX: Removed 'friends' from dependency array to prevent infinite loop

  // GLOBAL STATUS LISTENER: Ensure there is a 'socket.on("USER_STATUS_CHANGE", ...)' listener that is active as soon as the app mounts
  useEffect(() => {
    if (!socket || isGuest) return;

    const handleStatusChange = (data: { userId: string; status: 'online' | 'offline' | 'in_game'; roomId?: string }) => {
      const { userId, status, roomId } = data;
      
      console.log(`📡 USER_STATUS_CHANGE received: userId=${userId}, status=${status}, roomId=${roomId}`);
      
      // ADD DEBUG TOAST: Temporarily add a toast when USER_STATUS_CHANGE is received
      setToast({ 
        message: `Status change: ${userId} is now ${status}`, 
        type: 'info' 
      });
      setTimeout(() => setToast(null), 3000);
      
      // STATUS STATE UPDATE: Ensure status is correctly updated
      // When this event fires, it should update the 'statuses' state
      // Convert status to proper format: 'online' | 'offline' | 'in_game'
      const statusString = typeof status === 'string' ? status : (status ? 'online' : 'offline');
      
      // Update only this specific friend's status (differential update)
      setFriendStatuses(prev => {
        const updated = { ...prev, [userId]: statusString as 'online' | 'offline' | 'in_game' };
        console.log(`📋 Updated friendStatuses for ${userId}:`, updated[userId]);
        console.log(`📋 Full friendStatuses state:`, updated);
        return updated;
      });

      // Update presence map
      setFriendPresence(prev => {
        const updated = new Map(prev);
        if (status === 'offline' || statusString === 'offline') {
          updated.delete(userId);
        } else {
          updated.set(userId, { status: statusString as 'online' | 'in_game', roomId });
        }
        return updated;
      });
    };

    // Register the listener immediately
    socket.on(SocketEvents.USER_STATUS_CHANGE, handleStatusChange);
    console.log('✅ Registered USER_STATUS_CHANGE listener');

    return () => {
      socket.off(SocketEvents.USER_STATUS_CHANGE, handleStatusChange);
      console.log('🧹 Removed USER_STATUS_CHANGE listener');
    };
  }, [socket, isGuest]);


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
        async (payload: any) => {
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
                
                // Auto-switch to "Requests" tab if not already there
                if (activeTab !== 'received') {
                  setActiveTab('received');
                }
                
                // Trigger haptic feedback on iOS
                if (Capacitor.isNativePlatform()) {
                  try {
                    await Haptics.impact({ style: ImpactStyle.Medium });
                  } catch (e) {
                    // Haptics not available, ignore
                  }
                }
                
                // Reload pending requests (this will update pendingCount and trigger onPendingCountChange)
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
        async (payload: any) => {
          // Friend request was accepted or updated
          await loadFriends();
          await loadPendingRequests(); // This updates pendingCount
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'friendships',
          filter: `receiver_id=eq.${profile.id}`
        },
        async (payload: any) => {
          // Friend request was deleted (declined)
          await loadPendingRequests(); // This updates pendingCount
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
    const isPendingSent = pendingSent.some(f => (f.receiver_id || f.friend_id) === friendId);
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

  // Haptic feedback helper
  const triggerHaptic = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (e) {
        // Haptics not available, ignore
      }
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    if (!profile || isGuest) return;
    await triggerHaptic();
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
    await triggerHaptic();
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

  const handleCancelSentRequest = async (receiverId: string) => {
    if (!profile || isGuest) return;
    await triggerHaptic();
    try {
      const success = await cancelSentRequest(profile.id, receiverId);
      if (success) {
        await loadPendingRequests();
        setError(null);
        setToast({ message: 'Friend request canceled', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      } else {
        throw new Error('Failed to cancel friend request');
      }
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to cancel friend request';
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
      const success = await removeFriend(profile.id, friendId);
      if (success) {
        // FIX REMOVE FRIEND: Update local state immediately to remove friend from UI
        setFriends(prev => prev.filter(f => f.friend_id !== friendId));
        // Also remove from status tracking
        setFriendStatuses(prev => {
          const updated = { ...prev };
          delete updated[friendId];
          return updated;
        });
        setFriendPresence(prev => {
          const updated = new Map(prev);
          updated.delete(friendId);
          return updated;
        });
        console.log('✅ Friend removed successfully');
      } else {
        console.error('❌ Failed to remove friend');
      }
      // Optionally reload to ensure consistency
      // await loadFriends();
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
      if (targetUserId) {
        const userId = targetUserId; // Store in const for type narrowing
        setPendingRequests(prev => new Set(prev).add(userId));
      }
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
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-xs sm:text-sm font-semibold text-white/60 uppercase tracking-wide">
                  {friendCount} / {maxFriends} Friends
                </p>
                {pendingCount > 0 && (
                  <button
                    onClick={() => setShowRequestsModal(true)}
                    className="relative px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 rounded-xl text-red-300 text-xs sm:text-sm font-bold uppercase tracking-wide transition-all active:scale-95 flex items-center gap-2 group"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Friend Requests
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full border border-red-400/50 animate-[badgePulse_2s_ease-in-out_infinite]">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  </button>
                )}
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
          {/* Tab Navigation */}
          {!searchQuery.trim() && (
            <div className="mb-6 flex gap-2 border-b border-white/10 pb-2">
              <button
                onClick={() => setActiveTab('friends')}
                className={`relative px-4 py-2 text-sm font-bold uppercase tracking-wide transition-all ${
                  activeTab === 'friends'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                Friends
                {pendingCount > 0 && activeTab !== 'friends' && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black/20">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={`relative px-4 py-2 text-sm font-bold uppercase tracking-wide transition-all ${
                  activeTab === 'received'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                Requests
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black/20 animate-[badgePulse_2s_ease-in-out_infinite]">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`relative px-4 py-2 text-sm font-bold uppercase tracking-wide transition-all ${
                  activeTab === 'sent'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                Sent
                {pendingSent.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500/80 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black/20">
                    {pendingSent.length > 9 ? '9+' : pendingSent.length}
                  </span>
                )}
              </button>
            </div>
          )}

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
                          <div 
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:border-blue-400/70 transition-colors"
                            onClick={() => {
                              const parsedName = parseUsername(user.username, user.discriminator);
                              setSelectedProfile({
                                id: user.id,
                                name: parsedName.full,
                                avatar: user.avatar_url || ''
                              });
                            }}
                          >
                            {user.avatar_url ? (
                              <VisualEmote 
                                trigger={user.avatar_url} 
                                remoteEmotes={remoteEmotes} 
                                size="sm"
                                className="w-full h-full"
                              />
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
                        ) : pendingRequests.has(user.id) || pendingSent.some(f => (f.receiver_id || f.friend_id) === user.id) ? (
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
                      <motion.div 
                        className="space-y-2"
                        layout
                      >
                        <AnimatePresence mode="popLayout">
                          {pendingReceived.map((request) => {
                            const sender = request.friend;
                            if (!sender) return null;
                            const senderLevel = calculateLevel(sender.xp || 0);
                            
                            return (
                              <motion.div
                                key={request.id}
                                layout
                                initial={{ opacity: 0, x: 100, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                exit={{ opacity: 0, x: -100, height: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/20 overflow-hidden"
                              >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div 
                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:border-blue-400/70 transition-colors"
                                    onClick={() => {
                                      const parsedName = parseUsername(sender.username, sender.discriminator);
                                      setSelectedProfile({
                                        id: sender.id,
                                        name: parsedName.full,
                                        avatar: sender.avatar_url || ''
                                      });
                                    }}
                                  >
                                    {sender.avatar_url ? (
                                      <VisualEmote 
                                        trigger={sender.avatar_url} 
                                        remoteEmotes={remoteEmotes} 
                                        size="sm"
                                        className="w-full h-full"
                                      />
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
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </motion.div>
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
                  
                  // UI RENDER CHECK: Ensure the 'isOnline' prop is being pulled from the 'statuses' object using the friend's ID
                  // Check both string and boolean formats for compatibility
                  const friendStatus = friendStatuses[friend.id];
                  // Convert to boolean: if status is 'online' or 'in_game', friend is online
                  // Handle both string and boolean/truthy formats
                  const isOnline = friendStatus === 'online' || friendStatus === 'in_game' || (friendStatus && friendStatus !== 'offline');
                  const presence = friendPresence.get(friend.id);
                  const isInGame = friendStatus === 'in_game' || presence?.status === 'in_game';
                  
                  // ONLINE STATUS RENDER: Log the status for each friend
                  console.log(`Rendering Friend [${friend.id}]: Status from friendStatuses[${friend.id}] is [${friendStatus}] (isOnline: ${isOnline}, isInGame: ${isInGame})`);
                  console.log(`Rendering Friend [${friend.id}]: Full friendStatuses object:`, friendStatuses);
                  
                  return (
                    <div
                      key={friendship.id}
                      className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all"
                    >
                        <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div 
                              className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:border-blue-400/70 transition-colors"
                              onClick={() => {
                                const parsedName = parseUsername(friend.username, friend.discriminator);
                                setSelectedProfile({
                                  id: friend.id,
                                  name: parsedName.full,
                                  avatar: friend.avatar_url || ''
                                });
                              }}
                            >
                            {friend.avatar_url ? (
                              <VisualEmote 
                                trigger={friend.avatar_url} 
                                remoteEmotes={remoteEmotes} 
                                size="sm"
                                className="w-full h-full"
                              />
                            ) : (
                              <DefaultAvatarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400/70" />
                            )}
                              {/* Online indicator */}
                              {isOnline && (
                                <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-[#0a0a0a] rounded-full ${
                                  isInGame ? 'bg-yellow-500' : 'bg-green-500'
                                }`}></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CopyUsername username={friend.username} discriminator={friend.discriminator} className="text-base sm:text-lg" />
                              <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                Lv {friendLevel}
                              </span>
                                {isOnline && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    isInGame 
                                      ? 'text-yellow-400 bg-yellow-500/20' 
                                      : 'text-green-400 bg-green-500/20'
                                  }`}>
                                    {isInGame ? 'Playing...' : 'Online'}
                                  </span>
                                )}
                            </div>
                            <p className="text-xs text-white/50 mt-1">
                              {friend.wins || 0} wins • {friend.games_played || 0} games
                            </p>
                          </div>
                        </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Online status indicator - green circle if online, gray if offline */}
                            {isOnline ? (
                              <div className={`w-3 h-3 rounded-full ${
                                isInGame ? 'bg-yellow-500' : 'bg-green-500'
                              }`} title={isInGame ? 'Playing...' : 'Online'}></div>
                            ) : (
                              <div className="w-3 h-3 rounded-full border-2 border-white/20" title="Offline"></div>
                            )}
                            
                            {/* Invite button - opens Create Lobby modal */}
                            <button
                              onClick={() => {
                                setSelectedFriendForInvite(friend);
                                setShowCreateLobbyModal(true);
                              }}
                              disabled={!isOnline}
                              className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-xl text-green-300 text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isOnline ? "Invite to Game" : "Friend is offline"}
                            >
                              Invite
                            </button>
                      </div>
                    </div>
                      </div>
                    );
                  })}
                </>
              ) : null}
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
                              <div 
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:border-blue-400/70 transition-colors"
                                onClick={() => {
                                  const parsedName = parseUsername(friend.username, friend.discriminator);
                                  setSelectedProfile({
                                    id: friend.id,
                                    name: parsedName.full,
                                    avatar: friend.avatar_url || ''
                                  });
                                }}
                              >
                                {friend.avatar_url ? (
                                  <VisualEmote 
                                    trigger={friend.avatar_url} 
                                    remoteEmotes={remoteEmotes} 
                                    size="sm"
                                    className="w-full h-full"
                                  />
                                ) : (
                                  <DefaultAvatarIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400/70" />
          )}
        </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CopyUsername username={friend.username} discriminator={friend.discriminator} className="text-base sm:text-lg" />
                                  <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
                                    Lv {friendLevel}
                                  </span>
      </div>
                                <p className="text-xs text-yellow-400/70 mt-1">Request pending...</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleCancelSentRequest(friend.id)}
                                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-300 text-xs font-bold uppercase tracking-wide transition-all active:scale-95 flex items-center gap-1.5"
                                title="Cancel Request"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancel
                              </button>
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

      {/* Player Profile Modal */}
      {selectedProfile && profile && (
        <PlayerProfileModal
          playerId={selectedProfile.id}
          playerName={selectedProfile.name}
          playerAvatar={selectedProfile.avatar}
          currentUserId={profile.id}
          onClose={() => setSelectedProfile(null)}
          onRefreshProfile={onRefreshProfile}
        />
      )}

      {/* Friend Requests Modal */}
      {showRequestsModal && (
        <div 
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4 animate-in fade-in duration-300"
          onClick={() => setShowRequestsModal(false)}
        >
          <div 
            className="relative border border-white/20 w-full max-w-md max-h-[80vh] rounded-3xl overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#000000]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative z-10 p-6 sm:p-8 border-b border-white/20 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-400 via-red-300 to-red-500 uppercase italic tracking-tight font-serif leading-none">
                  Friend Requests
                </h2>
                <button
                  onClick={() => setShowRequestsModal(false)}
                  className="w-10 h-10 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border-2 border-white/20 hover:border-white/30 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {pendingCount > 0 && (
                <p className="text-sm text-white/60 mt-2">
                  {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Modal Content */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6 sm:p-8">
              {loading && pendingReceived.length === 0 ? (
                <div className="text-center py-12 text-white/50">Loading requests...</div>
              ) : pendingReceived.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/50 text-sm mb-2">No pending requests</p>
                  <p className="text-white/30 text-xs">All caught up!</p>
                </div>
              ) : (
                <motion.div 
                  className="space-y-3"
                  layout
                >
                  <AnimatePresence mode="popLayout">
                    {pendingReceived.map((request) => {
                      const sender = request.friend;
                      if (!sender) return null;
                      const senderLevel = calculateLevel(sender.xp || 0);
                      
                      return (
                        <motion.div
                          key={request.id}
                          layout
                          initial={{ opacity: 0, x: 100, height: 0 }}
                          animate={{ opacity: 1, x: 0, height: 'auto' }}
                          exit={{ opacity: 0, x: -100, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl p-4 hover:border-white/20 overflow-hidden"
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
                                onClick={async () => {
                                  await handleAcceptRequest(sender.id);
                                  // Close modal if no more requests
                                  if (pendingReceived.length === 1) {
                                    setTimeout(() => setShowRequestsModal(false), 500);
                                  }
                                }}
                                className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-xl text-green-300 text-xs font-bold uppercase tracking-wide transition-all active:scale-95 flex items-center gap-1.5"
                                title="Accept"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Accept
                              </button>
                              <button
                                onClick={async () => {
                                  await handleDeclineRequest(sender.id);
                                  // Close modal if no more requests
                                  if (pendingReceived.length === 1) {
                                    setTimeout(() => setShowRequestsModal(false), 500);
                                  }
                                }}
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
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Player Profile Modal */}
      {selectedProfile && profile && (
        <PlayerProfileModal
          playerId={selectedProfile.id}
          playerName={selectedProfile.name}
          playerAvatar={selectedProfile.avatar}
          currentUserId={profile.id}
          onClose={() => setSelectedProfile(null)}
          onRefreshProfile={onRefreshProfile}
          onFriendRemoved={() => {
            loadFriends();
            setSelectedProfile(null);
          }}
        />
      )}

      {/* Create Lobby Modal */}
      {selectedFriendForInvite && (
        <CreateLobbyModal
          isOpen={showCreateLobbyModal}
          friendName={parseUsername(selectedFriendForInvite.username, selectedFriendForInvite.discriminator).full}
          friendId={selectedFriendForInvite.id}
          onClose={() => {
            setShowCreateLobbyModal(false);
            setSelectedFriendForInvite(null);
          }}
          onLobbyCreated={(roomId) => {
            // Navigate to lobby - this will be handled by App.tsx
            window.location.href = `/game/${roomId}`;
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.9; }
        }
      `}} />
    </div>
  );
};
