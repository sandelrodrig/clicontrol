import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check } from 'lucide-react';

export function InstallPWA() {
  const { canInstall, isInstalled, isIOS, install } = usePWA();

  if (isInstalled) {
    return (
      <Card className="border-success/50 bg-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-success">
            <Check className="h-5 w-5" />
            App Instalado
          </CardTitle>
          <CardDescription>
            O aplicativo já está instalado no seu dispositivo
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isIOS) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Instalar no iOS
          </CardTitle>
          <CardDescription>
            Para instalar no iPhone/iPad
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Toque no botão de compartilhar (ícone de quadrado com seta)</p>
          <p>2. Role para baixo e toque em "Adicionar à Tela de Início"</p>
          <p>3. Toque em "Adicionar" para confirmar</p>
        </CardContent>
      </Card>
    );
  }

  if (canInstall) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Instalar Aplicativo
          </CardTitle>
          <CardDescription>
            Instale o app para acesso rápido e offline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={install} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Instalar Agora
          </Button>
        </CardContent>
      </Card>
    );
  }

  return null;
}
