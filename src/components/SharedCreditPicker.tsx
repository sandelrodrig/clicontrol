import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Users, Monitor, Wifi, Calendar, Sparkles, Check, X, AlertCircle } from 'lucide-react';
import { format, differenceInDays, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SharedCreditPickerProps {
  sellerId: string;
  category: string;
  serverId?: string; // Filter by selected server
  onSelect: (selection: SharedCreditSelection | null) => void;
  selectedCredit: SharedCreditSelection | null;
}

export interface SharedCreditSelection {
  serverId: string;
  serverName: string;
  slotType: 'iptv' | 'p2p';
  proRataPrice: number;
  fullPrice: number;
  remainingDays: number;
  existingClients: string[];
  // Shared credentials from existing client
  sharedLogin?: string;
  sharedPassword?: string;
}

interface ServerWithCredits {
  id: string;
  name: string;
  iptv_per_credit: number;
  p2p_per_credit: number;
  credit_price: number;
  total_credits: number;
}

interface PanelClientWithClient {
  id: string;
  panel_id: string;
  client_id: string;
  slot_type: string;
  assigned_at: string;
  client?: {
    name: string;
    expiration_date: string;
    login: string | null;
    password: string | null;
  };
}

// Calculate pro-rata price based on remaining days
const calculateProRataPrice = (monthlyPrice: number): { price: number; remainingDays: number } => {
  const today = new Date();
  const monthEnd = endOfMonth(today);
  const remainingDays = differenceInDays(monthEnd, today) + 1; // +1 to include today
  const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  
  const price = (monthlyPrice / totalDays) * remainingDays;
  return { price, remainingDays };
};

export function SharedCreditPicker({
  sellerId,
  category,
  serverId,
  onSelect,
  selectedCredit,
}: SharedCreditPickerProps) {
  // Fetch servers with credit configuration
  const { data: servers = [] } = useQuery({
    queryKey: ['servers-with-credits', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select('id, name, iptv_per_credit, p2p_per_credit, credit_price, total_credits')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .or('iptv_per_credit.gt.0,p2p_per_credit.gt.0');
      if (error) throw error;
      return data as ServerWithCredits[];
    },
    enabled: !!sellerId,
  });

  // Fetch panel_clients to see who's using each credit
  const { data: panelClients = [] } = useQuery({
    queryKey: ['all-panel-clients', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panel_clients')
        .select(`
          id,
          panel_id,
          client_id,
          slot_type,
          assigned_at,
          clients:client_id (name, expiration_date, login, password)
        `)
        .eq('seller_id', sellerId);
      if (error) throw error;
      // Transform the data to match our interface
      return (data || []).map((pc: Record<string, unknown>) => ({
        ...pc,
        client: pc.clients as { name: string; expiration_date: string; login: string | null; password: string | null } | undefined,
      })) as PanelClientWithClient[];
    },
    enabled: !!sellerId,
  });

  // Check if category matches slot type
  const getCategorySlotType = (): 'iptv' | 'p2p' | 'both' => {
    if (category === 'IPTV') return 'iptv';
    if (category === 'P2P') return 'p2p';
    return 'both';
  };

  const categorySlotType = getCategorySlotType();

  // Get available slots per server with detailed info
  const getServerSlots = (server: ServerWithCredits) => {
    const serverPanelClients = panelClients.filter(pc => pc.panel_id === server.id);
    const iptvClients = serverPanelClients.filter(pc => pc.slot_type === 'iptv');
    const p2pClients = serverPanelClients.filter(pc => pc.slot_type === 'p2p');
    
    const usedIptv = iptvClients.length;
    const usedP2p = p2pClients.length;
    
    const totalIptv = server.total_credits * server.iptv_per_credit;
    const totalP2p = server.total_credits * server.p2p_per_credit;
    
    const availableIptv = totalIptv - usedIptv;
    const availableP2p = totalP2p - usedP2p;

    // Get client names and credentials by slot type
    const iptvClientData = iptvClients
      .filter(pc => pc.client)
      .map(pc => ({ 
        name: pc.client!.name, 
        login: pc.client!.login, 
        password: pc.client!.password 
      }));
    
    const p2pClientData = p2pClients
      .filter(pc => pc.client)
      .map(pc => ({ 
        name: pc.client!.name, 
        login: pc.client!.login, 
        password: pc.client!.password 
      }));

    const iptvClientNames = iptvClientData.map(c => c.name);
    const p2pClientNames = p2pClientData.map(c => c.name);

    const existingClientNames = serverPanelClients
      .filter(pc => pc.client)
      .map(pc => pc.client!.name);

    // Get first client's credentials for sharing
    const firstIptvClient = iptvClientData[0];
    const firstP2pClient = p2pClientData[0];

    return {
      usedIptv,
      usedP2p,
      totalIptv,
      totalP2p,
      availableIptv,
      availableP2p,
      iptvClientNames,
      p2pClientNames,
      existingClientNames,
      // Credentials to share
      iptvLogin: firstIptvClient?.login || null,
      iptvPassword: firstIptvClient?.password || null,
      p2pLogin: firstP2pClient?.login || null,
      p2pPassword: firstP2pClient?.password || null,
    };
  };

  // Filter servers that have available slots for the category AND match selected server
  const availableServers = servers.filter(server => {
    // If a server is selected, only show that server's slots
    if (serverId && server.id !== serverId) return false;
    
    const slots = getServerSlots(server);
    if (categorySlotType === 'iptv') return slots.availableIptv > 0;
    if (categorySlotType === 'p2p') return slots.availableP2p > 0;
    return slots.availableIptv > 0 || slots.availableP2p > 0;
  });

  const handleSelect = (server: ServerWithCredits, slotType: 'iptv' | 'p2p') => {
    const slots = getServerSlots(server);
    const proRataCalc = calculateProRataPrice(server.credit_price);
    
    // Get shared credentials based on slot type
    const sharedLogin = slotType === 'iptv' ? slots.iptvLogin : slots.p2pLogin;
    const sharedPassword = slotType === 'iptv' ? slots.iptvPassword : slots.p2pPassword;
    
    onSelect({
      serverId: server.id,
      serverName: server.name,
      slotType,
      proRataPrice: proRataCalc.price,
      fullPrice: server.credit_price,
      remainingDays: proRataCalc.remainingDays,
      existingClients: slots.existingClientNames,
      sharedLogin: sharedLogin || undefined,
      sharedPassword: sharedPassword || undefined,
    });
  };

  const handleDeselect = () => {
    onSelect(null);
  };

  if (availableServers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-500/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-amber-600 dark:text-amber-400">Vagas em Créditos Existentes</h3>
        </div>
        {selectedCredit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDeselect}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Remover
          </Button>
        )}
      </div>
      
      <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-600 dark:text-amber-400">
          <strong>Não perca vagas!</strong> Vincule este cliente a um crédito que já tem outro cliente. 
          Você só cobra os dias restantes do mês (pro-rata).
        </p>
      </div>

      {selectedCredit ? (
        // Show selected credit
        <Card className="border-2 border-success bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  {selectedCredit.slotType === 'iptv' ? (
                    <Monitor className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Wifi className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{selectedCredit.serverName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCredit.slotType.toUpperCase()} • {selectedCredit.remainingDays} dias restantes
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="bg-success/10 text-success">
                  <Check className="h-3 w-3 mr-1" />
                  Selecionado
                </Badge>
                <p className="text-lg font-bold text-success mt-1">
                  R$ {selectedCredit.proRataPrice.toFixed(2)}
                </p>
              </div>
            </div>
            
            {selectedCredit.existingClients.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  <Users className="h-3 w-3 inline mr-1" />
                  Vai dividir crédito com:
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedCredit.existingClients.map((name, i) => (
                    <Badge key={i} variant="outline" className="text-xs bg-background">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Show available servers
        <div className="space-y-3">
          {availableServers.map((server) => {
            const slots = getServerSlots(server);
            const proRataCalc = calculateProRataPrice(server.credit_price);
            const iptvPercentUsed = slots.totalIptv > 0 ? (slots.usedIptv / slots.totalIptv) * 100 : 0;
            const p2pPercentUsed = slots.totalP2p > 0 ? (slots.usedP2p / slots.totalP2p) * 100 : 0;
            
            return (
              <Card 
                key={server.id} 
                className="border-2 border-dashed border-amber-500/30 hover:border-amber-500/50 transition-colors"
              >
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-lg">{server.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {server.total_credits} crédito(s) • {server.iptv_per_credit} IPTV + {server.p2p_per_credit} P2P por crédito
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground line-through">
                        R$ {server.credit_price.toFixed(2)}/mês
                      </p>
                      <p className="text-xl font-bold text-success">
                        R$ {proRataCalc.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-amber-500 flex items-center justify-end gap-1">
                        <Calendar className="h-3 w-3" />
                        só {proRataCalc.remainingDays} dias
                      </p>
                    </div>
                  </div>

                  {/* Slot Status Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {/* IPTV Slots */}
                    {server.iptv_per_credit > 0 && (categorySlotType === 'iptv' || categorySlotType === 'both') && (
                      <div className={cn(
                        "p-3 rounded-lg border-2",
                        slots.availableIptv > 0 
                          ? "border-blue-500/50 bg-blue-500/5" 
                          : "border-muted bg-muted/30 opacity-60"
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-blue-500" />
                            <span className="font-semibold text-blue-600 dark:text-blue-400">IPTV</span>
                          </div>
                          <Badge 
                            variant={slots.availableIptv > 0 ? "default" : "secondary"}
                            className={slots.availableIptv > 0 ? "bg-blue-500" : ""}
                          >
                            {slots.availableIptv} {slots.availableIptv === 1 ? 'vaga' : 'vagas'}
                          </Badge>
                        </div>
                        
                        <Progress 
                          value={iptvPercentUsed} 
                          className="h-2 mb-2 [&>div]:bg-blue-500"
                        />
                        
                        <p className="text-xs text-muted-foreground mb-2">
                          {slots.usedIptv} de {slots.totalIptv} usado(s)
                        </p>

                        {slots.iptvClientNames.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground mb-1">Clientes IPTV:</p>
                            <div className="flex flex-wrap gap-1">
                              {slots.iptvClientNames.map((name, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-blue-500/10 border-blue-500/30">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {slots.availableIptv > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            className="w-full bg-blue-500 hover:bg-blue-600"
                            onClick={() => handleSelect(server, 'iptv')}
                          >
                            <Monitor className="h-4 w-4 mr-1" />
                            Usar vaga IPTV
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* P2P Slots */}
                    {server.p2p_per_credit > 0 && (categorySlotType === 'p2p' || categorySlotType === 'both') && (
                      <div className={cn(
                        "p-3 rounded-lg border-2",
                        slots.availableP2p > 0 
                          ? "border-green-500/50 bg-green-500/5" 
                          : "border-muted bg-muted/30 opacity-60"
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Wifi className="h-4 w-4 text-green-500" />
                            <span className="font-semibold text-green-600 dark:text-green-400">P2P</span>
                          </div>
                          <Badge 
                            variant={slots.availableP2p > 0 ? "default" : "secondary"}
                            className={slots.availableP2p > 0 ? "bg-green-500" : ""}
                          >
                            {slots.availableP2p} {slots.availableP2p === 1 ? 'vaga' : 'vagas'}
                          </Badge>
                        </div>
                        
                        <Progress 
                          value={p2pPercentUsed} 
                          className="h-2 mb-2 [&>div]:bg-green-500"
                        />
                        
                        <p className="text-xs text-muted-foreground mb-2">
                          {slots.usedP2p} de {slots.totalP2p} usado(s)
                        </p>

                        {slots.p2pClientNames.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground mb-1">Clientes P2P:</p>
                            <div className="flex flex-wrap gap-1">
                              {slots.p2pClientNames.map((name, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-green-500/10 border-green-500/30">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {slots.availableP2p > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            className="w-full bg-green-500 hover:bg-green-600"
                            onClick={() => handleSelect(server, 'p2p')}
                          >
                            <Wifi className="h-4 w-4 mr-1" />
                            Usar vaga P2P
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
