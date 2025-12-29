import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, MessageSquare, Edit, Trash2, Copy, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  type: string;
  message: string;
  is_default: boolean;
}

const templateTypes = [
  { value: 'welcome', label: 'Boas-vindas' },
  { value: 'expiring', label: 'Vencimento Próximo' },
  { value: 'expired', label: 'Vencido' },
  { value: 'credentials', label: 'Credenciais' },
  { value: 'billing', label: 'Cobrança' },
  { value: 'renewal', label: 'Renovação' },
  { value: 'custom', label: 'Personalizado' },
];

const variables = [
  { name: '{nome}', description: 'Nome do cliente' },
  { name: '{login}', description: 'Login principal' },
  { name: '{senha}', description: 'Senha principal' },
  { name: '{vencimento}', description: 'Data de vencimento (DD/MM/YYYY)' },
  { name: '{vencimento_dinamico}', description: '"hoje", "amanhã", "em X dias"' },
  { name: '{preco}', description: 'Preço do plano' },
  { name: '{dias_restantes}', description: 'Dias até vencer' },
  { name: '{servidor}', description: 'Nome do servidor' },
  { name: '{app}', description: 'Nome do aplicativo' },
];

export default function Templates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom',
    message: '',
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('seller_id', user!.id)
        .order('type');
      if (error) throw error;
      return data as Template[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; message: string }) => {
      const { error } = await supabase.from('whatsapp_templates').insert([{
        ...data,
        seller_id: user!.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template criado com sucesso!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Template> }) => {
      const { error } = await supabase.from('whatsapp_templates').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template atualizado!');
      resetForm();
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template excluído!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'custom',
      message: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      message: template.message,
    });
    setIsDialogOpen(true);
  };

  const copyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast.success('Mensagem copiada!');
  };

  const insertVariable = (variable: string) => {
    setFormData({
      ...formData,
      message: formData.message + variable,
    });
  };

  const getTypeLabel = (type: string) => {
    return templateTypes.find(t => t.value === type)?.label || type;
  };

  const typeColors: Record<string, string> = {
    welcome: 'bg-success/10 text-success',
    expiring: 'bg-warning/10 text-warning',
    expired: 'bg-destructive/10 text-destructive',
    credentials: 'bg-primary/10 text-primary',
    billing: 'bg-orange-500/10 text-orange-500',
    renewal: 'bg-blue-500/10 text-blue-500',
    custom: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de Mensagem</h1>
          <p className="text-muted-foreground">Crie mensagens personalizadas com variáveis dinâmicas</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTemplate(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Editar Template' : 'Novo Template'}</DialogTitle>
              <DialogDescription>
                Use variáveis como {'{nome}'} e {'{vencimento}'} para personalizar
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Lembrete de Vencimento"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="message">Mensagem *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVariables(!showVariables)}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    Variáveis
                  </Button>
                </div>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Olá {nome}! Seu plano vence {vencimento_dinamico}..."
                  rows={6}
                  required
                />
              </div>

              {showVariables && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">Clique para inserir:</p>
                  <div className="flex flex-wrap gap-2">
                    {variables.map((v) => (
                      <Button
                        key={v.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariable(v.name)}
                        title={v.description}
                      >
                        {v.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTemplate ? 'Salvar' : 'Criar Template'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Variables Reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Variáveis Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {variables.map((v) => (
              <span
                key={v.name}
                className="text-xs bg-muted px-2 py-1 rounded"
                title={v.description}
              >
                {v.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum template cadastrado</h3>
            <p className="text-muted-foreground text-center">
              Crie seu primeiro template de mensagem
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} className="transition-all duration-200 hover:shadow-lg animate-slide-up">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full mt-1 inline-block',
                      typeColors[template.type]
                    )}>
                      {getTypeLabel(template.type)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-3 rounded-lg mb-4 max-h-32 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{template.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => copyMessage(template.message)}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => handleEdit(template)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja excluir este template?')) {
                        deleteMutation.mutate(template.id);
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
