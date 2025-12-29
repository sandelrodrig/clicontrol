import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Database, Download, Upload, AlertTriangle } from 'lucide-react';

export default function Backup() {
  const { isAdmin } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [
        profilesRes,
        clientsRes,
        serversRes,
        plansRes,
        templatesRes,
        couponsRes,
        billsRes,
        referralsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('servers').select('*'),
        supabase.from('plans').select('*'),
        supabase.from('whatsapp_templates').select('*'),
        supabase.from('coupons').select('*'),
        supabase.from('bills_to_pay').select('*'),
        supabase.from('referrals').select('*'),
      ]);

      const backup = {
        version: '1.0',
        created_at: new Date().toISOString(),
        data: {
          profiles: profilesRes.data || [],
          clients: clientsRes.data || [],
          servers: serversRes.data || [],
          plans: plansRes.data || [],
          whatsapp_templates: templatesRes.data || [],
          coupons: couponsRes.data || [],
          bills_to_pay: billsRes.data || [],
          referrals: referralsRes.data || [],
        },
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Backup exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar backup');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backup e Restauração</h1>
        <p className="text-muted-foreground">Exporte e importe dados do sistema</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Backup
            </CardTitle>
            <CardDescription>
              Baixe todos os dados em formato JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O backup inclui todos os perfis, clientes, servidores, planos, templates, cupons, contas a pagar e indicações.
            </p>
            <Button onClick={handleExport} disabled={isExporting} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportando...' : 'Exportar Backup'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <Upload className="h-5 w-5" />
              Restaurar Backup
            </CardTitle>
            <CardDescription>
              Importe dados de um arquivo de backup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                A restauração é uma operação delicada. Recomendamos fazer um backup antes de restaurar dados.
              </p>
            </div>
            <Button variant="outline" disabled className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Restaurar Backup (Em breve)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Informações do Banco de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O sistema utiliza Lovable Cloud como backend, garantindo segurança e escalabilidade para seus dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
