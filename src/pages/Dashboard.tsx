import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { StatCard } from '@/components/dashboard/StatCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, Clock, AlertTriangle, DollarSign, TrendingUp, Bell, MessageCircle, Send, Copy, ExternalLink, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addDays, isBefore, isAfter, startOfToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { SendMessageDialog } from '@/components/SendMessageDialog';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// Admin contact info for renewals
const ADMIN_WHATSAPP = '5531998518865';
const ADMIN_PIX = 'sandelrodrig@gmail.com';
const ADMIN_NAME = 'Sandel';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  expiration_date: string;
  plan_name: string | null;
  plan_price: number | null;
  is_paid: boolean | null;
  category: string | null;
  login: string | null;
  password: string | null;
  premium_password: string | null;
  server_name: string | null;
  telegram: string | null;
}

export default function Dashboard() {
  const { user, profile, isAdmin, isSeller } = useAuth();
  const { isPrivacyMode, maskData } = usePrivacyMode();
  const [messageClient, setMessageClient] = useState<Client | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSeller) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('seller_id', user.id);
      if (error) throw error;
      return data as Client[] || [];
    },
    enabled: !!user?.id && isSeller,
  });

  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers-count'],
    queryFn: async () => {
      if (!isAdmin) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, subscription_expires_at, is_permanent');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const today = startOfToday();
  const nextWeek = addDays(today, 7);

  // Seller stats
  const activeClients = clients.filter(c => 
    isAfter(new Date(c.expiration_date), today) || 
    format(new Date(c.expiration_date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  );
  const expiringClients = clients.filter(c => {
    const expDate = new Date(c.expiration_date);
    return isAfter(expDate, today) && isBefore(expDate, nextWeek);
  });
  const expiredClients = clients.filter(c => isBefore(new Date(c.expiration_date), today));
  const unpaidClients = clients.filter(c => !c.is_paid);

  const totalRevenue = clients.reduce((sum, c) => sum + (c.plan_price || 0), 0);

  // Clients expiring in specific days (1, 2, 3, 4, 5 days)
  const getClientsExpiringInDays = (days: number) => {
    return clients.filter(c => {
      const expDate = new Date(c.expiration_date);
      const diff = differenceInDays(expDate, today);
      return diff === days;
    });
  };

  // Clients expiring from 1 to 5 days, sorted by days remaining
  const urgentClients = clients
    .map(c => ({
      ...c,
      daysRemaining: differenceInDays(new Date(c.expiration_date), today)
    }))
    .filter(c => c.daysRemaining >= 0 && c.daysRemaining <= 5)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const expiringToday = getClientsExpiringInDays(0);
  const expiring1Day = getClientsExpiringInDays(1);
  const expiring2Days = getClientsExpiringInDays(2);
  const expiring3Days = getClientsExpiringInDays(3);

  const getDaysBadgeColor = (days: number) => {
    if (days === 0) return 'bg-destructive text-destructive-foreground';
    if (days === 1) return 'bg-destructive/80 text-destructive-foreground';
    if (days === 2) return 'bg-warning text-warning-foreground';
    if (days === 3) return 'bg-warning/70 text-warning-foreground';
    return 'bg-muted text-muted-foreground';
  };

  // Admin stats
  const activeSellers = sellers.filter(s => {
    if (s.is_permanent) return true;
    if (!s.subscription_expires_at) return false;
    const date = new Date(s.subscription_expires_at);
    return !isNaN(date.getTime()) && isAfter(date, today);
  });
  const expiredSellers = sellers.filter(s => {
    if (s.is_permanent) return false;
    if (!s.subscription_expires_at) return false;
    const date = new Date(s.subscription_expires_at);
    return !isNaN(date.getTime()) && isBefore(date, today);
  });

  // Subscription days remaining for seller
  const subscriptionDaysRemaining = profile?.subscription_expires_at 
    ? differenceInDays(new Date(profile.subscription_expires_at), today)
    : null;
  
  const isOnTrial = subscriptionDaysRemaining !== null && subscriptionDaysRemaining <= 5 && subscriptionDaysRemaining >= 0;
  const needsRenewalWarning = subscriptionDaysRemaining !== null && subscriptionDaysRemaining <= 3 && !profile?.is_permanent;

  const copyPixKey = () => {
    navigator.clipboard.writeText(ADMIN_PIX);
    toast.success('Chave PIX copiada!');
  };

  const openWhatsAppAdmin = () => {
    const message = encodeURIComponent(`Olá ${ADMIN_NAME}! Gostaria de renovar minha assinatura do PSControl. Meu email: ${profile?.email}`);
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Subscription Counter Banner */}
      {isSeller && !profile?.is_permanent && subscriptionDaysRemaining !== null && (
        <Card className={cn(
          "border-2 overflow-hidden",
          subscriptionDaysRemaining <= 0 ? "border-destructive bg-destructive/10" :
          subscriptionDaysRemaining <= 3 ? "border-warning bg-gradient-to-r from-warning/20 to-destructive/20" :
          subscriptionDaysRemaining <= 5 ? "border-warning/50 bg-warning/10" :
          "border-primary/30 bg-primary/5"
        )}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Counter */}
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex flex-col items-center justify-center w-20 h-20 rounded-2xl",
                  subscriptionDaysRemaining <= 0 ? "bg-destructive text-destructive-foreground" :
                  subscriptionDaysRemaining <= 3 ? "bg-warning text-warning-foreground" :
                  "bg-primary text-primary-foreground"
                )}>
                  <Timer className="h-5 w-5 mb-1" />
                  <span className="text-3xl font-bold">{Math.max(0, subscriptionDaysRemaining)}</span>
                  <span className="text-[10px] uppercase">dias</span>
                </div>
                <div>
                  <h3 className={cn(
                    "font-bold text-lg",
                    subscriptionDaysRemaining <= 0 ? "text-destructive" :
                    subscriptionDaysRemaining <= 3 ? "text-warning" : "text-foreground"
                  )}>
                    {subscriptionDaysRemaining <= 0 ? 'Assinatura Expirada!' :
                     subscriptionDaysRemaining <= 3 ? 'Renove sua Assinatura!' :
                     isOnTrial ? 'Período de Teste' : 'Sua Assinatura'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionDaysRemaining <= 0 
                      ? 'Seu acesso foi suspenso. Renove para continuar usando.'
                      : subscriptionDaysRemaining <= 3
                        ? `Faltam apenas ${subscriptionDaysRemaining} dia${subscriptionDaysRemaining > 1 ? 's' : ''} para expirar!`
                        : `Expira em ${format(new Date(profile.subscription_expires_at!), "dd 'de' MMMM", { locale: ptBR })}`
                    }
                  </p>
                </div>
              </div>

              {/* Renewal Info - Show when 3 days or less */}
              {needsRenewalWarning && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-card/80 border border-border">
                  <p className="text-xs font-medium text-muted-foreground">Para renovar, envie o comprovante para:</p>
                  
                  {/* PIX Key */}
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm font-mono truncate">
                      {ADMIN_PIX}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyPixKey}
                      className="gap-1 shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                      Copiar PIX
                    </Button>
                  </div>

                  {/* WhatsApp Button */}
                  <Button
                    onClick={openWhatsAppAdmin}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Enviar Comprovante no WhatsApp
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo, <span className="text-foreground font-medium">{maskData(profile?.full_name || 'Usuário', 'name')}</span>!
          {isAdmin && <span className="ml-2 text-primary">(Administrador)</span>}
        </p>
      </div>

      {/* Seller Dashboard */}
      {isSeller && (
        <>
          {/* Urgent Notifications */}
          {(expiringToday.length > 0 || expiring1Day.length > 0 || expiring2Days.length > 0 || expiring3Days.length > 0) && (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {expiringToday.length > 0 && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-destructive/20">
                      <Bell className="h-4 w-4 text-destructive animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs text-destructive font-medium">Vence HOJE</p>
                      <p className="text-xl font-bold text-destructive">{expiringToday.length}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {expiring1Day.length > 0 && (
                <Card className="border-destructive/70 bg-destructive/5">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-destructive/10">
                      <Clock className="h-4 w-4 text-destructive/80" />
                    </div>
                    <div>
                      <p className="text-xs text-destructive/80 font-medium">Vence em 1 dia</p>
                      <p className="text-xl font-bold text-destructive/80">{expiring1Day.length}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {expiring2Days.length > 0 && (
                <Card className="border-warning bg-warning/10">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-warning/20">
                      <Clock className="h-4 w-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-warning font-medium">Vence em 2 dias</p>
                      <p className="text-xl font-bold text-warning">{expiring2Days.length}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {expiring3Days.length > 0 && (
                <Card className="border-warning/60 bg-warning/5">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-warning/10">
                      <Clock className="h-4 w-4 text-warning/70" />
                    </div>
                    <div>
                      <p className="text-xs text-warning/70 font-medium">Vence em 3 dias</p>
                      <p className="text-xl font-bold text-warning/70">{expiring3Days.length}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total de Clientes"
              value={isPrivacyMode ? '●●' : clients.length}
              icon={Users}
              variant="primary"
            />
            <StatCard
              title="Clientes Ativos"
              value={isPrivacyMode ? '●●' : activeClients.length}
              icon={UserCheck}
              variant="success"
            />
            <StatCard
              title="Vencendo em 7 dias"
              value={isPrivacyMode ? '●●' : expiringClients.length}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="Vencidos"
              value={isPrivacyMode ? '●●' : expiredClients.length}
              icon={AlertTriangle}
              variant="danger"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-success" />
                  Receita Total
                </CardTitle>
                <CardDescription>Soma dos valores dos planos</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">
                  {maskData(`R$ ${totalRevenue.toFixed(2)}`, 'money')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Resumo Financeiro
                </CardTitle>
                <CardDescription>Visão geral</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clientes não pagos:</span>
                  <span className="font-medium text-destructive">{isPrivacyMode ? '●●' : unpaidClients.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Média por cliente:</span>
                  <span className="font-medium">
                    {maskData(`R$ ${clients.length > 0 ? (totalRevenue / clients.length).toFixed(2) : '0.00'}`, 'money')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Urgent Clients List - Sorted by days remaining */}
          {urgentClients.length > 0 && (
            <Card className="border-warning/50 bg-gradient-to-br from-warning/5 to-transparent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-warning flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Clientes Vencendo (0-5 dias)
                  </CardTitle>
                  <Link to="/clients">
                    <Button variant="outline" size="sm">Ver todos</Button>
                  </Link>
                </div>
                <CardDescription>Ordenados por urgência - clique para enviar mensagem</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {urgentClients.map((client) => (
                    <div 
                      key={client.id} 
                      className="flex justify-between items-center py-3 px-3 rounded-lg bg-card/50 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={cn("text-xs font-bold min-w-[70px] justify-center", getDaysBadgeColor(client.daysRemaining))}>
                          {client.daysRemaining === 0 ? 'HOJE' : `${client.daysRemaining} dia${client.daysRemaining > 1 ? 's' : ''}`}
                        </Badge>
                        <div>
                          <p className="font-medium">{maskData(client.name, 'name')}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.plan_name} • {format(new Date(client.expiration_date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {client.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMessageClient(client)}
                            className="gap-1 text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Send className="h-4 w-4" />
                            <span className="hidden sm:inline">Mensagem</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Admin Dashboard */}
      {isAdmin && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total de Vendedores"
              value={isPrivacyMode ? '●●' : sellers.length}
              icon={Users}
              variant="primary"
            />
            <StatCard
              title="Vendedores Ativos"
              value={isPrivacyMode ? '●●' : activeSellers.length}
              icon={UserCheck}
              variant="success"
            />
            <StatCard
              title="Assinaturas Expiradas"
              value={isPrivacyMode ? '●●' : expiredSellers.length}
              icon={AlertTriangle}
              variant="danger"
            />
            <StatCard
              title="Permanentes"
              value={isPrivacyMode ? '●●' : sellers.filter(s => s.is_permanent).length}
              icon={TrendingUp}
              variant="default"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Painel Administrativo</CardTitle>
              <CardDescription>
                Gerencie vendedores, planos e configurações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Use o menu lateral para acessar as funcionalidades administrativas.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Message Dialog */}
      {messageClient && (
        <SendMessageDialog
          client={messageClient}
          open={!!messageClient}
          onOpenChange={(open) => !open && setMessageClient(null)}
        />
      )}
    </div>
  );
}
