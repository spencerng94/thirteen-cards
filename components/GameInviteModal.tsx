import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SocketEvents } from '../types';
import { socket } from '../services/socket';

interface GameInviteModalProps {
  isOpen: boolean;
  inviterName: string;
  roomId: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const GameInviteModal: React.FC<GameInviteModalProps> = ({
  isOpen,
  inviterName,
  roomId,
  onAccept,
  onDecline
}) => {
  const handleAccept = () => {
    // Emit accept event to server
    socket.emit(SocketEvents.ACCEPT_INVITE, { roomId });
    onAccept();
  };

  const handleDecline = () => {
    // Emit decline event to server
    socket.emit(SocketEvents.DECLINE_INVITE, { roomId });
    onDecline();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[400]"
            onClick={handleDecline}
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
            <div className="relative bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#000000] border-2 border-blue-500/50 rounded-3xl p-8 max-w-md w-full shadow-[0_0_150px_rgba(59,130,246,0.5)]">
              {/* Background effects */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)] rounded-3xl"></div>
              
              <div className="relative z-10 text-center">
                {/* Icon */}
                <div className="mb-6 flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/20 border-2 border-blue-500/50 flex items-center justify-center">
                    <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
                
                {/* Title */}
                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-blue-300 to-blue-500 uppercase mb-4">
                  Game Invite
                </h2>
                
                {/* Message */}
                <p className="text-white/90 text-lg mb-8">
                  <span className="font-bold text-blue-400">{inviterName}</span>
                  {' '}invited you to play!
                </p>
                
                {/* Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleDecline}
                    className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold uppercase tracking-wide transition-all"
                  >
                    Decline
                  </button>
                  <button
                    onClick={handleAccept}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 border border-blue-400/50 rounded-xl text-white font-bold uppercase tracking-wide transition-all shadow-lg shadow-blue-500/30"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
