import { CloudOff, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PendingQueueIndicator() {
  const { queue, pendingCount, isSyncing, syncQueue, removeFromQueue, clearQueue } = useOfflineQueue();

  if (pendingCount === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-2">
          <CloudOff className="h-4 w-4" />
          <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
            {pendingCount}
          </Badge>
          <span className="hidden sm:inline">Pendentes</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Cobranças Pendentes</h4>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => syncQueue()}
                disabled={isSyncing || !navigator.onLine}
                className="h-8 px-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearQueue()}
                className="h-8 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!navigator.onLine && (
            <p className="text-xs text-muted-foreground">
              Offline - será sincronizado automaticamente quando voltar online
            </p>
          )}

          <ScrollArea className="h-48">
            <div className="space-y-2">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border p-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      {' • '}
                      {item.platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromQueue(item.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
