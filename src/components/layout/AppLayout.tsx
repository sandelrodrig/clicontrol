import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { BottomNavigation } from './BottomNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { FloatingNotifications } from '@/components/FloatingNotifications';
import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Server,
  CreditCard,
  Tag,
  UserPlus,
  MessageSquare,
  Settings,
  LogOut,
  UserCog,
  BarChart3,
  Package,
  Database,
  Tv,
  History,
  EyeOff,
  Eye,
  PlayCircle,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', href: '/clients', icon: Users, sellerOnly: true },
  { title: 'Servidores', href: '/servers', icon: Server, sellerOnly: true },
  { title: 'Planos', href: '/plans', icon: Package, sellerOnly: true },
  { title: 'Contas a Pagar', href: '/bills', icon: CreditCard, sellerOnly: true },
  { title: 'Cupons', href: '/coupons', icon: Tag, sellerOnly: true },
  { title: 'Indicações', href: '/referrals', icon: UserPlus, sellerOnly: true },
  { title: 'Painéis', href: '/shared-panels', icon: Tv, sellerOnly: true },
  { title: 'Templates', href: '/templates', icon: MessageSquare },
  { title: 'Histórico', href: '/message-history', icon: History, sellerOnly: true },
  { title: 'Tutoriais', href: '/tutorials', icon: PlayCircle },
  { title: 'Vendedores', href: '/sellers', icon: UserCog, adminOnly: true },
  { title: 'Relatórios', href: '/reports', icon: BarChart3, adminOnly: true },
  { title: 'Backup', href: '/backup', icon: Database, adminOnly: true },
  { title: 'Configurações', href: '/settings', icon: Settings },
];

function MobileMenuContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, isAdmin, isSeller, signOut } = useAuth();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();
  const location = useLocation();

  const filteredNavItems = navItems.filter((item: any) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.sellerOnly && !isSeller) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Users className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">PSControl</span>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {filteredNavItems.map((item: any) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isPrivacyMode ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  isPrivacyMode && 'bg-warning/20 text-warning hover:bg-warning/30'
                )}
                onClick={togglePrivacyMode}
              >
                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="ml-2">{isPrivacyMode ? 'Privacidade ON' : 'Ocultar Dados'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isPrivacyMode ? 'Desativar modo privacidade' : 'Ocultar dados sensíveis'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="mb-1 px-2">
          <p className="text-xs text-sidebar-foreground/60 truncate">
            {profile?.full_name || profile?.email}
          </p>
          <p className="text-xs text-primary font-medium">
            {isAdmin ? 'Administrador' : 'Vendedor'}
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4" />
          <span className="ml-2">Sair</span>
        </Button>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleShare = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PSControl',
          text: 'Confira este aplicativo de gerenciamento de clientes!',
          url: url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(url);
          toast.success('Link copiado!');
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado!');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Action Bar */}
      <div className={cn(
        "fixed top-0 right-0 z-40 p-2",
        isMobile ? "left-0" : "left-56"
      )}>
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="gap-2"
            title="Compartilhar"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
        </div>
      </div>
      
      <Sidebar />
      <main className={isMobile ? 'min-h-screen pb-20 pt-12' : 'pl-56 min-h-screen pt-12'}>
        <div className={isMobile ? 'p-3' : 'p-6'}>
          <Outlet />
        </div>
      </main>
      {isMobile && (
        <>
          <BottomNavigation onMenuClick={() => setMenuOpen(true)} />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
              <MobileMenuContent onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </>
      )}
      <FloatingNotifications />
    </div>
  );
}
