export interface Sport {
  key: string;
  name: string;
  icon: string;
}

export const SPORTS: Sport[] = [
  { key: 'basketball_nba', name: 'NBA', icon: '🏀' },
  { key: 'soccer_epl', name: 'Futebol – Premier League', icon: '⚽' },
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
