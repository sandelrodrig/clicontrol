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

    // Verify the user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating COMPLETE CLEAN backup by admin: ${user.id}`);

    // Fetch ALL data from ALL users - No IDs, using logical keys
    const [
      profilesResult,
      clientsResult,
      plansResult,
      serversResult,
      couponsResult,
      referralsResult,
      templatesResult,
      billsResult,
      panelsResult,
      panelClientsResult,
      messageHistoryResult,
      clientCategoriesResult,
      externalAppsResult,
      clientExternalAppsResult,
      clientPremiumAccountsResult,
      customProductsResult,
      appSettingsResult,
      monthlyProfitsResult,
    ] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('plans').select('*'),
      supabase.from('servers').select('*'),
      supabase.from('coupons').select('*'),
      supabase.from('referrals').select('*'),
      supabase.from('whatsapp_templates').select('*'),
      supabase.from('bills_to_pay').select('*'),
      supabase.from('shared_panels').select('*'),
      supabase.from('panel_clients').select('*'),
      supabase.from('message_history').select('*'),
      supabase.from('client_categories').select('*'),
      supabase.from('external_apps').select('*'),
      supabase.from('client_external_apps').select('*'),
      supabase.from('client_premium_accounts').select('*'),
      supabase.from('custom_products').select('*'),
      supabase.from('app_settings').select('*'),
      supabase.from('monthly_profits').select('*'),
    ]);

    // Create ID to logical key mappings
    const profileIdToEmail: Record<string, string> = {};
    const serverIdToName: Record<string, { name: string; sellerEmail: string }> = {};
    const planIdToInfo: Record<string, { name: string; sellerEmail: string }> = {};
    const clientIdToInfo: Record<string, { name: string; phone: string; sellerEmail: string }> = {};
    const panelIdToInfo: Record<string, { name: string; sellerEmail: string }> = {};
    const templateIdToInfo: Record<string, { name: string; type: string; sellerEmail: string }> = {};
    const externalAppIdToInfo: Record<string, { name: string; sellerEmail: string }> = {};
    const categoryIdToInfo: Record<string, { name: string; sellerEmail: string }> = {};

    // Build mappings
    (profilesResult.data || []).forEach((p: any) => {
      profileIdToEmail[p.id] = p.email;
    });

    (serversResult.data || []).forEach((s: any) => {
      serverIdToName[s.id] = { 
        name: s.name, 
        sellerEmail: profileIdToEmail[s.seller_id] || s.seller_id 
      };
    });

    (plansResult.data || []).forEach((p: any) => {
      planIdToInfo[p.id] = { 
        name: p.name, 
        sellerEmail: profileIdToEmail[p.seller_id] || p.seller_id 
      };
    });

    (clientsResult.data || []).forEach((c: any) => {
      clientIdToInfo[c.id] = { 
        name: c.name, 
        phone: c.phone || '', 
        sellerEmail: profileIdToEmail[c.seller_id] || c.seller_id 
      };
    });

    (panelsResult.data || []).forEach((p: any) => {
      panelIdToInfo[p.id] = { 
        name: p.name, 
        sellerEmail: profileIdToEmail[p.seller_id] || p.seller_id 
      };
    });

    (templatesResult.data || []).forEach((t: any) => {
      templateIdToInfo[t.id] = { 
        name: t.name, 
        type: t.type,
        sellerEmail: profileIdToEmail[t.seller_id] || t.seller_id 
      };
    });

    (externalAppsResult.data || []).forEach((a: any) => {
      externalAppIdToInfo[a.id] = { 
        name: a.name, 
        sellerEmail: profileIdToEmail[a.seller_id] || a.seller_id 
      };
    });

    (clientCategoriesResult.data || []).forEach((c: any) => {
      categoryIdToInfo[c.id] = { 
        name: c.name, 
        sellerEmail: profileIdToEmail[c.seller_id] || c.seller_id 
      };
    });

    // Transform data to use logical keys instead of IDs
    const transformProfile = (p: any) => ({
      email: p.email,
      full_name: p.full_name,
      whatsapp: p.whatsapp,
      pix_key: p.pix_key,
      company_name: p.company_name,
      is_active: p.is_active,
      is_permanent: p.is_permanent,
      subscription_expires_at: p.subscription_expires_at,
      tutorial_visto: p.tutorial_visto,
      needs_password_update: p.needs_password_update,
      created_at: p.created_at,
      updated_at: p.updated_at,
    });

    const transformServer = (s: any) => ({
      _seller_email: profileIdToEmail[s.seller_id] || s.seller_id,
      name: s.name,
      notes: s.notes,
      panel_url: s.panel_url,
      icon_url: s.icon_url,
      monthly_cost: s.monthly_cost,
      is_active: s.is_active,
      is_credit_based: s.is_credit_based,
      credit_value: s.credit_value,
      total_credits: s.total_credits,
      used_credits: s.used_credits,
      iptv_per_credit: s.iptv_per_credit,
      p2p_per_credit: s.p2p_per_credit,
      credit_price: s.credit_price,
      total_screens_per_credit: s.total_screens_per_credit,
      created_at: s.created_at,
      updated_at: s.updated_at,
    });

    const transformPlan = (p: any) => ({
      _seller_email: profileIdToEmail[p.seller_id] || p.seller_id,
      name: p.name,
      description: p.description,
      price: p.price,
      duration_days: p.duration_days,
      screens: p.screens,
      category: p.category,
      is_active: p.is_active,
      created_at: p.created_at,
      updated_at: p.updated_at,
    });

    const transformClient = (c: any) => ({
      _seller_email: profileIdToEmail[c.seller_id] || c.seller_id,
      _server_name: c.server_id && serverIdToName[c.server_id] ? serverIdToName[c.server_id].name : c.server_name,
      _server_name_2: c.server_id_2 && serverIdToName[c.server_id_2] ? serverIdToName[c.server_id_2].name : c.server_name_2,
      _plan_name: c.plan_id && planIdToInfo[c.plan_id] ? planIdToInfo[c.plan_id].name : c.plan_name,
      name: c.name,
      phone: c.phone,
      email: c.email,
      telegram: c.telegram,
      device: c.device,
      dns: c.dns,
      login: c.login,
      password: c.password,
      login_2: c.login_2,
      password_2: c.password_2,
      plan_price: c.plan_price,
      expiration_date: c.expiration_date,
      is_paid: c.is_paid,
      pending_amount: c.pending_amount,
      expected_payment_date: c.expected_payment_date,
      notes: c.notes,
      category: c.category,
      referral_code: c.referral_code,
      is_archived: c.is_archived,
      archived_at: c.archived_at,
      renewed_at: c.renewed_at,
      app_type: c.app_type,
      app_name: c.app_name,
      has_paid_apps: c.has_paid_apps,
      paid_apps_email: c.paid_apps_email,
      paid_apps_password: c.paid_apps_password,
      paid_apps_expiration: c.paid_apps_expiration,
      paid_apps_duration: c.paid_apps_duration,
      premium_password: c.premium_password,
      premium_price: c.premium_price,
      gerencia_app_mac: c.gerencia_app_mac,
      gerencia_app_devices: c.gerencia_app_devices,
      credentials_fingerprint: c.credentials_fingerprint,
      created_at: c.created_at,
      updated_at: c.updated_at,
    });

    const transformCoupon = (c: any) => ({
      _seller_email: profileIdToEmail[c.seller_id] || c.seller_id,
      code: c.code,
      name: c.name,
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      max_uses: c.max_uses,
      current_uses: c.current_uses,
      min_plan_value: c.min_plan_value,
      expires_at: c.expires_at,
      is_active: c.is_active,
      created_at: c.created_at,
      updated_at: c.updated_at,
    });

    const transformReferral = (r: any) => ({
      _seller_email: profileIdToEmail[r.seller_id] || r.seller_id,
      _referrer_client_name: clientIdToInfo[r.referrer_client_id]?.name || '',
      _referrer_client_phone: clientIdToInfo[r.referrer_client_id]?.phone || '',
      _referred_client_name: clientIdToInfo[r.referred_client_id]?.name || '',
      _referred_client_phone: clientIdToInfo[r.referred_client_id]?.phone || '',
      status: r.status,
      discount_percentage: r.discount_percentage,
      completed_at: r.completed_at,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });

    const transformTemplate = (t: any) => ({
      _seller_email: profileIdToEmail[t.seller_id] || t.seller_id,
      name: t.name,
      type: t.type,
      message: t.message,
      is_default: t.is_default,
      created_at: t.created_at,
      updated_at: t.updated_at,
    });

    const transformBill = (b: any) => ({
      _seller_email: profileIdToEmail[b.seller_id] || b.seller_id,
      description: b.description,
      recipient_name: b.recipient_name,
      recipient_whatsapp: b.recipient_whatsapp,
      recipient_pix: b.recipient_pix,
      amount: b.amount,
      due_date: b.due_date,
      is_paid: b.is_paid,
      paid_at: b.paid_at,
      notes: b.notes,
      created_at: b.created_at,
      updated_at: b.updated_at,
    });

    const transformPanel = (p: any) => ({
      _seller_email: profileIdToEmail[p.seller_id] || p.seller_id,
      name: p.name,
      panel_type: p.panel_type,
      url: p.url,
      login: p.login,
      password: p.password,
      total_slots: p.total_slots,
      used_slots: p.used_slots,
      used_iptv_slots: p.used_iptv_slots,
      used_p2p_slots: p.used_p2p_slots,
      monthly_cost: p.monthly_cost,
      iptv_per_credit: p.iptv_per_credit,
      p2p_per_credit: p.p2p_per_credit,
      expires_at: p.expires_at,
      is_active: p.is_active,
      notes: p.notes,
      created_at: p.created_at,
      updated_at: p.updated_at,
    });

    const transformPanelClient = (pc: any) => ({
      _seller_email: profileIdToEmail[pc.seller_id] || pc.seller_id,
      _panel_name: panelIdToInfo[pc.panel_id]?.name || '',
      _client_name: clientIdToInfo[pc.client_id]?.name || '',
      _client_phone: clientIdToInfo[pc.client_id]?.phone || '',
      slot_type: pc.slot_type,
      assigned_at: pc.assigned_at,
    });

    const transformMessageHistory = (m: any) => ({
      _seller_email: profileIdToEmail[m.seller_id] || m.seller_id,
      _client_name: clientIdToInfo[m.client_id]?.name || '',
      _client_phone: clientIdToInfo[m.client_id]?.phone || '',
      _template_name: m.template_id && templateIdToInfo[m.template_id] ? templateIdToInfo[m.template_id].name : null,
      _template_type: m.template_id && templateIdToInfo[m.template_id] ? templateIdToInfo[m.template_id].type : null,
      message_type: m.message_type,
      message_content: m.message_content,
      phone: m.phone,
      sent_at: m.sent_at,
    });

    const transformCategory = (c: any) => ({
      _seller_email: profileIdToEmail[c.seller_id] || c.seller_id,
      name: c.name,
      created_at: c.created_at,
    });

    const transformExternalApp = (a: any) => ({
      _seller_email: profileIdToEmail[a.seller_id] || a.seller_id,
      name: a.name,
      auth_type: a.auth_type,
      website_url: a.website_url,
      price: a.price,
      cost: a.cost,
      is_active: a.is_active,
      created_at: a.created_at,
      updated_at: a.updated_at,
    });

    const transformClientExternalApp = (cea: any) => ({
      _seller_email: profileIdToEmail[cea.seller_id] || cea.seller_id,
      _client_name: clientIdToInfo[cea.client_id]?.name || '',
      _client_phone: clientIdToInfo[cea.client_id]?.phone || '',
      _external_app_name: externalAppIdToInfo[cea.external_app_id]?.name || '',
      devices: cea.devices,
      email: cea.email,
      password: cea.password,
      expiration_date: cea.expiration_date,
      notes: cea.notes,
      created_at: cea.created_at,
      updated_at: cea.updated_at,
    });

    const transformClientPremiumAccount = (cpa: any) => ({
      _seller_email: profileIdToEmail[cpa.seller_id] || cpa.seller_id,
      _client_name: clientIdToInfo[cpa.client_id]?.name || '',
      _client_phone: clientIdToInfo[cpa.client_id]?.phone || '',
      plan_name: cpa.plan_name,
      email: cpa.email,
      password: cpa.password,
      price: cpa.price,
      expiration_date: cpa.expiration_date,
      notes: cpa.notes,
      created_at: cpa.created_at,
      updated_at: cpa.updated_at,
    });

    const transformCustomProduct = (cp: any) => ({
      _seller_email: profileIdToEmail[cp.seller_id] || cp.seller_id,
      name: cp.name,
      icon: cp.icon,
      is_active: cp.is_active,
      created_at: cp.created_at,
      updated_at: cp.updated_at,
    });

    const transformAppSetting = (s: any) => ({
      key: s.key,
      value: s.value,
      description: s.description,
      created_at: s.created_at,
      updated_at: s.updated_at,
    });

    const transformMonthlyProfit = (mp: any) => ({
      _seller_email: profileIdToEmail[mp.seller_id] || mp.seller_id,
      month: mp.month,
      year: mp.year,
      revenue: mp.revenue,
      server_costs: mp.server_costs,
      bills_costs: mp.bills_costs,
      net_profit: mp.net_profit,
      active_clients: mp.active_clients,
      closed_at: mp.closed_at,
      created_at: mp.created_at,
      updated_at: mp.updated_at,
    });

    const backup = {
      version: '3.0-complete-clean',
      format: 'clean-logical-keys',
      timestamp: new Date().toISOString(),
      description: 'Backup Limpo Completo - Sem IDs, com chaves lógicas',
      exported_by: user.email,
      
      stats: {
        profiles: (profilesResult.data || []).length,
        clients: (clientsResult.data || []).length,
        plans: (plansResult.data || []).length,
        servers: (serversResult.data || []).length,
        coupons: (couponsResult.data || []).length,
        referrals: (referralsResult.data || []).length,
        whatsapp_templates: (templatesResult.data || []).length,
        bills_to_pay: (billsResult.data || []).length,
        shared_panels: (panelsResult.data || []).length,
        panel_clients: (panelClientsResult.data || []).length,
        message_history: (messageHistoryResult.data || []).length,
        client_categories: (clientCategoriesResult.data || []).length,
        external_apps: (externalAppsResult.data || []).length,
        client_external_apps: (clientExternalAppsResult.data || []).length,
        client_premium_accounts: (clientPremiumAccountsResult.data || []).length,
        custom_products: (customProductsResult.data || []).length,
        app_settings: (appSettingsResult.data || []).length,
        monthly_profits: (monthlyProfitsResult.data || []).length,
      },
      
      data: {
        profiles: (profilesResult.data || []).map(transformProfile),
        servers: (serversResult.data || []).map(transformServer),
        plans: (plansResult.data || []).map(transformPlan),
        clients: (clientsResult.data || []).map(transformClient),
        coupons: (couponsResult.data || []).map(transformCoupon),
        referrals: (referralsResult.data || []).map(transformReferral),
        whatsapp_templates: (templatesResult.data || []).map(transformTemplate),
        bills_to_pay: (billsResult.data || []).map(transformBill),
        shared_panels: (panelsResult.data || []).map(transformPanel),
        panel_clients: (panelClientsResult.data || []).map(transformPanelClient),
        message_history: (messageHistoryResult.data || []).map(transformMessageHistory),
        client_categories: (clientCategoriesResult.data || []).map(transformCategory),
        external_apps: (externalAppsResult.data || []).map(transformExternalApp),
        client_external_apps: (clientExternalAppsResult.data || []).map(transformClientExternalApp),
        client_premium_accounts: (clientPremiumAccountsResult.data || []).map(transformClientPremiumAccount),
        custom_products: (customProductsResult.data || []).map(transformCustomProduct),
        app_settings: (appSettingsResult.data || []).map(transformAppSetting),
        monthly_profits: (monthlyProfitsResult.data || []).map(transformMonthlyProfit),
      },
    };

    console.log(`Complete backup created with stats:`, backup.stats);

    return new Response(
      JSON.stringify(backup),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Complete backup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
