import { useExpirationNotifications } from '@/hooks/useExpirationNotifications';
import { useExternalAppsExpirationNotifications } from '@/hooks/useExternalAppsExpirationNotifications';

export function ExpirationNotificationProvider({ children }: { children: React.ReactNode }) {
  // These hooks handle all the notification logic internally
  useExpirationNotifications();
  useExternalAppsExpirationNotifications();
  
  return <>{children}</>;
}
