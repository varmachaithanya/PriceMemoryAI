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

    // Accept service role (pg_cron) or authenticated user JWT
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${supabaseServiceKey}`) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader ?? '' } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
    }

    // Get all active users
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', true);

    if (!users) {
      return new Response(JSON.stringify({ message: 'No users found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let alertsCreated = 0;

    for (const user of users) {
      const userId = user.id;

      // Check for price spikes - compare last 7 days vs previous 30 days average
      const { data: recentPurchases } = await supabase
        .from('purchases')
        .select('product_id, unit_price, product:products(canonical_name)')
        .eq('user_id', userId)
        .gte('purchase_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const { data: historicalPurchases } = await supabase
        .from('purchases')
        .select('product_id, unit_price')
        .eq('user_id', userId)
        .lt('purchase_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .gte('purchase_date', new Date(Date.now() - 37 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (recentPurchases && historicalPurchases) {
        const productRecentAvg = new Map<string, { avg: number; name: string }>();
        for (const p of recentPurchases) {
          const existing = productRecentAvg.get(p.product_id);
          if (existing) {
            existing.avg = (existing.avg + p.unit_price) / 2;
          } else {
            productRecentAvg.set(p.product_id, {
              avg: p.unit_price,
              name: (p.product as Record<string, string>)?.canonical_name || 'Unknown',
            });
          }
        }

        const productHistoricalAvg = new Map<string, number>();
        for (const p of historicalPurchases) {
          const existing = productHistoricalAvg.get(p.product_id);
          if (existing) {
            productHistoricalAvg.set(p.product_id, (existing + p.unit_price) / 2);
          } else {
            productHistoricalAvg.set(p.product_id, p.unit_price);
          }
        }

        for (const [productId, recent] of productRecentAvg) {
          const historical = productHistoricalAvg.get(productId);
          if (historical && historical > 0) {
            const changePct = ((recent.avg - historical) / historical) * 100;
            if (changePct > 15) {
              // Check if alert already exists today
              const { data: existingAlert } = await supabase
                .from('alerts')
                .select('id')
                .eq('user_id', userId)
                .eq('product_id', productId)
                .eq('alert_type', 'price_spike')
                .gte('created_at', new Date().toISOString().split('T')[0])
                .limit(1);

              if (!existingAlert || existingAlert.length === 0) {
                await supabase.from('alerts').insert({
                  user_id: userId,
                  product_id: productId,
                  message: `${recent.name} prices are ${Math.round(changePct)}% higher than your average`,
                  alert_type: 'price_spike',
                });
                alertsCreated++;
              }
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ message: `Created ${alertsCreated} alerts` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Alert generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate alerts' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
