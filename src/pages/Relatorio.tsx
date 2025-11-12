import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TrendingUp, AlertCircle, Calendar, Clock } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ArbitrageLog {
  id: string;
  detected_at: string;
  home_team: string;
  away_team: string;
  sport: string;
  league: string;
  bookmaker_a: string;
  bookmaker_b: string;
  odd_a: number;
  odd_b: number;
  profit_percent: number;
  arb_index: number;
}

interface HourlyStat {
  hour: string;
  count: number;
  avgProfit: number;
}

interface SportStat {
  sport: string;
  count: number;
  avgProfit: number;
}

export default function Relatorio() {
  const [arbitrages, setArbitrages] = useState<ArbitrageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("today");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
  const [sportStats, setSportStats] = useState<SportStat[]>([]);
  const [totalOpportunities, setTotalOpportunities] = useState(0);
  const [avgProfit, setAvgProfit] = useState(0);

  useEffect(() => {
    loadArbitrages();
  }, [dateRange, selectedSport]);

  async function loadArbitrages() {
    try {
      setLoading(true);
      
      let startDate: Date;
      const endDate = endOfDay(new Date());
      
      switch (dateRange) {
        case "today":
          startDate = startOfDay(new Date());
          break;
        case "7days":
          startDate = startOfDay(subDays(new Date(), 7));
          break;
        case "30days":
          startDate = startOfDay(subDays(new Date(), 30));
          break;
        default:
          startDate = startOfDay(new Date());
      }

      let query = supabase
        .from('arbitrage_log')
        .select('*')
        .gte('detected_at', startDate.toISOString())
        .lte('detected_at', endDate.toISOString())
        .order('detected_at', { ascending: false });

      if (selectedSport !== "all") {
        query = query.eq('sport', selectedSport);
      }

      const { data, error } = await query;

      if (error) throw error;

      setArbitrages(data || []);
      
      // Calcular estatísticas
      if (data && data.length > 0) {
        setTotalOpportunities(data.length);
        const avgProfitCalc = data.reduce((sum, arb) => sum + arb.profit_percent, 0) / data.length;
        setAvgProfit(avgProfitCalc);

        // Estatísticas por hora
        const hourlyMap = new Map<string, { count: number; totalProfit: number }>();
        data.forEach(arb => {
          const hour = format(new Date(arb.detected_at), "HH':00'", { locale: ptBR });
          const existing = hourlyMap.get(hour) || { count: 0, totalProfit: 0 };
          hourlyMap.set(hour, {
            count: existing.count + 1,
            totalProfit: existing.totalProfit + arb.profit_percent
          });
        });

        const hourlyStatsData = Array.from(hourlyMap.entries())
          .map(([hour, stats]) => ({
            hour,
            count: stats.count,
            avgProfit: stats.totalProfit / stats.count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        
        setHourlyStats(hourlyStatsData);

        // Estatísticas por esporte
        const sportMap = new Map<string, { count: number; totalProfit: number }>();
        data.forEach(arb => {
          const existing = sportMap.get(arb.sport) || { count: 0, totalProfit: 0 };
          sportMap.set(arb.sport, {
            count: existing.count + 1,
            totalProfit: existing.totalProfit + arb.profit_percent
          });
        });

        const sportStatsData = Array.from(sportMap.entries())
          .map(([sport, stats]) => ({
            sport,
            count: stats.count,
            avgProfit: stats.totalProfit / stats.count
          }))
          .sort((a, b) => b.count - a.count);
        
        setSportStats(sportStatsData);
      } else {
        setTotalOpportunities(0);
        setAvgProfit(0);
        setHourlyStats([]);
        setSportStats([]);
      }

    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(dateString: string) {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  }

  const availableSports = Array.from(new Set(arbitrages.map(a => a.sport)));

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-3 text-accent-neon">
          <TrendingUp className="h-8 w-8" />
          Relatório de Arbitragens Certas
        </h1>
        <p className="text-muted-foreground">
          Todas as oportunidades de lucro garantido detectadas 24h por dia
        </p>
        <p className="text-xs text-muted-foreground">
          Análise automatizada a cada hora – IA PegAI Odds
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Esporte</label>
              <Select value={selectedSport} onValueChange={setSelectedSport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os esportes</SelectItem>
                  {availableSports.map(sport => (
                    <SelectItem key={sport} value={sport}>
                      {sport}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadArbitrages} variant="outline" className="w-full">
                Atualizar Dados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-accent-neon/10 to-transparent border-accent-neon/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Total de Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent-neon">
              {totalOpportunities}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Arbitragens certas detectadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Lucro Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              +{avgProfit.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Por oportunidade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Período Analisado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {dateRange === "today" ? "Hoje" : 
               dateRange === "7days" ? "7 dias" : "30 dias"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sincronização horária automática
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas por Hora */}
      {hourlyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários com Mais Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {hourlyStats.map((stat) => (
                <div 
                  key={stat.hour}
                  className="p-3 bg-muted rounded-lg border border-border"
                >
                  <div className="text-sm font-medium text-muted-foreground">
                    {stat.hour}
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {stat.count}
                  </div>
                  <div className="text-xs text-success mt-1">
                    +{stat.avgProfit.toFixed(2)}% média
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas por Esporte */}
      {sportStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Oportunidades por Esporte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sportStats.map((stat) => (
                <div 
                  key={stat.sport}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <div className="font-medium">{stat.sport}</div>
                    <div className="text-sm text-muted-foreground">
                      {stat.count} oportunidades
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success">
                    +{stat.avgProfit.toFixed(2)}% médio
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Oportunidades */}
      <Card>
        <CardHeader>
          <CardTitle>
            Histórico Detalhado ({arbitrages.length} registros)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando dados...
            </div>
          ) : arbitrages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma oportunidade encontrada no período selecionado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Jogo</TableHead>
                    <TableHead>Esporte/Liga</TableHead>
                    <TableHead>Casas</TableHead>
                    <TableHead className="text-right">Odds</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arbitrages.slice(0, 100).map((arb) => (
                    <TableRow key={arb.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(arb.detected_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {arb.home_team} x {arb.away_team}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">{arb.sport}</Badge>
                          <div className="text-xs text-muted-foreground">
                            {arb.league}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="space-y-1">
                          <div>{arb.bookmaker_a}</div>
                          <div className="text-muted-foreground">vs</div>
                          <div>{arb.bookmaker_b}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        <div>{arb.odd_a.toFixed(2)}</div>
                        <div className="text-muted-foreground">/</div>
                        <div>{arb.odd_b.toFixed(2)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-accent-neon text-accent-neon-foreground">
                          +{arb.profit_percent.toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {arbitrages.length > 100 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Mostrando as 100 oportunidades mais recentes de {arbitrages.length} total
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
