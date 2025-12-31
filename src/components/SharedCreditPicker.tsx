import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Users, Monitor, Wifi, Calendar, Sparkles, Check, X, Loader2 } from 'lucide-react';
import { differenceInDays, endOfMonth } from 'date-fns';
import { useCrypto } from '@/hooks/useCrypto';

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
  panelUrl?: string;
  slotType: 'iptv' | 'p2p';
  proRataPrice: number;
  fullPrice: number;
  remainingDays: number;
  existingClients: string[];
  // Shared credentials from existing client
  sharedLogin?: string;
  sharedPassword?: string;
  // Expiration date from existing clients
  expirationDate?: string;
}

interface ServerWithCredits {
  id: string;
  name: string;
  iptv_per_credit: number;
  p2p_per_credit: number;
  credit_price: number;
  panel_url: string | null;
}

interface ClientOnServer {
  id: string;
  name: string;
  login: string | null;
  password: string | null;
  server_id: string;
  category: string | null;
  expiration_date: string;
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
  const { decrypt } = useCrypto();
  const [decrypting, setDecrypting] = useState(false);
  // Fetch ALL active servers (not just credit-based)
  const { data: servers = [] } = useQuery({
    queryKey: ['servers-all-for-shared', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select('id, name, iptv_per_credit, p2p_per_credit, credit_price, panel_url, total_screens_per_credit')
        .eq('seller_id', sellerId)
        .eq('is_active', true);
      if (error) throw error;
      return data as (ServerWithCredits & { total_screens_per_credit: number | null })[];
    },
    enabled: !!sellerId,
  });

  // Fetch clients that are on credit-based servers to find shared credentials
  const { data: clientsOnServers = [] } = useQuery({
    queryKey: ['clients-on-credit-servers', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, login, password, server_id, category, expiration_date')
        .eq('seller_id', sellerId)
        .eq('is_archived', false)
        .not('server_id', 'is', null)
        .not('login', 'is', null);
      if (error) throw error;
      return data as ClientOnServer[];
    },
    enabled: !!sellerId,
  });

  // Check if category matches slot type for highlighting the recommended option
  const getCategorySlotType = (): 'iptv' | 'p2p' | null => {
    if (category === 'P2P') return 'p2p';
    if (category === 'IPTV' || category === 'SSH') return 'iptv';
    return null;
  };

  const categorySlotType = getCategorySlotType();

  // Group clients by server and credentials to find available slots
  const getAvailableSlots = () => {
    const slots: {
      server: ServerWithCredits & { total_screens_per_credit: number | null };
      login: string;
      password: string;
      clientNames: string[];
      iptvTotal: number;
      iptvUsed: number;
      iptvAvailable: number;
      p2pTotal: number;
      p2pUsed: number;
      p2pAvailable: number;
      expirationDate?: string;
    }[] = [];

    // Filter servers by serverId if provided
    const targetServers = serverId ? servers.filter(s => s.id === serverId) : servers;

    targetServers.forEach(server => {
      // Only process servers that have credit configuration
      if (!server.iptv_per_credit && !server.p2p_per_credit && !server.total_screens_per_credit) {
        return;
      }

      // Filter clients on this server
      const serverClients = clientsOnServers.filter(c => c.server_id === server.id);
      
      // Group by login+password (each unique combo is a "credit")
      const credentialGroups = new Map<string, ClientOnServer[]>();
      
      serverClients.forEach(client => {
        if (client.login) {
          const key = `${client.login}|||${client.password || ''}`;
          const existing = credentialGroups.get(key) || [];
          existing.push(client);
          credentialGroups.set(key, existing);
        }
      });

      // Check each credential group for available slots
      credentialGroups.forEach((clients, key) => {
        const [login, password] = key.split('|||');
        
        // Count used slots by type
        const iptvUsed = clients.filter(c => c.category !== 'P2P').length;
        const p2pUsed = clients.filter(c => c.category === 'P2P').length;
        
        // Get total slots per type from server config
        const iptvTotal = server.iptv_per_credit || 0;
        const p2pTotal = server.p2p_per_credit || 0;
        
        const iptvAvailable = Math.max(0, iptvTotal - iptvUsed);
        const p2pAvailable = Math.max(0, p2pTotal - p2pUsed);

        // Get expiration date from first client to match
        const expirationDate = clients[0]?.expiration_date;

        // Only add if there are available slots of any type
        if (iptvAvailable > 0 || p2pAvailable > 0) {
          slots.push({
            server,
            login,
            password,
            clientNames: clients.map(c => c.name),
            iptvTotal,
            iptvUsed,
            iptvAvailable,
            p2pTotal,
            p2pUsed,
            p2pAvailable,
            expirationDate,
          });
        }
      });
    });

    return slots;
  };

  const availableSlots = getAvailableSlots();

  const handleSelect = useCallback(async (slot: typeof availableSlots[0], slotType: 'iptv' | 'p2p') => {
    setDecrypting(true);
    try {
      // Decrypt credentials before passing to form
      let decryptedLogin = slot.login;
      let decryptedPassword = slot.password;
      
      try {
        if (slot.login) {
          decryptedLogin = await decrypt(slot.login);
        }
        if (slot.password) {
          decryptedPassword = await decrypt(slot.password);
        }
      } catch (err) {
        // If decryption fails, credentials might be plain text (old data)
        console.warn('Decryption failed, using original values:', err);
      }
      
      const proRataCalc = calculateProRataPrice(slot.server.credit_price || 0);
      
      onSelect({
        serverId: slot.server.id,
        serverName: slot.server.name,
        panelUrl: slot.server.panel_url || undefined,
        slotType,
        proRataPrice: proRataCalc.price,
        fullPrice: slot.server.credit_price || 0,
        remainingDays: proRataCalc.remainingDays,
        existingClients: slot.clientNames,
        sharedLogin: decryptedLogin,
        sharedPassword: decryptedPassword,
        expirationDate: slot.expirationDate,
      });
    } finally {
      setDecrypting(false);
    }
  }, [decrypt, onSelect]);

