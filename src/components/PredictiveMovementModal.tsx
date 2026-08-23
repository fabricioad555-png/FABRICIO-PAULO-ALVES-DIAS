import React, { useState, useEffect } from 'react';
import { CryptoMention } from '../types';
import { 
  X, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Clock, 
  Flame, 
  Loader2,
  Zap
} from 'lucide-react';

interface PredictiveMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  crypto?: CryptoMention;
  allCryptos: CryptoMention[];
}

export const PredictiveMovementModal: React.FC<PredictiveMovementModalProps> = ({
  isOpen,
  onClose,
  crypto,
  allCryptos,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(crypto?.symbol || allCryptos[0]?.symbol || 'BTC');
  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeCrypto = allCryptos.find((c) => c.symbol === selectedSymbol) || crypto || allCryptos[0];

  useEffect(() => {
    if (crypto) {
      setSelectedSymbol(crypto.symbol);
    }
  }, [crypto]);

  useEffect(() => {
    if (isOpen && activeCrypto) {
      generatePredictionReport(activeCrypto);
    }
  }, [isOpen, selectedSymbol]);

  const generatePredictionReport = async (c: CryptoMention) => {
    setIsLoading(true);
    setErrorMsg(null);
    setReport(null);

    try {
      const response = await fetch('/api/predict-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: c.symbol,
          coinName: c.name,
          priceUsd: c.priceUsd,
          priceBrl: c.priceBrl || (c.priceUsd * 5.68),
          change24h: c.change24h,
          forumContext: `Fórum ativo: ${c.topForum}. Pontuação de sentimento: ${c.sentimentScore}. Cotação Real: US$ ${c.priceUsd} (R$ ${c.priceBrl || (c.priceUsd * 5.68)}). Volume de menções 24h: ${c.mentions24h} com variação de ${c.mentionsChange24h}%. Gatilho principal: ${c.keyCatalyst}`,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao gerar relatório preditivo da IA.');
      }

      setReport(data.report);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao comunicar com o modelo Gemini IA.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0a0a0b] border border-slate-800/80 rounded-xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto scrollbar-thin">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-serif italic text-white flex items-center gap-2">
              Relatório Preditivo de Movimentação IA
            </h3>
            <p className="text-xs font-mono text-slate-400">
              Análise Ponderada do Sentimento dos Fóruns x Momentum de Mercado
            </p>
          </div>
        </div>

        {/* Crypto Selector Pills */}
        <div className="mb-5 font-mono text-xs">
          <label className="text-[10px] uppercase text-slate-400 mb-2 block">
            Selecione a Criptomoeda para Previsão Detalhada:
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {allCryptos.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedSymbol(item.symbol)}
                className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedSymbol === item.symbol
                    ? 'bg-indigo-600 text-white border-indigo-400 font-bold'
                    : 'bg-[#12141a] text-slate-300 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <span>${item.symbol}</span>
                <span className="text-[10px] opacity-70">
                  ({item.mentionsChange24h >= 0 ? '+' : ''}{item.mentionsChange24h}%)
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 text-center space-y-3 bg-[#12141a] rounded-xl border border-slate-800">
            <Loader2 className="h-10 w-10 text-indigo-400 animate-spin mx-auto" />
            <h4 className="text-sm font-serif italic text-slate-200">
              Processando sentimento dos fóruns para ${activeCrypto?.symbol}...
            </h4>
            <p className="text-xs font-mono text-slate-400 max-w-sm mx-auto">
              Cruzando dados da Binance Square, TradingView e Reddit com o modelo preditivo Gemini 3.6 Flash.
            </p>
          </div>
        )}

        {/* Error State */}
        {errorMsg && !isLoading && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => generatePredictionReport(activeCrypto)}
              className="px-3 py-1 bg-rose-800 text-white font-bold rounded hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Report Content */}
        {report && !isLoading && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* Top Stat Box */}
            <div className="bg-[#12141a] border border-slate-800/80 rounded-xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-serif italic text-white">${report.symbol}</span>
                    <span className="text-xs font-mono text-slate-400">({report.coinName})</span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="flex items-center gap-1 font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800">
                      <Target className="h-3.5 w-3.5" />
                      Direção: {report.prediction?.direction}
                    </span>

                    <span className="flex items-center gap-1 font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800">
                      <Zap className="h-3.5 w-3.5" />
                      Projeção: {report.prediction?.expectedMovePercentage}
                    </span>

                    <span className="flex items-center gap-1 font-semibold text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-800">
                      <Clock className="h-3.5 w-3.5" />
                      Horizonte: {report.prediction?.horizon}
                    </span>
                  </div>
                </div>

                {/* Confidence Gauge Box */}
                <div className="bg-[#0a0a0b] p-3.5 rounded-xl border border-slate-800 text-center sm:text-right shrink-0">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                    Confiança IA
                  </span>
                  <div className="text-2xl font-black text-indigo-400 font-mono">
                    {report.prediction?.confidenceLevel}%
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                    Risco: <strong className="text-amber-300">{report.prediction?.riskLevel}</strong>
                  </span>
                </div>
              </div>

              {/* Real Market Price vs Predicted Target Box */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                <div className="bg-[#0a0a0b] p-3 rounded-lg border border-indigo-500/30">
                  <div className="flex items-center justify-between text-[10px] uppercase text-indigo-300 font-bold mb-1">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Valor Real de Mercado
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] ${activeCrypto?.change24h >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                      {activeCrypto?.change24h >= 0 ? '+' : ''}{activeCrypto?.change24h}% 24h
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-100">
                    US$ {activeCrypto?.priceUsd < 1 ? activeCrypto?.priceUsd.toFixed(4) : activeCrypto?.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    R$ {(activeCrypto?.priceBrl || (activeCrypto?.priceUsd * 5.68)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BRL
                  </div>
                </div>

                <div className="bg-[#0a0a0b] p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase text-amber-300 font-bold block mb-1">
                    🎯 Faixa de Preço Alvo Prevista (IA)
                  </span>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {report.prediction?.targetPriceRange}
                  </div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Meta de projeção para {report.prediction?.horizon}
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Sentiment Summary */}
            <div className="bg-[#12141a] border border-slate-800/60 rounded-xl p-4">
              <h4 className="text-xs font-serif italic text-slate-200 mb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                Síntese do Sentimento nos Fóruns
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {report.sentimentSummary}
              </p>
            </div>

            {/* Bullish Drivers vs Bearish Risks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-4">
                <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Catalisadores Touro (Bullish)
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-200 font-mono">
                  {report.bullishDrivers?.map((driver: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{driver}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-rose-950/20 border border-rose-800/40 rounded-xl p-4">
                <h4 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4" />
                  Riscos Urso / FUD
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-200 font-mono">
                  {report.bearishRisks?.map((risk: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">⚠️</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Forum Breakdown */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider mb-2">
                Destaques por Corretora & Comunidade
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.forumBreakdown?.map((fb: any, idx: number) => (
                  <div key={idx} className="bg-[#12141a] border border-slate-800/60 rounded-xl p-3 text-xs space-y-1 font-mono">
                    <div className="flex items-center justify-between font-bold text-slate-200">
                      <span>{fb.sourceName}</span>
                      <span className="text-[10px] text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                        {fb.sentiment}
                      </span>
                    </div>
                    <p className="text-slate-300 italic text-[11px] font-sans">
                      "{fb.keyQuote}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Alignment & Trader Recommendation */}
            <div className="bg-[#12141a] border border-indigo-500/30 rounded-xl p-4 space-y-2 font-mono">
              <div className="text-xs text-indigo-200">
                <strong className="text-indigo-300 font-serif italic block mb-1">
                  Alinhamento Análise Técnica x Sentimento:
                </strong>
                <span>{report.technicalSentimentAlignment}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 text-xs text-emerald-300">
                <strong className="text-emerald-400 font-serif italic block mb-1">
                  🎯 Recomendação Tática da IA para o Trader:
                </strong>
                <span>{report.traderRecommendation}</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

