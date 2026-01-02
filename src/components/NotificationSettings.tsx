import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const NOTIFICATION_PREF_KEY = 'push_notifications_enabled';

export function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      const storedPref = localStorage.getItem(NOTIFICATION_PREF_KEY);
      setIsEnabled(storedPref === 'true' && Notification.permission === 'granted');
    }
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (!isSupported) {
      toast.error('Notificações não suportadas neste navegador');
      return;
    }

    if (checked) {
      // Request permission if not granted
      if (permission !== 'granted') {
        setIsRequesting(true);
        try {
          const result = await Notification.requestPermission();
          setPermission(result);
          
          if (result === 'granted') {
            setIsEnabled(true);
            localStorage.setItem(NOTIFICATION_PREF_KEY, 'true');
            toast.success('Notificações ativadas!');
            
            // Send test notification
            new Notification('PSControl', {
              body: 'Notificações push ativadas com sucesso!',
              icon: '/icon-192.png',
              tag: 'test'
            });
          } else if (result === 'denied') {
            toast.error('Permissão negada', {
              description: 'Ative nas configurações do navegador'
            });
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
          toast.error('Erro ao solicitar permissão');
        }
        setIsRequesting(false);
      } else {
        setIsEnabled(true);
        localStorage.setItem(NOTIFICATION_PREF_KEY, 'true');
        toast.success('Notificações ativadas!');
      }
    } else {
      setIsEnabled(false);
      localStorage.setItem(NOTIFICATION_PREF_KEY, 'false');
      toast.info('Notificações desativadas');
    }
  };

  const getStatusText = () => {
    if (!isSupported) return 'Não suportado';
    if (permission === 'denied') return 'Bloqueado pelo navegador';
    if (isEnabled) return 'Ativadas';
    return 'Desativadas';
  };

  const getStatusColor = () => {
    if (!isSupported || permission === 'denied') return 'text-destructive';
    if (isEnabled) return 'text-green-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          {isEnabled ? (
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
      
      {isSupported && permission !== 'denied' && (
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isRequesting}
        />
      )}
      
      {permission === 'denied' && (
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
