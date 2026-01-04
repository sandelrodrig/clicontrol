import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiringClient {
  id: string;
  name: string;
  expiration_date: string;
  seller_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[check-expirations] Starting expiration check...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get today and next 3 days dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const todayStr = today.toISOString().split('T')[0];
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

    console.log('[check-expirations] Checking from', todayStr, 'to', threeDaysStr);

    // Get all expiring clients grouped by seller
    const { data: expiringClients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, expiration_date, seller_id')
      .gte('expiration_date', todayStr)
      .lte('expiration_date', threeDaysStr)
      .eq('is_archived', false)
      .order('expiration_date');

    if (clientsError) {
      throw new Error(`Error fetching clients: ${clientsError.message}`);
    }

    console.log('[check-expirations] Found expiring clients:', expiringClients?.length || 0);

    if (!expiringClients || expiringClients.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No expiring clients found',
        notificationsSent: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group clients by seller
    const clientsBySeller: Record<string, ExpiringClient[]> = {};
    for (const client of expiringClients) {
      if (!clientsBySeller[client.seller_id]) {
        clientsBySeller[client.seller_id] = [];
      }
      clientsBySeller[client.seller_id].push(client);
    }

    console.log('[check-expirations] Sellers with expiring clients:', Object.keys(clientsBySeller).length);

    // Get push subscriptions for all sellers with expiring clients
    const sellerIds = Object.keys(clientsBySeller);
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id, endpoint')
      .in('user_id', sellerIds);

    if (subError) {
      console.error('[check-expirations] Error fetching subscriptions:', subError);
    }

    console.log('[check-expirations] Found subscriptions:', subscriptions?.length || 0);

    let notificationsSent = 0;
    const results: { sellerId: string; clientCount: number; notified: boolean }[] = [];

    // Send notifications to each seller
    for (const [sellerId, clients] of Object.entries(clientsBySeller)) {
      const hasSubscription = subscriptions?.some(s => s.user_id === sellerId);
      
      // Group by days until expiration
      const expiringToday = clients.filter(c => c.expiration_date === todayStr);
      const expiringTomorrow = clients.filter(c => {
        const expDate = new Date(c.expiration_date);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return expDate.toISOString().split('T')[0] === tomorrow.toISOString().split('T')[0];
      });
      const expiringIn2Days = clients.filter(c => {
        const expDate = new Date(c.expiration_date);
        const in2Days = new Date(today);
        in2Days.setDate(in2Days.getDate() + 2);
        return expDate.toISOString().split('T')[0] === in2Days.toISOString().split('T')[0];
      });
      const expiringIn3Days = clients.filter(c => {
        const expDate = new Date(c.expiration_date);
        const in3Days = new Date(today);
        in3Days.setDate(in3Days.getDate() + 3);
        return expDate.toISOString().split('T')[0] === in3Days.toISOString().split('T')[0];
      });

      // Build notification message
      let body = '';
      if (expiringToday.length > 0) {
        body += `⚠️ HOJE: ${expiringToday.length} cliente(s)\n`;
      }
      if (expiringTomorrow.length > 0) {
        body += `📅 Amanhã: ${expiringTomorrow.length} cliente(s)\n`;
      }
      if (expiringIn2Days.length > 0) {
        body += `📆 Em 2 dias: ${expiringIn2Days.length} cliente(s)\n`;
      }
      if (expiringIn3Days.length > 0) {
        body += `🗓️ Em 3 dias: ${expiringIn3Days.length} cliente(s)`;
      }

      if (hasSubscription && body) {
        try {
          // Call send-push-notification function
          const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              userId: sellerId,
              title: `🔔 ${clients.length} Cliente(s) Vencendo!`,
              body: body.trim(),
              tag: 'client-expiration',
              data: { type: 'expiration-alert', count: clients.length }
            }),
          });

          const result = await response.json();
          console.log('[check-expirations] Notification result for seller', sellerId, ':', result);
          
          if (result.sent > 0) {
            notificationsSent++;
          }
          
          results.push({ sellerId, clientCount: clients.length, notified: result.sent > 0 });
        } catch (error) {
          console.error('[check-expirations] Error sending notification to seller', sellerId, ':', error);
          results.push({ sellerId, clientCount: clients.length, notified: false });
        }
      } else {
        results.push({ sellerId, clientCount: clients.length, notified: false });
      }
    }

    console.log('[check-expirations] Completed. Notifications sent:', notificationsSent);

    return new Response(JSON.stringify({ 
      message: 'Expiration check completed',
      totalExpiringClients: expiringClients.length,
      sellersChecked: sellerIds.length,
      notificationsSent,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[check-expirations] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
