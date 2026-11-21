import { LogOut } from 'lucide-react';
import { NavSection } from '../types/sportsbook';

interface HeaderProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onLogout?: () => void;
  isAdmin?: boolean;
}

const NAV_ITEMS: { id: NavSection; label: string }[] = [
  { id: 'esportes', label: 'Esportes' },
  { id: 'consultar', label: 'Consultar Bilhete' },
  { id: 'resultados', label: 'Caixa & Cambistas' },
];

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function Header({ activeSection, onSelectSection, onLogout, isAdmin = true }: HeaderProps) {
  const navItems = NAV_ITEMS.map((item) =>
    item.id === 'resultados' && !isAdmin ? { ...item, label: 'Meus Jogos' } : item
  );

  return (
    <header className="sticky top-0 z-40 border-b border-[#1E2633] bg-[#0B0F14]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3 sm:px-6">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectSection('esportes')}
          className="font-display text-2xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
        >
          L.L <span className="text-emerald-400">Sports</span>
        </button>

        {/* Zone 2: 4 single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium" aria-label="Navegação principal">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`relative py-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded ${
                  isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[13px] h-0.5 bg-emerald-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Logout action */}
        <div className="flex items-center gap-2 shrink-0">
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Sair da conta"
              aria-label="Sair da conta"
              className="inline-flex items-center justify-center rounded-lg border border-[#242E3D] bg-[#11161D] p-2 text-slate-400 hover:border-rose-500/40 hover:text-rose-400 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        className="flex md:hidden items-center justify-between gap-1 border-t border-[#1A212C] px-3 py-1.5 overflow-x-auto"
        aria-label="Navegação mobile"
      >
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'bg-[#18202B] text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
