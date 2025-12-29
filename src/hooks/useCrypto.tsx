import { supabase } from '@/integrations/supabase/client';

interface CryptoHook {
  encrypt: (plaintext: string) => Promise<string>;
  decrypt: (ciphertext: string) => Promise<string>;
}

export function useCrypto(): CryptoHook {
  const encrypt = async (plaintext: string): Promise<string> => {
    if (!plaintext) return '';
    
    try {
      const { data, error } = await supabase.functions.invoke('crypto', {
        body: { action: 'encrypt', data: plaintext }
      });

      if (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
      }

      return data.result;
    } catch (err) {
      console.error('Encryption error:', err);
      throw err;
    }
  };

  const decrypt = async (ciphertext: string): Promise<string> => {
    if (!ciphertext) return '';
    
    try {
      const { data, error } = await supabase.functions.invoke('crypto', {
        body: { action: 'decrypt', data: ciphertext }
      });

      if (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
      }

      return data.result;
    } catch (err) {
      console.error('Decryption error:', err);
      throw err;
    }
  };

  return { encrypt, decrypt };
}
