import { useOnboardingCheck } from '@/hooks/useOnboardingCheck';
import { cn } from '@/lib/utils';
import { Server, Package, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function OnboardingProgressBar() {
  const { hasServers, hasPlans, hasClients, needsOnboarding, loading } = useOnboardingCheck();

  // Don't show if user doesn't need onboarding or is loading
  if (!needsOnboarding || loading) return null;

  // If all completed, don't show
  if (hasServers && hasPlans && hasClients) return null;

  const steps = [
    { id: 'servers', label: 'Servidor', icon: Server, completed: hasServers, href: '/servers' },
    { id: 'plans', label: 'Planos', icon: Package, completed: hasPlans, href: '/plans', locked: !hasServers },
    { id: 'clients', label: 'Clientes', icon: Users, completed: hasClients, href: '/clients', locked: !hasServers || !hasPlans },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-40 px-3 md:px-6 md:left-auto md:right-6 md:w-auto">
      <div className="bg-card/95 backdrop-blur-lg border border-border rounded-xl shadow-xl p-3 md:p-4 max-w-md mx-auto md:mx-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Configuração inicial
          </span>
          <span className="text-xs font-bold text-primary">
            {completedCount}/{steps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between gap-1">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isNext = !step.completed && !step.locked && steps.slice(0, index).every((s) => s.completed);

            return (
              <div key={step.id} className="flex items-center">
                {step.locked ? (
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-lg',
                      'bg-muted/50 text-muted-foreground opacity-50'
                    )}
                  >
                    <StepIcon className="w-4 h-4" />
                    <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
                  </div>
                ) : (
                  <Link
                    to={step.href}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all',
                      step.completed
                        ? 'bg-success/20 text-success'
                        : isNext
                        ? 'bg-primary/20 text-primary animate-pulse'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    <StepIcon className="w-4 h-4" />
                    <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
                  </Link>
                )}
                {index < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-muted-foreground/50 mx-0.5 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
