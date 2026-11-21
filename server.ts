import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  createInitialTickets,
  formatDisplayDateBr,
  generateDailySchedule,
  getSaoPauloDateString,
} from './src/data/dailySchedule.ts';
import {
  bootstrapInitialAdmin,
  checkRateLimit,
  clearFailedAttempts,
  createSecondaryUser,
  deleteSecondaryUser,
  listSecondaryUsers,
  needsInitialSetup,
  recordFailedAttempt,
  revokeSessionToken,
  signSessionToken,
  toggleSecondaryUserStatus,
  verifyCredentials,
  verifySessionToken,
} from './src/server/authStore.ts';
import { fetchFromTheOddsApi } from './src/server/oddsApiSync.ts';
import {
  appendStoredTicket,
  cashOutStoredTicket,
  readStoredTickets,
  settleStoredTicket,
} from './src/server/ticketStore.ts';
import type { BetTicket, MatchItem } from './src/types/sportsbook.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ODDS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // Refresh at most every 6 hours automatically or daily at midnight
let cachedDate = getSaoPauloDateString(0);
let cachedMatches: MatchItem[] = generateDailySchedule(cachedDate);
let cachedSource: 'the-odds-api' | 'schedule-local' = 'schedule-local';
let cachedRequestsRemaining: string | null = null;
let lastUpdatedAt = new Date().toISOString();
let lastSyncTimestamp = 0;
let pendingSync: Promise<void> | null = null;

async function ensureDailyMatchesFresh(force = false): Promise<{
  date: string;
  displayDate: string;
  lastUpdatedAt: string;
  source: 'the-odds-api' | 'schedule-local';
  requestsRemaining: string | null;
  oddsApiConfigured: boolean;
  matches: MatchItem[];
}> {
  const today = getSaoPauloDateString(0);
  const apiKey = process.env.THE_ODDS_API_KEY?.trim() || '';
  const isStale =
    force ||
    today !== cachedDate ||
    (apiKey.length > 0 && Date.now() - lastSyncTimestamp > ODDS_CACHE_TTL_MS);

  if (isStale) {
    if (!pendingSync) {
      pendingSync = (async () => {
        try {
          if (apiKey.length > 0) {
            const liveData = await fetchFromTheOddsApi(apiKey);
            if (liveData.matches.length > 0) {
              cachedDate = today;
              cachedMatches = liveData.matches;
              cachedSource = 'the-odds-api';
              cachedRequestsRemaining = liveData.requestsRemaining;
              lastUpdatedAt = new Date().toISOString();
              lastSyncTimestamp = Date.now();
              return;
            }
          }
          cachedDate = today;
          cachedMatches = generateDailySchedule(today);
          cachedSource = 'schedule-local';
          lastUpdatedAt = new Date().toISOString();
          lastSyncTimestamp = Date.now();
        } catch {
          if (today !== cachedDate || cachedMatches.length === 0) {
            cachedDate = today;
            cachedMatches = generateDailySchedule(today);
            cachedSource = 'schedule-local';
            lastUpdatedAt = new Date().toISOString();
          }
        } finally {
          pendingSync = null;
        }
      })();
    }
    await pendingSync;
  }

  return {
    date: cachedDate,
    displayDate: formatDisplayDateBr(cachedDate),
    lastUpdatedAt,
    source: cachedSource,
    requestsRemaining: cachedRequestsRemaining,
    oddsApiConfigured: apiKey.length > 0,
    matches: cachedMatches,
  };
}

