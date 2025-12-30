import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { Plus, Tv, Wifi, DollarSign, Users, Edit, Trash2, Eye, EyeOff, UserPlus, Search, Check, ExternalLink, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SharedPanel {
  id: string;
  name: string;
  panel_type: string;
  total_slots: number;
  used_slots: number;
  monthly_cost: number;
  login: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
  is_active: boolean;
  expires_at: string | null;
  iptv_per_credit: number;
  p2p_per_credit: number;
  used_iptv_slots: number;
  used_p2p_slots: number;
}

interface Client {
  id: string;
  name: string;
  login: string | null;
  password: string | null;
}

interface PanelClient {
  id: string;
  panel_id: string;
  client_id: string;
  assigned_at: string;
  slot_type: string;
}

interface ServerData {
  id: string;
  name: string;
  panel_url: string | null;
  is_active: boolean;
}

type PanelTypeFilter = 'all' | 'iptv' | 'p2p' | 'iptv_p2p';

export default function SharedPanels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<SharedPanel | null>(null);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<SharedPanel | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<PanelTypeFilter>('all');
  const [viewClientsPanel, setViewClientsPanel] = useState<SharedPanel | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedSlotType, setSelectedSlotType] = useState<'iptv' | 'p2p'>('iptv');

  const [formData, setFormData] = useState({
    name: '',
    panel_type: 'iptv',
    total_slots: '1',
    monthly_cost: '',
    login: '',
    password: '',
    url: '',
    notes: '',
    is_active: true,
    expires_at: '',
    iptv_per_credit: '1',
    p2p_per_credit: '0',
  });

  const { data: panels = [], isLoading } = useQuery({
    queryKey: ['shared-panels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_panels')
        .select('*')
        .eq('seller_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as SharedPanel[];
    },
    enabled: !!user?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-panels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, login, password')
        .eq('seller_id', user!.id)
        .eq('is_archived', false)
        .order('name');
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user?.id,
  });

  const { data: panelClients = [] } = useQuery({
    queryKey: ['panel-clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_clients')
        .select('*')
        .eq('seller_id', user!.id);
      if (error) throw error;
      return data as PanelClient[];
    },
    enabled: !!user?.id,
  });

  // Fetch servers with panel URLs
  const { data: servers = [] } = useQuery({
    queryKey: ['servers-with-urls', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select('id, name, panel_url, is_active')
        .eq('seller_id', user!.id)
        .not('panel_url', 'is', null)
        .order('name');
      if (error) throw error;
      return data as ServerData[];
    },
    enabled: !!user?.id,
  });

  const serversWithUrl = servers.filter(s => s.panel_url && s.panel_url.trim() !== '');

  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      panel_type: string; 
      total_slots: number;
      monthly_cost: number; 
      login: string | null; 
      password: string | null; 
      url: string | null; 
      notes: string | null; 
      is_active: boolean; 
      expires_at: string | null;
      iptv_per_credit: number;
      p2p_per_credit: number;
    }) => {
      const { error } = await supabase.from('shared_panels').insert([{
        ...data,
        seller_id: user!.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-panels'] });
      toast.success('Painel criado com sucesso!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SharedPanel> }) => {
      const { error } = await supabase.from('shared_panels').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-panels'] });
      toast.success('Painel atualizado!');
      resetForm();
      setIsDialogOpen(false);
      setEditingPanel(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shared_panels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-panels'] });
      toast.success('Painel excluído!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const assignClientMutation = useMutation({
    mutationFn: async ({ panel_id, client_id, slot_type }: { panel_id: string; client_id: string; slot_type: string }) => {
      const { error } = await supabase.from('panel_clients').insert([{
        panel_id,
        client_id,
        seller_id: user!.id,
        slot_type,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-clients'] });
      queryClient.invalidateQueries({ queryKey: ['shared-panels'] });
      toast.success('Cliente atribuído ao painel!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('panel_clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-clients'] });
      queryClient.invalidateQueries({ queryKey: ['shared-panels'] });
      toast.success('Cliente removido do painel!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      panel_type: 'iptv',
      total_slots: '1',
      monthly_cost: '',
      login: '',
      password: '',
      url: '',
      notes: '',
      is_active: true,
      expires_at: '',
      iptv_per_credit: '1',
      p2p_per_credit: '0',
    });
  };

  const handlePanelTypeChange = (value: string) => {
    setFormData({ 
      ...formData, 
      panel_type: value,
      iptv_per_credit: value === 'p2p' ? '0' : '1',
      p2p_per_credit: value === 'iptv' ? '0' : '1',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      panel_type: formData.panel_type,
      total_slots: parseInt(formData.total_slots) || 1,
      monthly_cost: parseFloat(formData.monthly_cost) || 0,
      login: formData.login || null,
      password: formData.password || null,
      url: formData.url || null,
      notes: formData.notes || null,
      is_active: formData.is_active,
      expires_at: formData.expires_at || null,
      iptv_per_credit: parseInt(formData.iptv_per_credit) || 0,
      p2p_per_credit: parseInt(formData.p2p_per_credit) || 0,
    };

    if (editingPanel) {
      updateMutation.mutate({ id: editingPanel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (panel: SharedPanel) => {
    setEditingPanel(panel);
    setFormData({
      name: panel.name,
      panel_type: panel.panel_type,
      total_slots: panel.total_slots > 0 ? panel.total_slots.toString() : '',
      monthly_cost: panel.monthly_cost > 0 ? panel.monthly_cost.toString() : '',
      login: panel.login || '',
      password: panel.password || '',
      url: panel.url || '',
      notes: panel.notes || '',
      is_active: panel.is_active,
      expires_at: panel.expires_at || '',
      iptv_per_credit: panel.iptv_per_credit > 0 ? panel.iptv_per_credit.toString() : '',
      p2p_per_credit: panel.p2p_per_credit > 0 ? panel.p2p_per_credit.toString() : '',
    });
    setIsDialogOpen(true);
  };

  const getPanelClients = (panelId: string) => {
    const clientIds = panelClients.filter(pc => pc.panel_id === panelId).map(pc => pc.client_id);
    return clients.filter(c => clientIds.includes(c.id));
  };

  const getPanelClientsWithSlotType = (panelId: string) => {
    return panelClients
      .filter(pc => pc.panel_id === panelId)
      .map(pc => {
        const client = clients.find(c => c.id === pc.client_id);
        return { ...pc, client };
      })
      .filter(pc => pc.client);
  };

  const getAvailableClients = (panelId: string, searchQuery: string = '') => {
    const assignedClientIds = panelClients.filter(pc => pc.panel_id === panelId).map(pc => pc.client_id);
    return clients.filter(c => {
      if (assignedClientIds.includes(c.id)) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(query) ||
        (c.login && c.login.toLowerCase().includes(query)) ||
        (c.password && c.password.toLowerCase().includes(query))
      );
    });
  };

  const getPanelClientRecord = (panelId: string, clientId: string) => {
    return panelClients.find(pc => pc.panel_id === panelId && pc.client_id === clientId);
  };

  // Calculate available slots for a panel
  const getAvailableSlots = (panel: SharedPanel) => {
    const totalIptv = panel.total_slots * (panel.iptv_per_credit || 0);
    const totalP2p = panel.total_slots * (panel.p2p_per_credit || 0);
    const usedIptv = panel.used_iptv_slots || 0;
    const usedP2p = panel.used_p2p_slots || 0;
    return {
      iptv: { total: totalIptv, used: usedIptv, available: totalIptv - usedIptv },
      p2p: { total: totalP2p, used: usedP2p, available: totalP2p - usedP2p },
    };
  };

  // Check if panel is truly full
  const isPanelFull = (panel: SharedPanel) => {
    const slots = getAvailableSlots(panel);
    return slots.iptv.available <= 0 && slots.p2p.available <= 0;
  };

  // Get full panels (where all slots are used)
  const fullPanels = panels.filter(isPanelFull);

  // Get panel type label
  const getPanelTypeLabel = (panel: SharedPanel | null) => {
    if (!panel) return '';
    if ((panel.iptv_per_credit || 0) > 0 && (panel.p2p_per_credit || 0) > 0) {
      return `${panel.iptv_per_credit} IPTV + ${panel.p2p_per_credit} P2P`;
    } else if ((panel.iptv_per_credit || 0) > 0) {
      return `${panel.iptv_per_credit} IPTV`;
    } else if ((panel.p2p_per_credit || 0) > 0) {
      return `${panel.p2p_per_credit} P2P`;
    }
    return panel.panel_type?.toUpperCase() || 'PAINEL';
  };

  // Filter panels
  const filteredPanels = panels.filter(panel => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      panel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPanelClients(panel.id).some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Type filter
    if (typeFilter === 'all') return true;
    if (typeFilter === 'iptv') return panel.iptv_per_credit > 0 && panel.p2p_per_credit === 0;
    if (typeFilter === 'p2p') return panel.p2p_per_credit > 0 && panel.iptv_per_credit === 0;
    if (typeFilter === 'iptv_p2p') return panel.iptv_per_credit > 0 && panel.p2p_per_credit > 0;
    
    return true;
  });

  // Separate active and full panels
  const activePanels = filteredPanels.filter(p => !isPanelFull(p));
  const completedPanels = filteredPanels.filter(isPanelFull);

  const totalMonthlyCost = panels.reduce((sum, p) => sum + p.monthly_cost, 0);
  const totalSlots = panels.reduce((sum, p) => sum + p.total_slots, 0);
  const usedSlots = panels.reduce((sum, p) => sum + p.used_slots, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Créditos Compartilhados</h1>
          <p className="text-muted-foreground">Gerencie painéis IPTV e P2P com slots compartilhados</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open && (createMutation.isPending || updateMutation.isPending)) {
            return;
          }
          setIsDialogOpen(open);
          if (!open) {
            setEditingPanel(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Painel
            </Button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-lg"
            onPointerDownOutside={(e) => {
              if (createMutation.isPending || updateMutation.isPending) {
                e.preventDefault();
              }
            }}
            onEscapeKeyDown={(e) => {
              if (createMutation.isPending || updateMutation.isPending) {
                e.preventDefault();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>{editingPanel ? 'Editar Painel' : 'Novo Painel'}</DialogTitle>
              <DialogDescription>
                Configure um painel compartilhado com múltiplos slots
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Painel Principal"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.panel_type}
                    onValueChange={handlePanelTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iptv">Apenas IPTV</SelectItem>
                      <SelectItem value="p2p">Apenas P2P</SelectItem>
                      <SelectItem value="iptv_p2p">IPTV + P2P</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Credit configuration */}
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
                <Label className="font-medium">Configuração por Crédito</Label>
                <div className="grid grid-cols-2 gap-4">
                  {(formData.panel_type === 'iptv' || formData.panel_type === 'iptv_p2p') && (
                    <div className="space-y-2">
                      <Label htmlFor="iptv_per_credit" className="text-sm flex items-center gap-2">
                        <Tv className="h-4 w-4 text-primary" />
                        Telas IPTV por crédito
                      </Label>
                      <Input
                        id="iptv_per_credit"
                        type="number"
                        min="0"
                        value={formData.iptv_per_credit}
                        onChange={(e) => setFormData({ ...formData, iptv_per_credit: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  )}
                  {(formData.panel_type === 'p2p' || formData.panel_type === 'iptv_p2p') && (
                    <div className="space-y-2">
                      <Label htmlFor="p2p_per_credit" className="text-sm flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-success" />
                        Telas P2P por crédito
                      </Label>
                      <Input
                        id="p2p_per_credit"
                        type="number"
                        min="0"
                        value={formData.p2p_per_credit}
                        onChange={(e) => setFormData({ ...formData, p2p_per_credit: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ex: 2 IPTV + 1 P2P significa que cada crédito dá direito a 2 telas IPTV e 1 tela P2P
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_slots">Total de Créditos *</Label>
                  <Input
                    id="total_slots"
                    type="number"
                    min="1"
                    value={formData.total_slots}
                    onChange={(e) => setFormData({ ...formData, total_slots: e.target.value })}
                    placeholder="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_cost">Custo Mensal (R$)</Label>
                  <Input
                    id="monthly_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthly_cost}
                    onChange={(e) => setFormData({ ...formData, monthly_cost: e.target.value })}
                    placeholder="Ex: 100.00"
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
                {/* Server selection for URL */}
                {serversWithUrl.length > 0 && (
                  <div className="col-span-2 space-y-2">
                    <Label className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Usar URL de Servidor Existente
                    </Label>
                    <Select
                      value=""
                      onValueChange={(serverId) => {
                        const server = serversWithUrl.find(s => s.id === serverId);
                        if (server?.panel_url) {
                          setFormData({ ...formData, url: server.panel_url });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um servidor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {serversWithUrl.map((server) => (
                          <SelectItem key={server.id} value={server.id}>
                            <div className="flex items-center gap-2">
                              <span>{server.name}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {server.panel_url}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Ou digite uma URL manualmente abaixo
                    </p>
                  </div>
                )}
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="url">URL do Painel</Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Vencimento</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Ativo</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
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
                  {editingPanel ? 'Salvar' : 'Criar Painel'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">R$ {totalMonthlyCost.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Créditos Utilizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{usedSlots} / {totalSlots}</span>
            </div>
            <Progress value={totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Painéis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Tv className="h-5 w-5 text-success" />
                <span className="text-lg font-bold">{activePanels.length} ativos</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-bold text-muted-foreground">{completedPanels.length} completos</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do painel ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as PanelTypeFilter)}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="iptv">IPTV</TabsTrigger>
            <TabsTrigger value="p2p">P2P</TabsTrigger>
            <TabsTrigger value="iptv_p2p">IPTV+P2P</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Active Panels */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : panels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tv className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum painel cadastrado</h3>
            <p className="text-muted-foreground text-center">
              Crie seu primeiro painel compartilhado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Panels Section */}
          {activePanels.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Painéis com Vagas ({activePanels.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activePanels.map((panel) => (
                  <PanelCard 
                    key={panel.id} 
                    panel={panel}
                    panelClients={getPanelClients(panel.id)}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    onEdit={handleEdit}
                    onDelete={(id) => {
                      if (confirm('Tem certeza que deseja excluir este painel?')) {
                        deleteMutation.mutate(id);
                      }
                    }}
                    onAssign={() => {
                      setSelectedPanel(panel);
                      setAssignDialogOpen(true);
                    }}
                    onViewClients={() => setViewClientsPanel(panel)}
                    getPanelTypeLabel={getPanelTypeLabel}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Panels Section */}
          {completedPanels.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                Painéis Completos ({completedPanels.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedPanels.map((panel) => (
                  <PanelCard 
                    key={panel.id} 
                    panel={panel}
                    panelClients={getPanelClients(panel.id)}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    onEdit={handleEdit}
                    onDelete={(id) => {
                      if (confirm('Tem certeza que deseja excluir este painel?')) {
                        deleteMutation.mutate(id);
                      }
                    }}
                    onAssign={() => {
                      setSelectedPanel(panel);
                      setAssignDialogOpen(true);
                    }}
                    onViewClients={() => setViewClientsPanel(panel)}
                    getPanelTypeLabel={getPanelTypeLabel}
                    isCompleted
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Client Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => {
        setAssignDialogOpen(open);
        if (!open) {
          setClientSearchTerm('');
          setSelectedSlotType('iptv');
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Cliente</DialogTitle>
            <DialogDescription>
              Adicione clientes ao painel {selectedPanel?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedPanel && (
            <div className="space-y-4">
              {/* Slot availability info */}
              {(() => {
                const slots = getAvailableSlots(selectedPanel);
                return (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-sm font-medium">Vagas disponíveis:</p>
                    <div className="flex gap-4">
                      {selectedPanel.iptv_per_credit > 0 && (
                        <div className="flex items-center gap-2">
                          <Tv className="h-4 w-4 text-primary" />
                          <span className={cn(
                            "text-sm",
                            slots.iptv.available <= 0 && "text-destructive"
                          )}>
                            IPTV: {slots.iptv.used}/{slots.iptv.total}
                          </span>
                        </div>
                      )}
                      {selectedPanel.p2p_per_credit > 0 && (
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4 text-success" />
                          <span className={cn(
                            "text-sm",
                            slots.p2p.available <= 0 && "text-destructive"
                          )}>
                            P2P: {slots.p2p.used}/{slots.p2p.total}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Slot type selector */}
              {selectedPanel.iptv_per_credit > 0 && selectedPanel.p2p_per_credit > 0 && (
                <div className="space-y-2">
                  <Label>Tipo de vaga</Label>
                  <Select value={selectedSlotType} onValueChange={(v) => setSelectedSlotType(v as 'iptv' | 'p2p')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iptv" disabled={getAvailableSlots(selectedPanel).iptv.available <= 0}>
                        <div className="flex items-center gap-2">
                          <Tv className="h-4 w-4" />
                          IPTV ({getAvailableSlots(selectedPanel).iptv.available} vagas)
                        </div>
                      </SelectItem>
                      <SelectItem value="p2p" disabled={getAvailableSlots(selectedPanel).p2p.available <= 0}>
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4" />
                          P2P ({getAvailableSlots(selectedPanel).p2p.available} vagas)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, usuário ou senha..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Client list */}
              {getAvailableClients(selectedPanel.id, clientSearchTerm).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {clientSearchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente disponível'}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {getAvailableClients(selectedPanel.id, clientSearchTerm).map((client) => {
                    const slotType = selectedPanel.iptv_per_credit > 0 && selectedPanel.p2p_per_credit === 0 
                      ? 'iptv' 
                      : selectedPanel.p2p_per_credit > 0 && selectedPanel.iptv_per_credit === 0
                        ? 'p2p'
                        : selectedSlotType;
                    const slots = getAvailableSlots(selectedPanel);
                    const canAssign = slotType === 'iptv' ? slots.iptv.available > 0 : slots.p2p.available > 0;
                    
                    return (
                      <Button
                        key={client.id}
                        variant="outline"
                        className="w-full justify-start flex-col items-start h-auto py-2"
                        disabled={!canAssign}
                        onClick={() => {
                          assignClientMutation.mutate({
                            panel_id: selectedPanel.id,
                            client_id: client.id,
                            slot_type: slotType,
                          });
                        }}
                      >
                        <span className="font-medium">{client.name}</span>
                        {(client.login || client.password) && (
                          <span className="text-xs text-muted-foreground">
                            {client.login && `Usuário: ${client.login}`}
                            {client.login && client.password && ' | '}
                            {client.password && `Senha: ${client.password}`}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Clients Dialog */}
      <Dialog open={!!viewClientsPanel} onOpenChange={() => {
        setViewClientsPanel(null);
        setClientSearchTerm('');
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clientes do Painel</DialogTitle>
            <DialogDescription>
              {viewClientsPanel?.name} - {viewClientsPanel && getPanelTypeLabel(viewClientsPanel)}
            </DialogDescription>
          </DialogHeader>
          {viewClientsPanel && (
            <div className="space-y-4">
              {/* Slot usage info */}
              {(() => {
                const slots = getAvailableSlots(viewClientsPanel);
                return (
                  <div className="p-3 rounded-lg bg-muted/50 flex gap-4">
                    {viewClientsPanel.iptv_per_credit > 0 && (
                      <div className="flex items-center gap-2">
                        <Tv className="h-4 w-4 text-primary" />
                        <span className="text-sm">IPTV: {slots.iptv.used}/{slots.iptv.total}</span>
                      </div>
                    )}
                    {viewClientsPanel.p2p_per_credit > 0 && (
                      <div className="flex items-center gap-2">
                        <Wifi className="h-4 w-4 text-success" />
                        <span className="text-sm">P2P: {slots.p2p.used}/{slots.p2p.total}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Client list */}
              {getPanelClientsWithSlotType(viewClientsPanel.id).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum cliente atribuído a este painel
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {getPanelClientsWithSlotType(viewClientsPanel.id)
                    .filter(pc => {
                      if (!clientSearchTerm) return true;
                      const query = clientSearchTerm.toLowerCase();
                      return (
                        pc.client?.name.toLowerCase().includes(query) ||
                        (pc.client?.login && pc.client.login.toLowerCase().includes(query)) ||
                        (pc.client?.password && pc.client.password.toLowerCase().includes(query))
                      );
                    })
                    .map((pc) => (
                      <div
                        key={pc.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pc.client?.name}</span>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              pc.slot_type === 'iptv' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                            )}>
                              {pc.slot_type.toUpperCase()}
                            </span>
                          </div>
                          {(pc.client?.login || pc.client?.password) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {pc.client.login && `Usuário: ${pc.client.login}`}
                              {pc.client.login && pc.client.password && ' | '}
                              {pc.client.password && `Senha: ${pc.client.password}`}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remover ${pc.client?.name} deste painel?`)) {
                              removeClientMutation.mutate(pc.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Panel Card Component
function PanelCard({ 
  panel, 
  panelClients, 
  showPassword, 
  setShowPassword, 
  onEdit, 
  onDelete, 
  onAssign,
  onViewClients,
  getPanelTypeLabel,
  isCompleted = false 
}: {
  panel: SharedPanel;
  panelClients: Client[];
  showPassword: string | null;
  setShowPassword: (id: string | null) => void;
  onEdit: (panel: SharedPanel) => void;
  onDelete: (id: string) => void;
  onAssign: () => void;
  onViewClients: () => void;
  getPanelTypeLabel: (panel: SharedPanel) => string;
  isCompleted?: boolean;
}) {
  // Calculate available slots based on individual IPTV and P2P usage
  const totalIptvSlots = panel.total_slots * (panel.iptv_per_credit || 0);
  const totalP2pSlots = panel.total_slots * (panel.p2p_per_credit || 0);
  const availableIptv = totalIptvSlots - (panel.used_iptv_slots || 0);
  const availableP2p = totalP2pSlots - (panel.used_p2p_slots || 0);
  const hasAvailableSlots = availableIptv > 0 || availableP2p > 0;
  
  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-lg animate-slide-up',
        !panel.is_active && 'opacity-60',
        isCompleted && 'border-success/50 bg-success/5'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {panel.iptv_per_credit > 0 && panel.p2p_per_credit > 0 ? (
              <div className="flex">
                <Tv className="h-5 w-5 text-primary" />
                <Wifi className="h-5 w-5 text-success -ml-1" />
              </div>
            ) : panel.iptv_per_credit > 0 ? (
              <Tv className="h-5 w-5 text-primary" />
            ) : (
              <Wifi className="h-5 w-5 text-success" />
            )}
            <CardTitle className="text-lg">{panel.name}</CardTitle>
          </div>
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isCompleted ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
          )}>
            {getPanelTypeLabel(panel)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-4">
          {/* Individual slot tracking */}
          <div className="space-y-2">
            {panel.iptv_per_credit > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Tv className="h-3 w-3" /> IPTV
                  </span>
                  <span className={cn(
                    'font-medium text-xs',
                    (panel.used_iptv_slots || 0) >= panel.total_slots * panel.iptv_per_credit 
                      ? 'text-success' 
                      : 'text-primary'
                  )}>
                    {panel.used_iptv_slots || 0} / {panel.total_slots * panel.iptv_per_credit}
                  </span>
                </div>
                <Progress 
                  value={((panel.used_iptv_slots || 0) / (panel.total_slots * panel.iptv_per_credit)) * 100} 
                  className="h-1.5"
                />
              </div>
            )}
            {panel.p2p_per_credit > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Wifi className="h-3 w-3" /> P2P
                  </span>
                  <span className={cn(
                    'font-medium text-xs',
                    (panel.used_p2p_slots || 0) >= panel.total_slots * panel.p2p_per_credit 
                      ? 'text-success' 
                      : 'text-success/70'
                  )}>
                    {panel.used_p2p_slots || 0} / {panel.total_slots * panel.p2p_per_credit}
                  </span>
                </div>
                <Progress 
                  value={((panel.used_p2p_slots || 0) / (panel.total_slots * panel.p2p_per_credit)) * 100} 
                  className="h-1.5 [&>div]:bg-success"
                />
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {panel.total_slots} crédito{panel.total_slots !== 1 ? 's' : ''} • {panelClients.length} cliente{panelClients.length !== 1 ? 's' : ''}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>R$ {panel.monthly_cost.toFixed(2)}/mês</span>
          </div>

          {panel.login && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Login: {panel.login}</span>
              <button onClick={() => setShowPassword(showPassword === panel.id ? null : panel.id)}>
                {showPassword === panel.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
          {showPassword === panel.id && panel.password && (
            <div className="text-xs bg-muted p-2 rounded font-mono">
              Senha: {panel.password}
            </div>
          )}

          {panelClients.length > 0 && (
            <button 
              onClick={onViewClients}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              <p className="font-medium mb-1">Clientes ({panelClients.length}):</p>
              <div className="flex flex-wrap gap-1">
                {panelClients.slice(0, 3).map(c => (
                  <span key={c.id} className="bg-muted px-1.5 py-0.5 rounded">
                    {c.name}
                  </span>
                ))}
                {panelClients.length > 3 && (
                  <span className="bg-muted px-1.5 py-0.5 rounded">
                    +{panelClients.length - 3}
                  </span>
                )}
              </div>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-border">
          {!isCompleted && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={!hasAvailableSlots}
              onClick={onAssign}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Atribuir
            </Button>
          )}
          {panel.url && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(panel.url!, '_blank')}
              title="Abrir Painel"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => onEdit(panel)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => onDelete(panel.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}