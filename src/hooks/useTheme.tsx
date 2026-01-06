import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeColor = 'netflix' | 'neon-blue' | 'emerald' | 'purple' | 'orange';

interface ThemeContextType {
  theme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem('app-theme');
    return (saved as ThemeColor) || 'netflix';
  });

  useEffect(() => {
    localStorage.setItem('app-theme', theme);
    
    // Remove all theme classes
    document.documentElement.classList.remove('theme-netflix', 'theme-neon-blue', 'theme-emerald', 'theme-purple', 'theme-orange');
    
    // Add current theme class
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export const themes: { id: ThemeColor; name: string; color: string; description: string; isDark: boolean }[] = [
  { id: 'netflix', name: 'Cinema', color: 'hsl(0, 84%, 50%)', description: 'Escuro cinematográfico', isDark: true },
  { id: 'neon-blue', name: 'Cyberpunk', color: 'hsl(200, 100%, 50%)', description: 'Azul neon futurista', isDark: true },
  { id: 'emerald', name: 'Clean', color: 'hsl(160, 84%, 35%)', description: 'Claro e elegante', isDark: false },
  { id: 'purple', name: 'Luxo', color: 'hsl(280, 80%, 60%)', description: 'Roxo premium', isDark: true },
  { id: 'orange', name: 'Sunset', color: 'hsl(25, 95%, 50%)', description: 'Quente e acolhedor', isDark: false },
];
