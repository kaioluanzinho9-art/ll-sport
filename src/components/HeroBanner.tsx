import { ArrowUpRight } from 'lucide-react';
import { BetSelection, MatchItem, OddOption, SportId } from '../types/sportsbook';

interface HeroBannerProps {
  featuredMatch: MatchItem | undefined;
  activeSport: SportId | 'all';
  selectedOptionIds: Set<string>;
  onToggleSelection: (selection: BetSelection) => void;
  onOpenMarkets: (match: MatchItem) => void;
}

const HERO_IMAGES: Record<string, string> = {
  basquete: '/src/assets/images/promo_basketball_arena_1795268188543.jpg',
  tenis: '/src/assets/images/promo_tennis_court_1795268188209.jpg',
  default: '/src/assets/images/hero_stadium_night_1795268188342.jpg',
};

export function HeroBanner({
  featuredMatch,
  activeSport,
  selectedOptionIds,
  onToggleSelection,
  onOpenMarkets,
}: HeroBannerProps) {
  if (!featuredMatch) return null;

  const imageSrc = HERO_IMAGES[activeSport] ?? HERO_IMAGES.default;
  const mainMarket = featuredMatch.markets[0];
  if (!mainMarket) return null;

  const handleOddClick = (opt: OddOption) => {
    onToggleSelection({
      matchId: featuredMatch.id,
      matchLabel: `${featuredMatch.homeTeam} x ${featuredMatch.awayTeam}`,
      league: featuredMatch.league,
      sport: featuredMatch.sport,
      marketId: mainMarket.id,
      marketName: mainMarket.name,
      optionId: opt.id,
      optionLabel: opt.label,
      odd: opt.odd,
      kickoffLabel: featuredMatch.kickoffLabel,
      isLive: false,
    });
  };

  return (
    <section
      aria-label="Partida em destaque"
      className="relative overflow-hidden rounded-xl border border-[#1E2633] bg-gradient-to-br from-[#131B26] to-[#0B0F14]"
    >
      <img
        src={imageSrc}
        alt={`Arena da partida ${featuredMatch.homeTeam} contra ${featuredMatch.awayTeam}`}
        referrerPolicy="no-referrer"
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#090C10]/95 via-[#090C10]/80 to-[#090C10]/45"
      />

      <div className="relative z-10 flex flex-col justify-between gap-6 p-5 sm:p-7 lg:flex-row lg:items-end">
        <div className="max-w-xl space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-amber-400">Super Cotação do Dia</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>{featuredMatch.country} · {featuredMatch.league}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-300">{featuredMatch.kickoffLabel}</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white [text-wrap:balance]">
            {featuredMatch.homeTeam} <span className="text-slate-400 font-semibold">vs</span> {featuredMatch.awayTeam}
          </h1>

          <button
            type="button"
            onClick={() => onOpenMarkets(featuredMatch)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <span>Explorar todos os {featuredMatch.markets.length} mercados da partida</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Instant 1X2 / Winner Quick Bet Controls */}
        <div className="flex flex-col gap-2 sm:min-w-[300px]">
          <span className="text-xs font-medium text-slate-300">{mainMarket.name}</span>
          <div className={`grid gap-2 ${mainMarket.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {mainMarket.options.map((opt) => {
              const isSelected = selectedOptionIds.has(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleOddClick(opt)}
                  className={`flex flex-col items-center justify-center rounded-lg border px-3 py-2.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                      : 'border-[#2B3648] bg-[#111720]/90 text-white hover:border-emerald-500/60 hover:bg-[#19222E]'
                  }`}
                >
                  <span className={`text-[11px] font-medium ${isSelected ? 'text-slate-900' : 'text-slate-400'}`}>
                    {opt.shortLabel}
                  </span>
                  <span className="font-mono text-base font-bold tabular-nums">{opt.odd.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
