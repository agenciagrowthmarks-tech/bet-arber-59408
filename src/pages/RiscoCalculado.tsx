import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Shield, Scale, Flame } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDateTime } from "@/utils/formatters";
import { calculateImpliedProbability } from "@/utils/arbitrage";
import { getGames, syncOdds } from "@/services/api";
import SportSelector from "@/components/SportSelector";
import InvestmentInput from "@/components/InvestmentInput";

type RiskLevel = "conservative" | "moderate" | "aggressive";

interface Game {
  id: string;
  home_team: string;
  away_team: string;
  game_datetime: string;
  odds: Array<{
    bookmaker: string;
    home_odd: number;
    away_odd: number;
  }>;
}

export default function RiscoCalculado() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [totalInvestment, setTotalInvestment] = useState(500);
  const [selectedSport, setSelectedSport] = useState("basketball_nba");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("moderate");

  async function loadGames() {
    try {
      setLoading(true);
      const data = await getGames(selectedSport);
      setGames(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar jogos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      const result = await syncOdds(selectedSport);
      toast({
        title: "Sincronização concluída",
        description: `${result.gamesProcessed} jogos atualizados`,
      });
      await loadGames();
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  const filteredGames = games
    .map((game) => {
      if (!game.odds || game.odds.length === 0) return null;

      // Encontrar a melhor odd para casa e fora
      const bestHomeOdd = Math.max(...game.odds.map(o => o.home_odd));
      const bestAwayOdd = Math.max(...game.odds.map(o => o.away_odd));
      const homeBookmaker = game.odds.find(o => o.home_odd === bestHomeOdd)?.bookmaker || "";
      const awayBookmaker = game.odds.find(o => o.away_odd === bestAwayOdd)?.bookmaker || "";

      // Selecionar baseado no nível de risco
      let selectedOdd = bestHomeOdd;
      let selectedBookmaker = homeBookmaker;
      let selectedOutcome = "Casa";
      let probability = calculateImpliedProbability(bestHomeOdd);

      // Para risco agressivo, preferir odds maiores (menor probabilidade)
      if (riskLevel === "aggressive") {
        if (bestAwayOdd > bestHomeOdd) {
          selectedOdd = bestAwayOdd;
          selectedBookmaker = awayBookmaker;
          selectedOutcome = "Fora";
          probability = calculateImpliedProbability(bestAwayOdd);
        }
      }
      // Para conservador, preferir odds menores (maior probabilidade)
      else if (riskLevel === "conservative") {
        if (bestAwayOdd < bestHomeOdd && bestAwayOdd >= 1.2) {
          selectedOdd = bestAwayOdd;
          selectedBookmaker = awayBookmaker;
          selectedOutcome = "Fora";
          probability = calculateImpliedProbability(bestAwayOdd);
        }
      }

      // Filtrar por faixa de odds baseado no risco
      const shouldInclude =
        (riskLevel === "conservative" && selectedOdd >= 1.2 && selectedOdd <= 1.8) ||
        (riskLevel === "moderate" && selectedOdd >= 1.5 && selectedOdd <= 2.5) ||
        (riskLevel === "aggressive" && selectedOdd > 2.0);

      if (!shouldInclude) return null;

      return {
        ...game,
        selectedOdd,
        selectedBookmaker,
        selectedOutcome,
        probability,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (riskLevel === "conservative") {
        return (b?.probability || 0) - (a?.probability || 0); // Maior probabilidade primeiro
      }
      return (a?.probability || 0) - (b?.probability || 0); // Menor probabilidade primeiro (mais risco)
    });

  const totalStake = filteredGames.length > 0 ? totalInvestment / filteredGames.length : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-3xl md:text-4xl font-bold">Simulador de Risco Inteligente</h1>
          <Badge variant="outline" className="bg-chart-1/10">🧪 Modo Beta</Badge>
        </div>
        <p className="text-muted-foreground">
          Ajuste o nível de risco e deixe a IA calcular o equilíbrio entre retorno e segurança.
        </p>
      </div>

        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InvestmentInput
                value={totalInvestment}
                onChange={setTotalInvestment}
              />
              <SportSelector
                value={selectedSport}
                onChange={setSelectedSport}
              />
              <div className="space-y-2">
                <Label className="invisible">Ação</Label>
                <Button
                  onClick={handleSync}
                  disabled={syncing}
                  className="w-full"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  Buscar jogos
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Nível de risco</Label>
              <RadioGroup value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="conservative" id="conservative" />
                  <Label htmlFor="conservative" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium">🛡️ Conservador</div>
                      <div className="text-sm text-muted-foreground">Odds entre 1.20 e 1.80 - Alta probabilidade</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="moderate" id="moderate" />
                  <Label htmlFor="moderate" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Scale className="h-4 w-4 text-yellow-500" />
                    <div>
                      <div className="font-medium">⚖️ Moderado</div>
                      <div className="text-sm text-muted-foreground">Odds entre 1.50 e 2.50 - Equilíbrio</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="aggressive" id="aggressive" />
                  <Label htmlFor="aggressive" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Flame className="h-4 w-4 text-red-500" />
                    <div>
                      <div className="font-medium">🔥 Agressivo</div>
                      <div className="text-sm text-muted-foreground">Odds maiores que 2.00 - Alto retorno potencial</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        {filteredGames.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo da simulação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Seleções</div>
                  <div className="text-2xl font-bold">{filteredGames.length}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Stake por jogo</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalStake)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Investimento total</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalInvestment)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Retorno se todas acertarem</div>
                  <div className="text-2xl font-bold text-accent-neon">
                    {formatCurrency(filteredGames.reduce((acc, g) => acc + (g?.selectedOdd || 0) * totalStake, 0))}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-accent-neon/10 border border-accent-neon/20 rounded-lg">
                <p className="text-sm">
                  💡 <strong>Sugestão da IA:</strong> foco em odds entre 1.7 e 2.4 para perfil moderado.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Jogos disponíveis ({filteredGames.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando jogos...
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum jogo encontrado para o nível de risco selecionado. Tente ajustar as configurações.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jogo</TableHead>
                      <TableHead>Casa</TableHead>
                      <TableHead className="text-right">Odd</TableHead>
                      <TableHead className="text-right">Probabilidade</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead className="text-right">Stake</TableHead>
                      <TableHead className="text-right">Retorno potencial</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGames.map((game) => (
                      <TableRow key={game?.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {game?.home_team} x {game?.away_team}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDateTime(game?.game_datetime || "")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{game?.selectedBookmaker}</TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {game?.selectedOdd.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {game?.probability.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>
                            {game?.selectedOutcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(totalStake)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-accent-neon">
                          {formatCurrency((game?.selectedOdd || 0) * totalStake)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
