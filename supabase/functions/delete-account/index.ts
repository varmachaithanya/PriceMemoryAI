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

    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // Use the user's JWT to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const userId = user.id;

    // Delete user's receipts from storage
    const { data: receipts } = await supabase
      .from('receipts')
      .select('image_url')
      .eq('user_id', userId);

    if (receipts) {
      for (const receipt of receipts) {
        const filePath = receipt.image_url.split('/receipts/')[1];
        if (filePath) {
          await supabase.storage.from('receipts').remove([filePath]);
        }
      }
    }

    // Delete all user data (cascades via FK constraints)
    // The ON DELETE CASCADE on foreign keys handles most cleanup
    // But we explicitly clean up to be safe
    await supabase.from('alerts').delete().eq('user_id', userId);
    await supabase.from('purchases').delete().eq('user_id', userId);
    await supabase.from('receipts').delete().eq('user_id', userId);
    await supabase.from('products').delete().eq('user_id', userId);
    await supabase.from('stores').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);

    // Delete the auth user (requires service role)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ error: 'Account deletion failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
