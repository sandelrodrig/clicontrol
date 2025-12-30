import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCrypto } from '@/hooks/useCrypto';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
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
import { Plus, Search, Phone, Mail, Calendar as CalendarIcon, CreditCard, User, Trash2, Edit, Eye, EyeOff, MessageCircle, RefreshCw, Lock, Loader2, Monitor, Smartphone, Tv, Gamepad2, Laptop, Flame, ChevronDown, ExternalLink, AppWindow, Send } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format, addDays, addMonths, isBefore, isAfter, startOfToday, differenceInDays } from 'date-fns';
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
  premium_password: string | null;
  category: string | null;
  is_paid: boolean;
  notes: string | null;
  has_paid_apps: boolean | null;
  paid_apps_duration: string | null;
  paid_apps_expiration: string | null;
  telegram: string | null;
}

interface ClientCategory {
  id: string;
  name: string;
  seller_id: string;
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
  panel_url: string | null;
}

type FilterType = 'all' | 'active' | 'expiring' | 'expired' | 'unpaid';
type CategoryFilterType = 'all' | 'IPTV' | 'P2P' | 'Contas Premium' | 'SSH' | 'custom';

const DEFAULT_CATEGORIES = ['IPTV', 'P2P', 'Contas Premium', 'SSH'] as const;

const DEVICE_OPTIONS = [
  { value: 'Smart TV', label: 'Smart TV', icon: Tv },
  { value: 'Celular', label: 'Celular', icon: Smartphone },
  { value: 'TV Box', label: 'TV Box', icon: Monitor },
  { value: 'Video Game', label: 'Video Game', icon: Gamepad2 },
  { value: 'PC', label: 'PC', icon: Monitor },
  { value: 'Notebook', label: 'Notebook', icon: Laptop },
  { value: 'Fire Stick', label: 'Fire Stick', icon: Flame },
] as const;

