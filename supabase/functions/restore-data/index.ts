import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { backup, mode } = await req.json();
    
    console.log(`Restoring backup for user: ${user.id}, mode: ${mode}`);
    
    if (!backup || !backup.data) {
      return new Response(
        JSON.stringify({ error: 'Invalid backup format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      success: true,
      restored: {} as Record<string, number>,
      errors: [] as string[]
    };

    // Helper to restore a table
    async function restoreTable(tableName: string, data: any[], idMapping: Map<string, string> = new Map()) {
      if (!data || data.length === 0) return 0;
      
      let count = 0;
      
      for (const item of data) {
        const oldId = item.id;
        const newItem = { 
          ...item, 
          seller_id: user!.id,
          id: undefined // Let DB generate new ID
        };
        delete newItem.id;
        
        // Update foreign key references if needed
        if (tableName === 'clients' && item.plan_id && idMapping.has(item.plan_id)) {
          newItem.plan_id = idMapping.get(item.plan_id);
        }
        if (tableName === 'clients' && item.server_id && idMapping.has(item.server_id)) {
          newItem.server_id = idMapping.get(item.server_id);
        }
        if (tableName === 'panel_clients' && item.panel_id && idMapping.has(item.panel_id)) {
          newItem.panel_id = idMapping.get(item.panel_id);
        }
        if (tableName === 'panel_clients' && item.client_id && idMapping.has(item.client_id)) {
          newItem.client_id = idMapping.get(item.client_id);
        }
        if (tableName === 'referrals' && item.referrer_client_id && idMapping.has(item.referrer_client_id)) {
          newItem.referrer_client_id = idMapping.get(item.referrer_client_id);
        }
        if (tableName === 'referrals' && item.referred_client_id && idMapping.has(item.referred_client_id)) {
          newItem.referred_client_id = idMapping.get(item.referred_client_id);
        }
        if (tableName === 'message_history' && item.client_id && idMapping.has(item.client_id)) {
          newItem.client_id = idMapping.get(item.client_id);
        }
        if (tableName === 'message_history' && item.template_id && idMapping.has(item.template_id)) {
          newItem.template_id = idMapping.get(item.template_id);
        }

        const { data: inserted, error } = await supabase
          .from(tableName)
          .insert(newItem)
          .select('id')
          .single();
        
        if (error) {
          console.error(`Error restoring ${tableName}:`, error);
          results.errors.push(`${tableName}: ${error.message}`);
        } else {
          idMapping.set(oldId, inserted.id);
          count++;
        }
      }
      
      return count;
    }

    // If mode is 'replace', delete existing data first
    if (mode === 'replace') {
      console.log('Deleting existing data...');
      // Delete dependent tables first
      await Promise.all([
        supabase.from('panel_clients').delete().eq('seller_id', user.id),
        supabase.from('message_history').delete().eq('seller_id', user.id),
        supabase.from('referrals').delete().eq('seller_id', user.id),
      ]);
      await supabase.from('clients').delete().eq('seller_id', user.id);
      await Promise.all([
        supabase.from('plans').delete().eq('seller_id', user.id),
        supabase.from('servers').delete().eq('seller_id', user.id),
        supabase.from('coupons').delete().eq('seller_id', user.id),
        supabase.from('whatsapp_templates').delete().eq('seller_id', user.id),
        supabase.from('bills_to_pay').delete().eq('seller_id', user.id),
        supabase.from('shared_panels').delete().eq('seller_id', user.id),
        supabase.from('client_categories').delete().eq('seller_id', user.id),
      ]);
    }

    const idMapping = new Map<string, string>();

    // Restore in order to handle foreign keys
    // 1. Plans and servers first (no dependencies)
    results.restored.plans = await restoreTable('plans', backup.data.plans, idMapping);
    results.restored.servers = await restoreTable('servers', backup.data.servers, idMapping);
    results.restored.shared_panels = await restoreTable('shared_panels', backup.data.shared_panels, idMapping);
    results.restored.whatsapp_templates = await restoreTable('whatsapp_templates', backup.data.whatsapp_templates, idMapping);
    results.restored.client_categories = await restoreTable('client_categories', backup.data.client_categories, idMapping);
    
    // 2. Clients (depends on plans/servers)
    results.restored.clients = await restoreTable('clients', backup.data.clients, idMapping);
    
    // 3. Tables that depend on clients
    results.restored.coupons = await restoreTable('coupons', backup.data.coupons, idMapping);
    results.restored.bills_to_pay = await restoreTable('bills_to_pay', backup.data.bills_to_pay, idMapping);
    results.restored.panel_clients = await restoreTable('panel_clients', backup.data.panel_clients, idMapping);
    results.restored.referrals = await restoreTable('referrals', backup.data.referrals, idMapping);
    results.restored.message_history = await restoreTable('message_history', backup.data.message_history, idMapping);

    console.log('Restore completed:', results.restored);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Restore error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
