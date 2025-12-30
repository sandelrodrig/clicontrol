import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Users, Monitor, Wifi, Calendar, Sparkles, Check, X } from 'lucide-react';
import { format, differenceInDays, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SharedCreditPickerProps {
  sellerId: string;
  category: string;
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
          clients:client_id (name, expiration_date)
        `)
        .eq('seller_id', sellerId);
      if (error) throw error;
      // Transform the data to match our interface
      return (data || []).map((pc: Record<string, unknown>) => ({
        ...pc,
        client: pc.clients as { name: string; expiration_date: string } | undefined,
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

  // Get available slots per server
  const getServerSlots = (server: ServerWithCredits) => {
    const serverPanelClients = panelClients.filter(pc => pc.panel_id === server.id);
    const usedIptv = serverPanelClients.filter(pc => pc.slot_type === 'iptv').length;
    const usedP2p = serverPanelClients.filter(pc => pc.slot_type === 'p2p').length;
    
    const totalIptv = server.total_credits * server.iptv_per_credit;
    const totalP2p = server.total_credits * server.p2p_per_credit;
    
    const availableIptv = totalIptv - usedIptv;
    const availableP2p = totalP2p - usedP2p;

    // Get existing clients in this server
    const existingClientNames = serverPanelClients
      .filter(pc => pc.client)
      .map(pc => pc.client!.name);

    return {
      usedIptv,
      usedP2p,
      totalIptv,
      totalP2p,
      availableIptv,
      availableP2p,
      existingClientNames,
    };
  };

  // Filter servers that have available slots for the category
  const availableServers = servers.filter(server => {
    const slots = getServerSlots(server);
    if (categorySlotType === 'iptv') return slots.availableIptv > 0;
    if (categorySlotType === 'p2p') return slots.availableP2p > 0;
    return slots.availableIptv > 0 || slots.availableP2p > 0;
  });

  const handleSelect = (server: ServerWithCredits, slotType: 'iptv' | 'p2p') => {
    const slots = getServerSlots(server);
    const proRataCalc = calculateProRataPrice(server.credit_price);
    
    onSelect({
      serverId: server.id,
      serverName: server.name,
      slotType,
      proRataPrice: proRataCalc.price,
      fullPrice: server.credit_price,
      remainingDays: proRataCalc.remainingDays,
      existingClients: slots.existingClientNames,
    });
  };

  const handleDeselect = () => {
    onSelect(null);
  };

  if (availableServers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-primary">Créditos Compartilhados</h3>
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
      
      <p className="text-sm text-muted-foreground">
        Vincule este cliente a um crédito existente e pague apenas os dias restantes do mês!
      </p>

      {selectedCredit ? (
        // Show selected credit
        <Card className="border-2 border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
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
                <p className="text-lg font-bold text-primary mt-1">
                  R$ {selectedCredit.proRataPrice.toFixed(2)}
                </p>
              </div>
            </div>
            
            {selectedCredit.existingClients.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  <Users className="h-3 w-3 inline mr-1" />
                  Clientes no mesmo crédito:
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedCredit.existingClients.slice(0, 3).map((name, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                  {selectedCredit.existingClients.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{selectedCredit.existingClients.length - 3} mais
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // Show available servers
        <div className="space-y-2">
          {availableServers.map((server) => {
            const slots = getServerSlots(server);
            const proRataCalc = calculateProRataPrice(server.credit_price);
            
            return (
              <Card 
                key={server.id} 
                className="hover:border-primary/50 transition-colors cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{server.name}</p>
                      {slots.existingClientNames.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          <Users className="h-3 w-3 inline mr-1" />
                          {slots.existingClientNames.length} cliente(s) usando
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground line-through">
                        R$ {server.credit_price.toFixed(2)}/mês
                      </p>
                      <p className="text-lg font-bold text-success">
                        R$ {proRataCalc.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                        <Calendar className="h-3 w-3" />
                        {proRataCalc.remainingDays} dias
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* IPTV Button */}
                    {server.iptv_per_credit > 0 && (categorySlotType === 'iptv' || categorySlotType === 'both') && (
                      <Button
                        type="button"
                        variant={slots.availableIptv > 0 ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "flex-1",
                          slots.availableIptv > 0 
                            ? "bg-blue-500 hover:bg-blue-600" 
                            : "opacity-50 cursor-not-allowed"
                        )}
                        disabled={slots.availableIptv <= 0}
                        onClick={() => handleSelect(server, 'iptv')}
                      >
                        <Monitor className="h-4 w-4 mr-1" />
                        IPTV ({slots.availableIptv} {slots.availableIptv === 1 ? 'vaga' : 'vagas'})
                      </Button>
                    )}
                    
                    {/* P2P Button */}
                    {server.p2p_per_credit > 0 && (categorySlotType === 'p2p' || categorySlotType === 'both') && (
                      <Button
                        type="button"
                        variant={slots.availableP2p > 0 ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "flex-1",
                          slots.availableP2p > 0 
                            ? "bg-green-500 hover:bg-green-600" 
                            : "opacity-50 cursor-not-allowed"
                        )}
                        disabled={slots.availableP2p <= 0}
                        onClick={() => handleSelect(server, 'p2p')}
                      >
                        <Wifi className="h-4 w-4 mr-1" />
                        P2P ({slots.availableP2p} {slots.availableP2p === 1 ? 'vaga' : 'vagas'})
                      </Button>
                    )}
                  </div>

                  {/* Show who's using this credit */}
                  {slots.existingClientNames.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Clientes no crédito:</p>
                      <div className="flex flex-wrap gap-1">
                        {slots.existingClientNames.slice(0, 5).map((name, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                        {slots.existingClientNames.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{slots.existingClientNames.length - 5}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
