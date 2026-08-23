import React from 'react';
import { MarketSentimentOverview } from '../types';
import { 
  TrendingUp, 
  MessageSquare, 
  Gauge, 
  Zap, 
  ShieldCheck, 
  Tag
} from 'lucide-react';

interface SentimentOverviewProps {
  overview: MarketSentimentOverview;
  onSelectKeyword: (keyword: string) => void;
  selectedKeyword?: string;
  onSelectCoin?: (symbol: string) => void;
}

export const SentimentOverview: React.FC<SentimentOverviewProps> = ({
  overview,
  onSelectKeyword,
  selectedKeyword,
}) => {
  // Calculate dial color based on fear & greed index
  const getGaugeColor = (val: number) => {
    if (val >= 75) return { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30' };
    if (val >= 55) return { text: 'text-indigo-400', bg: 'bg-indigo-500', border: 'border-indigo-500/30' };
    if (val >= 45) return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30' };
    return { text: 'text-rose-400', bg: 'bg-rose-500', border: 'border-rose-500/30' };
  };

  const gaugeStyle = getGaugeColor(overview.fearAndGreedIndex);

  return (
    <section className="bg-[#12141a] border border-slate-800/40 rounded-xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background ambient subtle blur */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row items-stretch gap-6 relative z-10">
        
        {/* Main Gauge & Fear/Greed Meter */}
        <div className="bg-[#0a0a0b]/60 border border-slate-800/60 rounded-xl p-5 lg:w-1/3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-serif italic text-white">
                Índice de Sentimento Sentinela
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              LIVE
            </span>
          </div>

          <div className="my-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-mono font-bold ${gaugeStyle.text}`}>
                  {overview.fearAndGreedIndex}
                </span>
                <span className="text-xs text-slate-500 font-mono">/ 100</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded text-black ${gaugeStyle.bg}`}>
                  {overview.fearAndGreedLabel}
                </span>
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-400" />
                  {overview.sentimentVelocity}
                </span>
              </div>
            </div>

            {/* Visual Arc Gauge */}
            <div className="relative w-22 h-22 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={gaugeStyle.text}
                  strokeDasharray={`${overview.fearAndGreedIndex}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">Ponderado</span>
              </div>
            </div>
          </div>

          {/* Sentiment Ratio Bar */}
          <div>
            <div className="flex justify-between text-[11px] font-mono mb-1.5">
              <span className="text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                BULL ({overview.overallBullishPercent}%)
              </span>
              <span className="text-rose-400">
                BEAR ({overview.overallBearishPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${overview.overallBullishPercent}%` }}
              />
              <div
                className="bg-slate-700 h-full transition-all duration-500"
                style={{ width: `${100 - overview.overallBullishPercent - overview.overallBearishPercent}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${overview.overallBearishPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Info Cards Grid */}
        <div className="lg:w-2/3 flex flex-col justify-between gap-4">
          
          {/* Metrics Card */}
          <div className="bg-[#0a0a0b]/60 border border-slate-800/60 rounded-xl p-3.5 flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
              Posts Analisados (24h)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-mono text-white font-bold">
                {overview.totalPostsAnalyzed24h.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                +18%
              </span>
            </div>
          </div>

          {/* Dominant Topic Alert */}
          <div className="bg-[#0a0a0b]/80 border border-indigo-500/20 rounded-xl p-3.5 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase tracking-widest font-bold text-indigo-400 block">
                Tópico Dominante nas Corretoras
              </span>
              <p className="text-xs font-serif italic text-slate-200 mt-0.5">
                "{overview.dominantTopic}"
              </p>
            </div>
          </div>

          {/* Trending Discussion Keywords */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
              <Tag className="h-3 w-3 text-indigo-400" />
              <span>Termos em Alta nos Fóruns:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {overview.trendingKeywords.map((kw, i) => {
                const isActive = selectedKeyword === kw.text;
                const tagColor = 
                  kw.sentiment === 'bullish' ? 'text-emerald-300 bg-emerald-950/40 border-emerald-800/40 hover:bg-emerald-900/40' :
                  kw.sentiment === 'fomo' ? 'text-amber-300 bg-amber-950/40 border-amber-800/40 hover:bg-amber-900/40' :
                  kw.sentiment === 'bearish' ? 'text-rose-300 bg-rose-950/40 border-rose-800/40 hover:bg-rose-900/40' :
                  'text-slate-300 bg-slate-900 border-slate-800 hover:bg-slate-800';

                return (
                  <button
                    key={i}
                    onClick={() => onSelectKeyword(isActive ? '' : kw.text)}
                    className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${tagColor} ${
                      isActive ? 'ring-2 ring-indigo-400 font-bold' : ''
                    }`}
                  >
                    <span>#{kw.text}</span>
                    <span className="opacity-60 text-[10px]">({kw.count})</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

