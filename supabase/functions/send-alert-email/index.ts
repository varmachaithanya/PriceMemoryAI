import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { user_id } = await req.json();

    // Fetch unread alerts for the user
    const { data: alerts } = await supabase
      .from('alerts')
      .select('message, alert_type, product:products(canonical_name)')
      .eq('user_id', user_id)
      .eq('read', false);

    if (!alerts || alerts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No unread alerts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const alertListHtml = alerts
      .map(
        (a) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${(a.product as Record<string, string>)?.canonical_name || 'Unknown'}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${a.alert_type.replace('_', ' ')}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${a.message}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#059669;">Price Memory AI - Price Alerts</h2>
        <p>Hi ${profile.full_name},</p>
        <p>You have ${alerts.length} new price alert${alerts.length > 1 ? 's' : ''}:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:8px;text-align:left;">Product</th>
              <th style="padding:8px;text-align:left;">Type</th>
              <th style="padding:8px;text-align:left;">Alert</th>
            </tr>
          </thead>
          <tbody>${alertListHtml}</tbody>
        </table>
        <p style="color:#6b7280;font-size:12px;">Log in to Price Memory AI to view details and manage alerts.</p>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Price Memory AI <alerts@pricememory.app>',
        to: profile.email,
        subject: `Price Alert: ${alerts.length} item${alerts.length > 1 ? 's' : ''} need attention`,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Resend error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send alert email error:', error);
    return new Response(
      JSON.stringify({ error: 'Email sending failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
