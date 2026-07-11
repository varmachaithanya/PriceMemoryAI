import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UNIT_PATTERNS: Array<{ regex: RegExp; unit: string; factor: number }> = [
  { regex: /(\d+(?:\.\d+)?)\s*kg/i, unit: 'kg', factor: 1 },
  { regex: /(\d+(?:\.\d+)?)\s*gram/i, unit: 'gram', factor: 0.001 },
  { regex: /(\d+(?:\.\d+)?)\s*g(?!ram)/i, unit: 'gram', factor: 0.001 },
  { regex: /(\d+(?:\.\d+)?)\s*l(?:iter)?/i, unit: 'liter', factor: 1 },
  { regex: /(\d+(?:\.\d+)?)\s*ml/i, unit: 'ml', factor: 0.001 },
  { regex: /(\d+(?:\.\d+)?)\s*pcs?/i, unit: 'piece', factor: 1 },
  { regex: /(\d+(?:\.\d+)?)\s*(?:packet|pkt|pk)/i, unit: 'packet', factor: 1 },
];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { raw_text } = await req.json();

    if (!raw_text || typeof raw_text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'raw_text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fast path: regex extraction
    for (const pattern of UNIT_PATTERNS) {
      const match = raw_text.match(pattern.regex);
      if (match) {
        const quantity = parseFloat(match[1]!);
        return new Response(
          JSON.stringify({
            quantity,
            unit: pattern.unit,
            confidence: 'high',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // AI fallback for messy labels
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    if (!groqApiKey) {
      // Default to 1 piece if no AI available
      return new Response(
        JSON.stringify({
          quantity: 1,
          unit: 'piece',
          confidence: 'low',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
            content: 'Extract quantity and unit from the grocery label. Respond with JSON: {"quantity": number, "unit": "kg"|"gram"|"liter"|"ml"|"piece"|"packet"}. Nothing else.',
          },
          { role: 'user', content: raw_text },
        ],
        temperature: 0,
        max_tokens: 50,
      }),
    });

    const groqData = await groqResponse.json();
    const content = groqData.choices?.[0]?.message?.content?.trim();

    try {
      const parsed = JSON.parse(content || '{}');
      return new Response(
        JSON.stringify({
          quantity: parsed.quantity || 1,
          unit: parsed.unit || 'piece',
          confidence: 'low',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch {
      return new Response(
        JSON.stringify({
          quantity: 1,
          unit: 'piece',
          confidence: 'low',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Normalize quantity error:', error);
    return new Response(
      JSON.stringify({ error: 'Normalization failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
