import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Zap, 
  Award, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Info,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { ParetoEvaluatedCrypto, Top10mProfitCrypto } from '../types/hftConfluenceTypes';

interface ParetoWinProbabilityChartProps {
  paretoData: ParetoEvaluatedCrypto[];
  cycleTimeRemaining?: string;
  onSelectCrypto?: (symbol: string) => void;
  onExecuteTrade?: (crypto: Top10mProfitCrypto) => void;
  autoTradingEnabled?: boolean;
}

export const ParetoWinProbabilityChart: React.FC<ParetoWinProbabilityChartProps> = ({
  paretoData,
  cycleTimeRemaining = '09:42',
  onSelectCrypto,
  onExecuteTrade,
  autoTradingEnabled = false
}) => {
  const [selectedBarSymbol, setSelectedBarSymbol] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chart_table' | 'chart_only' | 'table_only'>('chart_table');

  // Stats calculation
  const top3 = useMemo(() => paretoData.slice(0, 3), [paretoData]);
  const activeDetail = useMemo(() => {
    if (selectedBarSymbol) {
      return paretoData.find(p => p.symbol === selectedBarSymbol) || top3[0];
    }
    return top3[0] || null;
  }, [selectedBarSymbol, paretoData, top3]);

  const stats = useMemo(() => {
    if (paretoData.length === 0) return { top3Avg: 0, overallAvg: 0, highestProb: 0, top3WeightShare: 0 };
    const highest = paretoData[0]?.winProbabilityPct || 0;
    const top3Sum = top3.reduce((acc, c) => acc + c.winProbabilityPct, 0);
    const top3Avg = top3.length > 0 ? Number((top3Sum / top3.length).toFixed(1)) : 0;
    const totalSum = paretoData.reduce((acc, c) => acc + c.winProbabilityPct, 0);
    const overallAvg = Number((totalSum / paretoData.length).toFixed(1));
    const top3WeightShare = top3.length > 0 ? Number(top3[top3.length - 1].cumulativeParetoPct.toFixed(1)) : 0;

    return { top3Avg, overallAvg, highestProb: highest, top3WeightShare };
  }, [paretoData, top3]);

  if (!paretoData || paretoData.length === 0) {
    return (
      <div className="p-6 bg-[#0e121a] rounded-2xl border border-slate-800 text-center font-mono">
        <span className="text-slate-400 text-xs">Carregando análise e ranking de Pareto do Ciclo 10min...</span>
      </div>
    );
  }

  const maxProb = Math.max(...paretoData.map(d => d.winProbabilityPct), 100);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-[#0e131d] to-[#0a0d14] border border-emerald-500/40 shadow-2xl shadow-emerald-950/20 font-mono space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Gráfico de Pareto por Acerto Estimado (Maior para Menor)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ORDENAÇÃO DECRESCENTE
              </span>
            </div>
            <p className="text-[11px] font-sans text-slate-400 mt-0.5">
              Identificação dos 20% de criptomoedas vitais que concentram 80% do potencial de assertividade (Ciclo 10min).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[9px] text-slate-500 uppercase block">Ciclo 10min:</span>
            <span className="text-xs font-bold text-amber-300 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              {cycleTimeRemaining}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-[10px]">
            <button
              type="button"
              onClick={() => setViewMode('chart_table')}
              className={`px-2 py-1 rounded transition ${viewMode === 'chart_table' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Completo
            </button>
            <button
              type="button"
              onClick={() => setViewMode('chart_only')}
              className={`px-2 py-1 rounded transition ${viewMode === 'chart_only' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Gráfico
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table_only')}
              className={`px-2 py-1 rounded transition ${viewMode === 'table_only' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tabela
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[9px] text-slate-500 uppercase block">Top #1 Acerto Máximo</span>
          <span className="text-sm font-black text-emerald-400">{stats.highestProb.toFixed(1)}%</span>
          <span className="text-[9px] text-slate-400 block">${paretoData[0]?.symbol} ({paretoData[0]?.recommendedAction.includes('COMPRA') ? 'LONG' : 'SHORT'})</span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
          <span className="text-[9px] text-emerald-400 uppercase block font-bold">Média Cesta Top 3</span>
          <span className="text-sm font-black text-emerald-300">{stats.top3Avg}%</span>
          <span className="text-[9px] text-emerald-400/80 block">Vital Few (Pareto 80/20)</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <span className="text-[9px] text-slate-500 uppercase block">Média Geral ({paretoData.length} Pares)</span>
          <span className="text-sm font-black text-cyan-300">{stats.overallAvg}%</span>
          <span className="text-[9px] text-slate-400 block">Spread vs Top: +{(stats.top3Avg - stats.overallAvg).toFixed(1)}%</span>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40">
          <span className="text-[9px] text-amber-400 uppercase block font-bold">Concentração Top 3</span>
          <span className="text-sm font-black text-amber-300">{stats.top3WeightShare}%</span>
          <span className="text-[9px] text-amber-400/80 block">do peso total acumulado</span>
        </div>
      </div>

      {/* PARETO CHART VISUALIZATION */}
      {(viewMode === 'chart_table' || viewMode === 'chart_only') && (
        <div className="p-4 rounded-xl bg-[#090c12] border border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800/60">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
              <span>Barra: Acerto Estimado individual (%)</span>
              <span className="mx-2 text-slate-600">|</span>
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>
              <span className="text-amber-300">Linha: Curva Cumulativa de Pareto (ABC %)</span>
            </span>
            <span className="text-[10px] text-slate-500 font-sans">
              *Clique em qualquer coluna para auditar detalhes
            </span>
          </div>

          {/* SVG & Responsive Bar Chart Container */}
          <div className="relative h-64 w-full pt-4 pb-6 select-none">
            {/* 80% Pareto Reference Horizontal Line */}
            <div className="absolute left-8 right-2 top-8 border-b border-dashed border-amber-500/40 z-10 flex justify-between items-center text-[9px] text-amber-400/80 pointer-events-none px-1">
              <span>Linha de Corte Pareto (80%)</span>
              <span className="bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/30">80% Meta</span>
            </div>

            {/* Bars and Cumulative SVG */}
            <div className="relative h-full flex items-end justify-between gap-1.5 sm:gap-2 px-1">
              {paretoData.map((item, idx) => {
                const isSelected = (activeDetail?.symbol === item.symbol);
                const isTop3 = item.rank <= 3;
                const heightPct = Math.round((item.winProbabilityPct / maxProb) * 100);
                const isLong = item.recommendedAction.includes('COMPRA') || item.recommendedAction.includes('LONG');

                // Color tier
                const barColor = isTop3 
                  ? (item.rank === 1 ? 'from-amber-400 to-emerald-500' : item.rank === 2 ? 'from-slate-300 to-emerald-600' : 'from-amber-600 to-emerald-700')
                  : item.winProbabilityPct >= 70 ? 'from-emerald-600 to-teal-700' : item.winProbabilityPct >= 60 ? 'from-cyan-600 to-slate-700' : 'from-slate-700 to-slate-800';

                return (
                  <div
                    key={item.symbol}
                    onClick={() => {
                      setSelectedBarSymbol(item.symbol);
                      if (onSelectCrypto) onSelectCrypto(item.symbol);
                    }}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Floating Tooltip Value on Hover/Selected */}
                    <div className={`text-[10px] font-bold transition-all mb-1 ${
                      isSelected 
                        ? 'text-emerald-300 scale-110 font-black' 
                        : isTop3 
                        ? 'text-amber-300 font-bold' 
                        : 'text-slate-400 group-hover:text-white'
                    }`}>
                      {item.winProbabilityPct.toFixed(0)}%
                    </div>

                    {/* Rank Badge on Top 3 */}
                    {isTop3 && (
                      <span className={`text-[9px] font-bold px-1 rounded mb-0.5 shadow ${
                        item.rank === 1 ? 'bg-amber-500 text-slate-950' : item.rank === 2 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700 text-white'
                      }`}>
                        #{item.rank}
                      </span>
                    )}

                    {/* The Bar */}
                    <div 
                      className={`w-full max-w-[36px] rounded-t-md transition-all duration-300 bg-gradient-to-t ${barColor} ${
                        isSelected 
                          ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/30 brightness-125' 
                          : 'group-hover:brightness-110'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {/* Direction Tag inside top of bar */}
                      <div className="w-full text-center pt-0.5">
                        <span className={`text-[8px] font-black ${isLong ? 'text-emerald-950' : 'text-rose-950'}`}>
                          {isLong ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Symbol Label */}
                    <div className="mt-1.5 text-center">
                      <span className={`text-[10px] block transition ${
                        isSelected ? 'text-emerald-300 font-black' : isTop3 ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'
                      }`}>
                        {item.symbol}
                      </span>
                      <span className="text-[8px] text-slate-500 block leading-none">
                        {item.cumulativeParetoPct.toFixed(0)}%c
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Coin Quick Inspector Card */}
          {activeDetail && (
            <div className="p-3 rounded-xl bg-[#121622] border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border font-black text-center min-w-[56px] ${
                  activeDetail.rank <= 3 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  <span className="text-[9px] block uppercase text-slate-400">Rank</span>
                  <span className="text-base">#{activeDetail.rank}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{activeDetail.symbol}</span>
                    <span className="text-[11px] text-slate-400 font-sans">{activeDetail.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.2 rounded border ${
                      activeDetail.recommendedAction.includes('COMPRA') 
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30' 
                        : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                    }`}>
                      {activeDetail.recommendedAction}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                    <span>Acerto: <strong className="text-emerald-400">{activeDetail.winProbabilityPct.toFixed(1)}%</strong></span>
                    <span>Confluência: <strong className="text-cyan-300">{activeDetail.confluenceScore}%</strong></span>
                    <span>Score Técnico: <strong className="text-indigo-300">{activeDetail.technicalScore}/100</strong></span>
                    <span>Pareto Acumulado: <strong className="text-amber-300">{activeDetail.cumulativeParetoPct}%</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onSelectCrypto && (
                  <button
                    type="button"
                    onClick={() => onSelectCrypto(activeDetail.symbol)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 border border-slate-700"
                  >
                    <span>Auditar Detalhes</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {onExecuteTrade && (
                  <button
                    type="button"
                    onClick={() => onExecuteTrade(activeDetail)}
                    disabled={!autoTradingEnabled}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border shadow-sm ${
                      activeDetail.recommendedAction.includes('COMPRA')
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-950/30 disabled:opacity-50'
                        : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-rose-950/30 disabled:opacity-50'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Executar #{activeDetail.rank} ({activeDetail.symbol})</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULL RANKING TABLE (MAIOR PARA MENOR) */}
      {(viewMode === 'chart_table' || viewMode === 'table_only') && (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#090c12]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#121622] text-[10px] text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Ativo</th>
                <th className="py-2.5 px-3 text-right">Acerto Estimado</th>
                <th className="py-2.5 px-3">Ação Sugerida</th>
                <th className="py-2.5 px-3 text-center">Confluência</th>
                <th className="py-2.5 px-3 text-center">Técnico</th>
                <th className="py-2.5 px-3 text-right">Pareto Acum.</th>
                <th className="py-2.5 px-3 text-center">Status Pareto</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {paretoData.map((item) => {
                const isSelected = activeDetail?.symbol === item.symbol;
                const isTop3 = item.rank <= 3;
                const isLong = item.recommendedAction.includes('COMPRA') || item.recommendedAction.includes('LONG');

                return (
                  <tr 
                    key={item.symbol}
                    onClick={() => {
                      setSelectedBarSymbol(item.symbol);
                      if (onSelectCrypto) onSelectCrypto(item.symbol);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-emerald-950/30' 
                        : isTop3 
                        ? 'bg-amber-950/10 hover:bg-slate-850' 
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded font-black text-[10px] ${
                        item.rank === 1 ? 'bg-amber-500 text-slate-950' : item.rank === 2 ? 'bg-slate-300 text-slate-950' : item.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{item.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">${item.symbol}</span>
                        <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-sm font-black ${
                        item.winProbabilityPct >= 75 ? 'text-emerald-400' : item.winProbabilityPct >= 65 ? 'text-cyan-300' : 'text-amber-400'
                      }`}>
                        {item.winProbabilityPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isLong 
                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-600/40' 
                          : 'bg-rose-950/50 text-rose-300 border-rose-600/40'
                      }`}>
                        {item.recommendedAction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-cyan-300">{item.confluenceScore}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-indigo-300">{item.technicalScore}/100</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-amber-300 font-bold">{item.cumulativeParetoPct}%</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isTop3 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                          ⭐ VITAL 80/20
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px]">
                          Residual
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onExecuteTrade) onExecuteTrade(item);
                        }}
                        disabled={!autoTradingEnabled}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition inline-flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Operar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
