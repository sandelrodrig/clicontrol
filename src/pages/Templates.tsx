import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, MessageSquare, Edit, Trash2, Copy, Info, Wand2, Tv, Wifi, Crown, Tag, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  type: string;
  message: string;
  is_default: boolean;
}

interface TemplateCategory {
  id: string;
  name: string;
  seller_id: string;
}

// Default categories
const DEFAULT_CATEGORIES = ['IPTV', 'SSH', 'Contas Premium'] as const;

// Platforms for message sending
const PLATFORMS = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '📱' },
  { value: 'telegram', label: 'Telegram', icon: '✈️' },
] as const;

// Message types
const MESSAGE_TYPES = [
  { value: 'welcome', label: 'Boas-vindas', icon: '👋' },
  { value: 'billing', label: 'Cobrança', icon: '💰' },
  { value: 'expiring_3days', label: 'Vencimento (3 dias)', icon: '⏰' },
  { value: 'expiring_2days', label: 'Vencimento (2 dias)', icon: '⏰' },
  { value: 'expiring_1day', label: 'Vencimento (1 dia)', icon: '🔔' },
  { value: 'expired', label: 'Vencido', icon: '❌' },
  { value: 'renewal', label: 'Renovação', icon: '✅' },
  { value: 'credentials', label: 'Credenciais', icon: '🔐' },
  { value: 'custom', label: 'Personalizado', icon: '📝' },
];

// Available variables
const variables = [
  { name: '{nome}', description: 'Nome do cliente' },
  { name: '{empresa}', description: 'Nome da empresa/revendedor' },
  { name: '{login}', description: 'Login do cliente' },
  { name: '{senha}', description: 'Senha do cliente' },
  { name: '{email_premium}', description: 'Email da conta Premium' },
  { name: '{senha_premium}', description: 'Senha da conta Premium' },
  { name: '{vencimento}', description: 'Data de vencimento (DD/MM/YYYY)' },
  { name: '{dias_restantes}', description: 'Dias até vencer' },
  { name: '{valor}', description: 'Valor do plano' },
  { name: '{plano}', description: 'Nome do plano' },
  { name: '{servidor}', description: 'Nome do servidor' },
  { name: '{pix}', description: 'Chave PIX para pagamento' },
  { name: '{telegram}', description: 'Username do Telegram (@usuario)' },
];

