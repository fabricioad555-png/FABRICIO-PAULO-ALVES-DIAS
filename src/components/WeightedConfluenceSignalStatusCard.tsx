import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Target, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3,
  Scale,
  Sliders
} from 'lucide-react';
import { HighFrequencyConfluenceResult, TechnicalScoreSummary } from '../types/hftConfluenceTypes';

interface WeightedConfluenceSignalStatusCardProps {
  confluenceResult: HighFrequencyConfluenceResult;
  btcTechnicalScoreSummary: TechnicalScoreSummary;
  symbol: string;
}

export function WeightedConfluenceSignalStatusCard({
  confluenceResult,
  btcTechnicalScoreSummary,
  symbol
}: WeightedConfluenceSignalStatusCardProps) {
  // Manual weights state defaulting to 14% (Layer 1+2) and 86% (Technical Score) as per customized decision system
  const [weightLayer1And2, setWeightLayer1And2] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('hft_decision_weight_layer_1_2');
      if (saved !== null) return parseInt(saved, 10);
    }
    return 14;
  });

  const [weightTechnical, setWeightTechnical] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('hft_decision_weight_tech');
      if (saved !== null) return parseInt(saved, 10);
    }
    return 86;
  });

  // Handler to adjust weights with auto-balance and save to localStorage
  const handleLayerWeightChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setWeightLayer1And2(clamped);
    setWeightTechnical(100 - clamped);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('hft_decision_weight_layer_1_2', clamped.toString());
      window.localStorage.setItem('hft_decision_weight_tech', (100 - clamped).toString());
      // Dispatch storage event to trigger real-time updates in other listening components if needed
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleTechWeightChange = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setWeightTechnical(clamped);
    setWeightLayer1And2(100 - clamped);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('hft_decision_weight_tech', clamped.toString());
      window.localStorage.setItem('hft_decision_weight_layer_1_2', (100 - clamped).toString());
      // Dispatch storage event
      window.dispatchEvent(new Event('storage'));
    }
  };

  // Extract Layer 1 & 2 score (Holistic Pareto score approx or average of primary and secondary)
  const layer1And2Score = Math.round(((confluenceResult?.primaryAnalysis?.overallPrimaryScore ?? 50) + (confluenceResult?.confluenceScorePct ?? 50)) / 2);
  const technicalScore60 = btcTechnicalScoreSummary.overallScore;

  // Master weighted score based on dynamic weights
  const masterWeightedScore = Math.round(
    layer1And2Score * (weightLayer1And2 / 100) + technicalScore60 * (weightTechnical / 100)
  );

  // Determine definitive buy/sell status based on dynamic weighted rule
  let definitiveStatus = 'AGUARDAR CONFLUÊNCIA';
  let badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/50';
  let borderGlow = 'border-amber-500/40 shadow-amber-950/30';
  let isBuy = false;
  let isSell = false;

  if (masterWeightedScore >= 68 && btcTechnicalScoreSummary.bullishCount >= 5) {
    definitiveStatus = 'COMPRA FORTE (LONG - ALTA CONFLUÊNCIA)';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60';
    borderGlow = 'border-emerald-500/50 shadow-emerald-950/40';
    isBuy = true;
  } else if (masterWeightedScore <= 43 && btcTechnicalScoreSummary.bearishCount >= 5) {
    definitiveStatus = 'VENDA FORTE (SHORT - PRESSÃO INSTITUCIONAL)';
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/60';
    borderGlow = 'border-rose-500/50 shadow-rose-950/40';
    isSell = true;
  } else if (masterWeightedScore >= 56) {
    definitiveStatus = 'COMPRA EM PULLBACK (ATENÇÃO AO SUPORTE)';
    badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
    borderGlow = 'border-cyan-500/40 shadow-cyan-950/30';
    isBuy = true;
  } else if (masterWeightedScore <= 48) {
    definitiveStatus = 'VENDA EM REJEIÇÃO (RESISTÊNCIA ATIVA)';
    badgeColor = 'bg-orange-500/20 text-orange-300 border-orange-500/50';
    borderGlow = 'border-orange-500/40 shadow-orange-950/30';
    isSell = true;
  }

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0b101b] via-[#070b14] to-[#0b101b] border-2 ${borderGlow} shadow-2xl space-y-4 font-mono text-xs overflow-hidden`}>
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shrink-0">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9.5px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                SISTEMA PONDERADO ({weightLayer1And2}% / {weightTechnical}%)
              </span>
              <span className="text-slate-400 text-[10.5px]">Ativo: <strong className="text-white">{symbol}</strong></span>
            </div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-wide mt-0.5 truncate">
              Status de Compra &amp; Venda Ponderado (Distribuição Manual)
            </h3>
          </div>
        </div>

        {/* Definitive Status Badge */}
        <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border font-black text-xs sm:text-sm tracking-wide shadow-lg flex items-center justify-center gap-1.5 shrink-0 text-center ${badgeColor}`}>
          {isBuy ? <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 animate-pulse shrink-0" /> : isSell ? <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 animate-pulse shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />}
          <span className="break-words">{definitiveStatus}</span>
        </div>
      </div>

      {/* Manual Weight Adjustment Control Panel */}
      <div className="p-3 sm:p-4 rounded-xl bg-[#060911] border border-cyan-500/30 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-300 border-b border-slate-800 pb-2">
          <span className="flex items-center gap-1.5 font-bold text-cyan-400 text-[11px] sm:text-xs">
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>Configuração de Pesos (Soma = 100%):</span>
          </span>
          <button
            type="button"
            onClick={() => {
              handleLayerWeightChange(14);
            }}
            className="text-[10px] text-slate-400 hover:text-cyan-300 underline self-start sm:self-auto"
          >
            Restaurar Padrão (14/86)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Layer 1 & 2 weight input */}
          <div className="space-y-1 bg-[#0a0f1d]/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="flex justify-between text-[10.5px]">
              <span className="text-indigo-300 font-bold truncate">Peso Camada 1 + 2 (Book/Pareto):</span>
              <span className="text-white font-bold shrink-0">{weightLayer1And2}%</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={weightLayer1And2}
                onChange={(e) => handleLayerWeightChange(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={weightLayer1And2}
                onChange={(e) => handleLayerWeightChange(Number(e.target.value))}
                className="w-14 bg-[#0a0f1d] border border-indigo-500/50 rounded py-0.5 px-1 text-center text-white font-mono text-xs font-bold"
              />
            </div>
          </div>

          {/* Technical Score weight input */}
          <div className="space-y-1 bg-[#0a0f1d]/60 p-2.5 rounded-lg border border-slate-800/80">
            <div className="flex justify-between text-[10.5px]">
              <span className="text-cyan-300 font-bold truncate">Peso Indicadores Técnicos BTC:</span>
              <span className="text-white font-bold shrink-0">{weightTechnical}%</span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={weightTechnical}
                onChange={(e) => handleTechWeightChange(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <input 
                type="number" 
                min="0" 
                max="100" 
                value={weightTechnical}
                onChange={(e) => handleTechWeightChange(Number(e.target.value))}
                className="w-14 bg-[#0a0f1d] border border-cyan-500/50 rounded py-0.5 px-1 text-center text-white font-mono text-xs font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Weighting Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Layer Pillar */}
        <div className="p-3 rounded-xl bg-[#060911] border border-indigo-500/30 space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60 truncate">
              CAMADA 1 + 2 ({weightLayer1And2}%)
            </span>
            <span className="text-white font-bold text-xs sm:text-sm shrink-0">{layer1And2Score} <span className="text-[9.5px] text-slate-400">/100</span></span>
          </div>
          <p className="text-slate-300 font-sans text-[10.5px] leading-relaxed line-clamp-2">
            Ponderação holística (Fundamentos, Sentimento, Book 100 níveis, Tape Reading) &amp; Pareto 80/20.
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${layer1And2Score}%` }} />
          </div>
        </div>

        {/* Technical Pillar */}
        <div className="p-3 rounded-xl bg-[#060911] border border-cyan-500/30 space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60 truncate">
              TÉCNICO BTC ({weightTechnical}%)
            </span>
            <span className="text-white font-bold text-xs sm:text-sm shrink-0">{technicalScore60} <span className="text-[9.5px] text-slate-400">/100</span></span>
          </div>
          <p className="text-slate-300 font-sans text-[10.5px] leading-relaxed line-clamp-2">
            Score Resumo dos 8 Indicadores Técnicos em tempo real do BTC ({btcTechnicalScoreSummary.consensus}).
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full rounded-full transition-all duration-300" style={{ width: `${technicalScore60}%` }} />
          </div>
        </div>

        {/* Master Synthesis Score */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-[#0c1626] to-[#070b14] border border-emerald-500/40 space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9.5px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 truncate">
              SCORE MASTER PONDERADO
            </span>
            <span className="text-emerald-400 font-black text-sm sm:text-base shrink-0">{masterWeightedScore} <span className="text-[9.5px] text-slate-400">/100</span></span>
          </div>
          <div className="text-[10.5px] text-slate-300 font-sans truncate">
            Fator: <strong className="text-white">{btcTechnicalScoreSummary.dominantFactor}</strong>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300" style={{ width: `${masterWeightedScore}%` }} />
          </div>
        </div>

      </div>

      {/* Actionable Trigger Details */}
      <div className="p-3 sm:p-4 rounded-xl bg-[#05070e] border border-slate-800 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10.5px] text-slate-300 border-b border-slate-800/80 pb-2">
          <span className="flex items-center gap-1.5 font-bold text-cyan-300">
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Gatilhos Operacionais Derivados da Confluência Ponderada:</span>
          </span>
          <span className="text-slate-400 shrink-0">Risco / Retorno: <strong className="text-emerald-400">1 : 3.2</strong></span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          <div className="p-2 bg-[#0a0f1d] rounded-lg border border-slate-800">
            <span className="text-[9.5px] text-slate-400 block truncate">Gatilho de Entrada</span>
            <strong className="text-white text-xs font-mono mt-0.5 block truncate">${confluenceResult.executionPlan.entryPriceTrigger}</strong>
          </div>
          <div className="p-2 bg-[#0a0f1d] rounded-lg border border-emerald-900/40">
            <span className="text-[9.5px] text-emerald-400 block truncate">Take Profit 1 (TP1)</span>
            <strong className="text-emerald-300 text-xs font-mono mt-0.5 block truncate">${confluenceResult.executionPlan.takeProfit1}</strong>
          </div>
          <div className="p-2 bg-[#0a0f1d] rounded-lg border border-emerald-900/40">
            <span className="text-[9.5px] text-emerald-400 block truncate">Take Profit 2 (TP2)</span>
            <strong className="text-emerald-300 text-xs font-mono mt-0.5 block truncate">${confluenceResult.executionPlan.takeProfit2}</strong>
          </div>
          <div className="p-2 bg-[#0a0f1d] rounded-lg border border-emerald-900/40">
            <span className="text-[9.5px] text-emerald-400 block truncate">Take Profit 3 (TP3)</span>
            <strong className="text-emerald-300 text-xs font-mono mt-0.5 block truncate">${confluenceResult.executionPlan.takeProfit3}</strong>
          </div>
          <div className="p-2 bg-[#0a0f1d] rounded-lg border border-rose-900/40 col-span-2 sm:col-span-1">
            <span className="text-[9.5px] text-rose-400 block truncate">Stop Loss (SL)</span>
            <strong className="text-rose-300 text-xs font-mono mt-0.5 block truncate">${confluenceResult.executionPlan.stopLoss}</strong>
          </div>
        </div>
      </div>

    </div>
  );
}
