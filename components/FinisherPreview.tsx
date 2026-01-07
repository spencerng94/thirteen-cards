import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShibaSlamFinisher } from './ShibaSlamFinisher';
import { EtherealBladeFinisher } from './EtherealBladeFinisher';
import { SaltShakeFinisher } from './SaltShakeFinisher';
import { SanctumSnapFinisher } from './SanctumSnapFinisher';
import { SeductiveFinishFinisher } from './SeductiveFinishFinisher';
import { KissMyShibaFinisher } from './KissMyShibaFinisher';

interface FinisherPreviewProps {
  finisherKey: string;
  finisherName: string;
  onClose: () => void;
}

export const FinisherPreview: React.FC<FinisherPreviewProps> = ({
  finisherKey,
  finisherName,
  onClose
}) => {
  const [replayKey, setReplayKey] = useState(0);

  const handleReplay = () => {
    setReplayKey(prev => prev + 1);
  };

  const handleComplete = () => {
    // Auto-close after animation completes
    // Ethereal Blade will auto-close after 4 seconds, Shiba Slam can be manually closed
    setTimeout(() => {
      onClose();
    }, 500); // Small delay to ensure animation finishes
  };

  const renderFinisher = () => {
    if (finisherKey === 'shiba_slam') {
      return (
        <ShibaSlamFinisher
          key={replayKey}
          onComplete={handleComplete}
          onReplay={handleReplay}
          isPreview={true}
          winnerName="GUEST"
        />
      );
    } else if (finisherKey === 'ethereal_blade') {
      return (
        <EtherealBladeFinisher
          key={replayKey}
          onComplete={handleComplete}
          onReplay={handleReplay}
          isPreview={true}
          winnerName="GUEST"
        />
      );
    } else if (finisherKey === 'salt_shaker') {
      return (
        <SaltShakeFinisher
          key={replayKey}
          onComplete={handleComplete}
          onReplay={handleReplay}
          isPreview={true}
          winnerName="GUEST"
        />
      );
    } else if (finisherKey === 'sanctum_snap') {
      return (
        <SanctumSnapFinisher
          key={replayKey}
          onComplete={handleComplete}
          onReplay={handleReplay}
          isPreview={true}
          winnerName="GUEST"
        />
      );
    } else if (finisherKey === 'seductive_finish') {
      return (
        <SeductiveFinishFinisher
          key={replayKey}
          onComplete={handleComplete}
          onReplay={handleReplay}
          isPreview={true}
          winnerName="GUEST"
        />
      );
    } else if (finisherKey === 'kiss_my_shiba') {
      return (
        <KissMyShibaFinisher
          key={replayKey}
          onComplete={handleComplete}
          onReplay={handleReplay}
          isPreview={true}
          winnerName="GUEST"
        />
      );
    }
    return null;
  };

  const content = (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
      {/* Close button overlay - clickable */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Preview Container - Finisher will render at z-[9999] */}
      <div className="relative z-10 w-full h-full pointer-events-none">
        {/* Finisher Animation */}
        {renderFinisher()}
      </div>
      
      {/* Close button in top-right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[10000] pointer-events-auto px-4 py-2 bg-black/80 hover:bg-black/90 border border-white/20 text-white rounded-lg font-bold text-sm transition-all hover:scale-105"
      >
        ✕ Close
      </button>
    </div>
  );

  return typeof window !== 'undefined' 
    ? createPortal(content, document.body)
    : content;
};
