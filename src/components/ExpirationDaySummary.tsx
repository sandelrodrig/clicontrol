import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, DollarSign, Users } from 'lucide-react';
import { differenceInDays, format, startOfToday, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
  expiration_date: string;
  plan_price: number | null;
  premium_price: number | null;
  is_archived: boolean | null;
}

interface ExpirationDaySummaryProps {
  clients: Client[];
  isPrivacyMode?: boolean;
}

interface DaySummary {
  date: Date;
  dayLabel: string;
  clients: Client[];
  totalRevenue: number;
}

export function ExpirationDaySummary({ clients, isPrivacyMode = false }: ExpirationDaySummaryProps) {
  const today = startOfToday();

  const daySummaries = useMemo(() => {
    // Filter only active (non-archived) clients
    const activeClients = clients.filter(c => !c.is_archived);
    
    // Group clients by days until expiration (0 to 5 days)
    const summaries: DaySummary[] = [];
    
    for (let i = 0; i <= 5; i++) {
      const targetDate = addDays(today, i);
      const clientsForDay = activeClients.filter(client => {
        const expDate = new Date(client.expiration_date);
        const daysUntil = differenceInDays(expDate, today);
        return daysUntil === i;
      });
      
      const totalRevenue = clientsForDay.reduce((sum, client) => {
        const planPrice = client.plan_price || 0;
        const premiumPrice = client.premium_price || 0;
        return sum + planPrice + premiumPrice;
      }, 0);

      let dayLabel = '';
      if (i === 0) {
        dayLabel = 'Hoje';
      } else if (i === 1) {
        dayLabel = 'Amanhã';
      } else {
        dayLabel = format(targetDate, "EEEE", { locale: ptBR });
        // Capitalize first letter
        dayLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
      }

      summaries.push({
        date: targetDate,
        dayLabel,
        clients: clientsForDay,
        totalRevenue,
      });
    }
    
    return summaries;
  }, [clients, today]);

  // Only show if there are clients expiring in the next 5 days
  const hasExpiringClients = daySummaries.some(s => s.clients.length > 0);
  
  if (!hasExpiringClients) {
    return null;
  }

  const totalClients = daySummaries.reduce((sum, s) => sum + s.clients.length, 0);
  const totalRevenue = daySummaries.reduce((sum, s) => sum + s.totalRevenue, 0);

  return (
    <Card className="border-warning/30 bg-gradient-to-r from-warning/5 via-transparent to-warning/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-warning" />
            <h3 className="font-semibold text-sm">Vencimentos Próximos</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {totalClients} cliente{totalClients !== 1 ? 's' : ''}
            </span>
            {!isPrivacyMode && (
              <span className="flex items-center gap-1 text-success font-medium">
                <DollarSign className="h-3 w-3" />
                R$ {totalRevenue.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {daySummaries.map((summary, index) => (
            <div
              key={index}
              className={`
                p-2.5 rounded-lg border transition-all
                ${summary.clients.length > 0 
                  ? 'bg-card border-border hover:border-warning/50' 
                  : 'bg-muted/30 border-transparent opacity-50'
                }
              `}
            >
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">
                  {summary.dayLabel}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mb-1">
                  {format(summary.date, "dd/MM")}
                </p>
                <div className="flex items-center justify-center gap-1.5">
                  <Badge 
                    variant={summary.clients.length > 0 ? "default" : "secondary"}
                    className={`
                      text-xs px-1.5 min-w-[24px] justify-center
                      ${index === 0 && summary.clients.length > 0 ? 'bg-destructive hover:bg-destructive' : ''}
                      ${index === 1 && summary.clients.length > 0 ? 'bg-warning hover:bg-warning text-warning-foreground' : ''}
                    `}
                  >
                    {summary.clients.length}
                  </Badge>
                </div>
                {!isPrivacyMode && summary.totalRevenue > 0 && (
                  <p className="text-[10px] text-success font-medium mt-1">
                    R$ {summary.totalRevenue.toFixed(0)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
