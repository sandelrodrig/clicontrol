import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Server,
  Menu,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const bottomNavItems: NavItem[] = [
  { title: 'Início', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', href: '/clients', icon: Users },
  { title: 'Servidores', href: '/servers', icon: Server },
];

interface BottomNavigationProps {
  onMenuClick: () => void;
}

export function BottomNavigation({ onMenuClick }: BottomNavigationProps) {
  const { isSeller } = useAuth();
  const location = useLocation();

  // Filter items based on role - only show to sellers
  const filteredItems = isSeller ? bottomNavItems : [bottomNavItems[0]];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className={cn('text-[10px] font-medium', isActive && 'text-primary')}>
                {item.title}
              </span>
            </Link>
          );
        })}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
