import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send, Copy, MessageCircle, CreditCard, Tv, Wifi, Crown, Tag, Loader2, WifiOff } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCrypto } from '@/hooks/useCrypto';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  telegram: string | null;
  email: string | null;
  expiration_date: string;
  plan_name: string | null;
  plan_price: number | null;
  server_name: string | null;
  login: string | null;
  password: string | null;
  premium_password: string | null;
  category?: string | null;
}

interface Template {
  id: string;
  name: string;
  type: string;
  message: string;
}

interface SendMessageDialogProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Default categories
const DEFAULT_CATEGORIES = ['IPTV', 'P2P', 'SSH', 'Contas Premium'];

export function SendMessageDialog({ client, open, onOpenChange }: SendMessageDialogProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { decrypt } = useCrypto();
  const { isPrivacyMode } = usePrivacyMode();
  const { addToQueue } = useOfflineQueue();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [message, setMessage] = useState('');
  const [platform, setPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [decryptedCredentials, setDecryptedCredentials] = useState<{
    login: string;
    password: string;
    premium_password: string;
  } | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Decrypt credentials when dialog opens (only if privacy mode is OFF)
  useEffect(() => {
    let isCancelled = false;
    
    if (open && !isPrivacyMode) {
      const decryptCredentials = async () => {
        setIsDecrypting(true);
        try {
          const [decryptedLogin, decryptedPassword, decryptedPremiumPassword] = await Promise.all([
            client.login ? decrypt(client.login) : Promise.resolve(''),
            client.password ? decrypt(client.password) : Promise.resolve(''),
            client.premium_password ? decrypt(client.premium_password) : Promise.resolve(''),
          ]);
          
          if (!isCancelled) {
            setDecryptedCredentials({
              login: decryptedLogin,
              password: decryptedPassword,
              premium_password: decryptedPremiumPassword,
            });
          }
        } catch (error) {
          console.error('Failed to decrypt credentials:', error);
          if (!isCancelled) {
            // Fallback to original values if decryption fails
            setDecryptedCredentials({
              login: client.login || '',
              password: client.password || '',
              premium_password: client.premium_password || '',
            });
          }
        } finally {
          if (!isCancelled) {
            setIsDecrypting(false);
          }
        }
      };
      decryptCredentials();
    } else if (open && isPrivacyMode) {
      // If privacy mode is ON, use masked values
      setDecryptedCredentials({
        login: '●●●●●●●●',
        password: '●●●●●●●●',
        premium_password: '●●●●●●●●',
      });
    }
    
    // Reset when dialog closes
    if (!open) {
      setDecryptedCredentials(null);
      setSelectedTemplate('');
      setMessage('');
    }
    
    return () => {
      isCancelled = true;
    };
  }, [open, client.id, client.login, client.password, client.premium_password, decrypt, isPrivacyMode]);

  // Get profile with pix_key and company_name
  const sellerProfile = profile as { 
    pix_key?: string; 
    company_name?: string;
    full_name?: string;
  } | null;

  const { data: templates = [] } = useQuery({
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

  // Get custom categories
  const { data: customCategories = [] } = useQuery({
    queryKey: ['client-categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_categories')
        .select('name')
        .eq('seller_id', user!.id)
        .order('name');
      if (error) throw error;
      return data.map(c => c.name);
    },
    enabled: !!user?.id,
  });

  // Build all categories list
  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.filter(name => !DEFAULT_CATEGORIES.includes(name))
  ];

  // Get category icon
  const getCategoryIcon = (name: string) => {
    switch (name) {
      case 'IPTV': return <Tv className="h-3 w-3" />;
      case 'P2P': return <Wifi className="h-3 w-3" />;
      case 'SSH': return <Wifi className="h-3 w-3" />;
      case 'Contas Premium': return <Crown className="h-3 w-3" />;
      default: return <Tag className="h-3 w-3" />;
    }
  };

  // Filter templates by platform and category
  const filteredTemplates = templates.filter(t => {
    // Platform filter
    if (platform === 'telegram' && !t.name.startsWith('[TG]')) return false;
    if (platform === 'whatsapp' && t.name.startsWith('[TG]')) return false;
    
    // Category filter
    if (categoryFilter !== 'all') {
      const templateName = t.name.replace('[TG] ', '').toLowerCase();
      const filterLower = categoryFilter.toLowerCase();
      
      if (categoryFilter === 'IPTV' && !templateName.includes('iptv')) return false;
      if (categoryFilter === 'P2P' && !templateName.includes('p2p')) return false;
      if (categoryFilter === 'SSH' && !templateName.includes('ssh')) return false;
      if (categoryFilter === 'Contas Premium' && !templateName.includes('premium')) return false;
      
      // For custom categories
      if (!DEFAULT_CATEGORIES.includes(categoryFilter)) {
        if (!templateName.includes(filterLower)) return false;
      }
    }
    
    return true;
  });

  const saveHistoryMutation = useMutation({
    mutationFn: async (data: { message_content: string; template_id: string | null }) => {
      const { error } = await supabase.from('message_history').insert([{
        seller_id: user!.id,
        client_id: client.id,
        template_id: data.template_id,
        message_type: selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.type || 'custom' : 'custom',
        message_content: data.message_content,
        phone: platform === 'telegram' ? (client.telegram || '') : (client.phone || ''),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-history'] });
    },
  });

  const replaceVariables = (text: string): string => {
    const expDate = new Date(client.expiration_date);
    const today = new Date();
    const daysLeft = differenceInDays(expDate, today);

    let dynamicDate = '';
    if (daysLeft === 0) dynamicDate = 'hoje';
    else if (daysLeft === 1) dynamicDate = 'amanhã';
    else if (daysLeft > 1) dynamicDate = `em ${daysLeft} dias`;
    else dynamicDate = `há ${Math.abs(daysLeft)} dias`;

    // Use decrypted credentials if available
    const login = decryptedCredentials?.login || '';
    const password = decryptedCredentials?.password || '';
    const premiumPassword = decryptedCredentials?.premium_password || '';

    return text
      .replace(/{nome}/gi, client.name)
      .replace(/{login}/gi, login)
      .replace(/{senha}/gi, password)
      .replace(/{email_premium}/gi, client.email || '')
      .replace(/{senha_premium}/gi, premiumPassword)
      .replace(/{vencimento}/gi, format(expDate, 'dd/MM/yyyy'))
      .replace(/{vencimento_dinamico}/gi, dynamicDate)
      .replace(/{preco}/gi, client.plan_price?.toFixed(2) || '0.00')
      .replace(/{valor}/gi, client.plan_price?.toFixed(2) || '0.00')
      .replace(/{dias_restantes}/gi, daysLeft.toString())
      .replace(/{servidor}/gi, client.server_name || '')
      .replace(/{plano}/gi, client.plan_name || '')
      .replace(/{pix}/gi, sellerProfile?.pix_key || '[PIX não configurado]')
      .replace(/{empresa}/gi, sellerProfile?.company_name || sellerProfile?.full_name || '')
      .replace(/{telegram}/gi, client.telegram || '')
      .replace(/{app}/gi, 'App');
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(replaceVariables(template.message));
    }
  };

  const handlePlatformChange = (newPlatform: 'whatsapp' | 'telegram') => {
    setPlatform(newPlatform);
    setSelectedTemplate('');
    setMessage('');
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategoryFilter(newCategory);
    setSelectedTemplate('');
    setMessage('');
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    const messageType = selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.type || 'custom' : 'custom';
    const phone = platform === 'telegram' ? (client.telegram || '') : (client.phone || '');

    // If offline, add to queue and open messaging app
    if (isOffline) {
      addToQueue({
        client_id: client.id,
        client_name: client.name,
        template_id: selectedTemplate || null,
        message_type: messageType,
        message_content: message,
        phone,
        platform,
      });
    } else {
      // Save to history when online
      await saveHistoryMutation.mutateAsync({
        message_content: message,
        template_id: selectedTemplate || null,
      });
    }

    if (platform === 'whatsapp' && client.phone) {
      // Open WhatsApp
      const phoneNumber = client.phone.replace(/\D/g, '');
      const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      toast.success(isOffline ? 'WhatsApp aberto (histórico será salvo quando online)' : 'Mensagem enviada via WhatsApp!');
    } else if (platform === 'telegram' && client.telegram) {
      // Open Telegram
      const username = client.telegram.replace('@', '');
      const url = `https://t.me/${username}`;
      window.open(url, '_blank');
      // Copy message to clipboard for Telegram
      navigator.clipboard.writeText(message);
      toast.success(isOffline ? 'Telegram aberto (histórico será salvo quando online)' : 'Telegram aberto e mensagem copiada!');
    } else {
      toast.error(`${platform === 'whatsapp' ? 'Telefone' : 'Telegram'} não configurado para este cliente`);
      return;
    }

    onOpenChange(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    toast.success('Mensagem copiada!');
  };

  const handleCopyPix = () => {
    if (sellerProfile?.pix_key) {
      navigator.clipboard.writeText(sellerProfile.pix_key);
      toast.success('Chave PIX copiada!');
    }
  };

  const canSend = platform === 'whatsapp' ? !!client.phone : !!client.telegram;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Mensagem</DialogTitle>
          <DialogDescription>
            Enviar mensagem para {client.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Platform Selector */}
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <Tabs value={platform} onValueChange={(v) => handlePlatformChange(v as 'whatsapp' | 'telegram')}>
              <TabsList className="w-full">
                <TabsTrigger value="whatsapp" className="flex-1 gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                  {client.phone && <span className="text-xs text-muted-foreground">✓</span>}
                </TabsTrigger>
                <TabsTrigger value="telegram" className="flex-1 gap-2">
                  <Send className="h-4 w-4" />
                  Telegram
                  {client.telegram && <span className="text-xs text-muted-foreground">✓</span>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <ScrollArea className="w-full">
              <div className="flex gap-1.5 pb-2">
                <Button
                  type="button"
                  variant={categoryFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  onClick={() => handleCategoryChange('all')}
                >
                  Todas
                </Button>
                {allCategories.map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs shrink-0 gap-1"
                    onClick={() => handleCategoryChange(cat)}
                  >
                    {getCategoryIcon(cat)}
                    {cat}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Template</Label>
              {isDecrypting && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Descriptografando...
                </span>
              )}
              {isPrivacyMode && (
                <span className="text-xs text-warning">⚠️ Modo privacidade ativo</span>
              )}
            </div>
            <Select 
              value={selectedTemplate} 
              onValueChange={handleTemplateChange}
              disabled={isDecrypting}
            >
              <SelectTrigger>
                <SelectValue placeholder={isDecrypting ? "Aguarde..." : "Selecione um template"} />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum template {categoryFilter !== 'all' ? `para ${categoryFilter}` : ''} ({platform === 'telegram' ? 'Telegram' : 'WhatsApp'})
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name.replace('[TG] ', '')}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Mensagem</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!message.trim()}
                className="h-7 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Escreva sua mensagem ou selecione um template..."
            />
          </div>

          {/* PIX Key Quick Copy */}
          {sellerProfile?.pix_key && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-xs font-medium">Chave PIX</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {sellerProfile.pix_key}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPix}
                className="h-7 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar PIX
              </Button>
            </div>
          )}

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCopy} disabled={!message.trim()}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </Button>
          <Button onClick={handleSend} disabled={!message.trim() || !canSend}>
            <Send className="h-4 w-4 mr-2" />
            {platform === 'telegram' ? 'Abrir Telegram' : 'Enviar via WhatsApp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}