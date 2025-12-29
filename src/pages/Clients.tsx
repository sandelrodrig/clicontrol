import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCrypto } from '@/hooks/useCrypto';
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
import { Plus, Search, Phone, Mail, Calendar, CreditCard, User, Trash2, Edit, Eye, EyeOff, MessageCircle, RefreshCw, Lock, Loader2 } from 'lucide-react';
import { format, addDays, isBefore, isAfter, startOfToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SendMessageDialog } from '@/components/SendMessageDialog';

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

interface DecryptedCredentials {
  [clientId: string]: { login: string; password: string };
}

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  is_active: boolean;
}

interface ServerData {
  id: string;
  name: string;
  is_active: boolean;
}

type FilterType = 'all' | 'active' | 'expiring' | 'expired' | 'unpaid';

export default function Clients() {
  const { user } = useAuth();
  const { encrypt, decrypt } = useCrypto();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [messageClient, setMessageClient] = useState<Client | null>(null);
  const [decryptedCredentials, setDecryptedCredentials] = useState<DecryptedCredentials>({});
  const [decrypting, setDecrypting] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    device: '',
    expiration_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    plan_id: '',
    plan_name: '',
    plan_price: '',
    server_id: '',
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

  const { data: plans = [] } = useQuery({
    queryKey: ['plans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('seller_id', user!.id)
        .eq('is_active', true)
        .order('price');
      if (error) throw error;
      return data as Plan[];
    },
    enabled: !!user?.id,
  });

  const { data: servers = [] } = useQuery({
    queryKey: ['servers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .eq('seller_id', user!.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ServerData[];
    },
    enabled: !!user?.id,
  });

  // Encrypt credentials before saving
  const encryptCredentials = async (login: string | null, password: string | null) => {
    try {
      const encryptedLogin = login ? await encrypt(login) : null;
      const encryptedPassword = password ? await encrypt(password) : null;
      return { login: encryptedLogin, password: encryptedPassword };
    } catch (error) {
      console.error('Encryption error:', error);
      // Fallback to plain text if encryption fails
      return { login, password };
    }
  };

  // Decrypt credentials for display
  const decryptCredentialsForClient = useCallback(async (clientId: string, encryptedLogin: string | null, encryptedPassword: string | null) => {
    if (decryptedCredentials[clientId]) {
      return decryptedCredentials[clientId];
    }

    setDecrypting(clientId);
    try {
      const decryptedLogin = encryptedLogin ? await decrypt(encryptedLogin) : '';
      const decryptedPassword = encryptedPassword ? await decrypt(encryptedPassword) : '';
      
      const result = { login: decryptedLogin, password: decryptedPassword };
      setDecryptedCredentials(prev => ({ ...prev, [clientId]: result }));
      return result;
    } catch (error) {
      console.error('Decryption error:', error);
      // If decryption fails, it might be plain text (old data)
      return { login: encryptedLogin || '', password: encryptedPassword || '' };
    } finally {
      setDecrypting(null);
    }
  }, [decrypt, decryptedCredentials]);

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; expiration_date: string; phone?: string | null; email?: string | null; device?: string | null; plan_id?: string | null; plan_name?: string | null; plan_price?: number | null; server_id?: string | null; server_name?: string | null; login?: string | null; password?: string | null; is_paid?: boolean; notes?: string | null }) => {
      // Encrypt login and password before saving
      const encrypted = await encryptCredentials(data.login || null, data.password || null);
      
      const { error } = await supabase.from('clients').insert([{
        ...data,
        login: encrypted.login,
        password: encrypted.password,
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
      // Encrypt login and password if they were changed
      let updateData = { ...data };
      if (data.login !== undefined || data.password !== undefined) {
        const encrypted = await encryptCredentials(data.login || null, data.password || null);
        updateData.login = encrypted.login;
        updateData.password = encrypted.password;
      }
      
      const { error } = await supabase.from('clients').update(updateData).eq('id', id);
      if (error) throw error;
      
      // Clear cached decrypted credentials for this client
      setDecryptedCredentials(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
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

  const renewMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const client = clients.find(c => c.id === id);
      if (!client) throw new Error('Cliente não encontrado');
      
      const baseDate = new Date(client.expiration_date);
      const newDate = isAfter(baseDate, new Date()) 
        ? addDays(baseDate, days) 
        : addDays(new Date(), days);
      
      const { error } = await supabase
        .from('clients')
        .update({ 
          expiration_date: format(newDate, 'yyyy-MM-dd'),
          is_paid: true 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente renovado com sucesso!');
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
      plan_id: '',
      plan_name: '',
      plan_price: '',
      server_id: '',
      server_name: '',
      login: '',
      password: '',
      is_paid: true,
      notes: '',
    });
  };

  const handlePlanChange = (planId: string) => {
    if (planId === 'manual') {
      setFormData({ ...formData, plan_id: '', plan_name: '', plan_price: '' });
      return;
    }
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const newExpDate = format(addDays(new Date(), plan.duration_days), 'yyyy-MM-dd');
      setFormData({
        ...formData,
        plan_id: plan.id,
        plan_name: plan.name,
        plan_price: plan.price.toString(),
        expiration_date: newExpDate,
      });
    }
  };

  const handleServerChange = (serverId: string) => {
    if (serverId === 'manual') {
      setFormData({ ...formData, server_id: '', server_name: '' });
      return;
    }
    const server = servers.find(s => s.id === serverId);
    if (server) {
      setFormData({
        ...formData,
        server_id: server.id,
        server_name: server.name,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      phone: formData.phone || null,
      email: formData.email || null,
      device: formData.device || null,
      expiration_date: formData.expiration_date,
      plan_id: formData.plan_id || null,
      plan_name: formData.plan_name || null,
      plan_price: formData.plan_price ? parseFloat(formData.plan_price) : null,
      server_id: formData.server_id || null,
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

  const handleEdit = async (client: Client) => {
    setEditingClient(client);
    
    // Decrypt credentials for editing
    let decryptedLogin = '';
    let decryptedPassword = '';
    
    if (client.login || client.password) {
      try {
        const decrypted = await decryptCredentialsForClient(client.id, client.login, client.password);
        decryptedLogin = decrypted.login;
        decryptedPassword = decrypted.password;
      } catch (error) {
        // Fallback to raw values (might be unencrypted old data)
        decryptedLogin = client.login || '';
        decryptedPassword = client.password || '';
      }
    }
    
    setFormData({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      device: client.device || '',
      expiration_date: client.expiration_date,
      plan_id: client.plan_id || '',
      plan_name: client.plan_name || '',
      plan_price: client.plan_price?.toString() || '',
      server_id: client.server_id || '',
      server_name: client.server_name || '',
      login: decryptedLogin,
      password: decryptedPassword,
      is_paid: client.is_paid,
      notes: client.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleRenew = (client: Client) => {
    const plan = plans.find(p => p.id === client.plan_id);
    const days = plan?.duration_days || 30;
    if (confirm(`Renovar ${client.name} por ${days} dias?`)) {
      renewMutation.mutate({ id: client.id, days });
    }
  };

  const handleShowPassword = async (client: Client) => {
    if (showPassword === client.id) {
      setShowPassword(null);
      return;
    }
    
    // Decrypt if not already decrypted
    if (!decryptedCredentials[client.id] && (client.login || client.password)) {
      await decryptCredentialsForClient(client.id, client.login, client.password);
    }
    
    setShowPassword(client.id);
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

                {/* Plan Select */}
                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select
                    value={formData.plan_id || 'manual'}
                    onValueChange={handlePlanChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Inserir manualmente</SelectItem>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - R$ {plan.price.toFixed(2)} ({plan.duration_days} dias)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Server Select */}
                <div className="space-y-2">
                  <Label>Servidor</Label>
                  <Select
                    value={formData.server_id || 'manual'}
                    onValueChange={handleServerChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um servidor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Inserir manualmente</SelectItem>
                      {servers.map((server) => (
                        <SelectItem key={server.id} value={server.id}>
                          {server.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Manual inputs if needed */}
                {!formData.plan_id && (
                  <>
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
                  </>
                )}

                {!formData.server_id && (
                  <div className="space-y-2">
                    <Label htmlFor="server_name">Nome do Servidor</Label>
                    <Input
                      id="server_name"
                      value={formData.server_name}
                      onChange={(e) => setFormData({ ...formData, server_name: e.target.value })}
                    />
                  </div>
                )}

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
                  <Label htmlFor="login" className="flex items-center gap-1">
                    Login
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
                  <Input
                    id="login"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-1">
                    Senha
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </Label>
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <span>Login e senha são criptografados antes de serem salvos.</span>
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
            const daysLeft = differenceInDays(new Date(client.expiration_date), today);
            const hasCredentials = client.login || client.password;
            const isDecrypted = decryptedCredentials[client.id];
            const isDecrypting = decrypting === client.id;
            
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
                        {statusLabels[status]} {daysLeft > 0 && status !== 'expired' && `(${daysLeft}d)`}
                      </span>
                    </div>
                    {!client.is_paid && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        Não Pago
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{format(new Date(client.expiration_date), "dd/MM/yyyy")}</span>
                    </div>
                    {client.plan_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{client.plan_name} {client.plan_price && `- R$ ${client.plan_price.toFixed(2)}`}</span>
                      </div>
                    )}
                    {hasCredentials && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        <span className="flex-1">
                          {showPassword === client.id && isDecrypted
                            ? isDecrypted.login || '(sem login)'
                            : '••••••'}
                        </span>
                        <button
                          onClick={() => handleShowPassword(client)}
                          className="ml-auto"
                          disabled={isDecrypting}
                        >
                          {isDecrypting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : showPassword === client.id ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                    {showPassword === client.id && isDecrypted && (
                      <div className="text-xs bg-muted p-2 rounded font-mono space-y-1">
                        {isDecrypted.login && <p>Login: {isDecrypted.login}</p>}
                        {isDecrypted.password && <p>Senha: {isDecrypted.password}</p>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRenew(client)}
                      title="Renovar"
                    >
                      <RefreshCw className="h-4 w-4 text-success" />
                    </Button>
                    {client.phone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setMessageClient(client)}
                        title="Enviar mensagem"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
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

      {/* Send Message Dialog */}
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
