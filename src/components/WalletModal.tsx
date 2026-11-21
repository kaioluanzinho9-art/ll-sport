import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Copy, X } from 'lucide-react';
import { useState } from 'react';
import { formatBRL } from './Header';

interface WalletModalProps {
  isOpen: boolean;
  balance: number;
  onClose: () => void;
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number, pixKey: string) => string | null;
  onOpenFullCashControl: () => void;
}

const DEPOSIT_PRESETS = [20, 50, 100, 250, 500];

export function WalletModal({
  isOpen,
  balance,
  onClose,
  onDeposit,
  onWithdraw,
  onOpenFullCashControl,
}: WalletModalProps) {
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amountInput, setAmountInput] = useState('100');
  const [pixKey, setPixKey] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  if (!isOpen) return null;

  const samplePixCode = '00020126580014BR.GOV.BCB.PIX0136llsports-banca-pix-20265204000053039865802BR5910LL SPORTS6009SAO PAULO62070503***6304A1B2';

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amountInput.replace(',', '.'));
    if (!val || val < 5) {
      setFeedback({ type: 'err', text: 'Depósito mínimo de R$ 5,00.' });
      return;
    }
    onDeposit(val);
    setFeedback({ type: 'ok', text: `Entrada via Pix de ${formatBRL(val)} confirmada na banca.` });
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amountInput.replace(',', '.'));
    if (!val || val < 10) {
      setFeedback({ type: 'err', text: 'Saque mínimo de R$ 10,00.' });
      return;
    }
    if (!pixKey.trim()) {
      setFeedback({ type: 'err', text: 'Informe a chave Pix de destino.' });
      return;
    }
    const err = onWithdraw(val, pixKey.trim());
    if (err) {
      setFeedback({ type: 'err', text: err });
      return;
    }
    setFeedback({ type: 'ok', text: `Saída via Pix de ${formatBRL(val)} registrada com sucesso.` });
    setPixKey('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Carteira e Pix L.L Sports"
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#242E3D] bg-[#11161D]">
        <div className="flex items-center justify-between border-b border-[#1E2633] bg-[#141B24] px-5 py-4">
          <div>
            <div className="text-xs text-slate-400">Saldo Disponível</div>
            <div className="font-mono text-xl font-bold tabular-nums text-emerald-400">
              {formatBRL(balance)}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar carteira"
            className="rounded-lg border border-[#252F3F] bg-[#0B0F14] p-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tabs */}
          <div className="grid grid-cols-2 rounded-lg border border-[#1E2633] bg-[#0B0F14] p-1">
            <button
              type="button"
              onClick={() => {
                setTab('deposit');
                setFeedback(null);
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'deposit' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Depositar (Entrada)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('withdraw');
                setFeedback(null);
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'withdraw' ? 'bg-[#1D2735] text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sacar (Saída)</span>
            </button>
          </div>

          {tab === 'deposit' ? (
            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="pix-dep-val" className="block text-xs font-medium text-slate-300">
                  Valor do Depósito Pix (R$)
                </label>
                <input
                  id="pix-dep-val"
                  type="number"
                  min={5}
                  step={5}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2.5 font-mono text-base font-bold tabular-nums text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {DEPOSIT_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountInput(String(val))}
                    className="rounded-md border border-[#242E3D] bg-[#161D27] py-1.5 font-mono text-xs font-semibold tabular-nums text-slate-200 hover:border-emerald-500/50 cursor-pointer"
                  >
                    {val}
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-[#1E2633] bg-[#0B0F14] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Pix Copia e Cola</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(samplePixCode);
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 1600);
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    <span>{copiedPix ? 'Copiado' : 'Copiar Chave'}</span>
                  </button>
                </div>
                <p className="truncate font-mono text-[11px] text-slate-500">{samplePixCode}</p>
              </div>

              {feedback && (
                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                    feedback.type === 'ok'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {feedback.type === 'ok' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  <span>{feedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                Confirmar Entrada Pix
              </button>
            </form>
          ) : (
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="pix-saque-val" className="block text-xs font-medium text-slate-300">
                  Valor do Saque (R$)
                </label>
                <input
                  id="pix-saque-val"
                  type="number"
                  min={10}
                  step={5}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2.5 font-mono text-base font-bold tabular-nums text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pix-key-input" className="block text-xs font-medium text-slate-300">
                  Chave Pix de Destino (CPF, E-mail, Celular ou Aleatória)
                </label>
                <input
                  id="pix-key-input"
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Digite sua chave Pix..."
                  className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {feedback && (
                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                    feedback.type === 'ok'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {feedback.type === 'ok' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  <span>{feedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-[#1E293B] border border-[#334155] py-2.5 text-sm font-bold text-white hover:bg-[#273549] transition-colors cursor-pointer"
              >
                Solicitar Saída Pix
              </button>
            </form>
          )}

          <div className="border-t border-[#1E2633] pt-3 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullCashControl();
              }}
              className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer"
            >
              Abrir Controle de Caixa Completo (Entradas e Saídas)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
