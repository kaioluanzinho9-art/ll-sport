import { CheckCircle2, Clock, Copy, Play, Search, Trophy, XCircle } from 'lucide-react';
import { useState } from 'react';
import { AuthUser, BetTicket, TicketStatus } from '../types/sportsbook';
import { formatBRL } from './Header';

interface SecondaryAccountViewProps {
  authUser: AuthUser;
  tickets: BetTicket[];
  onCashOut: (ticketId: string) => void;
  onSimulateSettle: (ticketId: string, outcome: 'won' | 'lost') => void;
  onGoToSports: () => void;
}

const STATUS_META: Record<TicketStatus, { label: string; colorClass: string }> = {
  open: { label: 'Em Aberto', colorClass: 'text-amber-400' },
  won: { label: 'Ganho', colorClass: 'text-emerald-400' },
  lost: { label: 'Perdido', colorClass: 'text-rose-400' },
  cashed_out: { label: 'Cash Out', colorClass: 'text-sky-400' },
};

export function SecondaryAccountView({
  authUser,
  tickets,
  onCashOut,
  onSimulateSettle,
  onGoToSports,
}: SecondaryAccountViewProps) {
  const [scope, setScope] = useState<'all' | 'mine'>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scopedTickets = tickets.filter((t) => {
    if (scope === 'all') return true;
    const matchUser = t.createdByUsername?.toLowerCase() === authUser.username.toLowerCase();
    const matchCambista = Boolean(authUser.cambistaId && t.cambistaId === authUser.cambistaId);
    return matchUser || matchCambista;
  });

  const q = searchQuery.trim().toLowerCase();
  const filteredTickets = scopedTickets.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesQuery =
      !q ||
      t.code.toLowerCase().includes(q) ||
      (t.cambistaName && t.cambistaName.toLowerCase().includes(q)) ||
      t.selections.some((s) => s.matchLabel.toLowerCase().includes(q) || s.league.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  const openCount = scopedTickets.filter((t) => t.status === 'open').length;
  const wonTickets = scopedTickets.filter((t) => t.status === 'won');
  const lostTickets = scopedTickets.filter((t) => t.status === 'lost');
  const totalWonAmount = wonTickets.reduce((sum, t) => sum + (t.payout ?? t.potentialReturn), 0);
  const totalLostStake = lostTickets.reduce((sum, t) => sum + t.stake, 0);

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#1E2633] pb-4">
        <div>
          <div className="text-xs font-medium text-slate-400">
            Conta Secundária:{' '}
            <strong className="font-mono text-emerald-400">{authUser.username}</strong>
            {authUser.cambistaName ? ` · Cambista: ${authUser.cambistaName}` : ''}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Jogos Registrados, Ganhos e Perdidos
          </h1>
        </div>

        <button
          type="button"
          onClick={onGoToSports}
          className="self-start rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
        >
          Registrar Novo Jogo
        </button>
      </div>

      {/* 4 Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-4 space-y-1">
          <div className="text-xs text-slate-400">Jogos Registrados</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-white">
            {scopedTickets.length}
          </div>
          <div className="text-[11px] text-slate-500">Total de bilhetes lançados</div>
        </div>

        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-4 space-y-1">
          <div className="text-xs text-slate-400">Em Aberto</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-amber-400">
            {openCount}
          </div>
          <div className="text-[11px] text-slate-500">Aguardando resultado</div>
        </div>

        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Jogos Ganhos</span>
            <Trophy className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums text-emerald-400">
            {wonTickets.length}
          </div>
          <div className="font-mono text-[11px] tabular-nums text-emerald-400/80">
            Prêmios: {formatBRL(totalWonAmount)}
          </div>
        </div>

        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-4 space-y-1">
          <div className="text-xs text-slate-400">Jogos Perdidos</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-rose-400">
            {lostTickets.length}
          </div>
          <div className="font-mono text-[11px] tabular-nums text-rose-400/80">
            Apostado: {formatBRL(totalLostStake)}
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#1E2633] bg-[#11161D] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#1E2633] bg-[#0B0F14] p-1">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                scope === 'all' ? 'bg-[#1D2735] text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos os Jogos
            </button>
            <button
              type="button"
              onClick={() => setScope('mine')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer ${
                scope === 'mine' ? 'bg-[#1D2735] text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Somente Minha Conta
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#1E2633] bg-[#0B0F14] p-1">
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'open', label: 'Em Aberto' },
                { id: 'won', label: 'Ganhos' },
                { id: 'lost', label: 'Perdidos' },
                { id: 'cashed_out', label: 'Cash Out' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar código, time ou campeonato..."
            className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-10 text-center space-y-2">
          <p className="text-base font-semibold text-white">Nenhum jogo encontrado para este filtro</p>
          <p className="text-sm text-slate-400">
            Altere os filtros acima ou registre uma nova aposta na grade de esportes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const meta = STATUS_META[ticket.status];
            const cashOutValue = Number(
              (ticket.stake * 0.88 * Math.min(1.45, Math.max(0.85, ticket.totalOdd * 0.42))).toFixed(2)
            );

            return (
              <article
                key={ticket.id}
                className="overflow-hidden rounded-xl border border-[#1E2633] bg-[#11161D]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2633] bg-[#141B24] px-5 py-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-mono text-sm font-bold text-white">{ticket.code}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ticket.id, ticket.code)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      <span>{copiedId === ticket.id ? 'Copiado' : 'Copiar'}</span>
                    </button>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-medium text-slate-300">{ticket.type}</span>
                    {ticket.cambistaName && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="font-semibold text-amber-400">Cambista: {ticket.cambistaName}</span>
                      </>
                    )}
                    {ticket.createdByUsername && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="font-mono text-slate-300">Conta: {ticket.createdByUsername}</span>
                      </>
                    )}
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-400">{ticket.createdAt}</span>
                  </div>

                  <div className={`flex items-center gap-1.5 text-xs font-bold ${meta.colorClass}`}>
                    {ticket.status === 'won' && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                    {ticket.status === 'lost' && <XCircle className="h-4 w-4" aria-hidden="true" />}
                    {(ticket.status === 'open' || ticket.status === 'cashed_out') && (
                      <Clock className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>{meta.label}</span>
                  </div>
                </div>

                <div className="divide-y divide-[#1A222D] px-5">
                  {ticket.selections.map((sel) => (
                    <div
                      key={sel.optionId}
                      className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold text-white">{sel.matchLabel}</div>
                        <div className="text-xs text-slate-400">
                          {sel.league} · {sel.marketName}:{' '}
                          <span className="font-semibold text-emerald-400">{sel.optionLabel}</span>
                        </div>
                      </div>
                      <div className="font-mono text-sm font-bold tabular-nums text-white">
                        {sel.odd.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-4 border-t border-[#1E2633] bg-[#0E1319] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <div className="text-slate-400">Cotação</div>
                      <div className="font-mono text-sm font-bold tabular-nums text-amber-400">
                        {ticket.totalOdd.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Valor Apostado</div>
                      <div className="font-mono text-sm font-bold tabular-nums text-white">
                        {formatBRL(ticket.stake)}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">
                        {ticket.status === 'won' || ticket.status === 'cashed_out'
                          ? 'Valor Pago'
                          : 'Possível Retorno'}
                      </div>
                      <div
                        className={`font-mono text-sm font-bold tabular-nums ${
                          ticket.status === 'lost' ? 'text-slate-500 line-through' : 'text-emerald-400'
                        }`}
                      >
                        {formatBRL(
                          ticket.status === 'won' || ticket.status === 'cashed_out'
                            ? ticket.payout ?? ticket.potentialReturn
                            : ticket.potentialReturn
                        )}
                      </div>
                    </div>
                  </div>

                  {ticket.status === 'open' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onCashOut(ticket.id)}
                        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                      >
                        Cash Out · {formatBRL(cashOutValue)}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onSimulateSettle(ticket.id, Math.random() > 0.42 ? 'won' : 'lost')
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer"
                      >
                        <Play className="h-3 w-3" aria-hidden="true" />
                        <span>Simular Resultado</span>
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
