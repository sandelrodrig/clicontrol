import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Heart, Users, Send, CheckCircle, X, Play, Pause, RotateCcw, Gift, Star, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSentMessages } from '@/hooks/useSentMessages';

interface Client {
  id: string;
  name: string;
  phone: string | null;
  telegram: string | null;
  is_archived: boolean | null;
}

interface Template {
  id: string;
  name: string;
  type: string;
  message: string;
}

interface BulkLoyaltyMessageProps {
  clients: Client[];
  templates: Template[];
  onSendMessage: (client: Client, template: Template) => void;
  isDialogOpen: boolean;
}

const DAILY_LIMIT_KEY = 'bulk_loyalty_daily_limit';
const DAILY_PROGRESS_KEY = 'bulk_loyalty_daily_progress';

interface DailyProgress {
  date: string;
  count: number;
  templateType: string;
}

export function BulkLoyaltyMessage({ 
  clients, 
  templates, 
  onSendMessage,
  isDialogOpen 
}: BulkLoyaltyMessageProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState<'loyalty' | 'referral'>('loyalty');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [dailyLimit, setDailyLimit] = useState<number>(10);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>({ date: '', count: 0, templateType: '' });
  const [queue, setQueue] = useState<Client[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  
  const { 
    isSent, 
    getSentCountByType, 
    getClientsSentByType,
    clearAllSentMarks 
  } = useSentMessages();

  // Load daily limit and progress from localStorage
  useEffect(() => {
    const savedLimit = localStorage.getItem(DAILY_LIMIT_KEY);
    if (savedLimit) setDailyLimit(parseInt(savedLimit, 10));

    const savedProgress = localStorage.getItem(DAILY_PROGRESS_KEY);
    if (savedProgress) {
      const progress = JSON.parse(savedProgress) as DailyProgress;
      const today = new Date().toISOString().split('T')[0];
      // Reset if it's a new day
      if (progress.date !== today) {
        setDailyProgress({ date: today, count: 0, templateType: '' });
      } else {
        setDailyProgress(progress);
      }
    } else {
      setDailyProgress({ date: new Date().toISOString().split('T')[0], count: 0, templateType: '' });
    }
  }, []);

  // Filter templates by type
  const filteredTemplates = templates.filter(t => t.type === selectedTemplateType);

  // Get active (non-archived) clients with phone
  const activeClients = clients.filter(c => !c.is_archived && c.phone);

  // Get clients not yet contacted for the selected template type
  const sentClientIds = getClientsSentByType(selectedTemplateType);
  const pendingClients = activeClients.filter(c => !sentClientIds.includes(c.id));
  const sentClients = activeClients.filter(c => sentClientIds.includes(c.id));

  // Calculate remaining for today
  const remainingToday = Math.max(0, dailyLimit - dailyProgress.count);

  // Handle template type change
  const handleTemplateTypeChange = (type: 'loyalty' | 'referral') => {
    setSelectedTemplateType(type);
    setSelectedTemplateId('');
    setQueue([]);
    setCurrentIndex(0);
    setIsPaused(true);
  };

  // Save daily limit
  const saveDailyLimit = (limit: number) => {
    setDailyLimit(limit);
    localStorage.setItem(DAILY_LIMIT_KEY, limit.toString());
  };

  // Start bulk sending
  const startBulkSending = () => {
    if (!selectedTemplateId) {
      toast.error('Selecione um template primeiro!');
      return;
    }
    
    const clientsToSend = pendingClients.slice(0, remainingToday);
    if (clientsToSend.length === 0) {
      toast.info('Não há clientes pendentes ou você atingiu o limite diário!');
      return;
    }

    setQueue(clientsToSend);
    setCurrentIndex(0);
    setIsPaused(false);
  };

  // When dialog closes and queue is active, process next
  useEffect(() => {
    if (!isDialogOpen && !isPaused && queue.length > 0 && currentIndex < queue.length) {
      // Update daily progress
      const newProgress = {
        date: new Date().toISOString().split('T')[0],
        count: dailyProgress.count + 1,
        templateType: selectedTemplateType
      };
      setDailyProgress(newProgress);
      localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify(newProgress));

      // Move to next client after a delay
      const timer = setTimeout(() => {
        if (currentIndex + 1 < queue.length && currentIndex + 1 < remainingToday) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // Queue complete
          setIsPaused(true);
          setQueue([]);
          toast.success(`Envio concluído! ${currentIndex + 1} mensagens enviadas.`);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isDialogOpen, isPaused, currentIndex, queue.length]);

  // Trigger send for current client
  useEffect(() => {
    if (!isPaused && queue.length > 0 && currentIndex < queue.length) {
      const client = queue[currentIndex];
      const template = templates.find(t => t.id === selectedTemplateId);
      if (client && template) {
        onSendMessage(client, template);
      }
    }
  }, [currentIndex, isPaused, queue]);

  // Cancel bulk sending
  const cancelBulkSending = () => {
    setIsPaused(true);
    setQueue([]);
    setCurrentIndex(0);
  };

  // Reset all sent marks for this type
  const handleResetSentMarks = () => {
    if (confirm(`Limpar todas as marcações de envio para ${selectedTemplateType === 'loyalty' ? 'Fidelização' : 'Indicação'}?`)) {
      clearAllSentMarks(selectedTemplateType);
      toast.success('Marcações limpas!');
    }
  };

  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Gift className="h-4 w-4" />
          Campanha de Fidelização
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Campanha de Fidelização e Indicação
          </DialogTitle>
          <DialogDescription>
            Envie mensagens de agradecimento e peça indicações para seus clientes ativos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Type Selection */}
          <div className="flex gap-2">
            <Button
              variant={selectedTemplateType === 'loyalty' ? 'default' : 'outline'}
              onClick={() => handleTemplateTypeChange('loyalty')}
              className="flex-1 gap-2"
            >
              <Heart className="h-4 w-4" />
              Fidelização
              <Badge variant="secondary" className="ml-1">
                {getSentCountByType('loyalty')}/{activeClients.length}
              </Badge>
            </Button>
            <Button
              variant={selectedTemplateType === 'referral' ? 'default' : 'outline'}
              onClick={() => handleTemplateTypeChange('referral')}
              className="flex-1 gap-2"
            >
              <Users className="h-4 w-4" />
              Indicação
              <Badge variant="secondary" className="ml-1">
                {getSentCountByType('referral')}/{activeClients.length}
              </Badge>
            </Button>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template..." />
              </SelectTrigger>
              <SelectContent>
                {filteredTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filteredTemplates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum template de {selectedTemplateType === 'loyalty' ? 'Fidelização' : 'Indicação'} encontrado. 
                Crie templates na página de Templates.
              </p>
            )}
          </div>

          {/* Daily Limit */}
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label>Limite diário de envios</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={dailyLimit}
                onChange={(e) => saveDailyLimit(Math.min(50, Math.max(1, parseInt(e.target.value) || 10)))}
                className="w-24"
              />
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Enviados hoje</p>
              <p className="text-2xl font-bold">
                {dailyProgress.count} <span className="text-sm font-normal text-muted-foreground">/ {dailyLimit}</span>
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{activeClients.length}</p>
                <p className="text-xs text-muted-foreground">Clientes Ativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Phone className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">{pendingClients.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{sentClients.length}</p>
                <p className="text-xs text-muted-foreground">Já Enviados</p>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar (when sending) */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso</span>
                <span>{currentIndex + 1} de {queue.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
              {!isPaused && queue[currentIndex] && (
                <p className="text-sm text-muted-foreground animate-pulse">
                  Enviando para: {queue[currentIndex].name}...
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {queue.length === 0 ? (
              <Button 
                onClick={startBulkSending} 
                disabled={!selectedTemplateId || remainingToday === 0 || pendingClients.length === 0}
                className="flex-1 gap-2"
              >
                <Play className="h-4 w-4" />
                Iniciar Envio ({Math.min(pendingClients.length, remainingToday)} clientes)
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setIsPaused(!isPaused)} 
                  className="flex-1 gap-2"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {isPaused ? 'Continuar' : 'Pausar'}
                </Button>
                <Button 
                  variant="destructive"
                  onClick={cancelBulkSending}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </>
            )}
            <Button 
              variant="ghost"
              onClick={handleResetSentMarks}
              className="gap-2"
              title="Limpar todas as marcações"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Pending Clients Preview */}
          {pendingClients.length > 0 && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Próximos na fila ({Math.min(pendingClients.length, 5)} de {pendingClients.length})
              </Label>
              <ScrollArea className="h-32 rounded-md border p-2">
                <div className="space-y-1">
                  {pendingClients.slice(0, 5).map((client, i) => (
                    <div 
                      key={client.id} 
                      className={cn(
                        "flex items-center gap-2 p-2 rounded text-sm",
                        queue.length > 0 && queue[currentIndex]?.id === client.id && "bg-primary/10"
                      )}
                    >
                      <span className="text-muted-foreground w-6">{i + 1}.</span>
                      <span className="font-medium flex-1">{client.name}</span>
                      <span className="text-muted-foreground text-xs">{client.phone}</span>
                    </div>
                  ))}
                  {pendingClients.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      +{pendingClients.length - 5} clientes...
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
