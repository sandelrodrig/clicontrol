import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { format, startOfToday, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Trash2, 
  Save,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';

interface MonthlyProfit {
  id: string;
  seller_id: string;
  month: number;
  year: number;
  revenue: number;
  server_costs: number;
  bills_costs: number;
  net_profit: number;
  active_clients: number;
  closed_at: string | null;
  created_at: string;
}

interface MonthlyProfitHistoryProps {
  sellerId: string;
  currentRevenue: number;
  currentServerCosts: number;
  currentBillsCosts?: number;
  currentNetProfit: number;
  currentActiveClients: number;
  isPrivacyMode: boolean;
  maskData: (value: string, type?: string) => string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function MonthlyProfitHistory({
  sellerId,
  currentRevenue,
  currentServerCosts,
  currentBillsCosts = 0,
  currentNetProfit,
  currentActiveClients,
  isPrivacyMode,
  maskData,
}: MonthlyProfitHistoryProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const today = startOfToday();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  // Check if we can show delete button (January 1st to January 31st)
  const canDeleteYearHistory = currentMonth === 1;
  
  // Check if it's the first day of the month (reminder to save last month)
  const isFirstDayOfMonth = currentDay === 1;

  // Fetch profit history
  const { data: profitHistory = [], isLoading } = useQuery({
    queryKey: ['monthly-profits', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_profits')
        .select('*')
        .eq('seller_id', sellerId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) throw error;
      return data as MonthlyProfit[];
    },
    enabled: !!sellerId,
  });

  // Get current month's saved data (if any)
  const currentMonthData = profitHistory.find(
    p => p.month === currentMonth && p.year === currentYear
  );
  
  // Get last month info
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const lastMonthData = profitHistory.find(
    p => p.month === lastMonth && p.year === lastMonthYear
  );
  
  // Check if last month was saved
  const lastMonthSaved = !!lastMonthData;

  // Get previous months for current year
  const currentYearProfits = profitHistory.filter(p => p.year === currentYear);
  
  // Get previous years
  const previousYears = [...new Set(profitHistory.map(p => p.year))]
    .filter(y => y < currentYear)
    .sort((a, b) => b - a);

  // Calculate annual totals
  const getYearTotal = (year: number) => {
    const yearProfits = profitHistory.filter(p => p.year === year);
    return {
      revenue: yearProfits.reduce((sum, p) => sum + Number(p.revenue), 0),
      serverCosts: yearProfits.reduce((sum, p) => sum + Number(p.server_costs), 0),
      billsCosts: yearProfits.reduce((sum, p) => sum + Number(p.bills_costs), 0),
      netProfit: yearProfits.reduce((sum, p) => sum + Number(p.net_profit), 0),
      monthCount: yearProfits.length,
    };
  };

  const currentYearTotal = getYearTotal(currentYear);

  // Save current month mutation
  const saveCurrentMonth = useMutation({
    mutationFn: async () => {
      const data = {
        seller_id: sellerId,
        month: currentMonth,
        year: currentYear,
        revenue: currentRevenue,
        server_costs: currentServerCosts,
        bills_costs: currentBillsCosts,
        net_profit: currentNetProfit,
        active_clients: currentActiveClients,
        closed_at: new Date().toISOString(),
      };

      if (currentMonthData) {
        const { error } = await supabase
          .from('monthly_profits')
          .update(data)
          .eq('id', currentMonthData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('monthly_profits')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-profits', sellerId] });
      toast.success('Lucro do mês salvo com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar lucro do mês');
    },
  });

  // Delete year history mutation
  const deleteYearHistory = useMutation({
    mutationFn: async (year: number) => {
      const { error } = await supabase
        .from('monthly_profits')
        .delete()
        .eq('seller_id', sellerId)
        .eq('year', year);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-profits', sellerId] });
      toast.success('Histórico do ano excluído com sucesso!');
      setShowDeleteConfirm(false);
    },
    onError: () => {
      toast.error('Erro ao excluir histórico');
    },
  });

  // Get last year for deletion
  const lastYear = currentYear - 1;
  const lastYearExists = profitHistory.some(p => p.year === lastYear);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Lucros
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Recolher
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Expandir
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Salve o lucro mensal e acompanhe o histórico anual
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Reminder to save last month if it's the first day */}
        {isFirstDayOfMonth && !lastMonthSaved && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-sm font-medium text-warning flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Novo mês! Lembre-se de salvar o lucro de {MONTH_NAMES[lastMonth - 1]} {lastMonthYear}.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              O lucro do mês anterior não foi salvo ainda. Verifique os dados e salve antes de continuar.
            </p>
          </div>
        )}

        {/* Current Month Info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
          <div>
            <p className="font-medium">
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </p>
            <p className="text-sm text-muted-foreground">
              Lucro do mês atual: {maskData(`R$ ${currentNetProfit.toFixed(2)}`, 'money')}
            </p>
            {currentMonthData && (
              <p className="text-xs text-success mt-1">
                Último salvamento: {format(new Date(currentMonthData.closed_at!), "dd/MM 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
          <Button
            onClick={() => saveCurrentMonth.mutate()}
            disabled={saveCurrentMonth.isPending}
            className="gap-2"
            size="sm"
          >
            <Save className="h-4 w-4" />
            {currentMonthData ? 'Atualizar' : 'Salvar'}
          </Button>
        </div>

        {/* Current Year Summary */}
        {currentYearProfits.length > 0 && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {currentYear} - Acumulado
              </h4>
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                {currentYearProfits.length} mês(es)
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Receita Total:</p>
                <p className="font-semibold text-success">
                  {maskData(`R$ ${currentYearTotal.revenue.toFixed(2)}`, 'money')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Custos Totais:</p>
                <p className="font-semibold text-destructive">
                  {maskData(`R$ ${(currentYearTotal.serverCosts + currentYearTotal.billsCosts).toFixed(2)}`, 'money')}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Lucro Anual:</p>
                <p className={cn(
                  "text-2xl font-bold",
                  currentYearTotal.netProfit >= 0 ? "text-success" : "text-destructive"
                )}>
                  {maskData(`R$ ${currentYearTotal.netProfit.toFixed(2)}`, 'money')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Monthly Details */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Current Year Months */}
            {currentYearProfits.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Meses de {currentYear}
                </h4>
                <div className="grid gap-2">
                  {currentYearProfits.map(profit => (
                    <div
                      key={profit.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        Number(profit.net_profit) >= 0 
                          ? "bg-success/5 border-success/20" 
                          : "bg-destructive/5 border-destructive/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {Number(profit.net_profit) >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                        <div>
                          <p className="font-medium">{MONTH_NAMES[profit.month - 1]}</p>
                          <p className="text-xs text-muted-foreground">
                            {profit.active_clients} clientes ativos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Receita: {maskData(`R$ ${Number(profit.revenue).toFixed(2)}`, 'money')}
                        </p>
                        <p className={cn(
                          "font-bold",
                          Number(profit.net_profit) >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {maskData(`R$ ${Number(profit.net_profit).toFixed(2)}`, 'money')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previous Years */}
            {previousYears.map(year => {
              const yearTotal = getYearTotal(year);
              const yearProfits = profitHistory.filter(p => p.year === year);
              
              return (
                <div key={year} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {year} - Total: {maskData(`R$ ${yearTotal.netProfit.toFixed(2)}`, 'money')}
                    </h4>
                    <Badge variant="outline">{yearTotal.monthCount} meses</Badge>
                  </div>
                  <div className="grid gap-2">
                    {yearProfits.map(profit => (
                      <div
                        key={profit.id}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border text-sm",
                          Number(profit.net_profit) >= 0 
                            ? "bg-success/5 border-success/20" 
                            : "bg-destructive/5 border-destructive/20"
                        )}
                      >
                        <span>{MONTH_NAMES[profit.month - 1]}</span>
                        <span className={cn(
                          "font-medium",
                          Number(profit.net_profit) >= 0 ? "text-success" : "text-destructive"
                        )}>
                          {maskData(`R$ ${Number(profit.net_profit).toFixed(2)}`, 'money')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Delete Year History Button - Only in January */}
            {canDeleteYearHistory && lastYearExists && (
              <div className="pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir Histórico de {lastYear}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Disponível apenas em Janeiro. Após conferir o total anual, você pode excluir o histórico.
                </p>
              </div>
            )}

            {profitHistory.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum histórico salvo ainda. Salve o lucro do mês atual para começar.
              </p>
            )}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={`Excluir histórico de ${lastYear}?`}
        description={`Esta ação irá excluir permanentemente todos os registros de lucro de ${lastYear}. Certifique-se de ter conferido o total anual antes de excluir.`}
        confirmText="Excluir"
        onConfirm={() => deleteYearHistory.mutate(lastYear)}
        variant="destructive"
      />
    </Card>
  );
}
