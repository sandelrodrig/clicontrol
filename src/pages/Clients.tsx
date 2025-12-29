import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Search, Phone, Mail, Calendar, CreditCard, User, Trash2, Edit, Eye, EyeOff, MessageCircle } from 'lucide-react';
import { format, addDays, isBefore, isAfter, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  device: string | null;
  expiration_date: string;
  plan_id: string | null;
  plan_name: string | null;
  plan_price: number | null;
  server_id: string | null;
  server_name: string | null;
  login: string | null;
  password: string | null;
  is_paid: boolean;
  notes: string | null;
}

type FilterType = 'all' | 'active' | 'expiring' | 'expired' | 'unpaid';

export default function Clients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showPassword, setShowPassword] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    device: '',
    expiration_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    plan_name: '',
    plan_price: '',
    server_name: '',
    login: '',
    password: '',
    is_paid: true,
    notes: '',
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('seller_id', user!.id)
        .order('expiration_date', { ascending: true });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Client>) => {
      const { error } = await supabase.from('clients').insert([{
        ...data,
        seller_id: user!.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente criado com sucesso!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      const { error } = await supabase.from('clients').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente atualizado!');
      resetForm();
      setIsDialogOpen(false);
      setEditingClient(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente excluído!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      device: '',
      expiration_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      plan_name: '',
      plan_price: '',
      server_name: '',
      login: '',
      password: '',
      is_paid: true,
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      device: formData.device || null,
      expiration_date: formData.expiration_date,
      plan_name: formData.plan_name || null,
      plan_price: formData.plan_price ? parseFloat(formData.plan_price) : null,
      server_name: formData.server_name || null,
      login: formData.login || null,
      password: formData.password || null,
      is_paid: formData.is_paid,
      notes: formData.notes || null,
    };

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      device: client.device || '',
      expiration_date: client.expiration_date,
      plan_name: client.plan_name || '',
      plan_price: client.plan_price?.toString() || '',
      server_name: client.server_name || '',
      login: client.login || '',
      password: client.password || '',
      is_paid: client.is_paid,
      notes: client.notes || '',
    });
    setIsDialogOpen(true);
  };

  const today = startOfToday();
  const nextWeek = addDays(today, 7);

  const getClientStatus = (client: Client) => {
    const expDate = new Date(client.expiration_date);
    if (isBefore(expDate, today)) return 'expired';
    if (isBefore(expDate, nextWeek)) return 'expiring';
    return 'active';
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.phone?.includes(search) ||
      client.email?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const status = getClientStatus(client);
    switch (filter) {
      case 'active':
        return status === 'active';
      case 'expiring':
        return status === 'expiring';
      case 'expired':
        return status === 'expired';
      case 'unpaid':
        return !client.is_paid;
      default:
        return true;
    }
  });

  const statusColors = {
    active: 'border-l-success',
    expiring: 'border-l-warning',
    expired: 'border-l-destructive',
  };

  const statusBadges = {
    active: 'bg-success/10 text-success',
    expiring: 'bg-warning/10 text-warning',
    expired: 'bg-destructive/10 text-destructive',
  };

  const statusLabels = {
    active: 'Ativo',
    expiring: 'Vencendo',
    expired: 'Vencido',
  };

  const openWhatsApp = (phone: string, name: string) => {
    const message = `Olá ${name}!`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes e assinaturas</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingClient(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              <DialogDescription>
                {editingClient ? 'Atualize os dados do cliente' : 'Preencha os dados do novo cliente'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+55 11 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device">Dispositivo</Label>
                  <Input
                    id="device"
                    value={formData.device}
                    onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                    placeholder="Smart TV, Celular..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiration_date">Data de Vencimento *</Label>
                  <Input
                    id="expiration_date"
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan_name">Nome do Plano</Label>
                  <Input
                    id="plan_name"
                    value={formData.plan_name}
                    onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                    placeholder="Plano Mensal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan_price">Preço (R$)</Label>
                  <Input
                    id="plan_price"
                    type="number"
                    step="0.01"
                    value={formData.plan_price}
                    onChange={(e) => setFormData({ ...formData, plan_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="server_name">Servidor</Label>
                  <Input
                    id="server_name"
                    value={formData.server_name}
                    onChange={(e) => setFormData({ ...formData, server_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login">Login</Label>
                  <Input
                    id="login"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="is_paid">Status de Pagamento</Label>
                  <Select
                    value={formData.is_paid ? 'paid' : 'unpaid'}
                    onValueChange={(v) => setFormData({ ...formData, is_paid: v === 'paid' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="unpaid">Não Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingClient ? 'Salvar' : 'Criar Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Todos ({clients.length})</TabsTrigger>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="expiring">Vencendo</TabsTrigger>
            <TabsTrigger value="expired">Vencidos</TabsTrigger>
            <TabsTrigger value="unpaid">Não Pagos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Clients Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground text-center">
              {search ? 'Tente ajustar sua busca' : 'Adicione seu primeiro cliente clicando no botão acima'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => {
            const status = getClientStatus(client);
            return (
              <Card
                key={client.id}
                className={cn(
                  'border-l-4 transition-all duration-200 hover:shadow-lg animate-slide-up',
                  statusColors[status],
                  !client.is_paid && 'ring-1 ring-destructive/50'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{client.name}</h3>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', statusBadges[status])}>
                        {statusLabels[status]}
                      </span>
                    </div>
                    {!client.is_paid && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        Não Pago
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Vence: {format(new Date(client.expiration_date), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
                    </div>
                    {client.plan_price && (
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>R$ {client.plan_price.toFixed(2)}</span>
                      </div>
                    )}
                    {client.login && (
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        <span>Login: {client.login}</span>
                        {client.password && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => setShowPassword(showPassword === client.id ? null : client.id)}
                          >
                            {showPassword === client.id ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                    {showPassword === client.id && client.password && (
                      <div className="text-xs bg-muted px-2 py-1 rounded">
                        Senha: {client.password}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                    {client.phone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openWhatsApp(client.phone!, client.name)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={() => handleEdit(client)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este cliente?')) {
                          deleteMutation.mutate(client.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
