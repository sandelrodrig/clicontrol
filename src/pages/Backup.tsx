import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Database, Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { ImportClientsFromProject } from '@/components/ImportClientsFromProject';

interface BackupData {
  version: string;
  timestamp: string;
  user: { id: string; email: string };
  stats: Record<string, number>;
  data: {
    plans?: unknown[];
    servers?: unknown[];
    clients?: unknown[];
    whatsapp_templates?: unknown[];
    coupons?: unknown[];
    bills_to_pay?: unknown[];
    referrals?: unknown[];
    shared_panels?: unknown[];
    panel_clients?: unknown[];
    message_history?: unknown[];
  };
}

export default function Backup() {
  const { user, isAdmin, session } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'append' | 'replace'>('append');
  const [backupFile, setBackupFile] = useState<BackupData | null>(null);
  const [restoreResult, setRestoreResult] = useState<{ restored: Record<string, number>; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-data', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as BackupData;
        if (!data.version || !data.data) {
          throw new Error('Formato de backup inválido');
        }
        setBackupFile(data);
        setRestoreDialogOpen(true);
      } catch (err) {
        toast.error('Arquivo de backup inválido');
      }
    };
    reader.readAsText(file);
    
    // Reset input for re-selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRestore = async () => {
    if (!backupFile) return;

    setIsRestoring(true);
    setRestoreResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('restore-data', {
        body: { backup: backupFile, mode: restoreMode },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;

      setRestoreResult(data);
      
      const totalRestored = Object.values(data.restored).reduce((a: number, b: unknown) => a + (b as number), 0);
      
      if (data.errors?.length > 0) {
        toast.warning(`Backup restaurado parcialmente: ${totalRestored} itens. ${data.errors.length} erros.`);
      } else {
        toast.success(`Backup restaurado com sucesso! ${totalRestored} itens importados.`);
      }
    } catch (error) {
      console.error('Erro ao restaurar:', error);
      toast.error('Erro ao restaurar backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const closeRestoreDialog = () => {
    setRestoreDialogOpen(false);
    setBackupFile(null);
    setRestoreResult(null);
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
              Baixe todos os seus dados em formato JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O backup inclui todos os clientes, servidores, planos, templates, cupons, contas a pagar, indicações e painéis.
            </p>
            <Button onClick={handleExport} disabled={isExporting} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportando...' : 'Exportar Backup'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
                A restauração importa dados do backup. Recomendamos fazer um backup antes de restaurar.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivo de Backup
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import Clients from Project - Admin only */}
      <ImportClientsFromProject />

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

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Restaurar Backup</DialogTitle>
            <DialogDescription>
              {restoreResult ? 'Resultado da restauração' : 'Escolha como deseja restaurar os dados'}
            </DialogDescription>
          </DialogHeader>

          {!restoreResult ? (
            <>
              {backupFile && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                    <p><strong>Versão:</strong> {backupFile.version}</p>
                    <p><strong>Data:</strong> {new Date(backupFile.timestamp).toLocaleString('pt-BR')}</p>
                    {backupFile.stats && (
                      <div className="pt-2">
                        <strong>Itens no backup:</strong>
                        <ul className="list-disc list-inside ml-2 text-muted-foreground">
                          {Object.entries(backupFile.stats).map(([key, value]) => (
                            <li key={key}>{key}: {value}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Modo de restauração:</Label>
                    <RadioGroup value={restoreMode} onValueChange={(v) => setRestoreMode(v as 'append' | 'replace')}>
                      <div className="flex items-start gap-3 p-3 border rounded-lg">
                        <RadioGroupItem value="append" id="append" className="mt-1" />
                        <div>
                          <Label htmlFor="append" className="font-medium">Adicionar</Label>
                          <p className="text-sm text-muted-foreground">
                            Adiciona os dados do backup aos dados existentes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 border border-destructive/50 rounded-lg">
                        <RadioGroupItem value="replace" id="replace" className="mt-1" />
                        <div>
                          <Label htmlFor="replace" className="font-medium text-destructive">Substituir</Label>
                          <p className="text-sm text-muted-foreground">
                            Remove todos os dados existentes e importa apenas o backup
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={closeRestoreDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleRestore} disabled={isRestoring}>
                  {isRestoring ? 'Restaurando...' : 'Restaurar Backup'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-sm font-medium">Restauração concluída!</span>
                </div>

                <div className="p-3 bg-muted rounded-lg text-sm">
                  <strong>Itens restaurados:</strong>
                  <ul className="list-disc list-inside ml-2 text-muted-foreground mt-1">
                    {Object.entries(restoreResult.restored).map(([key, value]) => (
                      <li key={key}>{key}: {value}</li>
                    ))}
                  </ul>
                </div>

                {restoreResult.errors?.length > 0 && (
                  <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                    <strong className="text-destructive">Erros ({restoreResult.errors.length}):</strong>
                    <ul className="list-disc list-inside ml-2 text-muted-foreground mt-1 max-h-32 overflow-y-auto">
                      {restoreResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={closeRestoreDialog}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
