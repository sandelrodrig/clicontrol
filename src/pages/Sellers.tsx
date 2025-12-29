import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Search, UserCog, Calendar, Plus, Clock, Shield, Trash2 } from 'lucide-react';
import { format, addDays, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Seller {
  id: string;
  email: string;
  full_name: string | null;
  whatsapp: string | null;
  subscription_expires_at: string | null;
  is_permanent: boolean;
  is_active: boolean;
  created_at: string;
}

type FilterType = 'all' | 'active' | 'expired';

export default function Sellers() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get roles to filter out admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const adminIds = roles?.filter(r => r.role === 'admin').map(r => r.user_id) || [];
      
      return (profiles as Seller[]).filter(p => !adminIds.includes(p.id));
    },
  });

  const updateExpirationMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const seller = sellers.find(s => s.id === id);
      if (!seller) throw new Error('Vendedor não encontrado');

      const baseDate = seller.subscription_expires_at 
        ? new Date(seller.subscription_expires_at)
        : new Date();
      
      const newDate = addDays(baseDate, days);

      const { error } = await supabase
        .from('profiles')
        .update({ subscription_expires_at: newDate.toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      toast.success('Assinatura atualizada!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const togglePermanentMutation = useMutation({
    mutationFn: async ({ id, is_permanent }: { id: string; is_permanent: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_permanent })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      toast.success('Status atualizado!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const today = startOfToday();

  const getSellerStatus = (seller: Seller) => {
    if (seller.is_permanent) return 'permanent';
    if (!seller.subscription_expires_at) return 'expired';
    return isBefore(new Date(seller.subscription_expires_at), today) ? 'expired' : 'active';
  };

  const filteredSellers = sellers.filter((seller) => {
    const matchesSearch =
      seller.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      seller.email.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const status = getSellerStatus(seller);
    switch (filter) {
      case 'active':
        return status === 'active' || status === 'permanent';
      case 'expired':
        return status === 'expired';
      default:
        return true;
    }
  });

  const statusColors = {
    active: 'border-l-success',
    expired: 'border-l-destructive',
    permanent: 'border-l-primary',
  };

  const statusBadges = {
    active: 'bg-success/10 text-success',
    expired: 'bg-destructive/10 text-destructive',
    permanent: 'bg-primary/10 text-primary',
  };

  const statusLabels = {
    active: 'Ativo',
    expired: 'Expirado',
    permanent: 'Permanente',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vendedores</h1>
        <p className="text-muted-foreground">Gerencie os vendedores do sistema</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList>
            <TabsTrigger value="all">Todos ({sellers.length})</TabsTrigger>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="expired">Expirados</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Sellers List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-6 bg-muted rounded w-1/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredSellers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCog className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum vendedor encontrado</h3>
            <p className="text-muted-foreground text-center">
              {search ? 'Tente ajustar sua busca' : 'Os vendedores aparecem aqui quando se cadastram'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSellers.map((seller) => {
            const status = getSellerStatus(seller);
            return (
              <Card
                key={seller.id}
                className={cn(
                  'border-l-4 transition-all duration-200 hover:shadow-lg animate-slide-up',
                  statusColors[status]
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg">
                          {seller.full_name || seller.email.split('@')[0]}
                        </h3>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', statusBadges[status])}>
                          {statusLabels[status]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{seller.email}</p>
                      {seller.subscription_expires_at && !seller.is_permanent && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Expira: {format(new Date(seller.subscription_expires_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateExpirationMutation.mutate({ id: seller.id, days: 5 })}
                        disabled={seller.is_permanent}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        5 dias
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateExpirationMutation.mutate({ id: seller.id, days: 30 })}
                        disabled={seller.is_permanent}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        30 dias
                      </Button>
                      <Button
                        variant={seller.is_permanent ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => togglePermanentMutation.mutate({ 
                          id: seller.id, 
                          is_permanent: !seller.is_permanent 
                        })}
                      >
                        <Shield className="h-3.5 w-3.5 mr-1" />
                        {seller.is_permanent ? 'Remover Permanente' : 'Tornar Permanente'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
