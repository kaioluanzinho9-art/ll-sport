export type SportId = 'futebol' | 'basquete' | 'tenis' | 'mma' | 'esports';

export type NavSection = 'esportes' | 'consultar' | 'resultados';

export type QuickMarketMode = '1x2' | 'btts' | 'over15' | 'over25' | 'corners';

export interface OddOption {
  id: string;
  label: string;
  shortLabel: string;
  odd: number;
  trend?: 'up' | 'down' | 'none';
}

export interface MarketGroup {
  id: string;
  name: string;
  options: OddOption[];
}

export interface MatchItem {
  id: string;
  sport: SportId;
  country: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  status: 'upcoming' | 'finished';
  kickoffLabel: string; // e.g., "Hoje · 21:30" or "Amanhã · 16:00"
  homeScore?: number;
  awayScore?: number;
  featured?: boolean;
  superOdd?: boolean;
  markets: MarketGroup[];
}

export interface BetSelection {
  matchId: string;
  matchLabel: string;
  league: string;
  sport: SportId;
  marketId: string;
  marketName: string;
  optionId: string;
  optionLabel: string;
  odd: number;
  kickoffLabel: string;
  isLive: boolean;
}

export type TicketStatus = 'open' | 'won' | 'lost' | 'cashed_out';

export interface Cambista {
  id: string;
  name: string;
  location: string;
  commissionPercent: number;
  balance: number;
  active: boolean;
  createdAt: string;
}

export interface BetTicket {
  id: string;
  code: string; // e.g., "LL-482910"
  createdAt: string;
  type: 'Simples' | 'Múltipla';
  selections: (BetSelection & { result?: 'pending' | 'won' | 'lost' })[];
  stake: number;
  totalOdd: number;
  potentialReturn: number;
  payout?: number;
  status: TicketStatus;
  cambistaId?: string;
  cambistaName?: string;
  createdByUsername?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'cashout' | 'manual_in' | 'manual_out';
  direction: 'entrada' | 'saida';
  category: string;
  method: 'Pix' | 'Dinheiro' | 'Banca';
  description: string;
  amount: number;
  createdAt: string;
  cambistaId?: string;
  cambistaName?: string;
}

export interface AuthUser {
  username: string;
  role: 'admin' | 'cambista';
  cambistaId?: string;
  cambistaName?: string;
}

export interface SecondaryAccount {
  username: string;
  role: 'cambista';
  cambistaId?: string;
  cambistaName?: string;
  active: boolean;
  createdAt: string;
}

