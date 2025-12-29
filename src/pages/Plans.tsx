import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Package, DollarSign, Clock, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  is_active: boolean;
}

export default function Plans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '30',
    is_active: true,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('seller_id', user!.id)
        .order('price');
      if (error) throw error;
      return data as Plan[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string | null; price: number; duration_days: number; is_active: boolean }) => {
      const { error } = await supabase.from('plans').insert([{
        ...data,
        seller_id: user!.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plano criado com sucesso!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Plan> }) => {
      const { error } = await supabase.from('plans').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plano atualizado!');
      resetForm();
      setIsDialogOpen(false);
      setEditingPlan(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plano excluído!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration_days: '30',
      is_active: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price) || 0,
      duration_days: parseInt(formData.duration_days) || 30,
      is_active: formData.is_active,
    };

    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      is_active: plan.is_active,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planos</h1>
          <p className="text-muted-foreground">Gerencie os planos de assinatura</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingPlan(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
              <DialogDescription>
                {editingPlan ? 'Atualize os dados do plano' : 'Crie um novo plano de assinatura'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Plano Mensal"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Acesso completo por 30 dias"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration_days">Duração (dias) *</Label>
                  <Input
                    id="duration_days"
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Plano Ativo</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingPlan ? 'Salvar' : 'Criar Plano'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum plano cadastrado</h3>
            <p className="text-muted-foreground text-center">
              Crie seu primeiro plano de assinatura
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                'transition-all duration-200 hover:shadow-lg animate-slide-up',
                !plan.is_active && 'opacity-60'
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.description && (
                      <CardDescription>{plan.description}</CardDescription>
                    )}
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    plan.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                  )}>
                    {plan.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-success" />
                    <span className="text-2xl font-bold">R$ {plan.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{plan.duration_days} dias</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(plan)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir este plano?')) {
                        deleteMutation.mutate(plan.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
