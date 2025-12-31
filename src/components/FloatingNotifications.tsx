import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Bell, Clock, AlertTriangle, MessageCircle, ChevronDown, Calendar, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { differenceInDays, startOfToday, format, getDate, addMonths, setDate, isBefore, isAfter } from 'date-fns';
import { Link } from 'react-router-dom';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  expiration_date: string;
  plan_name: string | null;
  created_at: string | null;
}

interface Plan {
  id: string;
  duration_days: number;
}

interface AnnualClientReminder {
  client: Client;
  nextBillingDate: Date;
  daysUntilBilling: number;
  isAnnual: true;
}

interface ExpiringClient {
  client: Client;
  daysRemaining: number;
  isAnnual: false;
}

type NotificationItem = AnnualClientReminder | ExpiringClient;

export function FloatingNotifications() {
  const { user, isSeller } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(true);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSeller) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, expiration_date, plan_name, created_at')
        .eq('seller_id', user.id)
        .eq('is_archived', false);
      if (error) throw error;
      return data as Client[] || [];
    },
    enabled: !!user?.id && isSeller,
    refetchInterval: 60000,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans-for-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSeller) return [];
      const { data, error } = await supabase
        .from('plans')
        .select('id, duration_days');
      if (error) throw error;
      return data as Plan[] || [];
    },
    enabled: !!user?.id && isSeller,
  });

  const today = startOfToday();

  // Calculate monthly billing date for annual clients
  const getNextMonthlyBillingDate = (client: Client): Date | null => {
    // Use created_at as the reference for monthly billing
    if (!client.created_at) return null;
    
    const createdDate = new Date(client.created_at);
    const billingDay = getDate(createdDate); // Day of month when client was created
    
    // Find the next billing date
    let nextBilling = setDate(today, billingDay);
    
    // If today is after the billing day this month, get next month
    if (isBefore(nextBilling, today) || getDate(today) > billingDay) {
      nextBilling = addMonths(nextBilling, 1);
    }
    
    // Make sure billing date doesn't exceed expiration
    const expiration = new Date(client.expiration_date);
    if (isAfter(nextBilling, expiration)) {
      return null;
    }
    
    return nextBilling;
  };

  // Check if client has annual plan (365 days)
  const isAnnualPlan = (planName: string | null): boolean => {
    if (!planName) return false;
    const lowerName = planName.toLowerCase();
    return lowerName.includes('anual') || lowerName.includes('365');
  };

  // Get urgent clients (0-3 days to expire)
  const urgentClients: ExpiringClient[] = clients
    .filter(c => !isAnnualPlan(c.plan_name)) // Exclude annual clients from regular expiring
    .map(c => ({
      client: c,
      daysRemaining: differenceInDays(new Date(c.expiration_date), today),
      isAnnual: false as const
    }))
    .filter(c => c.daysRemaining >= 0 && c.daysRemaining <= 3)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Get annual clients with monthly billing reminder (1 day before)
  const annualClientReminders: AnnualClientReminder[] = clients
    .filter(c => isAnnualPlan(c.plan_name))
    .map(c => {
      const nextBilling = getNextMonthlyBillingDate(c);
      if (!nextBilling) return null;
      
      const daysUntilBilling = differenceInDays(nextBilling, today);
      
      // Only show if billing is in 1 day (tomorrow)
      if (daysUntilBilling === 1) {
        return {
          client: c,
          nextBillingDate: nextBilling,
          daysUntilBilling,
          isAnnual: true as const
        };
      }
      return null;
    })
    .filter((item): item is AnnualClientReminder => item !== null);

  const allNotifications: NotificationItem[] = [
    ...annualClientReminders, // Annual reminders first
    ...urgentClients
  ];

  const totalUrgent = allNotifications.length;

  useEffect(() => {
    if (totalUrgent > 0) {
      setHasNewNotifications(true);
    }
  }, [totalUrgent]);

  if (!isSeller || totalUrgent === 0 || isDismissed) {
    return null;
  }

  const getDayLabel = (days: number, isAnnual: boolean = false) => {
    if (isAnnual) return 'Cobrança';
    if (days === 0) return 'HOJE';
    if (days === 1) return 'Amanhã';
    return `${days} dias`;
  };

  const getDayColor = (days: number, isAnnual: boolean = false) => {
    if (isAnnual) return 'text-primary bg-primary/20';
    if (days === 0) return 'text-destructive bg-destructive/20';
    if (days === 1) return 'text-destructive/80 bg-destructive/10';
    if (days === 2) return 'text-warning bg-warning/20';
    return 'text-warning/70 bg-warning/10';
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${formattedPhone}`, '_blank');
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6">
      {/* Notification Badge Button */}
      {!isOpen && (
        <Button
          onClick={() => {
            setIsOpen(true);
            setHasNewNotifications(false);
          }}
          className={cn(
            "relative h-14 w-14 rounded-full shadow-lg",
            "bg-warning hover:bg-warning/90 text-warning-foreground",
            hasNewNotifications && "animate-bounce"
          )}
        >
          <Bell className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
            {totalUrgent}
          </span>
          {hasNewNotifications && (
            <span className="absolute -top-1 -right-1 flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            </span>
          )}
        </Button>
      )}

      {/* Notification Panel */}
      {isOpen && (
        <div className="w-80 max-h-96 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-warning/20 to-destructive/20 px-4 py-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-warning" />
              <span className="font-semibold text-sm">Lembretes</span>
              <Badge variant="destructive" className="text-xs">{totalUrgent}</Badge>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsOpen(false)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-72 overflow-y-auto">
            {allNotifications.slice(0, 10).map((item, index) => (
              <div
                key={item.client.id}
                className={cn(
                  "px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0",
                  index === 0 && "bg-destructive/5"
                )}
              >
                {/* Day Badge */}
                <div className={cn(
                  "flex-shrink-0 w-14 h-10 rounded-lg flex flex-col items-center justify-center text-xs font-bold",
                  getDayColor(item.isAnnual ? 1 : (item as ExpiringClient).daysRemaining, item.isAnnual)
                )}>
                  {item.isAnnual ? (
                    <Repeat className="h-4 w-4" />
                  ) : (item as ExpiringClient).daysRemaining === 0 ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Clock className="h-3 w-3 mb-0.5" />
                  )}
                  <span className="text-[10px]">{getDayLabel(item.isAnnual ? 1 : (item as ExpiringClient).daysRemaining, item.isAnnual)}</span>
                </div>

                {/* Client Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.client.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.isAnnual ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Mensal: {format((item as AnnualClientReminder).nextBillingDate, 'dd/MM')}
                      </span>
                    ) : (
                      item.client.plan_name || 'Sem plano'
                    )}
                  </p>
                </div>

                {/* WhatsApp Button */}
                {item.client.phone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10 flex-shrink-0"
                    onClick={() => openWhatsApp(item.client.phone!, item.client.name)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {allNotifications.length > 10 && (
              <div className="px-4 py-2 text-center text-xs text-muted-foreground bg-muted/30">
                +{allNotifications.length - 10} outros clientes
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-muted/30 border-t border-border">
            <Link to="/clients" onClick={() => setIsOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todos os clientes
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}