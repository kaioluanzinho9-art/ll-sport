import { Calendar, Flame, Trophy } from 'lucide-react';
import { MatchItem, SportId } from '../types/sportsbook';

export type TimeFilter = 'all' | 'today' | 'tomorrow' | 'finished';

interface SidebarProps {
  matches: MatchItem[];
  selectedSport: SportId | 'all';
  onSelectSport: (sport: SportId | 'all') => void;
  selectedLeague: string | 'all';
  onSelectLeague: (league: string | 'all') => void;
  timeFilter: TimeFilter;
  onSelectTimeFilter: (filter: TimeFilter) => void;
}

const SPORT_LABELS: { id: SportId; label: string }[] = [
  { id: 'futebol', label: 'Futebol' },
  { id: 'basquete', label: 'Basquete' },
  { id: 'tenis', label: 'Tênis' },
  { id: 'mma', label: 'MMA / UFC' },
  { id: 'esports', label: 'E-Sports' },
];

export function Sidebar({
  matches,
  selectedSport,
  onSelectSport,
  selectedLeague,
  onSelectLeague,
  timeFilter,
  onSelectTimeFilter,
}: SidebarProps) {
  const activeMatches = matches.filter((m) => m.status !== 'finished');
  const todayCount = matches.filter(
    (m) => m.status === 'upcoming' && m.kickoffLabel.startsWith('Hoje')
  ).length;
  const tomorrowCount = matches.filter(
    (m) => m.status === 'upcoming' && m.kickoffLabel.startsWith('Amanhã')
  ).length;
  const finishedCount = matches.filter((m) => m.status === 'finished').length;

  // Unique leagues ordered by match count
  const leagueCounts = activeMatches.reduce<Record<string, { league: string; country: string; count: number }>>(
    (acc, m) => {
      if (!acc[m.league]) {
        acc[m.league] = { league: m.league, country: m.country, count: 0 };
      }
      acc[m.league].count += 1;
      return acc;
    },
    {}
  );
  const topLeagues = Object.values(leagueCounts).sort((a, b) => b.count - a.count);

  return (
    <aside className="w-full lg:w-[248px] shrink-0 space-y-6">
      {/* Programação */}
      <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-3">
        <h2 className="px-2 pb-2 text-xs font-semibold text-slate-400">Programação</h2>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              onSelectTimeFilter('all');
              onSelectLeague('all');
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
              timeFilter === 'all' && selectedLeague === 'all'
                ? 'bg-[#1A222D] text-white font-semibold'
                : 'text-slate-300 hover:bg-[#171E28] hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5 whitespace-nowrap">
              <Flame className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
              Todos os Jogos
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">{activeMatches.length}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTimeFilter('today')}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
              timeFilter === 'today'
                ? 'bg-[#1A222D] text-white font-semibold'
                : 'text-slate-300 hover:bg-[#171E28] hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5 whitespace-nowrap">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
              Jogos de Hoje
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">{todayCount}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTimeFilter('tomorrow')}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
              timeFilter === 'tomorrow'
                ? 'bg-[#1A222D] text-white font-semibold'
                : 'text-slate-300 hover:bg-[#171E28] hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5 whitespace-nowrap">
              <Calendar className="h-4 w-4 text-slate-500 shrink-0" aria-hidden="true" />
              Amanhã
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">{tomorrowCount}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTimeFilter('finished')}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
              timeFilter === 'finished'
                ? 'bg-[#1A222D] text-white font-semibold'
                : 'text-slate-300 hover:bg-[#171E28] hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5 whitespace-nowrap">
              <Trophy className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
              Resultados de Hoje
            </span>
            <span className="font-mono text-xs tabular-nums text-slate-400">{finishedCount}</span>
          </button>
        </div>
      </div>

      {/* Modalidades */}
      <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-3">
        <h2 className="px-2 pb-2 text-xs font-semibold text-slate-400">Esportes</h2>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              onSelectSport('all');
              onSelectLeague('all');
            }}
            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
              selectedSport === 'all'
                ? 'bg-[#1A222D] text-white font-semibold'
                : 'text-slate-300 hover:bg-[#171E28] hover:text-white'
            }`}
          >
            <span>Todos</span>
            <span className="font-mono text-xs tabular-nums text-slate-400">{activeMatches.length}</span>
          </button>

          {SPORT_LABELS.map((sport) => {
            const count = activeMatches.filter((m) => m.sport === sport.id).length;
            const isSelected = selectedSport === sport.id;
            return (
              <button
                key={sport.id}
                type="button"
                onClick={() => {
                  onSelectSport(sport.id);
                  onSelectLeague('all');
                  if (timeFilter === 'finished') onSelectTimeFilter('all');
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#1A222D] text-emerald-400 font-semibold'
                    : 'text-slate-300 hover:bg-[#171E28] hover:text-white'
                }`}
              >
                <span className="whitespace-nowrap">{sport.label}</span>
                <span className="font-mono text-xs tabular-nums text-slate-400">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Campeonatos */}
      <div className="hidden lg:block rounded-xl border border-[#1E2633] bg-[#11161D] p-3">
        <h2 className="px-2 pb-2 text-xs font-semibold text-slate-400">Campeonatos</h2>
        <div className="space-y-1">
          {topLeagues.map((item) => {
            const isSelected = selectedLeague === item.league;
            return (
              <button
                key={item.league}
                type="button"
                onClick={() => {
                  onSelectLeague(isSelected ? 'all' : item.league);
                  onSelectSport('all');
                  if (timeFilter === 'finished') onSelectTimeFilter('all');
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#1A222D] text-emerald-400 font-semibold'
                    : 'text-slate-300 hover:bg-[#171E28] hover:text-white'
                }`}
              >
                <span className="truncate pr-2">
                  <span className="text-slate-500">{item.country}</span>
                  <span className="mx-1.5 text-slate-600">·</span>
                  <span>{item.league}</span>
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-400 shrink-0">{item.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
