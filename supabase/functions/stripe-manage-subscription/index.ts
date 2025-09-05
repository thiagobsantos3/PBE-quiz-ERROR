import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { action, subscription_id } = await req.json();

    // Validate required parameters
    if (!action || !subscription_id) {
      return corsResponse({ error: 'Missing required parameters: action and subscription_id' }, 400);
    }

    if (action !== 'cancel') {
      return corsResponse({ error: 'Invalid action. Only "cancel" is supported.' }, 400);
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      return corsResponse({ error: 'User not found' }, 404);
    }

    console.log(`🔄 Processing subscription ${action} for user: ${user.id}, subscription: ${subscription_id}`);

    // Verify the user owns this subscription
    const { data: customerData, error: customerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    if (customerError || !customerData) {
      console.error('❌ Customer not found for user:', user.id);
      return corsResponse({ error: 'Customer not found' }, 404);
    }

    // Get the subscription from Stripe to verify ownership
    const subscription = await stripe.subscriptions.retrieve(subscription_id);

    if (subscription.customer !== customerData.customer_id) {
      console.error('❌ Subscription does not belong to user:', user.id);
      return corsResponse({ error: 'Unauthorized: Subscription does not belong to user' }, 403);
    }

    console.log(`✅ Verified subscription ${subscription_id} belongs to user ${user.id}`);

    // Cancel the subscription at period end
    const updatedSubscription = await stripe.subscriptions.update(subscription_id, {
      cancel_at_period_end: true,
    });

    console.log(`✅ Successfully set subscription ${subscription_id} to cancel at period end`);

    // Update our local database
    const { error: updateError } = await supabase
      .from('stripe_subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('subscription_id', subscription_id);

    if (updateError) {
      console.error('❌ Error updating local subscription data:', updateError);
      // Don't fail the request since Stripe was updated successfully
    }

    return corsResponse({
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period',
      subscription: {
        id: updatedSubscription.id,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        current_period_end: updatedSubscription.current_period_end,
      },
    });

  } catch (error: any) {
    console.error(`❌ Subscription management error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});