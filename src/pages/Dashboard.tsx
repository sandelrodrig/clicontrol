import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { StatCard } from '@/components/dashboard/StatCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, Clock, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, addDays, isBefore, isAfter, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { user, profile, isAdmin, isSeller } = useAuth();
  const { isPrivacyMode, maskData } = usePrivacyMode();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSeller) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('seller_id', user.id);
      if (error) throw error;
      return data || [];
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

  return (
    <div className="space-y-6 animate-fade-in">
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

          {/* Expiring Clients Alert */}
          {expiringClients.length > 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardHeader>
                <CardTitle className="text-warning flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Clientes Vencendo em Breve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expiringClients.slice(0, 5).map((client) => (
                    <div key={client.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <span className="font-medium">{maskData(client.name, 'name')}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(client.expiration_date), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                  {expiringClients.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{expiringClients.length - 5} outros clientes
                    </p>
                  )}
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
    </div>
  );
}
