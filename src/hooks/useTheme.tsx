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

export const themes: { id: ThemeColor; name: string; color: string }[] = [
  { id: 'netflix', name: 'Netflix Red', color: 'hsl(0, 84%, 50%)' },
  { id: 'neon-blue', name: 'Neon Blue', color: 'hsl(210, 100%, 50%)' },
  { id: 'emerald', name: 'Emerald', color: 'hsl(160, 84%, 40%)' },
  { id: 'purple', name: 'Purple', color: 'hsl(270, 76%, 55%)' },
  { id: 'orange', name: 'Orange', color: 'hsl(25, 95%, 53%)' },
];
