import React, { useState } from 'react';
import { submitFeedback } from '../services/supabase';

interface FeedbackModalProps {
  onClose: () => void;
  userId: string;
  gameVersion?: string;
}

type FeedbackCategory = 'Bug' | 'Suggestion' | 'Balance' | 'Compliment';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
  onClose, 
  userId,
  gameVersion = '1.0.0'
}) => {
  const [category, setCategory] = useState<FeedbackCategory>('Bug');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitFeedback(userId, category, message.trim(), gameVersion);

      if (!result.success) {
        console.error('Error submitting feedback:', result.error);
        // Still show success to user even if there's an error (graceful degradation)
      }

      // Show success animation
      setShowSuccess(true);
      
      // Auto-close after animation
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Exception submitting feedback:', error);
      // Still show success animation for better UX
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" 
      onClick={onClose}
    >
      <div 
        className="relative bg-black/60 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] flex flex-col transition-all duration-500"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/5 pointer-events-none"></div>

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase tracking-tighter">
              Player Feedback
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500/80 animate-pulse"></span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">
                Share Your Thoughts
              </span>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white transition-all group active:scale-90"
          >
            <span className="text-xl group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>

        {/* Success Animation */}
        {showSuccess && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-yellow-500/30 blur-2xl rounded-full animate-pulse scale-150"></div>
                <div className="relative text-6xl animate-bounce">🐕</div>
              </div>
              <div className="text-4xl animate-pulse">💖</div>
              <p className="text-lg font-black text-yellow-400 uppercase tracking-widest">
                Awoo! Feedback Received!
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        {!showSuccess && (
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 bg-transparent">
            {/* Category Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-black text-white/90 uppercase tracking-widest">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all"
              >
                <option value="Bug" className="bg-black text-white">Bug</option>
                <option value="Suggestion" className="bg-black text-white">Suggestion</option>
                <option value="Balance" className="bg-black text-white">Balance</option>
                <option value="Compliment" className="bg-black text-white">Compliment</option>
              </select>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label className="text-xs font-black text-white/90 uppercase tracking-widest">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                rows={6}
                maxLength={1000}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-white/30 font-medium focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all resize-none"
              />
              <div className="text-[10px] text-white/30 text-right">
                {message.length}/1000
              </div>
            </div>

            {/* Footer Message */}
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-yellow-500/80 italic text-center">
                Our Shiba is reading your thoughts. Be nice, he bites. 🐕
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!message.trim() || isSubmitting}
              className="group w-full relative overflow-hidden py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 active:scale-95 border border-yellow-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!isSubmitting ? (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                  <span className="relative z-10 text-white flex items-center justify-center gap-3 drop-shadow-md">
                    Submit Feedback <span className="text-xl">📝</span>
                  </span>
                </>
              ) : (
                <span className="relative z-10 text-white flex items-center justify-center gap-3">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Submitting...
                </span>
              )}
            </button>
          </form>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes shimmer {
            0% { background-position: -100% 0; }
            100% { background-position: 100% 0; }
          }
        `}} />
      </div>
    </div>
  );
};
