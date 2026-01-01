import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ExternalLink, Server, Search, Globe, Tv, Copy, CheckCircle2, Smartphone, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';


interface ServerPanel {
  id: string;
  name: string;
  panel_url: string | null;
  icon_url: string | null;
  is_active: boolean;
  is_credit_based: boolean;
  total_credits: number | null;
  used_credits: number | null;
}

const Panels = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['server-panels', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('servers')
        .select('id, name, panel_url, icon_url, is_active, is_credit_based, total_credits, used_credits')
        .eq('seller_id', user.id)
        .eq('is_active', true)
        .not('panel_url', 'is', null)
        .order('name');
      
      if (error) throw error;
      return (data || []).filter(s => s.panel_url && s.panel_url.trim() !== '') as ServerPanel[];
    },
    enabled: !!user?.id,
  });

  // Fetch GerenciaApp settings
  const { data: gerenciaAppSettings } = useQuery({
    queryKey: ['gerencia-app-settings'],
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

  const filteredServers = servers.filter(server =>
    server.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenPanel = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-primary">Carregando painéis...</div>
      </div>
    );
  }

  const hasGerenciaApp = gerenciaAppSettings?.panelUrl && gerenciaAppSettings.panelUrl.trim() !== '';

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painéis</h1>
            <p className="text-muted-foreground text-sm">
              Acesse rapidamente os painéis dos seus servidores
            </p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar painel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* GerenciaApp Card - Special Panel */}
        {hasGerenciaApp && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">GerenciaApp</CardTitle>
                    <CardDescription>Painel de gerenciamento de apps</CardDescription>
                  </div>
                </div>
                <Badge className="bg-primary text-primary-foreground">
                  Apps
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 overflow-hidden">
                <Globe className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{gerenciaAppSettings?.panelUrl}</span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => handleOpenPanel(gerenciaAppSettings!.panelUrl)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Acessar Painel
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyUrl('gerencia-app', gerenciaAppSettings!.panelUrl)}
                >
                  {copiedId === 'gerencia-app' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {gerenciaAppSettings?.registerUrl && (
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOpenPanel(gerenciaAppSettings.registerUrl)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Cadastrar no GerenciaApp
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Panels Grid */}
        {filteredServers.length === 0 && !hasGerenciaApp ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-foreground mb-2">
                {search ? 'Nenhum painel encontrado' : 'Nenhum painel configurado'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {search 
                  ? 'Tente buscar por outro termo'
                  : 'Configure URLs de painel nos seus servidores para acessá-los aqui rapidamente'
                }
              </p>
            </CardContent>
          </Card>
        ) : filteredServers.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServers.map((server) => (
              <Card 
                key={server.id} 
                className="group hover:shadow-lg hover:border-primary/30 transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {server.icon_url ? (
                        <img 
                          src={server.icon_url} 
                          alt={server.name}
                          className="w-10 h-10 rounded-lg object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Server className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{server.name}</CardTitle>
                        {server.is_credit_based && (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              <Tv className="w-3 h-3 mr-1" />
                              {server.used_credits || 0}/{server.total_credits || 0} créditos
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      Ativo
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 overflow-hidden">
                    <Globe className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{server.panel_url}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => handleOpenPanel(server.panel_url!)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyUrl(server.id, server.panel_url!)}
                    >
                      {copiedId === server.id ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        {(servers.length > 0 || hasGerenciaApp) && (
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>{servers.length + (hasGerenciaApp ? 1 : 0)} painel(is) configurado(s)</span>
          </div>
        )}
      </div>
  );
};

export default Panels;
