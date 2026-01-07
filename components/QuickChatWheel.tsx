import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatPreset {
  id: string;
  phrase: string;
  style: 'standard' | 'gold' | 'neon' | 'wiggle';
  bundle_id?: string | null;
}

interface QuickChatWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPhrase: (preset: ChatPreset) => void;
  presets: ChatPreset[];
  unlockedBundles: string[];
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
  lastUsedAt,
  cooldownMs = COOLDOWN_MS
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'circular' | 'list'>('circular');

  // Filter presets based on permissions
  const availablePresets = presets.filter(preset => {
    if (preset.style === 'standard') return true;
    if (!preset.bundle_id) return true; // No bundle requirement
    return unlockedBundles.includes(preset.bundle_id);
  });

  const isOnCooldown = Date.now() - lastUsedAt < cooldownMs;
  const cooldownRemaining = Math.max(0, cooldownMs - (Date.now() - lastUsedAt));

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (wheelRef.current && !wheelRef.current.contains(e.target as Node)) {
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

  // Calculate positions for circular menu
  const getPresetPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
    const radius = 80; // Distance from center
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

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

          {/* Wheel */}
          <motion.div
            ref={wheelRef}
            className="fixed inset-0 z-[501] flex items-center justify-center p-4"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            {/* Header Controls */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/20 text-white/70 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider"
                title="Back"
              >
                ← Back
              </button>
              <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl border border-white/20 rounded-full px-3 py-1.5">
                <button
                  onClick={() => setViewMode('circular')}
                  className={`text-[10px] font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'circular'
                      ? 'text-yellow-400'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  Circle
                </button>
                <div className="w-[1px] h-3 bg-white/20"></div>
                <button
                  onClick={() => setViewMode('list')}
                  className={`text-[10px] font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'list'
                      ? 'text-yellow-400'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  List
                </button>
              </div>
            </div>

            {viewMode === 'circular' ? (
              <div className="relative w-64 h-64">
                {/* Center circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-black/80 border-2 border-white/20 flex items-center justify-center shadow-2xl">
                    <span className="text-xs font-black text-white/60 uppercase tracking-widest">Chat</span>
                  </div>
                </div>

              {/* Preset buttons arranged in circle */}
              {availablePresets.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-white/60 text-sm font-bold mb-2">No chat presets available</p>
                    <p className="text-white/40 text-xs">Check your connection</p>
                  </div>
                </div>
              ) : (
                availablePresets.map((preset, index) => {
                const { x, y } = getPresetPosition(index, availablePresets.length);
                const isLocked = preset.style !== 'standard' && preset.bundle_id && !unlockedBundles.includes(preset.bundle_id);
                const isSelected = selectedIndex === presets.indexOf(preset);

                return (
                  <motion.button
                    key={preset.id}
                    className={`absolute w-16 h-16 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                      isLocked
                        ? 'bg-black/40 border-white/10 text-white/30 cursor-not-allowed'
                        : isOnCooldown
                        ? 'bg-white/10 border-white/20 text-white/50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-yellow-500 border-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.6)] scale-110'
                        : preset.style === 'gold'
                        ? 'bg-gradient-to-br from-yellow-500/90 to-orange-500/90 border-yellow-400 text-white'
                        : preset.style === 'neon'
                        ? 'bg-black/80 border-pink-500 text-pink-400'
                        : preset.style === 'wiggle'
                        ? 'bg-orange-500/90 border-orange-400 text-white'
                        : 'bg-white/90 border-gray-300 text-black'
                    }`}
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onClick={() => !isLocked && !isOnCooldown && handleSelect(preset)}
                    disabled={isLocked || isOnCooldown}
                    whileTap={!isLocked && !isOnCooldown ? { scale: 0.95 } : {}}
                  >
                    <span className="text-center leading-tight px-1">
                      {preset.phrase.length > 8 ? preset.phrase.substring(0, 7) + '...' : preset.phrase}
                    </span>
                    {isLocked && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                        <span className="text-[8px]">🔒</span>
                      </div>
                    )}
                  </motion.button>
                );
              })
              )}

              {/* Cooldown indicator */}
              {isOnCooldown && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="w-24 h-24 rounded-full bg-black/60 border-2 border-white/20 flex items-center justify-center">
                    <span className="text-xs font-black text-white/80">
                      {(cooldownRemaining / 1000).toFixed(1)}s
                    </span>
                  </div>
                </motion.div>
              )}
              </div>
            ) : (
              /* List View */
              <div className="bg-black/80 backdrop-blur-xl border-2 border-white/20 rounded-2xl p-4 shadow-2xl min-w-[280px] max-w-[320px] max-h-[400px] overflow-y-auto">
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
                      const isLocked = preset.style !== 'standard' && preset.bundle_id && !unlockedBundles.includes(preset.bundle_id);
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
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
