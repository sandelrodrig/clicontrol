import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    isDenied,
  } = usePushNotifications();

  const handleToggle = async (checked: boolean) => {
    if (!isSupported) {
      toast.error('Notificações não suportadas neste navegador');
      return;
    }

    if (checked) {
      const success = await subscribe();
      if (success) {
        toast.success('Notificações push ativadas!');
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
    if (!isSupported) return 'Não suportado';
    if (isDenied) return 'Bloqueado pelo navegador';
    if (isLoading) return 'Processando...';
    if (isSubscribed) return 'Ativadas (funciona mesmo com app fechado)';
    return 'Desativadas';
  };

  const getStatusColor = () => {
    if (!isSupported || isDenied) return 'text-destructive';
    if (isSubscribed) return 'text-green-500';
    return 'text-muted-foreground';
  };

  return (
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
          onClick={() => toast.info('Ative nas configurações do navegador')}
        >
          Saiba mais
        </Button>
      )}
    </div>
  );
}
