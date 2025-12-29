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
import { toast } from 'sonner';
import { Plus, Server, DollarSign, Edit, Trash2, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServerData {
  id: string;
  name: string;
  monthly_cost: number;
  is_active: boolean;
  notes: string | null;
  is_credit_based: boolean;
  credit_value: number;
  total_credits: number;
  used_credits: number;
}

export default function Servers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    monthly_cost: '',
    is_active: true,
    notes: '',
    is_credit_based: false,
    credit_value: '',
    total_credits: '',
    used_credits: '',
  });

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['servers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .eq('seller_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as ServerData[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      monthly_cost?: number; 
      is_active?: boolean; 
      notes?: string | null;
      is_credit_based?: boolean;
      credit_value?: number;
      total_credits?: number;
      used_credits?: number;
    }) => {
      const { error } = await supabase.from('servers').insert([{
        ...data,
        seller_id: user!.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success('Servidor criado com sucesso!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ServerData> }) => {
      const { error } = await supabase.from('servers').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success('Servidor atualizado!');
      resetForm();
      setIsDialogOpen(false);
      setEditingServer(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('servers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success('Servidor excluído!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('servers').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      toast.success('Status atualizado!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      monthly_cost: '',
      is_active: true,
      notes: '',
      is_credit_based: false,
      credit_value: '',
      total_credits: '',
      used_credits: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      monthly_cost: parseFloat(formData.monthly_cost) || 0,
      is_active: formData.is_active,
      notes: formData.notes || null,
      is_credit_based: formData.is_credit_based,
      credit_value: parseFloat(formData.credit_value) || 0,
      total_credits: parseFloat(formData.total_credits) || 0,
      used_credits: parseFloat(formData.used_credits) || 0,
    };

    if (editingServer) {
      updateMutation.mutate({ id: editingServer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (server: ServerData) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      monthly_cost: server.monthly_cost.toString(),
      is_active: server.is_active,
      notes: server.notes || '',
      is_credit_based: server.is_credit_based || false,
      credit_value: server.credit_value?.toString() || '',
      total_credits: server.total_credits?.toString() || '',
      used_credits: server.used_credits?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const totalMonthlyCost = servers
    .filter(s => s.is_active)
    .reduce((sum, s) => sum + s.monthly_cost, 0);

  const totalCredits = servers
    .filter(s => s.is_active && s.is_credit_based)
    .reduce((sum, s) => sum + (s.total_credits || 0), 0);

  const usedCredits = servers
    .filter(s => s.is_active && s.is_credit_based)
    .reduce((sum, s) => sum + (s.used_credits || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Servidores</h1>
          <p className="text-muted-foreground">Gerencie seus servidores, custos e créditos</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingServer(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Servidor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingServer ? 'Editar Servidor' : 'Novo Servidor'}</DialogTitle>
              <DialogDescription>
                {editingServer ? 'Atualize os dados do servidor' : 'Adicione um novo servidor'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="monthly_cost">Custo Mensal (R$)</Label>
                <Input
                  id="monthly_cost"
                  type="number"
                  step="0.01"
                  value={formData.monthly_cost}
                  onChange={(e) => setFormData({ ...formData, monthly_cost: e.target.value })}
                />
              </div>
              
              {/* Credit-based toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="is_credit_based" className="font-medium">Servidor por Créditos</Label>
                  <p className="text-xs text-muted-foreground">Ativar para gerenciar créditos</p>
                </div>
                <Switch
                  id="is_credit_based"
                  checked={formData.is_credit_based}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_credit_based: checked })}
                />
              </div>

              {/* Credit fields - only show when credit-based */}
              {formData.is_credit_based && (
                <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
                  <div className="space-y-2">
                    <Label htmlFor="credit_value">Valor por Crédito (R$)</Label>
                    <Input
                      id="credit_value"
                      type="number"
                      step="0.01"
                      value={formData.credit_value}
                      onChange={(e) => setFormData({ ...formData, credit_value: e.target.value })}
                      placeholder="Ex: 1.50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="total_credits">Total de Créditos</Label>
                      <Input
                        id="total_credits"
                        type="number"
                        step="1"
                        value={formData.total_credits}
                        onChange={(e) => setFormData({ ...formData, total_credits: e.target.value })}
                        placeholder="Ex: 100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="used_credits">Créditos Usados</Label>
                      <Input
                        id="used_credits"
                        type="number"
                        step="1"
                        value={formData.used_credits}
                        onChange={(e) => setFormData({ ...formData, used_credits: e.target.value })}
                        placeholder="Ex: 25"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Servidor Ativo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
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
                  {editingServer ? 'Salvar' : 'Criar Servidor'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Mensal Total</p>
                <p className="text-2xl font-bold">R$ {totalMonthlyCost.toFixed(2)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Servidores Ativos</p>
              <p className="text-2xl font-bold">{servers.filter(s => s.is_active).length}/{servers.length}</p>
            </div>
          </CardContent>
        </Card>

        {totalCredits > 0 && (
          <Card className="bg-warning/5 border-warning/20">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-warning/10">
                  <Coins className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Créditos Totais</p>
                  <p className="text-2xl font-bold">{usedCredits} / {totalCredits}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Disponíveis</p>
                <p className="text-2xl font-bold">{totalCredits - usedCredits}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Servers Grid */}
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
      ) : servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum servidor cadastrado</h3>
            <p className="text-muted-foreground text-center">
              Adicione seu primeiro servidor clicando no botão acima
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => {
            const creditPercentage = server.total_credits > 0 
              ? (server.used_credits / server.total_credits) * 100 
              : 0;
            const remainingCredits = (server.total_credits || 0) - (server.used_credits || 0);

            return (
              <Card
                key={server.id}
                className={cn(
                  'transition-all duration-200 hover:shadow-lg animate-slide-up',
                  !server.is_active && 'opacity-60'
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        server.is_active ? 'bg-success/10' : 'bg-muted'
                      )}>
                        <Server className={cn(
                          'h-5 w-5',
                          server.is_active ? 'text-success' : 'text-muted-foreground'
                        )} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{server.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {server.is_active ? 'Ativo' : 'Inativo'}
                          {server.is_credit_based && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning">
                              Créditos
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={server.is_active}
                      onCheckedChange={(checked) => 
                        toggleStatusMutation.mutate({ id: server.id, is_active: checked })
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">R$ {server.monthly_cost.toFixed(2)}/mês</span>
                  </div>
                  
                  {/* Credit info */}
                  {server.is_credit_based && (
                    <div className="space-y-2 mb-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Coins className="h-4 w-4" />
                          Créditos
                        </span>
                        <span className="font-medium">
                          {server.used_credits || 0} / {server.total_credits || 0}
                        </span>
                      </div>
                      <Progress 
                        value={creditPercentage} 
                        className={cn(
                          "h-2",
                          creditPercentage > 80 ? "[&>div]:bg-destructive" : "[&>div]:bg-warning"
                        )}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Valor: R$ {(server.credit_value || 0).toFixed(2)}/crédito</span>
                        <span>{remainingCredits} disponíveis</span>
                      </div>
                    </div>
                  )}

                  {server.notes && (
                    <p className="text-sm text-muted-foreground mb-4">{server.notes}</p>
                  )}
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(server)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir este servidor?')) {
                          deleteMutation.mutate(server.id);
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