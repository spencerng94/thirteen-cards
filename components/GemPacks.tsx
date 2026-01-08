import React, { useMemo, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { CurrencyIcon } from './Store';
import { GemPurchaseCelebration } from './GemPurchaseCelebration';
import { processGemTransaction, fetchGemTransactions, GemTransaction, handleGemPurchase, fetchProfile } from '../services/supabase';
import { Toast } from './Toast';
import { audioService } from '../services/audio';
import { useBilling } from './BillingProvider';
import { Capacitor } from '@capacitor/core';
import { PurchasesPackage } from '@revenuecat/purchases-capacitor';

interface GemPack {
  id: string;
  price: string;
  totalGems: number;
  bonusGems: number;
}

const GEM_PACKS: GemPack[] = [
  { id: 'gem_1', price: '$1.99', totalGems: 250, bonusGems: 0 },
  { id: 'gem_2', price: '$4.99', totalGems: 700, bonusGems: 75 },
  { id: 'gem_3', price: '$9.99', totalGems: 1500, bonusGems: 250 },
  { id: 'gem_4', price: '$19.99', totalGems: 3200, bonusGems: 700 },
  { id: 'gem_5', price: '$49.99', totalGems: 8500, bonusGems: 2250 },
  { id: 'gem_6', price: '$99.99', totalGems: 18000, bonusGems: 5500 },
];

/**
 * Enhanced Premium Gem with Sparkle Effects
 */
const HexFacetedGem: React.FC<{ tier: number; size: number; className?: string }> = ({ tier, size, className = "" }) => {
  const isElite = tier >= 5;
  const primary = isElite ? '#ff007f' : '#ec4899';
  const mid = isElite ? '#9d174d' : '#be185d';
  const dark = isElite ? '#4c0519' : '#701a35';
  const glowIntensity = 0.4 + (tier * 0.1);

  const p = {
    top: "50,5",
    tr: "89,27.5",
    br: "89,72.5",
    bottom: "50,95",
    bl: "11,72.5",
    tl: "11,27.5",
    center: "50,50",
    ct: "50,25",
    ctr: "73,38",
    cbr: "73,62",
    cb: "50,75",
    cbl: "27,62",
    ctl: "27,38"
  };

  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} className={`${className} overflow-visible`}>
      <defs>
        <filter id={`facetingBloom-${tier}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
          <feGaussianBlur stdDeviation="2" result="glow" />
        </filter>
        <linearGradient id={`gradFace1-${tier}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="50%" stopColor={primary} stopOpacity="0.8" />
          <stop offset="100%" stopColor={primary} />
        </linearGradient>
        <radialGradient id={`radialGlow-${tier}`} cx="50%" cy="50%">
          <stop offset="0%" stopColor={primary} stopOpacity={glowIntensity} />
          <stop offset="100%" stopColor={primary} stopOpacity="0" />
        </radialGradient>
        <filter id={`sparkle-${tier}`}>
          <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Enhanced Outer Glow */}
      {!className.includes('shard-gem') && (
        <>
          <circle cx="50" cy="50" r="48" fill={`url(#radialGlow-${tier})`} filter={`url(#facetingBloom-${tier})`} className="animate-pulse" />
          <circle cx="50" cy="50" r="45" fill={primary} opacity={0.2 + (tier * 0.05)} filter={`url(#facetingBloom-${tier})`} />
        </>
      )}

      {/* Base Shape */}
      <polygon points={`${p.top} ${p.tr} ${p.br} ${p.bottom} ${p.bl} ${p.tl}`} fill={dark} />

      {/* Faceted Sides with Enhanced Lighting */}
      <g opacity={0.85}>
        <polygon points={`${p.center} ${p.top} ${p.tr}`} fill={primary} opacity="0.95" />
        <polygon points={`${p.center} ${p.tr} ${p.br}`} fill={mid} opacity="1" />
        <polygon points={`${p.center} ${p.br} ${p.bottom}`} fill={dark} opacity="0.85" />
        <polygon points={`${p.center} ${p.bottom} ${p.bl}`} fill={dark} opacity="1" />
        <polygon points={`${p.center} ${p.bl} ${p.tl}`} fill={mid} opacity="0.95" />
        <polygon points={`${p.center} ${p.tl} ${p.top}`} fill={primary} opacity="1" />
      </g>

      {/* Faceted Top with Gradient */}
      <g stroke="white" strokeWidth="0.6" strokeOpacity="0.4">
        <polygon points={`${p.ct} ${p.ctr} ${p.cbr} ${p.cb} ${p.cbl} ${p.ctl}`} fill={`url(#gradFace1-${tier})`} opacity="0.95" />
        <line x1="50" y1="5" x2="50" y2="25" />
        <line x1="89" y1="27.5" x2="73" y2="38" />
        <line x1="89" y1="72.5" x2="73" y2="62" />
        <line x1="50" y1="95" x2="50" y2="75" />
        <line x1="11" y1="72.5" x2="27" y2="62" />
        <line x1="11" y1="27.5" x2="27" y2="38" />
      </g>

      {/* Enhanced Highlights */}
      <g style={{ mixBlendMode: 'plus-lighter' }}>
        <path d="M50 25 L73 38 L50 42 Z" fill="white" opacity="0.5" />
        <path d="M27 38 L50 25 L50 35 Z" fill="white" opacity="0.3" />
        <path d="M50 25 L50 50 L73 38 Z" fill="white" opacity="0.2" />
      </g>

      {/* Sparkle Points */}
      {!className.includes('shard-gem') && (
        <g filter={`url(#sparkle-${tier})`}>
          <circle cx="50" cy="25" r="1.5" fill="white" opacity="0.9" className="animate-pulse" />
          <circle cx="73" cy="38" r="1" fill="white" opacity="0.8" className="animate-pulse" style={{ animationDelay: '0.3s' }} />
          <circle cx="27" cy="38" r="1" fill="white" opacity="0.8" className="animate-pulse" style={{ animationDelay: '0.6s' }} />
          <circle cx="50" cy="50" r="1.2" fill="white" opacity="0.7" className="animate-pulse" style={{ animationDelay: '0.9s' }} />
        </g>
      )}
    </svg>
  );
};

