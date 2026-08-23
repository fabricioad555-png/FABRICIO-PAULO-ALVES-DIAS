import React from 'react';
import { 
  Sliders, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TechnicalScoreSummary, TechnicalIndicatorsFilterConfig } from '../types/hftConfluenceTypes';

interface TechnicalScoreFilterControllerProps {
  symbol: string;
  technicalScoreSummary: TechnicalScoreSummary;
  filterConfig: TechnicalIndicatorsFilterConfig;
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleIndicator: (id: string) => void;
  onChangeMinRsi: (val: number) => void;
  onToggleRequireEma: (val: boolean) => void;
  onResetFilters: () => void;
}

export function TechnicalScoreFilterController({
  symbol,
  technicalScoreSummary,
  filterConfig,
  isOpen,
  onToggleOpen,
  onToggleIndicator,
  onChangeMinRsi,
  onToggleRequireEma,
  onResetFilters
}: TechnicalScoreFilterControllerProps) {
  if (!technicalScoreSummary) {
    return null;
  }

  const isBullishConsensus = technicalScoreSummary.consensus.includes('COMPRA');
  const isBearishConsensus = technicalScoreSummary.consensus.includes('VENDA');

  return (
    <div className="bg-[#0f131d] border border-cyan-500/30 rounded-xl p-3.5 sm:p-4 space-y-3 font-mono text-xs shadow-lg">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg border ${
            isBullishConsensus 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
              : isBearishConsensus 
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs">
                Score Resumo dos Indicadores Técnicos
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                isBullishConsensus 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' 
                  : isBearishConsensus 
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/50' 
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
              }`}>
                {technicalScoreSummary.overallScore}/100 • {technicalScoreSummary.consensus}
              </span>
            </div>
            <p className="text-[11px] font-sans text-slate-400 mt-0.5">
              Ponderação em tempo real de {technicalScoreSummary.activeIndicatorsCount}/{technicalScoreSummary.totalCount} indicadores para ${symbol}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Quick Indicator Counts Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#090b10] border border-slate-800 text-[10.5px]">
            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> {technicalScoreSummary.bullishCount} Alta
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 font-bold flex items-center gap-0.5">
              <TrendingDown className="w-3 h-3" /> {technicalScoreSummary.bearishCount} Baixa
            </span>
            {technicalScoreSummary.neutralCount > 0 && (
              <>
                <span className="text-slate-600">|</span>
                <span className="text-amber-400 font-bold flex items-center gap-0.5">
                  <Minus className="w-3 h-3" /> {technicalScoreSummary.neutralCount} Neutro
                </span>
              </>
            )}
          </div>

          {/* Toggle Expand/Collapse Controller */}
          <button
            type="button"
            onClick={onToggleOpen}
            className={`px-3 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition ${
              isOpen 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isOpen ? 'Ocultar Filtros' : 'Filtro & Controle'}</span>
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Dominant Factor Tag */}
      <div className="flex items-center justify-between text-[11px] font-sans px-2.5 py-1.5 rounded-lg bg-[#090b10] border border-slate-800/80">
        <span className="text-slate-400 font-mono text-[10px]">Fator Técnico Dominante:</span>
        <span className="text-cyan-300 font-medium truncate ml-2">{technicalScoreSummary.dominantFactor}</span>
      </div>

      {/* Expandable Interactive Filter & Calibration Panel */}
      {isOpen && (
        <div className="p-3 bg-[#0a0c13] rounded-xl border border-cyan-500/20 space-y-3 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <span className="text-slate-300 font-bold text-xs flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Controle Interativo de Indicadores & Ponderação
            </span>
            <button
              type="button"
              onClick={onResetFilters}
              className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3 h-3" /> Restaurar Todos
            </button>
          </div>

          {/* Quick Filters (Min RSI & EMA Alignment) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {/* Min RSI Filter */}
            <div className="p-2.5 rounded-lg bg-[#111520] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Filtro Mínimo de RSI (14):</span>
              <div className="flex items-center gap-2">
                {[0, 50, 60].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onChangeMinRsi(val)}
                    className={`px-2.5 py-1 rounded text-[10.5px] font-bold border transition ${
                      (filterConfig.minRsiFilter || 0) === val
                        ? 'bg-cyan-600 text-white border-cyan-400'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {val === 0 ? 'Sem Restrição' : `RSI > ${val}`}
                  </button>
                ))}
              </div>
            </div>

            {/* EMA Alignment Filter */}
            <div className="p-2.5 rounded-lg bg-[#111520] border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Alinhamento de EMAs:</span>
              <button
                type="button"
                onClick={() => onToggleRequireEma(!filterConfig.requireEmaAlignment)}
                className={`w-full px-2.5 py-1 rounded text-[10.5px] font-bold border flex items-center justify-between transition ${
                  filterConfig.requireEmaAlignment
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <span>Exigir Cascata Perfeita (9 &gt; 21 &gt; 50 &gt; 200)</span>
                <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                  filterConfig.requireEmaAlignment ? 'bg-white text-indigo-900' : 'bg-slate-700 text-slate-400'
                }`}>
                  {filterConfig.requireEmaAlignment ? '✓' : ''}
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Indicators Matrix (Toggles) */}
          <div className="space-y-1.5 pt-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              Ativar / Desativar Indicadores no Score ({technicalScoreSummary.activeIndicatorsCount}/{technicalScoreSummary.totalCount}):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {technicalScoreSummary.indicators.map((ind) => {
                const isEnabled = ind.isEnabled;
                const isIndBuy = ind.signal === 'COMPRA';
                const isIndSell = ind.signal === 'VENDA';

                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => onToggleIndicator(ind.id)}
                    className={`p-2 rounded-lg border text-left transition flex flex-col justify-between space-y-1 ${
                      isEnabled
                        ? isIndBuy 
                          ? 'bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400' 
                          : isIndSell 
                          ? 'bg-rose-950/40 border-rose-500/40 hover:border-rose-400' 
                          : 'bg-slate-900/90 border-slate-700 hover:border-slate-600'
                        : 'bg-[#090b10] border-slate-800/60 opacity-40 hover:opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {ind.category}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        !isEnabled 
                          ? 'bg-slate-800 text-slate-500'
                          : isIndBuy 
                          ? 'bg-emerald-900 text-emerald-200' 
                          : isIndSell 
                          ? 'bg-rose-900 text-rose-200' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isEnabled ? `${ind.signal} (${ind.score})` : 'DESATIVADO'}
                      </span>
                    </div>

                    <div className="text-[11px] font-bold text-white truncate">
                      {ind.name}
                    </div>

                    <div className="text-[10px] text-slate-300 font-sans truncate">
                      {ind.valueFormatted}
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5 border-t border-slate-800">
                      <span>Peso: {ind.weightPct}%</span>
                      <span className={isEnabled ? 'text-cyan-400' : 'text-slate-600'}>
                        {isEnabled ? '● Ativo' : '○ Inativo'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
