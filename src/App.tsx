import { Receipt, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BetSlip } from './components/BetSlip';
import { CashControlView } from './components/CashControlView';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { LoginPage } from './components/LoginPage';
import { MatchBoard } from './components/MatchBoard';
import { MatchMarketsModal } from './components/MatchMarketsModal';
import { SecondaryAccountView } from './components/SecondaryAccountView';
import { Sidebar, TimeFilter } from './components/Sidebar';
import { TicketLookupView } from './components/TicketLookupView';
import { WalletModal } from './components/WalletModal';
import {
  createInitialTickets,
  generateDailySchedule,
  getSaoPauloDateString,
} from './data/dailySchedule';
import {
  AuthUser,
  BetSelection,
  BetTicket,
  Cambista,
  MatchItem,
  NavSection,
  QuickMarketMode,
  SecondaryAccount,
  SportId,
  WalletTransaction,
} from './types/sportsbook';

const STORAGE_KEYS = {
  balance: 'llsports_balance_v1',
  tickets: 'llsports_tickets_v1',
  transactions: 'llsports_transactions_v1',
  cambistas: 'llsports_cambistas_v1',
  activeCambista: 'llsports_active_cambista_v1',
};

function nowLabelBr(): string {
  const now = new Date();
  return now.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function App() {
  const initialFallbackMatches = useMemo(() => generateDailySchedule(getSaoPauloDateString(0)), []);

  // Auth session token kept strictly in React memory (never persisted in localStorage/sessionStorage)
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [secondaryAccounts, setSecondaryAccounts] = useState<SecondaryAccount[]>([]);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [matches, setMatches] = useState<MatchItem[]>(initialFallbackMatches);

  const [activeSection, setActiveSection] = useState<NavSection>('esportes');
  const [selectedSport, setSelectedSport] = useState<SportId | 'all'>('all');
  const [selectedLeague, setSelectedLeague] = useState<string | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickMarket, setQuickMarket] = useState<QuickMarketMode>('1x2');

  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [activeMatchModal, setActiveMatchModal] = useState<MatchItem | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isMobileSlipOpen, setIsMobileSlipOpen] = useState(false);
  const [lookupInitialCode, setLookupInitialCode] = useState('');

  // Persistent bankroll, tickets, and cash-control transactions
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.balance);
    return saved !== null ? Number(saved) : 1250;
  });

  const [tickets, setTickets] = useState<BetTicket[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.tickets);
    if (saved) {
      try {
        return JSON.parse(saved) as BetTicket[];
      } catch {
        return createInitialTickets(initialFallbackMatches);
      }
    }
    return createInitialTickets(initialFallbackMatches);
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.transactions);
    if (saved) {
      try {
        return JSON.parse(saved) as WalletTransaction[];
      } catch {
        // fall through to seed
      }
    }
    return [
      {
        id: 'tx-seed-1',
        type: 'deposit',
        direction: 'entrada',
        category: 'Suprimento Inicial',
        method: 'Pix',
        description: 'Abertura de caixa · Banca inicial',
        amount: 1200,
        createdAt: 'Hoje · 09:00',
      },
      {
        id: 'tx-seed-2',
        type: 'win',
        direction: 'entrada',
        category: 'Bilhete Ganho',
        method: 'Banca',
        description: 'Prêmio liquidado · Bilhete LL-993412',
        amount: 195,
        createdAt: 'Hoje · 11:10',
      },
      {
        id: 'tx-seed-3',
        type: 'bet',
        direction: 'saida',
        category: 'Aposta Registrada',
        method: 'Banca',
        description: 'Registro bilhete múltiplo LL-104820',
        amount: 50,
        createdAt: 'Hoje · 14:22',
      },
      {
        id: 'tx-seed-4',
        type: 'withdraw',
        direction: 'saida',
        category: 'Sangria de Caixa',
        method: 'Pix',
        description: 'Retirada parcial de caixa via Pix',
        amount: 95,
        createdAt: 'Hoje · 15:05',
      },
      {
        id: 'tx-seed-5',
        type: 'manual_in',
        direction: 'entrada',
        category: 'Saldo Inicial do Cambista',
        method: 'Banca',
        description: 'Limite inicial liberado para Carlos (Centro)',
        amount: 500,
        createdAt: 'Hoje · 08:30',
        cambistaId: 'camb-seed-1',
        cambistaName: 'Carlos (Centro)',
      },
    ];
  });

  const [cambistas, setCambistas] = useState<Cambista[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.cambistas);
    if (saved) {
      try {
        return JSON.parse(saved) as Cambista[];
      } catch {
        // fall through
      }
    }
    return [
      {
        id: 'camb-seed-1',
        name: 'Carlos (Centro)',
        location: 'Ponto Centro',
        commissionPercent: 10,
        balance: 500,
        active: true,
        createdAt: 'Hoje · 08:30',
      },
    ];
  });

  const [activeCambistaId, setActiveCambistaId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.activeCambista) || null;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.balance, String(balance));
  }, [balance]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tickets, JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.cambistas, JSON.stringify(cambistas));
  }, [cambistas]);

  useEffect(() => {
    if (activeCambistaId) {
      localStorage.setItem(STORAGE_KEYS.activeCambista, activeCambistaId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeCambista);
    }
  }, [activeCambistaId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { needsSetup?: boolean };
          setNeedsSetup(Boolean(data.needsSetup));
        }
      } catch {
        // Keep default login screen
      } finally {
        if (!cancelled) setIsCheckingAuth(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch daily schedule from /api/matches after login
  const fetchDailyMatches = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/matches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setAuthToken(null);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as {
          matches: MatchItem[];
        };
        if (Array.isArray(data.matches) && data.matches.length > 0) {
          setMatches(data.matches);
        }
      }
    } catch {
      // Fallback already populated
    }
  }, []);

  const fetchSecondaryAccounts = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/auth/secondary-users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { accounts?: SecondaryAccount[] };
        if (Array.isArray(data.accounts)) {
          setSecondaryAccounts(data.accounts);
        }
      }
    } catch {
      // Ignore fetch errors silently
    }
  }, []);

  const fetchTickets = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { tickets?: BetTicket[] };
        if (Array.isArray(data.tickets)) {
          setTickets(data.tickets);
        }
      }
    } catch {
      // Fallback to locally persisted tickets
    }
  }, []);

  useEffect(() => {
    if (authToken) {
      fetchDailyMatches(authToken);
      fetchTickets(authToken);
      if (authUser?.role === 'admin') {
        fetchSecondaryAccounts(authToken);
      } else {
        setSecondaryAccounts([]);
      }
    }
  }, [authToken, authUser?.role, fetchDailyMatches, fetchTickets, fetchSecondaryAccounts]);

  const handleLogout = useCallback(async () => {
    const token = authToken;
    setAuthToken(null);
    setAuthUser(null);
    setSecondaryAccounts([]);
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Session already cleared in memory
      }
    }
  }, [authToken]);

  const handleSelectSection = (section: NavSection) => {
    setActiveSection(section);
  };

  const selectedOptionIds = useMemo(() => new Set(selections.map((s) => s.optionId)), [selections]);

  const handleToggleSelection = (selection: BetSelection) => {
    setSelections((prev) => {
      const exists = prev.some((s) => s.optionId === selection.optionId);
      if (exists) {
        return prev.filter((s) => s.optionId !== selection.optionId);
      }
      // Replace any previous selection on the same match to prevent invalid same-game parlay conflicts
      const withoutSameMatch = prev.filter((s) => s.matchId !== selection.matchId);
      return [...withoutSameMatch, selection];
    });
  };

  const handlePlaceBet = (stake: number, betType: 'Simples' | 'Múltipla'): BetTicket | null => {
    if (selections.length === 0) return null;
    const totalRisk = betType === 'Simples' ? stake * selections.length : stake;
    const activeCambista = cambistas.find((c) => c.id === activeCambistaId && c.active) ?? null;
    const availableBalance = activeCambista ? activeCambista.balance : balance;
    if (totalRisk > availableBalance) return null;

    const code = `LL-${Math.floor(100000 + Math.random() * 899999)}`;
    const totalOdd =
      betType === 'Múltipla'
        ? Number(selections.reduce((acc, s) => acc * s.odd, 1).toFixed(2))
        : Number(selections[0].odd.toFixed(2));

    const potentialReturn =
      betType === 'Múltipla'
        ? Number((stake * totalOdd).toFixed(2))
        : Number(selections.reduce((sum, s) => sum + stake * s.odd, 0).toFixed(2));

    const newTicket: BetTicket = {
      id: `t-${Date.now()}`,
      code,
      createdAt: nowLabelBr(),
      type: betType,
      selections: selections.map((s) => ({ ...s, result: 'pending' })),
      stake: Number(totalRisk.toFixed(2)),
      totalOdd,
      potentialReturn,
      status: 'open',
      cambistaId: activeCambista?.id,
      cambistaName: activeCambista?.name,
      createdByUsername: authUser?.username,
    };

    if (activeCambista) {
      setCambistas((prev) =>
        prev.map((c) =>
          c.id === activeCambista.id ? { ...c, balance: Number((c.balance - totalRisk).toFixed(2)) } : c
        )
      );
    } else {
      setBalance((b) => Number((b - totalRisk).toFixed(2)));
    }

    setTickets((prev) => [newTicket, ...prev]);
    if (authToken) {
      void fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(newTicket),
      }).catch(() => {});
    }
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        type: 'bet',
        direction: 'saida',
        category: 'Aposta Registrada',
        method: 'Banca',
        description: `Bilhete ${betType} ${code}`,
        amount: Number(totalRisk.toFixed(2)),
        createdAt: nowLabelBr(),
        cambistaId: activeCambista?.id,
        cambistaName: activeCambista?.name,
      },
      ...prev,
    ]);
    setSelections([]);
    setIsMobileSlipOpen(false);
    return newTicket;
  };

  const handleCashOut = (ticketId: string) => {
    const target = tickets.find((t) => t.id === ticketId && t.status === 'open');
    if (!target) return;
    const cashOutValue = Number(
      (target.stake * 0.88 * Math.min(1.45, Math.max(0.85, target.totalOdd * 0.42))).toFixed(2)
    );

    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: 'cashed_out', payout: cashOutValue } : t))
    );
    if (authToken) {
      void fetch(`/api/tickets/${encodeURIComponent(ticketId)}/cashout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    if (target.cambistaId) {
      setCambistas((prev) =>
        prev.map((c) =>
          c.id === target.cambistaId ? { ...c, balance: Number((c.balance + cashOutValue).toFixed(2)) } : c
        )
      );
    } else {
      setBalance((b) => Number((b + cashOutValue).toFixed(2)));
    }
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        type: 'cashout',
        direction: 'entrada',
        category: 'Cash Out Pago',
        method: 'Banca',
        description: `Cash Out · Bilhete ${target.code}`,
        amount: cashOutValue,
        createdAt: nowLabelBr(),
        cambistaId: target.cambistaId,
        cambistaName: target.cambistaName,
      },
      ...prev,
    ]);
  };

  const handleSimulateSettle = (ticketId: string, outcome: 'won' | 'lost') => {
    const target = tickets.find((t) => t.id === ticketId && t.status === 'open');
    if (!target) return;

    const payout = outcome === 'won' ? target.potentialReturn : 0;

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: outcome,
              payout,
              selections: t.selections.map((s) => ({ ...s, result: outcome })),
            }
          : t
      )
    );
    if (authToken) {
      void fetch(`/api/tickets/${encodeURIComponent(ticketId)}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ outcome }),
      }).catch(() => {});
    }

    if (outcome === 'won') {
      if (target.cambistaId) {
        setCambistas((prev) =>
          prev.map((c) =>
            c.id === target.cambistaId ? { ...c, balance: Number((c.balance + payout).toFixed(2)) } : c
          )
        );
      } else {
        setBalance((b) => Number((b + payout).toFixed(2)));
      }
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          type: 'win',
          direction: 'entrada',
          category: 'Prêmio de Bilhete',
          method: 'Banca',
          description: `Prêmio ganho · Bilhete ${target.code}`,
          amount: payout,
          createdAt: nowLabelBr(),
          cambistaId: target.cambistaId,
          cambistaName: target.cambistaName,
        },
        ...prev,
      ]);
    }
  };

  const handleDeposit = (amount: number) => {
    setBalance((b) => Number((b + amount).toFixed(2)));
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        type: 'deposit',
        direction: 'entrada',
        category: 'Depósito Pix',
        method: 'Pix',
        description: 'Entrada via Pix instantâneo',
        amount,
        createdAt: nowLabelBr(),
      },
      ...prev,
    ]);
  };

  const handleWithdraw = (amount: number, pixKey: string): string | null => {
    if (amount > balance) {
      return 'Saldo insuficiente para realizar este saque.';
    }
    setBalance((b) => Number((b - amount).toFixed(2)));
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        type: 'withdraw',
        direction: 'saida',
        category: 'Saque Pix',
        method: 'Pix',
        description: `Saída Pix (${pixKey})`,
        amount,
        createdAt: nowLabelBr(),
      },
      ...prev,
    ]);
    return null;
  };

  const handleRegisterCashEntry = (payload: {
    direction: 'entrada' | 'saida';
    amount: number;
    method: 'Pix' | 'Dinheiro' | 'Banca';
    category: string;
    description: string;
  }): string | null => {
    if (payload.direction === 'saida' && payload.amount > balance) {
      return 'Saldo insuficiente em caixa para registrar esta saída.';
    }
    setBalance((b) =>
      Number((payload.direction === 'entrada' ? b + payload.amount : b - payload.amount).toFixed(2))
    );
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        type: payload.direction === 'entrada' ? 'manual_in' : 'manual_out',
        direction: payload.direction,
        category: payload.category,
        method: payload.method,
        description: payload.description,
        amount: payload.amount,
        createdAt: nowLabelBr(),
      },
      ...prev,
    ]);
    return null;
  };

  const handleCreateCambista = (payload: {
    id?: string;
    name: string;
    location: string;
    initialBalance: number;
    commissionPercent: number;
  }): string | null => {
    if (cambistas.some((c) => c.name.toLowerCase() === payload.name.toLowerCase())) {
      return 'Já existe um cambista com esse nome.';
    }
    const created: Cambista = {
      id: payload.id || `camb-${Date.now()}`,
      name: payload.name,
      location: payload.location,
      commissionPercent: payload.commissionPercent,
      balance: Number(payload.initialBalance.toFixed(2)),
      active: true,
      createdAt: nowLabelBr(),
    };
    setCambistas((prev) => [created, ...prev]);
    if (payload.initialBalance > 0) {
      setTransactions((prev) => [
        {
          id: `tx-${Date.now()}`,
          type: 'manual_in',
          direction: 'entrada',
          category: 'Saldo Inicial do Cambista',
          method: 'Banca',
          description: `Limite inicial liberado para ${created.name}`,
          amount: Number(payload.initialBalance.toFixed(2)),
          createdAt: nowLabelBr(),
          cambistaId: created.id,
          cambistaName: created.name,
        },
        ...prev,
      ]);
    }
    return null;
  };

  const handleCreateSecondaryAccount = async (payload: {
    username: string;
    password: string;
    cambistaId?: string;
    cambistaName?: string;
  }): Promise<string | null> => {
    if (!authToken) return 'Sessão não autenticada.';
    try {
      const res = await fetch('/api/auth/secondary-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        account?: SecondaryAccount;
        error?: string;
      };
      if (!res.ok || !data.account) {
        return data.error || 'Não foi possível criar a conta secundária no servidor.';
      }
      setSecondaryAccounts((prev) => [data.account!, ...prev]);
      return null;
    } catch {
      return 'Falha ao conectar com o servidor.';
    }
  };

  const handleToggleSecondaryAccountStatus = async (username: string): Promise<string | null> => {
    if (!authToken) return 'Sessão não autenticada.';
    try {
      const res = await fetch(`/api/auth/secondary-users/${encodeURIComponent(username)}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json().catch(() => ({}))) as {
        account?: SecondaryAccount;
        error?: string;
      };
      if (!res.ok || !data.account) {
        return data.error || 'Erro ao atualizar conta secundária.';
      }
      setSecondaryAccounts((prev) =>
        prev.map((a) => (a.username === data.account!.username ? data.account! : a))
      );
      return null;
    } catch {
      return 'Falha ao conectar com o servidor.';
    }
  };

  const handleDeleteSecondaryAccount = async (username: string): Promise<string | null> => {
    if (!authToken) return 'Sessão não autenticada.';
    try {
      const res = await fetch(`/api/auth/secondary-users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        return data.error || 'Erro ao excluir conta secundária.';
      }
      setSecondaryAccounts((prev) => prev.filter((a) => a.username !== username));
      return null;
    } catch {
      return 'Falha ao conectar com o servidor.';
    }
  };

  const handleToggleCambistaStatus = (cambistaId: string) => {
    setCambistas((prev) =>
      prev.map((c) => (c.id === cambistaId ? { ...c, active: !c.active } : c))
    );
    if (activeCambistaId === cambistaId) {
      setActiveCambistaId(null);
    }
  };

  const handleDeleteCambista = (cambistaId: string) => {
    setCambistas((prev) => prev.filter((c) => c.id !== cambistaId));
    if (activeCambistaId === cambistaId) {
      setActiveCambistaId(null);
    }
  };

  const handleRegisterCambistaEntry = (payload: {
    cambistaId: string;
    direction: 'entrada' | 'saida';
    amount: number;
    method: 'Pix' | 'Dinheiro' | 'Banca';
    category: string;
    description: string;
  }): string | null => {
    const target = cambistas.find((c) => c.id === payload.cambistaId);
    if (!target) return 'Cambista não encontrado.';
    if (payload.direction === 'saida' && payload.amount > target.balance) {
      return 'Saldo insuficiente neste cambista para realizar esta saída.';
    }
    setCambistas((prev) =>
      prev.map((c) =>
        c.id === payload.cambistaId
          ? {
              ...c,
              balance: Number(
                (payload.direction === 'entrada'
                  ? c.balance + payload.amount
                  : c.balance - payload.amount
                ).toFixed(2)
              ),
            }
          : c
      )
    );
    setTransactions((prev) => [
      {
        id: `tx-${Date.now()}`,
        type: payload.direction === 'entrada' ? 'manual_in' : 'manual_out',
        direction: payload.direction,
        category: payload.category,
        method: payload.method,
        description: payload.description,
        amount: payload.amount,
        createdAt: nowLabelBr(),
        cambistaId: target.id,
        cambistaName: target.name,
      },
      ...prev,
    ]);
    return null;
  };

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return matches.filter((m) => {
      if (timeFilter === 'today' && !m.kickoffLabel.startsWith('Hoje')) return false;
      if (timeFilter === 'tomorrow' && !m.kickoffLabel.startsWith('Amanhã')) return false;
      if (timeFilter === 'finished' && m.status !== 'finished') return false;
      if (timeFilter === 'all' && m.status === 'finished') return false;

      if (selectedSport !== 'all' && m.sport !== selectedSport) return false;
      if (selectedLeague !== 'all' && m.league !== selectedLeague) return false;

      if (q) {
        const hay = `${m.homeTeam} ${m.awayTeam} ${m.league} ${m.country}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matches, timeFilter, selectedSport, selectedLeague, searchQuery]);

  const featuredMatch = useMemo(() => {
    if (selectedSport !== 'all') {
      return matches.find((m) => m.sport === selectedSport && m.status !== 'finished');
    }
    return matches.find((m) => m.featured && m.status !== 'finished') ?? matches[0];
  }, [matches, selectedSport]);

  const showSportsWorkspace = activeSection === 'esportes';

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090C10] text-slate-400 text-sm">
        Carregando sistema...
      </div>
    );
  }

  if (!authToken) {
    return (
      <LoginPage
        needsSetup={needsSetup}
        onAuthenticated={(token, user) => {
          setAuthToken(token);
          setAuthUser(user);
          setNeedsSetup(false);
          if (user.role === 'cambista' && user.cambistaId) {
            setActiveCambistaId(user.cambistaId);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090C10] text-slate-100">
      <Header
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onLogout={handleLogout}
        isAdmin={authUser?.role === 'admin'}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
        {showSportsWorkspace && (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <Sidebar
              matches={matches}
              selectedSport={selectedSport}
              onSelectSport={setSelectedSport}
              selectedLeague={selectedLeague}
              onSelectLeague={setSelectedLeague}
              timeFilter={timeFilter}
              onSelectTimeFilter={(f) => {
                setTimeFilter(f);
                setActiveSection('esportes');
              }}
            />

            <div className="min-w-0 flex-1 space-y-6">
              {timeFilter !== 'finished' && (
                <HeroBanner
                  featuredMatch={featuredMatch}
                  activeSport={selectedSport}
                  selectedOptionIds={selectedOptionIds}
                  onToggleSelection={handleToggleSelection}
                  onOpenMarkets={setActiveMatchModal}
                />
              )}

              <MatchBoard
                matches={filteredMatches}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                quickMarket={quickMarket}
                onQuickMarketChange={setQuickMarket}
                selectedOptionIds={selectedOptionIds}
                onToggleSelection={handleToggleSelection}
                onOpenMarkets={setActiveMatchModal}
              />
            </div>

            {/* Desktop Bet Slip */}
            <div className="hidden lg:block">
              <BetSlip
                selections={selections}
                balance={balance}
                cambistas={cambistas}
                activeCambistaId={activeCambistaId}
                onSelectActiveCambista={setActiveCambistaId}
                onRemoveSelection={(optId) =>
                  setSelections((prev) => prev.filter((s) => s.optionId !== optId))
                }
                onClearAll={() => setSelections([])}
                onPlaceBet={handlePlaceBet}
                onGoToTicketLookup={(code) => {
                  setLookupInitialCode(code);
                  setActiveSection('consultar');
                }}
                onOpenDeposit={() => setIsWalletOpen(true)}
              />
            </div>
          </div>
        )}

        {activeSection === 'consultar' && (
          <TicketLookupView
            key={lookupInitialCode}
            tickets={tickets}
            initialSearchCode={lookupInitialCode}
            onCashOut={handleCashOut}
            onSimulateSettle={handleSimulateSettle}
            onBackToSports={() => setActiveSection('esportes')}
          />
        )}

        {activeSection === 'resultados' &&
          (authUser?.role === 'admin' ? (
            <CashControlView
              balance={balance}
              transactions={transactions}
              cambistas={cambistas}
              activeCambistaId={activeCambistaId}
              tickets={tickets}
              isAdmin={authUser?.role === 'admin'}
              secondaryAccounts={secondaryAccounts}
              onRegisterEntry={handleRegisterCashEntry}
              onCreateCambista={handleCreateCambista}
              onCreateSecondaryAccount={handleCreateSecondaryAccount}
              onToggleSecondaryAccountStatus={handleToggleSecondaryAccountStatus}
              onDeleteSecondaryAccount={handleDeleteSecondaryAccount}
              onSelectActiveCambista={setActiveCambistaId}
              onToggleCambistaStatus={handleToggleCambistaStatus}
              onDeleteCambista={handleDeleteCambista}
              onRegisterCambistaEntry={handleRegisterCambistaEntry}
              onCashOut={handleCashOut}
              onSimulateSettle={handleSimulateSettle}
              onGoToSports={() => setActiveSection('esportes')}
            />
          ) : (
            authUser && (
              <SecondaryAccountView
                authUser={authUser}
                tickets={tickets}
                onCashOut={handleCashOut}
                onSimulateSettle={handleSimulateSettle}
                onGoToSports={() => setActiveSection('esportes')}
              />
            )
          ))}
      </main>

      {/* Mobile Sticky Bet Slip Launcher (only when selections > 0 and on sports view) */}
      {showSportsWorkspace && selections.length > 0 && !isMobileSlipOpen && (
        <div className="fixed bottom-4 right-4 z-40 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSlipOpen(true)}
            className="inline-flex items-center gap-2.5 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-xl hover:bg-emerald-400 cursor-pointer"
          >
            <Receipt className="h-4 w-4" aria-hidden="true" />
            <span>Bilhete ({selections.length})</span>
            <span className="font-mono tabular-nums">
              · {selections.reduce((acc, s) => acc * s.odd, 1).toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* Mobile Bet Slip Drawer */}
      {isMobileSlipOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 lg:hidden">
          <div className="max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-[#242E3D] bg-[#0B0F14] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Seu Bilhete</span>
              <button
                type="button"
                onClick={() => setIsMobileSlipOpen(false)}
                aria-label="Fechar bilhete"
                className="rounded-lg border border-[#242E3D] p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <BetSlip
              selections={selections}
              balance={balance}
              cambistas={cambistas}
              activeCambistaId={activeCambistaId}
              onSelectActiveCambista={setActiveCambistaId}
              onRemoveSelection={(optId) =>
                setSelections((prev) => prev.filter((s) => s.optionId !== optId))
              }
              onClearAll={() => setSelections([])}
              onPlaceBet={handlePlaceBet}
              onGoToTicketLookup={(code) => {
                setIsMobileSlipOpen(false);
                setLookupInitialCode(code);
                setActiveSection('consultar');
              }}
              onOpenDeposit={() => {
                setIsMobileSlipOpen(false);
                setIsWalletOpen(true);
              }}
            />
          </div>
        </div>
      )}

      <MatchMarketsModal
        match={activeMatchModal}
        selectedOptionIds={selectedOptionIds}
        onClose={() => setActiveMatchModal(null)}
        onToggleSelection={handleToggleSelection}
      />

      <WalletModal
        isOpen={isWalletOpen}
        balance={balance}
        onClose={() => setIsWalletOpen(false)}
        onDeposit={handleDeposit}
        onWithdraw={handleWithdraw}
        onOpenFullCashControl={() => setActiveSection('resultados')}
      />

      <footer className="border-t border-[#1A222D] bg-[#0B0F14] py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <div>L.L Sports · Plataforma de Apostas Esportivas e Controle de Caixa</div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('consultar')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Consultar Bilhete
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('resultados')}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              {authUser?.role === 'admin' ? 'Controle de Caixa' : 'Meus Jogos'}
            </button>
            <span>Jogue com responsabilidade · +18</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
