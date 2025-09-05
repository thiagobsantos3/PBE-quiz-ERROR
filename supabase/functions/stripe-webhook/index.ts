import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Validate required environment variables
if (!stripeSecret) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is not set');
  throw new Error('STRIPE_SECRET_KEY is required');
}

if (!stripeWebhookSecret) {
  console.error('❌ STRIPE_WEBHOOK_SECRET environment variable is not set');
  throw new Error('STRIPE_WEBHOOK_SECRET is required');
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase environment variables are not set');
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

console.log('✅ All required environment variables are set');
console.log('🔑 Webhook secret length:', stripeWebhookSecret.length);

const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Note: Rate limiting removed for now to simplify deployment
    // Can be re-added later if needed

    // get the signature from the header
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('No signature found', { status: 400 });
    }

    // get the raw body
    const body = await req.text();

    // verify the webhook signature
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return new Response(`Webhook signature verification failed: ${error.message}`, { status: 400 });
    }

    EdgeRuntime.waitUntil(handleEvent(event));

    return Response.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData) {
    console.warn(`No data object in event: ${event.type}`);
    return;
  }

  if (!('customer' in stripeData)) {
    console.warn(`No customer found in event: ${event.type}`);
    return;
  }

  // for one time payments, we only listen for the checkout.session.completed event
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) {
    console.info('Skipping payment_intent.succeeded for one-time payment');
    return;
  }

  const { customer: customerId } = stripeData;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`Invalid customer ID received on event: ${JSON.stringify(event)}`);
    return;
  }

  console.info(`Processing event ${event.type} for customer: ${customerId}`);

  let isSubscription = true;

  if (event.type === 'checkout.session.completed') {
    const { mode } = stripeData as Stripe.Checkout.Session;
    isSubscription = mode === 'subscription';
    console.info(`Processing ${isSubscription ? 'subscription' : 'one-time payment'} checkout session`);
  }

  if (isSubscription) {
    console.info(`Starting subscription sync for customer: ${customerId}`);
    try {
      await syncCustomerFromStripe(customerId);
      console.info(`✅ Successfully completed subscription sync for customer: ${customerId}`);
    } catch (error) {
      console.error(`❌ Failed to sync subscription for customer ${customerId}:`, error);
      throw error; // Re-throw to ensure webhook failure is recorded
    }
  } else {
    // Handle one-time payment
    const { mode, payment_status } = stripeData as Stripe.Checkout.Session;
    
    if (mode === 'payment' && payment_status === 'paid') {
      try {
        // Extract the necessary information from the session
        const {
          id: checkout_session_id,
          payment_intent,
          amount_subtotal,
          amount_total,
          currency,
        } = stripeData as Stripe.Checkout.Session;

        // Insert the order into the stripe_orders table
        const { error: orderError } = await supabase.from('stripe_orders').insert({
          customer_id: customerId,
          checkout_session_id,
          payment_intent_id: payment_intent as string,
          amount_subtotal: amount_subtotal || 0,
          amount_total: amount_total || 0,
          currency: currency || 'usd',
          payment_status: 'paid',
          status: 'completed', // assuming we want to mark it as completed since payment is successful
        });

        if (orderError) {
          console.error('Error inserting order:', orderError);
          throw new Error('Failed to insert order in database');
        }

        console.info(`✅ Successfully processed one-time payment for session: ${checkout_session_id}`);
      } catch (error) {
        console.error('❌ Error processing one-time payment:', error);
        throw error;
      }
    }
  }
}

