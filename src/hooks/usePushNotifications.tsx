import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VAPID_PUBLIC_KEY_STORAGE = 'vapid_public_key';
const PUSH_SUBSCRIPTION_STORAGE = 'push_subscription_active';

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Check support and current state
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'Notification' in window && 
                       'serviceWorker' in navigator && 
                       'PushManager' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Check if already subscribed
        const storedActive = localStorage.getItem(PUSH_SUBSCRIPTION_STORAGE);
        if (storedActive === 'true' && Notification.permission === 'granted') {
          try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
          } catch (error) {
            console.error('Error checking subscription:', error);
          }
        }

        // Get stored VAPID key
        const storedKey = localStorage.getItem(VAPID_PUBLIC_KEY_STORAGE);
        if (storedKey) {
          setVapidPublicKey(storedKey);
        }
      }
    };

    checkSupport();
  }, []);

  // Fetch VAPID public key from backend (always fetch fresh)
  const getVapidPublicKey = useCallback(async (): Promise<string | null> => {
    try {
      console.log('[Push] Fetching VAPID public key from server...');
      const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
      
      if (error) {
        console.error('[Push] Error fetching VAPID public key:', error);
        return null;
      }

      const key = data?.publicKey;
      if (key) {
        console.log('[Push] VAPID key received, length:', key.length);
        localStorage.setItem(VAPID_PUBLIC_KEY_STORAGE, key);
        setVapidPublicKey(key);
        return key;
      }
      
      console.error('[Push] No publicKey in response:', data);
      return null;
    } catch (error) {
      console.error('[Push] Error getting VAPID key:', error);
      return null;
    }
  }, []);

  // Convert VAPID key to ArrayBuffer
  const urlBase64ToUint8Array = (base64String: string): ArrayBuffer => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer as ArrayBuffer;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.error('[Push] Not supported in this browser');
      return false;
    }
    
    setIsLoading(true);
    
    try {
      // Request permission
      console.log('[Push] Requesting notification permission...');
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      console.log('[Push] Permission result:', permissionResult);
      
      if (permissionResult !== 'granted') {
        console.log('[Push] Permission not granted');
        setIsLoading(false);
        return false;
      }

      // Get VAPID public key
      console.log('[Push] Getting VAPID public key...');
      const publicKey = await getVapidPublicKey();
      if (!publicKey) {
        console.error('[Push] Failed to get VAPID public key');
        setIsLoading(false);
        return false;
      }
      console.log('[Push] VAPID key obtained, length:', publicKey.length);

      // Get service worker registration
      console.log('[Push] Getting service worker registration...');
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready');
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log('[Push] Already subscribed, unsubscribing first...');
        await existingSubscription.unsubscribe();
      }
      
      // Subscribe to push
      console.log('[Push] Subscribing to push manager...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      console.log('[Push] Subscription created:', subscription.endpoint);

      // Send subscription to backend
      console.log('[Push] Saving subscription to backend...');
      const { error } = await supabase.functions.invoke('save-push-subscription', {
        body: { 
          subscription: subscription.toJSON(),
          action: 'subscribe'
        }
      });

      if (error) {
        console.error('[Push] Error saving subscription:', error);
        setIsLoading(false);
        return false;
      }
      console.log('[Push] Subscription saved successfully');

      localStorage.setItem(PUSH_SUBSCRIPTION_STORAGE, 'true');
      setIsSubscribed(true);
      setIsLoading(false);
      
      // Show test notification
      new Notification('PSControl', {
        body: 'Notificações push ativadas com sucesso!',
        icon: '/icon-192.png',
        tag: 'push-enabled'
      });
      
      return true;
    } catch (error) {
      console.error('[Push] Error subscribing:', error);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, getVapidPublicKey]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    setIsLoading(true);
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();
        
        // Remove from backend
        await supabase.functions.invoke('save-push-subscription', {
          body: { 
            subscription: subscription.toJSON(),
            action: 'unsubscribe'
          }
        });
      }

      localStorage.setItem(PUSH_SUBSCRIPTION_STORAGE, 'false');
      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
  };
}
