import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { Purchases, PurchasesPackage, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { supabase } from '../src/lib/supabase';
import { fetchProfile } from '../services/supabase';

// Helper to get environment variables
const getEnv = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {}
  return undefined;
};

// Gem pack configuration (used for both web and mobile)
export interface GemPack {
  id: string;
  priceId: string; // Stripe price ID for web
  price: number; // Price in dollars
  gems: number; // Number of gems
  bonusGems?: number; // Bonus gems (for first purchase, etc.)
}

// Default gem packs with actual Stripe Price IDs
// These are used for web purchases via Stripe Checkout
const DEFAULT_GEM_PACKS: GemPack[] = [
  { id: 'gem_1', priceId: 'price_1SnKGnBkgBBl4oR7dpSEBZi2', price: 1.99, gems: 250 },
  { id: 'gem_2', priceId: 'price_1SnKJPBkgBBl4oR73f3SbUEB', price: 4.99, gems: 700, bonusGems: 75 },
  { id: 'gem_3', priceId: 'price_1SnKJlBkgBBl4oR7j1NG2RHA', price: 9.99, gems: 1500, bonusGems: 250 },
  { id: 'gem_4', priceId: 'price_1SnKK1BkgBBl4oR7syKR0aVL', price: 19.99, gems: 3200, bonusGems: 700 },
  { id: 'gem_5', priceId: 'price_1SnKKHBkgBBl4oR72Bmxygd1', price: 49.99, gems: 8500, bonusGems: 2250 },
  { id: 'gem_6', priceId: 'price_1SnKKVBkgBBl4oR7IzVPVDyf', price: 99.99, gems: 18000, bonusGems: 5500 },
];

interface BillingContextType {
  // State
  gemBalance: number | null;
  availablePackages: PurchasesPackage[] | null; // RevenueCat packages (mobile only)
  gemPacks: GemPack[]; // Available gem packs (web + mobile)
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchGemBalance: () => Promise<void>;
  fetchOfferings: () => Promise<PurchasesPackage[]>;
  buyGemsWeb: (priceId: string) => Promise<{ success: boolean; checkoutUrl?: string; error?: string }>;
  buyGemsNative: (pack: PurchasesPackage) => Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error('useBilling must be used within BillingProvider');
  }
  return context;
};

interface BillingProviderProps {
  children: ReactNode;
  session: any; // Supabase session
  profile?: any; // User profile (optional, will fetch if not provided)
  onGemsUpdate?: (newGems: number) => void;
}

