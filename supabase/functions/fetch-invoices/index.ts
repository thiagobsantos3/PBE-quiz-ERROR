import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    console.log('🔄 fetch-invoices function invoked');
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_ANON_KEY') ?? '', 
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      throw new Error('Unauthorized');
    }

    console.log('✅ User authenticated:', user.id);

    // Get the user's Stripe customer ID from the stripe_customers table
    const { data: customerData, error: customerError } = await supabaseClient
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .single();

    if (customerError) {
      console.error('❌ Error fetching Stripe customer ID:', customerError);
      throw new Error('Failed to fetch Stripe customer ID');
    }

    if (!customerData?.customer_id) {
      console.log('ℹ️ User has no Stripe customer ID, returning empty array');
      // User doesn't have a Stripe customer ID yet, return empty array
      return new Response(JSON.stringify([]), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    console.log('✅ Found Stripe customer ID:', customerData.customer_id);

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('❌ Stripe secret key not configured');
      throw new Error('Stripe secret key not configured');
    }

    console.log('🔄 Fetching invoices from Stripe for customer:', customerData.customer_id);

    // Fetch invoices from Stripe
    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/invoices?customer=${customerData.customer_id}&limit=10`, 
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('❌ Stripe API error:', stripeResponse.status, errorText);
      throw new Error(`Stripe API error: ${errorText}`);
    }

    const stripeData = await stripeResponse.json();
    console.log('✅ Stripe invoices fetched successfully:', stripeData.data?.length || 0, 'invoices');

    return new Response(JSON.stringify(stripeData.data || []), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('💥 Error in fetch-invoices function:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});