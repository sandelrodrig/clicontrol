import { useState, useEffect, createContext, useContext } from 'react';

export type MenuStyle = 'default' | 'compact' | 'icons-only';

interface MenuStyleContextType {
  menuStyle: MenuStyle;
  setMenuStyle: (style: MenuStyle) => void;
}

const MenuStyleContext = createContext<MenuStyleContextType | undefined>(undefined);

const MENU_STYLE_KEY = 'pscontrol-menu-style';

export function MenuStyleProvider({ children }: { children: React.ReactNode }) {
  const [menuStyle, setMenuStyleState] = useState<MenuStyle>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(MENU_STYLE_KEY);
      if (saved && ['default', 'compact', 'icons-only'].includes(saved)) {
        return saved as MenuStyle;
      }
    }
    return 'default';
  });

  const setMenuStyle = (style: MenuStyle) => {
    setMenuStyleState(style);
    localStorage.setItem(MENU_STYLE_KEY, style);
  };

  return (
    <MenuStyleContext.Provider value={{ menuStyle, setMenuStyle }}>
      {children}
    </MenuStyleContext.Provider>
  );
}

export function useMenuStyle() {
  const context = useContext(MenuStyleContext);
  if (context === undefined) {
    throw new Error('useMenuStyle must be used within a MenuStyleProvider');
  }
  return context;
}
