import React from 'react';
import { sanitizePath, isValidNumber } from '../utils/svgSanitizer';

const CoinIconSVG: React.FC<{ coins?: number | null }> = ({ coins }) => {
  // SANITIZE SVG DATA: Only render if coins is valid (when provided)
  // If coins is provided, validate it's a valid number; if not provided, render normally (icon-only)
  if (coins !== undefined && coins !== null && !isValidNumber(coins)) {
    return null; // Don't render if coins is provided but invalid
  }
  
  // SVG FALLBACK: Use sanitizePath to ensure all path 'd' attributes are safe
  const path1 = sanitizePath("M 10 50 A 40 40 0 0 1 50 10", "M0 0");
  const path2 = sanitizePath("M 90 50 A 40 40 0 0 1 50 90", "M0 0");
  
  return (
  <svg viewBox="0 0 100 100" className="w-full h-full" style={{ imageRendering: 'auto' }}>
    <defs>
      <radialGradient id="goldCoinGrad" cx="30%" cy="30%">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="30%" stopColor="#FFC107" />
        <stop offset="60%" stopColor="#FF8F00" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
      <linearGradient id="goldCoinBevel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF9C4" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#FFC107" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#E65100" stopOpacity="0.2" />
      </linearGradient>
      <filter id="coinGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <pattern id="coinPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="1" fill="#FFC107" opacity="0.3" />
      </pattern>
    </defs>
    {/* Outer rim with depth */}
    <circle cx="50" cy="50" r="48" fill="url(#goldCoinGrad)" stroke="#FF8F00" strokeWidth="2" filter="url(#coinGlow)" />
    <circle cx="50" cy="50" r="46" fill="none" stroke="#FFF9C4" strokeWidth="1" opacity="0.6" />
    
    {/* Inner coin body */}
    <circle cx="50" cy="50" r="42" fill="url(#goldCoinGrad)" />
    <circle cx="50" cy="50" r="42" fill="url(#coinPattern)" />
    
    {/* Bevel highlight */}
    <ellipse cx="50" cy="45" rx="38" ry="35" fill="url(#goldCoinBevel)" />
    
    {/* Ornate center design - XIII motif */}
    <g transform="translate(50, 50)">
      {/* Central circle */}
      <circle r="18" fill="#E65100" opacity="0.6" />
      <circle r="16" fill="none" stroke="#FFC107" strokeWidth="1.5" opacity="0.8" />
      
      {/* Roman numeral XIII */}
      <text x="0" y="8" textAnchor="middle" fontSize="20" fontWeight="900" fill="#FFF9C4" fontFamily="serif" opacity="0.9" style={{ textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>
        XIII
      </text>
      
      {/* Decorative border pattern */}
      <circle r="20" fill="none" stroke="#FFC107" strokeWidth="1" opacity="0.5" strokeDasharray="2,2" />
      <circle r="24" fill="none" stroke="#FF8F00" strokeWidth="1" opacity="0.4" />
    </g>
    
    {/* Edge highlights for 3D effect */}
    {/* SVG SAFETY: Using sanitizePath ensures path 'd' attributes never contain NaN/undefined */}
    <path d={path1} fill="none" stroke="#FFF9C4" strokeWidth="1.5" opacity="0.7" />
    <path d={path2} fill="none" stroke="#E65100" strokeWidth="1.5" opacity="0.5" />
  </svg>
  );
};

/**
 * Premium Final Fantasy-Inspired Gem Crystal
 * SANITIZE SVG DATA: Only render if currency value is a valid number (when provided)
 */
const GemIconSVG: React.FC<{ gems?: number | null }> = ({ gems }) => {
  // SANITIZE SVG DATA: Only render if gems is valid (when provided)
  // If gems is provided, validate it's a valid number; if not provided, render normally (icon-only)
  if (gems !== undefined && gems !== null && !isValidNumber(gems)) {
    return null; // Don't render if gems is provided but invalid
  }
  
  // SVG FALLBACK: Use sanitizePath to ensure all path 'd' attributes are safe
  const pathMain = sanitizePath("M50 8 L75 28 L75 58 L50 78 L25 58 L25 28 Z", "M0 0");
  const pathTop = sanitizePath("M50 8 L75 28 L50 28 Z", "M0 0");
  const pathLeft = sanitizePath("M50 8 L25 28 L25 58 L50 38 Z", "M0 0");
  const pathRight = sanitizePath("M50 8 L75 28 L75 58 L50 38 Z", "M0 0");
  const pathBottom1 = sanitizePath("M25 58 L50 78 L50 58 Z", "M0 0");
  const pathBottom2 = sanitizePath("M75 58 L50 78 L50 58 Z", "M0 0");
  const pathLines1 = sanitizePath("M50 8 L50 78 M25 28 L75 28 M25 58 L75 58", "M0 0");
  const pathLines2 = sanitizePath("M50 8 L25 28 M50 8 L75 28 M25 58 L50 78 M75 58 L50 78", "M0 0");
  
  return (
  <svg viewBox="0 0 100 100" className="w-full h-full" style={{ imageRendering: 'auto' }}>
    <defs>
      <linearGradient id="gemGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFB3E6" />
        <stop offset="30%" stopColor="#FF66CC" />
        <stop offset="60%" stopColor="#FF1493" />
        <stop offset="100%" stopColor="#8B008B" />
      </linearGradient>
      <linearGradient id="gemGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFB3E6" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#FF1493" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#8B008B" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="gemHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#FFB3E6" stopOpacity="0.3" />
      </linearGradient>
      <filter id="gemGlow">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="gemInnerGlow">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feFlood floodColor="#FFB3E6" floodOpacity="0.4" result="glowColor"/>
        <feComposite in="glowColor" in2="blur" operator="in" result="glow"/>
        <feMerge>
          <feMergeNode in="glow"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    {/* Main gem body - faceted diamond */}
    {/* SVG SAFETY: Using sanitizePath ensures path 'd' attributes never contain NaN/undefined */}
    <path d={pathMain} fill="url(#gemGrad1)" filter="url(#gemGlow)" stroke="#FFB3E6" strokeWidth="1.5" opacity="0.9" />
    
    {/* Top facet highlight */}
    <path d={pathTop} fill="url(#gemHighlight)" opacity="0.7" />
    
    {/* Left facet */}
    <path d={pathLeft} fill="url(#gemGrad2)" opacity="0.8" />
    
    {/* Right facet */}
    <path d={pathRight} fill="url(#gemGrad2)" opacity="0.6" />
    
    {/* Bottom facets */}
    <path d={pathBottom1} fill="url(#gemGrad2)" opacity="0.7" />
    <path d={pathBottom2} fill="url(#gemGrad2)" opacity="0.5" />
    
    {/* Inner crystal core */}
    <ellipse cx="50" cy="43" rx="20" ry="25" fill="url(#gemHighlight)" opacity="0.4" filter="url(#gemInnerGlow)" />
    
    {/* Facet lines for depth */}
    <path d={pathLines1} stroke="#FFB3E6" strokeWidth="0.8" opacity="0.4" />
    <path d={pathLines2} stroke="#FFFFFF" strokeWidth="0.6" opacity="0.5" />
    
    {/* Sparkle effects */}
    <circle cx="50" cy="20" r="2" fill="#FFFFFF" opacity="0.9" />
    <circle cx="65" cy="35" r="1.5" fill="#FFFFFF" opacity="0.8" />
    <circle cx="35" cy="35" r="1.5" fill="#FFFFFF" opacity="0.8" />
    <circle cx="50" cy="65" r="1.5" fill="#FFB3E6" opacity="0.7" />
  </svg>
  );
};

export const CurrencyIcon: React.FC<{ 
  type: 'GOLD' | 'GEMS'; 
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; 
  className?: string;
  coins?: number | null; // SANITIZE SVG DATA: Optional currency value to validate
  gems?: number | null;  // SANITIZE SVG DATA: Optional currency value to validate
}> = ({ type, size = 'sm', className = "", coins, gems }) => {
  // SANITIZE SVG DATA: Validate currency values before rendering
  // If value is provided, it must be a valid number; if not provided, render normally (for icon-only display)
  
  // Validate currency value if provided using centralized utility
  if (type === 'GEMS' && gems !== undefined && gems !== null && !isValidNumber(gems)) {
    console.warn('CurrencyIcon: Invalid gems value, not rendering icon', gems);
    return null;
  }
  if (type === 'GOLD' && coins !== undefined && coins !== null && !isValidNumber(coins)) {
    console.warn('CurrencyIcon: Invalid coins value, not rendering icon', coins);
    return null;
  }
  
  // SVG PATH SAFETY: Validate all inputs to prevent NaN or undefined values in SVG paths
  const iconType = (type === 'GOLD' || type === 'GEMS') ? type : 'GOLD';
  
  // Validate size to ensure it's a valid string
  const validSize = (size === 'xs' || size === 'sm' || size === 'md' || size === 'lg' || size === 'xl') ? size : 'sm';
  const dim = validSize === 'xs' ? 'w-4 h-4' : validSize === 'sm' ? 'w-5 h-5' : validSize === 'lg' ? 'w-12 h-12' : validSize === 'xl' ? 'w-16 h-16' : 'w-8 h-8';
  
  // Ensure className is a valid string (not undefined or null)
  const safeClassName = (typeof className === 'string' ? className : '') || '';
  
  return (
      <div className={`relative ${dim} flex items-center justify-center shrink-0 ${safeClassName}`} style={{ imageRendering: 'auto' }}>
      <div className="w-full h-full relative z-10 transition-transform duration-300 hover:scale-125">
        {/* SANITIZE SVG DATA: Pass currency value to SVG component for validation */}
        {/* SVG components will validate the value internally and return null if invalid */}
        {iconType === 'GOLD' ? <CoinIconSVG coins={coins} /> : <GemIconSVG gems={gems} />}
      </div>
    </div>
  );
};
