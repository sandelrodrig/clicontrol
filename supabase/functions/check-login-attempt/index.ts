import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 10;
const BLOCK_DURATION_MINUTES = 15;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { email, action, ip_address, success } = await req.json();
    
    console.log(`Login attempt check for: ${email}, action: ${action}`);
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check') {
      // Check if user is blocked
      const cutoffTime = new Date(Date.now() - BLOCK_DURATION_MINUTES * 60 * 1000).toISOString();
      
      const { count, error } = await supabase
        .from('login_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('email', email.toLowerCase())
        .eq('success', false)
        .gte('attempt_at', cutoffTime);
      
      if (error) {
        console.error('Error checking login attempts:', error);
        throw error;
      }

      const isBlocked = (count || 0) >= MAX_ATTEMPTS;
      const remainingAttempts = Math.max(0, MAX_ATTEMPTS - (count || 0));

      return new Response(
        JSON.stringify({ 
          isBlocked, 
          remainingAttempts,
          message: isBlocked 
            ? `Conta bloqueada por ${BLOCK_DURATION_MINUTES} minutos devido a múltiplas tentativas falhas.`
            : null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'record') {
      // Record login attempt - success is now read from initial json parse
      const { error } = await supabase
        .from('login_attempts')
        .insert({
          email: email.toLowerCase(),
          ip_address: ip_address || null,
          success: success || false
        });
      
      if (error) {
        console.error('Error recording login attempt:', error);
        throw error;
      }

      // If successful login, clean old failed attempts for this user
      if (success) {
        await supabase
          .from('login_attempts')
          .delete()
          .eq('email', email.toLowerCase())
          .eq('success', false);
      }

      return new Response(
        JSON.stringify({ recorded: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cleanup') {
      // Cleanup old attempts (older than 24 hours)
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { error } = await supabase
        .from('login_attempts')
        .delete()
        .lt('attempt_at', cutoffTime);
      
      if (error) {
        console.error('Error cleaning up login attempts:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ cleaned: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "check", "record", or "cleanup"' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Check login attempt error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
