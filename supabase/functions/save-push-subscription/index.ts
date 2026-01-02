import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { subscription, action } = await req.json();

    if (action === 'unsubscribe') {
      // Remove subscription
      const { error: deleteError } = await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint);

      if (deleteError) {
        throw new Error(`Error removing subscription: ${deleteError.message}`);
      }

      console.log('Push subscription removed for user:', user.id);
      return new Response(JSON.stringify({ success: true, action: 'unsubscribed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Subscribe - save or update subscription
    const { endpoint, keys } = subscription;
    
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      throw new Error('Invalid subscription object');
    }

    // Upsert subscription (update if exists, insert if not)
    const { error: upsertError } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,endpoint'
      });

    if (upsertError) {
      throw new Error(`Error saving subscription: ${upsertError.message}`);
    }

    console.log('Push subscription saved for user:', user.id);
    return new Response(JSON.stringify({ success: true, action: 'subscribed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in save-push-subscription:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: message === 'Unauthorized' ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