// Daily midnight rollover check (every 15 minutes)
setInterval(() => {
  const today = getSaoPauloDateString(0);
  if (today !== cachedDate) {
    void ensureDailyMatchesFresh(true);
  }
}, 15 * 60 * 1000);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '100kb' }));

  const extractBearerToken = (req: express.Request): string | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
  };

  const requireAuth: express.RequestHandler = (req, res, next) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Sessão expirada ou não autenticada.' });
      return;
    }
    const payload = verifySessionToken(token);
    if (!payload) {
      res.status(401).json({ error: 'Token inválido ou expirado.' });
      return;
    }
    res.locals.authUser = {
      username: payload.username,
      role: payload.role,
      cambistaId: payload.cambistaId,
      cambistaName: payload.cambistaName,
    };
    next();
  };

  const requireAdmin: express.RequestHandler = (_req, res, next) => {
    if (res.locals.authUser?.role !== 'admin') {
      res.status(403).json({ error: 'Apenas o administrador principal pode gerenciar contas secundárias.' });
      return;
    }
    next();
  };

  // Auth: check whether initial setup is needed
  app.get('/api/auth/status', (_req, res) => {
    res.json({ needsSetup: needsInitialSetup() });
  });

  // Auth: one-time server bootstrap (only active when no env or stored admin exists)
  app.post('/api/auth/setup', (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Informe usuário e senha válidos.' });
      return;
    }
    const result = bootstrapInitialAdmin(username, password);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    const token = signSessionToken(result.user);
    res.status(201).json({ token, user: result.user });
  });

  // Auth: login against server-stored scrypt credentials or env override
  app.post('/api/auth/login', (req, res) => {
    const clientKey = req.ip || 'unknown';
    const limit = checkRateLimit(clientKey);
    if (limit.blocked) {
      res.status(429).json({
        error: `Muitas tentativas inválidas. Aguarde ${limit.retryAfterSec ?? 60}s e tente novamente.`,
      });
      return;
    }

    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Informe usuário e senha.' });
      return;
    }

    const user = verifyCredentials(username, password);
    if (!user) {
      recordFailedAttempt(clientKey);
      res.status(401).json({ error: 'Usuário ou senha incorretos.' });
      return;
    }

    clearFailedAttempts(clientKey);
    const token = signSessionToken(user);
    res.json({ token, user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) revokeSessionToken(token);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (_req, res) => {
    res.json({ user: res.locals.authUser });
  });

  // Secondary Accounts (Cambista logins) — admin-only, persisted on server
  app.get('/api/auth/secondary-users', requireAuth, requireAdmin, (_req, res) => {
    res.json({ accounts: listSecondaryUsers() });
  });

  app.post('/api/auth/secondary-users', requireAuth, requireAdmin, (req, res) => {
    const { username, password, cambistaId, cambistaName } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Informe usuário e senha válidos.' });
      return;
    }
    const result = createSecondaryUser({
      username,
      password,
      cambistaId: typeof cambistaId === 'string' ? cambistaId : undefined,
      cambistaName: typeof cambistaName === 'string' ? cambistaName : undefined,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(201).json({ account: result.account });
  });

  app.patch('/api/auth/secondary-users/:username/toggle', requireAuth, requireAdmin, (req, res) => {
    const targetUsername = typeof req.params.username === 'string' ? req.params.username : '';
    const result = toggleSecondaryUserStatus(targetUsername);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ account: result.account });
  });

  app.delete('/api/auth/secondary-users/:username', requireAuth, requireAdmin, (req, res) => {
    const targetUsername = typeof req.params.username === 'string' ? req.params.username : '';
    const result = deleteSecondaryUser(targetUsername);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ ok: true });
  });

  // Synced Tickets (Jogos Registrados, Ganhos e Perdidos)
  app.get('/api/tickets', requireAuth, (_req, res) => {
    const seed = createInitialTickets(cachedMatches);
    const tickets = readStoredTickets(seed);
    res.json({ tickets });
  });

  app.post('/api/tickets', requireAuth, (req, res) => {
    const body = req.body ?? {};
    const selections = Array.isArray(body.selections) ? body.selections : [];
    const stake = Number(body.stake);
    const totalOdd = Number(body.totalOdd);
    const potentialReturn = Number(body.potentialReturn);
    const type = body.type === 'Simples' ? 'Simples' : body.type === 'Múltipla' ? 'Múltipla' : null;

    if (!type || selections.length === 0 || !Number.isFinite(stake) || stake <= 0 || !Number.isFinite(totalOdd)) {
      res.status(400).json({ error: 'Dados do bilhete inválidos.' });
      return;
    }

    const authUser = res.locals.authUser as {
      username: string;
      role: 'admin' | 'cambista';
      cambistaId?: string;
      cambistaName?: string;
    };

    const ticket: BetTicket = {
      id: typeof body.id === 'string' && body.id.trim() ? body.id.trim() : `t-${Date.now()}`,
      code: typeof body.code === 'string' && body.code.trim() ? body.code.trim() : `LL-${Math.floor(100000 + Math.random() * 899999)}`,
      createdAt: typeof body.createdAt === 'string' && body.createdAt.trim() ? body.createdAt.trim() : new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      type,
      selections: selections.map((s: Record<string, unknown>) => ({
        matchId: String(s.matchId ?? ''),
        matchLabel: String(s.matchLabel ?? ''),
        league: String(s.league ?? ''),
        sport: (s.sport as BetTicket['selections'][number]['sport']) ?? 'futebol',
        marketId: String(s.marketId ?? ''),
        marketName: String(s.marketName ?? ''),
        optionId: String(s.optionId ?? ''),
        optionLabel: String(s.optionLabel ?? ''),
        odd: Number(s.odd) || 1,
        kickoffLabel: String(s.kickoffLabel ?? ''),
        isLive: Boolean(s.isLive),
        result: 'pending',
      })),
      stake: Number(stake.toFixed(2)),
      totalOdd: Number(totalOdd.toFixed(2)),
      potentialReturn: Number((Number.isFinite(potentialReturn) ? potentialReturn : stake * totalOdd).toFixed(2)),
      status: 'open',
      cambistaId: typeof body.cambistaId === 'string' ? body.cambistaId : authUser.cambistaId,
      cambistaName: typeof body.cambistaName === 'string' ? body.cambistaName : authUser.cambistaName,
      createdByUsername: authUser.username,
    };

    const seed = createInitialTickets(cachedMatches);
    appendStoredTicket(ticket, seed);
    res.status(201).json({ ticket });
  });

  app.post('/api/tickets/:id/settle', requireAuth, (req, res) => {
    const ticketId = typeof req.params.id === 'string' ? req.params.id : '';
    const outcome = req.body?.outcome;
    if (outcome !== 'won' && outcome !== 'lost') {
      res.status(400).json({ error: 'Resultado inválido.' });
      return;
    }
    const updated = settleStoredTicket(ticketId, outcome, createInitialTickets(cachedMatches));
    if (!updated) {
      res.status(404).json({ error: 'Bilhete em aberto não encontrado.' });
      return;
    }
    res.json({ ticket: updated });
  });

  app.post('/api/tickets/:id/cashout', requireAuth, (req, res) => {
    const ticketId = typeof req.params.id === 'string' ? req.params.id : '';
    const updated = cashOutStoredTicket(ticketId, createInitialTickets(cachedMatches));
    if (!updated) {
      res.status(404).json({ error: 'Bilhete em aberto não encontrado.' });
      return;
    }
    res.json({ ticket: updated });
  });

  // API: Daily automatically refreshed matches from The Odds API (when configured) or daily fallback
  app.get('/api/matches', requireAuth, async (req, res) => {
    const force = req.query.refresh === '1';
    const payload = await ensureDailyMatchesFresh(force);
    res.json(payload);
  });

  // API: Add a custom match into today's slate
  app.post('/api/matches/custom', requireAuth, async (req, res) => {
    const { homeTeam, awayTeam, league, country, sport, homeOdd, drawOdd, awayOdd, kickoffHour, kickoffMinute } =
      req.body ?? {};

    if (!homeTeam || !awayTeam || !league) {
      res.status(400).json({ error: 'Informe mandante, visitante e campeonato.' });
      return;
    }

    const state = await ensureDailyMatchesFresh(false);
    const id = `m-custom-${Date.now()}`;
    const hOdd = Math.max(1.05, Number(homeOdd) || 2.1);
    const aOdd = Math.max(1.05, Number(awayOdd) || 3.2);
    const dOdd = drawOdd ? Math.max(1.05, Number(drawOdd)) : null;

    const options =
      dOdd !== null
        ? [
            { id: `${id}-1x2-1`, label: `${homeTeam} (Casa)`, shortLabel: '1', odd: hOdd, trend: 'none' as const },
            { id: `${id}-1x2-x`, label: 'Empate', shortLabel: 'X', odd: dOdd, trend: 'none' as const },
            { id: `${id}-1x2-2`, label: `${awayTeam} (Fora)`, shortLabel: '2', odd: aOdd, trend: 'none' as const },
          ]
        : [
            { id: `${id}-ml-1`, label: String(homeTeam), shortLabel: '1', odd: hOdd, trend: 'none' as const },
            { id: `${id}-ml-2`, label: String(awayTeam), shortLabel: '2', odd: aOdd, trend: 'none' as const },
          ];

    const newMatch: MatchItem = {
      id,
      sport: sport || 'futebol',
      country: country || 'Brasil',
      league: String(league),
      homeTeam: String(homeTeam),
      awayTeam: String(awayTeam),
      status: 'upcoming',
      kickoffLabel: `Hoje · ${String(kickoffHour ?? 20).padStart(2, '0')}:${String(kickoffMinute ?? 0).padStart(2, '0')}`,
      markets: [
        {
          id: '1x2',
          name: dOdd !== null ? 'Resultado Final (1X2)' : 'Vencedor da Partida',
          options,
        },
      ],
    };

    cachedMatches = [newMatch, ...state.matches];
    lastUpdatedAt = new Date().toISOString();
    res.status(201).json({ match: newMatch, total: cachedMatches.length });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`L.L Sports server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