export const BillingProvider: React.FC<BillingProviderProps> = ({ 
  children, 
  session,
  profile: initialProfile,
  onGemsUpdate 
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gemBalance, setGemBalance] = useState<number | null>(null);
  const [availablePackages, setAvailablePackages] = useState<PurchasesPackage[] | null>(null);
  const [hasLoggedIn, setHasLoggedIn] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  // Fetch gem balance from Supabase profiles table
  // Stabilize: Only trigger when userId is stable and defined
  const fetchGemBalance = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || userId === 'pending') {
      setGemBalance(null);
      return;
    }

    try {
      console.log(`BillingProvider: 💎 Fetching gem balance from Supabase for UUID: ${userId}...`);
      const userProfile = await fetchProfile(userId);
      
      if (userProfile) {
        const gems = userProfile.gems ?? 0;
        setGemBalance(gems);
        console.log('BillingProvider: ✅ Gem balance fetched:', gems);
        
        // Notify parent component of gem update
        if (onGemsUpdate) {
          onGemsUpdate(gems);
        }
      } else {
        console.warn('BillingProvider: No profile found for user');
        setGemBalance(0);
      }
    } catch (err: any) {
      // Silence AbortError - don't trigger state updates that would cause another render
      if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message === 'PROFILE_FETCH_ABORTED' || (err as any).isAbortError) {
        console.warn('BillingProvider: Gem balance fetch was aborted (silenced - no state update)');
        return; // Don't set error state, don't trigger re-render
      }
      console.error('BillingProvider: ❌ Failed to fetch gem balance:', err);
      setError(err.message || 'Failed to fetch gem balance');
    }
  }, [session?.user?.id, onGemsUpdate]);

  // Initialize RevenueCat - only on native platforms
  useEffect(() => {
    const initializeRevenueCat = async () => {
      // Environment Guard: Only run on native platforms
      if (!isNative) {
        console.log('BillingProvider: Skipping RevenueCat initialization - not on native platform');
        setIsInitialized(false);
        setIsLoading(false);
        return;
      }

      try {
        const platform = Capacitor.getPlatform();
        let apiKey: string | undefined;

        // Get platform-specific API key from environment variables
        if (platform === 'ios') {
          apiKey = getEnv('VITE_REVENUECAT_IOS_KEY');
          if (!apiKey) {
            console.warn('BillingProvider: VITE_REVENUECAT_IOS_KEY not found');
          }
        } else if (platform === 'android') {
          apiKey = getEnv('VITE_REVENUECAT_ANDROID_KEY');
          if (!apiKey) {
            console.warn('BillingProvider: VITE_REVENUECAT_ANDROID_KEY not found');
          }
        }

        if (!apiKey) {
          console.warn('BillingProvider: RevenueCat API key not found for platform:', platform);
          setIsInitialized(false);
          setIsLoading(false);
          return;
        }

        console.log('BillingProvider: Initializing RevenueCat for platform:', platform);

        // Configure RevenueCat
        await Purchases.configure({
          apiKey,
          appUserID: null, // Will be set after login
        });

        setIsInitialized(true);
        console.log('BillingProvider: ✅ RevenueCat initialized successfully');
      } catch (err: any) {
        console.error('BillingProvider: ❌ RevenueCat initialization failed:', err);
        setError(err.message || 'Failed to initialize RevenueCat');
        setIsInitialized(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeRevenueCat();
  }, [isNative]);

  // Identity Sync: Login to RevenueCat when Supabase session is available
  useEffect(() => {
    const syncIdentity = async () => {
      // RevenueCat Guard: Only run on native platforms
      if (!isNative) {
        return;
      }
      
      // Only proceed if RevenueCat is initialized and we have a session
      if (!isInitialized || !session?.user?.id || hasLoggedIn) {
        return;
      }

      try {
        const userId = session.user.id;
        console.log('BillingProvider: 🔐 Logging into RevenueCat with user ID:', userId);

        const { customerInfo, created } = await Purchases.logIn(userId);

        setHasLoggedIn(true);

        if (created) {
          console.log('BillingProvider: ✅ New RevenueCat customer created');
        } else {
          console.log('BillingProvider: ✅ Existing RevenueCat customer logged in');
        }
      } catch (err: any) {
        console.error('BillingProvider: ❌ RevenueCat login failed:', err);
        setError(err.message || 'Failed to login to RevenueCat');
      }
    };

    syncIdentity();
  }, [isInitialized, session, hasLoggedIn, isNative]);

  // Cleanup: Logout from RevenueCat when user signs out
  useEffect(() => {
    const handleLogout = async () => {
      // RevenueCat Guard: Only run on native platforms
      if (!isNative) {
        return;
      }
      
      // If session is null/undefined and we were logged in, logout from RevenueCat
      if (!session && hasLoggedIn && isInitialized) {
        try {
          console.log('BillingProvider: 🚪 Logging out from RevenueCat');
          await Purchases.logOut();
          setHasLoggedIn(false);
          setGemBalance(null);
          setAvailablePackages(null);
          console.log('BillingProvider: ✅ Logged out from RevenueCat');
        } catch (err: any) {
          console.error('BillingProvider: ❌ RevenueCat logout failed:', err);
        }
      }
    };

    handleLogout();
  }, [session, hasLoggedIn, isInitialized, isNative]);

  // Fetch gem balance when session changes or profile is provided
  // Stabilize: Only trigger when userId is stable and defined (not 'pending')
  const stableUserId = session?.user?.id && session.user.id !== 'pending' ? session.user.id : null;
  useEffect(() => {
    if (initialProfile?.gems !== undefined) {
      setGemBalance(initialProfile.gems ?? 0);
    } else if (stableUserId) {
      fetchGemBalance();
    } else {
      setGemBalance(null);
    }
  }, [stableUserId, initialProfile?.gems, fetchGemBalance]);

  // Auto-refresh gem balance when returning from Stripe redirect
  useEffect(() => {
    const checkStripeReturn = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isStripeReturn = urlParams.has('session_id') || 
                            window.location.pathname === '/purchase-success' ||
                            window.location.pathname === '/purchase-cancel';
      
      if (isStripeReturn && session?.user?.id) {
        console.log('BillingProvider: 🔄 Detected Stripe return, refreshing gem balance...');
        // Wait a moment for webhook to process, then refresh
        setTimeout(() => {
          fetchGemBalance();
        }, 2000);
      }
    };

    checkStripeReturn();
  }, [session?.user?.id, fetchGemBalance]);

  // Fetch offerings (Gem Packages) from RevenueCat (mobile only)
  const fetchOfferings = useCallback(async (): Promise<PurchasesPackage[]> => {
    if (!isNative) {
      console.warn('BillingProvider: RevenueCat not available on web platform');
      return [];
    }
    
    if (!isInitialized) {
      console.warn('BillingProvider: RevenueCat not initialized, cannot fetch offerings');
      return [];
    }

    try {
      console.log('BillingProvider: 📦 Fetching offerings from RevenueCat');
      const offeringsData = await Purchases.getOfferings();

      if (offeringsData.current !== null) {
        const packages = offeringsData.current.availablePackages;
        setAvailablePackages(packages);
        console.log('BillingProvider: ✅ Fetched', packages.length, 'packages');
        return packages;
      }

      console.warn('BillingProvider: No current offering available');
      return [];
    } catch (err: any) {
      console.error('BillingProvider: ❌ Failed to fetch offerings:', err);
      setError(err.message || 'Failed to fetch offerings');
      return [];
    }
  }, [isInitialized, isNative]);

  // Web: Buy gems using Stripe Checkout
  const buyGemsWeb = useCallback(async (
    priceId: string
  ): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> => {
    if (isNative) {
      return { success: false, error: 'Stripe checkout not available on native platform' };
    }

    if (!session?.user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    // Find the gem pack by priceId
    const pack = DEFAULT_GEM_PACKS.find(p => p.priceId === priceId);
    if (!pack) {
      return { success: false, error: `Gem pack not found for priceId: ${priceId}` };
    }

    try {
      console.log('BillingProvider: 💳 Creating Stripe checkout session for:', priceId);
      
      // Get backend URL (Render backend or localhost)
      const backendUrl = getEnv('VITE_BACKEND_URL') || getEnv('VITE_SERVER_URL') || 'http://localhost:3001';
      
      // Get current session token
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        return { success: false, error: 'Not authenticated' };
      }

      // Call Render backend to create Stripe Checkout session
      // Platform-agnostic: sends 'web' for web platform
      const response = await fetch(`${backendUrl}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          user_id: session.user.id, // Standardized field name
          priceId: pack.priceId,
          gemAmount: pack.gems,
          platform: 'web', // Track that this is a web purchase
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      console.log('BillingProvider: ✅ Stripe checkout session created');

      // Redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return { success: true, checkoutUrl: data.checkoutUrl };
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('BillingProvider: ❌ Stripe checkout failed:', err);
      return { success: false, error: err.message || 'Failed to create checkout session' };
    }
  }, [isNative, session]);

  // Mobile: Buy gems using RevenueCat
  const buyGemsNative = useCallback(async (
    pack: PurchasesPackage
  ): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> => {
    if (!isNative) {
      return { success: false, error: 'RevenueCat not available on web platform' };
    }
    
    if (!isInitialized) {
      return { success: false, error: 'RevenueCat not initialized' };
    }

    if (!session?.user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      console.log('BillingProvider: 💳 Purchasing package:', pack.identifier);

      const { customerInfo } = await Purchases.purchasePackage(pack);

      console.log('BillingProvider: ✅ Purchase successful');

      // Auto-refresh gem balance after successful purchase
      // The webhook should have updated Supabase, but we refresh to be sure
      setTimeout(() => {
        fetchGemBalance();
      }, 1000);

      return { success: true, customerInfo };
    } catch (err: any) {
      console.error('BillingProvider: ❌ Purchase failed:', err);

      // Handle user cancellation gracefully
      if (err.userCancelled) {
        return { success: false, error: 'Purchase cancelled' };
      }

      return { success: false, error: err.message || 'Purchase failed' };
    }
  }, [isInitialized, session, isNative, fetchGemBalance]);

  // Restore purchases (mobile only)
  const restorePurchases = useCallback(async (): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> => {
    if (!isNative) {
      return { success: false, error: 'RevenueCat not available on web platform' };
    }
    
    if (!isInitialized) {
      return { success: false, error: 'RevenueCat not initialized' };
    }

    try {
      console.log('BillingProvider: 🔄 Restoring purchases');
      const customerInfo = await Purchases.restorePurchases();
      console.log('BillingProvider: ✅ Purchases restored');
      
      // Refresh gem balance after restore
      fetchGemBalance();
      
      return { success: true, customerInfo };
    } catch (err: any) {
      console.error('BillingProvider: ❌ Restore purchases failed:', err);
      return { success: false, error: err.message || 'Restore failed' };
    }
  }, [isInitialized, isNative, fetchGemBalance]);

  const value: BillingContextType = {
    gemBalance,
    availablePackages,
    gemPacks: DEFAULT_GEM_PACKS,
    isInitialized,
    isLoading,
    error,
    fetchGemBalance,
    fetchOfferings,
    buyGemsWeb,
    buyGemsNative,
    restorePurchases,
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
};
