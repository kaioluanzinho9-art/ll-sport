import type { MarketGroup, MatchItem, SportId } from '../types/sportsbook.ts';

interface OddsApiSport {
  key: string;
  group: string;
  title: string;
  active: boolean;
}

interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
}

interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}

interface OddsApiBookmaker {
  key: string;
  title: string;
  markets: OddsApiMarket[];
}

interface OddsApiEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

interface OddsApiScoreEntry {
  name: string;
  score: string;
}

interface OddsApiScoreEvent {
  id: string;
  completed: boolean;
  scores: OddsApiScoreEntry[] | null;
}

const TARGET_LEAGUE_CONFIG: Record<
  string,
  { sport: SportId; country: string; league: string; priority: number }
> = {
  soccer_brazil_campeonato: { sport: 'futebol', country: 'Brasil', league: 'Brasileirão Série A', priority: 1 },
  soccer_brazil_serie_b: { sport: 'futebol', country: 'Brasil', league: 'Brasileirão Série B', priority: 2 },
  soccer_conmebol_copa_libertadores: { sport: 'futebol', country: 'América do Sul', league: 'Copa Libertadores', priority: 3 },
  soccer_epl: { sport: 'futebol', country: 'Inglaterra', league: 'Premier League', priority: 4 },
  soccer_spain_la_liga: { sport: 'futebol', country: 'Espanha', league: 'La Liga', priority: 5 },
  soccer_uefa_champs_league: { sport: 'futebol', country: 'Europa', league: 'Champions League', priority: 6 },
  basketball_nba: { sport: 'basquete', country: 'EUA', league: 'NBA', priority: 7 },
  mma_mixed_martial_arts: { sport: 'mma', country: 'Mundial', league: 'UFC / MMA', priority: 8 },
};

function formatSaoPauloKickoff(isoDate: string): {
  status: 'upcoming' | 'finished';
  kickoffLabel: string;
} {
  const start = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();

  // Matches that already kicked off cannot be bet live; mark as finished
  if (diffMs >= 0) {
    return {
      status: 'finished',
      kickoffLabel: 'Encerrado',
    };
  }

  const fmtDay = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = fmtDay.format(now);
  const tomorrowStr = fmtDay.format(new Date(now.getTime() + 86400000));
  const eventDayStr = fmtDay.format(start);

  const timeLabel = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(start);

  if (eventDayStr === todayStr) {
    return { status: 'upcoming', kickoffLabel: `Hoje · ${timeLabel}` };
  }
  if (eventDayStr === tomorrowStr) {
    return { status: 'upcoming', kickoffLabel: `Amanhã · ${timeLabel}` };
  }

  const shortDate = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
  }).format(start);
  return { status: 'upcoming', kickoffLabel: `${shortDate} · ${timeLabel}` };
}

function roundOdd(val: number): number {
  return Number(Math.max(1.05, Math.min(50, val)).toFixed(2));
}