// Default templates for each category, type, and platform
const getDefaultTemplates = (category: string, platform: 'whatsapp' | 'telegram' = 'whatsapp') => {
  const templates: { name: string; type: string; message: string }[] = [];
  const platformPrefix = platform === 'telegram' ? '[TG] ' : '';
  
  if (category === 'IPTV') {
    templates.push(
      {
        name: `${platformPrefix}IPTV - Boas-vindas`,
        type: 'welcome',
        message: `👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso IPTV:
📺 *Login:* {login}
🔑 *Senha:* {senha}
📡 *Servidor:* {servidor}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏`
      },
      {
        name: `${platformPrefix}IPTV - Cobrança`,
        type: 'billing',
        message: platform === 'telegram' 
          ? `💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano IPTV:

📺 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

*Chave PIX:* \`{pix}\`

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*`
          : `💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano IPTV:

📺 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*`
      },
      {
        name: `${platformPrefix}IPTV - Vencendo em 3 dias`,
        type: 'expiring_3days',
        message: `⏰ Olá {nome}!

Seu plano IPTV vence em *3 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e continue assistindo sem interrupções! 📺

*{empresa}*`
      },
      {
        name: `${platformPrefix}IPTV - Vencendo em 2 dias`,
        type: 'expiring_2days',
        message: `⚠️ Olá {nome}!

Seu plano IPTV vence em *2 dias* ({vencimento}).

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Não fique sem seu entretenimento! Renove agora! 🎬

*{empresa}*`
      },
      {
        name: `${platformPrefix}IPTV - Vencendo amanhã`,
        type: 'expiring_1day',
        message: `🔔 Olá {nome}!

⚡ *ATENÇÃO!* Seu plano IPTV vence *AMANHÃ* ({vencimento})!

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora para não perder o acesso! 📺

*{empresa}*`
      },
      {
        name: `${platformPrefix}IPTV - Vencido`,
        type: 'expired',
        message: `❌ Olá {nome}!

Seu plano IPTV *venceu* em {vencimento}.

📺 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Entre em contato para renovar e voltar a assistir! 📺

*{empresa}*`
      },
      {
        name: `${platformPrefix}IPTV - Renovação Confirmada`,
        type: 'renewal',
        message: `✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

📺 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
🔑 *Login:* {login}
🔐 *Senha:* {senha}

Obrigado por continuar conosco! 🙏

*{empresa}*`
      }
    );
  }
  
  if (category === 'SSH') {
    templates.push(
      {
        name: `${platformPrefix}SSH - Boas-vindas`,
        type: 'welcome',
        message: `👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso SSH:
👤 *Login:* {login}
🔑 *Senha:* {senha}
🌐 *Servidor:* {servidor}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Qualquer dúvida estamos à disposição! 🙏`
      },
      {
        name: `${platformPrefix}SSH - Cobrança`,
        type: 'billing',
        message: platform === 'telegram' 
          ? `💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano SSH:

🌐 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

*Chave PIX:* \`{pix}\`

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*`
          : `💰 Olá {nome}!

Estamos enviando os dados para pagamento do seu plano SSH:

🌐 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*`
      },
      {
        name: `${platformPrefix}SSH - Vencendo em 3 dias`,
        type: 'expiring_3days',
        message: `⏰ Olá {nome}!

Seu plano SSH vence em *3 dias* ({vencimento}).

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e continue navegando! 🚀

*{empresa}*`
      },
      {
        name: `${platformPrefix}SSH - Vencendo em 2 dias`,
        type: 'expiring_2days',
        message: `⚠️ Olá {nome}!

Seu plano SSH vence em *2 dias* ({vencimento}).

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Não fique sem internet! Renove agora! 📶

*{empresa}*`
      },
      {
        name: `${platformPrefix}SSH - Vencendo amanhã`,
        type: 'expiring_1day',
        message: `🔔 Olá {nome}!

⚡ *ATENÇÃO!* Seu plano SSH vence *AMANHÃ* ({vencimento})!

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora para não perder o acesso! 🚀

*{empresa}*`
      },
      {
        name: `${platformPrefix}SSH - Vencido`,
        type: 'expired',
        message: `❌ Olá {nome}!

Seu plano SSH *venceu* em {vencimento}.

🌐 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Entre em contato para renovar! 📶

*{empresa}*`
      },
      {
        name: `${platformPrefix}SSH - Renovação Confirmada`,
        type: 'renewal',
        message: `✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

🌐 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
👤 *Login:* {login}
🔐 *Senha:* {senha}

Obrigado por continuar conosco! 🙏

*{empresa}*`
      }
    );
  }
  
  if (category === 'Contas Premium') {
    templates.push(
      {
        name: `${platformPrefix}Premium - Boas-vindas`,
        type: 'welcome',
        message: `👋 Olá {nome}!

Seja bem-vindo(a) à *{empresa}*! 🎉

Seus dados de acesso Premium:
📧 *Email:* {email_premium}
🔑 *Senha:* {senha_premium}

📅 *Plano:* {plano}
💰 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Aproveite sua conta! 👑

Qualquer dúvida estamos à disposição! 🙏`
      },
      {
        name: `${platformPrefix}Premium - Cobrança`,
        type: 'billing',
        message: platform === 'telegram' 
          ? `💰 Olá {nome}!

Estamos enviando os dados para pagamento da sua conta Premium:

👑 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

*Chave PIX:* \`{pix}\`

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*`
          : `💰 Olá {nome}!

Estamos enviando os dados para pagamento da sua conta Premium:

👑 *Plano:* {plano}
💵 *Valor:* R$ {valor}
📆 *Vencimento:* {vencimento}

Após o pagamento, envie o comprovante aqui! ✅

*{empresa}*`
      },
      {
        name: `${platformPrefix}Premium - Vencendo em 3 dias`,
        type: 'expiring_3days',
        message: `⏰ Olá {nome}!

Sua conta Premium vence em *3 dias* ({vencimento}).

👑 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora e continue aproveitando! 🌟

*{empresa}*`
      },
      {
        name: `${platformPrefix}Premium - Vencendo em 2 dias`,
        type: 'expiring_2days',
        message: `⚠️ Olá {nome}!

Sua conta Premium vence em *2 dias* ({vencimento}).

👑 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Não perca seu acesso Premium! Renove agora! 👑

*{empresa}*`
      },
      {
        name: `${platformPrefix}Premium - Vencendo amanhã`,
        type: 'expiring_1day',
        message: `🔔 Olá {nome}!

⚡ *ATENÇÃO!* Sua conta Premium vence *AMANHÃ* ({vencimento})!

👑 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Renove agora para não perder o acesso! 🌟

*{empresa}*`
      },
      {
        name: `${platformPrefix}Premium - Vencido`,
        type: 'expired',
        message: `❌ Olá {nome}!

Sua conta Premium *venceu* em {vencimento}.

👑 *Plano:* {plano}
💰 *Valor para renovação:* R$ {valor}

Entre em contato para renovar e voltar a aproveitar! 👑

*{empresa}*`
      },
      {
        name: `${platformPrefix}Premium - Renovação Confirmada`,
        type: 'renewal',
        message: `✅ Olá {nome}!

Sua renovação foi confirmada! 🎉

👑 *Plano:* {plano}
📆 *Novo vencimento:* {vencimento}
📧 *Email:* {email_premium}
🔐 *Senha:* {senha_premium}

Obrigado por continuar conosco! 🙏

*{empresa}*`
      }
    );
  }
  
  return templates;
};

