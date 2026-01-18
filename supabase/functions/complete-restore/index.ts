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

    const { backup, mode, selectedModules } = await req.json();
    
    console.log(`Complete restore by admin: ${user.id}, mode: ${mode}`);
    
    if (!backup || !backup.data || backup.version !== '3.0-complete-clean') {
      return new Response(
        JSON.stringify({ error: 'Invalid backup format. Expected version 3.0-complete-clean' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      success: true,
      restored: {} as Record<string, number>,
      errors: [] as string[],
      conflicts: [] as string[],
    };

    // Mappings from logical keys to new IDs
    const emailToSellerId: Map<string, string> = new Map();
    const serverNameToId: Map<string, string> = new Map();
    const planNameToId: Map<string, string> = new Map();
    const clientKeyToId: Map<string, string> = new Map();
    const panelNameToId: Map<string, string> = new Map();
    const templateKeyToId: Map<string, string> = new Map();
    const externalAppNameToId: Map<string, string> = new Map();
    const categoryNameToId: Map<string, string> = new Map();

    const makeClientKey = (name: string, phone: string, sellerEmail: string) => 
      `${name}|${phone}|${sellerEmail}`;

    // If mode is 'replace', delete all existing data first
    if (mode === 'replace') {
      console.log('Deleting all existing data...');
      
      // Delete in order (respecting foreign keys)
      await supabase.from('panel_clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('message_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('referrals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('client_external_apps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('client_premium_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('plans').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('servers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('coupons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('whatsapp_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('bills_to_pay').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('shared_panels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('client_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('external_apps').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('custom_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('monthly_profits').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      // Don't delete profiles as they are linked to auth.users
    }

    const shouldRestore = (module: string) => {
      if (!selectedModules) return true;
      return selectedModules[module] === true;
    };

    // 1. First, map existing profiles by email
    const { data: existingProfiles } = await supabase.from('profiles').select('id, email');
    (existingProfiles || []).forEach((p: any) => {
      emailToSellerId.set(p.email, p.id);
    });

    // For profiles in backup that don't exist, we can't create them (they need auth.users)
    // Just log conflicts
    if (shouldRestore('profiles') && backup.data.profiles) {
      for (const profile of backup.data.profiles) {
        if (!emailToSellerId.has(profile.email)) {
          results.conflicts.push(`Perfil não existe no sistema: ${profile.email} - Crie o usuário primeiro`);
        } else {
          // Update existing profile with backup data
          const sellerId = emailToSellerId.get(profile.email);
          const { error } = await supabase
            .from('profiles')
            .update({
              full_name: profile.full_name,
              whatsapp: profile.whatsapp,
              pix_key: profile.pix_key,
              company_name: profile.company_name,
              is_active: profile.is_active,
              is_permanent: profile.is_permanent,
              subscription_expires_at: profile.subscription_expires_at,
              tutorial_visto: profile.tutorial_visto,
            })
            .eq('id', sellerId);
          
          if (error) {
            results.errors.push(`Perfil ${profile.email}: ${error.message}`);
          } else {
            results.restored.profiles = (results.restored.profiles || 0) + 1;
          }
        }
      }
    }

    // 2. Restore servers
    if (shouldRestore('servers') && backup.data.servers) {
      for (const server of backup.data.servers) {
        const sellerId = emailToSellerId.get(server._seller_email);
        if (!sellerId) {
          results.conflicts.push(`Servidor "${server.name}": vendedor não encontrado (${server._seller_email})`);
          continue;
        }

        const { data: inserted, error } = await supabase
          .from('servers')
          .insert({
            seller_id: sellerId,
            name: server.name,
            notes: server.notes,
            panel_url: server.panel_url,
            icon_url: server.icon_url,
            monthly_cost: server.monthly_cost,
            is_active: server.is_active,
            is_credit_based: server.is_credit_based,
            credit_value: server.credit_value,
            total_credits: server.total_credits,
            used_credits: server.used_credits,
            iptv_per_credit: server.iptv_per_credit,
            p2p_per_credit: server.p2p_per_credit,
            credit_price: server.credit_price,
            total_screens_per_credit: server.total_screens_per_credit,
          })
          .select('id')
          .single();

        if (error) {
          results.errors.push(`Servidor "${server.name}": ${error.message}`);
        } else {
          serverNameToId.set(`${server.name}|${server._seller_email}`, inserted.id);
          results.restored.servers = (results.restored.servers || 0) + 1;
        }
      }
    }

    // 3. Restore plans
    if (shouldRestore('plans') && backup.data.plans) {
      for (const plan of backup.data.plans) {
        const sellerId = emailToSellerId.get(plan._seller_email);
        if (!sellerId) {
          results.conflicts.push(`Plano "${plan.name}": vendedor não encontrado`);
          continue;
        }

        const { data: inserted, error } = await supabase
          .from('plans')
          .insert({
            seller_id: sellerId,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            duration_days: plan.duration_days,
            screens: plan.screens,
            category: plan.category,
            is_active: plan.is_active,
          })
          .select('id')
          .single();

        if (error) {
          results.errors.push(`Plano "${plan.name}": ${error.message}`);
        } else {
          planNameToId.set(`${plan.name}|${plan._seller_email}`, inserted.id);
          results.restored.plans = (results.restored.plans || 0) + 1;
        }
      }
    }

    // 4. Restore categories
    if (shouldRestore('client_categories') && backup.data.client_categories) {
      for (const cat of backup.data.client_categories) {
        const sellerId = emailToSellerId.get(cat._seller_email);
        if (!sellerId) continue;

        const { data: inserted, error } = await supabase
          .from('client_categories')
          .insert({
            seller_id: sellerId,
            name: cat.name,
          })
          .select('id')
          .single();

        if (error) {
          results.errors.push(`Categoria "${cat.name}": ${error.message}`);
        } else {
          categoryNameToId.set(`${cat.name}|${cat._seller_email}`, inserted.id);
          results.restored.client_categories = (results.restored.client_categories || 0) + 1;
        }
      }
    }

    // 5. Restore external apps
    if (shouldRestore('external_apps') && backup.data.external_apps) {
      for (const app of backup.data.external_apps) {
        const sellerId = emailToSellerId.get(app._seller_email);
        if (!sellerId) continue;

        const { data: inserted, error } = await supabase
          .from('external_apps')
          .insert({
            seller_id: sellerId,
            name: app.name,
            auth_type: app.auth_type,
            website_url: app.website_url,
            price: app.price,
            cost: app.cost,
            is_active: app.is_active,
          })
          .select('id')
          .single();

        if (error) {
          results.errors.push(`App externo "${app.name}": ${error.message}`);
        } else {
          externalAppNameToId.set(`${app.name}|${app._seller_email}`, inserted.id);
          results.restored.external_apps = (results.restored.external_apps || 0) + 1;
        }
      }
    }

    // 6. Restore shared panels
    if (shouldRestore('shared_panels') && backup.data.shared_panels) {
      for (const panel of backup.data.shared_panels) {
        const sellerId = emailToSellerId.get(panel._seller_email);
        if (!sellerId) continue;

        const { data: inserted, error } = await supabase
          .from('shared_panels')
          .insert({
            seller_id: sellerId,
            name: panel.name,
            panel_type: panel.panel_type,
            url: panel.url,
            login: panel.login,
            password: panel.password,
            total_slots: panel.total_slots,
            used_slots: panel.used_slots,
            used_iptv_slots: panel.used_iptv_slots,
            used_p2p_slots: panel.used_p2p_slots,
            monthly_cost: panel.monthly_cost,
            iptv_per_credit: panel.iptv_per_credit,
            p2p_per_credit: panel.p2p_per_credit,
            expires_at: panel.expires_at,
            is_active: panel.is_active,
            notes: panel.notes,
          })
          .select('id')
          .single();

        if (error) {
          results.errors.push(`Painel "${panel.name}": ${error.message}`);
        } else {
          panelNameToId.set(`${panel.name}|${panel._seller_email}`, inserted.id);
          results.restored.shared_panels = (results.restored.shared_panels || 0) + 1;
        }
      }
    }

    // 7. Restore templates
    if (shouldRestore('whatsapp_templates') && backup.data.whatsapp_templates) {
      for (const template of backup.data.whatsapp_templates) {
        const sellerId = emailToSellerId.get(template._seller_email);
        if (!sellerId) continue;

        const { data: inserted, error } = await supabase
          .from('whatsapp_templates')
          .insert({
            seller_id: sellerId,
            name: template.name,
            type: template.type,
            message: template.message,
            is_default: template.is_default,
          })
          .select('id')
          .single();

        if (error) {
          results.errors.push(`Template "${template.name}": ${error.message}`);
        } else {
          templateKeyToId.set(`${template.name}|${template.type}|${template._seller_email}`, inserted.id);
          results.restored.whatsapp_templates = (results.restored.whatsapp_templates || 0) + 1;
        }
      }
    }

    // 8. Restore clients
    if (shouldRestore('clients') && backup.data.clients) {
      for (const client of backup.data.clients) {
        const sellerId = emailToSellerId.get(client._seller_email);
        if (!sellerId) {
          results.conflicts.push(`Cliente "${client.name}": vendedor não encontrado`);
          continue;
        }

        // Find server and plan by name
        const serverId = serverNameToId.get(`${client._server_name}|${client._seller_email}`) || null;
        const serverId2 = serverNameToId.get(`${client._server_name_2}|${client._seller_email}`) || null;
        const planId = planNameToId.get(`${client._plan_name}|${client._seller_email}`) || null;

        const { data: inserted, error } = await supabase
          .from('clients')
          .insert({
            seller_id: sellerId,
            server_id: serverId,
            server_id_2: serverId2,
            plan_id: planId,
            name: client.name,
            phone: client.phone,
            email: client.email,
            telegram: client.telegram,
            device: client.device,
            dns: client.dns,
            login: client.login,
            password: client.password,
            login_2: client.login_2,
            password_2: client.password_2,
            plan_name: client._plan_name,
            server_name: client._server_name,
            server_name_2: client._server_name_2,
            plan_price: client.plan_price,
            expiration_date: client.expiration_date,
            is_paid: client.is_paid,
            pending_amount: client.pending_amount,
            expected_payment_date: client.expected_payment_date,
            notes: client.notes,
            category: client.category,
            referral_code: client.referral_code,
            is_archived: client.is_archived,
            archived_at: client.archived_at,
            renewed_at: client.renewed_at,
            app_type: client.app_type,
            app_name: client.app_name,
            has_paid_apps: client.has_paid_apps,
            paid_apps_email: client.paid_apps_email,
            paid_apps_password: client.paid_apps_password,
            paid_apps_expiration: client.paid_apps_expiration,
            paid_apps_duration: client.paid_apps_duration,
            premium_password: client.premium_password,
            premium_price: client.premium_price,
            gerencia_app_mac: client.gerencia_app_mac,
            gerencia_app_devices: client.gerencia_app_devices,
            credentials_fingerprint: client.credentials_fingerprint,
          })
          .select('id')
          .single();

        if (error) {
          results.errors.push(`Cliente "${client.name}": ${error.message}`);
        } else {
          clientKeyToId.set(makeClientKey(client.name, client.phone || '', client._seller_email), inserted.id);
          results.restored.clients = (results.restored.clients || 0) + 1;
        }
      }
    }

    // 9. Restore coupons
    if (shouldRestore('coupons') && backup.data.coupons) {
      for (const coupon of backup.data.coupons) {
        const sellerId = emailToSellerId.get(coupon._seller_email);
        if (!sellerId) continue;

        const { error } = await supabase
          .from('coupons')
          .insert({
            seller_id: sellerId,
            code: coupon.code,
            name: coupon.name,
            discount_type: coupon.discount_type,
            discount_value: coupon.discount_value,
            max_uses: coupon.max_uses,
            current_uses: coupon.current_uses,
            min_plan_value: coupon.min_plan_value,
            expires_at: coupon.expires_at,
            is_active: coupon.is_active,
          });

        if (error) {
          results.errors.push(`Cupom "${coupon.code}": ${error.message}`);
        } else {
          results.restored.coupons = (results.restored.coupons || 0) + 1;
        }
      }
    }

    // 10. Restore bills
    if (shouldRestore('bills_to_pay') && backup.data.bills_to_pay) {
      for (const bill of backup.data.bills_to_pay) {
        const sellerId = emailToSellerId.get(bill._seller_email);
        if (!sellerId) continue;

        const { error } = await supabase
          .from('bills_to_pay')
          .insert({
            seller_id: sellerId,
            description: bill.description,
            recipient_name: bill.recipient_name,
            recipient_whatsapp: bill.recipient_whatsapp,
            recipient_pix: bill.recipient_pix,
            amount: bill.amount,
            due_date: bill.due_date,
            is_paid: bill.is_paid,
            paid_at: bill.paid_at,
            notes: bill.notes,
          });

        if (error) {
          results.errors.push(`Conta "${bill.description}": ${error.message}`);
        } else {
          results.restored.bills_to_pay = (results.restored.bills_to_pay || 0) + 1;
        }
      }
    }

    // 11. Restore referrals
    if (shouldRestore('referrals') && backup.data.referrals) {
      for (const referral of backup.data.referrals) {
        const sellerId = emailToSellerId.get(referral._seller_email);
        if (!sellerId) continue;

        const referrerKey = makeClientKey(referral._referrer_client_name, referral._referrer_client_phone, referral._seller_email);
        const referredKey = makeClientKey(referral._referred_client_name, referral._referred_client_phone, referral._seller_email);
        
        const referrerId = clientKeyToId.get(referrerKey);
        const referredId = clientKeyToId.get(referredKey);

        if (!referrerId || !referredId) {
          results.conflicts.push(`Indicação: clientes não encontrados`);
          continue;
        }

        const { error } = await supabase
          .from('referrals')
          .insert({
            seller_id: sellerId,
            referrer_client_id: referrerId,
            referred_client_id: referredId,
            status: referral.status,
            discount_percentage: referral.discount_percentage,
            completed_at: referral.completed_at,
          });

        if (error) {
          results.errors.push(`Indicação: ${error.message}`);
        } else {
          results.restored.referrals = (results.restored.referrals || 0) + 1;
        }
      }
    }

    // 12. Restore panel clients
    if (shouldRestore('panel_clients') && backup.data.panel_clients) {
      for (const pc of backup.data.panel_clients) {
        const sellerId = emailToSellerId.get(pc._seller_email);
        if (!sellerId) continue;

        const panelId = panelNameToId.get(`${pc._panel_name}|${pc._seller_email}`);
        const clientId = clientKeyToId.get(makeClientKey(pc._client_name, pc._client_phone, pc._seller_email));

        if (!panelId || !clientId) continue;

        const { error } = await supabase
          .from('panel_clients')
          .insert({
            seller_id: sellerId,
            panel_id: panelId,
            client_id: clientId,
            slot_type: pc.slot_type,
            assigned_at: pc.assigned_at,
          });

        if (error) {
          results.errors.push(`Painel-Cliente: ${error.message}`);
        } else {
          results.restored.panel_clients = (results.restored.panel_clients || 0) + 1;
        }
      }
    }

    // 13. Restore client external apps
    if (shouldRestore('client_external_apps') && backup.data.client_external_apps) {
      for (const cea of backup.data.client_external_apps) {
        const sellerId = emailToSellerId.get(cea._seller_email);
        if (!sellerId) continue;

        const clientId = clientKeyToId.get(makeClientKey(cea._client_name, cea._client_phone, cea._seller_email));
        const appId = externalAppNameToId.get(`${cea._external_app_name}|${cea._seller_email}`);

        if (!clientId || !appId) continue;

        const { error } = await supabase
          .from('client_external_apps')
          .insert({
            seller_id: sellerId,
            client_id: clientId,
            external_app_id: appId,
            devices: cea.devices,
            email: cea.email,
            password: cea.password,
            expiration_date: cea.expiration_date,
            notes: cea.notes,
          });

        if (error) {
          results.errors.push(`Cliente-App: ${error.message}`);
        } else {
          results.restored.client_external_apps = (results.restored.client_external_apps || 0) + 1;
        }
      }
    }

    // 14. Restore client premium accounts
    if (shouldRestore('client_premium_accounts') && backup.data.client_premium_accounts) {
      for (const cpa of backup.data.client_premium_accounts) {
        const sellerId = emailToSellerId.get(cpa._seller_email);
        if (!sellerId) continue;

        const clientId = clientKeyToId.get(makeClientKey(cpa._client_name, cpa._client_phone, cpa._seller_email));
        if (!clientId) continue;

        const { error } = await supabase
          .from('client_premium_accounts')
          .insert({
            seller_id: sellerId,
            client_id: clientId,
            plan_name: cpa.plan_name,
            email: cpa.email,
            password: cpa.password,
            price: cpa.price,
            expiration_date: cpa.expiration_date,
            notes: cpa.notes,
          });

        if (error) {
          results.errors.push(`Conta premium: ${error.message}`);
        } else {
          results.restored.client_premium_accounts = (results.restored.client_premium_accounts || 0) + 1;
        }
      }
    }

    // 15. Restore custom products
    if (shouldRestore('custom_products') && backup.data.custom_products) {
      for (const cp of backup.data.custom_products) {
        const sellerId = emailToSellerId.get(cp._seller_email);
        if (!sellerId) continue;

        const { error } = await supabase
          .from('custom_products')
          .insert({
            seller_id: sellerId,
            name: cp.name,
            icon: cp.icon,
            is_active: cp.is_active,
          });

        if (error) {
          results.errors.push(`Produto "${cp.name}": ${error.message}`);
        } else {
          results.restored.custom_products = (results.restored.custom_products || 0) + 1;
        }
      }
    }

    // 16. Restore monthly profits
    if (shouldRestore('monthly_profits') && backup.data.monthly_profits) {
      for (const mp of backup.data.monthly_profits) {
        const sellerId = emailToSellerId.get(mp._seller_email);
        if (!sellerId) continue;

        const { error } = await supabase
          .from('monthly_profits')
          .insert({
            seller_id: sellerId,
            month: mp.month,
            year: mp.year,
            revenue: mp.revenue,
            server_costs: mp.server_costs,
            bills_costs: mp.bills_costs,
            net_profit: mp.net_profit,
            active_clients: mp.active_clients,
            closed_at: mp.closed_at,
          });

        if (error) {
          results.errors.push(`Lucro ${mp.month}/${mp.year}: ${error.message}`);
        } else {
          results.restored.monthly_profits = (results.restored.monthly_profits || 0) + 1;
        }
      }
    }

    // 17. Restore app settings
    if (shouldRestore('app_settings') && backup.data.app_settings) {
      for (const setting of backup.data.app_settings) {
        // Check if setting exists
        const { data: existing } = await supabase
          .from('app_settings')
          .select('id')
          .eq('key', setting.key)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('app_settings')
            .update({ value: setting.value, description: setting.description })
            .eq('key', setting.key);

          if (!error) {
            results.restored.app_settings = (results.restored.app_settings || 0) + 1;
          }
        } else {
          const { error } = await supabase
            .from('app_settings')
            .insert({
              key: setting.key,
              value: setting.value,
              description: setting.description,
            });

          if (!error) {
            results.restored.app_settings = (results.restored.app_settings || 0) + 1;
          }
        }
      }
    }

    // 18. Restore message history (optional, can be very large)
    if (shouldRestore('message_history') && backup.data.message_history) {
      let msgCount = 0;
      for (const msg of backup.data.message_history) {
        const sellerId = emailToSellerId.get(msg._seller_email);
        if (!sellerId) continue;

        const clientId = clientKeyToId.get(makeClientKey(msg._client_name, msg._client_phone, msg._seller_email));
        if (!clientId) continue;

        const templateId = msg._template_name && msg._template_type 
          ? templateKeyToId.get(`${msg._template_name}|${msg._template_type}|${msg._seller_email}`) 
          : null;

        const { error } = await supabase
          .from('message_history')
          .insert({
            seller_id: sellerId,
            client_id: clientId,
            template_id: templateId,
            message_type: msg.message_type,
            message_content: msg.message_content,
            phone: msg.phone,
            sent_at: msg.sent_at,
          });

        if (!error) {
          msgCount++;
        }
      }
      results.restored.message_history = msgCount;
    }

    console.log('Complete restore finished:', results);

    return new Response(
      JSON.stringify(results),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Complete restore error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
