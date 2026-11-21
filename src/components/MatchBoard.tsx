import { ChevronRight, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { BetSelection, MatchItem, OddOption, QuickMarketMode } from '../types/sportsbook';

interface MatchBoardProps {
  matches: MatchItem[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  quickMarket: QuickMarketMode;
  onQuickMarketChange: (mode: QuickMarketMode) => void;
  selectedOptionIds: Set<string>;
  onToggleSelection: (selection: BetSelection) => void;
  onOpenMarkets: (match: MatchItem) => void;
}

const MARKET_MODES: { id: QuickMarketMode; label: string }[] = [
  { id: '1x2', label: 'Resultado Final' },
  { id: 'btts', label: 'Ambos Marcam' },
  { id: 'over15', label: 'Acima 1.5' },
  { id: 'over25', label: 'Total 2.5' },
  { id: 'corners', label: 'Escanteios' },
];

export function MatchBoard({
  matches,
  searchQuery,
  onSearchChange,
  quickMarket,
  onQuickMarketChange,
  selectedOptionIds,
  onToggleSelection,
  onOpenMarkets,
}: MatchBoardProps) {
  // Group matches preserving order by country + league
  const grouped = matches.reduce<{ key: string; country: string; league: string; items: MatchItem[] }[]>(
    (acc, match) => {
      const key = `${match.country}::${match.league}`;
      let group = acc.find((g) => g.key === key);
      if (!group) {
        group = { key, country: match.country, league: match.league, items: [] };
        acc.push(group);
      }
      group.items.push(match);
      return acc;
    },
    []
  );

  const handleOddClick = (match: MatchItem, marketId: string, marketName: string, opt: OddOption) => {
    onToggleSelection({
      matchId: match.id,
      matchLabel: `${match.homeTeam} x ${match.awayTeam}`,
      league: match.league,
      sport: match.sport,
      marketId,
      marketName,
      optionId: opt.id,
      optionLabel: opt.label,
      odd: opt.odd,
      kickoffLabel: match.kickoffLabel,
      isLive: false,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search, Quick Market Tabs & Daily Schedule Refresh */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#1E2633] bg-[#11161D] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar time, atleta ou campeonato..."
            aria-label="Buscar jogos"
            className="w-full rounded-lg border border-[#242E3D] bg-[#0B0F14] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <div className="flex max-w-full items-center overflow-x-auto rounded-lg bg-[#0B0F14] p-1 border border-[#1E2633]">
            {MARKET_MODES.map((mode) => {
              const active = quickMarket === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onQuickMarketChange(mode.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active ? 'bg-[#1D2735] text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {grouped.length === 0 && (
        <div className="rounded-xl border border-[#1E2633] bg-[#11161D] p-10 text-center">
          <p className="text-base font-semibold text-white">Nenhuma partida encontrada</p>
          <p className="mt-1 text-sm text-slate-400">
            Ajuste os filtros laterais ou limpe a busca para visualizar os jogos disponíveis hoje.
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              Limpar Busca
            </button>
          )}
        </div>
      )}

      {/* League Tables */}
      {grouped.map((group) => (
        <section
          key={group.key}
          className="overflow-hidden rounded-xl border border-[#1E2633] bg-[#11161D]"
        >
          {/* League Header */}
          <header className="flex items-center justify-between border-b border-[#1E2633] bg-[#141B24] px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className="text-slate-400">{group.country}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-white">{group.league}</span>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-slate-400">
              {group.items.length} {group.items.length === 1 ? 'jogo' : 'jogos'}
            </span>
          </header>

          {/* Match Rows */}
          <div className="divide-y divide-[#1A222D]">
            {group.items.map((match) => {
              const targetMarket =
                match.markets.find((mk) => mk.id === quickMarket) ?? match.markets[0];
              const isFinished = match.status === 'finished';

              const bttsMarket = match.markets.find((mk) => mk.id === 'btts');
              const over15Market = match.markets.find((mk) => mk.id === 'over15');
              const cornersMarket = match.markets.find((mk) => mk.id === 'corners');

              const inlineSpecialPicks =
                quickMarket === '1x2' && match.sport === 'futebol'
                  ? [
                      bttsMarket ? { market: bttsMarket, option: bttsMarket.options[0], shortText: 'Ambos Sim' } : null,
                      over15Market ? { market: over15Market, option: over15Market.options[0], shortText: 'Acima 1.5' } : null,
                      cornersMarket ? { market: cornersMarket, option: cornersMarket.options[0], shortText: 'Esc +9.5' } : null,
                    ].filter((item): item is { market: NonNullable<typeof bttsMarket>; option: OddOption; shortText: string } => Boolean(item))
                  : [];

              return (
                <div
                  key={match.id}
                  className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-[#141B24]/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Match Time / Live Clock & Teams */}
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="w-20 shrink-0">
                      {isFinished ? (
                        <div className="text-xs font-medium text-slate-400">Encerrado</div>
                      ) : (
                        <div className="text-xs font-medium text-slate-400 leading-tight">
                          {match.kickoffLabel.split(' · ').map((part, idx) => (
                            <div
                              key={idx}
                              className={idx === 1 ? 'font-mono tabular-nums text-slate-200 mt-0.5' : 'text-slate-400'}
                            >
                              {part}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-white">
                          {match.homeTeam}
                        </span>
                        {isFinished && (
                          <span className="font-mono text-sm font-bold tabular-nums text-emerald-400">
                            {match.homeScore}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-semibold text-slate-200">
                          {match.awayTeam}
                        </span>
                        {isFinished && (
                          <span className="font-mono text-sm font-bold tabular-nums text-emerald-400">
                            {match.awayScore}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-0.5">
                        <button
                          type="button"
                          onClick={() => onOpenMarkets(match)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                        >
                          <span>+{match.markets.length} mercados</span>
                          <ChevronRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                        {match.superOdd && !isFinished && (
                          <span className="text-[11px] font-semibold text-amber-400">
                            Cotação Turbinada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Odds Buttons */}
                  {isFinished ? (
                    <div className="flex items-center justify-end sm:w-[288px] shrink-0">
                      <span className="font-mono text-xs font-medium text-slate-500">
                        Mercado liquidado
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 sm:w-[288px] shrink-0">
                      {targetMarket.id !== quickMarket && (
                        <div className="text-[10px] font-medium text-slate-500 text-right">
                          {targetMarket.name}
                        </div>
                      )}
                      <div
                        className={`grid gap-1.5 ${
                          targetMarket.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                        }`}
                      >
                        {targetMarket.options.map((opt) => {
                          const isSelected = selectedOptionIds.has(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleOddClick(match, targetMarket.id, targetMarket.name, opt)}
                              className={`group relative flex flex-col items-center justify-center rounded-lg border px-2 py-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                                isSelected
                                  ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                                  : 'border-[#252F3F] bg-[#171E28] text-white hover:border-emerald-500/50 hover:bg-[#1E2734]'
                              }`}
                            >
                              <span
                                className={`text-[10px] font-medium truncate max-w-full ${
                                  isSelected ? 'text-slate-900' : 'text-slate-400'
                                }`}
                              >
                                {opt.shortLabel}
                              </span>
                              <span className="flex items-center gap-0.5 font-mono text-sm font-bold tabular-nums">
                                {opt.odd.toFixed(2)}
                                {opt.trend === 'up' && !isSelected && (
                                  <TrendingUp className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                                )}
                                {opt.trend === 'down' && !isSelected && (
                                  <TrendingDown className="h-3 w-3 text-rose-400" aria-hidden="true" />
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {inlineSpecialPicks.length > 0 && (
                        <div className="grid grid-cols-3 gap-1.5">
                          {inlineSpecialPicks.map(({ market, option, shortText }) => {
                            const isSelected = selectedOptionIds.has(option.id);
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleOddClick(match, market.id, market.name, option)}
                                className={`flex items-center justify-between gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                                  isSelected
                                    ? 'border-emerald-400 bg-emerald-500 text-slate-950 font-semibold'
                                    : 'border-[#202938] bg-[#121821] text-slate-300 hover:border-emerald-500/50 hover:text-white'
                                }`}
                              >
                                <span className={`truncate text-[10px] ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                                  {shortText}
                                </span>
                                <span className="font-mono text-[11px] font-bold tabular-nums shrink-0">
                                  {option.odd.toFixed(2)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
