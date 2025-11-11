import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { 
  computeArbitrage, 
  computeStakeSplit, 
  computeArbitrageThreeWay, 
  computeStakeSplitThreeWay 
} from "@/utils/arbitrage";
import BookmakerComparisonChart from "@/components/BookmakerComparisonChart";
import SyncCountdown from "@/components/SyncCountdown";
import SportSelector from "@/components/SportSelector";
import { getSportName, isThreeWaySport } from "@/utils/sports";
import { syncOdds as apiSyncOdds, getSyncStatus, getGames } from "@/services/api";

interface Game {
  id: string;
  external_id: string;
  sport: string;
  league: string;
  home_team: string;
  away_team: string;
  game_datetime: string;
  status: string;
  odds: Odd[];
}

interface Odd {
  id: string;
  game_id: string;
  bookmaker: string;
  home_odd: number;
  draw_odd?: number;
  away_odd: number;
  last_update: string;
}

interface ArbitrageResult {
  hasArbitrage: boolean;
  profitPercent: number;
  arbIndex: number;
  combo: "home_houseA_away_houseB" | "home_houseB_away_houseA" | "three_way" | null;
  oddA: number;
  oddB: number;
  oddDraw?: number;
  bookmakersLabel: string;
  houseAKey: string;
  houseBKey: string;
  isThreeWay?: boolean;
  bestHomeOdd?: number;
  bestDrawOdd?: number;
  bestAwayOdd?: number;
}

