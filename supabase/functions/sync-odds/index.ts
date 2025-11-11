import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
      }>;
    }>;
  }>;
}

function computeArbitrage(oddA: number, oddB: number) {
  if (!oddA || !oddB || oddA <= 1 || oddB <= 1) {
    return { hasArbitrage: false, arbIndex: 999, profitPercent: 0 };
  }

  const arbIndex = 1 / oddA + 1 / oddB;
  const profitPercent = (1 - arbIndex) * 100;

  return {
    hasArbitrage: arbIndex < 1,
    arbIndex,
    profitPercent,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const oddsApiKey = Deno.env.get("ODDS_API_KEY");
    const oddsApiBaseUrl = Deno.env.get("ODDS_API_BASE_URL");

    if (!oddsApiKey || !oddsApiBaseUrl) {
      console.error("Missing ODDS_API_KEY or ODDS_API_BASE_URL");
      return new Response(
        JSON.stringify({
          error: "Configuração da API de odds não encontrada",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Obter sportKey do body (default: basketball_nba)
    let sportKey = "basketball_nba";
    try {
      const body = await req.json();
      if (body.sportKey) {
        sportKey = body.sportKey;
      }
    } catch {
      // Se não houver body, usa o default
    }

    console.log(`Buscando odds para esporte: ${sportKey}`);

    // Buscar odds da API
    const oddsUrl = `${oddsApiBaseUrl}/sports/${sportKey}/odds?apiKey=${oddsApiKey}&regions=eu&markets=h2h&oddsFormat=decimal`;
    const oddsResponse = await fetch(oddsUrl);

    if (!oddsResponse.ok) {
      const errorText = await oddsResponse.text();
      console.error(
        "Erro ao buscar odds:",
        oddsResponse.status,
        errorText
      );
      return new Response(
        JSON.stringify({
          error: `Erro ao buscar odds: ${oddsResponse.status}`,
        }),
        {
          status: oddsResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const events: OddsEvent[] = await oddsResponse.json();
    console.log(`Recebidos ${events.length} eventos da API`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    let gamesProcessed = 0;
    let oddsProcessed = 0;
    let arbitragesLogged = 0;

    for (const event of events) {
      try {
        // Upsert do jogo
        const { data: game, error: gameError } = await supabase
          .from("games")
          .upsert(
            {
              external_id: event.id,
              sport: sportKey === "basketball_nba" ? "Basquete" : 
                     sportKey === "soccer_epl" ? "Futebol" : 
                     sportKey === "americanfootball_nfl" ? "Futebol Americano" : "Outros",
              league: event.sport_title || sportKey,
              home_team: event.home_team,
              away_team: event.away_team,
              game_datetime: event.commence_time,
              status: "aberto",
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "external_id",
            }
          )
          .select()
          .single();

        if (gameError) {
          console.error("Erro ao salvar jogo:", gameError);
          continue;
        }

        gamesProcessed++;

        // Salvar TODAS as casas de apostas com odds válidas
        const allBookmakers = event.bookmakers || [];
        const savedOdds: Array<{ bookmaker: string; home_odd: number; draw_odd?: number; away_odd: number }> = [];

        for (const bookmaker of allBookmakers) {
          const h2hMarket = bookmaker.markets?.find((m) => m.key === "h2h");
          if (!h2hMarket) continue;

          const homeOutcome = h2hMarket.outcomes.find(
            (o) => o.name === event.home_team
          );
          const awayOutcome = h2hMarket.outcomes.find(
            (o) => o.name === event.away_team
          );
          const drawOutcome = h2hMarket.outcomes.find(
            (o) => o.name === "Draw"
          );

          if (!homeOutcome || !awayOutcome) continue;

          const oddsData: any = {
            game_id: game.id,
            bookmaker: bookmaker.key,
            home_odd: homeOutcome.price,
            away_odd: awayOutcome.price,
            last_update: new Date().toISOString(),
          };

          // Adicionar draw_odd se existir (para esportes de 3 vias como futebol)
          if (drawOutcome) {
            oddsData.draw_odd = drawOutcome.price;
          }

          const { error: oddsError } = await supabase.from("odds").upsert(
            oddsData,
            {
              onConflict: "game_id,bookmaker",
            }
          );

          if (oddsError) {
            console.error("Erro ao salvar odds:", oddsError);
          } else {
            oddsProcessed++;
            savedOdds.push({
              bookmaker: bookmaker.key,
              home_odd: homeOutcome.price,
              draw_odd: drawOutcome?.price,
              away_odd: awayOutcome.price,
            });
          }
        }

        // Calcular arbitragens para todas as combinações de casas
        if (savedOdds.length >= 2) {
          for (let i = 0; i < savedOdds.length; i++) {
            for (let j = i + 1; j < savedOdds.length; j++) {
              const houseA = savedOdds[i];
              const houseB = savedOdds[j];

              // Combo 1: Casa na houseA + Fora na houseB
              const combo1 = computeArbitrage(houseA.home_odd, houseB.away_odd);
              
              if (combo1.hasArbitrage) {
                const { error: logError } = await supabase
                  .from("arbitrage_log")
                  .insert({
                    game_id: game.id,
                    home_team: event.home_team,
                    away_team: event.away_team,
                    sport: game.sport,
                    league: game.league,
                    bookmaker_a: houseA.bookmaker,
                    bookmaker_b: houseB.bookmaker,
                    odd_a: houseA.home_odd,
                    odd_b: houseB.away_odd,
                    arb_index: combo1.arbIndex,
                    profit_percent: combo1.profitPercent,
                  });

                if (!logError) {
                  arbitragesLogged++;
                }
              }

              // Combo 2: Casa na houseB + Fora na houseA
              const combo2 = computeArbitrage(houseB.home_odd, houseA.away_odd);
              
              if (combo2.hasArbitrage) {
                const { error: logError } = await supabase
                  .from("arbitrage_log")
                  .insert({
                    game_id: game.id,
                    home_team: event.home_team,
                    away_team: event.away_team,
                    sport: game.sport,
                    league: game.league,
                    bookmaker_a: houseB.bookmaker,
                    bookmaker_b: houseA.bookmaker,
                    odd_a: houseB.home_odd,
                    odd_b: houseA.away_odd,
                    arb_index: combo2.arbIndex,
                    profit_percent: combo2.profitPercent,
                  });

                if (!logError) {
                  arbitragesLogged++;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Erro ao processar evento:", error);
      }
    }

    // Atualizar sync_status
    const { error: syncStatusError } = await supabase
      .from("sync_status")
      .upsert({
        id: 1,
        last_run_at: new Date().toISOString(),
        sport_key: sportKey,
      });

    if (syncStatusError) {
      console.error("Erro ao atualizar sync_status:", syncStatusError);
    }

    console.log(
      `Sincronização concluída: ${gamesProcessed} jogos, ${oddsProcessed} odds, ${arbitragesLogged} arbitragens detectadas`
    );

    return new Response(
      JSON.stringify({
        success: true,
        gamesProcessed,
        oddsProcessed,
        arbitragesLogged,
        sportKey,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro na função:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
