import { ExternalAppsManager } from '@/components/ExternalAppsManager';
import { ExternalAppsExpirationReport } from '@/components/ExternalAppsExpirationReport';
import { AppWindow } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Calendar } from 'lucide-react';

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

      <Tabs defaultValue="apps" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="apps" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Gerenciar Apps
          </TabsTrigger>
          <TabsTrigger value="expirations" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Vencimentos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="apps" className="mt-4">
          <ExternalAppsManager />
        </TabsContent>
        
        <TabsContent value="expirations" className="mt-4">
          <ExternalAppsExpirationReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
