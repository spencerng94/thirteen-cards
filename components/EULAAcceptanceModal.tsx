import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';

interface EULAAcceptanceModalProps {
  onAccept: () => void;
}

const EULA_TEXT = `END USER LICENSE AGREEMENT (EULA)

1. ACCEPTANCE OF TERMS
By using this application, you agree to be bound by this EULA.

2. USER GENERATED CONTENT (UGC)

PROHIBITED CONTENT:
You agree NOT to create, post, or share content that is:
• Offensive, hateful, or discriminatory
• Obscene or sexually explicit
• Harassing or bullying
• Violent or threatening
• Illegal or impersonating others

ZERO TOLERANCE POLICY:
We maintain a zero-tolerance policy for objectionable content. Violations may result in:
• Immediate content removal
• Account suspension or permanent ban
• Legal action where appropriate

REPORTING & BLOCKING:
• Use the in-app "Report User" feature to report objectionable content
• You can block users to prevent interactions
• All reports are reviewed within 24-48 hours

3. YOUR RESPONSIBILITY
You are solely responsible for all content you create, post, or share through the App.

4. TERMINATION
We may terminate your access immediately for any violation of this EULA.

By clicking "I Agree", you acknowledge that you have read, understood, and agree to be bound by this EULA.`;

export const EULAAcceptanceModal: React.FC<EULAAcceptanceModalProps> = ({ onAccept }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('No user session found');
      }

      // Update profile to mark EULA as accepted
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ eula_accepted: true })
        .eq('id', session.user.id);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to accept EULA');
      }

      // Call the onAccept callback to close modal and continue
      onAccept();
    } catch (err: any) {
      console.error('Error accepting EULA:', err);
      setError(err.message || 'Failed to accept EULA. Please try again.');
      setIsLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isScrolledToBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isScrolledToBottom) {
      setHasScrolled(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-b from-[#031109] via-[#064e3b] to-[#031109] border-2 border-yellow-500/50 rounded-3xl shadow-2xl overflow-hidden">
        {/* Decorative corners */}
        <div className="absolute top-4 left-4 text-yellow-500/30">
          <svg viewBox="0 0 40 40" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
            <path d="M 5 5 H 35 V 35 H 10 V 10 H 30 V 30 H 15 V 15 H 25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
          </svg>
        </div>
        <div className="absolute top-4 right-4 text-yellow-500/30 rotate-90">
          <svg viewBox="0 0 40 40" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
            <path d="M 5 5 H 35 V 35 H 10 V 10 H 30 V 30 H 15 V 15 H 25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
          </svg>
        </div>
        <div className="absolute bottom-4 left-4 text-yellow-500/30 -rotate-90">
          <svg viewBox="0 0 40 40" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
            <path d="M 5 5 H 35 V 35 H 10 V 10 H 30 V 30 H 15 V 15 H 25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
          </svg>
        </div>
        <div className="absolute bottom-4 right-4 text-yellow-500/30 rotate-180">
          <svg viewBox="0 0 40 40" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
            <path d="M 5 5 H 35 V 35 H 10 V 10 H 30 V 30 H 15 V 15 H 25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
          </svg>
        </div>

        {/* Header */}
        <div className="p-6 border-b border-yellow-500/20">
          <h2 className="text-2xl font-black text-white text-center uppercase tracking-[0.3em] font-serif">
            END USER LICENSE AGREEMENT
          </h2>
          <p className="text-xs text-yellow-400/60 text-center mt-2 uppercase tracking-widest">
            Required for App Store Compliance
          </p>
        </div>

        {/* Scrollable content */}
        <div 
          className="p-6 overflow-y-auto max-h-[50vh] scrollbar-thin scrollbar-thumb-yellow-500/30 scrollbar-track-transparent"
          onScroll={handleScroll}
        >
          <div className="text-white/90 text-sm leading-relaxed whitespace-pre-line font-mono">
            {EULA_TEXT}
          </div>
        </div>

        {/* Footer with accept button */}
        <div className="p-6 border-t border-yellow-500/20 bg-black/20">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-xs font-bold uppercase tracking-wider">{error}</p>
            </div>
          )}
          
          <button
            onClick={handleAccept}
            disabled={isLoading || (!hasScrolled && error === null)}
            className={`w-full py-4 px-6 rounded-2xl border-2 transition-all duration-300 ${
              isLoading || (!hasScrolled && error === null)
                ? 'border-yellow-500/20 bg-yellow-900/10 opacity-50 cursor-not-allowed'
                : 'border-yellow-500/50 bg-gradient-to-b from-[#3d280a] via-[#b8860b] to-[#3d280a] hover:from-[#b8860b] hover:via-[#fbf5b7] hover:to-[#8b6508] active:scale-95 cursor-pointer'
            }`}
          >
            <span className="text-lg font-black uppercase tracking-[0.25em] font-serif text-black drop-shadow-md">
              {isLoading ? 'PROCESSING...' : 'I AGREE'}
            </span>
          </button>
          
          {!hasScrolled && error === null && (
            <p className="text-xs text-yellow-400/60 text-center mt-3 uppercase tracking-wider">
              Please scroll to read the full agreement
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
