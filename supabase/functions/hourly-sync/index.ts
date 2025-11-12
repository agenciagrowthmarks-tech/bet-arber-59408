import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lista de esportes para sincronizar
const SPORTS_TO_SYNC = [
  'basketball_nba',
  'soccer_epl',
  'soccer_brazil_campeonato',
  'soccer_spain_la_liga',
  'soccer_germany_bundesliga',
  'soccer_italy_serie_a',
  'soccer_france_ligue_one',
  'soccer_uefa_champs_league',
  'americanfootball_nfl'
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[Hourly Sync] Iniciando sincronização automática às ${new Date().toISOString()}`);

    let totalGames = 0;
    let totalOdds = 0;
    let totalArbitrages = 0;

    // Sincronizar cada esporte sequencialmente
    for (const sportKey of SPORTS_TO_SYNC) {
      try {
        console.log(`[Hourly Sync] Sincronizando ${sportKey}...`);

        // Chamar o edge function sync-odds para este esporte
        const { data, error } = await supabase.functions.invoke('sync-odds', {
          body: { sportKey }
        });

        if (error) {
          console.error(`[Hourly Sync] Erro ao sincronizar ${sportKey}:`, error);
          continue;
        }

        if (data) {
          totalGames += data.gamesProcessed || 0;
          totalOdds += data.oddsProcessed || 0;
          totalArbitrages += data.arbitragesLogged || 0;
          
          console.log(`[Hourly Sync] ${sportKey}: ${data.gamesProcessed} jogos, ${data.oddsProcessed} odds, ${data.arbitragesLogged} arbitragens`);
        }

        // Pequeno delay entre requisições para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[Hourly Sync] Erro ao processar ${sportKey}:`, error);
      }
    }

    // Registrar estatística horária
    const { error: statsError } = await supabase
      .from('hourly_sync_stats')
      .insert({
        sync_time: new Date().toISOString(),
        total_games: totalGames,
        total_odds: totalOdds,
        total_arbitrages: totalArbitrages,
        sports_synced: SPORTS_TO_SYNC.length
      });

    if (statsError) {
      console.error('[Hourly Sync] Erro ao salvar estatísticas:', statsError);
    }

    console.log(`[Hourly Sync] Sincronização completa: ${totalGames} jogos, ${totalOdds} odds, ${totalArbitrages} arbitragens`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        totalGames,
        totalOdds,
        totalArbitrages,
        sportsProcessed: SPORTS_TO_SYNC.length
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Hourly Sync] Erro geral:", error);
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
