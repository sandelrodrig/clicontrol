import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCrypto } from '@/hooks/useCrypto';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Upload, Copy, Check, AlertCircle, Loader2, FileSpreadsheet, HelpCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
}

interface BulkImportClientsProps {
  plans: Plan[];
}

interface ParsedClient {
  name: string;
  phone: string;
  login: string;
  password: string;
  category: string;
  valid: boolean;
  error?: string;
}

const VALID_CATEGORIES = ['IPTV', 'P2P', 'Contas Premium', 'SSH'];

const TEMPLATE = `João Silva,11999998888,joao123,senha123,IPTV
Maria Santos,11988887777,maria456,senha456,P2P
Pedro Souza,11977776666,pedro789,senha789,Contas Premium
Ana Lima,11966665555,ana321,senha321,SSH`;

const TEMPLATE_HEADER = "Nome,Telefone,Login,Senha,Categoria";

export function BulkImportClients({ plans }: BulkImportClientsProps) {
  const { user } = useAuth();
  const { encrypt } = useCrypto();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('IPTV');
  const [copied, setCopied] = useState(false);
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const normalizeCategory = (cat: string): string => {
    const normalized = cat.trim();
    // Case-insensitive matching
    const found = VALID_CATEGORIES.find(
      c => c.toLowerCase() === normalized.toLowerCase()
    );
    return found || '';
  };

  const parseClients = (text: string): ParsedClient[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      // Support both comma and tab separated values
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const trimmedParts = parts.map(p => p.trim());
      
      if (trimmedParts.length < 1 || !trimmedParts[0]) {
        return { name: '', phone: '', login: '', password: '', category: defaultCategory, valid: false, error: `Linha ${index + 1}: Nome é obrigatório` };
      }

      const [name, phone = '', login = '', password = '', categoryInput = ''] = trimmedParts;

      // Basic validation
      if (name.length < 2) {
        return { name, phone, login, password, category: defaultCategory, valid: false, error: `Linha ${index + 1}: Nome muito curto` };
      }

      // Determine category - use provided or default
      let category = defaultCategory;
      if (categoryInput) {
        const normalized = normalizeCategory(categoryInput);
        if (normalized) {
          category = normalized;
        } else {
          return { 
            name, phone, login, password, category: categoryInput, 
            valid: false, 
            error: `Linha ${index + 1}: Categoria "${categoryInput}" inválida. Use: IPTV, P2P, Contas Premium ou SSH` 
          };
        }
      }

      return { 
        name: name.slice(0, 100),
        phone: phone.replace(/\D/g, '').slice(0, 20),
        login: login.slice(0, 100),
        password: password.slice(0, 100),
        category,
        valid: true 
      };
    });
  };

  const handlePreview = () => {
    if (!inputText.trim()) {
      toast.error('Cole os dados dos clientes');
      return;
    }
    if (!selectedPlanId) {
      toast.error('Selecione um plano');
      return;
    }

    const parsed = parseClients(inputText);
    setParsedClients(parsed);
    setStep('preview');
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const validClients = parsedClients.filter(c => c.valid);
      if (validClients.length === 0) {
        throw new Error('Nenhum cliente válido para importar');
      }

      const plan = plans.find(p => p.id === selectedPlanId);
      if (!plan) throw new Error('Plano não encontrado');

      const expirationDate = format(addDays(new Date(), plan.duration_days), 'yyyy-MM-dd');

      // Prepare clients with encrypted credentials
      const clientsToInsert = await Promise.all(
        validClients.map(async (client) => {
          const encryptedLogin = client.login ? await encrypt(client.login) : null;
          const encryptedPassword = client.password ? await encrypt(client.password) : null;

          return {
            seller_id: user!.id,
            name: client.name,
            phone: client.phone || null,
            login: encryptedLogin,
            password: encryptedPassword,
            plan_id: plan.id,
            plan_name: plan.name,
            plan_price: plan.price,
            expiration_date: expirationDate,
            category: client.category,
            is_paid: true,
          };
        })
      );

      const { error } = await supabase.from('clients').insert(clientsToInsert);
      if (error) throw error;

      return validClients.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`${count} cliente(s) importado(s) com sucesso!`);
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(`${TEMPLATE_HEADER}\n${TEMPLATE}`);
      setCopied(true);
      toast.success('Template copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setInputText('');
    setSelectedPlanId('');
    setDefaultCategory('IPTV');
    setParsedClients([]);
    setStep('input');
  };

  const validCount = parsedClients.filter(c => c.valid).length;
  const invalidCount = parsedClients.filter(c => !c.valid).length;

  // Count by category
  const categoryStats = parsedClients
    .filter(c => c.valid)
    .reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Importar em Massa</span>
          <span className="sm:hidden">Importar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Clientes em Massa
          </DialogTitle>
          <DialogDescription>
            {step === 'input' 
              ? 'Cole os dados: Nome, Telefone, Login, Senha, Categoria' 
              : `Confirme os ${validCount} cliente(s) a serem importados`}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Template section */}
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Template de exemplo</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Copie o template e edite. A categoria é opcional - se não informar, usa a padrão selecionada abaixo.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTemplate}
                  className="gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
              <pre className="text-xs bg-background rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                <span className="text-muted-foreground">{TEMPLATE_HEADER}</span>
                {'\n'}
                {TEMPLATE}
              </pre>
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Categorias válidas:</span>
                {VALID_CATEGORIES.map(cat => (
                  <Badge key={cat} variant="outline" className="text-xs py-0">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Config section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Plano *</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {plan.price.toFixed(2)} ({plan.duration_days} dias)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria Padrão</Label>
                <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Usada quando a categoria não for informada na linha
                </p>
              </div>
            </div>

            {/* Input area */}
            <div className="space-y-2">
              <Label>Dados dos Clientes *</Label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Cole aqui os dados dos clientes...\n\nFormato:\nNome,Telefone,Login,Senha,Categoria\n\nExemplo:\nJoão Silva,11999998888,joao123,senha123,IPTV\nMaria Santos,11988887777,maria456,senha456,P2P`}
                className="min-h-[160px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Um cliente por linha. Categoria é opcional (usa a padrão se não informar).
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handlePreview} disabled={!inputText.trim() || !selectedPlanId}>
                Visualizar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Summary */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default" className="gap-1">
                <Check className="h-3 w-3" />
                {validCount} válido(s)
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {invalidCount} com erro
                </Badge>
              )}
              {selectedPlan && (
                <Badge variant="secondary">
                  {selectedPlan.name} - R$ {selectedPlan.price.toFixed(2)}
                </Badge>
              )}
            </div>

            {/* Category breakdown */}
            {Object.keys(categoryStats).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Por categoria:</span>
                {Object.entries(categoryStats).map(([cat, count]) => (
                  <Badge key={cat} variant="outline" className="text-xs">
                    {cat}: {count}
                  </Badge>
                ))}
              </div>
            )}

            {/* Preview list */}
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-2 space-y-1">
                {parsedClients.map((client, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded text-sm ${
                      client.valid 
                        ? 'bg-green-500/10 border border-green-500/20' 
                        : 'bg-destructive/10 border border-destructive/20'
                    }`}
                  >
                    {client.valid ? (
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{client.name || '(sem nome)'}</span>
                        {client.valid && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {client.category}
                          </Badge>
                        )}
                      </div>
                      {client.valid ? (
                        <div className="text-xs text-muted-foreground truncate">
                          {client.phone && `📱 ${client.phone}`}
                          {client.login && ` • 👤 ${client.login}`}
                          {client.password && ` • 🔑 ****`}
                        </div>
                      ) : (
                        <div className="text-xs text-destructive">{client.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {invalidCount > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {invalidCount} cliente(s) com erro serão ignorados na importação.
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep('input')}>
                Voltar
              </Button>
              <Button 
                onClick={() => importMutation.mutate()} 
                disabled={validCount === 0 || importMutation.isPending}
                className="gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar {validCount} Cliente(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