export default function Clients() {
  const { user } = useAuth();
  const { encrypt, decrypt } = useCrypto();
  const { isPrivacyMode, maskData } = usePrivacyMode();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [messageClient, setMessageClient] = useState<Client | null>(null);
  const [decryptedCredentials, setDecryptedCredentials] = useState<DecryptedCredentials>({});
  const [decrypting, setDecrypting] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newCategoryName, setNewCategoryName] = useState('');

  // State for popovers inside the dialog
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [expirationPopoverOpen, setExpirationPopoverOpen] = useState(false);
  const [paidAppsExpirationPopoverOpen, setPaidAppsExpirationPopoverOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    telegram: '',
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
    premium_password: '',
    category: 'IPTV',
    is_paid: true,
    notes: '',
    has_paid_apps: false,
    paid_apps_duration: '',
    paid_apps_expiration: '',
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
    queryKey: ['servers-all', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select('id, name, is_active, panel_url')
        .eq('seller_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as ServerData[];
    },
    enabled: !!user?.id,
  });

  // Active servers for the form select
  const activeServers = servers.filter(s => s.is_active);

  const { data: customCategories = [] } = useQuery({
    queryKey: ['client-categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_categories')
        .select('*')
        .eq('seller_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as ClientCategory[];
    },
    enabled: !!user?.id,
  });

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)];

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
      telegram: '',
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
      premium_password: '',
      category: 'IPTV',
      is_paid: true,
      notes: '',
      has_paid_apps: false,
      paid_apps_duration: '',
      paid_apps_expiration: '',
    });
  };

  const handlePlanChange = (planId: string) => {
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

  const handlePaidAppsDurationChange = (duration: string) => {
    let daysToAdd = 30;
    switch (duration) {
      case '3_months':
        daysToAdd = 90;
        break;
      case '6_months':
        daysToAdd = 180;
        break;
      case '1_year':
        daysToAdd = 365;
        break;
    }
    const newExpDate = format(addDays(new Date(), daysToAdd), 'yyyy-MM-dd');
    setFormData({
      ...formData,
      paid_apps_duration: duration,
      paid_apps_expiration: newExpDate,
    });
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
    const data: Record<string, unknown> = {
      name: formData.name,
      phone: formData.phone || null,
      telegram: formData.telegram || null,
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
      premium_password: formData.premium_password || null,
      category: formData.category || 'IPTV',
      is_paid: formData.is_paid,
      notes: formData.notes || null,
      has_paid_apps: formData.has_paid_apps || false,
      paid_apps_duration: formData.paid_apps_duration || null,
      paid_apps_expiration: formData.paid_apps_expiration || null,
    };

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: data as Partial<Client> });
    } else {
      createMutation.mutate(data as Parameters<typeof createMutation.mutate>[0]);
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
      telegram: client.telegram || '',
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
      premium_password: client.premium_password || '',
      category: client.category || 'IPTV',
      is_paid: client.is_paid,
      notes: client.notes || '',
      has_paid_apps: client.has_paid_apps || false,
      paid_apps_duration: client.paid_apps_duration || '',
      paid_apps_expiration: client.paid_apps_expiration || '',
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

  const handleOpenPanel = (client: Client) => {
    // Find the server associated with this client
    const server = servers.find(s => s.id === client.server_id);
    if (server?.panel_url) {
      window.open(server.panel_url, '_blank');
    } else {
      toast.error('Este servidor não tem URL do painel configurada');
    }
  };

  const getClientServer = (client: Client) => {
    return servers.find(s => s.id === client.server_id);
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

    // Filter by category
    if (categoryFilter !== 'all' && client.category !== categoryFilter) {
      return false;
    }

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

  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('client_categories')
        .insert({ seller_id: user!.id, name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-categories'] });
      setNewCategoryName('');
      setAddCategoryOpen(false);
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Esta categoria já existe');
      } else {
        toast.error(error.message);
      }
    },
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
            setAddCategoryOpen(false);
            setExpirationPopoverOpen(false);
            setPaidAppsExpirationPopoverOpen(false);
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
                {/* Category Select with Add Button */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Categoria *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Popover open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="end">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Nova Categoria</Label>
                          <Input
                            placeholder="Nome da categoria"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newCategoryName.trim()) {
                                e.preventDefault();
                                addCategoryMutation.mutate(newCategoryName.trim());
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              if (newCategoryName.trim()) {
                                addCategoryMutation.mutate(newCategoryName.trim());
                              }
                            }}
                            disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
                          >
                            {addCategoryMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            Adicionar
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

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
                  <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+55 11 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram" className="flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    Telegram
                  </Label>
                  <Input
                    id="telegram"
                    value={formData.telegram}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                    placeholder="@usuario"
                  />
                </div>

                {/* Premium Account Fields - Only show for Contas Premium category */}
                {formData.category === 'Contas Premium' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Conta Premium)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@premium.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="premium_password">Senha da Conta Premium</Label>
                      <Input
                        id="premium_password"
                        type="password"
                        value={formData.premium_password}
                        onChange={(e) => setFormData({ ...formData, premium_password: e.target.value })}
                        placeholder="Senha da conta premium"
                      />
                    </div>
                  </>
                )}
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Dispositivos</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                        type="button"
                      >
                        {formData.device 
                          ? formData.device.split(', ').length > 2 
                            ? `${formData.device.split(', ').slice(0, 2).join(', ')} +${formData.device.split(', ').length - 2}`
                            : formData.device
                          : 'Selecione os dispositivos'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-2">
                        {DEVICE_OPTIONS.map((device) => {
                          const isSelected = formData.device.split(', ').includes(device.value);
                          return (
                            <label
                              key={device.value}
                              className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentDevices = formData.device ? formData.device.split(', ').filter(Boolean) : [];
                                  let newDevices: string[];
                                  
                                  if (checked) {
                                    newDevices = [...currentDevices, device.value];
                                  } else {
                                    newDevices = currentDevices.filter(d => d !== device.value);
                                  }
                                  
                                  setFormData({ ...formData, device: newDevices.join(', ') });
                                }}
                              />
                              <device.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{device.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Plan Select - Not for Contas Premium */}
                {formData.category !== 'Contas Premium' && (
                  <div className="space-y-2">
                    <Label>Plano</Label>
                    <Select
                      value={formData.plan_id || ''}
                      onValueChange={handlePlanChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            Nenhum plano cadastrado
                          </div>
                        ) : (
                          plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - R$ {plan.price.toFixed(2)} ({plan.duration_days} dias)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Server Select - Only for IPTV/SSH/P2P, not for Contas Premium */}
                {formData.category !== 'Contas Premium' && (
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
                        <SelectItem value="manual">Nenhum</SelectItem>
                        {activeServers.map((server) => (
                          <SelectItem key={server.id} value={server.id}>
                            {server.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}


                {/* Expiration Date with adjustment buttons and calendar */}
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <div className="flex items-center gap-2">
                    <Popover
                      open={expirationPopoverOpen}
                      onOpenChange={setExpirationPopoverOpen}
                      modal={false}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className="flex-1 justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expiration_date 
                            ? format(new Date(formData.expiration_date), "dd/MM/yyyy", { locale: ptBR })
                            : "Selecione um plano"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={5}>
                        <CalendarPicker
                          mode="single"
                          selected={formData.expiration_date ? new Date(formData.expiration_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({ ...formData, expiration_date: format(date, "yyyy-MM-dd") });
                              setExpirationPopoverOpen(false);
                            }
                          }}
                          initialFocus
                          locale={ptBR}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDate = new Date(formData.expiration_date);
                        setFormData({ ...formData, expiration_date: format(addDays(currentDate, -1), 'yyyy-MM-dd') });
                      }}
                    >
                      -1 dia
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDate = new Date(formData.expiration_date);
                        setFormData({ ...formData, expiration_date: format(addDays(currentDate, 1), 'yyyy-MM-dd') });
                      }}
                    >
                      +1 dia
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDate = new Date(formData.expiration_date);
                        setFormData({ ...formData, expiration_date: format(addMonths(currentDate, -1), 'yyyy-MM-dd') });
                      }}
                    >
                      -1 mês
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDate = new Date(formData.expiration_date);
                        setFormData({ ...formData, expiration_date: format(addMonths(currentDate, 1), 'yyyy-MM-dd') });
                      }}
                    >
                      +1 mês
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Calculada pelo plano. Clique na data ou use os botões para ajustar.
                  </p>
                </div>

                {/* IPTV/SSH Login and Password - Only show for IPTV, P2P, or SSH categories */}
                {(formData.category === 'IPTV' || formData.category === 'P2P' || formData.category === 'SSH') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="login" className="flex items-center gap-1">
                        Login (IPTV/SSH)
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
                        Senha (IPTV/SSH)
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </Label>
                      <Input
                        id="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </>
                )}

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
              {/* Paid Apps Section */}
              <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AppWindow className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="has_paid_apps" className="cursor-pointer">Apps Pagos</Label>
                  </div>
                  <Switch
                    id="has_paid_apps"
                    checked={formData.has_paid_apps}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_paid_apps: checked, paid_apps_duration: '', paid_apps_expiration: '' })}
                  />
                </div>
                
                {formData.has_paid_apps && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>Duração do App</Label>
                      <Select
                        value={formData.paid_apps_duration}
                        onValueChange={handlePaidAppsDurationChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a duração" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3_months">3 Meses</SelectItem>
                          <SelectItem value="6_months">6 Meses</SelectItem>
                          <SelectItem value="1_year">1 Ano</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Vencimento do App</Label>
                      <Popover
                        open={paidAppsExpirationPopoverOpen}
                        onOpenChange={setPaidAppsExpirationPopoverOpen}
                        modal={false}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !formData.paid_apps_expiration && "text-muted-foreground"
                            )}
                            type="button"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.paid_apps_expiration 
                              ? format(new Date(formData.paid_apps_expiration), "dd/MM/yyyy", { locale: ptBR })
                              : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={5}>
                          <CalendarPicker
                            mode="single"
                            selected={formData.paid_apps_expiration ? new Date(formData.paid_apps_expiration) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setFormData({ ...formData, paid_apps_expiration: format(date, "yyyy-MM-dd") });
                                setPaidAppsExpirationPopoverOpen(false);
                              }
                            }}
                            initialFocus
                            locale={ptBR}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="E-mail, senhas, MAC de apps, informações adicionais..."
                  className="min-h-[100px] resize-y"
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
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Category Filter Tabs */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Filtrar por Categoria</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('all')}
            >
              Todos ({clients.length})
            </Button>
            {allCategories.map((cat) => {
              const count = clients.filter(c => c.category === cat).length;
              return (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="w-full">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">Todos</TabsTrigger>
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
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{maskData(client.name, 'name')}</h3>
                      <div className="flex flex-wrap gap-1">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', statusBadges[status])}>
                          {statusLabels[status]} {daysLeft > 0 && status !== 'expired' && `(${daysLeft}d)`}
                        </span>
                        {client.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {client.category}
                          </span>
                        )}
                      </div>
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
                        <span>{maskData(client.phone, 'phone')}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{maskData(client.email, 'email')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      <span>{format(new Date(client.expiration_date), "dd/MM/yyyy")}</span>
                    </div>
                    {client.plan_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{client.plan_name} {client.plan_price && `- ${maskData(`R$ ${client.plan_price.toFixed(2)}`, 'money')}`}</span>
                      </div>
                    )}
                    {hasCredentials && !isPrivacyMode && (
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
                    {hasCredentials && isPrivacyMode && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        <span>●●●●●● (oculto)</span>
                      </div>
                    )}
                    {showPassword === client.id && isDecrypted && !isPrivacyMode && (
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
                    {/* Open Panel Button */}
                    {client.server_id && getClientServer(client)?.panel_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenPanel(client)}
                        title="Abrir Painel"
                      >
                        <ExternalLink className="h-4 w-4 text-primary" />
                      </Button>
                    )}
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
