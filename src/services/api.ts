import { supabase } from "@/integrations/supabase/client";

export interface SyncOddsResponse {
  success: boolean;
  gamesProcessed: number;
  oddsProcessed: number;
  arbitragesLogged?: number;
  sportKey?: string;
}

export interface SyncStatusResponse {
  lastRunAt: string | null;
  sportKey: string;
}

export interface ArbitrageLogFilters {
  startDate?: string;
  endDate?: string;
  sport?: string;
}

export async function syncOdds(sportKey: string = 'basketball_nba'): Promise<SyncOddsResponse> {
  const { data, error } = await supabase.functions.invoke('sync-odds', {
    body: { sportKey },
  });

  if (error) throw error;
  return data;
}

export async function getSyncStatus(): Promise<SyncStatusResponse> {
  const { data, error } = await supabase.functions.invoke('get-sync-status');

  if (error) throw error;
  return data;
}

export async function getGames(sportKey?: string) {
  let query = (supabase as any)
    .from('games')
    .select('*, odds(*)')
    .order('game_datetime', { ascending: true });

  if (sportKey) {
    const sportName = 
      sportKey === 'basketball_nba' ? 'Basquete' :
      sportKey === 'soccer_epl' ? 'Futebol' :
      sportKey === 'americanfootball_nfl' ? 'Futebol Americano' : null;
    
    if (sportName) {
      query = query.eq('sport', sportName);
    }
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getArbitrageLogs(filters: ArbitrageLogFilters = {}) {
  let query = (supabase as any)
    .from('arbitrage_log')
    .select('*')
    .order('detected_at', { ascending: false });

  if (filters.startDate) {
    query = query.gte('detected_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('detected_at', filters.endDate);
  }

  if (filters.sport) {
    query = query.eq('sport', filters.sport);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}
