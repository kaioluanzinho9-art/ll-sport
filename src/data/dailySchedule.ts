import { BetTicket, MarketGroup, MatchItem, OddOption, SportId } from '../types/sportsbook';

interface MatchTemplate {
  sport: SportId;
  country: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  baseOdds: [number, number | null, number]; // [home, draw or null, away]
  kickoffHour: number;
  kickoffMinute: number;
  featured?: boolean;
  superOdd?: boolean;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashDateString(dateStr: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function roundOdd(val: number): number {
  const clamped = Math.max(1.12, Math.min(14.5, val));
  return Number(clamped.toFixed(2));
}

function buildFootballMarkets(
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  homeOdd: number,
  drawOdd: number,
  awayOdd: number,
  rng: () => number
): MarketGroup[] {
  const bttsYes = roundOdd(1.58 + rng() * 0.42);
  const bttsNo = roundOdd(1.78 + rng() * 0.42);
  const over25 = roundOdd(1.62 + rng() * 0.48);
  const under25 = roundOdd(1.75 + rng() * 0.45);
  const over15 = roundOdd(1.22 + rng() * 0.18);
  const under15 = roundOdd(3.25 + rng() * 0.85);
  const over35 = roundOdd(2.65 + rng() * 0.95);
  const under35 = roundOdd(1.32 + rng() * 0.22);

  const dc1x = roundOdd(1 / (1 / homeOdd + 1 / drawOdd) * 1.06);
  const dc12 = roundOdd(1 / (1 / homeOdd + 1 / awayOdd) * 1.06);
  const dcx2 = roundOdd(1 / (1 / drawOdd + 1 / awayOdd) * 1.06);

  const dnbHome = roundOdd(homeOdd * 0.72);
  const dnbAway = roundOdd(awayOdd * 0.72);

  return [
    {
      id: '1x2',
      name: 'Resultado Final (1X2)',
      options: [
        { id: `${matchId}-1x2-1`, label: `${homeTeam} (Casa)`, shortLabel: '1', odd: homeOdd, trend: 'none' },
        { id: `${matchId}-1x2-x`, label: 'Empate', shortLabel: 'X', odd: drawOdd, trend: 'none' },
        { id: `${matchId}-1x2-2`, label: `${awayTeam} (Fora)`, shortLabel: '2', odd: awayOdd, trend: 'none' },
      ],
    },
    {
      id: 'btts',
      name: 'Ambos Marcam',
      options: [
        { id: `${matchId}-btts-y`, label: 'Ambos Marcam · Sim', shortLabel: 'Sim', odd: bttsYes, trend: 'none' },
        { id: `${matchId}-btts-n`, label: 'Ambos Marcam · Não', shortLabel: 'Não', odd: bttsNo, trend: 'none' },
      ],
    },
    {
      id: 'over15',
      name: 'Total de Gols · 1.5',
      options: [
        { id: `${matchId}-o15`, label: 'Acima de 1.5 Gols', shortLabel: 'Acima 1.5', odd: over15, trend: 'none' },
        { id: `${matchId}-u15`, label: 'Abaixo de 1.5 Gols', shortLabel: 'Abaixo 1.5', odd: under15, trend: 'none' },
      ],
    },
    {
      id: 'over25',
      name: 'Total de Gols · 2.5',
      options: [
        { id: `${matchId}-o25`, label: 'Acima de 2.5 Gols', shortLabel: 'Acima 2.5', odd: over25, trend: 'none' },
        { id: `${matchId}-u25`, label: 'Abaixo de 2.5 Gols', shortLabel: 'Abaixo 2.5', odd: under25, trend: 'none' },
      ],
    },
    {
      id: 'corners',
      name: 'Escanteios · 9.5',
      options: [
        { id: `${matchId}-c-o95`, label: 'Acima de 9.5 Escanteios', shortLabel: '+9.5 Esc', odd: roundOdd(1.75 + rng() * 0.25), trend: 'none' },
        { id: `${matchId}-c-u95`, label: 'Abaixo de 9.5 Escanteios', shortLabel: '-9.5 Esc', odd: roundOdd(1.85 + rng() * 0.25), trend: 'none' },
      ],
    },
    {
      id: 'dc',
      name: 'Dupla Hipótese',
      options: [
        { id: `${matchId}-dc-1x`, label: `${homeTeam} ou Empate`, shortLabel: '1X', odd: dc1x, trend: 'none' },
        { id: `${matchId}-dc-12`, label: `${homeTeam} ou ${awayTeam}`, shortLabel: '12', odd: dc12, trend: 'none' },
        { id: `${matchId}-dc-x2`, label: `Empate ou ${awayTeam}`, shortLabel: 'X2', odd: dcx2, trend: 'none' },
      ],
    },
    {
      id: 'totals_alt',
      name: 'Total de Gols · 3.5 & Escanteios 8.5',
      options: [
        { id: `${matchId}-o35`, label: 'Acima de 3.5 Gols', shortLabel: '+3.5 Gols', odd: over35, trend: 'none' },
        { id: `${matchId}-u35`, label: 'Abaixo de 3.5 Gols', shortLabel: '-3.5 Gols', odd: under35, trend: 'none' },
        { id: `${matchId}-c-o85`, label: 'Acima de 8.5 Escanteios', shortLabel: '+8.5 Esc', odd: roundOdd(1.48 + rng() * 0.18), trend: 'none' },
        { id: `${matchId}-c-u85`, label: 'Abaixo de 8.5 Escanteios', shortLabel: '-8.5 Esc', odd: roundOdd(2.35 + rng() * 0.35), trend: 'none' },
      ],
    },
    {
      id: 'dnb',
      name: 'Empate Anula Aposta',
      options: [
        { id: `${matchId}-dnb-1`, label: `${homeTeam} (DNB)`, shortLabel: 'Casa DNB', odd: dnbHome, trend: 'none' },
        { id: `${matchId}-dnb-2`, label: `${awayTeam} (DNB)`, shortLabel: 'Fora DNB', odd: dnbAway, trend: 'none' },
      ],
    },
  ];
}

function buildTwoWayMarkets(
  matchId: string,
  sport: SportId,
  homeTeam: string,
  awayTeam: string,
  homeOdd: number,
  awayOdd: number,
  rng: () => number
): MarketGroup[] {
  const totalName =
    sport === 'basquete'
      ? 'Total de Pontos · 222.5'
      : sport === 'tenis'
      ? 'Total de Games · 22.5'
      : sport === 'mma'
      ? 'Total de Rounds · 2.5'
      : 'Total de Mapas · 2.5';

  const overLabel =
    sport === 'basquete'
      ? 'Mais de 222.5 Pts'
      : sport === 'tenis'
      ? 'Mais de 22.5 Games'
      : sport === 'mma'
      ? 'Mais de 2.5 Rounds'
      : 'Mais de 2.5 Mapas';

  const underLabel =
    sport === 'basquete'
      ? 'Menos de 222.5 Pts'
      : sport === 'tenis'
      ? 'Menos de 22.5 Games'
      : sport === 'mma'
      ? 'Menos de 2.5 Rounds'
      : 'Menos de 2.5 Mapas';

  const primaryOptions: OddOption[] = [
    { id: `${matchId}-ml-1`, label: homeTeam, shortLabel: '1', odd: homeOdd, trend: 'none' },
    { id: `${matchId}-ml-2`, label: awayTeam, shortLabel: '2', odd: awayOdd, trend: 'none' },
  ];

  const groups: MarketGroup[] = [
    {
      id: '1x2',
      name: 'Vencedor da Partida',
      options: primaryOptions,
    },
    {
      id: 'over25',
      name: totalName,
      options: [
        { id: `${matchId}-tot-o`, label: overLabel, shortLabel: 'Mais', odd: roundOdd(1.82 + rng() * 0.16), trend: 'none' },
        { id: `${matchId}-tot-u`, label: underLabel, shortLabel: 'Menos', odd: roundOdd(1.82 + rng() * 0.16), trend: 'none' },
      ],
    },
  ];

  if (sport === 'basquete') {
    groups.push({
      id: 'btts',
      name: 'Handicap Asiático',
      options: [
        { id: `${matchId}-hcap-1`, label: `${homeTeam} -4.5`, shortLabel: '-4.5', odd: roundOdd(1.86 + rng() * 0.12), trend: 'none' },
        { id: `${matchId}-hcap-2`, label: `${awayTeam} +4.5`, shortLabel: '+4.5', odd: roundOdd(1.86 + rng() * 0.12), trend: 'none' },
      ],
    });
  }

  return groups;
}

const MATCH_POOL: MatchTemplate[] = [
  // Futebol - Brasil
  { sport: 'futebol', country: 'Brasil', league: 'Brasileirão Série A', homeTeam: 'Flamengo', awayTeam: 'Palmeiras', baseOdds: [2.15, 3.25, 3.35], kickoffHour: 20, kickoffMinute: 0, featured: true, superOdd: true },
  { sport: 'futebol', country: 'Brasil', league: 'Brasileirão Série A', homeTeam: 'Botafogo', awayTeam: 'Atlético-MG', baseOdds: [1.95, 3.40, 3.85], kickoffHour: 18, kickoffMinute: 30 },
  { sport: 'futebol', country: 'Brasil', league: 'Brasileirão Série A', homeTeam: 'São Paulo', awayTeam: 'Corinthians', baseOdds: [2.05, 3.15, 3.70], kickoffHour: 16, kickoffMinute: 0 },
  { sport: 'futebol', country: 'Brasil', league: 'Brasileirão Série A', homeTeam: 'Internacional', awayTeam: 'Grêmio', baseOdds: [2.20, 3.10, 3.40], kickoffHour: 19, kickoffMinute: 0 },
  { sport: 'futebol', country: 'Brasil', league: 'Brasileirão Série A', homeTeam: 'Bahia', awayTeam: 'Fortaleza', baseOdds: [2.35, 3.20, 3.05], kickoffHour: 21, kickoffMinute: 0 },
  { sport: 'futebol', country: 'Brasil', league: 'Brasileirão Série A', homeTeam: 'Cruzeiro', awayTeam: 'Fluminense', baseOdds: [2.10, 3.25, 3.55], kickoffHour: 21, kickoffMinute: 30 },
  { sport: 'futebol', country: 'Brasil', league: 'Copa do Brasil', homeTeam: 'Vasco da Gama', awayTeam: 'Athletico-PR', baseOdds: [2.28, 3.15, 3.20], kickoffHour: 21, kickoffMinute: 30 },
  { sport: 'futebol', country: 'Brasil', league: 'Brasileirão Série B', homeTeam: 'Santos', awayTeam: 'Sport Recife', baseOdds: [1.85, 3.45, 4.15], kickoffHour: 19, kickoffMinute: 30 },

  // Futebol - Inglaterra
  { sport: 'futebol', country: 'Inglaterra', league: 'Premier League', homeTeam: 'Arsenal', awayTeam: 'Liverpool', baseOdds: [2.35, 3.45, 2.85], kickoffHour: 13, kickoffMinute: 30, superOdd: true },
  { sport: 'futebol', country: 'Inglaterra', league: 'Premier League', homeTeam: 'Manchester City', awayTeam: 'Chelsea', baseOdds: [1.68, 3.90, 4.65], kickoffHour: 16, kickoffMinute: 0 },
  { sport: 'futebol', country: 'Inglaterra', league: 'Premier League', homeTeam: 'Tottenham', awayTeam: 'Manchester United', baseOdds: [2.15, 3.55, 3.15], kickoffHour: 11, kickoffMinute: 0 },
  { sport: 'futebol', country: 'Inglaterra', league: 'Premier League', homeTeam: 'Newcastle', awayTeam: 'Aston Villa', baseOdds: [2.05, 3.50, 3.40], kickoffHour: 14, kickoffMinute: 0 },

  // Futebol - Espanha & Europa
  { sport: 'futebol', country: 'Espanha', league: 'La Liga', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', baseOdds: [2.05, 3.65, 3.30], kickoffHour: 17, kickoffMinute: 0, superOdd: true },
  { sport: 'futebol', country: 'Espanha', league: 'La Liga', homeTeam: 'Atlético de Madrid', awayTeam: 'Athletic Bilbao', baseOdds: [1.88, 3.40, 4.20], kickoffHour: 14, kickoffMinute: 30 },
  { sport: 'futebol', country: 'Europa', league: 'Champions League', homeTeam: 'Bayern München', awayTeam: 'PSG', baseOdds: [1.92, 3.80, 3.60], kickoffHour: 17, kickoffMinute: 0 },
  { sport: 'futebol', country: 'Europa', league: 'Champions League', homeTeam: 'Inter de Milão', awayTeam: 'Borussia Dortmund', baseOdds: [1.78, 3.65, 4.40], kickoffHour: 17, kickoffMinute: 0 },

  // Basquete - NBA
  { sport: 'basquete', country: 'EUA', league: 'NBA', homeTeam: 'Los Angeles Lakers', awayTeam: 'Boston Celtics', baseOdds: [2.12, null, 1.72], kickoffHour: 22, kickoffMinute: 30, superOdd: true },
  { sport: 'basquete', country: 'EUA', league: 'NBA', homeTeam: 'Golden State Warriors', awayTeam: 'Denver Nuggets', baseOdds: [1.95, null, 1.85], kickoffHour: 23, kickoffMinute: 0 },
  { sport: 'basquete', country: 'EUA', league: 'NBA', homeTeam: 'Milwaukee Bucks', awayTeam: 'New York Knicks', baseOdds: [1.76, null, 2.05], kickoffHour: 21, kickoffMinute: 0 },
  { sport: 'basquete', country: 'EUA', league: 'NBA', homeTeam: 'Dallas Mavericks', awayTeam: 'Miami Heat', baseOdds: [1.65, null, 2.22], kickoffHour: 21, kickoffMinute: 30 },

  // Tênis - ATP / WTA
  { sport: 'tenis', country: 'Mundial', league: 'ATP Masters 1000', homeTeam: 'Carlos Alcaraz', awayTeam: 'Jannik Sinner', baseOdds: [1.90, null, 1.90], kickoffHour: 15, kickoffMinute: 0, superOdd: true },
  { sport: 'tenis', country: 'Mundial', league: 'ATP Tour', homeTeam: 'João Fonseca', awayTeam: 'Alexander Zverev', baseOdds: [2.65, null, 1.48], kickoffHour: 16, kickoffMinute: 30 },
  { sport: 'tenis', country: 'Mundial', league: 'WTA Tour', homeTeam: 'Beatriz Haddad Maia', awayTeam: 'Aryna Sabalenka', baseOdds: [2.95, null, 1.40], kickoffHour: 14, kickoffMinute: 0 },

  // MMA / UFC
  { sport: 'mma', country: 'Mundial', league: 'UFC Fight Night', homeTeam: 'Alex Poatan', awayTeam: 'Magomed Ankalaev', baseOdds: [1.78, null, 2.02], kickoffHour: 23, kickoffMinute: 30, superOdd: true },
  { sport: 'mma', country: 'Mundial', league: 'UFC Fight Night', homeTeam: 'Charles Oliveira', awayTeam: 'Arman Tsarukyan', baseOdds: [2.25, null, 1.65], kickoffHour: 22, kickoffMinute: 45 },

  // E-Sports
  { sport: 'esports', country: 'Mundial', league: 'CS2 · ESL Pro League', homeTeam: 'FURIA', awayTeam: 'Natus Vincere', baseOdds: [2.40, null, 1.56], kickoffHour: 16, kickoffMinute: 0 },
  { sport: 'esports', country: 'Brasil', league: 'CBLOL · League of Legends', homeTeam: 'paiN Gaming', awayTeam: 'LOUD', baseOdds: [1.85, null, 1.92], kickoffHour: 18, kickoffMinute: 0 },
];

export function getSaoPauloDateString(offsetDays = 0): string {
  const now = new Date();
  const target = new Date(now.getTime() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(target);
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function formatDisplayDateBr(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

export function generateDailySchedule(dateStr = getSaoPauloDateString(0)): MatchItem[] {
  const seed = hashDateString(dateStr);
  const rng = seededRandom(seed);

  // Shuffle indices deterministically per calendar day so the daily slate rotates daily
  const indexed = MATCH_POOL.map((tpl, idx) => ({ tpl, sortKey: rng(), idx }));
  indexed.sort((a, b) => a.sortKey - b.sortKey);

  // Pick 22 daily fixtures + 4 tomorrow fixtures + 4 finished results from earlier today
  const matches: MatchItem[] = [];

  indexed.forEach((entry, orderIdx) => {
    const { tpl } = entry;
    const matchId = `m-${dateStr}-${orderIdx}`;
    const varianceHome = (rng() - 0.5) * 0.24;
    const varianceAway = (rng() - 0.5) * 0.24;

    const homeOdd = roundOdd(tpl.baseOdds[0] + varianceHome);
    const awayOdd = roundOdd(tpl.baseOdds[2] + varianceAway);
    const drawOdd = tpl.baseOdds[1] !== null ? roundOdd(tpl.baseOdds[1] + (rng() - 0.5) * 0.2) : null;

    // Assign upcoming / finished status (no live betting)
    let status: 'upcoming' | 'finished' = 'upcoming';
    let kickoffLabel = `Hoje · ${String(tpl.kickoffHour).padStart(2, '0')}:${String(tpl.kickoffMinute).padStart(2, '0')}`;
    let homeScore: number | undefined;
    let awayScore: number | undefined;

    if (orderIdx >= 22) {
      status = 'finished';
      kickoffLabel = 'Encerrado';
      if (tpl.sport === 'basquete') {
        homeScore = 98 + Math.floor(rng() * 24);
        awayScore = 94 + Math.floor(rng() * 24);
      } else {
        homeScore = Math.floor(rng() * 4);
        awayScore = Math.floor(rng() * 3);
      }
    } else if (orderIdx >= 16) {
      status = 'upcoming';
      kickoffLabel = `Amanhã · ${String(tpl.kickoffHour).padStart(2, '0')}:${String(tpl.kickoffMinute).padStart(2, '0')}`;
    }

    const markets =
      drawOdd !== null
        ? buildFootballMarkets(matchId, tpl.homeTeam, tpl.awayTeam, homeOdd, drawOdd, awayOdd, rng)
        : buildTwoWayMarkets(matchId, tpl.sport, tpl.homeTeam, tpl.awayTeam, homeOdd, awayOdd, rng);

    matches.push({
      id: matchId,
      sport: tpl.sport,
      country: tpl.country,
      league: tpl.league,
      homeTeam: tpl.homeTeam,
      awayTeam: tpl.awayTeam,
      status,
      kickoffLabel,
      homeScore,
      awayScore,
      featured: orderIdx === 0 || Boolean(tpl.featured),
      superOdd: Boolean(tpl.superOdd),
      markets,
    });
  });

  // Ensure Flamengo x Palmeiras or first match is featured cleanly
  if (!matches.some((m) => m.featured && m.status !== 'finished')) {
    const firstActive = matches.find((m) => m.status !== 'finished');
    if (firstActive) firstActive.featured = true;
  }

  return matches;
}

export function createInitialTickets(matches: MatchItem[]): BetTicket[] {
  const m1 = matches[0];
  const m2 = matches[1];
  const m3 = matches[2];
  const mFin = matches.find((m) => m.status === 'finished') ?? matches[0];

  return [
    {
      id: 't-seed-1',
      code: 'LL-104820',
      createdAt: 'Hoje · 14:22',
      type: 'Múltipla',
      stake: 50,
      totalOdd: Number((m1.markets[0].options[0].odd * m2.markets[0].options[0].odd).toFixed(2)),
      potentialReturn: Number((50 * m1.markets[0].options[0].odd * m2.markets[0].options[0].odd).toFixed(2)),
      status: 'open',
      selections: [
        {
          matchId: m1.id,
          matchLabel: `${m1.homeTeam} x ${m1.awayTeam}`,
          league: m1.league,
          sport: m1.sport,
          marketId: m1.markets[0].id,
          marketName: m1.markets[0].name,
          optionId: m1.markets[0].options[0].id,
          optionLabel: m1.markets[0].options[0].label,
          odd: m1.markets[0].options[0].odd,
          kickoffLabel: m1.kickoffLabel,
          isLive: false,
          result: 'pending',
        },
        {
          matchId: m2.id,
          matchLabel: `${m2.homeTeam} x ${m2.awayTeam}`,
          league: m2.league,
          sport: m2.sport,
          marketId: m2.markets[0].id,
          marketName: m2.markets[0].name,
          optionId: m2.markets[0].options[0].id,
          optionLabel: m2.markets[0].options[0].label,
          odd: m2.markets[0].options[0].odd,
          kickoffLabel: m2.kickoffLabel,
          isLive: false,
          result: 'pending',
        },
      ],
    },
    {
      id: 't-seed-2',
      code: 'LL-993412',
      createdAt: 'Hoje · 11:05',
      type: 'Simples',
      stake: 100,
      totalOdd: mFin.markets[0].options[0].odd,
      potentialReturn: Number((100 * mFin.markets[0].options[0].odd).toFixed(2)),
      payout: Number((100 * mFin.markets[0].options[0].odd).toFixed(2)),
      status: 'won',
      selections: [
        {
          matchId: mFin.id,
          matchLabel: `${mFin.homeTeam} x ${mFin.awayTeam}`,
          league: mFin.league,
          sport: mFin.sport,
          marketId: mFin.markets[0].id,
          marketName: mFin.markets[0].name,
          optionId: mFin.markets[0].options[0].id,
          optionLabel: mFin.markets[0].options[0].label,
          odd: mFin.markets[0].options[0].odd,
          kickoffLabel: mFin.kickoffLabel,
          isLive: false,
          result: 'won',
        },
      ],
    },
    {
      id: 't-seed-3',
      code: 'LL-772105',
      createdAt: 'Ontem · 21:40',
      type: 'Simples',
      stake: 40,
      totalOdd: m3.markets[0].options[m3.markets[0].options.length - 1].odd,
      potentialReturn: Number((40 * m3.markets[0].options[m3.markets[0].options.length - 1].odd).toFixed(2)),
      payout: 0,
      status: 'lost',
      selections: [
        {
          matchId: m3.id,
          matchLabel: `${m3.homeTeam} x ${m3.awayTeam}`,
          league: m3.league,
          sport: m3.sport,
          marketId: m3.markets[0].id,
          marketName: m3.markets[0].name,
          optionId: m3.markets[0].options[m3.markets[0].options.length - 1].id,
          optionLabel: m3.markets[0].options[m3.markets[0].options.length - 1].label,
          odd: m3.markets[0].options[m3.markets[0].options.length - 1].odd,
          kickoffLabel: m3.kickoffLabel,
          isLive: false,
          result: 'lost',
        },
      ],
    },
  ];
}
