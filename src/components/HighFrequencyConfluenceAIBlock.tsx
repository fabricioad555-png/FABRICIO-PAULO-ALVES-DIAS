import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Zap, 
  BrainCircuit, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sliders, 
  Play, 
  Pause, 
  Clock, 
  Award, 
  Maximize2,
  ChevronRight,
  HelpCircle,
  BarChart2,
  Lock,
  Flame,
  Radio,
  Timer,
  Compass,
  PieChart,
  Percent,
  Check,
  Crosshair
} from 'lucide-react';
import { CryptoMention, ForumPost } from '../types';
import { LiveOrderBookData } from '../types/orderFlowTypes';
import { 
  HighFrequencyConfluenceResult, 
  Layer1PrimaryPillar, 
  Top10mProfitCrypto, 
  ParetoEvaluatedCrypto,
  ParetoCriticalityAnalysis,
  ParetoLayerScoreBreakdown,
  TechnicalIndicatorsFilterConfig 
} from '../types/hftConfluenceTypes';
import { 
  fetchServerHFTConfluenceAnalysis, 
  generateLocalHFTConfluenceAnalysis,
  selectTop3HighProbabilityCryptos,
  evaluateAllCryptosForParetoAnalysis,
  generateTechnicalScoreSummary
} from '../services/hftConfluenceService';
import { ParetoWinProbabilityChart } from './ParetoWinProbabilityChart';
import { generateLiveOrderFlowData } from '../services/orderFlowDataService';
import { tradingSignalBus } from '../services/tradingSignalBus';
import { 
  getTradingAccount, 
  getPositions, 
  saveTradingAccount, 
  savePositions, 
  processConfluenceSignalForTrading,
  determineSignalSide
} from '../services/tradingExecutionService';
import { TechnicalScoreFilterController } from './TechnicalScoreFilterController';
import { TechnicalIndicatorsScoreTab } from './TechnicalIndicatorsScoreTab';
import { WeightedConfluenceSignalStatusCard } from './WeightedConfluenceSignalStatusCard';

interface HighFrequencyConfluenceAIBlockProps {
  cryptos: CryptoMention[];
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onOpenPredictionModal?: (symbol: string) => void;
  forumPosts?: ForumPost[];
}

