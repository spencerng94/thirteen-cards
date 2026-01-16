import { useCallback, useRef } from 'react';

/**
 * Optimized button hook for iOS that:
 * - Removes 300ms click delay using touch events
 * - Debounces rapid clicks
 * - Provides immediate visual feedback
 */
export const useOptimizedButton = (
  onClick: () => void,
  debounceMs: number = 150
) => {
  const lastClickTime = useRef<number>(0);
  const isProcessing = useRef<boolean>(false);

  const handleClick = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    const now = Date.now();
    if (isProcessing.current || (now - lastClickTime.current) < debounceMs) {
      return;
    }
    
    lastClickTime.current = now;
    isProcessing.current = true;
    
    // Execute handler
    onClick();
    
    // Reset processing flag after a short delay
    setTimeout(() => {
      isProcessing.current = false;
    }, debounceMs);
  }, [onClick, debounceMs]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleClick();
  }, [handleClick]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle touch pointers, not mouse
    if (e.pointerType === 'touch') {
      e.preventDefault();
      e.stopPropagation();
      handleClick();
    }
  }, [handleClick]);

  return {
    onClick: handleClick,
    onTouchStart: handleTouchStart,
    onPointerDown: handlePointerDown,
  };
};
