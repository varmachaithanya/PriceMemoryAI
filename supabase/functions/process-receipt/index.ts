import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let receiptId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    receiptId = body.receipt_id;
    const userId = body.user_id;
    const imageUrl = body.image_url;
    const clientOcrText = body.raw_ocr_text as string | undefined;

    if (!receiptId || !userId || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'receipt_id, user_id, and image_url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to processing
    await supabase
      .from('receipts')
      .update({ processing_status: 'processing' })
      .eq('id', receiptId);

    // Get OCR text: prefer client-provided (Tesseract.js), fallback to Google Vision
    let extractedText = clientOcrText || '';

    if (!extractedText) {
      const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
      if (googleApiKey) {
        extractedText = await extractTextWithGoogleVision(imageUrl, googleApiKey);
      }
    }

    // If still no text, that means OCR ran but found nothing, or no provider exists
    // If clientOcrText was provided (even empty), OCR ran — mark needs_review
    // If nothing was provided at all, that's the fallback path
    if (!extractedText && clientOcrText === undefined) {
      // No OCR provider configured at all — but we should never reach here
      // if the client is running Tesseract.js. This is a safety fallback.
      await supabase
        .from('receipts')
        .update({
          processing_status: 'needs_review',
          raw_ocr_text: '',
          extracted_items: [],
          receipt_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', receiptId);

      return new Response(
        JSON.stringify({
          success: true,
          status: 'needs_review',
          items_found: 0,
          message: 'No OCR text provided. Add items manually.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse line items from OCR text
    const lineItems = parseLineItems(extractedText);

    // Get user's existing products for matching
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, canonical_name')
      .eq('user_id', userId);

    // Normalize items using Groq AI
    const normalizedItems = await normalizeItemsWithAI(
      lineItems,
      existingProducts || [],
      Deno.env.get('GROQ_API_KEY'),
    );

    // Try to find a matching store from the receipt text
    const storeName = extractStoreName(extractedText);
    let storeId: string | null = null;
    if (storeName) {
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', userId)
        .ilike('store_name', `%${storeName}%`)
        .limit(1);
      storeId = stores?.[0]?.id || null;
    }

    // Build extracted_items array for the review screen
    const extractedItems = normalizedItems.map((item) => ({
      name: item.raw_name || item.product_id || 'Unknown',
      product_id: item.product_id,
      quantity: item.quantity,
      unit: item.unit,
      total_price: item.total_price,
      store_id: storeId,
    }));

    const receiptDate = extractDate(extractedText);

    // Always mark as needs_review so user can verify before saving
    await supabase
      .from('receipts')
      .update({
        processing_status: 'needs_review',
        raw_ocr_text: extractedText,
        extracted_items: JSON.stringify(extractedItems),
        receipt_date: receiptDate || new Date().toISOString().split('T')[0],
      })
      .eq('id', receiptId);

    return new Response(
      JSON.stringify({
        success: true,
        status: 'needs_review',
        items_found: extractedItems.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Receipt processing error:', error);

    if (receiptId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('receipts')
          .update({ processing_status: 'failed' })
          .eq('id', receiptId);
      } catch {
        // Ignore secondary errors
      }
    }

    return new Response(
      JSON.stringify({ error: 'Processing failed', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractTextWithGoogleVision(imageUrl: string, apiKey: string): Promise<string> {
  try {
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      }
    );

    const data = await response.json();
    return data.responses?.[0]?.fullTextAnnotation?.text || '';
  } catch (error) {
    console.error('Google Vision error:', error);
    return '';
  }
}

function parseLineItems(text: string): Array<{
  name: string;
  quantity: number;
  unit: string;
  total_price: number;
}> {
  const lines = text.split('\n').filter((l) => l.trim());
  const items: Array<{ name: string; quantity: number; unit: string; total_price: number }> = [];

  const pricePattern = /[\u20B9Rs.*]*\s*(\d+(?:\.\d{1,2})?)/i;
  const qtyPattern = /(\d+(?:\.\d+)?)\s*(kg|g|gm|gram|ltr|l|ml|pcs?|pkt|pack|no)/i;

  for (const line of lines) {
    if (/^(total|subtotal|tax|gst|vat|change|cash|card|upi|date|time|tel|phone|address)/i.test(line.trim())) {
      continue;
    }

    const priceMatch = line.match(pricePattern);
    if (priceMatch) {
      const qtyMatch = line.match(qtyPattern);
      const name = line
        .replace(pricePattern, '')
        .replace(qtyPattern, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[\s\-*.:]+/, '')
        .replace(/[\s\-*.:]+$/, '');

      if (name.length > 1 && name.length < 60) {
        items.push({
          name,
          quantity: qtyMatch ? parseFloat(qtyMatch[1]) : 1,
          unit: normalizeUnit(qtyMatch?.[2] || 'piece'),
          total_price: parseFloat(priceMatch[1]),
        });
      }
    }
  }

  return items;
}

function normalizeUnit(raw: string): string {
  const u = raw.toLowerCase();
  if (u === 'kg') return 'kg';
  if (u === 'g' || u === 'gm' || u === 'gram') return 'gram';
  if (u === 'l' || u === 'ltr' || u === 'liter') return 'liter';
  if (u === 'ml') return 'ml';
  if (u === 'pcs' || u === 'pc' || u === 'no') return 'piece';
  if (u === 'pkt' || u === 'pack' || u === 'packet') return 'packet';
  return 'piece';
}

function extractStoreName(text: string): string | null {
  const lines = text.split('\n').slice(0, 5);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 3 && trimmed.length < 50 && !/^\d/.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

function extractDate(text: string): string | null {
  const datePatterns = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const d = new Date(match[0]);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch {
        // continue
      }
    }
  }
  return null;
}

async function normalizeItemsWithAI(
  items: Array<{ name: string; quantity: number; unit: string; total_price: number }>,
  existingProducts: Array<{ id: string; canonical_name: string }>,
  groqApiKey: string | undefined,
): Promise<Array<{
  product_id: string | null;
  store_id: string | null;
  quantity: number;
  unit: string;
  total_price: number;
  purchase_date: string;
  raw_name: string;
}>> {
  const today = new Date().toISOString().split('T')[0];

  const results = items.map((item) => {
    const match = existingProducts.find(
      (p) => p.canonical_name.toLowerCase() === item.name.toLowerCase()
    );
    return {
      product_id: match?.id || null,
      store_id: null,
      quantity: item.quantity,
      unit: item.unit,
      total_price: item.total_price,
      purchase_date: today,
      raw_name: item.name,
      needsAI: !match,
    };
  });

  const unmatched = results.filter((r) => r.needsAI);
  if (unmatched.length > 0 && groqApiKey) {
    const existingNames = existingProducts.map((p) => p.canonical_name).join(', ') || 'none';
    const rawNames = unmatched.map((r) => r.raw_name).join('\n');

    try {
      const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: `You are a grocery item normalizer. Given raw receipt item names, return a JSON array where each element has: "raw" (the original name) and "canonical" (a clean English product name). If the item matches one of the user's existing products [${existingNames}], use that exact name. Otherwise create a clean canonical name. Return ONLY the JSON array, nothing else.`,
            },
            { role: 'user', content: rawNames },
          ],
          temperature: 0,
          max_tokens: 500,
        }),
      });

      const groqData = await groqResponse.json();
      const content = groqData.choices?.[0]?.message?.content?.trim();
      if (content) {
        const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
        if (Array.isArray(parsed)) {
          for (const ai of parsed) {
            const result = results.find((r) => r.raw_name === ai.raw);
            if (result && ai.canonical) {
              const match = existingProducts.find(
                (p) => p.canonical_name.toLowerCase() === ai.canonical.toLowerCase()
              );
              result.product_id = match?.id || null;
              result.raw_name = ai.canonical;
            }
          }
        }
      }
    } catch (error) {
      console.error('Groq normalization error:', error);
    }
  }

  return results.map(({ product_id, store_id, quantity, unit, total_price, purchase_date, raw_name }) => ({
    product_id,
    store_id,
    quantity,
    unit,
    total_price,
    purchase_date,
    raw_name,
  }));
}
