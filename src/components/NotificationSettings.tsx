import { Bell, BellOff, Loader2, AlertTriangle, CheckCircle2, Info, Smartphone, Globe } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    isDenied,
    browserCheck,
    lastError,
  } = usePushNotifications();
  
  const [showDetails, setShowDetails] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!isSupported) {
      toast.error('Notificações não suportadas', {
        description: lastError?.details || 'Este navegador não suporta notificações push.'
      });
      return;
    }

    if (checked) {
      const success = await subscribe();
      if (success) {
        toast.success('Notificações push ativadas!', {
          description: 'Você receberá alertas mesmo com o app fechado.'
        });
      } else if (lastError) {
        toast.error(lastError.message, {
          description: lastError.details,
          duration: 6000,
        });
      } else if (permission === 'denied') {
        toast.error('Permissão negada', {
          description: 'Ative nas configurações do navegador'
        });
      } else {
        toast.error('Erro ao ativar notificações');
      }
    } else {
      const success = await unsubscribe();
      if (success) {
        toast.info('Notificações desativadas');
      } else {
        toast.error('Erro ao desativar notificações');
      }
    }
  };

  const getStatusText = () => {
    if (!browserCheck) return 'Verificando...';
    if (!isSupported) {
      if (browserCheck.isIOS && !browserCheck.isIOSVersionSupported) {
        return 'iOS 16.4+ necessário';
      }
      if (!browserCheck.isSecureContext) {
        return 'Requer HTTPS';
      }
      return 'Não suportado neste navegador';
    }
    if (isDenied) return 'Bloqueado nas configurações do navegador';
    if (isLoading) return 'Processando...';
    if (isSubscribed) return 'Ativadas (funciona mesmo com app fechado)';
    return 'Desativadas';
  };

  const getStatusColor = () => {
    if (!browserCheck) return 'text-muted-foreground';
    if (!isSupported || isDenied) return 'text-destructive';
    if (isSubscribed) return 'text-green-500';
    return 'text-muted-foreground';
  };

  const getBrowserCheckIcon = (supported: boolean) => {
    return supported ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-destructive" />
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-foreground animate-spin" />
            ) : isSubscribed ? (
              <Bell className="h-5 w-5 text-foreground" />
            ) : (
              <BellOff className="h-5 w-5 text-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">Notificações Push</p>
            <p className={cn("text-sm", getStatusColor())}>
              {getStatusText()}
            </p>
          </div>
        </div>
        
        {isSupported && !isDenied && (
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        )}
        
        {isDenied && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Acesse as configurações do seu navegador, vá em "Sites" ou "Permissões" e ative as notificações para este site.', { duration: 8000 })}
          >
            Saiba mais
          </Button>
        )}
      </div>
      
      {/* Error display */}
      {lastError && !isSubscribed && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">{lastError.message}</p>
            {lastError.details && (
              <p className="text-xs text-muted-foreground mt-1">{lastError.details}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Browser compatibility details */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
            <Info className="h-4 w-4 mr-2" />
            {showDetails ? 'Ocultar' : 'Ver'} diagnóstico do navegador
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 mt-2">
          {browserCheck && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Navegador:</span>
                <span className="font-medium">{browserCheck.browserName} {browserCheck.browserVersion}</span>
              </div>
              
              {browserCheck.isIOS && (
                <div className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">iOS:</span>
                  <span className="font-medium">
                    {browserCheck.isIOSVersionSupported ? 'Versão compatível' : 'Requer iOS 16.4+'}
                  </span>
                  {getBrowserCheckIcon(browserCheck.isIOSVersionSupported)}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs">
                  {getBrowserCheckIcon(browserCheck.isSecureContext)}
                  <span>Conexão segura (HTTPS)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {getBrowserCheckIcon(browserCheck.hasNotificationAPI)}
                  <span>API de Notificações</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {getBrowserCheckIcon(browserCheck.hasServiceWorker)}
                  <span>Service Worker</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {getBrowserCheckIcon(browserCheck.hasPushManager)}
                  <span>Push Manager</span>
                </div>
              </div>
              
              {!isSupported && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {browserCheck.isIOS && !browserCheck.isIOSVersionSupported ? (
                      'Atualize seu iPhone/iPad para iOS 16.4 ou superior para usar notificações push.'
                    ) : !browserCheck.isSecureContext ? (
                      'Notificações push requerem uma conexão HTTPS segura.'
                    ) : (
                      'Seu navegador não suporta todos os recursos necessários para notificações push. Tente usar Chrome, Firefox, Safari ou Edge atualizados.'
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
