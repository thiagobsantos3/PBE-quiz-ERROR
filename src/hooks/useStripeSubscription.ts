import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface StripeSubscription {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

interface StripeOrder {
  customer_id: string;
  order_id: number;
  checkout_session_id: string;
  payment_intent_id: string;
  amount_subtotal: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  order_status: string;
  order_date: string;
}

export function useStripeSubscription() {
  const { developerLog } = useAuth();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);
  const [orders, setOrders] = useState<StripeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchSubscriptionData = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setSubscription(null);
      setOrders([]);
      setLoading(false);
      return;
    }

    // Avoid redundant fetches (unless forced)
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime < 5000) { // 5 second cache
      developerLog('🔄 Using cached subscription data');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      developerLog('🔄 Fetching subscription data from database...');

      // First, let's check if we have any stripe customer record
      const { data: customerData, error: customerError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customerError) {
        console.error('❌ Error checking stripe customer:', customerError);
        // Continue anyway, user might not have made any purchases yet
      }

      developerLog('🔍 Stripe customer data:', customerData?.customer_id || 'No customer found');

      // Fetch subscription data using the view
      const { data: subData, error: subError } = await supabase
        .from('stripe_user_subscriptions')
        .select('customer_id, subscription_id, subscription_status, price_id, current_period_start, current_period_end, cancel_at_period_end, payment_method_brand, payment_method_last4')
        .maybeSingle();

      developerLog('🔍 Raw stripe_user_subscriptions data:', subData);
      developerLog('🔍 stripe_user_subscriptions error:', subError);

      if (subError) {
        console.error('❌ Error fetching subscription:', subError);
        
        // If the view doesn't exist or user doesn't have access, it's not necessarily an error
        if (subError.code === '42P01' || subError.message.includes('does not exist')) {
          console.warn('⚠️ Stripe subscription view not accessible, user likely has no subscription');
          setSubscription(null);
        } else {
          setError('Failed to load subscription data');
          setSubscription(null);
        }
      } else {
        // Ensure we set null if no subscription data is found
        setSubscription(subData || null);
        developerLog('✅ Subscription data loaded:', subData ? `Found subscription with price_id: ${subData.price_id}` : 'No subscription');
      }

      // Fetch orders data
      const { data: ordersData, error: ordersError } = await supabase
        .from('stripe_user_orders')
        .select('customer_id, order_id, checkout_session_id, payment_intent_id, amount_total, currency, payment_status, order_status, order_date')
        .order('order_date', { ascending: false })
        .limit(5);

      if (ordersError) {
        console.error('❌ Error fetching orders:', ordersError);
        // Don't set error for orders as it's not critical
        setOrders([]);
      } else {
        setOrders(ordersData || []);
        developerLog('✅ Orders data loaded:', ordersData?.length || 0, 'orders');
      }

      // Also check the main subscriptions table for verification
      const { data: mainSubData, error: mainSubError } = await supabase
        .from('subscriptions')
        .select('plan, status, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      developerLog('🔍 Raw main subscriptions table data:', mainSubData);
      developerLog('🔍 Main subscriptions error:', mainSubError);

      if (mainSubError) {
        console.error('❌ Error fetching main subscription:', mainSubError);
      } else {
        developerLog('🔍 Main subscription data - Plan:', mainSubData?.plan || 'No plan found', 
                   mainSubData?.status || 'No status');
        developerLog('🔍 Full main subscription object:', mainSubData);
      }

      setLastFetchTime(now);
    } catch (err: any) {
      console.error('💥 Error fetching Stripe data:', err);
      setError('Failed to load billing data');
      // Ensure clean state on error
      setSubscription(null);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user, lastFetchTime, developerLog]);

  // Force refresh function for external use (e.g., after payment)
  const forceRefresh = useCallback(() => {
    developerLog('🔄 Force refreshing subscription data...');
    return fetchSubscriptionData(true);
  }, [fetchSubscriptionData, developerLog]);

  const cancelCurrentSubscription = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!subscription?.subscription_id) {
      return { success: false, error: 'No active subscription found' };
    }

    try {
      developerLog('🔄 Cancelling subscription:', subscription.subscription_id);
      
      const { data, error } = await supabase.functions.invoke('stripe-manage-subscription', {
        body: {
          action: 'cancel',
          subscription_id: subscription.subscription_id,
        },
      });

      if (error) {
        console.error('❌ Error cancelling subscription:', error);
        return { success: false, error: error.message || 'Failed to cancel subscription' };
      }

      if (!data.success) {
        console.error('❌ Subscription cancellation failed:', data.error);
        return { success: false, error: data.error || 'Failed to cancel subscription' };
      }

      developerLog('✅ Subscription cancelled successfully');
      
      // Force refresh subscription data
      await forceRefresh();
      
      return { success: true };
    } catch (err: any) {
      console.error('💥 Error cancelling subscription:', err);
      return { success: false, error: err.message || 'An unexpected error occurred' };
    }
  }, [subscription, forceRefresh, developerLog]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  return {
    subscription,
    orders,
    loading,
    error,
    refetch: fetchSubscriptionData,
    forceRefresh,
    cancelCurrentSubscription,
  };
}