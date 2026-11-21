import { CheckCircle2, Copy, Receipt, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { BetSelection, BetTicket, Cambista } from '../types/sportsbook';
import { formatBRL } from './Header';

interface BetSlipProps {
  selections: BetSelection[];
  balance: number;
  cambistas: Cambista[];
  activeCambistaId: string | null;
  onSelectActiveCambista: (id: string | null) => void;
  onRemoveSelection: (optionId: string) => void;
  onClearAll: () => void;
  onPlaceBet: (stake: number, betType: 'Simples' | 'Múltipla') => BetTicket | null;
  onGoToTicketLookup: (code: string) => void;
  onOpenDeposit: () => void;
}

const PRESET_STAKES = [10, 25, 50, 100, 250];

export function BetSlip({
  selections,
  balance,
  cambistas,
  activeCambistaId,
  onSelectActiveCambista,
  onRemoveSelection,
  onClearAll,
  onPlaceBet,
  onGoToTicketLookup,
  onOpenDeposit,
}: BetSlipProps) {
  const [stakeInput, setStakeInput] = useState<string>('25');
  const [preferredMode, setPreferredMode] = useState<'Simples' | 'Múltipla'>('Múltipla');
  const [lastConfirmedTicket, setLastConfirmedTicket] = useState<BetTicket | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeCambista = cambistas.find((c) => c.id === activeCambistaId && c.active) ?? null;
  const effectiveBalance = activeCambista ? activeCambista.balance : balance;
  const betType: 'Simples' | 'Múltipla' = selections.length > 1 ? preferredMode : 'Simples';
  const stake = Math.max(0, Number(stakeInput.replace(',', '.')) || 0);

  const totalOdd =
    selections.length === 0
      ? 0
      : betType === 'Múltipla'
      ? Number(selections.reduce((acc, s) => acc * s.odd, 1).toFixed(2))
      : Number(selections[0].odd.toFixed(2));

  // For Simples with multiple items, each item gets `stake`
  const totalRisk = betType === 'Simples' ? stake * selections.length : stake;
  const potentialReturn =
    betType === 'Múltipla'
      ? stake * totalOdd
      : selections.reduce((sum, s) => sum + stake * s.odd, 0);

  const handleConfirm = () => {
    setErrorMsg(null);
    if (selections.length === 0) return;
    if (stake < 2) {
      setErrorMsg('Aposta mínima de R$ 2,00.');
      return;
    }
    if (totalRisk > effectiveBalance) {
      setErrorMsg(
        activeCambista
          ? `Saldo insuficiente para ${activeCambista.name}. Adicione valor em Caixa & Cambistas.`
          : 'Saldo insuficiente na banca. Faça uma entrada via Pix.'
      );
      return;
    }
    const created = onPlaceBet(stake, betType);
    if (created) {
      setLastConfirmedTicket(created);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  return (
    <aside className="w-full lg:w-[340px] xl:w-[360px] shrink-0">
      <div className="sticky top-[76px] overflow-hidden rounded-xl border border-[#1E2633] bg-[#11161D]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E2633] bg-[#141B24] px-4 py-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h2 className="text-sm font-bold text-white">Bilhete de Apostas</h2>
            {selections.length > 0 && (
              <span className="font-mono text-xs font-bold tabular-nums text-emerald-400">
                ({selections.length})
              </span>
            )}
          </div>
          {selections.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onClearAll();
                setErrorMsg(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Cambista / Operator Selector */}
        {cambistas.some((c) => c.active) && (
          <div className="border-b border-[#1E2633] bg-[#0E1319] px-4 py-2.5 space-y-1">
            <label htmlFor="slip-cambista" className="block text-[11px] font-medium text-slate-400">
              Registrar jogos por
            </label>
            <select
              id="slip-cambista"
              value={activeCambista ? activeCambista.id : ''}
              onChange={(e) => {
                onSelectActiveCambista(e.target.value || null);
                setErrorMsg(null);
              }}
              className="w-full rounded-lg border border-[#242E3D] bg-[#141B24] px-2.5 py-1.5 text-xs font-semibold text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Banca Principal ({formatBRL(balance)})</option>
              {cambistas
                .filter((c) => c.active)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Cambista: {c.name} ({formatBRL(c.balance)})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Confirmed Ticket Receipt */}
        {lastConfirmedTicket && selections.length === 0 && (
          <div className="p-4 space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-bold">Bilhete Registrado</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLastConfirmedTicket(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                  aria-label="Fechar comprovante"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center justify-between border-y border-emerald-500/20 py-2.5">
                <div>
                  <div className="text-[11px] text-slate-400">Código do Bilhete</div>
                  <div className="font-mono text-lg font-bold tracking-wider text-white">
                    {lastConfirmedTicket.code}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode(lastConfirmedTicket.code)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-[#0B0F14] px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-[#141B24] cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="space-y-1 text-xs">
                {lastConfirmedTicket.cambistaName && (
                  <div className="flex justify-between text-slate-300">
                    <span>Cambista</span>
                    <span className="font-semibold text-amber-400">{lastConfirmedTicket.cambistaName}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300">
                  <span>Tipo</span>
                  <span className="font-semibold text-white">{lastConfirmedTicket.type}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Valor Apostado</span>
                  <span className="font-mono font-semibold tabular-nums text-white">
                    {formatBRL(lastConfirmedTicket.stake)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Possível Retorno</span>
                  <span className="font-mono font-bold tabular-nums text-emerald-400">
                    {formatBRL(lastConfirmedTicket.potentialReturn)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onGoToTicketLookup(lastConfirmedTicket.code)}
                className="w-full rounded-lg bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Abrir Bilhete & Simular Resultado
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {selections.length === 0 && !lastConfirmedTicket && (
          <div className="px-5 py-10 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-200">Seu bilhete está vazio</p>
            <p className="text-xs leading-relaxed text-slate-400">
              Clique em qualquer cotação na grade de jogos para montar uma aposta simples ou múltipla.
            </p>
          </div>
        )}

        {/* Active Selections */}
        {selections.length > 0 && (
          <div className="p-4 space-y-4">
            {/* Mode Switcher when 2+ selections */}
            {selections.length > 1 && (
              <div className="grid grid-cols-2 rounded-lg border border-[#1E2633] bg-[#0B0F14] p-1">
                {(['Múltipla', 'Simples'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreferredMode(mode)}
                    className={`rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      betType === mode
                        ? 'bg-[#1B2432] text-emerald-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}

            {/* Selection Items */}
            <div className="max-h-[290px] space-y-2.5 overflow-y-auto pr-1">
              {selections.map((sel) => (
                <div
                  key={sel.optionId}
                  className="rounded-lg border border-[#1F2836] bg-[#0B0F14] p-3 space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-white">
                        {sel.matchLabel}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {sel.league} · {sel.kickoffLabel}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveSelection(sel.optionId)}
                      aria-label={`Remover ${sel.optionLabel}`}
                      className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#171E28]">
                    <div className="text-xs">
                      <span className="text-slate-400">{sel.marketName}: </span>
                      <span className="font-semibold text-emerald-400">{sel.optionLabel}</span>
                    </div>
                    <span className="font-mono text-sm font-bold tabular-nums text-white">
                      {sel.odd.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Stake Controls */}
            <div className="space-y-2.5 border-t border-[#1E2633] pt-3">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="bet-stake-input" className="font-medium text-slate-300">
                  {betType === 'Simples' && selections.length > 1
                    ? 'Valor por seleção (R$)'
                    : 'Valor da Aposta (R$)'}
                </label>
                <span className="font-mono text-[11px] tabular-nums text-slate-400">
                  Saldo: {formatBRL(effectiveBalance)}
                </span>
              </div>

              <input
                id="bet-stake-input"
                type="number"
                min={2}
                step={5}
                value={stakeInput}
                onChange={(e) => {
                  setStakeInput(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full rounded-lg border border-[#263142] bg-[#0B0F14] px-3 py-2.5 font-mono text-base font-bold tabular-nums text-white focus:border-emerald-500 focus:outline-none"
              />

              <div className="grid grid-cols-5 gap-1.5">
                {PRESET_STAKES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setStakeInput(String(preset));
                      setErrorMsg(null);
                    }}
                    className="rounded-md border border-[#242E3D] bg-[#161D27] py-1.5 font-mono text-xs font-semibold tabular-nums text-slate-200 hover:border-emerald-500/50 hover:text-white transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="space-y-1.5 border-t border-[#1E2633] pt-3 text-xs">
              {betType === 'Múltipla' && (
                <div className="flex items-center justify-between text-slate-300">
                  <span>Cotação Total</span>
                  <span className="font-mono text-sm font-bold tabular-nums text-amber-400">
                    {totalOdd.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-300">
                <span>Total Apostado</span>
                <span className="font-mono font-semibold tabular-nums text-white">
                  {formatBRL(totalRisk)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-white">Possível Retorno</span>
                <span className="font-mono text-lg font-bold tabular-nums text-emerald-400">
                  {formatBRL(potentialReturn)}
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300 flex items-center justify-between gap-2">
                <span>{errorMsg}</span>
                {totalRisk > balance && (
                  <button
                    type="button"
                    onClick={onOpenDeposit}
                    className="font-semibold text-emerald-400 underline whitespace-nowrap cursor-pointer"
                  >
                    Depositar
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              Confirmar Aposta
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
