import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Package, DollarSign, Clock, Edit, Trash2, Wand2, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  is_active: boolean;
  category: string;
  screens: number;
}

type CategoryFilter = 'all' | 'IPTV' | 'SSH' | 'P2P';

const DEFAULT_PLANS_TEMPLATE = [
  // IPTV Plans
  { name: 'IPTV Mensal 1 Tela', duration_days: 30, category: 'IPTV', screens: 1 },
  { name: 'IPTV Mensal 2 Telas', duration_days: 30, category: 'IPTV', screens: 2 },
  { name: 'IPTV Mensal 3 Telas', duration_days: 30, category: 'IPTV', screens: 3 },
  { name: 'IPTV Trimestral 1 Tela', duration_days: 90, category: 'IPTV', screens: 1 },
  { name: 'IPTV Trimestral 2 Telas', duration_days: 90, category: 'IPTV', screens: 2 },
  { name: 'IPTV Trimestral 3 Telas', duration_days: 90, category: 'IPTV', screens: 3 },
  { name: 'IPTV Semestral 1 Tela', duration_days: 180, category: 'IPTV', screens: 1 },
  { name: 'IPTV Semestral 2 Telas', duration_days: 180, category: 'IPTV', screens: 2 },
  { name: 'IPTV Semestral 3 Telas', duration_days: 180, category: 'IPTV', screens: 3 },
  { name: 'IPTV Anual 1 Tela', duration_days: 365, category: 'IPTV', screens: 1 },
  { name: 'IPTV Anual 2 Telas', duration_days: 365, category: 'IPTV', screens: 2 },
  { name: 'IPTV Anual 3 Telas', duration_days: 365, category: 'IPTV', screens: 3 },
  // P2P Plans
  { name: 'P2P Mensal 1 Tela', duration_days: 30, category: 'P2P', screens: 1 },
  { name: 'P2P Mensal 2 Telas', duration_days: 30, category: 'P2P', screens: 2 },
  { name: 'P2P Mensal 3 Telas', duration_days: 30, category: 'P2P', screens: 3 },
  { name: 'P2P Trimestral 1 Tela', duration_days: 90, category: 'P2P', screens: 1 },
  { name: 'P2P Trimestral 2 Telas', duration_days: 90, category: 'P2P', screens: 2 },
  { name: 'P2P Trimestral 3 Telas', duration_days: 90, category: 'P2P', screens: 3 },
  { name: 'P2P Semestral 1 Tela', duration_days: 180, category: 'P2P', screens: 1 },
  { name: 'P2P Semestral 2 Telas', duration_days: 180, category: 'P2P', screens: 2 },
  { name: 'P2P Semestral 3 Telas', duration_days: 180, category: 'P2P', screens: 3 },
  { name: 'P2P Anual 1 Tela', duration_days: 365, category: 'P2P', screens: 1 },
  { name: 'P2P Anual 2 Telas', duration_days: 365, category: 'P2P', screens: 2 },
  { name: 'P2P Anual 3 Telas', duration_days: 365, category: 'P2P', screens: 3 },
  // SSH Plans
  { name: 'SSH Mensal 1 Conexão', duration_days: 30, category: 'SSH', screens: 1 },
  { name: 'SSH Mensal 2 Conexões', duration_days: 30, category: 'SSH', screens: 2 },
  { name: 'SSH Mensal 3 Conexões', duration_days: 30, category: 'SSH', screens: 3 },
  { name: 'SSH Trimestral 1 Conexão', duration_days: 90, category: 'SSH', screens: 1 },
  { name: 'SSH Trimestral 2 Conexões', duration_days: 90, category: 'SSH', screens: 2 },
  { name: 'SSH Trimestral 3 Conexões', duration_days: 90, category: 'SSH', screens: 3 },
  { name: 'SSH Semestral 1 Conexão', duration_days: 180, category: 'SSH', screens: 1 },
  { name: 'SSH Semestral 2 Conexões', duration_days: 180, category: 'SSH', screens: 2 },
  { name: 'SSH Semestral 3 Conexões', duration_days: 180, category: 'SSH', screens: 3 },
  { name: 'SSH Anual 1 Conexão', duration_days: 365, category: 'SSH', screens: 1 },
  { name: 'SSH Anual 2 Conexões', duration_days: 365, category: 'SSH', screens: 2 },
  { name: 'SSH Anual 3 Conexões', duration_days: 365, category: 'SSH', screens: 3 },
];

