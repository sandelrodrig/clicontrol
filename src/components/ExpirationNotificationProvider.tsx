import { useExpirationNotifications } from '@/hooks/useExpirationNotifications';

export function ExpirationNotificationProvider({ children }: { children: React.ReactNode }) {
  // This hook handles all the notification logic internally
  useExpirationNotifications();
  
  return <>{children}</>;
}
