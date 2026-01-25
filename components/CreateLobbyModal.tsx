import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../services/socket';
import { SocketEvents } from '../types';

interface CreateLobbyModalProps {
  isOpen: boolean;
  friendName: string;
  friendId: string;
  onClose: () => void;
  onLobbyCreated: (roomId: string) => void;
}

export const CreateLobbyModal: React.FC<CreateLobbyModalProps> = ({
  isOpen,
  friendName,
  friendId,
  onClose,
  onLobbyCreated
}) => {
  const [lobbyName, setLobbyName] = useState('');
  const [turnTimer, setTurnTimer] = useState<15 | 30 | 60>(30);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!lobbyName.trim()) {
      setError('Please enter a lobby name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Emit CREATE_PRIVATE_LOBBY event
      socket.emit(SocketEvents.CREATE_PRIVATE_LOBBY, {
        lobbyName: lobbyName.trim(),
        turnTimer: turnTimer * 1000, // Convert to milliseconds
        friendId // Friend to invite
      }, (response: { roomId?: string; error?: string }) => {
        if (response.error) {
          setError(response.error);
          setIsCreating(false);
        } else if (response.roomId) {
          // Lobby created successfully, invite will be sent automatically
          onLobbyCreated(response.roomId);
          onClose();
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create lobby');
      setIsCreating(false);
    }
  };

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
            <div className="relative bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#000000] border-2 border-emerald-500/50 rounded-3xl p-8 max-w-md w-full shadow-[0_0_150px_rgba(16,185,129,0.5)]">
              {/* Background effects */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.1)_0%,transparent_70%)] rounded-3xl"></div>
              
              <div className="relative z-10">
                {/* Title */}
                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-emerald-300 to-emerald-500 uppercase mb-2 text-center">
                  Create Lobby
                </h2>
                
                <p className="text-white/70 text-sm mb-6 text-center">
                  Invite <span className="font-bold text-emerald-400">{friendName}</span> to play
                </p>

                {/* Lobby Name Input */}
                <div className="mb-4">
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
                    Lobby Name
                  </label>
                  <input
                    type="text"
                    value={lobbyName}
                    onChange={(e) => setLobbyName(e.target.value)}
                    placeholder="Enter lobby name..."
                    maxLength={24}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    disabled={isCreating}
                  />
                </div>

                {/* Turn Timer Dropdown */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
                    Turn Timer
                  </label>
                  <select
                    value={turnTimer}
                    onChange={(e) => setTurnTimer(Number(e.target.value) as 15 | 30 | 60)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    disabled={isCreating}
                  >
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                  </select>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={onClose}
                    disabled={isCreating}
                    className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold uppercase tracking-wide transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isCreating || !lobbyName.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 border border-emerald-400/50 rounded-xl text-white font-bold uppercase tracking-wide transition-all shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Create & Invite'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
