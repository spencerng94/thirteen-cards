import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../services/socket';
import { SocketEvents } from '../types';
import { getFriends, Friendship } from '../services/supabase';
import { UserProfile } from '../types';
import { parseUsername } from '../utils/username';
import { VisualEmote } from './VisualEmote';
import { CopyUsername } from './CopyUsername';

interface InviteFriendsModalProps {
  isOpen: boolean;
  roomId: string;
  roomName?: string;
  currentUserId: string;
  onClose: () => void;
  onInviteSent?: () => void;
  remoteEmotes?: any[];
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({
  isOpen,
  roomId,
  roomName,
  currentUserId,
  onClose,
  onInviteSent,
  remoteEmotes = []
}) => {
  const [friends, setFriends] = useState<Friendship[]>([]);
  // Differential status tracking - only update individual friend statuses
  const [friendStatuses, setFriendStatuses] = useState<Record<string, 'online' | 'offline' | 'in_game'>>({});
  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);

  // Load friends list
  useEffect(() => {
    if (!isOpen || !currentUserId || currentUserId === 'guest') return;
    
    const loadFriends = async () => {
      setLoading(true);
      try {
        const friendsList = await getFriends(currentUserId);
        setFriends(friendsList);
      } catch (e) {
        console.error('Error loading friends:', e);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [isOpen, currentUserId]);

  // Request initial statuses on mount
  useEffect(() => {
    if (!isOpen || !currentUserId || currentUserId === 'guest') return;

    const requestInitialStatuses = () => {
      socket.emit(SocketEvents.GET_INITIAL_STATUSES, (response: { statuses: Record<string, 'online' | 'in_game'> }) => {
        if (response?.statuses) {
          setFriendStatuses(response.statuses);
        }
      });
    };

    if (socket.connected) {
      requestInitialStatuses();
    } else {
      socket.once('connect', requestInitialStatuses);
    }
  }, [isOpen, currentUserId]);

  // Listen for differential status changes
  useEffect(() => {
    if (!isOpen) return;

    const handleStatusChange = (data: { userId: string; status: 'online' | 'offline' | 'in_game'; roomId?: string }) => {
      const { userId, status } = data;
      
      // Update only this specific friend's status (differential update)
      setFriendStatuses(prev => ({
        ...prev,
        [userId]: status
      }));
    };

    socket.on(SocketEvents.USER_STATUS_CHANGE, handleStatusChange);

    return () => {
      socket.off(SocketEvents.USER_STATUS_CHANGE, handleStatusChange);
    };
  }, [isOpen]);

  const handleInviteFriend = async (friendId: string, friendName: string) => {
    if (!roomId) return;

    setSendingInvite(friendId);
    try {
      // Get current user's name for invite
      const myProfile = friends.find(f => f.friend?.id === currentUserId)?.friend;
      const inviterName = myProfile 
        ? parseUsername(myProfile.username, myProfile.discriminator).full
        : 'Player';

      socket.emit(SocketEvents.SEND_GAME_INVITE, {
        receiverId: friendId,
        roomId,
        inviterName
      });

      onInviteSent?.();
      setSendingInvite(null);
    } catch (err: any) {
      console.error('Error sending invite:', err);
      setSendingInvite(null);
    }
  };

  // Filter to only show online friends
  const onlineFriendsList = friends.filter(f => {
    const friendId = f.friend?.id;
    if (!friendId) return false;
    const status = friendStatuses[friendId];
    return status === 'online' || status === 'in_game';
  });

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[400]"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="fixed inset-0 z-[401] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#000000] border-2 border-green-500/50 rounded-3xl p-6 max-w-md w-full max-h-[80vh] flex flex-col shadow-[0_0_150px_rgba(16,185,129,0.5)]">
              {/* Background effects */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)] rounded-3xl"></div>
              
              <div className="relative z-10 flex flex-col flex-1 min-h-0">
                {/* Header */}
                <div className="mb-4">
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 via-green-300 to-green-500 uppercase mb-2">
                    Invite Friend
                  </h2>
                  {roomName && (
                    <p className="text-sm text-white/60">
                      Lobby: <span className="font-semibold text-green-300">{roomName}</span>
                    </p>
                  )}
                </div>

                {/* Friends List */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-2">
                  {loading ? (
                    <div className="text-center py-8 text-white/50">Loading friends...</div>
                  ) : onlineFriendsList.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-white/50 text-sm mb-2">No online friends</p>
                      <p className="text-white/30 text-xs">Friends will appear here when they come online</p>
                    </div>
                  ) : (
                    onlineFriendsList.map((friendship) => {
                      const friend = friendship.friend;
                      if (!friend) return null;

                      const friendStatus = friendStatuses[friend.id] || 'offline';
                      const isOnline = friendStatus === 'online' || friendStatus === 'in_game';
                      const isSending = sendingInvite === friend.id;
                      const parsedName = parseUsername(friend.username, friend.discriminator);

                      return (
                        <div
                          key={friendship.id}
                          className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-xl p-3 hover:border-green-500/30 transition-all"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-green-500/30 to-green-600/20 border-2 border-green-500/50 flex items-center justify-center shrink-0 overflow-hidden">
                                {friend.avatar_url ? (
                                  <VisualEmote 
                                    trigger={friend.avatar_url} 
                                    remoteEmotes={remoteEmotes} 
                                    size="sm"
                                    className="w-full h-full"
                                  />
                                ) : (
                                  <span className="text-green-400 text-lg">👤</span>
                                )}
                                {isOnline && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0a0a0a] rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <CopyUsername username={friend.username} discriminator={friend.discriminator} className="text-sm" />
                              </div>
                            </div>
                            <button
                              onClick={() => handleInviteFriend(friend.id, parsedName.full)}
                              disabled={isSending || !isOnline}
                              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-300 text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {isSending ? 'Sending...' : 'Invite'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="mt-4 w-full px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold uppercase tracking-wide transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
