import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');

if (!BREVO_API_KEY) {
  console.error('❌ BREVO_API_KEY environment variable is not set');
  throw new Error('BREVO_API_KEY is required');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { to, subject, htmlContent, senderEmail, senderName, templateId } = await req.json();

    if (!to || !subject || (!htmlContent && !templateId)) {
      return new Response(JSON.stringify({ error: 'Missing required email parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const brevoPayload: any = {
      sender: { email: senderEmail || 'hello@pbejourney.com', name: senderName || 'PBE Journey' },
      to: [{ email: to }],
      subject: subject,
    };

    if (htmlContent) {
      brevoPayload.htmlContent = htmlContent;
    } else if (templateId) {
      brevoPayload.templateId = templateId;
    }

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(brevoPayload),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.json();
      console.error('❌ Brevo API error:', brevoResponse.status, errorData);
      throw new Error(`Failed to send email via Brevo: ${JSON.stringify(errorData)}`);
    }

    const data = await brevoResponse.json();
    console.log('✅ Email sent via Brevo:', data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  } catch (error) {
    console.error('💥 Error in send-email-brevo Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }
});