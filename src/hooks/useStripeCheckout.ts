import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface CheckoutOptions {
  priceId: string;
  mode: 'payment' | 'subscription';
  successUrl?: string;
  cancelUrl?: string;
}

interface CheckoutResult {
  sessionId?: string;
  url?: string;
  error?: string;
}

export function useStripeCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCheckoutSession = async (options: CheckoutOptions): Promise<CheckoutResult> => {
    setLoading(true);
    setError(null);

    try {
      const { priceId, mode, successUrl, cancelUrl } = options;
      
      // Default URLs if not provided
      const defaultSuccessUrl = `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancelUrl = `${window.location.origin}/billing`;

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceId,
          mode,
          success_url: successUrl || `${window.location.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl || defaultCancelUrl,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        setError(error.message || 'Failed to create checkout session');
        return { error: error.message || 'Failed to create checkout session' };
      }

      if (data?.url) {
        console.log('✅ Checkout session created, redirecting to:', data.url);
        // Redirect to Stripe Checkout
        window.location.href = data.url;
        return { sessionId: data.sessionId, url: data.url };
      } else {
        setError('No checkout URL received');
        return { error: 'No checkout URL received' };
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    createCheckoutSession,
    loading,
    error,
  };
}