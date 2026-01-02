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
import { Plus, Package, DollarSign, Clock, Edit, Trash2, Monitor } from 'lucide-react';
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
type DurationFilter = 'all' | 30 | 90 | 180 | 365;
export default function Plans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
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
      
      // Sync plan_price for clients with this plan that have price 0 or null
      if (data.price !== undefined && data.price > 0) {
        // Update clients that have this plan_id and plan_price = 0 or null
        await supabase
          .from('clients')
          .update({ 
            plan_price: data.price,
            plan_name: data.name || undefined
          })
          .eq('plan_id', id)
          .eq('seller_id', user!.id)
          .or('plan_price.is.null,plan_price.eq.0');
        
        // Also sync clients that have the equivalent plan in IPTV/P2P
        if (syncPrice && (syncPrice.category === 'IPTV' || syncPrice.category === 'P2P')) {
          const otherCategory = syncPrice.category === 'IPTV' ? 'P2P' : 'IPTV';
          
          // Find the equivalent plan ID
          const { data: equivalentPlans } = await supabase
            .from('plans')
            .select('id')
            .eq('seller_id', user!.id)
            .eq('category', otherCategory)
            .eq('duration_days', syncPrice.duration_days)
            .eq('screens', syncPrice.screens)
            .limit(1);
          
          if (equivalentPlans && equivalentPlans.length > 0) {
            await supabase
              .from('clients')
              .update({ plan_price: data.price })
              .eq('plan_id', equivalentPlans[0].id)
              .eq('seller_id', user!.id)
              .or('plan_price.is.null,plan_price.eq.0');
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Plano atualizado! Clientes com valor R$ 0 foram sincronizados.');
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
      price: plan.price > 0 ? plan.price.toString() : '',
      duration_days: plan.duration_days.toString(),
      is_active: plan.is_active,
      category: plan.category || 'IPTV',
      screens: (plan.screens || 1).toString(),
    });
    setIsDialogOpen(true);
  };

  const filteredPlans = plans.filter(plan => {
    const matchesCategory = categoryFilter === 'all' || plan.category === categoryFilter;
    const matchesDuration = durationFilter === 'all' || plan.duration_days === durationFilter;
    return matchesCategory && matchesDuration;
  });

  const getDurationLabel = (days: number) => {
    if (days === 30) return 'Mensal';
    if (days === 90) return 'Trimestral';
    if (days === 180) return 'Semestral';
    if (days === 365) return 'Anual';
    return `${days} dias`;
  };

  const getDurationColor = (days: number) => {
    if (days === 30) return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
    if (days === 90) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
    if (days === 180) return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
    if (days === 365) return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  const getCardBorderColor = (days: number) => {
    if (days === 30) return 'border-l-blue-500';
    if (days === 90) return 'border-l-emerald-500';
    if (days === 180) return 'border-l-amber-500';
    if (days === 365) return 'border-l-purple-500';
    return 'border-l-border';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planos</h1>
          <p className="text-muted-foreground">Gerencie os planos de assinatura IPTV e SSH</p>
        </div>

        <div className="flex gap-2">

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            // Prevent closing while mutation is pending
            if (!open && (createMutation.isPending || updateMutation.isPending)) {
              return;
            }
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
            <DialogContent 
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
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="Ex: 25.00"
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

      {/* Filters */}
      {plans.length > 0 && (
        <div className="space-y-3">
          {/* Category Filter */}
          <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
            <TabsList>
              <TabsTrigger value="all">Todos ({plans.length})</TabsTrigger>
              <TabsTrigger value="IPTV">IPTV ({plans.filter(p => p.category === 'IPTV').length})</TabsTrigger>
              <TabsTrigger value="P2P">P2P ({plans.filter(p => p.category === 'P2P').length})</TabsTrigger>
              <TabsTrigger value="SSH">SSH ({plans.filter(p => p.category === 'SSH').length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Duration Filter */}
          <Tabs value={durationFilter.toString()} onValueChange={(v) => setDurationFilter(v === 'all' ? 'all' : Number(v) as DurationFilter)}>
            <TabsList>
              <TabsTrigger value="all">Todas Durações</TabsTrigger>
              <TabsTrigger value="30" className="text-blue-600 data-[state=active]:bg-blue-500/10">
                Mensal ({plans.filter(p => p.duration_days === 30).length})
              </TabsTrigger>
              <TabsTrigger value="90" className="text-emerald-600 data-[state=active]:bg-emerald-500/10">
                Trimestral ({plans.filter(p => p.duration_days === 90).length})
              </TabsTrigger>
              <TabsTrigger value="180" className="text-amber-600 data-[state=active]:bg-amber-500/10">
                Semestral ({plans.filter(p => p.duration_days === 180).length})
              </TabsTrigger>
              <TabsTrigger value="365" className="text-purple-600 data-[state=active]:bg-purple-500/10">
                Anual ({plans.filter(p => p.duration_days === 365).length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
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
              Crie seu primeiro plano de assinatura
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPlans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                'transition-all duration-200 hover:shadow-lg animate-slide-up border-l-4',
                getCardBorderColor(plan.duration_days),
                !plan.is_active && 'opacity-60',
                plan.price === 0 && 'ring-2 ring-warning/50'
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        plan.category === 'IPTV' ? 'bg-primary/10 text-primary' : 
                        plan.category === 'P2P' ? 'bg-primary/10 text-primary' : 
                        'bg-secondary text-secondary-foreground'
                      )}>
                        {plan.category}
                      </span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium border',
                        getDurationColor(plan.duration_days)
                      )}>
                        {getDurationLabel(plan.duration_days)}
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