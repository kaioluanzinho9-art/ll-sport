import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Play,
  PlusCircle,
  ShieldCheck,
  Trash2,
  Unlock,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { BetTicket, Cambista, SecondaryAccount, TicketStatus, WalletTransaction } from '../types/sportsbook';
import { formatBRL } from './Header';

interface CambistasPanelProps {
  cambistas: Cambista[];
  activeCambistaId: string | null;
  transactions: WalletTransaction[];
  tickets: BetTicket[];
  isAdmin: boolean;
  secondaryAccounts: SecondaryAccount[];
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

export function CambistasPanel({
  cambistas,
  activeCambistaId,
  transactions,
  tickets,
  isAdmin,
  secondaryAccounts,
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
}: CambistasPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(cambistas[0]?.id ?? null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [rightView, setRightView] = useState<'movimentacoes' | 'jogos'>('movimentacoes');
  const [ticketScope, setTicketScope] = useState<'cambista' | 'all' | string>('cambista');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<TicketStatus | 'all'>('all');

  // Create Cambista Form State
  const [showCreateForm, setShowCreateForm] = useState(cambistas.length === 0);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newInitialBalance, setNewInitialBalance] = useState('500');
  const [newCommission, setNewCommission] = useState('10');
  const [createLoginWithCambista, setCreateLoginWithCambista] = useState(false);
  const [inlineLoginUser, setInlineLoginUser] = useState('');
  const [inlineLoginPassword, setInlineLoginPassword] = useState('');
  const [showInlinePassword, setShowInlinePassword] = useState(false);
  const [isCreatingCambista, setIsCreatingCambista] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Secondary Account Dedicated Form State
  const [showSecondaryForm, setShowSecondaryForm] = useState(false);
  const [secUsername, setSecUsername] = useState('');
  const [secPassword, setSecPassword] = useState('');
  const [showSecPassword, setShowSecPassword] = useState(false);
  const [secLinkedCambistaId, setSecLinkedCambistaId] = useState<string>(cambistas[0]?.id ?? '');
  const [isSavingSecondary, setIsSavingSecondary] = useState(false);
  const [secFeedback, setSecFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState<string | null>(null);

  // Entry/Exit Form State for selected Cambista
  const [entryDirection, setEntryDirection] = useState<'entrada' | 'saida'>('entrada');
  const [entryAmount, setEntryAmount] = useState('200');
  const [entryMethod, setEntryMethod] = useState<'Pix' | 'Dinheiro' | 'Banca'>('Dinheiro');
  const [entryCategory, setEntryCategory] = useState('Carga de Saldo (Jogos)');
  const [entryDescription, setEntryDescription] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'entrada' | 'saida'>('all');
  const [entryFeedback, setEntryFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const selectedCambista = cambistas.find((c) => c.id === selectedId) ?? cambistas[0] ?? null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFeedback(null);
    const initialVal = Math.max(0, Number(newInitialBalance.replace(',', '.')) || 0);
    const commVal = Math.max(0, Math.min(50, Number(newCommission.replace(',', '.')) || 0));

    const cleanName = newName.trim();
    if (cleanName.length < 2) {
      setCreateFeedback({ type: 'err', text: 'Informe o nome do cambista.' });
      return;
    }
    if (cambistas.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      setCreateFeedback({ type: 'err', text: 'Já existe um cambista com esse nome.' });
      return;
    }

    const generatedId = `camb-${Date.now()}`;

    if (isAdmin && createLoginWithCambista) {
      if (inlineLoginUser.trim().length < 3) {
        setCreateFeedback({ type: 'err', text: 'Informe um usuário de login com pelo menos 3 caracteres.' });
        return;
      }
      if (inlineLoginPassword.length < 6) {
        setCreateFeedback({ type: 'err', text: 'A senha da conta secundária deve ter pelo menos 6 caracteres.' });
        return;
      }

      setIsCreatingCambista(true);
      const secErr = await onCreateSecondaryAccount({
        username: inlineLoginUser.trim(),
        password: inlineLoginPassword,
        cambistaId: generatedId,
        cambistaName: cleanName,
      });
      setIsCreatingCambista(false);

      if (secErr) {
        setCreateFeedback({ type: 'err', text: secErr });
        return;
      }
    }

    const err = onCreateCambista({
      id: generatedId,
      name: cleanName,
      location: newLocation.trim() || 'Ponto Externo',
      initialBalance: initialVal,
      commissionPercent: commVal,
    });

    if (err) {
      setCreateFeedback({ type: 'err', text: err });
      return;
    }

    setNewName('');
    setNewLocation('');
    setNewInitialBalance('500');
    setInlineLoginUser('');
    setInlineLoginPassword('');
    setCreateLoginWithCambista(false);
    setShowCreateForm(false);
    setSelectedId(generatedId);
    setCreateFeedback({
      type: 'ok',
      text: createLoginWithCambista
        ? 'Cambista e conta secundária sincronizados no servidor com sucesso.'
        : 'Cambista cadastrado com sucesso.',
    });
  };

  const handleSecondarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecFeedback(null);

    if (secUsername.trim().length < 3) {
      setSecFeedback({ type: 'err', text: 'O usuário deve ter pelo menos 3 caracteres.' });
      return;
    }
    if (secPassword.length < 6) {
      setSecFeedback({ type: 'err', text: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    const linked = cambistas.find((c) => c.id === secLinkedCambistaId);

    setIsSavingSecondary(true);
    const err = await onCreateSecondaryAccount({
      username: secUsername.trim(),
      password: secPassword,
      cambistaId: linked?.id,
      cambistaName: linked?.name,
    });
    setIsSavingSecondary(false);

    if (err) {
      setSecFeedback({ type: 'err', text: err });
      return;
    }

    const createdUsername = secUsername.trim();
    setSecUsername('');
    setSecPassword('');
    setShowSecondaryForm(false);
    setSecFeedback({
      type: 'ok',
      text: `Conta secundária "${createdUsername}" salva e sincronizada no servidor para login.`,
    });
  };

  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCambista) return;
    setEntryFeedback(null);

    const val = Number(entryAmount.replace(',', '.'));
    if (!val || val <= 0) {
      setEntryFeedback({ type: 'err', text: 'Informe um valor maior que zero.' });
      return;
    }

    const err = onRegisterCambistaEntry({
      cambistaId: selectedCambista.id,
      direction: entryDirection,
      amount: val,
      method: entryMethod,
      category: entryCategory,
      description:
        entryDescription.trim() ||
        (entryDirection === 'entrada'
          ? `Crédito de saldo para ${selectedCambista.name}`
          : `Recolhimento / saída de ${selectedCambista.name}`),
    });

    if (err) {
      setEntryFeedback({ type: 'err', text: err });
      return;
    }

    setEntryDescription('');
    setEntryFeedback({
      type: 'ok',
      text: `${entryDirection === 'entrada' ? 'Entrada' : 'Saída'} de ${formatBRL(val)} registrada para ${selectedCambista.name}.`,
    });
  };

  const cambistaTxs = selectedCambista
    ? transactions.filter((t) => t.cambistaId === selectedCambista.id)
    : [];

  const filteredCambistaTxs = cambistaTxs.filter(
    (t) => txFilter === 'all' || t.direction === txFilter
  );

  const totalEntradas = cambistaTxs
    .filter((t) => t.direction === 'entrada')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = cambistaTxs
    .filter((t) => t.direction === 'saida')
    .reduce((sum, t) => sum + t.amount, 0);

  const cambistaTickets = selectedCambista
    ? tickets.filter((t) => t.cambistaId === selectedCambista.id)
    : [];

  const linkedAccountsForSelected = selectedCambista
    ? secondaryAccounts.filter((a) => a.cambistaId === selectedCambista.id)
    : [];

  const handleExportCambistaCsv = () => {
    if (!selectedCambista) return;
    const header = 'Data/Hora;Cambista;Tipo;Categoria;Meio;Descrição;Valor\n';
    const rows = filteredCambistaTxs
      .map(
        (t) =>
          `"${t.createdAt}";"${selectedCambista.name}";"${t.direction.toUpperCase()}";"${t.category}";"${t.method}";"${t.description.replace(/"/g, '""')}";"${t.direction === 'entrada' ? '+' : '-'}${t.amount.toFixed(2)}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cambista-${selectedCambista.name.toLowerCase().replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const categoryPresets =
    entryDirection === 'entrada'
      ? ['Carga de Saldo (Jogos)', 'Suprimento em Dinheiro', 'Acerto de Caixa', 'Prêmio Creditado']
      : ['Sangria / Recolhimento', 'Pagamento ao Apostador', 'Ajuste de Limite', 'Despesa do Ponto'];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-white">
            Gestão de Cambistas
          </h2>
          <p className="text-sm text-slate-400">
            Crie cambistas, defina saldo para registrar jogos, controle entradas/saídas e crie contas secundárias de login no servidor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setSecLinkedCambistaId(selectedCambista?.id ?? '');
                setShowSecondaryForm((prev) => !prev);
                setSecFeedback(null);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-[#11161D] px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              <span>{showSecondaryForm ? 'Fechar Conta Secundária' : 'Criar Conta Secundária'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setCreateFeedback(null);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span>{showCreateForm ? 'Fechar Cadastro' : 'Criar Cambista'}</span>
          </button>
        </div>
      </div>

      {/* Dedicated Secondary Account (Login) Form */}
      {isAdmin && showSecondaryForm && (
        <form
          onSubmit={handleSecondarySubmit}
          className="rounded-xl border border-emerald-500/35 bg-[#11161D] p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#1E2633] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-white">
                Criar Conta Secundária (Login Sincronizado no Servidor)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Permite login na tela inicial</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="sec-cambista" className="block text-xs font-medium text-slate-300">
                Vincular ao Cambista
              </label>
              <select
                id="sec-cambista"
                value={secLinkedCambistaId}
                onChange={(e) => setSecLinkedCambistaId(e.target.value)}
                className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Operador Geral (sem vínculo)</option>
                {cambistas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.location})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sec-username" className="block text-xs font-medium text-slate-300">
                Usuário de Login
              </label>
              <input
                id="sec-username"
                type="text"
                required
                value={secUsername}
                onChange={(e) => setSecUsername(e.target.value)}
                placeholder="Ex.: carlos.centro"
                className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sec-password" className="block text-xs font-medium text-slate-300">
                Senha (mín. 6 caracteres)
              </label>
              <div className="relative">
                <input
                  id="sec-password"
                  type={showSecPassword ? 'text' : 'password'}
                  required
                  value={secPassword}
                  onChange={(e) => setSecPassword(e.target.value)}
                  placeholder="Digite a senha"
                  className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] py-2 pl-3 pr-9 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecPassword((prev) => !prev)}
                  aria-label={showSecPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showSecPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {secFeedback && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                secFeedback.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {secFeedback.text}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowSecondaryForm(false)}
              className="rounded-lg border border-[#242E3D] bg-[#0B0F14] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingSecondary}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 cursor-pointer"
            >
              {isSavingSecondary ? 'Sincronizando...' : 'Salvar Conta no Servidor'}
            </button>
          </div>
        </form>
      )}

      {/* Feedback Banner when Secondary form is closed */}
      {isAdmin && !showSecondaryForm && secFeedback && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-xs font-medium ${
            secFeedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {secFeedback.text}
        </div>
      )}

      {/* Create Cambista Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded-xl border border-emerald-500/30 bg-[#11161D] p-5 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-[#1E2633] pb-3">
            <UserPlus className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-white">Novo Cambista</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label htmlFor="camb-nome" className="block text-xs font-medium text-slate-300">
                Nome do Cambista
              </label>
              <input
                id="camb-nome"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Marcos Souza"
                className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="camb-ponto" className="block text-xs font-medium text-slate-300">
                Ponto / Região
              </label>
              <input
                id="camb-ponto"
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Ex.: Praça Central"
                className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="camb-saldo" className="block text-xs font-medium text-slate-300">
                Valor p/ Registrar Jogos (R$)
              </label>
              <input
                id="camb-saldo"
                type="number"
                min={0}
                step="0.01"
                required
                value={newInitialBalance}
                onChange={(e) => setNewInitialBalance(e.target.value)}
                className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 font-mono text-sm font-bold tabular-nums text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="camb-comissao" className="block text-xs font-medium text-slate-300">
                Comissão (%)
              </label>
              <input
                id="camb-comissao"
                type="number"
                min={0}
                max={50}
                step="0.5"
                value={newCommission}
                onChange={(e) => setNewCommission(e.target.value)}
                className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 font-mono text-sm font-bold tabular-nums text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Optional inline secondary login creation */}
          {isAdmin && (
            <div className="rounded-lg border border-[#1E2633] bg-[#0B0F14] p-3.5 space-y-3">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createLoginWithCambista}
                  onChange={(e) => setCreateLoginWithCambista(e.target.checked)}
                  className="h-4 w-4 rounded border-[#2A3648] bg-[#11161D] accent-emerald-500 cursor-pointer"
                />
                <span>Criar conta secundária de login para este cambista (sincronizar no servidor)</span>
              </label>

              {createLoginWithCambista && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                  <div className="space-y-1">
                    <label htmlFor="camb-login-user" className="block text-xs font-medium text-slate-300">
                      Usuário de Login
                    </label>
                    <input
                      id="camb-login-user"
                      type="text"
                      value={inlineLoginUser}
                      onChange={(e) => setInlineLoginUser(e.target.value)}
                      placeholder="Ex.: marcos.souza"
                      className="w-full rounded-lg border border-[#242E3D] bg-[#11161D] px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="camb-login-pass" className="block text-xs font-medium text-slate-300">
                      Senha (mín. 6 caracteres)
                    </label>
                    <div className="relative">
                      <input
                        id="camb-login-pass"
                        type={showInlinePassword ? 'text' : 'password'}
                        value={inlineLoginPassword}
                        onChange={(e) => setInlineLoginPassword(e.target.value)}
                        placeholder="Digite a senha"
                        className="w-full rounded-lg border border-[#242E3D] bg-[#11161D] py-2 pl-3 pr-9 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowInlinePassword((prev) => !prev)}
                        aria-label={showInlinePassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showInlinePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {createFeedback && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                createFeedback.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
            >
              {createFeedback.text}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-[#242E3D] bg-[#0B0F14] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreatingCambista}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-60 cursor-pointer"
            >
              {isCreatingCambista ? 'Salvando...' : 'Salvar Cambista'}
            </button>
          </div>
        </form>
      )}

      {/* Cambistas Directory + Selected Cambista Control */}
      {cambistas.length === 0 ? (
        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-10 text-center space-y-2">
          <p className="text-base font-semibold text-white">Nenhum cambista cadastrado</p>
          <p className="text-sm text-slate-400">
            Clique em &quot;Criar Cambista&quot; acima para adicionar um operador e liberar saldo para registrar jogos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Directory List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="space-y-2 rounded-xl border border-[#1E2633] bg-[#11161D] p-3">
              <div className="flex items-center justify-between px-2 pb-2 text-xs font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  Cambistas ({cambistas.length})
                </span>
                <span>Saldo</span>
              </div>

              {cambistas.map((c) => {
                const isSelected = selectedCambista?.id === c.id;
                const isOperating = activeCambistaId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setConfirmDeleteId(null);
                      setEntryFeedback(null);
                    }}
                    className={`w-full rounded-lg border p-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500/60 bg-[#17202B]'
                        : 'border-[#1E2633] bg-[#0E1319] hover:border-[#2B3749]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {c.location} · {c.commissionPercent}% comissão
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm font-bold tabular-nums text-emerald-400">
                          {formatBRL(c.balance)}
                        </div>
                        <div className="text-[10px] font-semibold">
                          {!c.active ? (
                            <span className="text-rose-400">Bloqueado</span>
                          ) : isOperating ? (
                            <span className="text-amber-400">Operando no Bilhete</span>
                          ) : (
                            <span className="text-slate-500">Ativo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Synced Secondary Accounts Card (Server) */}
            {isAdmin && (
              <div className="space-y-3 rounded-xl border border-[#1E2633] bg-[#11161D] p-4">
                <div className="flex items-center justify-between border-b border-[#1E2633] pb-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                    <KeyRound className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    Contas Secundárias ({secondaryAccounts.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSecLinkedCambistaId(selectedCambista?.id ?? '');
                      setShowSecondaryForm(true);
                      setSecFeedback(null);
                    }}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    + Nova Conta
                  </button>
                </div>

                {secondaryAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Nenhuma conta secundária criada ainda. Clique em &quot;Criar Conta Secundária&quot; para gerar usuário e senha sincronizados no servidor.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {secondaryAccounts.map((acc) => (
                      <div
                        key={acc.username}
                        className="rounded-lg border border-[#1E2633] bg-[#0E1319] p-2.5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-bold text-white truncate">
                              {acc.username}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {acc.cambistaName ? `Cambista: ${acc.cambistaName}` : 'Operador Geral'}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-semibold shrink-0 ${
                              acc.active ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {acc.active ? 'Ativa' : 'Bloqueada'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (acc.cambistaId) setSelectedId(acc.cambistaId);
                              setTicketScope(`user:${acc.username}`);
                              setTicketStatusFilter('all');
                              setRightView('jogos');
                            }}
                            className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                          >
                            Ver Jogos
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onToggleSecondaryAccountStatus(acc.username)}
                              className="rounded border border-[#252F3F] bg-[#11161D] px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
                            >
                              {acc.active ? 'Bloquear' : 'Ativar'}
                            </button>

                            {confirmDeleteAccount === acc.username ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await onDeleteSecondaryAccount(acc.username);
                                  setConfirmDeleteAccount(null);
                                }}
                                className="rounded bg-rose-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-400 cursor-pointer"
                              >
                                Confirmar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteAccount(acc.username)}
                                className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Selected Cambista Controls & Cash Ledger */}
          {selectedCambista && (
            <div className="lg:col-span-8 space-y-6">
              {/* Cambista Overview & Terminal Switch */}
              <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-5 space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#1E2633] pb-4">
                  <div>
                    <div className="text-xs text-slate-400">
                      {selectedCambista.location} · Criado em {selectedCambista.createdAt}
                    </div>
                    <h3 className="font-display text-2xl font-extrabold text-white">
                      {selectedCambista.name}
                    </h3>
                    {isAdmin && (
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        {linkedAccountsForSelected.length > 0 ? (
                          <span>
                            Logins vinculados:{' '}
                            <strong className="font-mono text-emerald-400">
                              {linkedAccountsForSelected.map((a) => a.username).join(', ')}
                            </strong>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSecLinkedCambistaId(selectedCambista.id);
                              setShowSecondaryForm(true);
                              setSecFeedback(null);
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                          >
                            <KeyRound className="h-3 w-3" aria-hidden="true" />
                            <span>+ Criar conta secundária (usuário e senha) para este cambista</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleCambistaStatus(selectedCambista.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                        selectedCambista.active
                          ? 'border-[#252F3F] bg-[#0B0F14] text-slate-300 hover:text-rose-400'
                          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      }`}
                    >
                      {selectedCambista.active ? (
                        <>
                          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Bloquear</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Ativar</span>
                        </>
                      )}
                    </button>

                    {selectedCambista.active && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectActiveCambista(selectedCambista.id);
                          onGoToSports();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {activeCambistaId === selectedCambista.id
                            ? 'Ir para Jogos (Ativo)'
                            : 'Usar p/ Registrar Jogos'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmDeleteId((prev) =>
                          prev === selectedCambista.id ? null : selectedCambista.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>

                {confirmDeleteId === selectedCambista.id && (
                  <div className="flex flex-col gap-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-rose-200">
                      Confirmar exclusão do cambista <strong className="text-white">{selectedCambista.name}</strong>? O histórico de movimentações já registrado será preservado no Caixa Geral.
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-[#252F3F] bg-[#0B0F14] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = cambistas.find((c) => c.id !== selectedCambista.id);
                          onDeleteCambista(selectedCambista.id);
                          setSelectedId(next?.id ?? null);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-lg bg-rose-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-400 cursor-pointer"
                      >
                        Confirmar Exclusão
                      </button>
                    </div>
                  </div>
                )}

                {/* 4 Cambista KPIs */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <div className="text-xs text-slate-400">Saldo p/ Jogos</div>
                    <div className="font-mono text-xl font-bold tabular-nums text-white">
                      {formatBRL(selectedCambista.balance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Total Entradas</div>
                    <div className="font-mono text-xl font-bold tabular-nums text-emerald-400">
                      +{formatBRL(totalEntradas)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Total Saídas</div>
                    <div className="font-mono text-xl font-bold tabular-nums text-rose-400">
                      -{formatBRL(totalSaidas)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Bilhetes Feitos</div>
                    <div className="font-mono text-xl font-bold tabular-nums text-amber-400">
                      {cambistaTickets.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Entry / Exit Form for this Cambista */}
              <form
                onSubmit={handleEntrySubmit}
                className="rounded-xl border border-[#1E2633] bg-[#11161D] p-5 space-y-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#1E2633] pb-3">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <h4 className="text-sm font-bold text-white">
                      Controle de Entrada e Saída · {selectedCambista.name}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 rounded-lg border border-[#1E2633] bg-[#0B0F14] p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEntryDirection('entrada');
                        setEntryCategory('Carga de Saldo (Jogos)');
                        setEntryFeedback(null);
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        entryDirection === 'entrada'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Entrada / Colocar Valor (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEntryDirection('saida');
                        setEntryCategory('Sangria / Recolhimento');
                        setEntryFeedback(null);
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                        entryDirection === 'saida'
                          ? 'bg-rose-500 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Saída / Retirar Valor (-)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <label htmlFor="camb-tx-val" className="block text-xs font-medium text-slate-300">
                      Valor (R$)
                    </label>
                    <input
                      id="camb-tx-val"
                      type="number"
                      min={1}
                      step="0.01"
                      value={entryAmount}
                      onChange={(e) => setEntryAmount(e.target.value)}
                      className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 font-mono text-sm font-bold tabular-nums text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="camb-tx-method" className="block text-xs font-medium text-slate-300">
                      Meio
                    </label>
                    <select
                      id="camb-tx-method"
                      value={entryMethod}
                      onChange={(e) => setEntryMethod(e.target.value as 'Pix' | 'Dinheiro' | 'Banca')}
                      className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Pix">Pix</option>
                      <option value="Banca">Banca</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="camb-tx-cat" className="block text-xs font-medium text-slate-300">
                      Categoria
                    </label>
                    <select
                      id="camb-tx-cat"
                      value={entryCategory}
                      onChange={(e) => setEntryCategory(e.target.value)}
                      className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    >
                      {categoryPresets.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="camb-tx-desc" className="block text-xs font-medium text-slate-300">
                      Observação
                    </label>
                    <input
                      id="camb-tx-desc"
                      type="text"
                      value={entryDescription}
                      onChange={(e) => setEntryDescription(e.target.value)}
                      placeholder="Ex.: Liberação do dia"
                      className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {entryFeedback && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      entryFeedback.type === 'ok'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    {entryFeedback.text}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className={`rounded-lg px-5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      entryDirection === 'entrada'
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-rose-500 text-white hover:bg-rose-400'
                    }`}
                  >
                    {entryDirection === 'entrada'
                      ? 'Confirmar Entrada p/ Cambista'
                      : 'Confirmar Saída do Cambista'}
                  </button>
                </div>
              </form>

              {/* Switcher: Movimentações vs Jogos Registrados, Ganhos e Perdidos */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border border-[#1E2633] bg-[#11161D] p-1">
                  <button
                    type="button"
                    onClick={() => setRightView('movimentacoes')}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      rightView === 'movimentacoes'
                        ? 'bg-[#1D2735] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Movimentações ({cambistaTxs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightView('jogos')}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      rightView === 'jogos'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Jogos Registrados, Ganhos e Perdidos
                  </button>
                </div>
              </div>

              {rightView === 'movimentacoes' ? (
                <section className="overflow-hidden rounded-xl border border-[#1E2633] bg-[#11161D]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2633] bg-[#141B24] px-4 py-3">
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
                          onClick={() => setTxFilter(tab.id)}
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                            txFilter === tab.id
                              ? 'bg-[#1D2735] text-emerald-400 font-semibold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleExportCambistaCsv}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#252F3F] bg-[#0B0F14] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      <span>Exportar CSV</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#1E2633] bg-[#0E1319] text-slate-400">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Tipo</th>
                          <th className="px-4 py-2.5 font-semibold">Descrição & Categoria</th>
                          <th className="px-4 py-2.5 font-semibold">Meio</th>
                          <th className="px-4 py-2.5 font-semibold">Data / Hora</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1A222D]">
                        {filteredCambistaTxs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                              Nenhuma movimentação registrada para este cambista.
                            </td>
                          </tr>
                        ) : (
                          filteredCambistaTxs.map((tx) => {
                            const isEntry = tx.direction === 'entrada';
                            return (
                              <tr key={tx.id} className="hover:bg-[#141B24]/60">
                                <td className="px-4 py-2.5 whitespace-nowrap">
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
                                <td className="px-4 py-2.5">
                                  <div className="font-semibold text-white">{tx.description}</div>
                                  <div className="text-[11px] text-slate-400">{tx.category}</div>
                                </td>
                                <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{tx.method}</td>
                                <td className="px-4 py-2.5 font-mono text-[11px] tabular-nums text-slate-400 whitespace-nowrap">
                                  {tx.createdAt}
                                </td>
                                <td
                                  className={`px-4 py-2.5 text-right font-mono text-sm font-bold tabular-nums whitespace-nowrap ${
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
              ) : (
                (() => {
                  const activeUserScope = ticketScope.startsWith('user:') ? ticketScope.slice(5) : null;
                  const targetAccount = activeUserScope
                    ? secondaryAccounts.find((a) => a.username === activeUserScope)
                    : null;

                  const scopedGames = tickets.filter((t) => {
                    if (ticketScope === 'all') return true;
                    if (activeUserScope) {
                      const byUser = t.createdByUsername?.toLowerCase() === activeUserScope.toLowerCase();
                      const byLinked = Boolean(targetAccount?.cambistaId && t.cambistaId === targetAccount.cambistaId);
                      return byUser || byLinked;
                    }
                    const linkedUsernames = linkedAccountsForSelected.map((a) => a.username.toLowerCase());
                    return (
                      t.cambistaId === selectedCambista.id ||
                      (t.createdByUsername && linkedUsernames.includes(t.createdByUsername.toLowerCase()))
                    );
                  });

                  const filteredGames = scopedGames.filter(
                    (t) => ticketStatusFilter === 'all' || t.status === ticketStatusFilter
                  );

                  const openCount = scopedGames.filter((t) => t.status === 'open').length;
                  const wonCount = scopedGames.filter((t) => t.status === 'won').length;
                  const lostCount = scopedGames.filter((t) => t.status === 'lost').length;

                  return (
                    <section className="space-y-4 rounded-xl border border-[#1E2633] bg-[#11161D] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E2633] pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTicketScope('cambista')}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                              ticketScope === 'cambista'
                                ? 'bg-[#1D2735] text-emerald-400'
                                : 'bg-[#0B0F14] text-slate-400 hover:text-white'
                            }`}
                          >
                            {selectedCambista.name}
                          </button>
                          {activeUserScope && (
                            <span className="rounded-md bg-emerald-500/15 px-3 py-1.5 font-mono text-xs font-semibold text-emerald-300">
                              Conta: {activeUserScope}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setTicketScope('all')}
                            className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                              ticketScope === 'all'
                                ? 'bg-[#1D2735] text-emerald-400'
                                : 'bg-[#0B0F14] text-slate-400 hover:text-white'
                            }`}
                          >
                            Todos os Jogos da Banca
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#1E2633] bg-[#0B0F14] p-1">
                          {(
                            [
                              { id: 'all', label: 'Todos' },
                              { id: 'open', label: 'Em Aberto' },
                              { id: 'won', label: 'Ganhos' },
                              { id: 'lost', label: 'Perdidos' },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setTicketStatusFilter(tab.id)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                                ticketStatusFilter === tab.id
                                  ? 'bg-emerald-500 text-slate-950 font-bold'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-b border-[#1E2633] pb-3">
                        <div>
                          <div className="text-[11px] text-slate-400">Registrados</div>
                          <div className="font-mono text-lg font-bold tabular-nums text-white">{scopedGames.length}</div>
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

                      {filteredGames.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">
                          Nenhum jogo encontrado neste filtro. Alterne para &quot;Todos os Jogos da Banca&quot; ou registre um novo bilhete.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredGames.map((ticket) => {
                            const cashOutValue = Number(
                              (ticket.stake * 0.88 * Math.min(1.45, Math.max(0.85, ticket.totalOdd * 0.42))).toFixed(2)
                            );
                            return (
                              <div
                                key={ticket.id}
                                className="overflow-hidden rounded-lg border border-[#1E2633] bg-[#0B0F14]"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A222D] bg-[#141B24] px-3.5 py-2 text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono font-bold text-white">{ticket.code}</span>
                                    <span className="text-slate-400">· {ticket.type}</span>
                                    {ticket.cambistaName && (
                                      <span className="text-amber-400 font-semibold">· {ticket.cambistaName}</span>
                                    )}
                                    {ticket.createdByUsername && (
                                      <span className="font-mono text-slate-300">· {ticket.createdByUsername}</span>
                                    )}
                                    <span className="text-slate-500">· {ticket.createdAt}</span>
                                  </div>

                                  <span
                                    className={`inline-flex items-center gap-1 font-bold ${
                                      ticket.status === 'won'
                                        ? 'text-emerald-400'
                                        : ticket.status === 'lost'
                                        ? 'text-rose-400'
                                        : ticket.status === 'cashed_out'
                                        ? 'text-sky-400'
                                        : 'text-amber-400'
                                    }`}
                                  >
                                    {ticket.status === 'won' && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
                                    {ticket.status === 'lost' && <XCircle className="h-3.5 w-3.5" aria-hidden="true" />}
                                    {(ticket.status === 'open' || ticket.status === 'cashed_out') && (
                                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                    )}
                                    {ticket.status === 'won'
                                      ? 'Ganho'
                                      : ticket.status === 'lost'
                                      ? 'Perdido'
                                      : ticket.status === 'cashed_out'
                                      ? 'Cash Out'
                                      : 'Em Aberto'}
                                  </span>
                                </div>

                                <div className="divide-y divide-[#171E28] px-3.5">
                                  {ticket.selections.map((sel) => (
                                    <div key={sel.optionId} className="flex items-center justify-between gap-3 py-2 text-xs">
                                      <div className="min-w-0">
                                        <div className="font-semibold text-white truncate">{sel.matchLabel}</div>
                                        <div className="text-[11px] text-slate-400 truncate">
                                          {sel.marketName}: <span className="text-emerald-400 font-semibold">{sel.optionLabel}</span>
                                        </div>
                                      </div>
                                      <span className="font-mono font-bold tabular-nums text-white shrink-0">
                                        {sel.odd.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1A222D] bg-[#0E1319] px-3.5 py-2 text-xs">
                                  <div className="flex items-center gap-4">
                                    <span className="text-slate-400">
                                      Apostado: <strong className="font-mono text-white">{formatBRL(ticket.stake)}</strong>
                                    </span>
                                    <span className="text-slate-400">
                                      {ticket.status === 'won' || ticket.status === 'cashed_out' ? 'Pago: ' : 'Retorno: '}
                                      <strong
                                        className={`font-mono ${
                                          ticket.status === 'lost' ? 'text-slate-500 line-through' : 'text-emerald-400'
                                        }`}
                                      >
                                        {formatBRL(
                                          ticket.status === 'won' || ticket.status === 'cashed_out'
                                            ? ticket.payout ?? ticket.potentialReturn
                                            : ticket.potentialReturn
                                        )}
                                      </strong>
                                    </span>
                                  </div>

                                  {ticket.status === 'open' && (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => onCashOut(ticket.id)}
                                        className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                                      >
                                        Cash Out · {formatBRL(cashOutValue)}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onSimulateSettle(ticket.id, Math.random() > 0.42 ? 'won' : 'lost')
                                        }
                                        className="inline-flex items-center gap-1 rounded bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer"
                                      >
                                        <Play className="h-3 w-3" aria-hidden="true" />
                                        <span>Simular</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })()
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
