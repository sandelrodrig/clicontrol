import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCrypto } from '@/hooks/useCrypto';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useOfflineClients } from '@/hooks/useOfflineClients';
import { useSentMessages } from '@/hooks/useSentMessages';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Search, Phone, Mail, Calendar as CalendarIcon, CreditCard, User, Trash2, Edit, Eye, EyeOff, MessageCircle, RefreshCw, Lock, Loader2, Monitor, Smartphone, Tv, Gamepad2, Laptop, Flame, ChevronDown, ExternalLink, AppWindow, Send, Archive, RotateCcw, Sparkles, Server, Copy, UserPlus, WifiOff, CheckCircle, X } from 'lucide-react';
import { BulkImportClients } from '@/components/BulkImportClients';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { format, addDays, addMonths, isBefore, isAfter, startOfToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SendMessageDialog } from '@/components/SendMessageDialog';
import { PlanSelector } from '@/components/PlanSelector';
import { SharedCreditPicker, SharedCreditSelection } from '@/components/SharedCreditPicker';
import { Badge } from '@/components/ui/badge';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { ClientExternalApps, ClientExternalAppsDisplay } from '@/components/ClientExternalApps';

// Interface for MAC devices
interface MacDevice {
  name: string;
  mac: string;
}

interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  device: string | null;
  expiration_date: string;
  plan_id: string | null;
  plan_name: string | null;
  plan_price: number | null;
  premium_price: number | null;
  server_id: string | null;
  server_name: string | null;
  login: string | null;
  password: string | null;
  // Second server fields
  server_id_2: string | null;
  server_name_2: string | null;
  login_2: string | null;
  password_2: string | null;
  premium_password: string | null;
  category: string | null;
  is_paid: boolean;
  notes: string | null;
  has_paid_apps: boolean | null;
  paid_apps_duration: string | null;
  paid_apps_expiration: string | null;
  telegram: string | null;
  is_archived: boolean | null;
  archived_at: string | null;
  created_at: string | null;
  gerencia_app_mac: string | null;
  gerencia_app_devices: MacDevice[] | null;
}

interface ClientCategory {
  id: string;
  name: string;
  seller_id: string;
}

interface DecryptedCredentials {
  [clientId: string]: { login: string; password: string; login_2?: string; password_2?: string };
}

interface Plan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  category: string;
}

interface ServerData {
  id: string;
  name: string;
  is_active: boolean;
  is_credit_based: boolean;
  panel_url: string | null;
  iptv_per_credit: number;
  p2p_per_credit: number;
  total_screens_per_credit: number;
}

type FilterType = 'all' | 'active' | 'expiring' | 'expired' | 'unpaid' | 'archived';
type CategoryFilterType = 'all' | 'IPTV' | 'P2P' | 'Contas Premium' | 'SSH' | 'custom';

const DEFAULT_CATEGORIES = ['IPTV', 'P2P', 'Contas Premium', 'SSH'] as const;

const DEVICE_OPTIONS = [
  { value: 'Smart TV', label: 'Smart TV', icon: Tv },
  { value: 'Celular', label: 'Celular', icon: Smartphone },
  { value: 'TV Box', label: 'TV Box', icon: Monitor },
  { value: 'Video Game', label: 'Video Game', icon: Gamepad2 },
  { value: 'PC', label: 'PC', icon: Monitor },
  { value: 'Notebook', label: 'Notebook', icon: Laptop },
  { value: 'Fire Stick', label: 'Fire Stick', icon: Flame },
] as const;

