/**
 * Stripe Checkout Service
 * Handles web payment flow for gem purchases
 */

import { supabase } from './supabase';

// Stripe publishable key (from environment)
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

/**
 * Create a Stripe Checkout session for gem purchase
 * @param userId - Supabase user ID
 * @param packId - Gem pack ID (e.g., 'gem_1', 'gem_2')
 * @param gemAmount - Number of gems in the pack
 * @param price - Price in dollars (e.g., 1.99)
 * @returns Checkout session URL or error
 */
export const createStripeCheckout = async (
  userId: string,
  packId: string,
  gemAmount: number,
  price: number
): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> => {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return { success: false, error: 'Stripe not configured' };
  }

  try {
    // Get current session to ensure user is authenticated
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user || sessionData.session.user.id !== userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Call backend API to create checkout session
    // The backend should have the Stripe secret key
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    
    const response = await fetch(`${backendUrl}/api/stripe/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        userId,
        packId,
        gemAmount,
        price,
        successUrl: `${window.location.origin}/purchase-success`,
        cancelUrl: `${window.location.origin}/purchase-cancel`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || 'Failed to create checkout session' };
    }

    const data = await response.json();
    return { success: true, checkoutUrl: data.checkoutUrl };
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return { success: false, error: error.message || 'Failed to create checkout session' };
  }
};

/**
 * Alternative: Direct Stripe Checkout (if using Stripe.js on frontend)
 * This requires loading Stripe.js and using the publishable key
 */
export const loadStripe = async (): Promise<any> => {
  if (typeof window === 'undefined' || !STRIPE_PUBLISHABLE_KEY) {
    return null;
  }

  // Dynamically load Stripe.js
  if (!(window as any).Stripe) {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    document.head.appendChild(script);
    
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });
  }

  return (window as any).Stripe(STRIPE_PUBLISHABLE_KEY);
};
