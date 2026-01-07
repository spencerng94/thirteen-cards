import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatPreset {
  id: string;
  phrase: string;
  style: 'standard' | 'gold' | 'neon' | 'wiggle';
  bundle_id?: string | null;
  price?: number;
}

interface QuickChatWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhrase: (preset: ChatPreset) => void;
  presets: ChatPreset[];
  unlockedBundles: string[];
  unlockedPhrases?: string[];
  lastUsedAt: number;
  cooldownMs?: number;
}

const COOLDOWN_MS = 2000; // 2 seconds

export const QuickChatWheel: React.FC<QuickChatWheelProps> = ({
  isOpen,
  onClose,
  onSelectPhrase,
  presets,
  unlockedBundles,
  unlockedPhrases = [],
  lastUsedAt,
  cooldownMs = COOLDOWN_MS
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Filter presets based on permissions
  // Show presets if they are:
  // 1. Free (price === 0)
  // 2. Unlocked individually (id in unlockedPhrases)
  // 3. Part of an unlocked bundle (bundle_id in unlockedBundles)
  const availablePresets = presets.filter(preset => {
    // Free presets are always available
    if (preset.price === 0) return true;
    
    // Check if this preset is individually unlocked
    if (unlockedPhrases.includes(preset.id)) return true;
    
    // Check if this preset is part of an unlocked bundle
    if (preset.bundle_id && unlockedBundles.includes(preset.bundle_id)) return true;
    
    // Otherwise, it's locked
    return false;
  });

  const isOnCooldown = Date.now() - lastUsedAt < cooldownMs;
  const cooldownRemaining = Math.max(0, cooldownMs - (Date.now() - lastUsedAt));

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSelect = (preset: ChatPreset) => {
    if (isOnCooldown) return;
    
    setSelectedIndex(presets.indexOf(preset));
    setTimeout(() => {
      onSelectPhrase(preset);
      onClose();
      setSelectedIndex(null);
    }, 150);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[500] bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* List */}
          <motion.div
            ref={listRef}
            className="fixed inset-0 z-[501] flex items-center justify-center p-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header Controls */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 text-white/70 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider"
                title="Back"
              >
                ← Back
              </button>
            </div>

            {/* List View */}
            <div className="relative bg-black/80 backdrop-blur-xl border-2 border-white/20 rounded-2xl p-4 shadow-2xl min-w-[280px] max-w-[320px] max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-center mb-3">
                <span className="text-xs font-black text-white/60 uppercase tracking-widest">Quick Chat</span>
              </div>
              <div className="flex flex-col gap-2">
                {availablePresets.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/60 text-sm font-bold mb-2">No chat presets available</p>
                    <p className="text-white/40 text-xs">Check your connection</p>
                  </div>
                ) : (
                  availablePresets.map((preset) => {
                    // A preset is locked if it's not free and not unlocked
                    const isLocked = (preset.price || 0) > 0 && 
                                    !unlockedPhrases.includes(preset.id) && 
                                    (!preset.bundle_id || !unlockedBundles.includes(preset.bundle_id));
                    const isSelected = selectedIndex === presets.indexOf(preset);

                    return (
                      <motion.button
                        key={preset.id}
                        className={`w-full px-4 py-3 rounded-xl border-2 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                          isLocked
                            ? 'bg-black/40 border-white/10 text-white/30 cursor-not-allowed'
                            : isOnCooldown
                            ? 'bg-white/10 border-white/20 text-white/50 cursor-not-allowed'
                            : isSelected
                            ? 'bg-yellow-500 border-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.6)]'
                            : preset.style === 'gold'
                            ? 'bg-gradient-to-br from-yellow-500/90 to-orange-500/90 border-yellow-400 text-white'
                            : preset.style === 'neon'
                            ? 'bg-black/80 border-pink-500 text-pink-400'
                            : preset.style === 'wiggle'
                            ? 'bg-orange-500/90 border-orange-400 text-white'
                            : 'bg-white/90 border-gray-300 text-black'
                        }`}
                        onClick={() => !isLocked && !isOnCooldown && handleSelect(preset)}
                        disabled={isLocked || isOnCooldown}
                        whileTap={!isLocked && !isOnCooldown ? { scale: 0.95 } : {}}
                      >
                        <span className="text-center leading-tight">
                          {preset.phrase}
                        </span>
                        {isLocked && (
                          <span className="ml-2 text-[10px]">🔒</span>
                        )}
                      </motion.button>
                    );
                  })
                )}
              </div>
              {/* Cooldown indicator for list view */}
              {isOnCooldown && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/60 rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="bg-black/80 border-2 border-white/20 rounded-xl px-6 py-3">
                    <span className="text-sm font-black text-white/80">
                      {(cooldownRemaining / 1000).toFixed(1)}s
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
