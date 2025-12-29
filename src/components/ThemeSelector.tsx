import { useTheme, themes, ThemeColor } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-5 gap-3">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          className={cn(
            'relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200',
            theme === t.id 
              ? 'border-primary bg-primary/10' 
              : 'border-border hover:border-muted-foreground'
          )}
        >
          <div 
            className="w-8 h-8 rounded-full shadow-md"
            style={{ backgroundColor: t.color }}
          />
          {theme === t.id && (
            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground">{t.name}</span>
        </button>
      ))}
    </div>
  );
}
