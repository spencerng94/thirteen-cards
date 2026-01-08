import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { Purchases, PurchasesPackage, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { supabase } from '../services/supabase';

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

interface BillingContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  userGems: number | null;
  offerings: PurchasesPackage[] | null;
  fetchOfferings: () => Promise<PurchasesPackage[]>;
  buyGems: (pack: PurchasesPackage) => Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }>;
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
  onGemsUpdate?: (newGems: number) => void;
}

export const BillingProvider: React.FC<BillingProviderProps> = ({ 
  children, 
  session,
  onGemsUpdate 
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userGems, setUserGems] = useState<number | null>(null);
  const [offerings, setOfferings] = useState<PurchasesPackage[] | null>(null);
  const [hasLoggedIn, setHasLoggedIn] = useState(false);

  // Initialize RevenueCat - only on native platforms
  useEffect(() => {
    const initializeRevenueCat = async () => {
      // Environment Guard: Only run on native platforms
      if (!Capacitor.isNativePlatform()) {
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
  }, []);

  // Identity Sync: Login to RevenueCat when Supabase session is available
  useEffect(() => {
    const syncIdentity = async () => {
      // RevenueCat Guard: Only run on native platforms
      if (!Capacitor.isNativePlatform()) {
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

        // Update gems from customer info if available
        // Note: RevenueCat doesn't directly store gems, but we can sync from Supabase
        // This is handled by the parent component via onGemsUpdate callback
      } catch (err: any) {
        console.error('BillingProvider: ❌ RevenueCat login failed:', err);
        setError(err.message || 'Failed to login to RevenueCat');
      }
    };

    syncIdentity();
  }, [isInitialized, session, hasLoggedIn]);

  // Cleanup: Logout from RevenueCat when user signs out
  useEffect(() => {
    const handleLogout = async () => {
      // RevenueCat Guard: Only run on native platforms
      if (!Capacitor.isNativePlatform()) {
        return;
      }
      
      // If session is null/undefined and we were logged in, logout from RevenueCat
      if (!session && hasLoggedIn && isInitialized) {
        try {
          console.log('BillingProvider: 🚪 Logging out from RevenueCat');
          await Purchases.logOut();
          setHasLoggedIn(false);
          setUserGems(null);
          setOfferings(null);
          console.log('BillingProvider: ✅ Logged out from RevenueCat');
        } catch (err: any) {
          console.error('BillingProvider: ❌ RevenueCat logout failed:', err);
        }
      }
    };

    handleLogout();
  }, [session, hasLoggedIn, isInitialized]);

  // Fetch offerings (Gem Packages) from RevenueCat
  const fetchOfferings = useCallback(async (): Promise<PurchasesPackage[]> => {
    // RevenueCat Guard: Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
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
        setOfferings(packages);
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
  }, [isInitialized]);

  // Purchase a gem pack
  const buyGems = useCallback(async (
    pack: PurchasesPackage
  ): Promise<{ success: boolean; customerInfo?: CustomerInfo; error?: string }> => {
    // RevenueCat Guard: Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
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

      // Note: The actual gem update should be handled by your backend/webhook
      // RevenueCat will send a webhook to your server, which should then update Supabase
      // For now, we'll trigger a profile refresh via the callback
      if (onGemsUpdate) {
        // The parent component should refresh the profile to get updated gems
        // This is a placeholder - actual gem sync happens server-side via webhook
        onGemsUpdate(0); // Trigger refresh
      }

      return { success: true, customerInfo };
    } catch (err: any) {
      console.error('BillingProvider: ❌ Purchase failed:', err);

      // Handle user cancellation gracefully
      if (err.userCancelled) {
        return { success: false, error: 'Purchase cancelled' };
      }

      return { success: false, error: err.message || 'Purchase failed' };
    }
  }, [isInitialized, session, onGemsUpdate]);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> => {
    // RevenueCat Guard: Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'RevenueCat not available on web platform' };
    }
    
    if (!isInitialized) {
      return { success: false, error: 'RevenueCat not initialized' };
    }

    try {
      console.log('BillingProvider: 🔄 Restoring purchases');
      const customerInfo = await Purchases.restorePurchases();
      console.log('BillingProvider: ✅ Purchases restored');
      return { success: true, customerInfo };
    } catch (err: any) {
      console.error('BillingProvider: ❌ Restore purchases failed:', err);
      return { success: false, error: err.message || 'Restore failed' };
    }
  }, [isInitialized]);

  const value: BillingContextType = {
    isInitialized,
    isLoading,
    error,
    userGems,
    offerings,
    fetchOfferings,
    buyGems,
    restorePurchases,
  };

  return (
    <BillingContext.Provider value={value}>
      {children}
    </BillingContext.Provider>
  );
};