/**
 * Renders a "Giant Pile" on the floor around the keystone gem.
 */
const GiantPile: React.FC<{ tier: number; baseSize: number }> = ({ tier, baseSize }) => {
  if (tier < 5) return null;

  const shardCount = tier === 5 ? 12 : 24;
  
  // Fixed: Import useMemo from 'react' to fix the "Cannot find name 'useMemo'" error on line 101.
  const shards = useMemo(() => Array.from({ length: shardCount }).map((_, i) => {
    const angle = (i / shardCount) * Math.PI * 2 + (Math.random() * 0.5);
    const radiusX = 35 + Math.random() * 40;
    const radiusY = 15 + Math.random() * 15; // Flattened Y for floor perspective
    return {
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY + 30, // Offset Y to be at the "feet" of the keystone
      rot: Math.random() * 360,
      scale: 0.25 + Math.random() * 0.2,
      delay: Math.random() * -5,
      depth: Math.sin(angle) // -1 is back, 1 is front
    };
  }), [shardCount]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ perspective: '800px' }}>
      {/* Floor Shadow for the whole pile */}
      <div className="absolute top-[65%] left-1/2 -translate-x-1/2 w-48 h-12 bg-pink-900/10 blur-2xl rounded-full"></div>

      {shards.map((s, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(calc(-50% + ${s.x}px), calc(-50% + ${s.y}px)) rotate(${s.rot}deg) scale(${s.scale})`,
            zIndex: s.depth > 0 ? 20 : 5, // Keystone is roughly z-10
            opacity: s.depth < -0.5 ? 0.4 : 0.8, // Distance fade
            filter: `brightness(${0.7 + (s.depth + 1) * 0.15})` // Lighting based on front/back position
          }}
        >
          <HexFacetedGem tier={tier - 2} size={baseSize} className="shard-gem" />
        </div>
      ))}
    </div>
  );
};

const CinematicNode: React.FC<{ tier: number; compact?: boolean }> = ({ tier, compact = false }) => {
  const baseSize = compact ? 28 : 42;
  const size = baseSize + (tier * (compact ? 8 : 16));

  return (
    <div className="relative flex items-center justify-center">
      {/* Enhanced Background Volumetrics */}
      <div className={`absolute ${compact ? 'inset-[-100%]' : 'inset-[-140%]'} bg-pink-600/15 blur-[80px] rounded-full transition-opacity duration-1000 ${tier >= 4 ? 'opacity-100' : 'opacity-40'} animate-pulse`}></div>
      
      {/* Rotating Sparkle Ring */}
      {tier >= 2 && (
        <div className={`absolute ${compact ? 'inset-[-60%]' : tier >= 5 ? 'inset-[-75%]' : 'inset-[-45%]'} border-[0.5px] border-pink-400/20 rounded-full animate-[spin_20s_linear_infinite] opacity-50`}>
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-300 rounded-full shadow-[0_0_15px_#ff007f] animate-pulse"></div>
           {tier >= 4 && (
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-pink-400 rounded-full shadow-[0_0_10px_#ff007f] animate-pulse" style={{ animationDelay: '1s' }}></div>
           )}
        </div>
      )}

      {/* Prismatic Rays (Tier 5+) */}
      {tier >= 5 && (
        <div className={`absolute ${compact ? 'inset-[-200%]' : 'inset-[-300%]'} z-0 pointer-events-none opacity-50`}>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400%] h-[0.5px] bg-gradient-to-r from-transparent via-pink-400/50 to-transparent rotate-[15deg] animate-pulse"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400%] h-[0.5px] bg-gradient-to-r from-transparent via-pink-400/50 to-transparent -rotate-[15deg] animate-pulse" style={{ animationDelay: '2s' }}></div>
           {tier === 6 && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400%] h-[0.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
           )}
        </div>
      )}

      {/* Pile Foundation on Floor (only for larger gems) */}
      {!compact && <GiantPile tier={tier} baseSize={size} />}

      {/* Main Keystone Floating with Enhanced Animation */}
      <div className="relative z-10 transition-all duration-700 hover:scale-110 animate-[float-gem-enhanced_4s_ease-in-out_infinite]">
        <div className="relative" style={{ filter: `drop-shadow(0 0 ${20 + tier * 5}px rgba(236,72,153,${0.4 + tier * 0.1}))` }}>
          <HexFacetedGem tier={tier} size={size} />
        </div>
      </div>
    </div>
  );
};

// Helper function to format time ago
const getTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

export const GemPacks: React.FC<{
  onClose: () => void;
  profile: UserProfile | null;
  onRefreshProfile: () => void;
  isGuest?: boolean;
}> = ({ onClose, profile, onRefreshProfile, isGuest = false }) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [purchasedGems, setPurchasedGems] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [gemTransactions, setGemTransactions] = useState<GemTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [firstPurchaseEligible, setFirstPurchaseEligible] = useState(profile?.first_purchase_eligible ?? true);
  const [revenueCatPackages, setRevenueCatPackages] = useState<PurchasesPackage[]>([]);
  
  const isNative = Capacitor.isNativePlatform();
  
  // Get billing context (must be called unconditionally per React rules)
  // BillingProvider will handle web platforms gracefully (isInitialized will be false)
  let billing: ReturnType<typeof useBilling> | null = null;
  try {
    billing = useBilling();
  } catch (e) {
    // BillingProvider not available (component not wrapped)
    // This is fine - we'll handle it gracefully in the purchase flow
    billing = null;
  }

  // Sync first_purchase_eligible from profile
  useEffect(() => {
    if (profile) {
      setFirstPurchaseEligible(profile.first_purchase_eligible ?? true);
    }
  }, [profile]);

  // Fetch RevenueCat offerings on native platforms
  useEffect(() => {
    const loadOfferings = async () => {
      if (isNative && billing?.isInitialized && billing.fetchOfferings) {
        try {
          const packages = await billing.fetchOfferings();
          setRevenueCatPackages(packages);
          console.log('GemPacks: Loaded', packages.length, 'RevenueCat packages');
        } catch (error) {
          console.error('GemPacks: Failed to load RevenueCat offerings:', error);
        }
      }
    };
    
    loadOfferings();
  }, [isNative, billing?.isInitialized, billing?.fetchOfferings]);

  // Fetch gem transaction history
  useEffect(() => {
    const loadHistory = async () => {
      if (showHistory && profile) {
        setLoadingHistory(true);
        try {
          const transactions = await fetchGemTransactions(profile.id, 5);
          setGemTransactions(transactions);
        } catch (error) {
          console.error('Error loading gem history:', error);
        } finally {
          setLoadingHistory(false);
        }
      }
    };
    loadHistory();
  }, [showHistory, profile]);

  // Calculate best value (gems per dollar)
  const bestValue = useMemo(() => {
    return GEM_PACKS.reduce((best, pack) => {
      const priceNum = parseFloat(pack.price.replace('$', ''));
      const valuePerDollar = pack.totalGems / priceNum;
      return valuePerDollar > best.value ? { pack, value: valuePerDollar } : best;
    }, { pack: GEM_PACKS[0], value: 0 });
  }, []);

  const handlePurchase = async (pack: GemPack) => {
    if (!profile || isProcessing) return;
    
    // Block guest users from purchasing gems
    if (isGuest) {
      setToastMessage('Please sign in to purchase gems. Guest accounts cannot make purchases.');
      setToastType('error');
      setShowToast(true);
      audioService.playError();
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Use Capacitor to detect platform
      const isWeb = !isNative;
      
      if (isWeb) {
        // WEB: Stripe Checkout integration via BillingProvider
        if (!billing) {
          throw new Error('Billing system not available');
        }

        // Find the gem pack in BillingProvider's gemPacks array
        const billingPack = billing.gemPacks.find(p => p.id === pack.id);
        if (!billingPack) {
          throw new Error(`Gem pack "${pack.id}" not found in billing configuration`);
        }

        console.log('GemPacks: Creating Stripe checkout for:', billingPack.priceId);
        
        // Use BillingProvider's buyGemsWeb function
        const result = await billing.buyGemsWeb(billingPack.priceId);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create checkout session');
        }

        // buyGemsWeb will redirect to Stripe Checkout
        // The user will be redirected back to /purchase-success
        // BillingProvider will auto-refresh gem balance on return
        // No need to show celebration here - it will happen after redirect
        
        console.log('GemPacks: Redirecting to Stripe Checkout...');
        // The redirect happens in buyGemsWeb, so we just return
        return;
      } else {
        // MOBILE: RevenueCat IAP integration
        if (!billing || !billing.isInitialized) {
          throw new Error('Billing system not initialized. Please try again.');
        }
        
        // Find matching RevenueCat package by identifier
        // RevenueCat package identifiers should match pack.id (e.g., 'gem_1', 'gem_2')
        const revenueCatPack = revenueCatPackages.find(p => p.identifier === pack.id);
        
        if (!revenueCatPack) {
          // Fallback: Try to find by store product ID or use first available package
          // If no match found, show error
          console.warn('GemPacks: No RevenueCat package found for:', pack.id);
          console.log('GemPacks: Available packages:', revenueCatPackages.map(p => p.identifier));
          
          // If we have packages but no match, show error
          if (revenueCatPackages.length > 0) {
            throw new Error(`Package "${pack.id}" not available. Please try again later.`);
          } else {
            // No packages loaded yet, try fetching again
            const packages = await billing.fetchOfferings();
            setRevenueCatPackages(packages);
            const retryPack = packages.find(p => p.identifier === pack.id);
            
            if (!retryPack) {
              throw new Error('Unable to load purchase options. Please try again later.');
            }
            
            // Use the retry pack
            const purchaseResult = await billing.buyGemsNative(retryPack);
            
            if (!purchaseResult.success) {
              throw new Error(purchaseResult.error || 'Purchase failed');
            }
            
            // Purchase successful - BillingProvider will auto-refresh gem balance
            // Wait a moment for webhook to process, then refresh profile
            await new Promise(resolve => setTimeout(resolve, 1500));
            await onRefreshProfile();
            
            // Get updated profile to show correct gem count
            const updatedProfile = await fetchProfile(profile.id);
            if (updatedProfile) {
              const actualGems = updatedProfile.gems || 0;
              const gemsReceived = actualGems - (profile.gems || 0);
              
              // Update local state to hide badges immediately
              if (updatedProfile.first_purchase_eligible !== undefined) {
                setFirstPurchaseEligible(updatedProfile.first_purchase_eligible);
              }
              
              // Play success sound
              audioService.playPurchase();
              
              // Show celebration
              setPurchasedGems(gemsReceived);
              setShowCelebration(true);
              
              // Show success toast
              setToastMessage(`Successfully purchased ${gemsReceived.toLocaleString()} gems!`);
              setToastType('success');
              setShowToast(true);
            }
            
            return;
          }
        }
        
        // Purchase the RevenueCat package
        console.log('GemPacks: Purchasing RevenueCat package:', revenueCatPack.identifier);
        const purchaseResult = await billing.buyGemsNative(revenueCatPack);
        
        if (!purchaseResult.success) {
          throw new Error(purchaseResult.error || 'Purchase failed');
        }
        
        // Purchase successful - BillingProvider will auto-refresh gem balance
        // Wait a moment for webhook to process, then refresh profile
        await new Promise(resolve => setTimeout(resolve, 1500));
        await onRefreshProfile();
        
        // Get updated profile to show correct gem count
        const updatedProfile = await fetchProfile(profile.id);
        if (updatedProfile) {
          const actualGems = updatedProfile.gems || 0;
          const gemsReceived = actualGems - (profile.gems || 0);
          
          // Update local state to hide badges immediately
          if (updatedProfile.first_purchase_eligible !== undefined) {
            setFirstPurchaseEligible(updatedProfile.first_purchase_eligible);
          }
          
          // Play success sound
          audioService.playPurchase();
          
          // Show celebration
          setPurchasedGems(gemsReceived);
          setShowCelebration(true);
          
          // Show success toast
          setToastMessage(`Successfully purchased ${gemsReceived.toLocaleString()} gems!`);
          setToastType('success');
          setShowToast(true);
        }
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      setToastMessage(error.message || 'Purchase failed. Please try again.');
      setToastType('error');
      setShowToast(true);
      audioService.playError();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-3 sm:p-4 animate-in fade-in duration-700 overflow-hidden" onClick={onClose}>
      
      {/* Enhanced Deep Space Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
         {Array.from({ length: 60 }).map((_, i) => (
           <div key={i} className="absolute w-[1.5px] h-[1.5px] bg-white rounded-full animate-float-pixel-v3" style={{
             left: `${Math.random() * 100}%`,
             top: `${Math.random() * 100}%`,
             animationDelay: `${Math.random() * 8}s`,
             animationDuration: `${12 + Math.random() * 10}s`
           } as any} />
         ))}
      </div>

      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.1)_0%,transparent_70%)]"></div>

      <div className="relative bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#000000] border border-white/10 w-full max-w-6xl max-h-[95vh] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_0_300px_rgba(0,0,0,1)] flex flex-col transition-all" onClick={e => e.stopPropagation()}>
        
        {/* Compact Mobile-First Header */}
        <div className="relative p-3 sm:p-4 border-b border-white/10 bg-gradient-to-r from-white/[0.03] via-transparent to-white/[0.03]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.1)_0%,transparent_70%)]"></div>
          <div className="relative flex justify-between items-center gap-3">
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight font-serif leading-none">
                GEM PACKS
              </h1>
              <p className="text-[9px] sm:text-[10px] font-semibold text-pink-400/80 uppercase tracking-wider mt-0.5">
                Premium Currency
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Compact Current Gems Display */}
              <div className="flex items-center gap-1.5 bg-gradient-to-br from-pink-500/20 to-pink-600/10 border border-pink-500/30 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
                <CurrencyIcon type="GEMS" size="xs" />
                <span className="text-base sm:text-lg font-black text-pink-400 italic leading-none font-mono">
                  {(profile?.gems || 0).toLocaleString()}
                </span>
              </div>
              
              {/* History Button */}
              {profile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHistory(!showHistory);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-90 group shrink-0"
                  title="Gem Purchase History"
                >
                  <span className="text-base sm:text-lg group-hover:scale-110 transition-transform duration-300">📜</span>
                </button>
              )}
              
              <button 
                onClick={onClose} 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-90 group shrink-0"
              >
                <span className="text-base sm:text-lg group-hover:rotate-90 transition-transform duration-300">✕</span>
              </button>
            </div>
          </div>
        </div>

        {/* Compact Grid Layout - Mobile First */}
        <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 sm:p-4 pb-16 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 auto-rows-fr">
            {GEM_PACKS.map((pack, idx) => {
              const tier = idx + 1;
              const isElite = tier >= 5;
              const isBestValue = bestValue.pack.id === pack.id;
              const isMostPopular = pack.price === '$19.99';
              const priceNum = parseFloat(pack.price.replace('$', ''));
              const gemsPerDollar = Math.round(pack.totalGems / priceNum);

              return (
                <div 
                  key={pack.id}
                  className={`group relative rounded-lg sm:rounded-xl border-2 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col
                    ${isElite 
                      ? 'bg-gradient-to-br from-[#1a0008] via-[#0a0004] to-black border-pink-500/40 shadow-[inset_0_0_40px_rgba(236,72,153,0.1),0_0_30px_rgba(236,72,153,0.2)]' 
                      : 'bg-gradient-to-br from-white/[0.03] via-white/[0.02] to-black border-white/10 hover:border-white/20 hover:bg-white/[0.05]'}
                    ${isBestValue ? 'ring-2 ring-yellow-500/40' : ''}
                    ${isMostPopular ? 'ring-2 ring-pink-500/50' : ''}
                    hover:scale-[1.02] active:scale-[0.98]
                  `}
                >
                  {/* Badges */}
                  <div className="absolute top-1.5 right-1.5 z-20 flex flex-col gap-1.5 items-end">
                    {firstPurchaseEligible && profile && (
                      <div className="relative bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 text-black text-[7px] sm:text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border border-yellow-300 uppercase tracking-wider overflow-hidden">
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        <span className="relative z-10">2x BONUS</span>
                      </div>
                    )}
                    {isMostPopular && (
                      <div className="bg-gradient-to-br from-pink-400 to-pink-600 text-white text-[7px] sm:text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border border-pink-300 uppercase tracking-wider">
                        🔥 POPULAR
                      </div>
                    )}
                    {isBestValue && !isMostPopular && (
                      <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black text-[7px] sm:text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border border-yellow-300 uppercase tracking-wider">
                        ⭐ BEST
                      </div>
                    )}
                  </div>

                  <div className="relative p-2.5 sm:p-3 flex flex-col items-center flex-1 justify-between gap-2 sm:gap-2.5">
                    {/* Top Section: Gem Visual and Info */}
                    <div className="flex flex-col items-center gap-2 sm:gap-2.5 w-full">
                      {/* Compact Visual Node */}
                      <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                         <CinematicNode tier={tier} compact={true} />
                      </div>

                      {/* Compact Info Section */}
                      <div className="relative z-10 w-full flex flex-col items-center gap-1.5 sm:gap-2">
                         {/* Gem Count */}
                         <div className="flex flex-col items-center">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl sm:text-2xl font-black text-white italic tracking-tighter leading-none font-serif drop-shadow-2xl">
                                {pack.totalGems.toLocaleString()}
                              </span>
                              <CurrencyIcon type="GEMS" size="xs" />
                            </div>
                            
                            {pack.bonusGems > 0 ? (
                              <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-gradient-to-r from-pink-500/20 to-pink-600/20 border border-pink-500/30 rounded">
                                <span className="text-[7px] sm:text-[8px] font-black text-white/40 uppercase tracking-wider line-through">
                                  {(pack.totalGems - pack.bonusGems).toLocaleString()}
                                </span>
                                <span className="text-[7px] sm:text-[8px] font-black text-pink-400 uppercase tracking-wider animate-pulse">
                                  +{pack.bonusGems.toLocaleString()}
                                </span>
                              </div>
                            ) : null}
                         </div>

                         {/* Price */}
                         <div className="flex flex-col items-center">
                            <span className="text-lg sm:text-xl font-black text-white italic leading-none">
                              {pack.price}
                            </span>
                         </div>
                      </div>
                    </div>
                    
                    {/* Bottom Section: Purchase Button - Always Flush */}
                    <div className="w-full mt-auto">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           handlePurchase(pack);
                         }}
                         disabled={isProcessing || !profile || isGuest}
                         className="w-full px-3 py-1.5 sm:py-2 rounded-lg border-2 bg-gradient-to-br from-pink-500/20 to-pink-600/20 border-pink-500/40 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider hover:from-pink-500/30 hover:to-pink-600/30 hover:border-pink-500/60 hover:shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all duration-300 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:from-pink-500/20 disabled:hover:to-pink-600/20"
                       >
                          {isProcessing ? 'Processing...' : isGuest ? 'Sign In Required' : 'Purchase'}
                       </button>
                    </div>

                    {/* Tech Pattern Decoration */}
                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-screen overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    </div>
                    
                    {/* Visual Depth Glow */}
                    <div className={`absolute -left-10 -bottom-10 w-32 h-32 blur-[60px] rounded-full transition-opacity duration-500 ${
                      isElite ? 'bg-pink-500/10 opacity-100' : 'bg-pink-500/5 opacity-50'
                    }`}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Footer Message */}
          <div className="pt-3 sm:pt-4 pb-2 flex flex-col items-center text-center space-y-1.5">
             {isGuest ? (
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                 <span className="w-1 h-1 rounded-full bg-yellow-500 animate-pulse shadow-[0_0_6px_#eab308]"></span>
                 <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-yellow-400">Sign In Required</p>
               </div>
             ) : (
               <>
                 <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                   <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]"></span>
                   <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-red-400">Payment Offline</p>
                 </div>
                 <p className="text-[8px] sm:text-[9px] font-medium max-w-md uppercase tracking-wider leading-relaxed text-white/50 px-3">
                   Payment integration in progress. Coming soon.
                 </p>
               </>
             )}
          </div>
        </div>

        {/* History Modal */}
        {showHistory && (
          <div 
            className="absolute inset-0 bg-black/95 backdrop-blur-3xl z-50 flex flex-col p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>📜</span>
                <span>Gem Activity History</span>
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-90 group"
              >
                <span className="text-lg group-hover:rotate-90 transition-transform duration-300">✕</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              ) : gemTransactions.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <p className="text-sm">No gem transactions yet</p>
                  <p className="text-xs mt-2">Watch ads or make purchases to see activity here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gemTransactions.map((transaction) => {
                    const isPositive = transaction.amount > 0;
                    const amount = Math.abs(transaction.amount);
                    const sourceNames: Record<string, string> = {
                      'ad_reward': 'Ad Reward',
                      'iap_purchase': 'IAP Purchase',
                      'shop_buy': 'Shop Purchase'
                    };
                    const sourceName = sourceNames[transaction.source] || transaction.source;
                    const date = new Date(transaction.created_at);
                    const timeAgo = getTimeAgo(date);
                    
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isPositive ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-pink-500/20 border border-pink-500/30'
                          }`}>
                            <span className="text-lg">{isPositive ? '+' : '-'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-base sm:text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-pink-400'}`}>
                                {isPositive ? '+' : '-'}{amount}
                              </span>
                              <CurrencyIcon type="GEMS" size="xs" />
                            </div>
                            <p className="text-xs sm:text-sm text-white/70 truncate">{sourceName}</p>
                            {transaction.item_id && (
                              <p className="text-xs text-white/50 truncate">Item: {transaction.item_id}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-white/50">{timeAgo}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gradient Fade Bottom */}
        <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none z-20"></div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-gem-enhanced {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          25% { transform: translateY(-8px) rotate(1deg) scale(1.02); }
          50% { transform: translateY(-12px) rotate(0deg) scale(1.05); }
          75% { transform: translateY(-8px) rotate(-1deg) scale(1.02); }
        }
        @keyframes float-pixel-v3 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.5; }
          80% { opacity: 0.5; }
          100% { transform: translateY(-60px) translateX(20px); opacity: 0; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}} />

      {/* Gem Purchase Celebration */}
      {showCelebration && profile && (
        <GemPurchaseCelebration
          gemsPurchased={purchasedGems}
          totalGems={(profile.gems || 0) + purchasedGems}
          onClose={() => {
            setShowCelebration(false);
            setPurchasedGems(0);
          }}
        />
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
          type={toastType}
        />
      )}
    </div>
  );
};