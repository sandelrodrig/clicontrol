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
  PlayCircle,
  History,
  EyeOff,
  Eye,
  RefreshCw,
  Share2,
  Globe,
  AppWindow,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  sellerOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Clientes', href: '/clients', icon: Users, sellerOnly: true },
      { title: 'Apps Pagos', href: '/external-apps', icon: AppWindow, sellerOnly: true },
      { title: 'Servidores', href: '/servers', icon: Server, sellerOnly: true },
      { title: 'Painéis', href: '/panels', icon: Globe, sellerOnly: true },
      { title: 'Planos', href: '/plans', icon: Package, sellerOnly: true },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { title: 'Contas a Pagar', href: '/bills', icon: CreditCard, sellerOnly: true },
      { title: 'Cupons', href: '/coupons', icon: Tag, sellerOnly: true },
      { title: 'Indicações', href: '/referrals', icon: UserPlus, sellerOnly: true },
    ],
  },
  {
    title: 'Mensagens',
    items: [
      { title: 'Templates', href: '/templates', icon: MessageSquare },
      { title: 'Histórico', href: '/message-history', icon: History, sellerOnly: true },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { title: 'Tutoriais', href: '/tutorials', icon: PlayCircle },
      { title: 'Vendedores', href: '/sellers', icon: UserCog, adminOnly: true },
      { title: 'Relatórios', href: '/reports', icon: BarChart3, adminOnly: true },
      { title: 'Backup', href: '/backup', icon: Database, adminOnly: true },
      { title: 'Configurações', href: '/settings', icon: Settings },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, isAdmin, isSeller, signOut } = useAuth();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();
  const location = useLocation();

  const filteredGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.sellerOnly && !isSeller) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sidebar to-sidebar/95">
      {/* Header com Logo */}
      <div className="flex items-center h-16 px-5 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-sidebar" />
          </div>
          <div>
            <span className="font-bold text-lg text-sidebar-foreground tracking-tight">PSControl</span>
            <p className="text-[10px] text-sidebar-foreground/50 -mt-0.5">Gerenciamento Pro</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2 px-3 mb-2">
                <div className="h-px flex-1 bg-gradient-to-r from-sidebar-border/80 to-transparent" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">
                  {group.title}
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-sidebar-border/80 to-transparent" />
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden',
                        isActive
                          ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary shadow-sm'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                      )}
                      <div className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300',
                        isActive 
                          ? 'bg-primary/20' 
                          : 'bg-sidebar-accent/30 group-hover:bg-sidebar-accent'
                      )}>
                        <item.icon className={cn(
                          'w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110',
                          isActive && 'text-primary'
                        )} />
                      </div>
                      <span className="text-sm font-medium flex-1">{item.title}</span>
                      <ChevronRight className={cn(
                        'w-4 h-4 opacity-0 -translate-x-2 transition-all duration-300',
                        'group-hover:opacity-50 group-hover:translate-x-0',
                        isActive && 'opacity-70 translate-x-0'
                      )} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border/50 space-y-3 bg-sidebar-accent/20">
        {/* Privacy Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={togglePrivacyMode}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300',
                  isPrivacyMode 
                    ? 'bg-warning/15 text-warning border border-warning/30' 
                    : 'bg-sidebar-accent/50 text-sidebar-foreground/70 hover:bg-sidebar-accent'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center',
                  isPrivacyMode ? 'bg-warning/20' : 'bg-sidebar-accent'
                )}>
                  {isPrivacyMode ? (
                    <EyeOff className="w-4.5 h-4.5" />
                  ) : (
                    <Eye className="w-4.5 h-4.5" />
                  )}
                </div>
                <span className="text-sm font-medium">
                  {isPrivacyMode ? 'Modo Privado' : 'Ocultar Dados'}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isPrivacyMode ? 'Desativar modo privacidade' : 'Ocultar dados sensíveis'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* User Info Card */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/30">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {(profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || profile?.email?.split('@')[0]}
            </p>
            <p className={cn(
              'text-xs font-medium',
              isAdmin ? 'text-primary' : 'text-success'
            )}>
              {isAdmin ? 'Administrador' : 'Vendedor'}
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="h-8 w-8 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sair</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (isMobile) {
    const handleShare = async () => {
      const url = `${window.location.origin}/landing`;
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
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-gradient-to-r from-sidebar via-sidebar to-sidebar/95 border-b border-sidebar-border/50 backdrop-blur-lg flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sidebar-foreground tracking-tight">PSControl</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-xl"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-xl"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="h-14" />
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border/50">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 bg-sidebar border-r border-sidebar-border/50 shadow-xl shadow-sidebar/10">
      <SidebarContent />
    </aside>
  );
}

export function useSidebarSheet() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}
