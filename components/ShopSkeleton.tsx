import React from 'react';

interface ShopSkeletonProps {
  density?: 1 | 2 | 3; // Number of columns
  count?: number; // Number of skeleton cards to show
  className?: string;
}

// Individual skeleton card component that matches ShopItemCard exactly
const ShopItemSkeleton: React.FC = () => (
  <div 
    className="relative bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] border-2 border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center h-full overflow-hidden"
    style={{
      transform: 'translateZ(0)',
      willChange: 'opacity',
      backfaceVisibility: 'hidden',
    }}
  >
    {/* Shimmer effect overlay */}
  <div 
    className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl"
    style={{
      transform: 'translateZ(0)',
      willChange: 'transform',
    }}
  >
    <div 
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
      style={{
        transform: 'translateZ(0)',
      }}
    />
  </div>

    {/* Card content skeleton - matches ShopItemCard structure exactly */}
    <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
      {/* Icon/Image placeholder - matches avatar/board/card size */}
      <div 
        className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/5 animate-pulse"
        style={{
          transform: 'translateZ(0)',
          willChange: 'opacity',
        }}
      />

      {/* Title placeholder - matches text structure */}
      <div className="flex flex-col items-center text-center px-2 w-full">
        <div 
          className="h-4 sm:h-5 w-24 sm:w-32 bg-white/5 rounded-lg animate-pulse mb-1"
          style={{
            transform: 'translateZ(0)',
            willChange: 'opacity',
          }}
        />
      </div>
    </div>

    {/* Price/Status button placeholder - matches button structure */}
    <div 
      className="relative z-10 w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl mt-auto bg-white/5 animate-pulse"
      style={{
        transform: 'translateZ(0)',
        willChange: 'opacity',
      }}
    />
  </div>
);

export const ShopSkeleton: React.FC<ShopSkeletonProps> = ({ 
  density = 3, 
  count = 8,
  className = '' 
}) => {
  const gridCols = density === 1 ? 'grid-cols-1' : density === 2 ? 'grid-cols-2' : 'grid-cols-3';
  
  return (
    <div className={className}>
      <div className={`grid gap-3 sm:gap-4 md:gap-5 pb-8 auto-rows-fr ${gridCols}`}>
        {Array.from({ length: count }).map((_, index) => (
          <ShopItemSkeleton key={`skeleton-${index}`} />
        ))}
      </div>

      {/* Shimmer animation - GPU accelerated */}
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%) translateZ(0);
          }
          100% {
            transform: translateX(200%) translateZ(0);
          }
        }
      `}</style>
    </div>
  );
};
