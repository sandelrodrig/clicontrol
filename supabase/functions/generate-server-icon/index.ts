import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serverName, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!serverName) {
      throw new Error('Server name is required');
    }

    let prompt = '';
    
    if (action === 'generate') {
      // Generate a unique icon based on the server name
      prompt = `Generate a simple, modern, minimalist logo/icon for a streaming service or IPTV provider called "${serverName}". 
      The icon should be:
      - Clean and professional
      - Use vibrant colors
      - Square format suitable for an avatar/icon
      - No text, just a symbolic icon
      - High quality, suitable for small display sizes
      Ultra high resolution`;
    } else if (action === 'search') {
      // Try to find/describe an icon that matches the brand
      prompt = `Generate a logo/icon that represents the brand "${serverName}" for a streaming/IPTV service.
      If this is a known brand, create an icon inspired by their visual identity.
      The icon should be:
      - Professional and recognizable
      - Square format
      - Clean design suitable for small sizes
      - No text
      Ultra high resolution`;
    } else {
      throw new Error('Invalid action. Use "generate" or "search"');
    }

    console.log('Generating icon for:', serverName, 'action:', action);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');
    
    // Extract image from response
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl,
        message: data.choices?.[0]?.message?.content || 'Icon generated successfully'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error generating icon:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate icon' 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
