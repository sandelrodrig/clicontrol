import { ExternalAppsManager } from '@/components/ExternalAppsManager';
import { AppWindow } from 'lucide-react';

export default function ExternalApps() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <AppWindow className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Apps Pagos</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre apps como IBO PRO, Bob Player para vincular aos clientes
          </p>
        </div>
      </div>

      <ExternalAppsManager />
    </div>
  );
}