export function HighFrequencyConfluenceAIBlock({
  cryptos,
  selectedSymbol,
  onSelectSymbol,
  onOpenPredictionModal,
  forumPosts
}: HighFrequencyConfluenceAIBlockProps) {
  // Find current active crypto
  const activeCrypto = useMemo(() => {
    return cryptos.find((c) => c.symbol.toUpperCase() === selectedSymbol.toUpperCase()) || cryptos[0];
  }, [cryptos, selectedSymbol]);

  // Technical Indicators Filter & Calibration State
  const [techFilterConfig, setTechFilterConfig] = useState<TechnicalIndicatorsFilterConfig>({
    enabledIndicators: {
      rsi: true,
      macd: true,
      ema_alignment: true,
      bollinger: true,
      stochastic: true,
      supertrend: true,
      volume_obv: true,
      atr_breakout: true
    },
    minRsiFilter: 0,
    requireEmaAlignment: false
  });
  // State for toggling architectural functioning and weighting breakdown details
  const [showFuncionamentoDetails, setShowFuncionamentoDetails] = useState<boolean>(false);
  const [isTechFilterOpen, setIsTechFilterOpen] = useState<boolean>(false);

  // Manual weight distribution for Top 3 Pondered Score: (Score Master Ponderado) x (Score Técnico da Top 3)
  const [weightMasterTop3, setWeightMasterTop3] = useState<number>(50);
  const [weightTechTop3, setWeightTechTop3] = useState<number>(50);

  const handleMasterTop3Change = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setWeightMasterTop3(clamped);
    setWeightTechTop3(100 - clamped);
  };

  const handleTechTop3Change = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setWeightTechTop3(clamped);
    setWeightMasterTop3(100 - clamped);
  };

  // Realtime tick for BTC live technical score updates
  const [btcTickCount, setBtcTickCount] = useState<number>(0);
  useEffect(() => {
    const btcTimer = setInterval(() => {
      setBtcTickCount((prev) => prev + 1);
    }, 2500); // every 2.5 seconds
    return () => clearInterval(btcTimer);
  }, []);

  // Fixed BTC crypto and its technical score summary for the Technical Indicators Score Controller (updating in real time)
  const btcCrypto = useMemo(() => {
    const baseBtc = cryptos.find((c) => c.symbol.toUpperCase() === 'BTC' || c.name.toUpperCase().includes('BITCOIN')) || cryptos[0];
    const jitterFactor = 1 + (Math.sin(btcTickCount * 0.6) * 0.001);
    const jitteredPrice = baseBtc.priceUsd * jitterFactor;
    const jitteredChange = baseBtc.change24h + (Math.cos(btcTickCount * 0.5) * 0.08);
    return {
      ...baseBtc,
      priceUsd: jitteredPrice,
      change24h: jitteredChange
    };
  }, [cryptos, btcTickCount]);

  const btcTechnicalScoreSummary = useMemo(() => {
    const isBtcBullish = btcCrypto.change24h >= 0;
    return generateTechnicalScoreSummary(btcCrypto, isBtcBullish, techFilterConfig);
  }, [btcCrypto, techFilterConfig]);

  // Fixed BTC confluence analysis for the customizable decision system
  const btcConfluenceResult = useMemo(() => {
    const btcFlow = generateLiveOrderFlowData(btcCrypto);
    return generateLocalHFTConfluenceAnalysis(btcCrypto, btcFlow, forumPosts, techFilterConfig);
  }, [btcCrypto, forumPosts, techFilterConfig]);

  // Live Microstructure Snapshot (100 levels book + tape)
  const [orderFlowData, setOrderFlowData] = useState<LiveOrderBookData>(() => generateLiveOrderFlowData(activeCrypto));
  
  // HFT Confluence State
  const [confluenceResult, setConfluenceResult] = useState<HighFrequencyConfluenceResult>(() => 
    generateLocalHFTConfluenceAnalysis(activeCrypto, orderFlowData, forumPosts, techFilterConfig)
  );
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [isAutoLiveScanning, setIsAutoLiveScanning] = useState<boolean>(true);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<string>(() => new Date().toLocaleTimeString('pt-BR'));
  const [activeSubTab, setActiveSubTab] = useState<'cockpit' | 'tech_indicators' | 'pareto_summary' | 'layer1_primary' | 'layer2_secondary' | 'thesis'>('cockpit');
  const [executionFeedback, setExecutionFeedback] = useState<{ message: string; isSuccess: boolean } | null>(null);

  const layer1And2Score = Math.round((confluenceResult.primaryAnalysis.overallPrimaryScore + confluenceResult.confluenceScorePct) / 2);
  // ----------------------------------------------------------------------------------
  // 10-MINUTE CYCLE: TOP 3 CRYPTOS WITH HIGHEST PROFIT PROBABILITY (PARETO CRITICALITY)
  // ----------------------------------------------------------------------------------
  const allParetoEvaluatedCryptos = useMemo<ParetoEvaluatedCrypto[]>(() => {
    return evaluateAllCryptosForParetoAnalysis(cryptos, forumPosts, techFilterConfig);
  }, [cryptos, forumPosts, techFilterConfig]);

  const [top3ProfitCryptos, setTop3ProfitCryptos] = useState<Top10mProfitCrypto[]>(() => 
    selectTop3HighProbabilityCryptos(cryptos, forumPosts, techFilterConfig)
  );

  useEffect(() => {
    setTop3ProfitCryptos(allParetoEvaluatedCryptos.slice(0, 3));
  }, [allParetoEvaluatedCryptos]);

  const [countdownSeconds, setCountdownSeconds] = useState<number>(600); // 10 minutes = 600s
  const [isRefreshingTop3, setIsRefreshingTop3] = useState<boolean>(false);

  // Function to refresh Top 3 selection
  const refreshTop3Selection = useCallback(() => {
    setIsRefreshingTop3(true);
    try {
      const allEvaluated = evaluateAllCryptosForParetoAnalysis(cryptos, forumPosts, techFilterConfig);
      setTop3ProfitCryptos(allEvaluated.slice(0, 3));
      setCountdownSeconds(600);
    } finally {
      setTimeout(() => setIsRefreshingTop3(false), 500);
    }
  }, [cryptos, forumPosts, techFilterConfig]);
  const technicalScore60 = btcTechnicalScoreSummary.overallScore;
  const masterWeightedScore = Math.round(layer1And2Score * 0.40 + technicalScore60 * 0.60);

  // Interactive Technical Indicators Filter Helpers
  const handleToggleIndicator = useCallback((id: string) => {
    setTechFilterConfig((prev) => {
      const next: TechnicalIndicatorsFilterConfig = {
        ...prev,
        enabledIndicators: {
          ...prev.enabledIndicators,
          [id]: !(prev.enabledIndicators?.[id] ?? true)
        }
      };
      setTop3ProfitCryptos(selectTop3HighProbabilityCryptos(cryptos, forumPosts, next));
      setConfluenceResult(generateLocalHFTConfluenceAnalysis(activeCrypto, orderFlowData, forumPosts, next));
      return next;
    });
  }, [cryptos, forumPosts, activeCrypto, orderFlowData]);

  const handleChangeMinRsi = useCallback((minRsi: number) => {
    setTechFilterConfig((prev) => {
      const next: TechnicalIndicatorsFilterConfig = {
        ...prev,
        minRsiFilter: minRsi
      };
      setTop3ProfitCryptos(selectTop3HighProbabilityCryptos(cryptos, forumPosts, next));
      setConfluenceResult(generateLocalHFTConfluenceAnalysis(activeCrypto, orderFlowData, forumPosts, next));
      return next;
    });
  }, [cryptos, forumPosts, activeCrypto, orderFlowData]);

  const handleToggleRequireEma = useCallback((requireEma: boolean) => {
    setTechFilterConfig((prev) => {
      const next: TechnicalIndicatorsFilterConfig = {
        ...prev,
        requireEmaAlignment: requireEma
      };
      setTop3ProfitCryptos(selectTop3HighProbabilityCryptos(cryptos, forumPosts, next));
      setConfluenceResult(generateLocalHFTConfluenceAnalysis(activeCrypto, orderFlowData, forumPosts, next));
      return next;
    });
  }, [cryptos, forumPosts, activeCrypto, orderFlowData]);

  const handleResetTechFilters = useCallback(() => {
    const defaultConfig: TechnicalIndicatorsFilterConfig = {
      enabledIndicators: {
        rsi: true,
        macd: true,
        ema_alignment: true,
        bollinger: true,
        stochastic: true,
        supertrend: true,
        obv: true,
        atr: true
      },
      minRsiFilter: 30,
      requireEmaAlignment: false
    };
    setTechFilterConfig(defaultConfig);
    setTop3ProfitCryptos(selectTop3HighProbabilityCryptos(cryptos, forumPosts, defaultConfig));
    setConfluenceResult(generateLocalHFTConfluenceAnalysis(activeCrypto, orderFlowData, forumPosts, defaultConfig));
  }, [cryptos, forumPosts, activeCrypto, orderFlowData]);

  // 10-Minute Countdown Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Re-evaluate Top 3 when timer expires
          refreshTop3Selection();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshTop3Selection]);

  // Format countdown mm:ss
  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleExecuteTargetCoinInAutoTrader = useCallback((targetCrypto: CryptoMention, confluenceData: HighFrequencyConfluenceResult) => {
    setExecutionFeedback({
      message: 'Disparando ordem no Auto-Trader (Simulação HFT)...',
      isSuccess: true
    });
    
    // In a real integration, this would call a unified context or event bus 
    // to inform the main auto-trader component to execute.
    // For now, we simulate success response back to the user.
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('hft_manual_execution_trigger', {
        detail: {
          crypto: targetCrypto,
          confluence: confluenceData
        }
      });
      window.dispatchEvent(event);
    }

    setTimeout(() => {
      setExecutionFeedback({
        message: 'Execução concluída! Posição listada no Painel de Controle.',
        isSuccess: true
      });
    }, 1200);

    setTimeout(() => {
      setExecutionFeedback(null);
    }, 4500);
  }, []);

  // Manual Trigger to Execute Active Setup in Auto-Trader Demo
  const handleExecuteSetupInAutoTrader = useCallback(() => {
    handleExecuteTargetCoinInAutoTrader(activeCrypto, confluenceResult);
  }, [handleExecuteTargetCoinInAutoTrader, activeCrypto, confluenceResult]);

  // Trigger high frequency scan
  const handleRunHFTScan = useCallback(async (customCrypto?: CryptoMention) => {
    const targetCoin = customCrypto || activeCrypto;
    setIsLoadingAi(true);
    
    // Refresh local order flow snapshot
    const freshFlow = generateLiveOrderFlowData(targetCoin);
    setOrderFlowData(freshFlow);

    try {
      const res = await fetchServerHFTConfluenceAnalysis(targetCoin, freshFlow, forumPosts, techFilterConfig);
      setConfluenceResult(res);
      setLastScanTimestamp(new Date().toLocaleTimeString('pt-BR'));
      tradingSignalBus.emit(res);
    } catch (err) {
      console.warn('Fallback to local HFT analysis:', err);
      const localRes = generateLocalHFTConfluenceAnalysis(targetCoin, freshFlow, forumPosts, techFilterConfig);
      setConfluenceResult(localRes);
      setLastScanTimestamp(new Date().toLocaleTimeString('pt-BR'));
      tradingSignalBus.emit(localRes);
    } finally {
      setIsLoadingAi(false);
    }
  }, [activeCrypto, forumPosts, techFilterConfig]);

  // Run scan when selected symbol changes
  useEffect(() => {
    handleRunHFTScan(activeCrypto);
  }, [activeCrypto.symbol, activeCrypto.priceUsd]);

  // Auto-scan cycle every 4.5 seconds for High-Frequency responsiveness (Local Flow & Background Emit)
  useEffect(() => {
    if (!isAutoLiveScanning) return;

    const interval = setInterval(() => {
      // Re-generate local order flow
      const freshFlow = generateLiveOrderFlowData(activeCrypto);
      setOrderFlowData(freshFlow);

      // Perform local analysis for instant feedback
      const localRes = generateLocalHFTConfluenceAnalysis(activeCrypto, freshFlow, forumPosts, techFilterConfig);
      setConfluenceResult(localRes);
      
      // Emit to trading bus for auto-trader consumption
      tradingSignalBus.emit(localRes);
    }, 4500);

    return () => clearInterval(interval);
  }, [isAutoLiveScanning, activeCrypto, forumPosts, techFilterConfig]);

  // Master Definitive AI Signal Update every 10 minutes (600000 ms)
  useEffect(() => {
    if (!isAutoLiveScanning) return;

    const interval = setInterval(() => {
      handleRunHFTScan(activeCrypto);
      refreshTop3Selection();
    }, 600000);

    return () => clearInterval(interval);
  }, [isAutoLiveScanning, activeCrypto, handleRunHFTScan, refreshTop3Selection]);

  // Computed styles based on final signal
  const isBuySignal = confluenceResult.finalSignal.includes('COMPRA') || confluenceResult.finalSignal.includes('LONG');
  const isSellSignal = confluenceResult.finalSignal.includes('VENDA') || confluenceResult.finalSignal.includes('SHORT');
  const pareto = confluenceResult.paretoCriticality;

  return (
    <div className="bg-[#0b0c10] border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-indigo-950/20 space-y-6 relative overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className={`absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none ${isBuySignal ? 'bg-emerald-600/10' : 'bg-rose-600/10'}`} />

      {/* Main Header & Controls */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-900 to-cyan-950 border border-indigo-500/50 text-cyan-300 shadow-lg shadow-indigo-950/50">
            <Zap className="h-6 w-6 animate-pulse text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-xl font-mono font-bold text-white tracking-wide flex items-center gap-2">
                IA de Alta Frequência & Confluência Multi-Camadas
              </h2>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                <BrainCircuit className="w-3 h-3 text-cyan-300" /> Motor Quântico & Pareto 80/20
              </span>
            </div>
            <p className="text-xs font-sans text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Ponderação holística da <strong className="text-slate-200">Camada 1</strong> (Fundamentalista, Sentimental, Indicadores Técnicos, Book & Tape Inicial) com validação mandatória na <strong className="text-slate-200">Camada 2</strong> (Book 100 Níveis & Times & Trades), sintetizando <strong className="text-cyan-300">Pareto de Criticidade</strong> e seleção de <strong className="text-emerald-300">Top 3 Criptos de Maior Probabilidade</strong>.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={() => setShowFuncionamentoDetails(!showFuncionamentoDetails)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 border border-cyan-500/50 shadow-md transition"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showFuncionamentoDetails ? 'Ocultar Detalhes de Funcionamento' : '📖 Detalhes de Funcionamento & Ponderação (40%/60%)'}</span>
          </button>

          {/* Auto Scan Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoLiveScanning(!isAutoLiveScanning)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
              isAutoLiveScanning
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/60'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
            }`}
          >
            {isAutoLiveScanning ? <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> : <Pause className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isAutoLiveScanning ? 'Auto-Scan HFT (ON)' : 'Auto-Scan Pausado'}</span>
          </button>

          {/* Trigger Scan Button */}
          <button
            type="button"
            onClick={() => handleRunHFTScan()}
            disabled={isLoadingAi}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-2 border border-cyan-400/40 shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-100 ${isLoadingAi ? 'animate-spin' : ''}`} />
            <span>{isLoadingAi ? 'Sintetizando Confluência...' : 'Executar Varredura HFT'}</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* COLLAPSIBLE FUNCTIONING & WEIGHTING BREAKDOWN DETAILS (40% / 60%) */}
      {/* ========================================================================= */}
      {showFuncionamentoDetails && (
        <div className="p-5 bg-gradient-to-br from-[#0c1322] via-[#090d16] to-[#0c1322] rounded-2xl border-2 border-cyan-500/50 shadow-2xl space-y-4 animate-fade-in text-xs font-mono">
          <div className="flex items-center justify-between border-b border-cyan-900/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Arquitetura &amp; Funcionamento da Confluência Multi-Camadas (Ponderação 40% / 60%)</h4>
                <p className="text-[11px] font-sans text-slate-400">Detalhamento técnico da distribuição de pesos e do motor quântico de alta frequência.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowFuncionamentoDetails(false)}
              className="text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 text-[11px]"
            >
              Fechar ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 40% WEIGHT BLOCK */}
            {/* 40% WEIGHT BLOCK */}
            <div className="p-4 bg-[#070b14] rounded-xl border border-indigo-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/40">
                  40% DE PESO GLOBAL
                </span>
                <span className="text-cyan-400 font-bold">Camada 1 + Camada 2 &amp; Pareto</span>
              </div>
              <p className="text-slate-300 font-sans leading-relaxed text-[11.5px]">
                Ponderação holística da <strong className="text-white">Camada 1</strong> (Fundamentalista 15%, Sentimental 15%, Indicadores Técnicos 20%, Book &amp; Tape Inicial 15%) com validação mandatória na <strong className="text-white">Camada 2</strong> (Book de 100 Níveis 15% &amp; Times &amp; Trades Tape Reading 20%), sintetizando o <strong className="text-cyan-300">Princípio de Pareto de Criticidade (80/20)</strong> e a seleção automática das <strong className="text-emerald-300">Top 3 Criptomoedas com Maior Probabilidade de Lucro (10m)</strong>.
              </p>
              <ul className="space-y-1 text-slate-400 font-sans text-[11px] list-disc list-inside pt-1">
                <li>Filtros dinâmicos e varredura quântica a cada 10 minutos.</li>
                <li>Muralhas de suporte e resistência do Book (100 níveis).</li>
                <li>CVD (Cumulative Volume Delta) e agressão de mercado (Tape Reading).</li>
              </ul>
            </div>

            {/* 60% WEIGHT BLOCK */}
            <div className="p-4 bg-[#070b14] rounded-xl border border-cyan-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-xs border border-cyan-500/40">
                  60% DE PESO GLOBAL
                </span>
                <span className="text-emerald-400 font-bold">Score Resumo dos Indicadores Técnicos (BTC)</span>
              </div>
              <p className="text-slate-300 font-sans leading-relaxed text-[11.5px]">
                Avaliação em tempo real (atualização a cada 2.5s) de <strong className="text-white">8/8 Indicadores Técnicos</strong> fixados exclusivamente para o <strong className="text-cyan-300">BTC (Bitcoin)</strong>: RSI-14, MACD Momentum, EMAs em Cascata (9/21/50/200), Bandas de Bollinger, Oscilador Estocástico, SuperTrend (ATR 3.0), Volume OBV e ATR Breakout.
              </p>
              <ul className="space-y-1 text-slate-400 font-sans text-[11px] list-disc list-inside pt-1">
                <li>Score global de 0 a 100 com consenso consolidado (COMPRA / VENDA / NEUTRO).</li>
                <li>Controlador interativo de ativação/desativação de indicadores em tempo real.</li>
                <li>Geração automática de gatilhos operacionais de alta precisão (TP1, TP2, TP3, SL).</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE TECHNICAL INDICATORS FILTER & SCORE CONTROLLER */}
      {/* ========================================================================= */}
      <TechnicalScoreFilterController
        symbol={btcCrypto.symbol}
        technicalScoreSummary={btcTechnicalScoreSummary}
        filterConfig={techFilterConfig}
        isOpen={isTechFilterOpen}
        onToggleOpen={() => setIsTechFilterOpen(!isTechFilterOpen)}
        onToggleIndicator={handleToggleIndicator}
        onChangeMinRsi={handleChangeMinRsi}
        onToggleRequireEma={handleToggleRequireEma}
        onResetFilters={handleResetTechFilters}
      />

      {/* ========================================================================= */}
      {/* WEIGHTED CONFLUENCE SIGNAL STATUS (40% / 60% ARCHITECTURE) */}
      {/* ========================================================================= */}
      <WeightedConfluenceSignalStatusCard
        confluenceResult={btcConfluenceResult}
        btcTechnicalScoreSummary={btcTechnicalScoreSummary}
        symbol="BTC"
      />


      {/* Asset Quick Selector Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-[11px] font-mono text-slate-500 uppercase font-bold pr-1 shrink-0">Ativo HFT:</span>
        {cryptos.slice(0, 8).map((coin) => {
          const isSelected = coin.symbol.toUpperCase() === activeCrypto.symbol.toUpperCase();
          return (
            <button
              key={coin.id || coin.symbol}
              type="button"
              onClick={() => onSelectSymbol(coin.symbol)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center gap-2 border shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-900/40'
                  : 'bg-[#12141a] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span>${coin.symbol}</span>
              <span className={`text-[10px] ${coin.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {coin.change24h >= 0 ? '+' : ''}{coin.change24h}%
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MASTER ACTION COCKPIT: SINAL FINAL DE ENTRADA (COMPRA OU VENDA) */}
      {/* ========================================================================= */}
      <div className={`relative z-10 rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all ${
        isBuySignal 
          ? 'bg-gradient-to-br from-[#0c1a14] via-[#0d1f19] to-[#0a0f0d] border-emerald-500/50 shadow-emerald-950/30' 
          : isSellSignal 
          ? 'bg-gradient-to-br from-[#1a0c0e] via-[#1f0d11] to-[#0f0a0c] border-rose-500/50 shadow-rose-950/30' 
          : 'bg-gradient-to-br from-[#18160d] via-[#1c180e] to-[#0f0e0a] border-amber-500/50 shadow-amber-950/30'
      }`}>
        
        {/* Signal Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl border text-xl font-bold flex items-center justify-center ${
              isBuySignal 
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' 
                : isSellSignal 
                ? 'bg-rose-500/20 border-rose-500/60 text-rose-400' 
                : 'bg-amber-500/20 border-amber-500/60 text-amber-400'
            }`}>
              {isBuySignal ? <TrendingUp className="w-7 h-7" /> : <TrendingDown className="w-7 h-7" />}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                  Sinalização Definitiva de Entrada IA (Atualiza a cada 10 min)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {confluenceResult.alignmentStatus}
                </span>
              </div>
              <h3 className={`text-xl sm:text-2xl font-mono font-black tracking-wide ${
                isBuySignal ? 'text-emerald-300' : isSellSignal ? 'text-rose-300' : 'text-amber-300'
              }`}>
                {confluenceResult.finalSignal} em ${confluenceResult.symbol}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono flex-wrap justify-end">
            {/* Confluence Percentage Badge */}
            <div className="px-4 py-2 rounded-xl bg-[#0a0a0b]/80 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase block">Confluência IA:</span>
              <span className="text-lg font-black text-cyan-300">
                {confluenceResult.confluenceScorePct}%
              </span>
            </div>

            {/* R:R Ratio Badge */}
            <div className="px-4 py-2 rounded-xl bg-[#0a0a0b]/80 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase block">Risco x Retorno:</span>
              <span className="text-lg font-black text-indigo-300">
                {confluenceResult.executionPlan.riskRewardRatio}
              </span>
            </div>

            {/* Direct Execution Button */}
            <button
              type="button"
              onClick={handleExecuteSetupInAutoTrader}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg ${
                isBuySignal 
                  ? 'bg-emerald-500 text-black hover:bg-emerald-400 font-black shadow-emerald-950/40' 
                  : isSellSignal
                  ? 'bg-rose-600 text-white hover:bg-rose-500 font-black shadow-rose-950/40'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 font-bold'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Executar Setup no Robô Demo</span>
            </button>
          </div>

        </div>

        {/* Execution Feedback Banner */}
        {executionFeedback && (
          <div className={`mt-3 p-3 rounded-xl border font-mono text-xs flex items-center gap-2 animate-fade-in ${
            executionFeedback.isSuccess 
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
              : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{executionFeedback.message}</span>
          </div>
        )}

        {/* Actionable Trade Execution Matrix (4 Key Parameter Boxes) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-5 font-mono">
          
          {/* Box 1: Preço de Gatilho */}
          <div className="p-3.5 bg-[#0a0a0b]/90 rounded-xl border border-cyan-500/40 space-y-1 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-1">
                <Target className="w-3 h-3 text-cyan-400" /> Gatilho de Entrada:
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Ação Imediata
              </span>
            </div>
            <div className="text-lg font-black text-white">
              US$ {confluenceResult.executionPlan.entryPriceTrigger.toLocaleString('en-US', { minimumFractionDigits: activeCrypto.priceUsd < 1 ? 4 : 2 })}
            </div>
            <p className="text-[10.5px] font-sans text-slate-300 leading-snug">
              {confluenceResult.executionPlan.entryCondition}
            </p>
          </div>

          {/* Box 2: Alvos Take Profit */}
          <div className="p-3.5 bg-[#0a0a0b]/90 rounded-xl border border-emerald-500/40 space-y-1 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Alvos Take Profit:
              </span>
              <span className="text-[10px] text-emerald-300 font-bold">
                {confluenceResult.executionPlan.estimatedDisplacementPct}
              </span>
            </div>
            <div className="text-xs space-y-1 font-bold">
              <div className="flex justify-between text-emerald-300">
                <span>TP1 (Curto):</span>
                <span>US$ {confluenceResult.executionPlan.takeProfit1}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>TP2 (Médio):</span>
                <span>US$ {confluenceResult.executionPlan.takeProfit2}</span>
              </div>
              <div className="flex justify-between text-emerald-200">
                <span>TP3 (Expansão):</span>
                <span>US$ {confluenceResult.executionPlan.takeProfit3}</span>
              </div>
            </div>
          </div>

          {/* Box 3: Stop Loss de Invalidação */}
          <div className="p-3.5 bg-[#0a0a0b]/90 rounded-xl border border-rose-500/40 space-y-1 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-rose-400" /> Stop Loss Invalidação:
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                Invalidação
              </span>
            </div>
            <div className="text-lg font-black text-rose-400">
              US$ {confluenceResult.executionPlan.stopLoss.toLocaleString('en-US', { minimumFractionDigits: activeCrypto.priceUsd < 1 ? 4 : 2 })}
            </div>
            <p className="text-[10.5px] font-sans text-slate-300 leading-snug">
              Posicionado estrategicamente além da maior muralha de suporte do Book.
            </p>
          </div>

          {/* Box 4: Janela & Gestão de Risco */}
          <div className="p-3.5 bg-[#0a0a0b]/90 rounded-xl border border-slate-800 space-y-1 shadow-md">
            <span className="text-[10px] text-indigo-400 uppercase font-bold block flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400" /> Validade & Gestão:
            </span>
            <div className="text-xs font-bold text-slate-200">
              {confluenceResult.executionPlan.timeWindowValidity}
            </div>
            <div className="text-[10.5px] text-slate-400 space-y-0.5 font-sans pt-1">
              <div>Tamanho Sugerido: <strong className="text-indigo-300 font-mono">{confluenceResult.executionPlan.positionSizingSuggestedPct}% da Banca</strong></div>
              <div>Slippage Máx: <strong className="text-slate-300 font-mono">{confluenceResult.executionPlan.maxSlippageAllowedPct}%</strong></div>
            </div>
          </div>

        </div>

        {/* 3-Step Execution Plan Checklist */}
        <div className="p-4 bg-[#0a0a0b]/90 rounded-xl border border-slate-800/90 font-mono text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs uppercase tracking-wider pb-1 border-b border-slate-800">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>Roteiro de Execução de 3 Passos (Checklist em Tempo Real)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-[#12141a] border border-slate-800 text-[11px] font-sans text-slate-300">
              <strong className="text-cyan-400 font-mono block mb-0.5">Passo 1: Gatilho no Book</strong>
              {confluenceResult.executionSteps.step1_BookTrigger}
            </div>

            <div className="p-2.5 rounded-lg bg-[#12141a] border border-slate-800 text-[11px] font-sans text-slate-300">
              <strong className="text-emerald-400 font-mono block mb-0.5">Passo 2: Confirmação no Tape</strong>
              {confluenceResult.executionSteps.step2_TapeConfirmation}
            </div>

            <div className="p-2.5 rounded-lg bg-[#12141a] border border-slate-800 text-[11px] font-sans text-slate-300">
              <strong className="text-indigo-400 font-mono block mb-0.5">Passo 3: Entrada & Ordens</strong>
              {confluenceResult.executionSteps.step3_OrderPlacement}
            </div>
          </div>
        </div>

      </div>

      {/* Navigation Sub-Tabs for Deep Breakdown */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 font-mono text-xs overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('cockpit')}
          className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 shrink-0 transition ${
            activeSubTab === 'cockpit'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Visão Comparativa das 2 Camadas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('tech_indicators')}
          className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 shrink-0 transition ${
            activeSubTab === 'tech_indicators'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Matriz de Indicadores Técnicos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pareto_summary')}
          className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 shrink-0 transition ${
            activeSubTab === 'pareto_summary'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <PieChart className="w-3.5 h-3.5 text-amber-400" />
          <span>Resumo de Score & Pareto de Criticidade (80/20)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('layer1_primary')}
          className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 shrink-0 transition ${
            activeSubTab === 'layer1_primary'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Camada 1: 4 Pilares Ponderados ({confluenceResult.primaryAnalysis.overallPrimaryScore}/100)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('layer2_secondary')}
          className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 shrink-0 transition ${
            activeSubTab === 'layer2_secondary'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Camada 2: Validação Book 100 & Times & Trades</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('thesis')}
          className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 shrink-0 transition ${
            activeSubTab === 'thesis'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
          <span>Tese Estratégica Completa IA</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB: TECHNICAL INDICATORS MATRIX */}
      {/* ========================================================================= */}
      {activeSubTab === 'tech_indicators' && (
        <TechnicalIndicatorsScoreTab
          symbol={btcCrypto.symbol}
          technicalScoreSummary={btcTechnicalScoreSummary}
          filterConfig={techFilterConfig}
          onToggleIndicator={handleToggleIndicator}
          onResetFilters={handleResetTechFilters}
        />
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 0: RESUMO DE SCORE & PARETO DE CRITICIDADE MULTI-CAMADAS (NEW) */}
      {/* ========================================================================= */}
      {activeSubTab === 'pareto_summary' && pareto && (
        <div className="space-y-5 font-mono text-xs">
          
          {/* Pareto Header Banner with Criticality Level and Pattern Clarity */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#12151f] border border-amber-500/40 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">PARETO 80/20</span>
                  <h4 className="text-sm font-bold text-white">Classificação de Criticidade & Padrão Definido</h4>
                </div>
                <p className="text-xs font-sans text-slate-400 mt-0.5">
                  Identificação dos 20% de fatores determinantes que produzem 80% do deslocamento de preço em ${confluenceResult.symbol}.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-[#090b10] border border-slate-800 text-right">
                  <span className="text-[9px] text-slate-500 uppercase block">Clareza do Padrão:</span>
                  <span className="text-base font-black text-cyan-300">{pareto.patternClarityPct}% Definido</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[#090b10] border border-slate-800 text-right">
                  <span className="text-[9px] text-slate-500 uppercase block">Prob. de Lucro:</span>
                  <span className="text-base font-black text-emerald-400">{pareto.winProbabilityPct}%</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs font-sans">
              <strong className="text-amber-300 font-mono block mb-1">Nível de Criticidade: {pareto.criticalityLevel}</strong>
              {pareto.paretoSynthesis}
            </div>
          </div>

          {/* Operational Facilitation: Dual Directives (COMPRA & VENDA) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* BUY DIRECTIVE (LONG) */}
            <div className={`p-4 rounded-xl border space-y-3 transition ${
              pareto.buyDirective.isOptimal 
                ? 'bg-[#0c1a14] border-emerald-500/50 shadow-lg shadow-emerald-950/30' 
                : 'bg-[#12141a] border-slate-800 opacity-80'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-emerald-300 text-xs uppercase">Diretriz Operacional: COMPRA (LONG)</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  pareto.buyDirective.operationalEase.includes('MUITO FÁCIL')
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {pareto.buyDirective.operationalEase}
                </span>
              </div>

              <div className="space-y-1.5 bg-[#090b10] p-3 rounded-lg border border-slate-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Padrão Configurado:</span>
                  <span className="text-white font-bold">{pareto.buyDirective.setupName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gatilho de Entrada:</span>
                  <span className="text-cyan-300 font-bold">US$ {pareto.buyDirective.entryTrigger}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Alvo de Realização:</span>
                  <span className="text-emerald-400 font-bold">US$ {pareto.buyDirective.tpTarget}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stop de Proteção:</span>
                  <span className="text-rose-400 font-bold">US$ {pareto.buyDirective.stopDefense}</span>
                </div>
              </div>

              <p className="text-xs font-sans text-slate-300 leading-relaxed">
                {pareto.buyDirective.actionGuidance}
              </p>

              {pareto.buyDirective.isOptimal && (
                <button
                  type="button"
                  onClick={handleExecuteSetupInAutoTrader}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Executar Ordem de Compra Imediata</span>
                </button>
              )}
            </div>

            {/* SELL DIRECTIVE (SHORT) */}
            <div className={`p-4 rounded-xl border space-y-3 transition ${
              pareto.sellDirective.isOptimal 
                ? 'bg-[#1a0c0e] border-rose-500/50 shadow-lg shadow-rose-950/30' 
                : 'bg-[#12141a] border-slate-800 opacity-80'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-rose-300 text-xs uppercase">Diretriz Operacional: VENDA (SHORT)</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  pareto.sellDirective.operationalEase.includes('MUITO FÁCIL')
                    ? 'bg-rose-950 text-rose-300 border border-rose-700'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {pareto.sellDirective.operationalEase}
                </span>
              </div>

              <div className="space-y-1.5 bg-[#090b10] p-3 rounded-lg border border-slate-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Padrão Configurado:</span>
                  <span className="text-white font-bold">{pareto.sellDirective.setupName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gatilho de Venda:</span>
                  <span className="text-cyan-300 font-bold">US$ {pareto.sellDirective.entryTrigger}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Alvo de Queda:</span>
                  <span className="text-emerald-400 font-bold">US$ {pareto.sellDirective.tpTarget}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stop de Proteção:</span>
                  <span className="text-rose-400 font-bold">US$ {pareto.sellDirective.stopDefense}</span>
                </div>
              </div>

              <p className="text-xs font-sans text-slate-300 leading-relaxed">
                {pareto.sellDirective.actionGuidance}
              </p>

              {pareto.sellDirective.isOptimal && (
                <button
                  type="button"
                  onClick={handleExecuteSetupInAutoTrader}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Executar Ordem de Venda / Short</span>
                </button>
              )}
            </div>

          </div>

          {/* Pareto Decomposition of All 6 Information Layers */}
          <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-amber-400" />
                Matriz de Decomposição das Camadas de Informação (Princípio 80/20)
              </span>
              <span className="text-[10px] text-slate-400">Score Global Ponderado: <strong className="text-cyan-300 font-bold">{pareto.globalCriticalityScore}/100</strong></span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pareto.layersBreakdown.map((layer, idx) => (
                <div key={idx} className="p-3 bg-[#090b10] rounded-lg border border-slate-800/90 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-200">{layer.layerName}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      layer.criticalityState === 'CRÍTICO_COMPRA'
                        ? 'bg-emerald-950 text-emerald-300'
                        : layer.criticalityState === 'CRÍTICO_VENDA'
                        ? 'bg-rose-950 text-rose-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {layer.rawScore}/100
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        layer.criticalityState === 'CRÍTICO_COMPRA' ? 'bg-emerald-500' : layer.criticalityState === 'CRÍTICO_VENDA' ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${layer.rawScore}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Peso Pareto: <strong>{layer.paretoWeightPct}%</strong></span>
                    <span>Impacto: <strong className="text-cyan-300">+{layer.weightedImpact} pts</strong></span>
                  </div>

                  <p className="text-[10.5px] font-sans text-slate-300 leading-snug">
                    {layer.actionableSummary}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Complete Pareto Distribution Chart Across All Cryptocurrencies */}
          <ParetoWinProbabilityChart
            paretoData={allParetoEvaluatedCryptos}
            cycleTimeRemaining={`${Math.floor(countdownSeconds / 60).toString().padStart(2, '0')}:${(countdownSeconds % 60).toString().padStart(2, '0')}`}
            onSelectCrypto={onSelectSymbol}
          />

        </div>
      )}

      {/* SUB-TAB 1: DUAL-LAYER CONFLUENCE MATRIX */}
      {activeSubTab === 'cockpit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 font-mono text-xs">
          
          {/* LEFT: LAYER 1 SUMMARY CARD */}
          <div className="bg-[#12141a] border border-cyan-500/30 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">CAMADA 1</span>
                <span className="font-bold text-white text-xs">Análise Primária Multifatorial (Ponderação Global)</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                confluenceResult.primaryAnalysis.primarySignal === 'COMPRA' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                Sinal Primário: {confluenceResult.primaryAnalysis.primarySignal}
              </span>
            </div>

            <div className="space-y-2">
              {(Object.values(confluenceResult.primaryAnalysis.pillars) as Layer1PrimaryPillar[]).map((p, idx) => (
                <div key={idx} className="p-2.5 bg-[#0a0a0b] rounded-lg border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-bold">{p.name} (Peso {p.weightPct}%)</span>
                    <span className={`font-bold ${p.signal === 'COMPRA' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.score}/100 • {p.signal}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
                    <span>{p.statusLabel}</span>
                    <span className="font-mono text-indigo-300">{p.keyMetric}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2.5 bg-[#0a0a0b] rounded-lg border border-cyan-500/20 text-[11px] font-sans text-slate-300">
              <strong className="text-cyan-400 font-mono block">Score Ponderado Camada 1:</strong>
              {confluenceResult.primaryAnalysis.summary}
            </div>
          </div>

          {/* RIGHT: LAYER 2 SUMMARY CARD */}
          <div className="bg-[#12141a] border border-emerald-500/30 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">CAMADA 2</span>
                <span className="font-bold text-white text-xs">Análise Secundária: Book 100 & Tape Reading</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                {confluenceResult.secondaryValidation.secondaryConfirmationSignal}
              </span>
            </div>

            <div className="space-y-3">
              {/* Visual Book Insight */}
              <div className="p-3 bg-[#0a0a0b] rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cyan-300 font-bold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" /> Book Visual (100 Níveis):
                  </span>
                  <span className="text-slate-300 font-bold">{confluenceResult.secondaryValidation.visualBookAnalysis.imbalanceRatio}</span>
                </div>
                <p className="text-[11px] font-sans text-slate-300 leading-snug">
                  {confluenceResult.secondaryValidation.visualBookAnalysis.insight}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>Muralha Bid: US$ {confluenceResult.secondaryValidation.visualBookAnalysis.bidWallPrice}</span>
                  <span>Muralha Ask: US$ {confluenceResult.secondaryValidation.visualBookAnalysis.askWallPrice}</span>
                </div>
              </div>

              {/* Tape Reading Insight */}
              <div className="p-3 bg-[#0a0a0b] rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" /> Rastreador Times & Trades:
                  </span>
                  <span className="text-emerald-400 font-bold">{confluenceResult.secondaryValidation.tapeReadingTracker.aggressionDominance}</span>
                </div>
                <p className="text-[11px] font-sans text-slate-300 leading-snug">
                  {confluenceResult.secondaryValidation.tapeReadingTracker.insight}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>Velocidade: {confluenceResult.secondaryValidation.tapeReadingTracker.averageTickSpeed}</span>
                  <span>CVD: US$ {(confluenceResult.secondaryValidation.tapeReadingTracker.cumulativeDeltaVolumeUsd / 1000).toFixed(1)}k</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-[#0a0a0b] rounded-lg border border-emerald-500/20 text-[11px] font-sans text-slate-300">
              <strong className="text-emerald-400 font-mono block">Validação Camada 2:</strong>
              Confirmação dupla validada com {confluenceResult.secondaryValidation.secondaryConfidence}% de precisão na fita.
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: LAYER 1 DEEP PILLARS BREAKDOWN */}
      {activeSubTab === 'layer1_primary' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.values(confluenceResult.primaryAnalysis.pillars) as Layer1PrimaryPillar[]).map((p, idx) => (
              <div key={idx} className="p-4 bg-[#12141a] rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white text-xs">{p.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                    p.signal === 'COMPRA' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {p.signal} • {p.score}/100
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-indigo-300">
                  <span>Métrica-Chave:</span>
                  <span className="font-bold">{p.keyMetric}</span>
                </div>
                <p className="text-xs font-sans text-slate-300 leading-relaxed">
                  {p.diagnostic}
                </p>
                <div className="text-[10px] text-slate-500">
                  Peso na Ponderação Primária: <strong>{p.weightPct}%</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LAYER 2 DEEP MICROSTRUCTURE */}
      {activeSubTab === 'layer2_secondary' && (
        <div className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" /> Book Visual de 100 Níveis
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold text-[10.5px]">
                  {confluenceResult.secondaryValidation.visualBookAnalysis.status}
                </span>
              </div>
              <p className="text-xs font-sans text-slate-300 leading-relaxed">
                {confluenceResult.secondaryValidation.visualBookAnalysis.insight}
              </p>
              <div className="space-y-1 bg-[#0a0a0b] p-3 rounded-lg border border-slate-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Desbalanço de Livro:</span>
                  <span className="text-white font-bold">{confluenceResult.secondaryValidation.visualBookAnalysis.imbalanceRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vácuo de Liquidez:</span>
                  <span className="text-amber-300 font-bold">{confluenceResult.secondaryValidation.visualBookAnalysis.vacuumSide}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Score de Validação do Book:</span>
                  <span className="text-emerald-400 font-bold">{confluenceResult.secondaryValidation.visualBookAnalysis.validationScore}/100</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" /> Rastreador IA do Times & Trades
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold text-[10.5px]">
                  {confluenceResult.secondaryValidation.tapeReadingTracker.priceDisplacementStatus}
                </span>
              </div>
              <p className="text-xs font-sans text-slate-300 leading-relaxed">
                {confluenceResult.secondaryValidation.tapeReadingTracker.insight}
              </p>
              <div className="space-y-1 bg-[#0a0a0b] p-3 rounded-lg border border-slate-800 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Agressão Dominante:</span>
                  <span className="text-emerald-400 font-bold">{confluenceResult.secondaryValidation.tapeReadingTracker.aggressionDominance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Delta de Volume Cumulativo:</span>
                  <span className="text-white font-bold">US$ {(confluenceResult.secondaryValidation.tapeReadingTracker.cumulativeDeltaVolumeUsd / 1000).toFixed(1)}k</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Velocidade da Fita:</span>
                  <span className="text-cyan-300 font-bold">{confluenceResult.secondaryValidation.tapeReadingTracker.averageTickSpeed}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB 4: MASTER THESIS */}
      {activeSubTab === 'thesis' && (
        <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800 space-y-3 font-sans text-xs text-slate-300 leading-relaxed">
          <div className="flex items-center gap-2 text-purple-300 font-mono font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-800">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            <span>Tese Quântica Unificada Gemini Server-Side para ${confluenceResult.symbol}</span>
          </div>
          <p className="text-sm font-sans text-slate-200 leading-relaxed">
            {confluenceResult.aiMasterThesis}
          </p>
          <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80">
            <span>Última Varredura: {confluenceResult.analyzedAt}</span>
            <span>Algoritmo: Confluence Engine HFT v4.2 + Pareto 80/20</span>
          </div>
        </div>
      )}

    </div>
  );
}

export default HighFrequencyConfluenceAIBlock;
