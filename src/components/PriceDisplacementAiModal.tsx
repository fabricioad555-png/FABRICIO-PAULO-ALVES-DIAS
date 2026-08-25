import React, { useState, useEffect } from 'react';
import { CryptoMention } from '../types';
import { 
  X, Activity, ArrowRight, TrendingUp, TrendingDown, 
  Layers, Scale, Target, Zap, ShieldAlert, Cpu, RefreshCw
} from 'lucide-react';
import { generateLocalHftFlowAnalysis, analyzeTimesAndTradesTapeAi, HftFlowAnalysisResult } from '../services/hftFlowAnalysisService';
import { generate100NegotiationTradesForCoin } from '../services/cryptoTapeDbService';
import { generateLiveOrderFlowData } from '../services/orderFlowDataService';

interface PriceDisplacementAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  crypto?: CryptoMention | { symbol: string; priceUsd: number; name?: string };
  allCryptos?: any[];
}

export const PriceDisplacementAiModal: React.FC<PriceDisplacementAiModalProps> = ({
  isOpen,
  onClose,
  crypto,
  allCryptos
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(crypto?.symbol || 'BTC');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<HftFlowAnalysisResult | null>(null);

  const activeCrypto = allCryptos?.find((c) => c.symbol === selectedSymbol) || crypto || { symbol: selectedSymbol, priceUsd: 1000, name: selectedSymbol };

  useEffect(() => {
    if (crypto) setSelectedSymbol(crypto.symbol);
  }, [crypto]);

  useEffect(() => {
    if (isOpen) {
      calculateInstantDisplacement();
    }
  }, [isOpen, selectedSymbol]);

  const calculateInstantDisplacement = () => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      try {
        const orderFlow = generateLiveOrderFlowData(activeCrypto as any);
        const cryptoObj = {
          symbol: activeCrypto.symbol,
          name: activeCrypto.name || activeCrypto.symbol,
          priceUsd: activeCrypto.priceUsd,
          takeProfit1: activeCrypto.priceUsd * 1.05,
          recommendedAction: 'COMPRA'
        } as any;

        const tapeRows = generate100NegotiationTradesForCoin(cryptoObj);
        
        // Pass tapeRows as the 3rd argument, orderFlow (bookData) as the 4th
        const fullAnalysis = generateLocalHftFlowAnalysis(activeCrypto.symbol, activeCrypto.priceUsd, tapeRows, orderFlow as any);
        
        const tapeAi = analyzeTimesAndTradesTapeAi(activeCrypto.symbol, activeCrypto.priceUsd, tapeRows);
        fullAnalysis.tapeAiAnalysis = tapeAi;
        
        setAnalysisResult(fullAnalysis);
      } catch (err) {
        console.error("Erro na leitura de deslocamento", err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 800);
  };

  if (!isOpen) return null;

  const renderDisplacementSignal = () => {
    if (!analysisResult) return null;

    const bookSig = analysisResult.orderBookReading.signal.signal; 
    const tapeSig = analysisResult.tapeAiAnalysis?.dominantAggression; 

    let finalSignal = "NEUTRO";
    let finalColor = "amber";
    let actionDesc = "Aguardar melhor confluência de fluxo e intenção agressiva.";

    if ((bookSig === 'COMPRA' || bookSig === ('FORTE_COMPRA' as any)) && tapeSig === 'BUY') {
      finalSignal = "COMPRA FORTE (LONG)";
      finalColor = "emerald";
      actionDesc = "Deslocamento Altista Eminente. Forte demanda no Livro somada à agressão compradora validam pressão compradora real.";
    } else if ((bookSig === 'VENDA' || bookSig === ('FORTE_VENDA' as any)) && tapeSig === 'SELL') {
      finalSignal = "VENDA FORTE (SHORT)";
      finalColor = "rose";
      actionDesc = "Deslocamento Baixista Eminente. Forte oferta (barreira) no Livro somada à agressão vendedora validam derrubada de preço.";
    } else if (bookSig === 'COMPRA' && tapeSig === 'SELL') {
      finalSignal = "ABSORÇÃO COMPRADORA";
      finalColor = "cyan";
      actionDesc = "Preço está caindo no Tape (agressão vendedora), mas a forte demanda no Book (Bids) absorverá a queda. Possível repique.";
    } else if (bookSig === 'VENDA' && tapeSig === 'BUY') {
      finalSignal = "ABSORÇÃO VENDEDORA";
      finalColor = "purple";
      actionDesc = "Preço está subindo no Tape, mas a forte oferta no Book (Asks) limitará o teto. Possível rejeição em breve.";
    }

    return (
      <div className={`p-5 rounded-xl border border-${finalColor}-500/40 bg-${finalColor}-950/20 mb-6 shadow-lg shadow-${finalColor}-900/20`}>
        <div className="flex items-center gap-3 mb-3">
          <Zap className={`w-6 h-6 text-${finalColor}-400 animate-pulse`} />
          <h4 className={`text-lg font-black text-${finalColor}-300 tracking-wide uppercase`}>
            Sinal de Deslocamento: {finalSignal}
          </h4>
        </div>
        <p className="text-sm font-mono text-slate-300 leading-relaxed mb-4">
          {actionDesc}
        </p>
        <div className={`bg-black/40 p-3 rounded-lg border border-${finalColor}-500/20 text-xs font-mono text-${finalColor}-200/90`}>
          <strong>Síntese IA:</strong> {analysisResult.aiSynthesizedRecommendation}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#080b12] border border-slate-800/80 rounded-xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[95vh] overflow-y-auto scrollbar-thin">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-900/60 flex items-center justify-center text-blue-400 shadow-lg border border-blue-500/30">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-white flex items-center gap-2">
                IA de Deslocamento de Preço
              </h3>
              <p className="text-xs text-blue-400 font-mono mt-0.5">
                Cálculo Instantâneo de Oferta/Demanda e Agressão
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase">Ativo:</span>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-slate-900 text-white font-bold font-mono border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {allCryptos?.map(c => (
                <option key={c.symbol} value={c.symbol}>{c.symbol} - {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Activity className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-blue-300 font-mono text-sm uppercase tracking-widest animate-pulse">
              Cruzando Book de Ofertas e Times & Trades...
            </p>
          </div>
        ) : analysisResult ? (
          <div className="space-y-6">
            
            {/* Bloco de Síntese Final */}
            {renderDisplacementSignal()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Oferta vs Demanda (Order Book) */}
              <div className="bg-[#0d121c] p-4 rounded-xl border border-slate-800/60">
                <div className="flex items-center gap-2 mb-4">
                  <Scale className="w-4 h-4 text-slate-400" />
                  <h4 className="font-bold text-sm text-slate-200">1. OFERTA vs DEMANDA (LIVRO)</h4>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-800/50">
                    <span className="text-xs text-slate-400">Pressão Direcional</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      analysisResult.orderBookReading.signal.signal === 'COMPRA' ? 'bg-emerald-900/50 text-emerald-300' :
                      analysisResult.orderBookReading.signal.signal === 'VENDA' ? 'bg-rose-900/50 text-rose-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {analysisResult.orderBookReading.imbalance.pressureDirection}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-800/50">
                    <span className="text-xs text-slate-400">Desequilíbrio de Lotes</span>
                    <span className="text-xs font-mono text-indigo-300">
                      {analysisResult.orderBookReading.imbalance.ratioText}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg">
                      <span className="text-[10px] text-emerald-400/80 uppercase block mb-1">Parede de Compra (Demanda)</span>
                      <span className="font-mono text-emerald-300 font-bold block">{analysisResult.orderBookReading.support.priceFormatted}</span>
                      <span className="text-[10px] text-emerald-400/60">{analysisResult.orderBookReading.support.volumeFormatted} USD</span>
                    </div>
                    <div className="bg-rose-950/20 border border-rose-500/20 p-2.5 rounded-lg">
                      <span className="text-[10px] text-rose-400/80 uppercase block mb-1">Parede de Venda (Oferta)</span>
                      <span className="font-mono text-rose-300 font-bold block">{analysisResult.orderBookReading.resistance.priceFormatted}</span>
                      <span className="text-[10px] text-rose-400/60">{analysisResult.orderBookReading.resistance.volumeFormatted} USD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Leitura Real de Preço (Times & Trades) */}
              <div className="bg-[#0d121c] p-4 rounded-xl border border-slate-800/60">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <h4 className="font-bold text-sm text-slate-200">2. LEITURA REAL (TIMES & TRADES)</h4>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-800/50">
                    <span className="text-xs text-slate-400">Direção Atual do Preço</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                      analysisResult.tapeAiAnalysis?.dominantAggression === 'BUY' ? 'bg-emerald-900/50 text-emerald-300' :
                      analysisResult.tapeAiAnalysis?.dominantAggression === 'SELL' ? 'bg-rose-900/50 text-rose-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {analysisResult.tapeAiAnalysis?.dominantAggression === 'BUY' && <TrendingUp className="w-3 h-3" />}
                      {analysisResult.tapeAiAnalysis?.dominantAggression === 'SELL' && <TrendingDown className="w-3 h-3" />}
                      {analysisResult.tapeAiAnalysis?.dominantAggression === 'BUY' ? 'SUBINDO' :
                       analysisResult.tapeAiAnalysis?.dominantAggression === 'SELL' ? 'CAINDO' : 'LATERAL'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-slate-800/50">
                    <span className="text-xs text-slate-400">Varredura de Agressão</span>
                    <span className={`text-[11px] font-mono ${
                      analysisResult.tapeAiAnalysis?.buyerEscalation.status === 'COMPRADOR_COMPRANDO_MAIS_CARO' ? 'text-emerald-400' :
                      analysisResult.tapeAiAnalysis?.sellerEscalation.status === 'VENDEDOR_VENDENDO_MAIS_BARATO' ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {analysisResult.tapeAiAnalysis?.buyerEscalation.status === 'COMPRADOR_COMPRANDO_MAIS_CARO' ? 'COMPRADOR PAGANDO CARO' :
                       analysisResult.tapeAiAnalysis?.sellerEscalation.status === 'VENDEDOR_VENDENDO_MAIS_BARATO' ? 'VENDEDOR VENDENDO BARATO' : 'EQUILÍBRIO'}
                    </span>
                  </div>
                  
                  {analysisResult.tapeAiAnalysis?.executionGate.activeBiasMessage && (
                    <div className="bg-blue-950/20 border border-blue-500/20 p-2.5 rounded-lg mt-3">
                      <span className="text-[10px] text-blue-400/80 uppercase block mb-1">Rastreador HFT de Tape</span>
                      <p className="text-xs text-blue-200/90 leading-relaxed font-mono">
                        {analysisResult.tapeAiAnalysis.executionGate.activeBiasMessage}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-2 border-t border-slate-800/50">
              <button 
                onClick={calculateInstantDisplacement}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition"
              >
                <RefreshCw className="w-4 h-4" />
                Recalcular Agora
              </button>
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
};
