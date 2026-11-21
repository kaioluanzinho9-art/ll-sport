import { CheckCircle2, Clock, Copy, Play, Search, XCircle } from 'lucide-react';
import { useState } from 'react';
import { BetTicket, TicketStatus } from '../types/sportsbook';
import { formatBRL } from './Header';

interface TicketLookupViewProps {
  tickets: BetTicket[];
  initialSearchCode?: string;
  onCashOut: (ticketId: string) => void;
  onSimulateSettle: (ticketId: string, outcome: 'won' | 'lost') => void;
  onBackToSports: () => void;
}

const STATUS_META: Record<TicketStatus, { label: string; colorClass: string }> = {
  open: { label: 'Em Aberto', colorClass: 'text-amber-400' },
  won: { label: 'Bilhete Ganho', colorClass: 'text-emerald-400' },
  lost: { label: 'Não Premiado', colorClass: 'text-rose-400' },
  cashed_out: { label: 'Encerrado (Cash Out)', colorClass: 'text-sky-400' },
};

export function TicketLookupView({
  tickets,
  initialSearchCode = '',
  onCashOut,
  onSimulateSettle,
  onBackToSports,
}: TicketLookupViewProps) {
  const [codeQuery, setCodeQuery] = useState(initialSearchCode);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const normalizedQuery = codeQuery.trim().toUpperCase();

  const filteredTickets = tickets.filter((ticket) => {
    const matchesCode =
      !normalizedQuery ||
      ticket.code.toUpperCase().includes(normalizedQuery) ||
      ticket.selections.some((s) => s.matchLabel.toUpperCase().includes(normalizedQuery));
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesCode && matchesStatus;
  });

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const wonCount = tickets.filter((t) => t.status === 'won').length;
  const lostCount = tickets.filter((t) => t.status === 'lost').length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header & Code Search */}
      <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
              Consultar Bilhete
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Digite o código do bilhete (ex.: <span className="font-mono text-slate-200">LL-104820</span>) ou filtre suas apostas registradas, ganhas e perdidas.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToSports}
            className="self-start rounded-lg border border-[#252F3F] bg-[#171E28] px-4 py-2 text-xs font-semibold text-white hover:border-emerald-500/50 transition-colors cursor-pointer"
          >
            Voltar aos Jogos
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-y border-[#1E2633] py-3.5">
          <div>
            <div className="text-[11px] text-slate-400">Registrados</div>
            <div className="font-mono text-lg font-bold tabular-nums text-white">{tickets.length}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Em Aberto</div>
            <div className="font-mono text-lg font-bold tabular-nums text-amber-400">{openCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Ganhos</div>
            <div className="font-mono text-lg font-bold tabular-nums text-emerald-400">{wonCount}</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">Perdidos</div>
            <div className="font-mono text-lg font-bold tabular-nums text-rose-400">{lostCount}</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              placeholder="Buscar por código (LL-...) ou nome do time"
              aria-label="Consultar código do bilhete"
              className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] py-2.5 pl-10 pr-4 font-mono text-sm text-white placeholder:font-sans placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
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
                    ? 'bg-[#1D2735] text-emerald-400 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredTickets.length === 0 ? (
        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-10 text-center space-y-2">
          <p className="text-base font-semibold text-white">Nenhum bilhete localizado</p>
          <p className="text-sm text-slate-400">
            Verifique o código digitado ou faça uma nova aposta na grade de esportes.
          </p>
          {codeQuery && (
            <button
              type="button"
              onClick={() => {
                setCodeQuery('');
                setStatusFilter('all');
              }}
              className="mt-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 cursor-pointer"
            >
              Mostrar Todos os Bilhetes
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => {
            const meta = STATUS_META[ticket.status];
            const cashOutValue = Number((ticket.stake * 0.88 * Math.min(1.45, Math.max(0.85, ticket.totalOdd * 0.42))).toFixed(2));

            return (
              <article
                key={ticket.id}
                className="overflow-hidden rounded-xl border border-[#1E2633] bg-[#11161D]"
              >
                {/* Ticket Top Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2633] bg-[#141B24] px-5 py-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-mono text-sm font-bold text-white">{ticket.code}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ticket.id, ticket.code)}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
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

                {/* Ticket Legs */}
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

                {/* Ticket Footer Financials & Interactive Controls */}
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
                        className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                      >
                        Cash Out · {formatBRL(cashOutValue)}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onSimulateSettle(ticket.id, Math.random() > 0.42 ? 'won' : 'lost')
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
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