export default function Clients() {
  const { user } = useAuth();
  const { encrypt, decrypt } = useCrypto();
  const { isPrivacyMode, maskData } = usePrivacyMode();
  const { isOffline, lastSync, syncClients: syncOfflineClients, loading: offlineLoading } = useOfflineClients();
  const { isSent, getSentInfo, clearSentMark, sentCount, clearAllSentMarks } = useSentMessages();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [messageClient, setMessageClient] = useState<Client | null>(null);
  const [renewClient, setRenewClient] = useState<Client | null>(null);
  const [renewPlanId, setRenewPlanId] = useState<string>('');
  const [decryptedCredentials, setDecryptedCredentials] = useState<DecryptedCredentials>({});
  const [decrypting, setDecrypting] = useState<string | null>(null);
  const [isDecryptingAll, setIsDecryptingAll] = useState(false);
  const [allCredentialsDecrypted, setAllCredentialsDecrypted] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [serverFilter, setServerFilter] = useState<string>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [selectedSharedCredit, setSelectedSharedCredit] = useState<SharedCreditSelection | null>(null);
  const [externalApps, setExternalApps] = useState<{ appId: string; devices: { name: string; mac: string; device_key?: string }[]; email: string; password: string; expirationDate: string }[]>([]);
  // State for popovers inside the dialog
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [expirationPopoverOpen, setExpirationPopoverOpen] = useState(false);
  const [paidAppsExpirationPopoverOpen, setPaidAppsExpirationPopoverOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    telegram: '',
    email: '',
    device: '',
    expiration_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    plan_id: '',
    plan_name: '',
    plan_price: '',
    premium_price: '',
    server_id: '',
    server_name: '',
    login: '',
    password: '',
    // Second server fields
    server_id_2: '',
    server_name_2: '',
    login_2: '',
    password_2: '',
    premium_password: '',
    category: 'IPTV',
    is_paid: true,
    notes: '',
    has_paid_apps: false,
    paid_apps_duration: '',
    paid_apps_expiration: '',
    paid_apps_email: '', // Email ou MAC do app pago
    paid_apps_password: '', // Senha ou código do app pago
    screens: '1', // Número de telas selecionadas
    gerencia_app_mac: '', // MAC do GerenciaApp (campo legado)
    gerencia_app_devices: [] as MacDevice[], // Múltiplos dispositivos MAC
    app_name: '', // Nome do aplicativo usado pelo cliente
  });


  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('seller_id', user!.id)
        .order('expiration_date', { ascending: true });
      if (error) throw error;
      // Cast gerencia_app_devices from JSON to MacDevice[]
      return (data || []).map(client => ({
        ...client,
        gerencia_app_devices: (client.gerencia_app_devices as unknown as MacDevice[]) || []
      })) as Client[];
    },
    enabled: !!user?.id,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('seller_id', user!.id)
        .eq('is_active', true)
        .order('price');
      if (error) throw error;
      return data as Plan[];
    },
    enabled: !!user?.id,
  });

  const { data: servers = [] } = useQuery({
    queryKey: ['servers-all', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servers')
        .select('id, name, is_active, is_credit_based, panel_url, iptv_per_credit, p2p_per_credit, total_screens_per_credit')
        .eq('seller_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as ServerData[];
    },
    enabled: !!user?.id,
  });

  // Active servers for the form select
  const activeServers = servers.filter(s => s.is_active);

  // Get selected server details for screen options
  const selectedServer = servers.find(s => s.id === formData.server_id);
  const maxScreens = selectedServer?.total_screens_per_credit || 1;
  const hasMultipleScreenOptions = maxScreens > 1;
  
  // Check if WPLAY for special screen options
  const isWplayServer = selectedServer?.name?.toUpperCase() === 'WPLAY';

  const { data: customCategories = [] } = useQuery({
    queryKey: ['client-categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_categories')
        .select('*')
        .eq('seller_id', user!.id)
        .order('name');
      if (error) throw error;
      return data as ClientCategory[];
    },
    enabled: !!user?.id,
  });

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories.map(c => c.name)];

  // Handle shared credit selection - auto-fill all fields
  const handleSharedCreditSelect = useCallback((selection: SharedCreditSelection | null) => {
    setSelectedSharedCredit(selection);
    
    if (selection) {
      // Only update credentials and server, keep user's chosen expiration date
      setFormData(prev => ({
        ...prev,
        server_id: selection.serverId,
        server_name: selection.serverName,
        login: selection.sharedLogin || prev.login,
        password: selection.sharedPassword || prev.password,
        // Only set expiration_date if user hasn't already set one
        expiration_date: prev.expiration_date || selection.expirationDate || format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd'),
      }));
    }
  }, []);

  // Encrypt credentials before saving
  const encryptCredentials = async (login: string | null, password: string | null) => {
    try {
      const encryptedLogin = login ? await encrypt(login) : null;
      const encryptedPassword = password ? await encrypt(password) : null;
      return { login: encryptedLogin, password: encryptedPassword };
    } catch (error) {
      console.error('Encryption error:', error);
      // Fallback to plain text if encryption fails
      return { login, password };
    }
  };

  // Decrypt credentials for display
  const decryptCredentialsForClient = useCallback(async (clientId: string, encryptedLogin: string | null, encryptedPassword: string | null) => {
    if (decryptedCredentials[clientId]) {
      return decryptedCredentials[clientId];
    }

    setDecrypting(clientId);
    try {
      const decryptedLogin = encryptedLogin ? await decrypt(encryptedLogin) : '';
      const decryptedPassword = encryptedPassword ? await decrypt(encryptedPassword) : '';
      
      const result = { login: decryptedLogin, password: decryptedPassword };
      setDecryptedCredentials(prev => ({ ...prev, [clientId]: result }));
      return result;
    } catch (error) {
      console.error('Decryption error:', error);
      // If decryption fails, it might be plain text (old data)
      return { login: encryptedLogin || '', password: encryptedPassword || '' };
    } finally {
      setDecrypting(null);
    }
  }, [decrypt, decryptedCredentials]);

  // Decrypt all credentials in batch for search functionality
  const decryptAllCredentials = useCallback(async () => {
    if (allCredentialsDecrypted || isDecryptingAll || !clients.length) return;

    setIsDecryptingAll(true);

    const clientsWithCredentials = clients.filter((c) => {
      const hasAnyCredentials = Boolean(c.login || c.password || c.login_2 || c.password_2);
      if (!hasAnyCredentials) return false;

      const existing = decryptedCredentials[c.id];
      if (!existing) return true;

      // If server 2 credentials exist but weren't decrypted yet, we still need to process this client
      const needsSecondServerCredentials =
        Boolean(c.login_2 || c.password_2) &&
        existing.login_2 === undefined &&
        existing.password_2 === undefined;

      return needsSecondServerCredentials;
    });

    if (clientsWithCredentials.length === 0) {
      setAllCredentialsDecrypted(true);
      setIsDecryptingAll(false);
      return;
    }

    const safeDecrypt = async (value: string | null) => {
      if (!value) return '';
      try {
        return await decrypt(value);
      } catch {
        // Might already be plain text (old data) or invalid ciphertext
        return value;
      }
    };

    // Decrypt in batches to avoid overwhelming the API
    const batchSize = 10;
    const newDecrypted: DecryptedCredentials = { ...decryptedCredentials };

    for (let i = 0; i < clientsWithCredentials.length; i += batchSize) {
      const batch = clientsWithCredentials.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (client) => {
          const previous = newDecrypted[client.id] ?? { login: '', password: '' };

          const decryptedLogin = client.login ? await safeDecrypt(client.login) : previous.login;
          const decryptedPassword = client.password ? await safeDecrypt(client.password) : previous.password;
          const decryptedLogin2 = client.login_2 ? await safeDecrypt(client.login_2) : (previous.login_2 ?? '');
          const decryptedPassword2 = client.password_2 ? await safeDecrypt(client.password_2) : (previous.password_2 ?? '');

          newDecrypted[client.id] = {
            ...previous,
            login: decryptedLogin || '',
            password: decryptedPassword || '',
            login_2: decryptedLogin2 || '',
            password_2: decryptedPassword2 || '',
          };
        })
      );
    }

    setDecryptedCredentials(newDecrypted);
    setAllCredentialsDecrypted(true);
    setIsDecryptingAll(false);
  }, [clients, decrypt, decryptedCredentials, allCredentialsDecrypted, isDecryptingAll]);

  // Trigger decryption when user starts searching
  useEffect(() => {
    if (search.trim().length >= 2 && !allCredentialsDecrypted) {
      decryptAllCredentials();
    }
  }, [search, allCredentialsDecrypted, decryptAllCredentials]);

  // Reset decrypted state when clients change (refetch)
  useEffect(() => {
    if (clients.length > 0) {
      // Check if there are clients that still need decryption (including server 2 credentials)
      const hasClientsNeedingDecryption = clients.some((c) => {
        const hasAnyCredentials = Boolean(c.login || c.password || c.login_2 || c.password_2);
        if (!hasAnyCredentials) return false;

        const existing = decryptedCredentials[c.id];
        if (!existing) return true;

        const needsSecondServerCredentials =
          Boolean(c.login_2 || c.password_2) &&
          existing.login_2 === undefined &&
          existing.password_2 === undefined;

        return needsSecondServerCredentials;
      });

      if (hasClientsNeedingDecryption && allCredentialsDecrypted) {
        setAllCredentialsDecrypted(false);
      }
    }
  }, [clients, decryptedCredentials, allCredentialsDecrypted]);

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; expiration_date: string; phone?: string | null; email?: string | null; device?: string | null; plan_id?: string | null; plan_name?: string | null; plan_price?: number | null; server_id?: string | null; server_name?: string | null; login?: string | null; password?: string | null; is_paid?: boolean; notes?: string | null; screens?: string; category?: string | null; has_paid_apps?: boolean; paid_apps_duration?: string | null; paid_apps_expiration?: string | null; telegram?: string | null; premium_password?: string | null }) => {
      // Extract screens before spreading - it's not a column in the clients table
      const { screens, ...clientData } = data;
      
      // If using shared credit, use the ORIGINAL encrypted credentials to ensure matching
      // Otherwise, encrypt the new credentials
      let finalLogin: string | null;
      let finalPassword: string | null;
      
      if (selectedSharedCredit?.encryptedLogin) {
        // Use original encrypted credentials from shared credit (avoids re-encryption mismatch)
        finalLogin = selectedSharedCredit.encryptedLogin;
        finalPassword = selectedSharedCredit.encryptedPassword || null;
      } else {
        // Encrypt new credentials
        const encrypted = await encryptCredentials(data.login || null, data.password || null);
        finalLogin = encrypted.login;
        finalPassword = encrypted.password;
      }
      
      const { data: insertedData, error } = await supabase.from('clients').insert([{
        ...clientData,
        login: finalLogin,
        password: finalPassword,
        seller_id: user!.id,
        renewed_at: new Date().toISOString(), // Track creation as first renewal for monthly profit
      }]).select('id').single();
      if (error) throw error;
      
      // Shared credits are tracked by counting clients with the same login/password on the server
      // No need to insert into panel_clients - the SharedCreditPicker counts directly from clients table
      
      // If it's a credit-based server and NOT using shared credit, register the screens used
      if (!selectedSharedCredit && data.server_id && insertedData?.id) {
        const server = servers.find(s => s.id === data.server_id);
        if (server?.is_credit_based) {
          const screensUsed = parseInt(screens || '1');
          const category = formData.category;
          
          // Determine slot types based on category and screens
          const panelEntries: { panel_id: string; client_id: string; seller_id: string; slot_type: string }[] = [];
          
          if (category === 'P2P') {
            // P2P client - all screens are P2P
            for (let i = 0; i < screensUsed; i++) {
              panelEntries.push({
                panel_id: data.server_id,
                client_id: insertedData.id,
                seller_id: user!.id,
                slot_type: 'p2p',
              });
            }
          } else {
            // IPTV or mixed - handle WPLAY special case
            const isWplay = server.name?.toUpperCase() === 'WPLAY';
            
            if (isWplay && screensUsed === 3) {
              // WPLAY 3 screens = 2 IPTV + 1 P2P
              panelEntries.push(
                { panel_id: data.server_id, client_id: insertedData.id, seller_id: user!.id, slot_type: 'iptv' },
                { panel_id: data.server_id, client_id: insertedData.id, seller_id: user!.id, slot_type: 'iptv' },
                { panel_id: data.server_id, client_id: insertedData.id, seller_id: user!.id, slot_type: 'p2p' }
              );
            } else {
              // All IPTV
              for (let i = 0; i < screensUsed; i++) {
                panelEntries.push({
                  panel_id: data.server_id,
                  client_id: insertedData.id,
                  seller_id: user!.id,
                  slot_type: 'iptv',
                });
              }
            }
          }
          
          if (panelEntries.length > 0) {
            const { error: panelError } = await supabase.from('panel_clients').insert(panelEntries);
            if (panelError) {
              console.error('Error registering credit slots:', panelError);
            }
          }
        }
      }
      
      // Save external apps for this client
      if (externalApps.length > 0 && insertedData?.id) {
        for (const app of externalApps) {
          if (!app.appId) continue;
          
          // Encrypt password if present
          let encryptedPassword = app.password || null;
          if (encryptedPassword) {
            try {
              encryptedPassword = await encrypt(encryptedPassword);
            } catch (e) {
              console.error('Error encrypting app password:', e);
            }
          }
          
          const { error: appError } = await supabase.from('client_external_apps').insert([{
            client_id: insertedData.id,
            external_app_id: app.appId,
            seller_id: user!.id,
            devices: app.devices.filter(d => d.mac.trim() !== ''),
            email: app.email || null,
            password: encryptedPassword,
            expiration_date: app.expirationDate || null,
          }]);
          
          if (appError) {
            console.error('Error saving external app:', appError);
          }
        }
      }
      
      return insertedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['server-credit-clients'] });
      queryClient.invalidateQueries({ queryKey: ['all-panel-clients'] });
      toast.success(selectedSharedCredit 
        ? 'Cliente criado e vinculado ao crédito compartilhado!' 
        : 'Cliente criado com sucesso!');
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      // Encrypt login and password if they were changed
      let updateData: Record<string, unknown> = { ...data };

      // Never send form-only fields to the clients table
      const { screens: _screens, ...cleanUpdateData } = updateData as Record<string, any>;
      updateData = cleanUpdateData;

      if (data.login !== undefined || data.password !== undefined) {
        const encrypted = await encryptCredentials((data.login as any) || null, (data.password as any) || null);
        (updateData as any).login = encrypted.login;
        (updateData as any).password = encrypted.password;
      }

      const { error } = await supabase.from('clients').update(updateData).eq('id', id);
      if (error) throw error;

      // Clear cached decrypted credentials for this client
      setDecryptedCredentials(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente atualizado!');
      resetForm();
      setIsDialogOpen(false);
      setEditingClient(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente excluído!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('clients').delete().eq('seller_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Todos os clientes foram excluídos!');
      setShowDeleteAllConfirm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['archived-clients-count'] });
      toast.success('Cliente movido para lixeira!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Archive expired clients that have been contacted
  const archiveCalledExpiredMutation = useMutation({
    mutationFn: async (clientIds: string[]) => {
      const { error } = await supabase
        .from('clients')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .in('id', clientIds);
      if (error) throw error;
      return clientIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['archived-clients-count'] });
      clearAllSentMarks();
      toast.success(`${count} cliente${count > 1 ? 's' : ''} vencido${count > 1 ? 's' : ''} arquivado${count > 1 ? 's' : ''}!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });


  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clients')
        .update({ is_archived: false, archived_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['archived-clients-count'] });
      toast.success('Cliente restaurado!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const renewMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const client = clients.find(c => c.id === id);
      if (!client) throw new Error('Cliente não encontrado');
      
      const baseDate = new Date(client.expiration_date);
      const newDate = isAfter(baseDate, new Date()) 
        ? addDays(baseDate, days) 
        : addDays(new Date(), days);
      
      const { error } = await supabase
        .from('clients')
        .update({ 
          expiration_date: format(newDate, 'yyyy-MM-dd'),
          is_paid: true 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente renovado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      telegram: '',
      email: '',
      device: '',
      expiration_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      plan_id: '',
      plan_name: '',
      plan_price: '',
      premium_price: '',
      server_id: '',
      server_name: '',
      login: '',
      password: '',
      server_id_2: '',
      server_name_2: '',
      login_2: '',
      password_2: '',
      premium_password: '',
      category: 'IPTV',
      is_paid: true,
      notes: '',
      has_paid_apps: false,
      paid_apps_duration: '',
      paid_apps_expiration: '',
      paid_apps_email: '',
      paid_apps_password: '',
      screens: '1',
      gerencia_app_mac: '',
      gerencia_app_devices: [],
      app_name: '',
    });
    setSelectedSharedCredit(null);
    setExternalApps([]);
  };

  const handlePlanChange = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      const newExpDate = format(addDays(new Date(), plan.duration_days), 'yyyy-MM-dd');
      setFormData({
        ...formData,
        plan_id: plan.id,
        plan_name: plan.name,
        plan_price: plan.price.toString(),
        expiration_date: newExpDate,
      });
    }
  };

  const handlePaidAppsDurationChange = (duration: string) => {
    let daysToAdd = 30;
    switch (duration) {
      case '3_months':
        daysToAdd = 90;
        break;
      case '6_months':
        daysToAdd = 180;
        break;
      case '1_year':
        daysToAdd = 365;
        break;
    }
    const newExpDate = format(addDays(new Date(), daysToAdd), 'yyyy-MM-dd');
    setFormData({
      ...formData,
      paid_apps_duration: duration,
      paid_apps_expiration: newExpDate,
    });
  };

  const handleServerChange = (serverId: string) => {
    if (serverId === 'manual') {
      setFormData({ ...formData, server_id: '', server_name: '' });
      return;
    }
    const server = servers.find(s => s.id === serverId);
    if (server) {
      setFormData({
        ...formData,
        server_id: server.id,
        server_name: server.name,
      });
    }
  };

  const handleServer2Change = (serverId: string) => {
    if (serverId === 'none') {
      setFormData({ ...formData, server_id_2: '', server_name_2: '', login_2: '', password_2: '' });
      return;
    }
    const server = servers.find(s => s.id === serverId);
    if (server) {
      setFormData({
        ...formData,
        server_id_2: server.id,
        server_name_2: server.name,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const screens = formData.screens || '1';

    // Encrypt second server credentials if present
    let encryptedLogin2 = null;
    let encryptedPassword2 = null;
    if (formData.login_2 || formData.password_2) {
      try {
        encryptedLogin2 = formData.login_2 ? await encrypt(formData.login_2) : null;
        encryptedPassword2 = formData.password_2 ? await encrypt(formData.password_2) : null;
      } catch (error) {
        console.error('Encryption error for second server:', error);
        encryptedLogin2 = formData.login_2 || null;
        encryptedPassword2 = formData.password_2 || null;
      }
    }

    const data: Record<string, unknown> = {
      name: formData.name,
      phone: formData.phone || null,
      telegram: formData.telegram || null,
      email: formData.email || null,
      device: formData.device || null,
      expiration_date: formData.expiration_date,
      plan_id: formData.plan_id || null,
      plan_name: formData.plan_name || null,
      plan_price: formData.plan_price ? parseFloat(formData.plan_price) : null,
      premium_price: formData.premium_price ? parseFloat(formData.premium_price) : null,
      server_id: formData.server_id || null,
      server_name: formData.server_name || null,
      login: formData.login || null,
      password: formData.password || null,
      // Second server fields
      server_id_2: formData.server_id_2 || null,
      server_name_2: formData.server_name_2 || null,
      login_2: encryptedLogin2,
      password_2: encryptedPassword2,
      premium_password: formData.premium_password || null,
      category: formData.category || 'IPTV',
      is_paid: formData.is_paid,
      notes: formData.notes || null,
      has_paid_apps: formData.has_paid_apps || false,
      paid_apps_duration: formData.paid_apps_duration || null,
      paid_apps_expiration: formData.paid_apps_expiration || null,
      paid_apps_email: formData.paid_apps_email || null,
      paid_apps_password: formData.paid_apps_password || null,
      gerencia_app_mac: formData.gerencia_app_devices.length > 0 ? formData.gerencia_app_devices[0].mac : (formData.gerencia_app_mac || null),
      gerencia_app_devices: formData.gerencia_app_devices.filter(d => d.mac.trim() !== ''),
      app_name: formData.app_name || null,
    };

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: data as Partial<Client> });
    } else {
      createMutation.mutate({
        ...(data as Parameters<typeof createMutation.mutate>[0]),
        screens,
      });
    }
  };

  const handleEdit = async (client: Client) => {
    setEditingClient(client);
    
    // Decrypt credentials for editing
    let decryptedLogin = '';
    let decryptedPassword = '';
    let decryptedLogin2 = '';
    let decryptedPassword2 = '';
    
    if (client.login || client.password) {
      try {
        const decrypted = await decryptCredentialsForClient(client.id, client.login, client.password);
        decryptedLogin = decrypted.login;
        decryptedPassword = decrypted.password;
      } catch (error) {
        // Fallback to raw values (might be unencrypted old data)
        decryptedLogin = client.login || '';
        decryptedPassword = client.password || '';
      }
    }
    
    // Decrypt second server credentials
    if (client.login_2 || client.password_2) {
      try {
        const decrypted2Login = client.login_2 ? await decrypt(client.login_2) : '';
        const decrypted2Password = client.password_2 ? await decrypt(client.password_2) : '';
        decryptedLogin2 = decrypted2Login;
        decryptedPassword2 = decrypted2Password;
      } catch (error) {
        decryptedLogin2 = client.login_2 || '';
        decryptedPassword2 = client.password_2 || '';
      }
    }
    
    setFormData({
      name: client.name,
      phone: client.phone || '',
      telegram: client.telegram || '',
      email: client.email || '',
      device: client.device || '',
      expiration_date: client.expiration_date,
      plan_id: client.plan_id || '',
      plan_name: client.plan_name || '',
      plan_price: client.plan_price?.toString() || '',
      premium_price: (client as any).premium_price?.toString() || '',
      server_id: client.server_id || '',
      server_name: client.server_name || '',
      login: decryptedLogin,
      password: decryptedPassword,
      server_id_2: client.server_id_2 || '',
      server_name_2: client.server_name_2 || '',
      login_2: decryptedLogin2,
      password_2: decryptedPassword2,
      premium_password: client.premium_password || '',
      category: client.category || 'IPTV',
      is_paid: client.is_paid,
      notes: client.notes || '',
      has_paid_apps: client.has_paid_apps || false,
      paid_apps_duration: client.paid_apps_duration || '',
      paid_apps_expiration: client.paid_apps_expiration || '',
      paid_apps_email: (client as any).paid_apps_email || '',
      paid_apps_password: (client as any).paid_apps_password || '',
      screens: '1',
      gerencia_app_mac: client.gerencia_app_mac || '',
      gerencia_app_devices: client.gerencia_app_devices || [],
      app_name: (client as any).app_name || '',
    });
    setIsDialogOpen(true);
  };

  const handleRenew = (client: Client) => {
    setRenewClient(client);
    setRenewPlanId(client.plan_id || '');
  };

  const confirmRenew = () => {
    if (!renewClient) return;
    
    const selectedPlan = plans.find(p => p.id === renewPlanId);
    const days = selectedPlan?.duration_days || 30;
    
    // Update client with new plan info if changed
    const updateData: Record<string, unknown> = {};
    if (renewPlanId && renewPlanId !== renewClient.plan_id) {
      updateData.plan_id = selectedPlan?.id || null;
      updateData.plan_name = selectedPlan?.name || null;
      updateData.plan_price = selectedPlan?.price || null;
    }
    
    // Calculate new expiration date
    const baseDate = new Date(renewClient.expiration_date);
    const newDate = isAfter(baseDate, new Date()) 
      ? addDays(baseDate, days) 
      : addDays(new Date(), days);
    
    updateData.expiration_date = format(newDate, 'yyyy-MM-dd');
    updateData.is_paid = true;
    updateData.renewed_at = new Date().toISOString(); // Track renewal date for monthly profit
    
    updateMutation.mutate({ 
      id: renewClient.id, 
      data: updateData as Partial<Client>
    });
    
    setRenewClient(null);
    setRenewPlanId('');
  };

  const handleOpenPanel = (client: Client) => {
    // Find the server associated with this client
    const server = servers.find(s => s.id === client.server_id);
    if (server?.panel_url) {
      window.open(server.panel_url, '_blank');
    } else {
      toast.error('Este servidor não tem URL do painel configurada');
    }
  };

  const getClientServer = (client: Client) => {
    return servers.find(s => s.id === client.server_id);
  };

  const handleShowPassword = async (client: Client) => {
    if (showPassword === client.id) {
      setShowPassword(null);
      return;
    }
    
    // Decrypt if not already decrypted
    if (!decryptedCredentials[client.id] && (client.login || client.password)) {
      await decryptCredentialsForClient(client.id, client.login, client.password);
    }
    
    setShowPassword(client.id);
  };

  const today = startOfToday();
  const nextWeek = addDays(today, 7);

  const getClientStatus = (client: Client) => {
    const expDate = new Date(client.expiration_date);
    if (isBefore(expDate, today)) return 'expired';
    if (isBefore(expDate, nextWeek)) return 'expiring';
    return 'active';
  };

  // Separate archived and active clients
  const activeClients = clients.filter(c => !c.is_archived);
  const archivedClients = clients.filter(c => c.is_archived);

  // Get expired clients that have been contacted (sent message)
  const expiredCalledClients = activeClients.filter(c => {
    const status = getClientStatus(c);
    return status === 'expired' && isSent(c.id);
  });

  const filteredClients = (filter === 'archived' ? archivedClients : activeClients).filter((client) => {
    // Normalize search text - remove accents and convert to lowercase
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
    };

    const rawSearch = search.trim();
    const searchLower = rawSearch.toLowerCase();

    const normalizedSearch = normalizeText(rawSearch);
    const normalizedName = normalizeText(client.name);

    // Check decrypted credentials if available
    const clientCredentials = decryptedCredentials[client.id];
    const loginMatch = clientCredentials?.login?.toLowerCase().includes(searchLower) || false;
    const passwordMatch = clientCredentials?.password?.toLowerCase().includes(searchLower) || false;
    const login2Match = clientCredentials?.login_2?.toLowerCase().includes(searchLower) || false;
    const password2Match = clientCredentials?.password_2?.toLowerCase().includes(searchLower) || false;

    // Also check raw login/password for unencrypted data
    const rawLoginMatch = client.login?.toLowerCase().includes(searchLower) || false;
    const rawPasswordMatch = client.password?.toLowerCase().includes(searchLower) || false;
    const rawLogin2Match = client.login_2?.toLowerCase().includes(searchLower) || false;
    const rawPassword2Match = client.password_2?.toLowerCase().includes(searchLower) || false;

    const matchesSearch =
      normalizedName.includes(normalizedSearch) ||
      client.phone?.includes(rawSearch) ||
      client.email?.toLowerCase().includes(searchLower) ||
      loginMatch ||
      passwordMatch ||
      login2Match ||
      password2Match ||
      rawLoginMatch ||
      rawPasswordMatch ||
      rawLogin2Match ||
      rawPassword2Match;

    if (!matchesSearch) return false;

    if (!matchesSearch) return false;

    // Filter by category
    if (categoryFilter !== 'all' && client.category !== categoryFilter) {
      return false;
    }

    // Filter by server
    if (serverFilter !== 'all' && client.server_id !== serverFilter) {
      return false;
    }

    // For archived filter, just return all archived clients that match search/category
    if (filter === 'archived') return true;

    const status = getClientStatus(client);
    switch (filter) {
      case 'active':
        return status === 'active';
      case 'expiring':
        return status === 'expiring';
      case 'expired':
        return status === 'expired';
      case 'unpaid':
        return !client.is_paid;
      default:
        return true;
    }
  });

  // Sort clients: recently added (last 2 hours) appear at top, then by expiration
  const sortedClients = [...filteredClients].sort((a, b) => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const aCreatedAt = a.created_at ? new Date(a.created_at) : null;
    const bCreatedAt = b.created_at ? new Date(b.created_at) : null;
    
    const aIsRecent = aCreatedAt && aCreatedAt > twoHoursAgo;
    const bIsRecent = bCreatedAt && bCreatedAt > twoHoursAgo;
    
    // Recent clients first
    if (aIsRecent && !bIsRecent) return -1;
    if (!aIsRecent && bIsRecent) return 1;
    
    // Among recent clients, newest first
    if (aIsRecent && bIsRecent) {
      return bCreatedAt!.getTime() - aCreatedAt!.getTime();
    }
    
    // For older clients, sort by expiration date
    return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('client_categories')
        .insert({ seller_id: user!.id, name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-categories'] });
      setNewCategoryName('');
      setAddCategoryOpen(false);
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Esta categoria já existe');
      } else {
        toast.error(error.message);
      }
    },
  });

  const statusColors = {
    active: 'border-l-success',
    expiring: 'border-l-warning',
    expired: 'border-l-destructive',
  };

  const statusBadges = {
    active: 'bg-success/10 text-success',
    expiring: 'bg-warning/10 text-warning',
    expired: 'bg-destructive/10 text-destructive',
  };

  const statusLabels = {
    active: 'Ativo',
    expiring: 'Vencendo',
    expired: 'Vencido',
  };

  // Fetch GerenciaApp settings for banner
  const { data: gerenciaAppSettings } = useQuery({
    queryKey: ['gerencia-app-settings-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['gerencia_app_panel_url', 'gerencia_app_register_url']);
      
      if (error) throw error;
      
      const settings: { panelUrl: string; registerUrl: string } = {
        panelUrl: '',
        registerUrl: ''
      };
      
      data?.forEach(item => {
        if (item.key === 'gerencia_app_panel_url') settings.panelUrl = item.value;
        if (item.key === 'gerencia_app_register_url') settings.registerUrl = item.value;
      });
      
      return settings;
    },
  });

  const hasGerenciaApp = gerenciaAppSettings?.registerUrl && gerenciaAppSettings.registerUrl.trim() !== '';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* GerenciaApp Banner */}
      {hasGerenciaApp && (
        <Card className="border-2 border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-4 relative">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h3 className="font-bold text-lg">GerenciaApp</h3>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs font-bold animate-pulse">
                      ♾️ ILIMITADO
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ative apps Premium na Play Store por apenas <span className="text-primary font-bold text-base">R$ 40/mês</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button 
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-bold shadow-lg transition-all hover:scale-[1.02]"
                  onClick={() => {
                    if (gerenciaAppSettings?.panelUrl) {
                      window.open(gerenciaAppSettings.panelUrl, '_blank');
                    } else {
                      toast.info('URL do painel não configurada. Contate o administrador.');
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  ENTRAR NO PAINEL
                </Button>
                <Button 
                  variant="outline"
                  className="border-green-500/50 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 font-bold transition-all hover:scale-[1.02]"
                  onClick={() => window.open(gerenciaAppSettings?.registerUrl, '_blank')}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  CADASTRAR
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus clientes</p>
          </div>
          <OfflineIndicator 
            isOffline={isOffline} 
            lastSync={lastSync} 
            onSync={syncOfflineClients}
            syncing={offlineLoading}
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingClient(null);
            resetForm();
            setAddCategoryOpen(false);
            setExpirationPopoverOpen(false);
            setPaidAppsExpirationPopoverOpen(false);
          }
        }}>
          <div className="flex gap-2 flex-wrap">
            {clients.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                className="gap-1"
                onClick={() => setShowDeleteAllConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Remover Todos</span>
              </Button>
            )}
            <BulkImportClients plans={plans} />
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Cliente</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>
          </div>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              <DialogDescription>
                {editingClient ? 'Atualize os dados do cliente' : 'Preencha os dados do novo cliente'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Select with Add Button */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Categoria *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Popover open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="end">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Nova Categoria</Label>
                          <Input
                            placeholder="Nome da categoria"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newCategoryName.trim()) {
                                e.preventDefault();
                                addCategoryMutation.mutate(newCategoryName.trim());
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              if (newCategoryName.trim()) {
                                addCategoryMutation.mutate(newCategoryName.trim());
                              }
                            }}
                            disabled={!newCategoryName.trim() || addCategoryMutation.isPending}
                          >
                            {addCategoryMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Plus className="h-4 w-4 mr-2" />
                            )}
                            Adicionar
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+55 11 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram" className="flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    Telegram
                  </Label>
                  <Input
                    id="telegram"
                    value={formData.telegram}
                    onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                    placeholder="@usuario"
                  />
                </div>

                {/* Premium Account Fields - Only show for Contas Premium category */}
                {formData.category === 'Contas Premium' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (Conta Premium)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@premium.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="premium_password">Senha da Conta Premium</Label>
                      <Input
                        id="premium_password"
                        type="password"
                        value={formData.premium_password}
                        onChange={(e) => setFormData({ ...formData, premium_password: e.target.value })}
                        placeholder="Senha da conta premium"
                      />
                    </div>
                  </>
                )}
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Dispositivos</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                        type="button"
                      >
                        {formData.device 
                          ? formData.device.split(', ').length > 2 
                            ? `${formData.device.split(', ').slice(0, 2).join(', ')} +${formData.device.split(', ').length - 2}`
                            : formData.device
                          : 'Selecione os dispositivos'}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-2">
                        {DEVICE_OPTIONS.map((device) => {
                          const isSelected = formData.device.split(', ').includes(device.value);
                          return (
                            <label
                              key={device.value}
                              className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const currentDevices = formData.device ? formData.device.split(', ').filter(Boolean) : [];
                                  let newDevices: string[];
                                  
                                  if (checked) {
                                    newDevices = [...currentDevices, device.value];
                                  } else {
                                    newDevices = currentDevices.filter(d => d !== device.value);
                                  }
                                  
                                  setFormData({ ...formData, device: newDevices.join(', ') });
                                }}
                              />
                              <device.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{device.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Plan Select - Not for Contas Premium */}
                {formData.category !== 'Contas Premium' && (
                  <>
                    <div className="space-y-2">
                      <Label>Plano</Label>
                      <PlanSelector
                        plans={plans}
                        value={formData.plan_id || ''}
                        onValueChange={handlePlanChange}
                        placeholder="Selecione um plano (opcional)"
                        showFilters={true}
                        defaultCategory={formData.category}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plan_price">Valor IPTV (R$)</Label>
                      <Input
                        id="plan_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.plan_price}
                        onChange={(e) => setFormData({ ...formData, plan_price: e.target.value })}
                        placeholder="Ex: 25.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.plan_id ? 'Preenchido pelo plano. Edite para promoções.' : 'Defina o valor manualmente ou selecione um plano.'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="premium_price">Valor Premium (R$)</Label>
                      <Input
                        id="premium_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.premium_price}
                        onChange={(e) => setFormData({ ...formData, premium_price: e.target.value })}
                        placeholder="Ex: 10.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Adicione o valor da conta Premium se o cliente compra os 2 juntos.
                      </p>
                    </div>
                    {(formData.plan_price || formData.premium_price) && (
                      <div className="md:col-span-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Valor Total:</span>
                          <span className="text-lg font-bold text-primary">
                            R$ {((parseFloat(formData.plan_price) || 0) + (parseFloat(formData.premium_price) || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Server Select - Only for IPTV/SSH/P2P, not for Contas Premium */}
                {formData.category !== 'Contas Premium' && (
                  <div className="space-y-2">
                    <Label>Servidor</Label>
                    <Select
                      value={formData.server_id || 'manual'}
                      onValueChange={handleServerChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um servidor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Nenhum</SelectItem>
                        {activeServers.map((server) => (
                          <SelectItem key={server.id} value={server.id}>
                            {server.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Screen Selection for Credit-Based Servers */}
                {formData.category !== 'Contas Premium' && formData.server_id && selectedServer?.is_credit_based && (
                  <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/30">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-blue-500" />
                      <h4 className="font-semibold text-blue-600 dark:text-blue-400">Gestão de Telas do Crédito</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Telas por crédito no servidor
                        </Label>
                        <div className="p-2 rounded-md bg-muted text-center font-bold">
                          {selectedServer?.total_screens_per_credit || 1}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            ({selectedServer?.iptv_per_credit || 0} IPTV + {selectedServer?.p2p_per_credit || 0} P2P)
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Telas que o cliente comprou
                        </Label>
                        <Select
                          value={formData.screens}
                          onValueChange={(value) => setFormData({ ...formData, screens: value })}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {isWplayServer ? (
                              <>
                                <SelectItem value="1">1 Tela (IPTV)</SelectItem>
                                <SelectItem value="2">2 Telas (IPTV)</SelectItem>
                                <SelectItem value="3">3 Telas (2 IPTV + 1 P2P)</SelectItem>
                              </>
                            ) : (
                              Array.from({ length: maxScreens }, (_, i) => i + 1).map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num} {num === 1 ? 'Tela' : 'Telas'}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {parseInt(formData.screens) < (selectedServer?.total_screens_per_credit || 1) && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          <strong>{(selectedServer?.total_screens_per_credit || 1) - parseInt(formData.screens)} vaga(s) sobrando!</strong> Após criar este cliente, as vagas restantes ficarão disponíveis para novos clientes.
                        </p>
                      </div>
                    )}
                  </div>
                )}


                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <div className="flex items-center gap-2">
                    <Popover
                      open={expirationPopoverOpen}
                      onOpenChange={setExpirationPopoverOpen}
                      modal={false}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className="flex-1 justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.expiration_date 
                            ? format(new Date(formData.expiration_date), "dd/MM/yyyy", { locale: ptBR })
                            : "Selecione um plano"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={5}>
                        <CalendarPicker
                          mode="single"
                          selected={formData.expiration_date ? new Date(formData.expiration_date) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({ ...formData, expiration_date: format(date, "yyyy-MM-dd") });
                              setExpirationPopoverOpen(false);
                            }
                          }}
                          initialFocus
                          locale={ptBR}
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDate = formData.expiration_date ? new Date(formData.expiration_date + 'T12:00:00') : new Date();
                        if (!isNaN(currentDate.getTime())) {
                          setFormData({ ...formData, expiration_date: format(addDays(currentDate, -1), 'yyyy-MM-dd') });
                        }
                      }}
                    >
                      -1 dia
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDate = formData.expiration_date ? new Date(formData.expiration_date + 'T12:00:00') : new Date();
                        if (!isNaN(currentDate.getTime())) {
                          setFormData({ ...formData, expiration_date: format(addDays(currentDate, 1), 'yyyy-MM-dd') });
                        }
                      }}
                    >
                      +1 dia
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDate = formData.expiration_date ? new Date(formData.expiration_date + 'T12:00:00') : new Date();
                        if (!isNaN(currentDate.getTime())) {
                          setFormData({ ...formData, expiration_date: format(addMonths(currentDate, -1), 'yyyy-MM-dd') });
                        }
                      }}
                    >
                      -1 mês
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const currentDate = formData.expiration_date ? new Date(formData.expiration_date + 'T12:00:00') : new Date();
                        if (!isNaN(currentDate.getTime())) {
                          setFormData({ ...formData, expiration_date: format(addMonths(currentDate, 1), 'yyyy-MM-dd') });
                        }
                      }}
                    >
                      +1 mês
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Calculada pelo plano. Clique na data ou use os botões para ajustar.
                  </p>
                </div>

                {/* IPTV/SSH Login and Password - Only show for IPTV, P2P, or SSH categories */}
                {(formData.category === 'IPTV' || formData.category === 'P2P' || formData.category === 'SSH') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="login" className="flex items-center gap-1">
                        Login (Servidor 1)
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </Label>
                      <Input
                        id="login"
                        value={formData.login}
                        onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="flex items-center gap-1">
                        Senha (Servidor 1)
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </Label>
                      <Input
                        id="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                    
                    {/* Second Server Section - Optional */}
                    <div className="md:col-span-2 space-y-3 p-4 rounded-lg border border-dashed border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Segundo Servidor (Opcional)</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Configure um segundo servidor para este cliente em promoções especiais.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Servidor 2</Label>
                          <Select
                            value={formData.server_id_2 || 'none'}
                            onValueChange={handleServer2Change}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Nenhum" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum</SelectItem>
                              {activeServers.map((server) => (
                                <SelectItem key={server.id} value={server.id}>
                                  {server.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {formData.server_id_2 && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="login_2" className="flex items-center gap-1">
                                Login (Servidor 2)
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              </Label>
                              <Input
                                id="login_2"
                                value={formData.login_2}
                                onChange={(e) => setFormData({ ...formData, login_2: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="password_2" className="flex items-center gap-1">
                                Senha (Servidor 2)
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              </Label>
                              <Input
                                id="password_2"
                                value={formData.password_2}
                                onChange={(e) => setFormData({ ...formData, password_2: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* MAC GerenciaApp - Múltiplos Dispositivos */}
                    <div className="space-y-3 md:col-span-2 p-4 rounded-lg border border-dashed border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-1">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          Gerenciar MAC (opcional)
                        </Label>
                        {formData.gerencia_app_devices.length < 5 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                gerencia_app_devices: [
                                  ...formData.gerencia_app_devices,
                                  { name: '', mac: '' }
                                ]
                              });
                            }}
                            className="h-7 text-xs gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar
                          </Button>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Cadastre até 5 dispositivos do cliente (TV Sala, TV Quarto, Celular, TV Box...)
                      </p>
                      
                      {formData.gerencia_app_devices.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground border border-dashed rounded-lg">
                          Nenhum dispositivo cadastrado. Clique em "Adicionar" para começar.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {formData.gerencia_app_devices.map((device, index) => (
                            <div key={index} className="flex gap-2 items-start p-3 rounded-lg bg-background border">
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Nome/Apelido</Label>
                                  <Input
                                    value={device.name}
                                    onChange={(e) => {
                                      const newDevices = [...formData.gerencia_app_devices];
                                      newDevices[index] = { ...newDevices[index], name: e.target.value };
                                      setFormData({ ...formData, gerencia_app_devices: newDevices });
                                    }}
                                    placeholder="Ex: TV Sala, Celular..."
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Endereço MAC</Label>
                                  <Input
                                    value={device.mac}
                                    onChange={(e) => {
                                      const newDevices = [...formData.gerencia_app_devices];
                                      newDevices[index] = { ...newDevices[index], mac: e.target.value.toUpperCase() };
                                      setFormData({ ...formData, gerencia_app_devices: newDevices });
                                    }}
                                    placeholder="00:1A:2B:3C:4D:5E"
                                    className="h-9 font-mono"
                                  />
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const newDevices = formData.gerencia_app_devices.filter((_, i) => i !== index);
                                  setFormData({ ...formData, gerencia_app_devices: newDevices });
                                }}
                                className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 mt-5"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="is_paid">Status de Pagamento</Label>
                  <Select
                    value={formData.is_paid ? 'paid' : 'unpaid'}
                    onValueChange={(v) => setFormData({ ...formData, is_paid: v === 'paid' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="unpaid">Não Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Shared Credit Picker - Show for IPTV/P2P/SSH */}
              {!editingClient && formData.server_id && (formData.category === 'IPTV' || formData.category === 'P2P' || formData.category === 'SSH') && user && (
                <SharedCreditPicker
                  sellerId={user.id}
                  category={formData.category}
                  serverId={formData.server_id}
                  planDurationDays={formData.plan_id ? plans.find(p => p.id === formData.plan_id)?.duration_days : undefined}
                  selectedCredit={selectedSharedCredit}
                  onSelect={handleSharedCreditSelect}
                />
              )}

              {/* Apps Externos Section */}
              {user && (
                <div className="space-y-4 p-4 rounded-lg bg-violet-500/5 border border-violet-500/20">
                  <ClientExternalApps
                    clientId={editingClient?.id}
                    sellerId={user.id}
                    onChange={setExternalApps}
                    initialApps={externalApps}
                  />
                </div>
              )}

              {/* Legacy Paid Apps Section (for backward compatibility) */}
              <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AppWindow className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="has_paid_apps" className="cursor-pointer">Apps Pagos (legado)</Label>
                  </div>
                  <Switch
                    id="has_paid_apps"
                    checked={formData.has_paid_apps}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_paid_apps: checked, paid_apps_duration: '', paid_apps_expiration: '' })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Para novos cadastros, use a seção "Apps Externos" acima que possui mais recursos.
                </p>
                
                {formData.has_paid_apps && (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>E-mail ou MAC do App</Label>
                        <Input
                          value={formData.paid_apps_email}
                          onChange={(e) => setFormData({ ...formData, paid_apps_email: e.target.value })}
                          placeholder="email@exemplo.com ou AA:BB:CC:DD:EE:FF"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Senha ou Código</Label>
                        <Input
                          value={formData.paid_apps_password}
                          onChange={(e) => setFormData({ ...formData, paid_apps_password: e.target.value })}
                          placeholder="Senha, código ou chave de ativação"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome do Aplicativo (opcional)</Label>
                        <Input
                          value={formData.app_name}
                          onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                          placeholder="Ex: Netflix, Spotify, IPTV Smarters..."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Duração do App</Label>
                        <Select
                          value={formData.paid_apps_duration}
                          onValueChange={handlePaidAppsDurationChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a duração" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3_months">3 Meses</SelectItem>
                            <SelectItem value="6_months">6 Meses</SelectItem>
                            <SelectItem value="1_year">1 Ano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Vencimento do App</Label>
                        <Popover
                          open={paidAppsExpirationPopoverOpen}
                          onOpenChange={setPaidAppsExpirationPopoverOpen}
                          modal={false}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !formData.paid_apps_expiration && "text-muted-foreground"
                              )}
                              type="button"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.paid_apps_expiration 
                                ? format(new Date(formData.paid_apps_expiration), "dd/MM/yyyy", { locale: ptBR })
                                : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={5}>
                            <CalendarPicker
                              mode="single"
                              selected={formData.paid_apps_expiration ? new Date(formData.paid_apps_expiration) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setFormData({ ...formData, paid_apps_expiration: format(date, "yyyy-MM-dd") });
                                  setPaidAppsExpirationPopoverOpen(false);
                                }
                              }}
                              initialFocus
                              locale={ptBR}
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="E-mail, senhas, MAC de apps, informações adicionais..."
                  className="min-h-[100px] resize-y"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <span>Login e senha são criptografados antes de serem salvos.</span>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingClient ? 'Salvar' : 'Criar Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
        
        {/* Category Filter Tabs */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Filtrar por Categoria</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter('all')}
            >
              Todos ({clients.length})
            </Button>
            {allCategories.map((cat) => {
              const count = clients.filter(c => c.category === cat).length;
              return (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Server Filter - Discrete dropdown */}
        {servers.length > 0 && (
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            <Select value={serverFilter} onValueChange={setServerFilter}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Filtrar servidor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os servidores</SelectItem>
                {servers.map((server) => {
                  const count = clients.filter(c => c.server_id === server.id).length;
                  return (
                    <SelectItem key={server.id} value={server.id}>
                      {server.name} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {serverFilter !== 'all' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setServerFilter('all')}
                className="h-8 px-2 text-xs"
              >
                Limpar
              </Button>
            )}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="flex-1">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all">Todos ({activeClients.length})</TabsTrigger>
              <TabsTrigger value="active">Ativos</TabsTrigger>
              <TabsTrigger value="expiring">Vencendo</TabsTrigger>
              <TabsTrigger value="expired">Vencidos</TabsTrigger>
              <TabsTrigger value="unpaid">Não Pagos</TabsTrigger>
              <TabsTrigger value="archived" className="gap-1">
                <Archive className="h-3 w-3" />
                Lixeira ({archivedClients.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Sent Messages Counter */}
          {sentCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-success">
                <CheckCircle className="h-3 w-3" />
                {sentCount} enviado{sentCount > 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm('Limpar todas as marcações de mensagens enviadas?')) {
                    clearAllSentMarks();
                    toast.success('Marcações limpas');
                  }
                }}
              >
                Limpar
              </Button>
            </div>
          )}
          
          {/* Archive expired called clients */}
          {expiredCalledClients.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8 border-warning/50 text-warning hover:bg-warning/10"
              onClick={() => {
                if (confirm(`Arquivar ${expiredCalledClients.length} cliente${expiredCalledClients.length > 1 ? 's' : ''} vencido${expiredCalledClients.length > 1 ? 's' : ''} já chamado${expiredCalledClients.length > 1 ? 's' : ''}?`)) {
                  archiveCalledExpiredMutation.mutate(expiredCalledClients.map(c => c.id));
                }
              }}
              disabled={archiveCalledExpiredMutation.isPending}
            >
              {archiveCalledExpiredMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Archive className="h-3.5 w-3.5" />
              )}
              Arquivar Vencidos Chamados ({expiredCalledClients.length})
            </Button>
          )}
        </div>
      </div>

      {/* Clients Grid */}
      {isLoading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground text-center">
              {search ? 'Tente ajustar sua busca' : 'Adicione seu primeiro cliente clicando no botão acima'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sortedClients.map((client) => {
            const status = getClientStatus(client);
            const daysLeft = differenceInDays(new Date(client.expiration_date), today);
            const hasCredentials = client.login || client.password;
            const isDecrypted = decryptedCredentials[client.id];
            const isDecrypting = decrypting === client.id;
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const isRecentlyAdded = client.created_at && new Date(client.created_at) > twoHoursAgo;
            
            return (
              <Card
                key={client.id}
                className={cn(
                  'border-l-4 transition-all duration-200 hover:shadow-lg animate-slide-up',
                  statusColors[status],
                  !client.is_paid && 'ring-1 ring-destructive/50',
                  isRecentlyAdded && 'ring-2 ring-primary/50 bg-primary/5'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{maskData(client.name, 'name')}</h3>
                        {isRecentlyAdded && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground animate-pulse">
                            NOVO
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', statusBadges[status])}>
                          {statusLabels[status]} {daysLeft > 0 && status !== 'expired' && `(${daysLeft}d)`}
                        </span>
                        {client.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {client.category}
                          </span>
                        )}
                      </div>
                    </div>
                    {!client.is_paid && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        Não Pago
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {client.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{maskData(client.phone, 'phone')}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="truncate">{maskData(client.email, 'email')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      <span>{format(new Date(client.expiration_date), "dd/MM/yyyy")}</span>
                    </div>
                    
                    {/* Plan + Server Badges */}
                    {(client.plan_name || client.server_name || client.server_name_2) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {client.plan_name && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border">
                            <CreditCard className="h-3 w-3" />
                            {client.plan_name}
                            {client.plan_price && !isPrivacyMode && (
                              <span className="text-muted-foreground ml-1">
                                R$ {client.plan_price.toFixed(2)}
                              </span>
                            )}
                          </span>
                        )}
                        {client.server_name && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                            <Server className="h-3 w-3" />
                            {client.server_name}
                          </span>
                        )}
                        {client.server_name_2 && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Server className="h-3 w-3" />
                            {client.server_name_2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Panel Quick Access Buttons - Server 1 */}
                    {client.server_id && getClientServer(client)?.panel_url && (
                      <div className="flex gap-1.5 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 text-xs gap-1.5 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:text-primary"
                          onClick={() => handleOpenPanel(client)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Painel 1
                        </Button>
                        {client.login && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs gap-1 border-border hover:bg-muted"
                            onClick={async () => {
                              // Decrypt if needed and copy
                              let loginToCopy = decryptedCredentials[client.id]?.login;
                              if (!loginToCopy && client.login) {
                                try {
                                  const decrypted = await decrypt(client.login);
                                  loginToCopy = decrypted;
                                } catch {
                                  loginToCopy = client.login;
                                }
                              }
                              if (loginToCopy) {
                                navigator.clipboard.writeText(loginToCopy);
                                toast.success(`Login 1 copiado: ${loginToCopy}`);
                              }
                            }}
                            title="Copiar login do servidor 1"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Login
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Panel Quick Access Buttons - Server 2 */}
                    {client.server_id_2 && (() => {
                      const server2 = servers.find(s => s.id === client.server_id_2);
                      return server2?.panel_url ? (
                        <div className="flex gap-1.5 mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs gap-1.5 bg-gradient-to-r from-amber-500/5 to-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                            onClick={() => window.open(server2.panel_url!, '_blank')}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Painel 2
                          </Button>
                          {client.login_2 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs gap-1 border-border hover:bg-muted"
                              onClick={async () => {
                                // Decrypt and copy login 2
                                let loginToCopy = client.login_2;
                                if (loginToCopy) {
                                  try {
                                    const decrypted = await decrypt(loginToCopy);
                                    loginToCopy = decrypted;
                                  } catch {
                                    // Use as is if decryption fails
                                  }
                                  navigator.clipboard.writeText(loginToCopy);
                                  toast.success(`Login 2 copiado: ${loginToCopy}`);
                                }
                              }}
                              title="Copiar login do servidor 2"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Login
                            </Button>
                          )}
                        </div>
                      ) : null;
                    })()}

                    {/* GerenciaApp Panel Quick Access - Multiple Devices */}
                    {((client.gerencia_app_devices && client.gerencia_app_devices.length > 0) || client.gerencia_app_mac) && gerenciaAppSettings?.panelUrl && (
                      <div className="space-y-2 mt-2">
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs gap-1.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                            onClick={() => window.open(gerenciaAppSettings.panelUrl, '_blank')}
                          >
                            <Monitor className="h-3.5 w-3.5" />
                            GerenciaApp
                          </Button>
                        </div>
                        {/* Display multiple MAC devices */}
                        <div className="space-y-1">
                          {client.gerencia_app_devices && client.gerencia_app_devices.length > 0 ? (
                            client.gerencia_app_devices.map((device, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded bg-muted/50 text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Monitor className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  <span className="font-medium truncate">{device.name || `Dispositivo ${idx + 1}`}</span>
                                  <span className="font-mono text-muted-foreground truncate">{device.mac}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 flex-shrink-0"
                                  onClick={() => {
                                    navigator.clipboard.writeText(device.mac);
                                    toast.success(`MAC copiado: ${device.mac}`);
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ))
                          ) : client.gerencia_app_mac && (
                            <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-muted/50 text-xs">
                              <div className="flex items-center gap-2">
                                <Monitor className="h-3 w-3 text-green-500" />
                                <span className="font-mono text-muted-foreground">{client.gerencia_app_mac}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => {
                                  navigator.clipboard.writeText(client.gerencia_app_mac || '');
                                  toast.success(`MAC copiado: ${client.gerencia_app_mac}`);
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show MAC info if exists but no panel URL configured */}
                    {((client.gerencia_app_devices && client.gerencia_app_devices.length > 0) || client.gerencia_app_mac) && !gerenciaAppSettings?.panelUrl && (
                      <div className="space-y-1 mt-2">
                        {client.gerencia_app_devices && client.gerencia_app_devices.length > 0 ? (
                          client.gerencia_app_devices.map((device, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                              <Monitor className="h-3.5 w-3.5 text-green-500" />
                              <span className="text-xs font-medium">{device.name || `Dispositivo ${idx + 1}`}:</span>
                              <span className="text-xs font-mono">{device.mac}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  navigator.clipboard.writeText(device.mac);
                                  toast.success(`MAC copiado: ${device.mac}`);
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : client.gerencia_app_mac && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Monitor className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-xs font-mono">{client.gerencia_app_mac}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(client.gerencia_app_mac || '');
                                toast.success(`MAC copiado: ${client.gerencia_app_mac}`);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* External Apps Display */}
                    {user && (
                      <ClientExternalAppsDisplay clientId={client.id} sellerId={user.id} />
                    )}

                    {hasCredentials && !isPrivacyMode && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        <span className="flex-1">
                          {showPassword === client.id && isDecrypted
                            ? isDecrypted.login || '(sem login)'
                            : '••••••'}
                        </span>
                        <button
                          onClick={() => handleShowPassword(client)}
                          className="ml-auto"
                          disabled={isDecrypting}
                        >
                          {isDecrypting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : showPassword === client.id ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                    {hasCredentials && isPrivacyMode && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        <span>●●●●●● (oculto)</span>
                      </div>
                    )}
                    {showPassword === client.id && isDecrypted && !isPrivacyMode && (
                      <div className="text-xs bg-muted p-2 rounded font-mono space-y-1">
                        {isDecrypted.login && <p>Login: {isDecrypted.login}</p>}
                        {isDecrypted.password && <p>Senha: {isDecrypted.password}</p>}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1 mt-4 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => renewMutation.mutate({ id: client.id, days: 1 })}
                    >
                      +1 dia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleRenew(client)}
                    >
                      Renovar
                    </Button>
                    {(client.phone || client.telegram) && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-7 text-xs gap-1",
                            isSent(client.id) && "border-success/50 bg-success/10"
                          )}
                          onClick={() => setMessageClient(client)}
                        >
                          {isSent(client.id) ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5 text-success" />
                              <span className="text-success">Enviado</span>
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-3.5 w-3.5 text-green-500" />
                              <Send className="h-3.5 w-3.5 text-blue-500" />
                              Mensagem
                            </>
                          )}
                        </Button>
                        {isSent(client.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => clearSentMark(client.id)}
                            title="Limpar marcação de enviado"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                    {/* Show different buttons based on archived status */}
                    {client.is_archived ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-success hover:text-success"
                          onClick={() => restoreMutation.mutate(client.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Restaurar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja EXCLUIR PERMANENTEMENTE este cliente?')) {
                              deleteMutation.mutate(client.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleEdit(client)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir este cliente?')) {
                              deleteMutation.mutate(client.id);
                            }
                          }}
                          title="Excluir cliente"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Send Message Dialog */}
      {messageClient && (
        <SendMessageDialog
          client={messageClient}
          open={!!messageClient}
          onOpenChange={(open) => !open && setMessageClient(null)}
        />
      )}

      {/* Renew Dialog */}
      <Dialog open={!!renewClient} onOpenChange={(open) => !open && setRenewClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renovar Cliente</DialogTitle>
            <DialogDescription>
              Renovar {renewClient?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plano</Label>
              <PlanSelector
                plans={plans}
                value={renewPlanId}
                onValueChange={setRenewPlanId}
                placeholder="Selecione o plano"
                showFilters={true}
                defaultCategory={renewClient?.category}
              />
              <p className="text-xs text-muted-foreground">
                {renewPlanId ? 
                  `Será adicionado ${plans.find(p => p.id === renewPlanId)?.duration_days || 30} dias ao vencimento` :
                  'Selecione um plano para renovar'
                }
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>Vencimento atual:</strong> {renewClient?.expiration_date ? format(new Date(renewClient.expiration_date), "dd/MM/yyyy", { locale: ptBR }) : '-'}</p>
              {renewPlanId && renewClient && (
                <p className="text-success mt-1">
                  <strong>Novo vencimento:</strong> {
                    format(
                      addDays(
                        isAfter(new Date(renewClient.expiration_date), new Date()) 
                          ? new Date(renewClient.expiration_date) 
                          : new Date(), 
                        plans.find(p => p.id === renewPlanId)?.duration_days || 30
                      ), 
                      "dd/MM/yyyy", 
                      { locale: ptBR }
                    )
                  }
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewClient(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmRenew} disabled={!renewPlanId || updateMutation.isPending}>
              Renovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={showDeleteAllConfirm} onOpenChange={(open) => {
        setShowDeleteAllConfirm(open);
        if (!open) setDeleteConfirmText('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Remover Todos os Clientes</DialogTitle>
            <DialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os {clients.length} cliente(s) serão excluídos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
              <p className="text-destructive font-medium">⚠️ Atenção!</p>
              <p className="text-muted-foreground mt-1">
                Você está prestes a excluir <strong>{clients.length}</strong> cliente(s). 
                Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="space-y-2">
              <Label>
                Digite <strong className="text-destructive">CONFIRMAR</strong> para prosseguir:
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="CONFIRMAR"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteAllConfirm(false);
              setDeleteConfirmText('');
            }}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteConfirmText !== 'CONFIRMAR' || deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
