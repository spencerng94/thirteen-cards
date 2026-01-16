import React from 'react';

interface ShopSkeletonProps {
  density?: 1 | 2 | 4; // Number of columns
  count?: number; // Number of skeleton cards to show
  className?: string;
}

export const ShopSkeleton: React.FC<ShopSkeletonProps> = ({ 
  density = 4, 
  count = 12,
  className = '' 
}) => {
  const gridCols = density === 1 ? 'grid-cols-1' : density === 2 ? 'grid-cols-2' : 'grid-cols-3';
  
  // Match the exact card dimensions and structure from the shop
  const SkeletonCard = () => (
    <div 
      className="relative bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-zinc-900/80 border border-amber-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center h-full overflow-hidden animate-pulse"
      style={{
        // GPU-accelerated properties
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
          className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
          style={{
            transform: 'translateZ(0)',
          }}
        />
      </div>

      {/* Card content skeleton */}
      <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
        {/* Icon/Image placeholder */}
        <div 
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-zinc-900/70 border border-amber-500/15"
          style={{
            transform: 'translateZ(0)',
            willChange: 'opacity',
          }}
        />

        {/* Title placeholder */}
        <div className="flex flex-col items-center text-center px-2 w-full">
          <div 
            className="h-4 sm:h-5 w-24 sm:w-32 bg-zinc-900/70 rounded-lg border border-amber-500/10 mb-1"
            style={{
              transform: 'translateZ(0)',
              willChange: 'opacity',
            }}
          />
          <div 
            className="h-3 w-16 bg-zinc-900/50 rounded-md border border-amber-500/10"
            style={{
              transform: 'translateZ(0)',
              willChange: 'opacity',
            }}
          />
        </div>

        {/* Price/Status placeholder */}
        <div className="mt-auto">
          <div 
            className="h-7 sm:h-8 w-20 sm:w-24 bg-zinc-900/70 rounded-lg border border-amber-500/10"
            style={{
              transform: 'translateZ(0)',
              willChange: 'opacity',
            }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className={className}>
      <div className={`grid gap-3 sm:gap-4 md:gap-5 pb-8 auto-rows-fr ${gridCols}`}>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonCard key={`skeleton-${index}`} />
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
