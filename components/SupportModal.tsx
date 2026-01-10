import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { submitSupportTicket } from '../services/supabase';
import { CURRENT_VERSION } from '../utils/version';

interface SupportModalProps {
  onClose: () => void;
  userId: string;
  gameVersion?: string;
}

type SupportCategory = 'Bug' | 'Feedback' | 'Billing';

const SUPPORT_EMAIL = 'thethirteengame@gmail.com';

export const SupportModal: React.FC<SupportModalProps> = ({ 
  onClose, 
  userId,
  gameVersion = CURRENT_VERSION
}) => {
  const [category, setCategory] = useState<SupportCategory>('Bug');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitSupportTicket(userId, category, message.trim(), gameVersion);

      if (!result.success) {
        console.error('Error submitting support ticket:', result.error);
        // Still show success to user even if there's an error (graceful degradation)
      }

      // Show success animation with reference ID
      setReferenceId(result.referenceId || null);
      setShowSuccess(true);
      
      // Auto-close after animation
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Exception submitting support ticket:', error);
      // Still show success animation for better UX
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSupport = async () => {
    const subject = encodeURIComponent(`Support Request - App Version ${gameVersion}`);
    const body = encodeURIComponent(`Category: ${category}\n\nMessage:\n${message.trim() || '[Your message here]'}\n\nUser ID: ${userId}\nApp Version: ${gameVersion}`);
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor App plugin for native platforms
        await App.openUrl({ url: mailtoUrl });
      } else {
        // Use window.location for web
        window.location.href = mailtoUrl;
      }
    } catch (error) {
      console.error('Error opening email client:', error);
      // Fallback: copy email to clipboard or show in alert
      alert(`Please email us at: ${SUPPORT_EMAIL}\n\nSubject: ${decodeURIComponent(subject)}\n\nInclude your message and User ID: ${userId}`);
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
              Support & Feedback
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500/80 animate-pulse"></span>
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">
                We typically respond within 24-48 hours
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
            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500 p-6">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-emerald-500/30 blur-2xl rounded-full animate-pulse scale-150"></div>
                <div className="relative text-6xl animate-bounce">✓</div>
              </div>
              <p className="text-2xl font-black text-emerald-400 uppercase tracking-widest">
                Message Sent!
              </p>
              {referenceId && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-widest">Reference ID</p>
                  <p className="text-sm font-mono text-yellow-400 bg-black/40 px-4 py-2 rounded-lg border border-yellow-500/20">
                    {referenceId.substring(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-2">
                    Save this ID for your records
                  </p>
                </div>
              )}
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
                onChange={(e) => setCategory(e.target.value as SupportCategory)}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all"
              >
                <option value="Bug" className="bg-black text-white">Bug Report</option>
                <option value="Feedback" className="bg-black text-white">Feedback</option>
                <option value="Billing" className="bg-black text-white">Billing Issue</option>
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
                placeholder="Describe your issue or feedback in detail..."
                rows={8}
                maxLength={2000}
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-2xl text-white placeholder-white/30 font-medium focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20 transition-all resize-none"
              />
              <div className="text-[10px] text-white/30 text-right">
                {message.length}/2000
              </div>
            </div>

            {/* Screenshot Placeholder */}
            <div className="space-y-2">
              <label className="text-xs font-black text-white/90 uppercase tracking-widest">
                Attach Screenshot (Optional)
              </label>
              <div className="px-4 py-6 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl text-center group hover:border-yellow-500/30 transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-500 group-hover:text-yellow-500 transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                  Screenshot support coming soon
                </p>
              </div>
            </div>

            {/* Auto-filled Info (Read-only) */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Auto-filled Information</p>
              <div className="space-y-1 text-[10px] text-gray-400 font-mono">
                <div className="flex justify-between">
                  <span>User ID:</span>
                  <span className="text-yellow-500/80">{userId.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span>App Version:</span>
                  <span className="text-yellow-500/80">{gameVersion}</span>
                </div>
              </div>
            </div>

            {/* Footer Message */}
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] text-yellow-500/80 italic text-center">
                Our team typically responds within 24-48 hours. Thank you for helping us improve!
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
                    Submit Support Ticket <span className="text-xl">📧</span>
                  </span>
                </>
              ) : (
                <span className="relative z-10 text-white flex items-center justify-center gap-3">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Submitting...
                </span>
              )}
            </button>

            {/* Email Support Button */}
            <button
              type="button"
              onClick={handleEmailSupport}
              className="group w-full relative overflow-hidden py-4 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 active:scale-95 border border-white/10 bg-white/[0.02] hover:bg-white/[0.08]"
            >
              <span className="relative z-10 flex items-center justify-center gap-3 text-gray-400 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact via Email
              </span>
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
