import React from 'react';
import { useImageCache, LoadingState } from '../hooks/useImageCache';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean; // For high-priority items (Mythic/Legendary)
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * CachedImage component that uses CacheStorage for persistent image caching
 * Shows a Zinc-950 skeleton loader while checking cache/loading
 */
function CachedImageComponent({
  src,
  alt,
  className = '',
  loading = 'lazy',
  priority = false,
  onLoad,
  onError,
  ...imgProps
}: CachedImageProps) {
  const { state, image, isLoading, isError, containerRef } = useImageCache(
    src,
    {
      enabled: !!src,
      useIntersectionObserver: loading === 'lazy' && !priority,
    }
  );

  // Track if we've ever successfully loaded an image to prevent blinking on retries
  const hasLoadedImageRef = React.useRef(false);
  
  // Update ref when image successfully loads
  React.useEffect(() => {
    if (image && state === LoadingState.SUCCESS) {
      hasLoadedImageRef.current = true;
    }
  }, [image, state]);

  // Reset ref when src changes
  React.useEffect(() => {
    hasLoadedImageRef.current = false;
  }, [src]);

  // Common props for wrapper div
  const wrapperProps = {
    ref: containerRef as React.RefObject<HTMLDivElement> | undefined,
  };

  // If we've successfully loaded an image before, keep showing it even during retries
  // This prevents blinking when images retry loading
  if (hasLoadedImageRef.current && image) {
    return (
      <div {...wrapperProps} className={className} style={imgProps.style}>
        <img
          {...imgProps}
          src={image.src}
          alt={alt}
          className={`${className} transition-opacity duration-300`}
          loading={priority ? 'eager' : loading}
          decoding="async"
          onLoad={onLoad}
          onError={onError}
          style={{
            ...imgProps.style,
            opacity: 1,
          }}
        />
      </div>
    );
  }

  // Show skeleton loader only on initial load (not retries)
  // Only show skeleton if we're actually loading AND don't have an image yet
  if ((isLoading || state === LoadingState.LOADING) && !image && !hasLoadedImageRef.current) {
    return (
      <div
        {...wrapperProps}
        className={`bg-zinc-950 animate-pulse ${className}`}
        style={{ 
          aspectRatio: imgProps.width && imgProps.height 
            ? `${imgProps.width} / ${imgProps.height}` 
            : '1 / 1',
          ...imgProps.style
        }}
        aria-label={`Loading ${alt}`}
      >
        <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-800 border-t-zinc-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Show error state
  if (isError || state === LoadingState.ERROR) {
    return (
      <div
        {...wrapperProps}
        className={`bg-zinc-950 flex items-center justify-center ${className}`}
        style={{ 
          aspectRatio: imgProps.width && imgProps.height 
            ? `${imgProps.width} / ${imgProps.height}` 
            : '1 / 1',
          ...imgProps.style
        }}
        aria-label={`Failed to load ${alt}`}
      >
        <span className="text-zinc-600 text-xs">Failed to load</span>
      </div>
    );
  }

  // Render cached image
  if (image && state === LoadingState.SUCCESS) {
    return (
      <div {...wrapperProps} className={className} style={imgProps.style}>
        <img
          {...imgProps}
          src={image.src}
          alt={alt}
          className={`${className} transition-opacity duration-300`}
          loading={priority ? 'eager' : loading}
          decoding="async"
          onLoad={onLoad}
          onError={onError}
          style={{
            ...imgProps.style,
            opacity: 1,
          }}
        />
      </div>
    );
  }

  // Fallback - should not reach here, but just in case
  return (
    <div
      {...wrapperProps}
      className={`bg-zinc-950 ${className}`}
      style={{ 
        aspectRatio: imgProps.width && imgProps.height 
          ? `${imgProps.width} / ${imgProps.height}` 
          : '1 / 1',
        ...imgProps.style
      }}
      aria-label={`Loading ${alt}`}
    />
  );
}

export const CachedImage = React.memo(CachedImageComponent, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if src changes
  return prevProps.src === nextProps.src &&
         prevProps.className === nextProps.className &&
         prevProps.loading === nextProps.loading &&
         prevProps.priority === nextProps.priority;
});

CachedImage.displayName = 'CachedImage';
