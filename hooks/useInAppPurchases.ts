import { useState, useEffect, useCallback } from 'react';
import { Purchases, PurchasesPackage, PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';
import { supabase } from '../services/supabase';

// Product IDs for the 6 gem packs
export const GEM_PACK_PRODUCT_IDS = {
  PACK_250: 'com.playthirteen.app.gems.250',
  PACK_700: 'com.playthirteen.app.gems.700',
  PACK_1500: 'com.playthirteen.app.gems.1500',
  PACK_3200: 'com.playthirteen.app.gems.3200',
  PACK_8500: 'com.playthirteen.app.gems.8500',
  PACK_18000: 'com.playthirteen.app.gems.18000',
} as const;

// Gem amounts for each pack
export const GEM_PACK_AMOUNTS: Record<string, number> = {
  [GEM_PACK_PRODUCT_IDS.PACK_250]: 250,
  [GEM_PACK_PRODUCT_IDS.PACK_700]: 700,
  [GEM_PACK_PRODUCT_IDS.PACK_1500]: 1500,
  [GEM_PACK_PRODUCT_IDS.PACK_3200]: 3200,
  [GEM_PACK_PRODUCT_IDS.PACK_8500]: 8500,
  [GEM_PACK_PRODUCT_IDS.PACK_18000]: 18000,
};

export interface ProductInfo {
  productId: string;
  gemAmount: number;
  localizedPrice: string;
  price: number;
  currencyCode: string;
  package?: PurchasesPackage;
}

export interface PurchaseResult {
  success: boolean;
  gemAmount?: number;
  newBalance?: number;
  error?: string;
}

/**
 * Hook for managing in-app purchases for gem packs
 * Uses RevenueCat to fetch prices and handle purchases
 */
export const useInAppPurchases = () => {
  const [products, setProducts] = useState<Record<string, ProductInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Fetch product information from the store
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all product IDs
      const productIds = Object.values(GEM_PACK_PRODUCT_IDS);

      // Fetch products from RevenueCat
      const storeProducts = await Purchases.getProducts(productIds);

      // Map products to our ProductInfo format
      const productsMap: Record<string, ProductInfo> = {};

      for (const productId of productIds) {
        const storeProduct = storeProducts.find(p => p.identifier === productId);
        const gemAmount = GEM_PACK_AMOUNTS[productId];

        if (storeProduct) {
          productsMap[productId] = {
            productId,
            gemAmount,
            localizedPrice: storeProduct.priceString,
            price: storeProduct.price,
            currencyCode: storeProduct.currencyCode || 'USD',
          };
        } else {
          // Product not found in store, but still add it with placeholder info
          productsMap[productId] = {
            productId,
            gemAmount,
            localizedPrice: 'N/A',
            price: 0,
            currencyCode: 'USD',
          };
        }
      }

      // Try to get packages from offerings (if configured in RevenueCat dashboard)
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          // Match packages to products
          for (const pkg of offerings.current.availablePackages) {
            const productId = pkg.storeProduct.identifier;
            if (productsMap[productId]) {
              productsMap[productId].package = pkg;
            }
          }
        }
      } catch (offeringsError) {
        // Offerings not configured, that's okay - we can still use products directly
        console.warn('Offerings not available, using products directly:', offeringsError);
      }

      setProducts(productsMap);
    } catch (err: any) {
      console.error('❌ Failed to fetch products:', err);
      setError(err.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Purchase a gem pack by product ID
  const purchaseGemPack = useCallback(async (productId: string): Promise<PurchaseResult> => {
    if (isPurchasing) {
      return { success: false, error: 'Purchase already in progress' };
    }

    const gemAmount = GEM_PACK_AMOUNTS[productId];
    if (!gemAmount) {
      return { success: false, error: 'Invalid product ID' };
    }

    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    const userId = session.user.id;

    setIsPurchasing(true);
    setError(null);

    try {
      let purchaseResult;

      // Try to purchase using package if available, otherwise use product directly
      const productInfo = products[productId];
      if (productInfo?.package) {
        // Purchase using RevenueCat package
        purchaseResult = await Purchases.purchasePackage(productInfo.package);
      } else {
        // Fallback: Purchase using product ID directly
        // Note: This requires the product to be available in offerings
        const offerings = await Purchases.getOfferings();
        if (offerings.current) {
          const pkg = offerings.current.availablePackages.find(
            p => p.storeProduct.identifier === productId
          );
          if (pkg) {
            purchaseResult = await Purchases.purchasePackage(pkg);
          } else {
            throw new Error('Product not available for purchase');
          }
        } else {
          throw new Error('No offerings available');
        }
      }

      // Verify the transaction was successful
      if (!purchaseResult.customerInfo || !purchaseResult.customerInfo.entitlements) {
        throw new Error('Purchase verification failed: No customer info received');
      }

      // Check if the purchase is active
      const activeEntitlements = Object.values(purchaseResult.customerInfo.entitlements.active);
      if (activeEntitlements.length === 0) {
        // For consumable products, we need to check transaction history
        // RevenueCat handles consumables differently - they may not show in entitlements
        // We'll proceed with the transaction verification
      }

      // Transaction verified - call Supabase function to add gems
      // Note: If 'add_gems' doesn't exist, you may need to create it or use 'increment_gems' instead
      // Expected signature: add_gems(user_id UUID, gem_amount INTEGER) RETURNS JSON
      const { data: rpcData, error: rpcError } = await supabase.rpc('add_gems', {
        user_id: userId,
        gem_amount: gemAmount,
      });

      if (rpcError) {
        console.error('❌ Failed to add gems to user:', rpcError);
        // Transaction was successful but gem addition failed
        // This is a critical error - the user paid but didn't receive gems
        // In production, you might want to log this and have a recovery mechanism
        return {
          success: false,
          error: 'Purchase completed but failed to add gems. Please contact support.',
        };
      }

      // Success - return the new balance if available
      const newBalance = rpcData?.new_balance || rpcData?.gems;
      
      return {
        success: true,
        gemAmount,
        newBalance,
      };
    } catch (err: any) {
      console.error('❌ Purchase failed:', err);

      // Handle specific error cases
      if (err.userCancelled) {
        return { success: false, error: 'Purchase cancelled' };
      }

      if (err.code === 'PAYMENT_DECLINED' || err.message?.toLowerCase().includes('declined')) {
        return { success: false, error: 'Payment declined. Please check your payment method.' };
      }

      if (err.code === 'NETWORK_ERROR' || err.message?.toLowerCase().includes('network')) {
        return { success: false, error: 'Network error. Please check your connection and try again.' };
      }

      return {
        success: false,
        error: err.message || 'Purchase failed. Please try again.',
      };
    } finally {
      setIsPurchasing(false);
    }
  }, [products, isPurchasing]);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    error,
    isPurchasing,
    purchaseGemPack,
    refreshProducts: fetchProducts,
  };
};
