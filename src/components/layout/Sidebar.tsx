import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Server,
  FileText,
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
  ChevronLeft,
  ChevronRight,
  Tv,
  History,
  EyeOff,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  { title: 'Créditos Compartilhados', href: '/shared-panels', icon: Tv, sellerOnly: true },
  { title: 'Templates', href: '/templates', icon: MessageSquare },
  { title: 'Histórico Mensagens', href: '/message-history', icon: History, sellerOnly: true },
  { title: 'Vendedores', href: '/sellers', icon: UserCog, adminOnly: true },
  { title: 'Relatórios', href: '/reports', icon: BarChart3, adminOnly: true },
  { title: 'Backup', href: '/backup', icon: Database, adminOnly: true },
  { title: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const { profile, isAdmin, isSeller, signOut } = useAuth();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyMode();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.sellerOnly && !isSeller) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Users className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">Controle</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          {/* Privacy Mode Toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isPrivacyMode ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start',
                    isPrivacyMode && 'bg-warning/20 text-warning hover:bg-warning/30',
                    collapsed && 'justify-center px-0'
                  )}
                  onClick={togglePrivacyMode}
                >
                  {isPrivacyMode ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  {!collapsed && (
                    <span className="ml-2">
                      {isPrivacyMode ? 'Modo Privacidade' : 'Ocultar Dados'}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isPrivacyMode ? 'Desativar modo privacidade' : 'Ocultar dados sensíveis para gravação'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!collapsed && (
            <div className="mb-1 px-2">
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {profile?.full_name || profile?.email}
              </p>
              <p className="text-xs text-primary font-medium">
                {isAdmin ? 'Administrador' : 'Vendedor'}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive',
              collapsed && 'justify-center px-0'
            )}
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
