import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sent_messages_tracker';

interface SentMessage {
  clientId: string;
  sentAt: string;
  templateName?: string;
  platform: 'whatsapp' | 'telegram';
}

export function useSentMessages() {
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSentMessages(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading sent messages:', error);
    }
  }, []);

  // Save to localStorage whenever sentMessages changes
  const saveToStorage = useCallback((messages: SentMessage[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving sent messages:', error);
    }
  }, []);

  const markAsSent = useCallback((clientId: string, templateName?: string, platform: 'whatsapp' | 'telegram' = 'whatsapp') => {
    setSentMessages(prev => {
      // Remove existing entry for this client (we keep only the latest)
      const filtered = prev.filter(m => m.clientId !== clientId);
      const updated = [...filtered, {
        clientId,
        sentAt: new Date().toISOString(),
        templateName,
        platform
      }];
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const clearSentMark = useCallback((clientId: string) => {
    setSentMessages(prev => {
      const updated = prev.filter(m => m.clientId !== clientId);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const clearAllSentMarks = useCallback(() => {
    setSentMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const isSent = useCallback((clientId: string): boolean => {
    return sentMessages.some(m => m.clientId === clientId);
  }, [sentMessages]);

  const getSentInfo = useCallback((clientId: string): SentMessage | undefined => {
    return sentMessages.find(m => m.clientId === clientId);
  }, [sentMessages]);

  const sentCount = sentMessages.length;

  return {
    sentMessages,
    markAsSent,
    clearSentMark,
    clearAllSentMarks,
    isSent,
    getSentInfo,
    sentCount
  };
}
