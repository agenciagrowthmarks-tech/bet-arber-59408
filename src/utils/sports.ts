export interface Sport {
  key: string;
  name: string;
  icon: string;
}

export const SPORTS: Sport[] = [
  { key: 'basketball_nba', name: 'NBA', icon: '🏀' },
  { key: 'soccer_epl', name: 'Futebol – Premier League', icon: '⚽' },
  { key: 'soccer_brazil_campeonato', name: 'Futebol – Brasileirão', icon: '⚽' },
  { key: 'soccer_spain_la_liga', name: 'Futebol – La Liga', icon: '⚽' },
  { key: 'soccer_germany_bundesliga', name: 'Futebol – Bundesliga', icon: '⚽' },
  { key: 'soccer_italy_serie_a', name: 'Futebol – Serie A', icon: '⚽' },
  { key: 'soccer_france_ligue_one', name: 'Futebol – Ligue 1', icon: '⚽' },
  { key: 'soccer_uefa_champs_league', name: 'Futebol – Champions League', icon: '⚽' },
  { key: 'americanfootball_nfl', name: 'NFL', icon: '🏈' },
];

export function getSportName(key: string): string {
  const sport = SPORTS.find(s => s.key === key);
  return sport ? sport.name : key;
}

export function getSportIcon(key: string): string {
  const sport = SPORTS.find(s => s.key === key);
  return sport ? sport.icon : '🎯';
}

export function getSport(key: string): Sport | undefined {
  return SPORTS.find(s => s.key === key);
}

export function isThreeWaySport(sportKey: string): boolean {
  return sportKey.startsWith('soccer_') || sportKey === 'Futebol';
}
