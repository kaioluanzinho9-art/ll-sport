import { Eye, EyeOff, Lock, ShieldCheck, User } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { AuthUser } from '../types/sportsbook';

interface LoginPageProps {
  needsSetup: boolean;
  onAuthenticated: (token: string, user: AuthUser) => void;
}

export function LoginPage({ needsSetup, onAuthenticated }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Informe usuário e senha para entrar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = needsSetup ? '/api/auth/setup' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        user?: AuthUser;
        error?: string;
      };

      if (!res.ok || !data.token || !data.user) {
        setError(data.error || 'Usuário ou senha inválidos.');
        return;
      }

      onAuthenticated(data.token, data.user);
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090C10] px-4 py-10 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="font-display text-3xl font-extrabold tracking-tight text-white">
            L.L <span className="text-emerald-400">Sports</span>
          </div>
          <p className="text-sm text-slate-400">
            {needsSetup
              ? 'Configure o acesso inicial do operador no servidor'
              : 'Acesse sua conta para gerenciar apostas, caixa e cambistas'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-6 sm:p-7 shadow-2xl">
          <div className="mb-5 flex items-center gap-2.5 border-b border-[#1E2633] pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-white">
                {needsSetup ? 'Cadastrar Acesso Inicial' : 'Entrar no Sistema'}
              </h1>
              <p className="text-xs text-slate-400">Autenticação validada no servidor</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="block text-xs font-medium text-slate-300">
                Usuário
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-300">
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={needsSetup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] py-2.5 pl-9 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Verificando...' : needsSetup ? 'Salvar Acesso e Entrar' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500">
          L.L Sports · Acesso restrito a operadores autorizados
        </p>
      </div>
    </div>
  );
}