export default function Plans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '30',
    is_active: true,
    category: 'IPTV',
    screens: '1',
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('seller_id', user!.id)
        .order('category')
        .order('duration_days')
        .order('screens');
      if (error) throw error;
      return data as Plan[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string | null; price: number; duration_days: number; is_active: boolean; category: string; screens: number }) => {
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

  const createDefaultPlansMutation = useMutation({
    mutationFn: async () => {
      const plansToCreate = DEFAULT_PLANS_TEMPLATE.map(plan => {
        const isSSH = plan.category === 'SSH';
        const unitLabel = isSSH 
          ? (plan.screens === 1 ? 'conexão' : 'conexões')
          : (plan.screens === 1 ? 'tela' : 'telas');
        return {
          ...plan,
          price: 0, // Seller will set prices
          is_active: true,
          description: `${plan.screens} ${unitLabel} - ${plan.duration_days} dias`,
          seller_id: user!.id,
        };
      });
      
      const { error } = await supabase.from('plans').insert(plansToCreate);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Planos padrão criados! Defina os preços para cada plano.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, syncPrice }: { id: string; data: Partial<Plan>; syncPrice?: { category: string; duration_days: number; screens: number; price: number } }) => {
      // Update the main plan
      const { error } = await supabase.from('plans').update(data).eq('id', id);
      if (error) throw error;
      
      // If IPTV or P2P, sync price with the equivalent plan in the other category
      if (syncPrice && (syncPrice.category === 'IPTV' || syncPrice.category === 'P2P')) {
        const otherCategory = syncPrice.category === 'IPTV' ? 'P2P' : 'IPTV';
        await supabase
          .from('plans')
          .update({ price: syncPrice.price })
          .eq('seller_id', user!.id)
          .eq('category', otherCategory)
          .eq('duration_days', syncPrice.duration_days)
          .eq('screens', syncPrice.screens);
      }
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
      category: 'IPTV',
      screens: '1',
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
      category: formData.category,
      screens: parseInt(formData.screens) || 1,
    };

    if (editingPlan) {
      // Sync prices between IPTV and P2P (SSH is independent)
      const syncPrice = (formData.category === 'IPTV' || formData.category === 'P2P') 
        ? {
            category: formData.category,
            duration_days: data.duration_days,
            screens: data.screens,
            price: data.price,
          }
        : undefined;
      updateMutation.mutate({ id: editingPlan.id, data, syncPrice });
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
      category: plan.category || 'IPTV',
      screens: (plan.screens || 1).toString(),
    });
    setIsDialogOpen(true);
  };

  const filteredPlans = plans.filter(plan => {
    if (categoryFilter === 'all') return true;
    return plan.category === categoryFilter;
  });

  const getDurationLabel = (days: number) => {
    if (days === 30) return 'Mensal';
    if (days === 90) return 'Trimestral';
    if (days === 180) return 'Semestral';
    if (days === 365) return 'Anual';
    return `${days} dias`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planos</h1>
          <p className="text-muted-foreground">Gerencie os planos de assinatura IPTV e SSH</p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              if (confirm('Isso criará 24 planos padrão (IPTV e SSH) com preço R$ 0,00. Você poderá definir os preços depois. Continuar?')) {
                createDefaultPlansMutation.mutate();
              }
            }}
            disabled={createDefaultPlansMutation.isPending}
          >
            <Wand2 className="h-4 w-4" />
            Gerar Planos Padrão
          </Button>

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
                    placeholder="IPTV Mensal 1 Tela"
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
                    <Label>Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IPTV">IPTV</SelectItem>
                        <SelectItem value="P2P">P2P</SelectItem>
                        <SelectItem value="SSH">SSH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{formData.category === 'SSH' ? 'Número de Conexões' : 'Número de Telas'}</Label>
                    <Select
                      value={formData.screens}
                      onValueChange={(value) => setFormData({ ...formData, screens: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.category === 'SSH' ? (
                          <>
                            <SelectItem value="1">1 Conexão</SelectItem>
                            <SelectItem value="2">2 Conexões</SelectItem>
                            <SelectItem value="3">3 Conexões</SelectItem>
                            <SelectItem value="4">4 Conexões</SelectItem>
                            <SelectItem value="5">5 Conexões</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="1">1 Tela</SelectItem>
                            <SelectItem value="2">2 Telas</SelectItem>
                            <SelectItem value="3">3 Telas</SelectItem>
                            <SelectItem value="4">4 Telas</SelectItem>
                            <SelectItem value="5">5 Telas</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
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
                    <Label>Duração</Label>
                    <Select
                      value={formData.duration_days}
                      onValueChange={(value) => setFormData({ ...formData, duration_days: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Mensal (30 dias)</SelectItem>
                        <SelectItem value="90">Trimestral (90 dias)</SelectItem>
                        <SelectItem value="180">Semestral (180 dias)</SelectItem>
                        <SelectItem value="365">Anual (365 dias)</SelectItem>
                      </SelectContent>
                    </Select>
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
      </div>

      {/* Category Filter */}
      {plans.length > 0 && (
        <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
          <TabsList>
            <TabsTrigger value="all">Todos ({plans.length})</TabsTrigger>
            <TabsTrigger value="IPTV">IPTV ({plans.filter(p => p.category === 'IPTV').length})</TabsTrigger>
            <TabsTrigger value="P2P">P2P ({plans.filter(p => p.category === 'P2P').length})</TabsTrigger>
            <TabsTrigger value="SSH">SSH ({plans.filter(p => p.category === 'SSH').length})</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

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
            <p className="text-muted-foreground text-center mb-4">
              Crie planos manualmente ou gere os planos padrão
            </p>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {
                if (confirm('Isso criará 24 planos padrão (IPTV e SSH). Você poderá definir os preços depois. Continuar?')) {
                  createDefaultPlansMutation.mutate();
                }
              }}
              disabled={createDefaultPlansMutation.isPending}
            >
              <Wand2 className="h-4 w-4" />
              Gerar Planos Padrão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPlans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                'transition-all duration-200 hover:shadow-lg animate-slide-up',
                !plan.is_active && 'opacity-60',
                plan.price === 0 && 'ring-2 ring-warning/50'
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        plan.category === 'IPTV' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                      )}>
                        {plan.category}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        {plan.screens || 1} {plan.category === 'SSH' ? (plan.screens === 1 ? 'Conexão' : 'Conexões') : (plan.screens === 1 ? 'Tela' : 'Telas')}
                      </span>
                    </div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {plan.description && (
                      <CardDescription className="text-xs">{plan.description}</CardDescription>
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
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-success" />
                    <span className={cn(
                      "text-xl font-bold",
                      plan.price === 0 && "text-warning"
                    )}>
                      {plan.price === 0 ? 'Definir preço' : `R$ ${plan.price.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{getDurationLabel(plan.duration_days)}</span>
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