import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout() {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className={isMobile ? 'min-h-screen' : 'pl-56 min-h-screen'}>
        <div className={isMobile ? 'p-3' : 'p-6'}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
