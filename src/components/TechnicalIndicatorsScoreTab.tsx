import React, { useState } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  RefreshCw,
  Compass,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { TechnicalScoreSummary, TechnicalIndicatorsFilterConfig, TechnicalIndicatorItem } from '../types/hftConfluenceTypes';

interface TechnicalIndicatorsScoreTabProps {
  symbol: string;
  technicalScoreSummary: TechnicalScoreSummary;
  filterConfig: TechnicalIndicatorsFilterConfig;
  onToggleIndicator: (id: string) => void;
  onResetFilters: () => void;
}

export function TechnicalIndicatorsScoreTab({
  symbol,
  technicalScoreSummary,
  filterConfig,
  onToggleIndicator,
  onResetFilters
}: TechnicalIndicatorsScoreTabProps) {
  if (!technicalScoreSummary) {
    return null;
  }

  const [expandedIndicatorId, setExpandedIndicatorId] = useState<string | null>(null);

  const isBullish = technicalScoreSummary.consensus.includes('COMPRA');
  const isBearish = technicalScoreSummary.consensus.includes('VENDA');

  const toggleExpand = (id: string) => {
    setExpandedIndicatorId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Master Technical Header Banner with Deep Details */}
      <div className={`p-4 sm:p-5 rounded-xl border space-y-3 ${
        isBullish 
          ? 'bg-gradient-to-r from-[#0c1a14] via-[#0e221b] to-[#0a1410] border-emerald-500/50' 
          : isBearish 
          ? 'bg-gradient-to-r from-[#1a0c0e] via-[#241014] to-[#120a0c] border-rose-500/50' 
          : 'bg-gradient-to-r from-[#151722] via-[#1a1c2b] to-[#0e1017] border-cyan-500/40'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                SCORE RESUMO DOS INDICADORES TÉCNICOS • DETALHE PROFUNDO
              </span>
              <h4 className="text-sm font-bold text-white">
                Matriz Quantitativa de 8 Vetores Ponderados (${symbol})
              </h4>
            </div>
            <p className="text-xs font-sans text-slate-300 mt-1">
              {technicalScoreSummary.summaryDiagnostic}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#090b10] border border-slate-800 text-right">
              <span className="text-[9px] text-slate-400 uppercase block">Score Técnico:</span>
              <span className={`text-xl font-black ${isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-amber-400'}`}>
                {technicalScoreSummary.overallScore}/100
              </span>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-[#090b10] border border-slate-800 text-right">
              <span className="text-[9px] text-slate-400 uppercase block">Consenso:</span>
              <span className={`text-xs font-black uppercase ${isBullish ? 'text-emerald-300' : isBearish ? 'text-rose-300' : 'text-amber-300'}`}>
                {technicalScoreSummary.consensus}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown bar & Details Info */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-sans">
            <span className="text-slate-300">
              Distribuição: <strong className="text-emerald-400">{technicalScoreSummary.bullishCount} Compra</strong> / <strong className="text-rose-400">{technicalScoreSummary.bearishCount} Venda</strong> / <strong className="text-amber-400">{technicalScoreSummary.neutralCount} Neutro</strong>
            </span>
            <span className="text-cyan-300 font-mono text-[10px] bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
              Fator Dominante: {technicalScoreSummary.dominantFactor}
            </span>
          </div>

          <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden flex">
            <div 
              className="bg-emerald-500 h-full transition-all" 
              style={{ width: `${(technicalScoreSummary.bullishCount / (technicalScoreSummary.totalCount || 1)) * 100}%` }} 
              title={`${technicalScoreSummary.bullishCount} Indicadores Altistas`}
            />
            <div 
              className="bg-amber-500 h-full transition-all" 
              style={{ width: `${(technicalScoreSummary.neutralCount / (technicalScoreSummary.totalCount || 1)) * 100}%` }} 
              title={`${technicalScoreSummary.neutralCount} Indicadores Neutros`}
            />
            <div 
              className="bg-rose-500 h-full transition-all" 
              style={{ width: `${(technicalScoreSummary.bearishCount / (technicalScoreSummary.totalCount || 1)) * 100}%` }} 
              title={`${technicalScoreSummary.bearishCount} Indicadores Baixistas`}
            />
          </div>
        </div>
      </div>

      {/* Grid of 8 Technical Indicators Cards with Expandable Detailed View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {technicalScoreSummary.indicators.map((ind) => {
          const isEnabled = ind.isEnabled;
          const isBuy = ind.signal === 'COMPRA';
          const isSell = ind.signal === 'VENDA';
          const isExpanded = expandedIndicatorId === ind.id;

          return (
            <div 
              key={ind.id}
              className={`p-3.5 rounded-xl border space-y-2.5 transition flex flex-col justify-between ${
                isEnabled
                  ? isBuy 
                    ? 'bg-[#0b1410] border-emerald-500/40 shadow-sm' 
                    : isSell 
                    ? 'bg-[#140b0d] border-rose-500/40 shadow-sm' 
                    : 'bg-[#12141c] border-slate-700 shadow-sm'
                  : 'bg-[#090b10] border-slate-800 opacity-40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {ind.category}
                  </span>
                  <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded ${
                    !isEnabled
                      ? 'bg-slate-800 text-slate-500'
                      : isBuy 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                      : isSell 
                      ? 'bg-rose-950 text-rose-300 border border-rose-700' 
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {isEnabled ? `${ind.signal} (${ind.score})` : 'DESATIVADO'}
                  </span>
                </div>

                <h5 className="font-bold text-white text-xs mt-2 truncate" title={ind.name}>
                  {ind.name}
                </h5>
                <div className="text-[11px] font-mono text-cyan-300 mt-1">
                  {ind.valueFormatted}
                </div>

                <p className="text-[10.5px] font-sans text-slate-300 mt-2 leading-relaxed">
                  {ind.statusText}
                </p>

                {/* Detailed Mathematical & Level Drawer if expanded */}
                {isExpanded && (
                  <div className="mt-3 p-2.5 bg-[#07090f] rounded-lg border border-cyan-500/30 space-y-2 text-[10.5px] animate-fade-in">
                    <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1">
                      <span>Parâmetros & Detalhes:</span>
                      <span className="text-cyan-400">Peso: {ind.weightPct}%</span>
                    </div>
                    <div className="space-y-1 text-slate-300 font-sans">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sub-score Atribuído:</span>
                        <strong className="text-white font-mono">{ind.score}/100</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Impacto no Consenso:</span>
                        <span className={isBuy ? 'text-emerald-400 font-bold' : isSell ? 'text-rose-400 font-bold' : 'text-amber-400'}>
                          {isBuy ? 'Contributivo Alta' : isSell ? 'Contributivo Baixa' : 'Neutro / Indiferente'}
                        </span>
                      </div>
                      <div className="pt-1 text-[10px] text-slate-400 italic border-t border-slate-800">
                        {ind.id === 'rsi_14' && 'Calculado sobre média móvel exponencial de ganhos/perdas de 14 períodos no time-frame de 15m/1h.'}
                        {ind.id === 'macd_momentum' && 'Diferença entre EMA 12 e EMA 26 com linha de sinal de 9 períodos.'}
                        {ind.id === 'emas_cascade' && 'Alinhamento em cascata entre EMA 9, 21, 50 e 200 para confirmação de tendência.'}
                        {ind.id === 'bollinger_bands' && 'Desvio padrão de 2.0 sobre média móvel simples de 20 períodos.'}
                        {ind.id === 'stochastic_osc' && 'Comparação do preço de fechamento com a faixa de alta/baixa de 14 barras.'}
                        {ind.id === 'supertrend' && 'Indicador baseado em ATR com fator multiplicador 3.0 para zonas de suporte/resistência dinâmica.'}
                        {ind.id === 'volume_obv' && 'Soma cumulativa de volume direcionada pelo sentido do fechamento das barras.'}
                        {ind.id === 'atr_breakout' && 'True Range médio para determinação de volatilidade e distâncias de alvo/stop.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <button
                  type="button"
                  onClick={() => toggleExpand(ind.id)}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold transition"
                >
                  <Info className="w-3 h-3" />
                  <span>{isExpanded ? 'Menos Detalhes' : 'Mais Detalhes'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleIndicator(ind.id)}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-bold border transition ${
                    isEnabled
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {isEnabled ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