export default function Index() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [totalInvestment, setTotalInvestment] = useState(500);
  const [onlyArbitrage, setOnlyArbitrage] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedHouseA, setSelectedHouseA] = useState<string>("auto");
  const [selectedHouseB, setSelectedHouseB] = useState<string>("auto");
  const [selectedSport, setSelectedSport] = useState<string>("basketball_nba");
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [showChart, setShowChart] = useState<boolean>(false);

  useEffect(() => {
    loadGames();
    loadSyncStatus();
  }, [selectedSport]);

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

  async function loadSyncStatus() {
    try {
      const data = await getSyncStatus();
      setLastRunAt(data.lastRunAt);
    } catch (error: any) {
      console.error("Erro ao carregar status de sincronização:", error);
    }
  }

  async function handleSyncOdds() {
    try {
      setSyncing(true);
      const data = await apiSyncOdds(selectedSport);

      toast({
        title: "Sincronização concluída",
        description: `${data.gamesProcessed} jogos e ${data.oddsProcessed} odds atualizados`,
      });

      await loadGames();
      await loadSyncStatus();
    } catch (error: any) {
      toast({
        title: "Erro ao sincronizar",
        description:
          error.message ||
          "Não foi possível atualizar as odds agora. Tente novamente em alguns minutos.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }

  // Obter todas as casas de apostas disponíveis
  const availableBookmakers = useMemo(() => {
    const bookmakers = new Set<string>();
    games.forEach((game) => {
      game.odds.forEach((odd) => {
        bookmakers.add(odd.bookmaker);
      });
    });
    return Array.from(bookmakers).sort();
  }, [games]);

  function calculateArbitrage(game: Game): ArbitrageResult {
    const isThreeWay = isThreeWaySport(game.sport);
    
    let houseA: Odd | undefined;
    let houseB: Odd | undefined;

    // Se o usuário selecionou casas específicas
    if (selectedHouseA !== "auto" && selectedHouseB !== "auto") {
      houseA = game.odds.find((o) => o.bookmaker === selectedHouseA);
      houseB = game.odds.find((o) => o.bookmaker === selectedHouseB);
    } else {
      // Modo automático: determinar as casas disponíveis
      const distinctBookmakers = Array.from(
        new Set(game.odds.map((o) => o.bookmaker))
      );
      
      const houseAKey = selectedHouseA === "auto" ? distinctBookmakers[0] : selectedHouseA;
      const houseBKey = selectedHouseB === "auto" ? distinctBookmakers[1] : selectedHouseB;
      
      houseA = game.odds.find((o) => o.bookmaker === houseAKey);
      houseB = game.odds.find((o) => o.bookmaker === houseBKey);
    }

    if (!houseA || !houseB) {
      return {
        hasArbitrage: false,
        profitPercent: 0,
        arbIndex: 0,
        combo: null,
        oddA: 0,
        oddB: 0,
        bookmakersLabel: "",
        houseAKey: "",
        houseBKey: "",
        isThreeWay,
      };
    }

    // Para esportes de 3 vias (futebol)
    if (isThreeWay) {
      // Pegar as melhores odds de cada resultado entre as duas casas
      const bestHomeOdd = Math.max(houseA.home_odd, houseB.home_odd);
      const bestDrawOdd = Math.max(houseA.draw_odd || 0, houseB.draw_odd || 0);
      const bestAwayOdd = Math.max(houseA.away_odd, houseB.away_odd);

      if (!bestDrawOdd) {
        // Se não houver odds de empate, retornar sem arbitragem
        return {
          hasArbitrage: false,
          profitPercent: 0,
          arbIndex: 0,
          combo: null,
          oddA: 0,
          oddB: 0,
          bookmakersLabel: "",
          houseAKey: houseA.bookmaker,
          houseBKey: houseB.bookmaker,
          isThreeWay: true,
        };
      }

      const arbResult = computeArbitrageThreeWay(bestHomeOdd, bestDrawOdd, bestAwayOdd);

      const homeHouse = houseA.home_odd >= houseB.home_odd ? houseA.bookmaker : houseB.bookmaker;
      const drawHouse = (houseA.draw_odd || 0) >= (houseB.draw_odd || 0) ? houseA.bookmaker : houseB.bookmaker;
      const awayHouse = houseA.away_odd >= houseB.away_odd ? houseA.bookmaker : houseB.bookmaker;

      return {
        ...arbResult,
        combo: "three_way",
        oddA: bestHomeOdd,
        oddB: bestAwayOdd,
        oddDraw: bestDrawOdd,
        bookmakersLabel: `${game.home_team} (${homeHouse}) • Empate (${drawHouse}) • ${game.away_team} (${awayHouse})`,
        houseAKey: houseA.bookmaker,
        houseBKey: houseB.bookmaker,
        isThreeWay: true,
        bestHomeOdd,
        bestDrawOdd,
        bestAwayOdd,
      };
    }

    // Para esportes de 2 vias (NBA, NFL, etc.)
    // Combo 1: Casa na houseA + Fora na houseB
    const combo1 = computeArbitrage(houseA.home_odd, houseB.away_odd);

    // Combo 2: Casa na houseB + Fora na houseA
    const combo2 = computeArbitrage(houseB.home_odd, houseA.away_odd);

    // Escolher o combo com menor arbIndex (melhor arbitragem)
    if (combo1.arbIndex < combo2.arbIndex) {
      return {
        ...combo1,
        combo: "home_houseA_away_houseB",
        oddA: houseA.home_odd,
        oddB: houseB.away_odd,
        bookmakersLabel: `${game.home_team} na ${houseA.bookmaker} • ${game.away_team} na ${houseB.bookmaker}`,
        houseAKey: houseA.bookmaker,
        houseBKey: houseB.bookmaker,
        isThreeWay: false,
      };
    } else {
      return {
        ...combo2,
        combo: "home_houseB_away_houseA",
        oddA: houseB.home_odd,
        oddB: houseA.away_odd,
        bookmakersLabel: `${game.home_team} na ${houseB.bookmaker} • ${game.away_team} na ${houseA.bookmaker}`,
        houseAKey: houseB.bookmaker,
        houseBKey: houseA.bookmaker,
        isThreeWay: false,
      };
    }
  }

  const filteredGames = useMemo(() => {
    if (!onlyArbitrage) return games;
    return games.filter((game) => {
      const arb = calculateArbitrage(game);
      return arb.hasArbitrage;
    });
  }, [games, onlyArbitrage, selectedHouseA, selectedHouseB]);

  function formatDateTime(dateString: string) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month} ${hours}:${minutes}`;
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center justify-center gap-3 text-accent-neon">
            <TrendingUp className="h-8 w-8 md:h-10 md:w-10" />
            Scanner IA – O radar inteligente de oportunidades
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitorando odds em tempo real para {getSportName(selectedSport)}.
          </p>
        </div>

        {/* Sync Countdown */}
        <SyncCountdown lastRunAt={lastRunAt} intervalMinutes={5} />

        {/* Controles */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <SportSelector
                value={selectedSport}
                onChange={setSelectedSport}
                label="Esporte / Liga"
              />

              <div className="space-y-2">
                <Label htmlFor="investment">Valor total para simulação (R$)</Label>
                <Input
                  id="investment"
                  type="number"
                  value={totalInvestment}
                  onChange={(e) => setTotalInvestment(Number(e.target.value))}
                  min={1}
                  step={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="house-a">Casa A</Label>
                <Select
                  value={selectedHouseA}
                  onValueChange={setSelectedHouseA}
                >
                  <SelectTrigger id="house-a">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático</SelectItem>
                    {availableBookmakers.map((bookmaker) => (
                      <SelectItem key={bookmaker} value={bookmaker}>
                        {bookmaker}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="house-b">Casa B</Label>
                <Select
                  value={selectedHouseB}
                  onValueChange={setSelectedHouseB}
                >
                  <SelectTrigger id="house-b">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automático</SelectItem>
                    {availableBookmakers.map((bookmaker) => (
                      <SelectItem key={bookmaker} value={bookmaker}>
                        {bookmaker}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="arbitrage-only"
                  checked={onlyArbitrage}
                  onCheckedChange={setOnlyArbitrage}
                />
                <Label htmlFor="arbitrage-only">
                  Mostrar somente oportunidades de arbitragem
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSyncOdds}
                  disabled={syncing}
                  variant="default"
                  size="sm"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                  />
                  Atualizar odds
                </Button>
                <p className="text-xs text-muted-foreground">
                  Dados atualizados a cada 5 minutos automaticamente
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground border-t pt-3">
              Atualização automática a cada 5 minutos • Alimentado por The Odds API.
            </p>
          </CardContent>
        </Card>

        {/* Bookmaker Comparison Chart */}
        <BookmakerComparisonChart 
          games={games} 
          isVisible={showChart}
          onToggle={() => setShowChart(!showChart)}
        />

        {/* Tabela de Jogos */}
        <Card>
          <CardHeader>
            <CardTitle>
              Jogos do dia ({filteredGames.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando jogos...
              </div>
            ) : filteredGames.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {onlyArbitrage
                  ? "Nenhum jogo com arbitragem encontrado"
                  : "Nenhum jogo encontrado para hoje"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jogo</TableHead>
                      <TableHead className="text-right">
                        {(() => {
                          if (selectedHouseA !== "auto") return selectedHouseA;
                          const firstBookmaker = Array.from(
                            new Set(filteredGames.flatMap((g) => g.odds.map((o) => o.bookmaker)))
                          )[0];
                          return firstBookmaker || "Casa A";
                        })()}{" "}
                        {isThreeWaySport(selectedSport) ? "(casa / empate / fora)" : "(casa / fora)"}
                      </TableHead>
                      <TableHead className="text-right">
                        {(() => {
                          if (selectedHouseB !== "auto") return selectedHouseB;
                          const secondBookmaker = Array.from(
                            new Set(filteredGames.flatMap((g) => g.odds.map((o) => o.bookmaker)))
                          )[1];
                          return secondBookmaker || "Casa B";
                        })()}{" "}
                        {isThreeWaySport(selectedSport) ? "(casa / empate / fora)" : "(casa / fora)"}
                      </TableHead>
                      <TableHead>Arbitragem</TableHead>
                      <TableHead>Stake sugerida</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGames.map((game) => {
                      // Determinar Casa A e Casa B para este jogo
                      const distinctBookmakers = Array.from(
                        new Set(game.odds.map((o) => o.bookmaker))
                      );
                      
                      const houseAKey = selectedHouseA === "auto" ? distinctBookmakers[0] : selectedHouseA;
                      const houseBKey = selectedHouseB === "auto" ? distinctBookmakers[1] : selectedHouseB;
                      
                      const houseA = game.odds.find((o) => o.bookmaker === houseAKey);
                      const houseB = game.odds.find((o) => o.bookmaker === houseBKey);

                      const arb = calculateArbitrage(game);

                      return (
                        <TableRow
                          key={game.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedGame(game)}
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {game.home_team} x {game.away_team}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatDateTime(game.game_datetime)}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-right tabular-nums">
                            {houseA ? (
                              isThreeWaySport(game.sport) ? (
                                <span>
                                  <span
                                    className={
                                      houseB &&
                                      houseA.home_odd > houseB.home_odd
                                        ? "font-bold text-accent-neon"
                                        : ""
                                    }
                                  >
                                    {houseA.home_odd.toFixed(2)}
                                  </span>
                                  {" / "}
                                  <span
                                    className={
                                      houseB &&
                                      (houseA.draw_odd || 0) > (houseB.draw_odd || 0)
                                        ? "font-bold text-accent-neon"
                                        : ""
                                    }
                                  >
                                    {houseA.draw_odd?.toFixed(2) || "—"}
                                  </span>
                                  {" / "}
                                  <span
                                    className={
                                      houseB &&
                                      houseA.away_odd > houseB.away_odd
                                        ? "font-bold text-accent-neon"
                                        : ""
                                    }
                                  >
                                    {houseA.away_odd.toFixed(2)}
                                  </span>
                                </span>
                              ) : (
                                <span>
                                  <span
                                    className={
                                      houseB &&
                                      houseA.home_odd > houseB.home_odd
                                        ? "font-bold text-accent-neon"
                                        : ""
                                    }
                                  >
                                    {houseA.home_odd.toFixed(2)}
                                  </span>
                                  {" / "}
                                  <span
                                    className={
                                      houseB &&
                                      houseA.away_odd > houseB.away_odd
                                        ? "font-bold text-accent-neon"
                                        : ""
                                    }
                                  >
                                    {houseA.away_odd.toFixed(2)}
                                  </span>
                                </span>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell className="text-right tabular-nums">
                            {houseB ? (
                              isThreeWaySport(game.sport) ? (
                                <span>
                                  <span
                                    className={
                                      houseA &&
                                      houseB.home_odd > houseA.home_odd
                                        ? "font-bold text-accent-neon"
                                        : ""
                                    }
                                  >
                                    {houseB.home_odd.toFixed(2)}
                                  </span>
                                  {" / "}
                                  <span
                                    className={
                                      houseA &&
                                      (houseB.draw_odd || 0) > (houseA.draw_odd || 0)
                                        ? "font-bold text-accent-neon"
                                        : ""
                                    }
                                  >
                                    {houseB.draw_odd?.toFixed(2) || "—"}
                                  </span>
                                  {" / "}
                                  <span
                                    className={
                                      houseA &&
                                      houseB.away_odd > houseA.away_odd
                                        ? "font-bold text-accent-neon"
                                        : ""
                                    }
                                  >
                                    {houseB.away_odd.toFixed(2)}
                                  </span>
                                </span>
                              ) : (
                                <span>
                                  <span
                                    className={
                                      houseA &&
                                      houseB.home_odd > houseA.home_odd
                                        ? "font-bold text-accent-neon"
                                        : ""
                                    }
                                  >
                                    {houseB.home_odd.toFixed(2)}
                                  </span>
                                  {" / "}
                                  <span
                                    className={
                                      houseA &&
                                      houseB.away_odd > houseA.away_odd
                                        ? "font-bold text-accent-neon"
                                        : ""
                                    }
                                  >
                                    {houseB.away_odd.toFixed(2)}
                                  </span>
                                </span>
                              )
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            {arb.hasArbitrage ? (
                              <Badge className="bg-accent-neon text-accent-neon-foreground">
                                Arbitragem +{arb.profitPercent.toFixed(2)}%
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Sem arbitragem ({arb.arbIndex.toFixed(3)})
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            {arb.hasArbitrage ? (
                              <div className="space-y-1 text-sm">
                                {(() => {
                                  if (arb.isThreeWay && arb.bestHomeOdd && arb.bestDrawOdd && arb.bestAwayOdd) {
                                    const split = computeStakeSplitThreeWay(
                                      totalInvestment,
                                      arb.bestHomeOdd,
                                      arb.bestDrawOdd,
                                      arb.bestAwayOdd
                                    );
                                    return (
                                      <>
                                        <div className="text-muted-foreground">
                                          {formatCurrency(split.stakeHome)} (casa) •{" "}
                                          {formatCurrency(split.stakeDraw)} (empate) •{" "}
                                          {formatCurrency(split.stakeAway)} (fora)
                                        </div>
                                        <div className="font-medium text-accent-neon">
                                          Lucro: {formatCurrency(split.profit)} (
                                          {split.profitPercent.toFixed(2)}%)
                                        </div>
                                      </>
                                    );
                                  } else {
                                    const split = computeStakeSplit(
                                      totalInvestment,
                                      arb.oddA,
                                      arb.oddB
                                    );
                                    return (
                                      <>
                                        <div className="text-muted-foreground">
                                          {formatCurrency(split.stakeA)} •{" "}
                                          {formatCurrency(split.stakeB)}
                                        </div>
                                        <div className="font-medium text-accent-neon">
                                          Lucro: {formatCurrency(split.profit)} (
                                          {split.profitPercent.toFixed(2)}%)
                                        </div>
                                      </>
                                    );
                                  }
                                })()}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de detalhes */}
      <Dialog open={!!selectedGame} onOpenChange={() => setSelectedGame(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedGame?.home_team} x {selectedGame?.away_team}
            </DialogTitle>
            <DialogDescription>
              {selectedGame &&
                formatDateTime(selectedGame.game_datetime)} •{" "}
              {selectedGame?.league}
            </DialogDescription>
          </DialogHeader>

          {selectedGame && (
            <div className="space-y-4">
              {/* Odds disponíveis */}
              <div>
                <h3 className="font-semibold mb-2">Odds disponíveis</h3>
                <div className="space-y-2">
                  {selectedGame.odds.map((odd) => (
                    <div
                      key={odd.id}
                      className="flex justify-between items-center p-3 bg-muted rounded-lg"
                    >
                      <span className="font-medium capitalize">
                        {odd.bookmaker}
                      </span>
                      <span className="tabular-nums">
                        {isThreeWaySport(selectedGame.sport) ? (
                          <>
                            Casa: {odd.home_odd.toFixed(2)} • Empate:{" "}
                            {odd.draw_odd?.toFixed(2) || "—"} • Fora:{" "}
                            {odd.away_odd.toFixed(2)}
                          </>
                        ) : (
                          <>
                            Casa: {odd.home_odd.toFixed(2)} • Fora:{" "}
                            {odd.away_odd.toFixed(2)}
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cálculo de arbitragem */}
              {(() => {
                const arb = calculateArbitrage(selectedGame);
                if (!arb.hasArbitrage) {
                  return (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-muted-foreground">
                        Sem oportunidade de arbitragem para este jogo.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Índice de arbitragem: {arb.arbIndex.toFixed(4)} (precisa
                        ser {"<"} 1.00)
                      </p>
                    </div>
                  );
                }

                if (arb.isThreeWay && arb.bestHomeOdd && arb.bestDrawOdd && arb.bestAwayOdd) {
                  const split = computeStakeSplitThreeWay(
                    totalInvestment,
                    arb.bestHomeOdd,
                    arb.bestDrawOdd,
                    arb.bestAwayOdd
                  );

                  return (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-accent-neon">
                        ✓ Arbitragem encontrada!
                      </h3>

                      <div className="p-4 bg-accent-neon/10 border border-accent-neon/20 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Melhor combinação:
                          </span>
                          <span className="font-medium">
                            {arb.bookmakersLabel}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Índice de arbitragem:
                          </span>
                          <span className="font-mono">
                            {arb.arbIndex.toFixed(4)}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Lucro percentual:
                          </span>
                          <span className="font-bold text-accent-neon">
                            +{arb.profitPercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <h4 className="font-semibold">
                          Distribuição de stakes (investimento:{" "}
                          {formatCurrency(totalInvestment)})
                        </h4>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Apostar em casa ({arb.bestHomeOdd.toFixed(2)}):</span>
                            <span className="font-bold">
                              {formatCurrency(split.stakeHome)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Apostar em empate ({arb.bestDrawOdd.toFixed(2)}):</span>
                            <span className="font-bold">
                              {formatCurrency(split.stakeDraw)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Apostar em fora ({arb.bestAwayOdd.toFixed(2)}):</span>
                            <span className="font-bold">
                              {formatCurrency(split.stakeAway)}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-border flex justify-between">
                            <span>Payout garantido:</span>
                            <span className="font-bold">
                              {formatCurrency(split.payout)}
                            </span>
                          </div>
                          <div className="flex justify-between text-accent-neon">
                            <span className="font-semibold">Lucro garantido:</span>
                            <span className="font-bold">
                              {formatCurrency(split.profit)} (
                              {split.profitPercent.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Para esportes de 2 vias
                const split = computeStakeSplit(
                  totalInvestment,
                  arb.oddA,
                  arb.oddB
                );

                return (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-accent-neon">
                      ✓ Arbitragem encontrada!
                    </h3>

                    <div className="p-4 bg-accent-neon/10 border border-accent-neon/20 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Melhor combinação:
                        </span>
                        <span className="font-medium">
                          {arb.bookmakersLabel}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Índice de arbitragem:
                        </span>
                        <span className="font-mono">
                          {arb.arbIndex.toFixed(4)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Lucro percentual:
                        </span>
                        <span className="font-bold text-accent-neon">
                          +{arb.profitPercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <h4 className="font-semibold">
                        Distribuição de stakes (investimento:{" "}
                        {formatCurrency(totalInvestment)})
                      </h4>

                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Apostar na primeira odd ({arb.oddA.toFixed(2)}):</span>
                          <span className="font-bold">
                            {formatCurrency(split.stakeA)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Apostar na segunda odd ({arb.oddB.toFixed(2)}):</span>
                          <span className="font-bold">
                            {formatCurrency(split.stakeB)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-border flex justify-between">
                          <span>Payout garantido:</span>
                          <span className="font-bold">
                            {formatCurrency(split.payout)}
                          </span>
                        </div>
                        <div className="flex justify-between text-accent-neon">
                          <span className="font-semibold">Lucro garantido:</span>
                          <span className="font-bold">
                            {formatCurrency(split.profit)} (
                            {split.profitPercent.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
