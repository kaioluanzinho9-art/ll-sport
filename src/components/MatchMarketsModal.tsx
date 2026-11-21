import { X } from 'lucide-react';
import { BetSelection, MatchItem, OddOption } from '../types/sportsbook';

interface MatchMarketsModalProps {
  match: MatchItem | null;
  selectedOptionIds: Set<string>;
  onClose: () => void;
  onToggleSelection: (selection: BetSelection) => void;
}

export function MatchMarketsModal({
  match,
  selectedOptionIds,
  onClose,
  onToggleSelection,
}: MatchMarketsModalProps) {
  if (!match) return null;

  const handleSelect = (marketId: string, marketName: string, opt: OddOption) => {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Mercados de ${match.homeTeam} contra ${match.awayTeam}`}
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#242E3D] bg-[#11161D]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#1E2633] bg-[#141B24] px-5 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{match.country}</span>
              <span aria-hidden="true">·</span>
              <span>{match.league}</span>
              <span aria-hidden="true">·</span>
              <span>{match.kickoffLabel}</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              {match.homeTeam} x {match.awayTeam}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mercados"
            className="rounded-lg border border-[#252F3F] bg-[#0B0F14] p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Market Groups */}
        <div className="divide-y divide-[#1A222D] overflow-y-auto p-5 space-y-5">
          {match.markets.map((market) => (
            <div key={market.id} className="pt-4 first:pt-0 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-300">{market.name}</h3>
              <div
                className={`grid gap-2 ${
                  market.options.length === 3
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {market.options.map((opt) => {
                  const isSelected = selectedOptionIds.has(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={match.status === 'finished'}
                      onClick={() => handleSelect(market.id, market.name, opt)}
                      className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors cursor-pointer disabled:opacity-50 ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500 text-slate-950 font-bold'
                          : 'border-[#252F3F] bg-[#171E28] text-white hover:border-emerald-500/50 hover:bg-[#1E2734]'
                      }`}
                    >
                      <span className={`truncate pr-2 text-xs font-medium ${isSelected ? 'text-slate-950' : 'text-slate-300'}`}>
                        {opt.label}
                      </span>
                      <span className="font-mono text-sm font-bold tabular-nums shrink-0">
                        {opt.odd.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
