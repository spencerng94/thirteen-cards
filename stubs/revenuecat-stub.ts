// Stub for @revenuecat/purchases-capacitor on web platforms
// This allows Vite to resolve the import even though the native plugin isn't available

export interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    description: string;
    title: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
}

export interface CustomerInfo {
  entitlements: {
    active: Record<string, any>;
    all: Record<string, any>;
  };
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  latestExpirationDate: string | null;
  firstSeen: string;
  originalAppUserId: string;
  managementURL: string | null;
  originalApplicationVersion: string | null;
  originalPurchaseDate: string | null;
  requestDate: string;
}

export interface PurchasesConfiguration {
  apiKey: string;
  appUserID?: string | null;
}

export const Purchases = {
  configure: async (_config: PurchasesConfiguration): Promise<void> => {
    console.warn('RevenueCat: configure() called on web platform - this is a stub');
  },
  logIn: async (_appUserID: string): Promise<{ customerInfo: CustomerInfo; created: boolean }> => {
    console.warn('RevenueCat: logIn() called on web platform - this is a stub');
    throw new Error('RevenueCat is not available on web platform');
  },
  logOut: async (): Promise<CustomerInfo> => {
    console.warn('RevenueCat: logOut() called on web platform - this is a stub');
    throw new Error('RevenueCat is not available on web platform');
  },
  getOfferings: async (): Promise<{ current: { availablePackages: PurchasesPackage[] } | null }> => {
    console.warn('RevenueCat: getOfferings() called on web platform - this is a stub');
    return { current: null };
  },
  purchasePackage: async (_pack: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }> => {
    console.warn('RevenueCat: purchasePackage() called on web platform - this is a stub');
    throw new Error('RevenueCat is not available on web platform');
  },
  restorePurchases: async (): Promise<CustomerInfo> => {
    console.warn('RevenueCat: restorePurchases() called on web platform - this is a stub');
    throw new Error('RevenueCat is not available on web platform');
  },
};
