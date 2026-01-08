import { useEffect, useState, useCallback } from 'react';
import { Purchases, PurchasesPackage, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { supabase } from '../services/supabase';

/**
 * Hook for managing RevenueCat purchases and gem transactions
 * Handles initialization, login, and purchase flow for mobile IAP
 */
export const useGems = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Initialize RevenueCat
  useEffect(() => {
    const initRevenueCat = async () => {
      // Only initialize on mobile platforms (iOS/Android)
      if (typeof window === 'undefined') return;
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!isMobile) {
        setIsInitialized(false);
        setIsLoading(false);
        return;
      }

      try {
        // Get RevenueCat API key from environment
        const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
        if (!apiKey) {
          console.warn('RevenueCat API key not found. IAP will not work.');
          setIsInitialized(false);
          setIsLoading(false);
          return;
        }

        // Initialize RevenueCat
        await Purchases.configure({
          apiKey,
          appUserID: null, // Will be set after login
        });

        setIsInitialized(true);
        console.log('✅ RevenueCat initialized successfully');
      } catch (err: any) {
        console.error('❌ RevenueCat initialization failed:', err);
        setError(err.message || 'Failed to initialize RevenueCat');
        setIsInitialized(false);
      } finally {
        setIsLoading(false);
      }
    };

    initRevenueCat();
  }, []);

  // Login to RevenueCat when user is authenticated
  const loginToRevenueCat = useCallback(async (supabaseUserId: string) => {
    if (!isInitialized) {
      console.warn('RevenueCat not initialized. Cannot login.');
      return;
    }

    try {
      console.log('🔐 Logging into RevenueCat with user ID:', supabaseUserId);
      
      const { customerInfo: info, created } = await Purchases.logIn(supabaseUserId);
      
      setCustomerInfo(info);
      
      if (created) {
        console.log('✅ New RevenueCat customer created');
      } else {
        console.log('✅ Existing RevenueCat customer logged in');
      }

      return { success: true, customerInfo: info };
    } catch (err: any) {
      console.error('❌ RevenueCat login failed:', err);
      setError(err.message || 'Failed to login to RevenueCat');
      return { success: false, error: err.message };
    }
  }, [isInitialized]);

  // Purchase a package
  const purchasePackage = useCallback(async (pack: PurchasesPackage): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> => {
    if (!isInitialized) {
      return { success: false, error: 'RevenueCat not initialized' };
    }

    try {
      console.log('💳 Purchasing package:', pack.identifier);
      
      const { customerInfo: info } = await Purchases.purchasePackage(pack);
      
      setCustomerInfo(info);
      
      console.log('✅ Purchase successful:', info);
      
      return { success: true, customerInfo: info };
    } catch (err: any) {
      console.error('❌ Purchase failed:', err);
      
      // Handle user cancellation gracefully
      if (err.userCancelled) {
        return { success: false, error: 'Purchase cancelled' };
      }

      return { success: false, error: err.message || 'Purchase failed' };
    }
  }, [isInitialized]);

  // Get available packages (offerings)
  const getPackages = useCallback(async (): Promise<PurchasesPackage[]> => {
    if (!isInitialized) {
      return [];
    }

    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current !== null) {
        return offerings.current.availablePackages;
      }

      return [];
    } catch (err: any) {
      console.error('❌ Failed to get packages:', err);
      return [];
    }
  }, [isInitialized]);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<{
    success: boolean;
    customerInfo?: CustomerInfo;
    error?: string;
  }> => {
    if (!isInitialized) {
      return { success: false, error: 'RevenueCat not initialized' };
    }

    try {
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return { success: true, customerInfo: info };
    } catch (err: any) {
      console.error('❌ Restore purchases failed:', err);
      return { success: false, error: err.message || 'Restore failed' };
    }
  }, [isInitialized]);

  return {
    isInitialized,
    isLoading,
    error,
    customerInfo,
    loginToRevenueCat,
    purchasePackage,
    getPackages,
    restorePurchases,
  };
};
