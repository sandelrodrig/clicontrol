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
import { Plus, Tv, Wifi, DollarSign, Users, Edit, Trash2, Eye, EyeOff, UserPlus } from 'lucide-react';
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
}

interface Client {
  id: string;
  name: string;
}

interface PanelClient {
  id: string;
  panel_id: string;
  client_id: string;
  assigned_at: string;
}

export default function SharedPanels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<SharedPanel | null>(null);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<SharedPanel | null>(null);

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
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('seller_id', user!.id)
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

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; panel_type: string; total_slots: number; monthly_cost: number; login: string | null; password: string | null; url: string | null; notes: string | null; is_active: boolean; expires_at: string | null }) => {
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
    mutationFn: async ({ panel_id, client_id }: { panel_id: string; client_id: string }) => {
      const { error } = await supabase.from('panel_clients').insert([{
        panel_id,
        client_id,
        seller_id: user!.id,
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
      total_slots: panel.total_slots.toString(),
      monthly_cost: panel.monthly_cost.toString(),
      login: panel.login || '',
      password: panel.password || '',
      url: panel.url || '',
      notes: panel.notes || '',
      is_active: panel.is_active,
      expires_at: panel.expires_at || '',
    });
    setIsDialogOpen(true);
  };

  const getPanelClients = (panelId: string) => {
    const clientIds = panelClients.filter(pc => pc.panel_id === panelId).map(pc => pc.client_id);
    return clients.filter(c => clientIds.includes(c.id));
  };

  const getAvailableClients = (panelId: string) => {
    const assignedClientIds = panelClients.filter(pc => pc.panel_id === panelId).map(pc => pc.client_id);
    return clients.filter(c => !assignedClientIds.includes(c.id));
  };

  const totalMonthlyCost = panels.reduce((sum, p) => sum + p.monthly_cost, 0);
  const totalSlots = panels.reduce((sum, p) => sum + p.total_slots, 0);
  const usedSlots = panels.reduce((sum, p) => sum + p.used_slots, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Créditos Compartilhados</h1>
          <p className="text-muted-foreground">Gerencie painéis P2P e IPTV com slots compartilhados</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
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
          <DialogContent>
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
                    onValueChange={(v) => setFormData({ ...formData, panel_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iptv">IPTV</SelectItem>
                      <SelectItem value="p2p">P2P</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_slots">Total de Slots *</Label>
                  <Input
                    id="total_slots"
                    type="number"
                    min="1"
                    value={formData.total_slots}
                    onChange={(e) => setFormData({ ...formData, total_slots: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_cost">Custo Mensal (R$)</Label>
                  <Input
                    id="monthly_cost"
                    type="number"
                    step="0.01"
                    value={formData.monthly_cost}
                    onChange={(e) => setFormData({ ...formData, monthly_cost: e.target.value })}
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Slots Utilizados</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Painéis Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Tv className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">{panels.filter(p => p.is_active).length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panels Grid */}
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {panels.map((panel) => {
            const panelClientsList = getPanelClients(panel.id);
            const slotsAvailable = panel.total_slots - panel.used_slots;
            
            return (
              <Card
                key={panel.id}
                className={cn(
                  'transition-all duration-200 hover:shadow-lg animate-slide-up',
                  !panel.is_active && 'opacity-60'
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {panel.panel_type === 'iptv' ? (
                        <Tv className="h-5 w-5 text-primary" />
                      ) : (
                        <Wifi className="h-5 w-5 text-success" />
                      )}
                      <CardTitle className="text-lg">{panel.name}</CardTitle>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full uppercase',
                      panel.panel_type === 'iptv' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'
                    )}>
                      {panel.panel_type}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Slots</span>
                        <span className={cn(
                          'font-medium',
                          slotsAvailable === 0 ? 'text-destructive' : slotsAvailable <= 2 ? 'text-warning' : 'text-success'
                        )}>
                          {panel.used_slots} / {panel.total_slots}
                        </span>
                      </div>
                      <Progress value={(panel.used_slots / panel.total_slots) * 100} />
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

                    {panelClientsList.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <p className="font-medium mb-1">Clientes:</p>
                        <div className="flex flex-wrap gap-1">
                          {panelClientsList.slice(0, 3).map(c => (
                            <span key={c.id} className="bg-muted px-1.5 py-0.5 rounded">
                              {c.name}
                            </span>
                          ))}
                          {panelClientsList.length > 3 && (
                            <span className="bg-muted px-1.5 py-0.5 rounded">
                              +{panelClientsList.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={slotsAvailable === 0}
                      onClick={() => {
                        setSelectedPanel(panel);
                        setAssignDialogOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Atribuir
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleEdit(panel)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este painel?')) {
                          deleteMutation.mutate(panel.id);
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

      {/* Assign Client Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Cliente</DialogTitle>
            <DialogDescription>
              Selecione um cliente para adicionar ao painel {selectedPanel?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedPanel && getAvailableClients(selectedPanel.id).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum cliente disponível para atribuir
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {selectedPanel && getAvailableClients(selectedPanel.id).map((client) => (
                  <Button
                    key={client.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      assignClientMutation.mutate({
                        panel_id: selectedPanel.id,
                        client_id: client.id,
                      });
                      setAssignDialogOpen(false);
                    }}
                  >
                    {client.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
