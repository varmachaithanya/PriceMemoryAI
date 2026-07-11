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

    const { raw_text } = await req.json();

    if (!raw_text || typeof raw_text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'raw_text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedText = raw_text.trim().toLowerCase();

    // Check cache first
    const { data: cached } = await supabase
      .from('item_aliases')
      .select('normalized_name, resolved_by')
      .eq('raw_text', normalizedText)
      .single();

    if (cached) {
      return new Response(
        JSON.stringify({
          canonical_name: cached.normalized_name,
          confidence: 'high',
          resolved_by: cached.resolved_by,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try fuzzy match against existing products
    const { data: products } = await supabase
      .from('products')
      .select('canonical_name');

    if (products) {
      const match = fuzzyMatch(normalizedText, products.map((p) => p.canonical_name));
      if (match) {
        // Cache the result
        await supabase.from('item_aliases').insert({
          raw_text: normalizedText,
          normalized_name: match,
          resolved_by: 'fuzzy_match',
        });

        return new Response(
          JSON.stringify({
            canonical_name: match,
            confidence: 'high',
            resolved_by: 'fuzzy_match',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // AI fallback via Groq
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      return new Response(
        JSON.stringify({
          canonical_name: raw_text,
          confidence: 'low',
          resolved_by: 'fuzzy_match',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingNames = products?.map((p) => p.canonical_name).join(', ') || 'none';

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
            content: `You normalize grocery item names to a canonical English name. The user already tracks these products: [${existingNames}]. If the input matches one of these, respond with that exact name. If it's a new product, respond with a clean canonical English name. Respond with only the canonical name, nothing else.`,
          },
          { role: 'user', content: raw_text },
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    });

    const groqData = await groqResponse.json();
    const canonicalName = groqData.choices?.[0]?.message?.content?.trim() || raw_text;

    // Cache the AI result
    await supabase.from('item_aliases').insert({
      raw_text: normalizedText,
      normalized_name: canonicalName,
      language: 'auto',
      resolved_by: 'ai',
    });

    return new Response(
      JSON.stringify({
        canonical_name: canonicalName,
        confidence: 'low',
        resolved_by: 'ai',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Normalize product error:', error);
    return new Response(
      JSON.stringify({ error: 'Normalization failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function fuzzyMatch(input: string, candidates: string[]): string | null {
  const normalized = input.replace(/[^a-z0-9]/g, '');

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normalized === normalizedCandidate) return candidate;
    if (normalizedCandidate.includes(normalized) || normalized.includes(normalizedCandidate)) {
      return candidate;
    }

    // Levenshtein distance check
    const distance = levenshtein(normalized, normalizedCandidate);
    const maxLen = Math.max(normalized.length, normalizedCandidate.length);
    if (maxLen > 0 && distance / maxLen < 0.3) {
      return candidate;
    }
  }

  return null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }

  return dp[m]![n]!;
}
