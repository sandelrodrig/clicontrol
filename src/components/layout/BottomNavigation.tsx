import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Menu, Sparkles } from 'lucide-react';

interface BottomNavigationProps {
  onMenuClick: () => void;
}

export const BottomNavigation = forwardRef<HTMLElement, BottomNavigationProps>(
  function BottomNavigation({ onMenuClick }, ref) {
    return (
      <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
        <div className="mx-4 mb-4">
          <div className="bg-gradient-to-r from-sidebar via-sidebar to-sidebar/95 border border-sidebar-border/50 rounded-2xl shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-center h-14 px-4">
              <button
                onClick={onMenuClick}
                className={cn(
                  'flex items-center gap-3 px-6 py-2.5 rounded-xl',
                  'bg-gradient-to-r from-primary/20 to-primary/5',
                  'text-primary font-medium text-sm',
                  'hover:from-primary/30 hover:to-primary/10',
                  'active:scale-95 transition-all duration-300',
                  'border border-primary/20'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Menu className="h-4 w-4" />
                </div>
                <span>Abrir Menu</span>
                <Sparkles className="h-3.5 w-3.5 opacity-60" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }
);
