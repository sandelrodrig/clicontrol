import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
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
  Menu,
  X,
  PlayCircle,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  sellerOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', href: '/clients', icon: Users, sellerOnly: true },
  { title: 'Servidores', href: '/servers', icon: Server, sellerOnly: true },
  { title: 'Planos', href: '/plans', icon: Package, sellerOnly: true },
  { title: 'Contas a Pagar', href: '/bills', icon: CreditCard, sellerOnly: true },
  { title: 'Cupons', href: '/coupons', icon: Tag, sellerOnly: true },
  { title: 'Indicações', href: '/referrals', icon: UserPlus, sellerOnly: true },
  
  { title: 'Templates', href: '/templates', icon: MessageSquare },
  { title: 'Histórico', href: '/message-history', icon: History, sellerOnly: true },
  { title: 'Tutoriais', href: '/tutorials', icon: PlayCircle },
  { title: 'Vendedores', href: '/sellers', icon: UserCog, adminOnly: true },
  { title: 'Relatórios', href: '/reports', icon: BarChart3, adminOnly: true },
  { title: 'Backup', href: '/backup', icon: Database, adminOnly: true },
  { title: 'Configurações', href: '/settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, isAdmin, isSeller, signOut } = useAuth();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();
  const location = useLocation();

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.sellerOnly && !isSeller) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Users className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sidebar-foreground">PSControl</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
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

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {/* Privacy Mode Toggle */}
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
                {isPrivacyMode ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                <span className="ml-2">
                  {isPrivacyMode ? 'Privacidade ON' : 'Ocultar Dados'}
                </span>
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

export function Sidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Mobile: Sheet sidebar with bottom nav
  if (isMobile) {
  const handleShare = async () => {
    const url = `${window.location.origin}/auth`;
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
      <>
        {/* Mobile Header */}
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Users className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">PSControl</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-9 w-9 text-sidebar-foreground"
              title="Atualizar"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-9 w-9 text-sidebar-foreground"
              title="Compartilhar"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </header>
        {/* Spacer for fixed header */}
        <div className="h-14" />
        {/* Sheet for full menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 bg-sidebar border-r border-sidebar-border">
      <SidebarContent />
    </aside>
  );
}

export function useSidebarSheet() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
