import { ArrowDownLeft, ArrowUpRight, Download, PlusCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { BetTicket, Cambista, SecondaryAccount, WalletTransaction } from '../types/sportsbook';
import { CambistasPanel } from './CambistasPanel';
import { formatBRL } from './Header';

interface CashControlViewProps {
  balance: number;
  transactions: WalletTransaction[];
  cambistas: Cambista[];
  activeCambistaId: string | null;
  tickets: BetTicket[];
  isAdmin: boolean;
  secondaryAccounts: SecondaryAccount[];
  onRegisterEntry: (payload: {
    direction: 'entrada' | 'saida';
    amount: number;
    method: 'Pix' | 'Dinheiro' | 'Banca';
    category: string;
    description: string;
  }) => string | null;
  onCreateCambista: (payload: {
    id?: string;
    name: string;
    location: string;
    initialBalance: number;
    commissionPercent: number;
  }) => string | null;
  onCreateSecondaryAccount: (payload: {
    username: string;
    password: string;
    cambistaId?: string;
    cambistaName?: string;
  }) => Promise<string | null>;
  onToggleSecondaryAccountStatus: (username: string) => Promise<string | null>;
  onDeleteSecondaryAccount: (username: string) => Promise<string | null>;
  onSelectActiveCambista: (cambistaId: string | null) => void;
  onToggleCambistaStatus: (cambistaId: string) => void;
  onDeleteCambista: (cambistaId: string) => void;
  onRegisterCambistaEntry: (payload: {
    cambistaId: string;
    direction: 'entrada' | 'saida';
    amount: number;
    method: 'Pix' | 'Dinheiro' | 'Banca';
    category: string;
    description: string;
  }) => string | null;
  onCashOut: (ticketId: string) => void;
  onSimulateSettle: (ticketId: string, outcome: 'won' | 'lost') => void;
  onGoToSports: () => void;
}

export function CashControlView({
  balance,
  transactions,
  cambistas,
  activeCambistaId,
  tickets,
  isAdmin,
  secondaryAccounts,
  onRegisterEntry,
  onCreateCambista,
  onCreateSecondaryAccount,
  onToggleSecondaryAccountStatus,
  onDeleteSecondaryAccount,
  onSelectActiveCambista,
  onToggleCambistaStatus,
  onDeleteCambista,
  onRegisterCambistaEntry,
  onCashOut,
  onSimulateSettle,
  onGoToSports,
}: CashControlViewProps) {
  const [subTab, setSubTab] = useState<'geral' | 'cambistas'>('cambistas');
  const [direction, setDirection] = useState<'entrada' | 'saida'>('entrada');
  const [amountInput, setAmountInput] = useState<string>('100');
  const [method, setMethod] = useState<'Pix' | 'Dinheiro' | 'Banca'>('Pix');
  const [category, setCategory] = useState<string>('Suprimento de Caixa');
  const [description, setDescription] = useState<string>('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'entrada' | 'saida'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const totalEntradas = transactions
    .filter((t) => t.direction === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = transactions
    .filter((t) => t.direction === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const netFlow = totalEntradas - totalSaidas;

  const filteredTx = transactions.filter((tx) => {
    const matchesDir = filterDirection === 'all' || tx.direction === filterDirection;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      tx.description.toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q) ||
      tx.method.toLowerCase().includes(q);
    return matchesDir && matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const val = Number(amountInput.replace(',', '.'));
    if (!val || val <= 0) {
      setFeedback({ type: 'err', text: 'Informe um valor maior que zero.' });
      return;
    }

    const err = onRegisterEntry({
      direction,
      amount: val,
      method,
      category,
      description:
        description.trim() ||
        (direction === 'entrada' ? 'Entrada manual no caixa' : 'Saída / Sangria de caixa'),
    });

    if (err) {
      setFeedback({ type: 'err', text: err });
      return;
    }

    setDescription('');
    setFeedback({
      type: 'ok',
      text: `${direction === 'entrada' ? 'Entrada' : 'Saída'} de ${formatBRL(val)} registrada no caixa.`,
    });
  };

  const handleExportCsv = () => {
    const header = 'Data/Hora;Tipo;Categoria;Método;Descrição;Valor\n';
    const rows = filteredTx
      .map(
        (t) =>
          `"${t.createdAt}";"${t.direction.toUpperCase()}";"${t.category}";"${t.method}";"${t.description.replace(/"/g, '""')}";"${t.direction === 'entrada' ? '+' : '-'}${t.amount.toFixed(2)}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ll-sports-caixa-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const categoryPresets =
    direction === 'entrada'
      ? ['Suprimento de Caixa', 'Depósito Pix', 'Acerto de Cambista', 'Recebimento Avulso']
      : ['Sangria de Caixa', 'Pagamento de Prêmio', 'Saque Pix', 'Despesa Operacional'];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Sub-navigation Switcher: Cambistas vs Caixa Geral */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1E2633] pb-4">
        <div className="inline-flex items-center rounded-lg border border-[#1E2633] bg-[#11161D] p-1">
          <button
            type="button"
            onClick={() => setSubTab('cambistas')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'cambistas'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cambistas ({cambistas.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('geral')}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'geral'
                ? 'bg-[#1D2735] text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Caixa Geral da Banca
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Saldo da Banca Principal:{' '}
          <span className="font-mono font-bold tabular-nums text-emerald-400">{formatBRL(balance)}</span>
        </div>
      </div>

      {subTab === 'cambistas' ? (
        <CambistasPanel
          cambistas={cambistas}
          activeCambistaId={activeCambistaId}
          transactions={transactions}
          tickets={tickets}
          isAdmin={isAdmin}
          secondaryAccounts={secondaryAccounts}
          onCreateCambista={onCreateCambista}
          onCreateSecondaryAccount={onCreateSecondaryAccount}
          onToggleSecondaryAccountStatus={onToggleSecondaryAccountStatus}
          onDeleteSecondaryAccount={onDeleteSecondaryAccount}
          onSelectActiveCambista={onSelectActiveCambista}
          onToggleCambistaStatus={onToggleCambistaStatus}
          onDeleteCambista={onDeleteCambista}
          onRegisterCambistaEntry={onRegisterCambistaEntry}
          onCashOut={onCashOut}
          onSimulateSettle={onSimulateSettle}
          onGoToSports={onGoToSports}
        />
      ) : (
        <>
          {/* Title & Export */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-extrabold text-white">
                Controle de Caixa Geral
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Acompanhe todas as entradas, saídas, apostas recebidas, prêmios pagos e sangrias da banca.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-[#252F3F] bg-[#141B24] px-4 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500/50 hover:text-white transition-colors cursor-pointer"
            >
              <Download className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Exportar Relatório CSV</span>
            </button>
          </div>

      {/* 4 Financial KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-4 space-y-1">
          <div className="text-xs font-medium text-slate-400">Saldo Atual em Caixa</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-white">
            {formatBRL(balance)}
          </div>
          <div className="text-[11px] text-slate-500">Disponível para banca e pagamentos</div>
        </div>

        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Total de Entradas</span>
            <ArrowDownLeft className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums text-emerald-400">
            +{formatBRL(totalEntradas)}
          </div>
          <div className="text-[11px] text-slate-500">
            {transactions.filter((t) => t.direction === 'entrada').length} lançamentos positivos
          </div>
        </div>

        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Total de Saídas</span>
            <ArrowUpRight className="h-4 w-4 text-rose-400" aria-hidden="true" />
          </div>
          <div className="font-mono text-2xl font-bold tabular-nums text-rose-400">
            -{formatBRL(totalSaidas)}
          </div>
          <div className="text-[11px] text-slate-500">
            {transactions.filter((t) => t.direction === 'saida').length} lançamentos de saída
          </div>
        </div>

        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-4 space-y-1">
          <div className="text-xs font-medium text-slate-400">Resultado Líquido (Fluxo)</div>
          <div
            className={`font-mono text-2xl font-bold tabular-nums ${
              netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netFlow >= 0 ? '+' : ''}
            {formatBRL(netFlow)}
          </div>
          <div className="text-[11px] text-slate-500">Entradas menos saídas registradas</div>
        </div>
      </div>

      {/* Main Split: New Manual Entry Form + Ledger Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Manual Entry / Exit Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-4 rounded-xl border border-[#1E2633] bg-[#11161D] p-5 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-[#1E2633] pb-3">
            <PlusCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h2 className="text-sm font-bold text-white">Novo Lançamento no Caixa</h2>
          </div>

          {/* Direction Segmented Control */}
          <div className="grid grid-cols-2 rounded-lg border border-[#1E2633] bg-[#0B0F14] p-1">
            <button
              type="button"
              onClick={() => {
                setDirection('entrada');
                setCategory('Suprimento de Caixa');
                setFeedback(null);
              }}
              className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                direction === 'entrada'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrada (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setDirection('saida');
                setCategory('Sangria de Caixa');
                setFeedback(null);
              }}
              className={`rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                direction === 'saida'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Saída (-)
            </button>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="caixa-valor" className="block text-xs font-medium text-slate-300">
              Valor (R$)
            </label>
            <input
              id="caixa-valor"
              type="number"
              min={1}
              step="0.01"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2.5 font-mono text-base font-bold tabular-nums text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="caixa-metodo" className="block text-xs font-medium text-slate-300">
                Meio
              </label>
              <select
                id="caixa-metodo"
                value={method}
                onChange={(e) => setMethod(e.target.value as 'Pix' | 'Dinheiro' | 'Banca')}
                className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="Pix">Pix</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Banca">Banca</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="caixa-categoria" className="block text-xs font-medium text-slate-300">
                Categoria
              </label>
              <select
                id="caixa-categoria"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
              >
                {categoryPresets.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="caixa-desc" className="block text-xs font-medium text-slate-300">
              Descrição / Observação
            </label>
            <input
              id="caixa-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                direction === 'entrada'
                  ? 'Ex.: Repasse ponto centro'
                  : 'Ex.: Pagamento prêmio bilhete'
              }
              className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {feedback && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                feedback.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <button
            type="submit"
            className={`w-full rounded-lg py-2.5 text-sm font-bold transition-colors cursor-pointer ${
              direction === 'entrada'
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-rose-500 text-white hover:bg-rose-400'
            }`}
          >
            {direction === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}
          </button>
        </form>

        {/* Transactions Ledger Table */}
        <section className="lg:col-span-8 overflow-hidden rounded-xl border border-[#1E2633] bg-[#11161D]">
          <div className="flex flex-col gap-3 border-b border-[#1E2633] bg-[#141B24] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar movimentações..."
                aria-label="Filtrar movimentações do caixa"
                className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center rounded-lg border border-[#1E2633] bg-[#0B0F14] p-1">
              {(
                [
                  { id: 'all', label: 'Todas' },
                  { id: 'entrada', label: 'Entradas' },
                  { id: 'saida', label: 'Saídas' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterDirection(tab.id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    filterDirection === tab.id
                      ? 'bg-[#1D2735] text-emerald-400 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#1E2633] bg-[#0E1319] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Descrição & Categoria</th>
                  <th className="px-4 py-3 font-semibold">Meio</th>
                  <th className="px-4 py-3 font-semibold">Data / Hora</th>
                  <th className="px-4 py-3 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A222D]">
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Nenhuma movimentação encontrada para este filtro.
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((tx) => {
                    const isEntry = tx.direction === 'entrada';
                    return (
                      <tr key={tx.id} className="hover:bg-[#141B24]/60 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              isEntry ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isEntry ? (
                              <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {isEntry ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{tx.description}</div>
                          <div className="text-[11px] text-slate-400">
                            {tx.category}
                            {tx.cambistaName ? ` · Cambista: ${tx.cambistaName}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{tx.method}</td>
                        <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-slate-400 whitespace-nowrap">
                          {tx.createdAt}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono text-sm font-bold tabular-nums whitespace-nowrap ${
                            isEntry ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isEntry ? '+' : '-'}
                          {formatBRL(tx.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
        </>
      )}
    </div>
  );
}
