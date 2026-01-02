import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OfflineIndicatorProps {
  isOffline: boolean;
  lastSync: Date | null;
  onSync?: () => void;
  syncing?: boolean;
}

export function OfflineIndicator({ isOffline, lastSync, onSync, syncing }: OfflineIndicatorProps) {
  if (!isOffline && !lastSync) return null;

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  if (isOffline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-sm">
        <WifiOff className="h-4 w-4" />
        <span className="font-medium">Modo Offline</span>
        {lastSync && (
          <span className="text-xs opacity-75">
            • Sincronizado {formatLastSync(lastSync)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {lastSync && (
        <span className="text-xs text-muted-foreground">
          Sincronizado {formatLastSync(lastSync)}
        </span>
      )}
      {onSync && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          disabled={syncing}
          className="h-8 px-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
}