export default function Templates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom',
    message: '',
    category: 'IPTV',
  });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('seller_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as Template[];
    },
    enabled: !!user?.id,
  });

  const { data: customCategories = [] } = useQuery({
    queryKey: ['template-categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_categories')
        .select('*')
        .eq('seller_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as TemplateCategory[];
    },
    enabled: !!user?.id,
  });

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)];

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

  const createDefaultTemplatesMutation = useMutation({
    mutationFn: async ({ category, platform }: { category: string; platform: 'whatsapp' | 'telegram' }) => {
      const defaultTemplates = getDefaultTemplates(category, platform);
      const templatesToInsert = defaultTemplates.map(t => ({
        ...t,
        seller_id: user!.id,
      }));
      
      const { error } = await supabase.from('whatsapp_templates').insert(templatesToInsert);
      if (error) throw error;
    },
    onSuccess: (_, { category, platform }) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      const platformName = platform === 'telegram' ? 'Telegram' : 'WhatsApp';
      toast.success(`Templates ${platformName} de ${category} criados com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('client_categories').insert([{
        name,
        seller_id: user!.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-categories'] });
      toast.success('Categoria criada!');
      setNewCategoryName('');
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
      category: 'IPTV',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: { name: formData.name, type: formData.type, message: formData.message } });
    } else {
      createMutation.mutate({ name: formData.name, type: formData.type, message: formData.message });
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      message: template.message,
      category: 'IPTV',
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
    return MESSAGE_TYPES.find(t => t.value === type)?.label || type;
  };

  const getTypeIcon = (type: string) => {
    return MESSAGE_TYPES.find(t => t.value === type)?.icon || '📝';
  };

  const typeColors: Record<string, string> = {
    welcome: 'bg-success/10 text-success',
    billing: 'bg-orange-500/10 text-orange-500',
    expiring_3days: 'bg-yellow-500/10 text-yellow-500',
    expiring_2days: 'bg-warning/10 text-warning',
    expiring_1day: 'bg-destructive/10 text-destructive',
    expired: 'bg-destructive/10 text-destructive',
    renewal: 'bg-blue-500/10 text-blue-500',
    credentials: 'bg-primary/10 text-primary',
    custom: 'bg-muted text-muted-foreground',
  };

  const getCategoryIcon = (name: string) => {
    switch (name) {
      case 'IPTV': return <Tv className="h-4 w-4" />;
      case 'SSH': return <Wifi className="h-4 w-4" />;
      case 'Contas Premium': return <Crown className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    // Platform filter (Telegram templates have [TG] prefix)
    if (platformFilter === 'telegram' && !template.name.startsWith('[TG]')) return false;
    if (platformFilter === 'whatsapp' && template.name.startsWith('[TG]')) return false;
    
    // Category filter by name prefix
    if (categoryFilter !== 'all') {
      const prefix = template.name.replace('[TG] ', '').split(' - ')[0];
      if (categoryFilter === 'IPTV' && !prefix.includes('IPTV')) return false;
      if (categoryFilter === 'SSH' && !prefix.includes('SSH')) return false;
      if (categoryFilter === 'Contas Premium' && !prefix.includes('Premium')) return false;
      if (!['IPTV', 'SSH', 'Contas Premium'].includes(categoryFilter)) {
        if (!template.name.toLowerCase().includes(categoryFilter.toLowerCase())) return false;
      }
    }
    
    // Type filter
    if (typeFilter !== 'all' && template.type !== typeFilter) return false;
    
    return true;
  });

  // Check which categories have templates (for each platform)
  const hasIPTVWhatsApp = templates.some(t => t.name.includes('IPTV') && !t.name.startsWith('[TG]'));
  const hasSSHWhatsApp = templates.some(t => t.name.includes('SSH') && !t.name.startsWith('[TG]'));
  const hasPremiumWhatsApp = templates.some(t => t.name.includes('Premium') && !t.name.startsWith('[TG]'));
  const hasIPTVTelegram = templates.some(t => t.name.includes('IPTV') && t.name.startsWith('[TG]'));
  const hasSSHTelegram = templates.some(t => t.name.includes('SSH') && t.name.startsWith('[TG]'));
  const hasPremiumTelegram = templates.some(t => t.name.includes('Premium') && t.name.startsWith('[TG]'));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de Mensagem</h1>
          <p className="text-muted-foreground">Crie mensagens personalizadas para IPTV, SSH e Contas Premium</p>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    placeholder="IPTV - Lembrete de Vencimento"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Mensagem</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESSAGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
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
                  placeholder="Olá {nome}! Seu plano {plano} vence em {dias_restantes} dias..."
                  rows={8}
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

      {/* Generate Default Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Gerar Templates Padrão
          </CardTitle>
          <CardDescription>
            Crie automaticamente templates para cada categoria com mensagens prontas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* WhatsApp Templates */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                📱 WhatsApp
              </p>
              <div className="flex flex-wrap gap-2">
                {!hasIPTVWhatsApp && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Criar 7 templates WhatsApp para IPTV?')) {
                        createDefaultTemplatesMutation.mutate({ category: 'IPTV', platform: 'whatsapp' });
                      }
                    }}
                    disabled={createDefaultTemplatesMutation.isPending}
                    className="gap-2"
                  >
                    <Tv className="h-4 w-4" />
                    IPTV
                  </Button>
                )}
                {!hasSSHWhatsApp && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Criar 7 templates WhatsApp para SSH?')) {
                        createDefaultTemplatesMutation.mutate({ category: 'SSH', platform: 'whatsapp' });
                      }
                    }}
                    disabled={createDefaultTemplatesMutation.isPending}
                    className="gap-2"
                  >
                    <Wifi className="h-4 w-4" />
                    SSH
                  </Button>
                )}
                {!hasPremiumWhatsApp && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Criar 7 templates WhatsApp para Contas Premium?')) {
                        createDefaultTemplatesMutation.mutate({ category: 'Contas Premium', platform: 'whatsapp' });
                      }
                    }}
                    disabled={createDefaultTemplatesMutation.isPending}
                    className="gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    Premium
                  </Button>
                )}
                {hasIPTVWhatsApp && hasSSHWhatsApp && hasPremiumWhatsApp && (
                  <span className="text-xs text-muted-foreground">✅ Todos criados</span>
                )}
              </div>
            </div>
            
            {/* Telegram Templates */}
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Send className="h-4 w-4" />
                Telegram
              </p>
              <div className="flex flex-wrap gap-2">
                {!hasIPTVTelegram && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Criar 7 templates Telegram para IPTV?')) {
                        createDefaultTemplatesMutation.mutate({ category: 'IPTV', platform: 'telegram' });
                      }
                    }}
                    disabled={createDefaultTemplatesMutation.isPending}
                    className="gap-2"
                  >
                    <Tv className="h-4 w-4" />
                    IPTV
                  </Button>
                )}
                {!hasSSHTelegram && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Criar 7 templates Telegram para SSH?')) {
                        createDefaultTemplatesMutation.mutate({ category: 'SSH', platform: 'telegram' });
                      }
                    }}
                    disabled={createDefaultTemplatesMutation.isPending}
                    className="gap-2"
                  >
                    <Wifi className="h-4 w-4" />
                    SSH
                  </Button>
                )}
                {!hasPremiumTelegram && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Criar 7 templates Telegram para Contas Premium?')) {
                        createDefaultTemplatesMutation.mutate({ category: 'Contas Premium', platform: 'telegram' });
                      }
                    }}
                    disabled={createDefaultTemplatesMutation.isPending}
                    className="gap-2"
                  >
                    <Crown className="h-4 w-4" />
                    Premium
                  </Button>
                )}
                {hasIPTVTelegram && hasSSHTelegram && hasPremiumTelegram && (
                  <span className="text-xs text-muted-foreground">✅ Todos criados</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New Category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Nova Categoria
          </CardTitle>
          <CardDescription>
            Crie uma nova categoria para organizar seus templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Nome da categoria"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="max-w-xs"
            />
            <Button
              variant="outline"
              onClick={() => {
                if (newCategoryName.trim()) {
                  addCategoryMutation.mutate(newCategoryName.trim());
                }
              }}
              disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          {customCategories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Suas categorias:</span>
              {customCategories.map((cat) => (
                <span key={cat.id} className="text-xs bg-muted px-2 py-1 rounded">
                  {cat.name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variables Reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            Variáveis Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {variables.map((v) => (
              <div
                key={v.name}
                className="text-xs bg-muted px-2 py-1.5 rounded"
                title={v.description}
              >
                <span className="font-mono font-medium">{v.name}</span>
                <span className="text-muted-foreground ml-1">- {v.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {templates.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-4">
            {/* Platform Filter */}
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Plataforma</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={platformFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlatformFilter('all')}
                >
                  Todas
                </Button>
                <Button
                  variant={platformFilter === 'whatsapp' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlatformFilter('whatsapp')}
                  className="gap-1"
                >
                  📱 WhatsApp
                </Button>
                <Button
                  variant={platformFilter === 'telegram' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlatformFilter('telegram')}
                  className="gap-1"
                >
                  <Send className="h-3 w-3" />
                  Telegram
                </Button>
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Categoria</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('all')}
                >
                  Todas
                </Button>
                {allCategories.map((cat) => (
                  <Button
                    key={cat}
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(cat)}
                    className="gap-1"
                  >
                    {getCategoryIcon(cat)}
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Type Filter */}
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Tipo de Mensagem</Label>
            <Tabs value={typeFilter} onValueChange={setTypeFilter}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="all">Todos</TabsTrigger>
                {MESSAGE_TYPES.map((type) => (
                  <TabsTrigger key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

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
            <p className="text-muted-foreground text-center mb-4">
              Gere templates padrão ou crie seu primeiro template
            </p>
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
            <p className="text-muted-foreground text-center">
              Tente ajustar os filtros
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="transition-all duration-200 hover:shadow-lg animate-slide-up">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full mt-1 inline-flex items-center gap-1',
                      typeColors[template.type]
                    )}>
                      {getTypeIcon(template.type)} {getTypeLabel(template.type)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-3 rounded-lg mb-4 max-h-40 overflow-y-auto">
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
