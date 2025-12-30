import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCrypto } from '@/hooks/useCrypto';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Upload, 
  FileJson, 
  FileSpreadsheet, 
  AlertCircle, 
  Loader2, 
  Check,
  Users,
  HelpCircle
} from 'lucide-react';
import { format, addDays, parseISO, isValid } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ParsedClient {
  name: string;
  phone: string | null;
  login: string | null;
  password: string | null;
  email: string | null;
  category: string;
  expiration_date: string | null;
  plan_name: string | null;
  plan_price: number | null;
  notes: string | null;
  device: string | null;
  is_paid: boolean;
  valid: boolean;
  error?: string;
}

interface Seller {
  id: string;
  email: string;
  full_name: string | null;
}

const VALID_CATEGORIES = ['IPTV', 'P2P', 'Contas Premium', 'SSH'];

export function ImportClientsFromProject() {
  const { user, isAdmin } = useAuth();
  const { encrypt } = useCrypto();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('IPTV');
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [importType, setImportType] = useState<'json' | 'csv'>('json');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch sellers for admin to assign clients
  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers-for-import'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');
      if (error) throw error;
      return data as Seller[];
    },
    enabled: isAdmin && isOpen,
  });

  if (!isAdmin) return null;

  const normalizeCategory = (cat: string): string => {
    const normalized = cat?.trim() || '';
    const found = VALID_CATEGORIES.find(
      c => c.toLowerCase() === normalized.toLowerCase()
    );
    return found || defaultCategory;
  };

  const parseDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    
    // Try ISO format first
    const isoDate = parseISO(dateStr);
    if (isValid(isoDate)) {
      return format(isoDate, 'yyyy-MM-dd');
    }

    // Try Brazilian format DD/MM/YYYY
    const brParts = dateStr.split('/');
    if (brParts.length === 3) {
      const [day, month, year] = brParts;
      const brDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (isValid(brDate)) {
        return format(brDate, 'yyyy-MM-dd');
      }
    }

    return null;
  };

  const parseJSON = (text: string): ParsedClient[] => {
    try {
      const data = JSON.parse(text);
      
      // Handle array of clients
      const clients = Array.isArray(data) ? data : data.clients || data.data?.clients || [data];
      
      return clients.map((client: Record<string, unknown>, index: number) => {
        const name = String(client.name || client.nome || '').trim();
        
        if (!name || name.length < 2) {
          return {
            name: name || '(sem nome)',
            phone: null,
            login: null,
            password: null,
            email: null,
            category: defaultCategory,
            expiration_date: null,
            plan_name: null,
            plan_price: null,
            notes: null,
            device: null,
            is_paid: true,
            valid: false,
            error: `Cliente ${index + 1}: Nome inválido ou muito curto`
          };
        }

        const phone = String(client.phone || client.telefone || client.whatsapp || '').replace(/\D/g, '') || null;
        const login = String(client.login || client.usuario || '').trim() || null;
        const password = String(client.password || client.senha || '').trim() || null;
        const email = String(client.email || client.premium_email || '').trim() || null;
        const category = normalizeCategory(String(client.category || client.categoria || ''));
        const expirationStr = String(client.expiration_date || client.expiracao || client.vencimento || '').trim();
        const expiration_date = parseDate(expirationStr) || format(addDays(new Date(), 30), 'yyyy-MM-dd');
        const plan_name = String(client.plan_name || client.plano || '').trim() || null;
        const plan_price = client.plan_price ? Number(client.plan_price) : (client.valor ? Number(client.valor) : null);
        const notes = String(client.notes || client.observacoes || client.obs || '').trim() || null;
        const device = String(client.device || client.dispositivo || '').trim() || null;
        const is_paid = client.is_paid !== undefined ? Boolean(client.is_paid) : true;

        return {
          name: name.slice(0, 100),
          phone: phone?.slice(0, 20) || null,
          login: login?.slice(0, 100) || null,
          password: password?.slice(0, 100) || null,
          email: email?.slice(0, 255) || null,
          category,
          expiration_date,
          plan_name: plan_name?.slice(0, 100) || null,
          plan_price,
          notes: notes?.slice(0, 500) || null,
          device: device?.slice(0, 100) || null,
          is_paid,
          valid: true
        };
      });
    } catch (error) {
      return [{
        name: '',
        phone: null,
        login: null,
        password: null,
        email: null,
        category: defaultCategory,
        expiration_date: null,
        plan_name: null,
        plan_price: null,
        notes: null,
        device: null,
        is_paid: true,
        valid: false,
        error: `Erro ao processar JSON: ${(error as Error).message}`
      }];
    }
  };

  const parseCSV = (text: string): ParsedClient[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return [];
    }

    // Check if first line is a header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('nome') || firstLine.includes('name') || firstLine.includes('client');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines.map((line, index) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const trimmedParts = parts.map(p => p.trim().replace(/^["']|["']$/g, ''));

      const [
        name = '',
        phone = '',
        login = '',
        password = '',
        categoryInput = '',
        expirationStr = '',
        plan_name = '',
        plan_price = '',
        email = '',
        notes = ''
      ] = trimmedParts;

      if (!name || name.length < 2) {
        return {
          name: name || '(sem nome)',
          phone: null,
          login: null,
          password: null,
          email: null,
          category: defaultCategory,
          expiration_date: null,
          plan_name: null,
          plan_price: null,
          notes: null,
          device: null,
          is_paid: true,
          valid: false,
          error: `Linha ${index + (hasHeader ? 2 : 1)}: Nome inválido`
        };
      }

      const category = normalizeCategory(categoryInput);
      const expiration_date = parseDate(expirationStr) || format(addDays(new Date(), 30), 'yyyy-MM-dd');

      return {
        name: name.slice(0, 100),
        phone: phone.replace(/\D/g, '').slice(0, 20) || null,
        login: login.slice(0, 100) || null,
        password: password.slice(0, 100) || null,
        email: email.slice(0, 255) || null,
        category,
        expiration_date,
        plan_name: plan_name.slice(0, 100) || null,
        plan_price: plan_price ? Number(plan_price) : null,
        notes: notes.slice(0, 500) || null,
        device: null,
        is_paid: true,
        valid: true
      };
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      
      // Auto-detect format
      if (file.name.endsWith('.json')) {
        setImportType('json');
      } else if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        setImportType('csv');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePreview = () => {
    if (!inputText.trim()) {
      toast.error('Cole ou carregue os dados dos clientes');
      return;
    }
    if (!selectedSellerId) {
      toast.error('Selecione um vendedor para atribuir os clientes');
      return;
    }

    const parsed = importType === 'json' ? parseJSON(inputText) : parseCSV(inputText);
    setParsedClients(parsed);
    setStep('preview');
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const validClients = parsedClients.filter(c => c.valid);
      if (validClients.length === 0) {
        throw new Error('Nenhum cliente válido para importar');
      }

      // Prepare clients with encrypted credentials
      const clientsToInsert = await Promise.all(
        validClients.map(async (client) => {
          const encryptedLogin = client.login ? await encrypt(client.login) : null;
          const encryptedPassword = client.password ? await encrypt(client.password) : null;

          return {
            seller_id: selectedSellerId,
            name: client.name,
            phone: client.phone,
            login: encryptedLogin,
            password: encryptedPassword,
            email: client.email,
            category: client.category,
            expiration_date: client.expiration_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
            plan_name: client.plan_name,
            plan_price: client.plan_price,
            notes: client.notes,
            device: client.device,
            is_paid: client.is_paid,
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

  const handleClose = () => {
    setIsOpen(false);
    setInputText('');
    setSelectedSellerId('');
    setDefaultCategory('IPTV');
    setParsedClients([]);
    setStep('input');
    setImportType('json');
  };

  const validCount = parsedClients.filter(c => c.valid).length;
  const invalidCount = parsedClients.filter(c => !c.valid).length;

  const categoryStats = parsedClients
    .filter(c => c.valid)
    .reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Importar Clientes de Outro Projeto
        </CardTitle>
        <CardDescription>
          Importe clientes de outro projeto via JSON ou CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Exporte os clientes do outro projeto (JSON/CSV) e importe aqui para um vendedor específico.
        </p>
        
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) handleClose();
          else setIsOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Importar Clientes
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Importar Clientes de Outro Projeto
              </DialogTitle>
              <DialogDescription>
                {step === 'input' 
                  ? 'Cole o JSON/CSV exportado do outro projeto ou carregue um arquivo' 
                  : `Confirme os ${validCount} cliente(s) a serem importados`}
              </DialogDescription>
            </DialogHeader>

            {step === 'input' ? (
              <div className="space-y-4 flex-1 overflow-y-auto">
                {/* Seller selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Vendedor Destino *
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Selecione o vendedor que receberá os clientes importados</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o vendedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.full_name || seller.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Format tabs */}
                <Tabs value={importType} onValueChange={(v) => setImportType(v as 'json' | 'csv')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="json" className="gap-2">
                      <FileJson className="h-4 w-4" />
                      JSON
                    </TabsTrigger>
                    <TabsTrigger value="csv" className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="json" className="space-y-3 mt-3">
                    <Alert>
                      <FileJson className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Aceita JSON exportado do Supabase/Lovable. Campos reconhecidos: name/nome, phone/telefone, login/usuario, password/senha, category/categoria, expiration_date/vencimento, plan_name/plano, plan_price/valor, email, notes/observacoes
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                  
                  <TabsContent value="csv" className="space-y-3 mt-3">
                    <Alert>
                      <FileSpreadsheet className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Formato: Nome, Telefone, Login, Senha, Categoria, Vencimento, Plano, Valor, Email, Observações (separado por vírgula ou tab)
                      </AlertDescription>
                    </Alert>
                  </TabsContent>
                </Tabs>

                {/* File upload */}
                <div className="space-y-2">
                  <Label>Carregar Arquivo</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,.txt"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                </div>

                {/* Default category */}
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
                    Usada quando a categoria não for encontrada nos dados
                  </p>
                </div>

                {/* Text area */}
                <div className="space-y-2">
                  <Label>Dados dos Clientes</Label>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={importType === 'json' 
                      ? '[\n  {"name": "João Silva", "phone": "11999998888", "login": "joao123", ...}\n]'
                      : 'Nome,Telefone,Login,Senha,Categoria,Vencimento,Plano,Valor\nJoão Silva,11999998888,joao123,senha123,IPTV,2024-02-15,Mensal,25'}
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button onClick={handlePreview} disabled={!inputText.trim() || !selectedSellerId}>
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
                  {selectedSeller && (
                    <Badge variant="secondary">
                      Vendedor: {selectedSeller.full_name || selectedSeller.email}
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
                            <span className="font-medium truncate">{client.name}</span>
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
                              {client.expiration_date && ` • 📅 ${client.expiration_date}`}
                              {client.plan_name && ` • 📦 ${client.plan_name}`}
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
      </CardContent>
    </Card>
  );
}
