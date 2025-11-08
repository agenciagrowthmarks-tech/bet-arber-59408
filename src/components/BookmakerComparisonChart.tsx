import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

interface Odd {
  id: string;
  game_id: string;
  bookmaker: string;
  home_odd: number;
  away_odd: number;
  last_update: string;
}

interface Game {
  id: string;
  odds: Odd[];
}

interface BookmakerComparisonChartProps {
  games: Game[];
  isVisible: boolean;
  onToggle: () => void;
}

export default function BookmakerComparisonChart({ games, isVisible, onToggle }: BookmakerComparisonChartProps) {
  const bookmakerStats = useMemo(() => {
    const stats = new Map<string, {
      bookmaker: string;
      bestHomeCount: number;
      bestAwayCount: number;
      totalGames: number;
      avgHomeOdd: number;
      avgAwayOdd: number;
    }>();

    // Initialize stats for each bookmaker
    games.forEach((game) => {
      game.odds.forEach((odd) => {
        if (!stats.has(odd.bookmaker)) {
          stats.set(odd.bookmaker, {
            bookmaker: odd.bookmaker,
            bestHomeCount: 0,
            bestAwayCount: 0,
            totalGames: 0,
            avgHomeOdd: 0,
            avgAwayOdd: 0,
          });
        }
      });
    });

    // Calculate which bookmaker has best odds for each game
    games.forEach((game) => {
      if (game.odds.length === 0) return;

      // Find best home and away odds
      let bestHomeOdd = 0;
      let bestAwayOdd = 0;
      let bestHomeBookmaker = "";
      let bestAwayBookmaker = "";

      game.odds.forEach((odd) => {
        if (odd.home_odd > bestHomeOdd) {
          bestHomeOdd = odd.home_odd;
          bestHomeBookmaker = odd.bookmaker;
        }
        if (odd.away_odd > bestAwayOdd) {
          bestAwayOdd = odd.away_odd;
          bestAwayBookmaker = odd.bookmaker;
        }

        // Accumulate for average calculation
        const stat = stats.get(odd.bookmaker)!;
        stat.avgHomeOdd += odd.home_odd;
        stat.avgAwayOdd += odd.away_odd;
        stat.totalGames += 1;
      });

      // Increment best counts
      if (bestHomeBookmaker) {
        const stat = stats.get(bestHomeBookmaker)!;
        stat.bestHomeCount += 1;
      }
      if (bestAwayBookmaker) {
        const stat = stats.get(bestAwayBookmaker)!;
        stat.bestAwayCount += 1;
      }
    });

    // Calculate averages and convert to array
    const result = Array.from(stats.values()).map((stat) => ({
      bookmaker: stat.bookmaker,
      "Melhor odd Casa": stat.bestHomeCount,
      "Melhor odd Fora": stat.bestAwayCount,
      totalGames: stat.totalGames,
      avgHomeOdd: stat.totalGames > 0 ? stat.avgHomeOdd / stat.totalGames : 0,
      avgAwayOdd: stat.totalGames > 0 ? stat.avgAwayOdd / stat.totalGames : 0,
    }));

    // Sort by total best odds (home + away)
    return result.sort((a, b) => {
      const totalA = a["Melhor odd Casa"] + a["Melhor odd Fora"];
      const totalB = b["Melhor odd Casa"] + b["Melhor odd Fora"];
      return totalB - totalA;
    }).slice(0, 10); // Top 10 bookmakers
  }, [games]);

  if (bookmakerStats.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Floating Toggle Button */}
      <div className="flex justify-center mb-4">
        <Button
          onClick={onToggle}
          variant="outline"
          size="lg"
          className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
        >
          <TrendingUp className="h-5 w-5 text-success" />
          <span className="font-medium">
            {isVisible ? "Ocultar" : "Exibir"} Comparação de Casas
          </span>
          {isVisible ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Chart Card with Animation */}
      {isVisible && (
        <Card className="animate-fade-in border-success/20 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-success/10 via-success/5 to-transparent border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle className="text-xl">Comparação de Casas - Melhores Odds</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Quantidade de vezes que cada casa ofereceu a melhor odd (casa/fora) entre todas as casas
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={bookmakerStats}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <defs>
                  <linearGradient id="homeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="awayGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  className="stroke-muted/30" 
                  vertical={false}
                />
                <XAxis
                  dataKey="bookmaker"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground" 
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelStyle={{ 
                    color: "hsl(var(--popover-foreground))",
                    fontWeight: 600,
                    marginBottom: "8px"
                  }}
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: "20px",
                    fontSize: "14px",
                    fontWeight: 500
                  }} 
                />
                <Bar
                  dataKey="Melhor odd Casa"
                  fill="url(#homeGradient)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
                <Bar
                  dataKey="Melhor odd Fora"
                  fill="url(#awayGradient)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
