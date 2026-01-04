import { forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Menu, LayoutDashboard, Server, Package, Users, AppWindow, UserCog, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface BottomNavigationProps {
  onMenuClick: () => void;
}

// Items para sellers (revendedores)
const sellerNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Server, label: 'Servidor', href: '/servers' },
  { icon: Package, label: 'Planos', href: '/plans' },
  { icon: Users, label: 'Clientes', href: '/clients' },
  { icon: AppWindow, label: 'Apps', href: '/external-apps' },
];

// Items para admin
const adminNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: UserCog, label: 'Vendedores', href: '/sellers' },
  { icon: BarChart3, label: 'Relatórios', href: '/reports' },
];

export const BottomNavigation = forwardRef<HTMLElement, BottomNavigationProps>(
  function BottomNavigation({ onMenuClick }, ref) {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin } = useAuth();

    // Admin vê itens de gestão, seller vê itens de clientes
    const quickNavItems = isAdmin ? adminNavItems : sellerNavItems;

    return (
      <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
        <div className="mx-3 mb-3">
          <div className="bg-gradient-to-r from-sidebar via-sidebar to-sidebar/95 border border-sidebar-border/50 rounded-2xl shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between h-16 px-2">
              {/* Quick Nav Items */}
              <div className="flex items-center gap-1 flex-1 justify-around">
                {quickNavItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <button
                      key={item.href}
                      onClick={() => navigate(item.href)}
                      className={cn(
                        'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200',
                        isActive
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Menu Button */}
              <button
                onClick={onMenuClick}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl',
                  'bg-gradient-to-r from-primary/20 to-primary/10',
                  'text-primary',
                  'hover:from-primary/30 hover:to-primary/15',
                  'active:scale-95 transition-all duration-200',
                  'border border-primary/20'
                )}
              >
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-medium">Menu</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }
);
