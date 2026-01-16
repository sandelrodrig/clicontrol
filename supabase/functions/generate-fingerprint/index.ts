import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Secret key for HMAC - use env variable or fallback
const HMAC_SECRET = Deno.env.get('ENCRYPTION_KEY') || 'default-32-char-key-for-aes256!';

async function generateFingerprint(login: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${login}:${password}`);
  const keyData = encoder.encode(HMAC_SECRET);
  
  // Import key for HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Generate HMAC
  const signature = await crypto.subtle.sign('HMAC', key, data);
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { login, password } = await req.json();
    
    if (!login) {
      return new Response(
        JSON.stringify({ error: 'Login is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fingerprint = await generateFingerprint(login, password || '');

    return new Response(
      JSON.stringify({ fingerprint }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Fingerprint generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
