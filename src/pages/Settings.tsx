import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, Phone, Mail, Save, Shield, Palette, Smartphone, Building2, CreditCard, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ThemeSelector } from '@/components/ThemeSelector';
import { InstallPWA } from '@/components/InstallPWA';

export default function Settings() {
  const { user, profile, isAdmin, isSeller } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    whatsapp: profile?.whatsapp || '',
    company_name: (profile as { company_name?: string })?.company_name || '',
    pix_key: (profile as { pix_key?: string })?.pix_key || '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        whatsapp: profile.whatsapp || '',
        company_name: (profile as { company_name?: string })?.company_name || '',
        pix_key: (profile as { pix_key?: string })?.pix_key || '',
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { full_name: string; whatsapp: string; company_name: string; pix_key: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const copyPixKey = () => {
    if (formData.pix_key) {
      navigator.clipboard.writeText(formData.pix_key);
      toast.success('Chave PIX copiada!');
    }
  };

  const subscriptionStatus = () => {
    if (profile?.is_permanent) return { text: 'Permanente', color: 'text-success' };
    if (!profile?.subscription_expires_at) return { text: 'Não definido', color: 'text-muted-foreground' };
    
    const expiresAt = new Date(profile.subscription_expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      return { text: 'Expirado', color: 'text-destructive' };
    }
    
    return {
      text: `Expira em ${format(expiresAt, "dd 'de' MMMM, yyyy", { locale: ptBR })}`,
      color: 'text-foreground'
    };
  };

  const status = subscriptionStatus();

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e informações</p>
      </div>

      {/* Theme Selector Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Tema do Sistema
          </CardTitle>
          <CardDescription>Personalize a aparência do aplicativo</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      {/* PWA Install Card */}
      <InstallPWA />

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </CardTitle>
          <CardDescription>Atualize suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+55 11 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">Nome da Empresa</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Minha Revenda IPTV"
                />
              </div>
              <p className="text-xs text-muted-foreground">Usado como {'{empresa}'} nos templates</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pix_key">Chave PIX</Label>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="pix_key"
                  value={formData.pix_key}
                  onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                  placeholder="email@exemplo.com, CPF, CNPJ ou chave aleatória"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyPixKey}
                  disabled={!formData.pix_key}
                  title="Copiar chave PIX"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Usado como {'{pix}'} nas mensagens de cobrança</p>
            </div>

            <Button type="submit" disabled={updateProfileMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status da Conta
          </CardTitle>
          <CardDescription>Informações sobre sua assinatura</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <span className="text-muted-foreground">Tipo de Conta</span>
            <span className="font-medium text-primary">
              {isAdmin ? 'Administrador' : 'Vendedor'}
            </span>
          </div>

          {isSeller && (
            <div className="flex items-center justify-between py-3 border-b border-border">
              <span className="text-muted-foreground">Assinatura</span>
              <span className={`font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-3">
            <span className="text-muted-foreground">Membro desde</span>
            <span className="font-medium">
              {profile?.created_at
                ? format(new Date(profile.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })
                : 'Não disponível'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
