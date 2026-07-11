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

    const { receipt_id, user_id, image_url } = await req.json();

    // Update status to processing
    await supabase
      .from('receipts')
      .update({ processing_status: 'processing' })
      .eq('id', receipt_id);

    // Stub: OCR extraction (replace with actual OCR provider later)
    const extractedText = await extractText(image_url);
    const lineItems = extractProducts(extractedText);

    // Normalize items against user's existing products
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, canonical_name')
      .eq('user_id', user_id);

    const normalizedItems = await normalizeItems(lineItems, existingProducts || []);

    // Insert purchases for each normalized item
    for (const item of normalizedItems) {
      if (item.product_id) {
        const unitPrice = item.total_price / item.quantity;
        await supabase.from('purchases').insert({
          user_id,
          store_id: item.store_id || null,
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit || 'piece',
          total_price: item.total_price,
          unit_price: unitPrice,
          purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
          notes: 'Auto-extracted from receipt',
        });
      }
    }

    // Update status to done
    await supabase
      .from('receipts')
      .update({ processing_status: 'done' })
      .eq('id', receipt_id);

    return new Response(
      JSON.stringify({ success: true, items_found: normalizedItems.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Receipt processing error:', error);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { receipt_id } = await req.json().catch(() => ({ receipt_id: null }));
    if (receipt_id) {
      await supabase
        .from('receipts')
        .update({ processing_status: 'failed' })
        .eq('id', receipt_id);
    }

    return new Response(
      JSON.stringify({ error: 'Processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractText(_imageUrl: string): Promise<string> {
  // Stub: Replace with actual OCR provider (Tesseract, Google Vision, etc.)
  return '';
}

function extractProducts(text: string) {
  // Stub: Parse line items from OCR text
  const lines = text.split('\n').filter((l) => l.trim());
  return lines.map((line) => ({
    name: line,
    quantity: 1,
    unit: 'piece',
    total_price: 0,
  }));
}

async function normalizeItems(
  items: Array<{ name: string; quantity: number; unit: string; total_price: number }>,
  existingProducts: Array<{ id: string; canonical_name: string }>
) {
  return items.map((item) => {
    const match = existingProducts.find(
      (p) => p.canonical_name.toLowerCase() === item.name.toLowerCase()
    );
    return {
      ...item,
      product_id: match?.id || null,
      store_id: null,
      purchase_date: new Date().toISOString().split('T')[0],
    };
  });
}