  const handleDeselect = () => {
    onSelect(null);
  };

  // If no servers or no available slots, don't render
  if (servers.length === 0 || availableSlots.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-amber-600 dark:text-amber-400">
          Vagas Disponíveis em Créditos Existentes
        </h3>
      </div>

      {selectedCredit ? (
        <Card className="border-2 border-success bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold">{selectedCredit.serverName}</p>
                  <p className="text-sm text-muted-foreground">
                    Vaga {selectedCredit.slotType.toUpperCase()} • Com: {selectedCredit.existingClients.join(', ')}
                  </p>
                  {selectedCredit.sharedLogin && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Credenciais compartilhadas serão usadas
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-lg font-bold text-success">
                    R$ {selectedCredit.proRataPrice.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" />
                    {selectedCredit.remainingDays} dias restantes
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleDeselect}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {availableSlots.map((slot, index) => {
            const proRataCalc = calculateProRataPrice(slot.server.credit_price);
            const totalUsed = slot.iptvUsed + slot.p2pUsed;
            const totalSlots = slot.iptvTotal + slot.p2pTotal;
            
            return (
              <Card 
                key={`${slot.server.id}-${slot.login}-${index}`} 
                className="border-2 border-dashed border-amber-500/30 hover:border-amber-500/50 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-lg">{slot.server.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>Com: {slot.clientNames.join(', ')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {slot.server.credit_price > 0 && (
                        <p className="text-xs text-muted-foreground line-through">
                          R$ {slot.server.credit_price.toFixed(2)}/mês
                        </p>
                      )}
                      <p className="text-xl font-bold text-success">
                        R$ {proRataCalc.price.toFixed(2)}
                      </p>
                      <p className="text-xs text-amber-500 flex items-center justify-end gap-1">
                        <Calendar className="h-3 w-3" />
                        só {proRataCalc.remainingDays} dias
                      </p>
                    </div>
                  </div>

                  {/* Summary of credit usage */}
                  <div className="text-xs text-muted-foreground mb-3 p-2 rounded bg-muted/50">
                    Crédito: {totalUsed} de {totalSlots} telas usadas
                  </div>

                  {/* IPTV Slots */}
                  {slot.iptvTotal > 0 && (
                    <div className={cn(
                      "p-3 rounded-lg border-2 mb-2",
                      "border-blue-500/50 bg-blue-500/5",
                      categorySlotType === 'iptv' && "ring-2 ring-blue-500 ring-offset-2"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-blue-500" />
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            IPTV / SSH
                          </span>
                          {categorySlotType === 'iptv' && (
                            <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-500">
                              Recomendado
                            </Badge>
                          )}
                        </div>
                        <Badge 
                          variant={slot.iptvAvailable > 0 ? "default" : "secondary"}
                          className={slot.iptvAvailable > 0 ? "bg-blue-500" : ""}
                        >
                          {slot.iptvAvailable} {slot.iptvAvailable === 1 ? 'vaga' : 'vagas'}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3">
                        {slot.iptvUsed} de {slot.iptvTotal} usado(s)
                      </p>

                      <Button
                        type="button"
                        size="sm"
                        disabled={decrypting || slot.iptvAvailable <= 0}
                        className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
                        onClick={() => handleSelect(slot, 'iptv')}
                      >
                        {decrypting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Monitor className="h-4 w-4 mr-1" />
                        )}
                        {decrypting ? 'Carregando...' : slot.iptvAvailable > 0 ? 'Usar vaga IPTV' : 'Sem vagas'}
                      </Button>
                    </div>
                  )}

                  {/* P2P Slots */}
                  {slot.p2pTotal > 0 && (
                    <div className={cn(
                      "p-3 rounded-lg border-2 mb-3",
                      "border-green-500/50 bg-green-500/5",
                      categorySlotType === 'p2p' && "ring-2 ring-green-500 ring-offset-2"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4 text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            P2P
                          </span>
                          {categorySlotType === 'p2p' && (
                            <Badge variant="outline" className="text-[10px] border-green-500 text-green-500">
                              Recomendado
                            </Badge>
                          )}
                        </div>
                        <Badge 
                          variant={slot.p2pAvailable > 0 ? "default" : "secondary"}
                          className={slot.p2pAvailable > 0 ? "bg-green-500" : ""}
                        >
                          {slot.p2pAvailable} {slot.p2pAvailable === 1 ? 'vaga' : 'vagas'}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-3">
                        {slot.p2pUsed} de {slot.p2pTotal} usado(s)
                      </p>

                      <Button
                        type="button"
                        size="sm"
                        disabled={decrypting || slot.p2pAvailable <= 0}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50"
                        onClick={() => handleSelect(slot, 'p2p')}
                      >
                        {decrypting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Wifi className="h-4 w-4 mr-1" />
                        )}
                        {decrypting ? 'Carregando...' : slot.p2pAvailable > 0 ? 'Usar vaga P2P' : 'Sem vagas'}
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Credenciais serão compartilhadas automaticamente
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