function createEventRng(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = Math.abs(h) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function mapEventToMatch(
  ev: OddsApiEvent,
  meta: { sport: SportId; country: string; league: string },
  scoreEvent?: OddsApiScoreEvent
): MatchItem | null {
  if (!ev.bookmakers || ev.bookmakers.length === 0) return null;

  // Prefer sharp EU bookmakers like Pinnacle / Bet365 / Unibet / Betfair if present
  const preferredOrder = ['pinnacle', 'betfair_ex_eu', 'bet365', 'unibet_eu', 'onexbet', 'marathonbet'];
  const bookmaker =
    preferredOrder
      .map((k) => ev.bookmakers.find((b) => b.key === k))
      .find(Boolean) ?? ev.bookmakers[0];

  const h2hMarket = bookmaker.markets.find((m) => m.key === 'h2h');
  if (!h2hMarket || h2hMarket.outcomes.length < 2) return null;

  const homeOut = h2hMarket.outcomes.find((o) => o.name === ev.home_team) ?? h2hMarket.outcomes[0];
  const awayOut = h2hMarket.outcomes.find((o) => o.name === ev.away_team) ?? h2hMarket.outcomes[h2hMarket.outcomes.length - 1];
  const drawOut = h2hMarket.outcomes.find((o) => o.name.toLowerCase() === 'draw');

  const totalsMarket = bookmaker.markets.find((m) => m.key === 'totals');
  const overOutcome = totalsMarket?.outcomes.find((o) => o.name.toLowerCase() === 'over');
  const underOutcome = totalsMarket?.outcomes.find((o) => o.name.toLowerCase() === 'under');
  const totalsPoint = overOutcome?.point ?? underOutcome?.point;

  const rng = createEventRng(ev.id);
  const markets: MarketGroup[] = [];

  if (drawOut) {
    markets.push({
      id: '1x2',
      name: 'Resultado Final (1X2)',
      options: [
        { id: `${ev.id}-1x2-1`, label: `${ev.home_team} (Casa)`, shortLabel: '1', odd: roundOdd(homeOut.price), trend: 'none' },
        { id: `${ev.id}-1x2-x`, label: 'Empate', shortLabel: 'X', odd: roundOdd(drawOut.price), trend: 'none' },
        { id: `${ev.id}-1x2-2`, label: `${ev.away_team} (Fora)`, shortLabel: '2', odd: roundOdd(awayOut.price), trend: 'none' },
      ],
    });

    // Calibrate BTTS (Ambos Marcam) using 1X2 balance + bookmaker totals if available
    const balanceGap = Math.abs(1 / homeOut.price - 1 / awayOut.price);
    const totalBias = overOutcome && totalsPoint === 2.5 ? Math.max(-0.18, Math.min(0.22, (overOutcome.price - 1.85) * 0.45)) : 0;
    const bttsYesOdd = roundOdd(1.62 + balanceGap * 0.65 + totalBias + rng() * 0.14);
    const bttsNoOdd = roundOdd(Math.max(1.52, 1 / Math.max(0.18, 0.94 - 1 / bttsYesOdd)));

    markets.push({
      id: 'btts',
      name: 'Ambos Marcam',
      options: [
        { id: `${ev.id}-btts-y`, label: 'Ambos Marcam · Sim', shortLabel: 'Sim', odd: bttsYesOdd, trend: 'none' },
        { id: `${ev.id}-btts-n`, label: 'Ambos Marcam · Não', shortLabel: 'Não', odd: bttsNoOdd, trend: 'none' },
      ],
    });

    // Over / Under 1.5 Gols (use real bookmaker 1.5 if provided, otherwise calibrate from 2.5/1X2)
    let over15Odd: number;
    let under15Odd: number;
    if (overOutcome && underOutcome && totalsPoint === 1.5) {
      over15Odd = roundOdd(overOutcome.price);
      under15Odd = roundOdd(underOutcome.price);
    } else {
      const ref25 = overOutcome && totalsPoint === 2.5 ? overOutcome.price : 1.85 + (rng() - 0.5) * 0.25;
      over15Odd = roundOdd(Math.max(1.16, Math.min(1.48, 1.12 + (ref25 - 1.45) * 0.34)));
      under15Odd = roundOdd(Math.max(2.55, 1 / Math.max(0.16, 0.93 - 1 / over15Odd)));
    }

    markets.push({
      id: 'over15',
      name: 'Total de Gols · 1.5',
      options: [
        { id: `${ev.id}-o15`, label: 'Acima de 1.5 Gols', shortLabel: 'Acima 1.5', odd: over15Odd, trend: 'none' },
        { id: `${ev.id}-u15`, label: 'Abaixo de 1.5 Gols', shortLabel: 'Abaixo 1.5', odd: under15Odd, trend: 'none' },
      ],
    });

    // Over / Under 2.5 Gols (real bookmaker line when available)
    if (overOutcome && underOutcome && totalsPoint !== undefined && totalsPoint !== 1.5) {
      markets.push({
        id: 'over25',
        name: `Total de Gols · ${totalsPoint}`,
        options: [
          { id: `${ev.id}-tot-o`, label: `Acima de ${totalsPoint} Gols`, shortLabel: `Acima ${totalsPoint}`, odd: roundOdd(overOutcome.price), trend: 'none' },
          { id: `${ev.id}-tot-u`, label: `Abaixo de ${totalsPoint} Gols`, shortLabel: `Abaixo ${totalsPoint}`, odd: roundOdd(underOutcome.price), trend: 'none' },
        ],
      });
    } else {
      const over25Odd = roundOdd(1.72 + rng() * 0.38);
      const under25Odd = roundOdd(Math.max(1.55, 1 / Math.max(0.2, 0.94 - 1 / over25Odd)));
      markets.push({
        id: 'over25',
        name: 'Total de Gols · 2.5',
        options: [
          { id: `${ev.id}-o25`, label: 'Acima de 2.5 Gols', shortLabel: 'Acima 2.5', odd: over25Odd, trend: 'none' },
          { id: `${ev.id}-u25`, label: 'Abaixo de 2.5 Gols', shortLabel: 'Abaixo 2.5', odd: under25Odd, trend: 'none' },
        ],
      });
    }

    // Escanteios (9.5 main + 8.5 & 10.5 alternate lines)
    const cOver95 = roundOdd(1.74 + rng() * 0.24);
    const cUnder95 = roundOdd(Math.max(1.62, 1 / Math.max(0.22, 0.93 - 1 / cOver95)));
    markets.push({
      id: 'corners',
      name: 'Escanteios · 9.5',
      options: [
        { id: `${ev.id}-c-o95`, label: 'Acima de 9.5 Escanteios', shortLabel: '+9.5 Esc', odd: cOver95, trend: 'none' },
        { id: `${ev.id}-c-u95`, label: 'Abaixo de 9.5 Escanteios', shortLabel: '-9.5 Esc', odd: cUnder95, trend: 'none' },
      ],
    });

    // Derived Double Chance from real 1X2 odds
    const dc1x = roundOdd((1 / (1 / homeOut.price + 1 / drawOut.price)) * 1.04);
    const dc12 = roundOdd((1 / (1 / homeOut.price + 1 / awayOut.price)) * 1.04);
    const dcx2 = roundOdd((1 / (1 / drawOut.price + 1 / awayOut.price)) * 1.04);

    markets.push({
      id: 'dc',
      name: 'Dupla Hipótese',
      options: [
        { id: `${ev.id}-dc-1x`, label: `${ev.home_team} ou Empate`, shortLabel: '1X', odd: dc1x, trend: 'none' },
        { id: `${ev.id}-dc-12`, label: `${ev.home_team} ou ${ev.away_team}`, shortLabel: '12', odd: dc12, trend: 'none' },
        { id: `${ev.id}-dc-x2`, label: `Empate ou ${ev.away_team}`, shortLabel: 'X2', odd: dcx2, trend: 'none' },
      ],
    });

    markets.push({
      id: 'corners_alt',
      name: 'Escanteios · Linhas Alternativas',
      options: [
        { id: `${ev.id}-c-o85`, label: 'Acima de 8.5 Escanteios', shortLabel: '+8.5 Esc', odd: roundOdd(1.46 + rng() * 0.16), trend: 'none' },
        { id: `${ev.id}-c-u85`, label: 'Abaixo de 8.5 Escanteios', shortLabel: '-8.5 Esc', odd: roundOdd(2.38 + rng() * 0.34), trend: 'none' },
        { id: `${ev.id}-c-o105`, label: 'Acima de 10.5 Escanteios', shortLabel: '+10.5 Esc', odd: roundOdd(2.15 + rng() * 0.32), trend: 'none' },
        { id: `${ev.id}-c-u105`, label: 'Abaixo de 10.5 Escanteios', shortLabel: '-10.5 Esc', odd: roundOdd(1.56 + rng() * 0.18), trend: 'none' },
      ],
    });

    markets.push({
      id: 'dnb',
      name: 'Empate Anula Aposta',
      options: [
        { id: `${ev.id}-dnb-1`, label: `${ev.home_team} (DNB)`, shortLabel: 'Casa DNB', odd: roundOdd(homeOut.price * 0.72), trend: 'none' },
        { id: `${ev.id}-dnb-2`, label: `${ev.away_team} (DNB)`, shortLabel: 'Fora DNB', odd: roundOdd(awayOut.price * 0.72), trend: 'none' },
      ],
    });
  } else {
    markets.push({
      id: '1x2',
      name: 'Vencedor da Partida',
      options: [
        { id: `${ev.id}-ml-1`, label: ev.home_team, shortLabel: '1', odd: roundOdd(homeOut.price), trend: 'none' },
        { id: `${ev.id}-ml-2`, label: ev.away_team, shortLabel: '2', odd: roundOdd(awayOut.price), trend: 'none' },
      ],
    });

    if (overOutcome && underOutcome) {
      const pt = totalsPoint ?? 2.5;
      markets.push({
        id: 'over25',
        name: `Total · ${pt}`,
        options: [
          { id: `${ev.id}-tot-o`, label: `Mais de ${pt}`, shortLabel: `+${pt}`, odd: roundOdd(overOutcome.price), trend: 'none' },
          { id: `${ev.id}-tot-u`, label: `Menos de ${pt}`, shortLabel: `-${pt}`, odd: roundOdd(underOutcome.price), trend: 'none' },
        ],
      });
    }
  }

  const timing = formatSaoPauloKickoff(ev.commence_time);
  let status = timing.status;
  let kickoffLabel = timing.kickoffLabel;
  let homeScore: number | undefined;
  let awayScore: number | undefined;

  if (scoreEvent) {
    if (scoreEvent.completed) {
      status = 'finished';
      kickoffLabel = 'Encerrado';
    }
    if (scoreEvent.scores && scoreEvent.scores.length >= 2) {
      const h = scoreEvent.scores.find((s) => s.name === ev.home_team);
      const a = scoreEvent.scores.find((s) => s.name === ev.away_team);
      if (h && a) {
        homeScore = Number(h.score) || 0;
        awayScore = Number(a.score) || 0;
      }
    }
  }

  return {
    id: `oddsapi-${ev.id}`,
    sport: meta.sport,
    country: meta.country,
    league: meta.league,
    homeTeam: ev.home_team,
    awayTeam: ev.away_team,
    status,
    kickoffLabel,
    homeScore,
    awayScore,
    markets,
  };
}

export interface OddsApiSyncResult {
  matches: MatchItem[];
  requestsRemaining: string | null;
  activeLeaguesFetched: number;
}

export async function fetchFromTheOddsApi(apiKey: string): Promise<OddsApiSyncResult> {
  // 1. Discover currently active in-season sports (free endpoint, 0 quota cost)
  const sportsUrl = new URL('https://api.the-odds-api.com/v4/sports');
  sportsUrl.searchParams.set('apiKey', apiKey);

  const sportsRes = await fetch(sportsUrl.toString());
  if (!sportsRes.ok) {
    throw new Error(`The Odds API sports lookup failed with HTTP ${sportsRes.status}`);
  }
  const activeSports = (await sportsRes.json()) as OddsApiSport[];

  // Match active sports against our priority target leagues + up to 1 active ATP tennis tournament
  const matchedKeys: { key: string; sport: SportId; country: string; league: string; priority: number }[] = [];

  for (const sp of activeSports) {
    if (!sp.active) continue;
    const cfg = TARGET_LEAGUE_CONFIG[sp.key];
    if (cfg) {
      matchedKeys.push({ key: sp.key, ...cfg });
    } else if (sp.key.startsWith('tennis_atp_') && !matchedKeys.some((m) => m.sport === 'tenis')) {
      matchedKeys.push({
        key: sp.key,
        sport: 'tenis',
        country: 'Mundial',
        league: sp.title || 'ATP Tour',
        priority: 9,
      });
    }
  }

  matchedKeys.sort((a, b) => a.priority - b.priority);
  // Cap to top 6 active leagues per sync to protect user's monthly API credits
  const selectedLeagues = matchedKeys.slice(0, 6);

  let requestsRemaining: string | null = sportsRes.headers.get('x-requests-remaining');
  const collected: MatchItem[] = [];

  const results = await Promise.allSettled(
    selectedLeagues.map(async (leagueCfg) => {
      const oddsUrl = new URL(`https://api.the-odds-api.com/v4/sports/${leagueCfg.key}/odds`);
      oddsUrl.searchParams.set('apiKey', apiKey);
      oddsUrl.searchParams.set('regions', 'eu');
      oddsUrl.searchParams.set('markets', 'h2h,totals');
      oddsUrl.searchParams.set('oddsFormat', 'decimal');

      const res = await fetch(oddsUrl.toString());
      const rem = res.headers.get('x-requests-remaining');
      if (rem !== null) requestsRemaining = rem;

      if (!res.ok) return [];
      const events = (await res.json()) as OddsApiEvent[];

      // Optional live scores check for the top 2 leagues only
      const scoreMap = new Map<string, OddsApiScoreEvent>();
      if (leagueCfg.priority <= 4) {
        try {
          const scoresUrl = new URL(`https://api.the-odds-api.com/v4/sports/${leagueCfg.key}/scores`);
          scoresUrl.searchParams.set('apiKey', apiKey);
          scoresUrl.searchParams.set('daysFrom', '1');
          const scRes = await fetch(scoresUrl.toString());
          const scRem = scRes.headers.get('x-requests-remaining');
          if (scRem !== null) requestsRemaining = scRem;
          if (scRes.ok) {
            const scData = (await scRes.json()) as OddsApiScoreEvent[];
            for (const s of scData) scoreMap.set(s.id, s);
          }
        } catch {
          // Scores optional
        }
      }

      const mapped: MatchItem[] = [];
      for (const ev of events.slice(0, 12)) {
        const item = mapEventToMatch(ev, leagueCfg, scoreMap.get(ev.id));
        if (item) mapped.push(item);
      }
      return mapped;
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled') {
      collected.push(...r.value);
    }
  }

  // Mark the first active match as featured
  const firstActive = collected.find((m) => m.status !== 'finished');
  if (firstActive) firstActive.featured = true;

  return {
    matches: collected,
    requestsRemaining,
    activeLeaguesFetched: selectedLeagues.length,
  };
}
