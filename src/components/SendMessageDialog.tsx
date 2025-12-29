import { useState } from 'react';
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
import { Send, Copy } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  expiration_date: string;
  plan_name: string | null;
  plan_price: number | null;
  server_name: string | null;
  login: string | null;
  password: string | null;
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

export function SendMessageDialog({ client, open, onOpenChange }: SendMessageDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [message, setMessage] = useState('');

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

  const saveHistoryMutation = useMutation({
    mutationFn: async (data: { message_content: string; template_id: string | null }) => {
      const { error } = await supabase.from('message_history').insert([{
        seller_id: user!.id,
        client_id: client.id,
        template_id: data.template_id,
        message_type: selectedTemplate ? templates.find(t => t.id === selectedTemplate)?.type || 'custom' : 'custom',
        message_content: data.message_content,
        phone: client.phone || '',
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

    return text
      .replace(/{nome}/gi, client.name)
      .replace(/{login}/gi, client.login || '')
      .replace(/{senha}/gi, client.password || '')
      .replace(/{vencimento}/gi, format(expDate, 'dd/MM/yyyy'))
      .replace(/{vencimento_dinamico}/gi, dynamicDate)
      .replace(/{preco}/gi, client.plan_price?.toFixed(2) || '0.00')
      .replace(/{dias_restantes}/gi, daysLeft.toString())
      .replace(/{servidor}/gi, client.server_name || '')
      .replace(/{plano}/gi, client.plan_name || '')
      .replace(/{app}/gi, 'App');
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(replaceVariables(template.message));
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !client.phone) return;

    // Save to history
    await saveHistoryMutation.mutateAsync({
      message_content: message,
      template_id: selectedTemplate || null,
    });

    // Open WhatsApp
    const phoneNumber = client.phone.replace(/\D/g, '');
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    toast.success('Mensagem enviada e salva no histórico!');
    onOpenChange(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    toast.success('Mensagem copiada!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar Mensagem</DialogTitle>
          <DialogDescription>
            Enviar mensagem para {client.name} via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Escreva sua mensagem ou selecione um template..."
            />
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
            <p className="font-medium mb-1">Variáveis substituídas:</p>
            <p>Nome: {client.name}</p>
            <p>Vencimento: {format(new Date(client.expiration_date), 'dd/MM/yyyy')}</p>
            {client.login && <p>Login: {client.login}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCopy} disabled={!message.trim()}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </Button>
          <Button onClick={handleSend} disabled={!message.trim() || !client.phone}>
            <Send className="h-4 w-4 mr-2" />
            Enviar via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
