import React from 'react';

interface InlineSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InlineSpinner({ 
  size = 'md',
  className = ''
}: InlineSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Background Ring */}
      <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
      
      {/* Spinning Ring */}
      <div className="absolute inset-0 border-2 border-transparent border-t-yellow-400/80 rounded-full animate-spin shadow-[0_0_8px_rgba(234,179,8,0.3)]"></div>
      
      {/* Inner Pulse */}
      <div className="absolute inset-[30%] bg-yellow-400/60 rounded-full animate-pulse"></div>
    </div>
  );
}
