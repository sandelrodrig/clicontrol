import {
  LayoutDashboard,
  Users,
  Server,
  CreditCard,
  Tag,
  UserPlus,
  MessageSquare,
  Settings,
  UserCog,
  BarChart3,
  Package,
  Database,
  PlayCircle,
  History,
  Globe,
  AppWindow,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  sellerOnly?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Configuração centralizada de navegação
 * Usado tanto no Sidebar (Desktop) quanto no Menu Mobile
 */
export const navGroups: NavGroup[] = [
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

/**
 * Lista plana de todos os itens de navegação (para uso em menus simplificados)
 */
export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

/**
 * Filtra itens de navegação baseado nas permissões do usuário
 */
export function filterNavItems(items: NavItem[], isAdmin: boolean, isSeller: boolean): NavItem[] {
  return items.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.sellerOnly && !isSeller && !isAdmin) return false;
    return true;
  });
}

/**
 * Filtra grupos de navegação baseado nas permissões do usuário
 */
export function filterNavGroups(groups: NavGroup[], isAdmin: boolean, isSeller: boolean): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: filterNavItems(group.items, isAdmin, isSeller),
    }))
    .filter((group) => group.items.length > 0);
}