// based on the excellent https://github.com/t3dotgg/stripe-recommendations
async function syncCustomerFromStripe(customerId: string) {
  try {
    // fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // Get user_id from stripe_customers table
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .single();

    if (customerError) {
      console.error('❌ Error finding user for customer:', customerError);
      throw new Error('Failed to find user for customer');
    }

    const userId = customerData.user_id;
    console.info(`🔍 Found user ID: ${userId} for customer: ${customerId}`);

    if (subscriptions.data.length === 0) {
      console.info(`No active subscriptions found for customer: ${customerId}`);
      
      // Update stripe_subscriptions table
      const { error: noSubError } = await supabase.from('stripe_subscriptions').upsert(
        {
          customer_id: customerId,
          subscription_status: 'not_started',
        },
        {
          onConflict: 'customer_id',
        },
      );

      if (noSubError) {
        console.error('Error updating subscription status:', noSubError);
        throw new Error('Failed to update subscription status in database');
      }

      // Update main subscriptions table to free plan
      const { error: mainSubError } = await supabase.from('subscriptions').upsert(
        {
          user_id: userId,
          plan: 'free',
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        },
        {
          onConflict: 'user_id',
        },
      );

      if (mainSubError) {
        console.error('Error updating main subscription to free:', mainSubError);
        throw new Error('Failed to update main subscription to free');
      }

      return;
    }

    // assumes that a customer can only have a single subscription
    const subscription = subscriptions.data[0];

    // store subscription state in stripe_subscriptions table
    const { error: subError } = await supabase.from('stripe_subscriptions').upsert(
      {
        customer_id: customerId,
        subscription_id: subscription.id,
        price_id: subscription.items.data[0].price.id,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
          ? {
              payment_method_brand: subscription.default_payment_method.card?.brand ?? null,
              payment_method_last4: subscription.default_payment_method.card?.last4 ?? null,
            }
          : {}),
        status: subscription.status,
      },
      {
        onConflict: 'customer_id',
      },
    );

    if (subError) {
      console.error('Error syncing subscription:', subError);
      throw new Error('Failed to sync subscription in database');
    }

    // NEW: Map Stripe price_id to plan_id and update main subscriptions table
    const stripePriceId = subscription.items.data[0].price.id;
    const subscriptionCurrency = subscription.currency.toUpperCase();
    console.info(`🔍 Looking up plan for Stripe price: ${stripePriceId}, currency: ${subscriptionCurrency}`);
    
    // For multi-currency prices, we need to match on both price_id AND currency
    // First try exact match with currency
    const { data: planPriceData, error: planPriceError } = await supabase
      .from('plan_prices')
      .select('plan_id')
      .eq('stripe_price_id', stripePriceId)
      .eq('currency', subscriptionCurrency)
      .single();

    let planId = 'free'; // Default fallback
    
    if (planPriceError) {
      console.warn(`⚠️ Could not find plan for Stripe price ${stripePriceId} with currency ${subscriptionCurrency}`);
      
      // Try fallback: match price_id regardless of currency (for multi-currency prices)
      const { data: fallbackPlanData, error: fallbackError } = await supabase
        .from('plan_prices')
        .select('plan_id')
        .eq('stripe_price_id', stripePriceId)
        .limit(1)
        .single();

      if (fallbackError) {
        console.error(`🚨 PLAN MAPPING ISSUE: Stripe price ${stripePriceId} not found in plan_prices table`);
        console.error(`🔧 Multi-currency fix needed: This price supports multiple currencies via currency_options`);
        console.error(`🔧 Update your plan_prices table to use this price_id for all currencies of the same interval`);
      } else {
        planId = fallbackPlanData.plan_id;
        console.info(`✅ Found plan ${planId} for Stripe price ${stripePriceId} (fallback match, ignoring currency)`);
      }
    } else {
      planId = planPriceData.plan_id;
      console.info(`✅ Found plan ${planId} for Stripe price ${stripePriceId} with currency ${subscriptionCurrency}`);
    }

    // Update main subscriptions table with the correct plan
    console.info(`🔄 Updating main subscriptions table: user_id=${userId}, plan=${planId}, status=${subscription.status}`);
    
    const { error: mainSubError } = await supabase.from('subscriptions').upsert(
      {
        user_id: userId,
        plan: planId,
        status: subscription.status === 'active' ? 'active' : 'canceled',
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        cancelled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      },
      {
        onConflict: 'user_id',
      },
    );

    if (mainSubError) {
      console.error('❌ Error updating main subscription:', mainSubError);
      console.error('❌ Failed data:', { userId, planId, status: subscription.status });
      throw new Error('Failed to update main subscription in database');
    }

    console.info(`✅ Successfully synced subscription for customer: ${customerId}, plan: ${planId}, status: ${subscription.status}`);
    console.info(`🎯 User ${userId} now has access to ${planId} plan features`);

    // Note: Team plan is now automatically derived from owner's subscription via teams_with_plan view

    // Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single();

    if (verifyError) {
      console.error('⚠️ Could not verify subscription update:', verifyError);
    } else {
      console.info(`🔍 Verification: User ${userId} subscription is now plan=${verifyData.plan}, status=${verifyData.status}`);
    }
  } catch (error) {
    console.error(`❌ Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
} 