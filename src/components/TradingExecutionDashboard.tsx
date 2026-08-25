import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, Square, Pause, Crosshair, TrendingUp, TrendingDown, Clock, ShieldCheck,
  AlertTriangle, DollarSign, Settings, History, CheckCircle2, ChevronRight, XCircle,
  RefreshCw, Terminal, Activity, Zap, Timer, Target, Sparkles, Filter, Check, ListOrdered,
  ArrowUpRight, ArrowDownRight, Layers, Scale, BarChart3, ShieldAlert, Eye, ChevronDown, ChevronUp,
  RotateCcw, Flame
} from 'lucide-react';
import { CryptoMention } from '../types';
import { 
  TradePosition, 
  TradingAccount, 
  AssetSelectionMode, 
  PositionSide,
  ArmedOrderTrigger,
  OrderTriggerMode
} from '../types/tradingTypes';
import { HighFrequencyConfluenceResult, Top10mProfitCrypto } from '../types/hftConfluenceTypes';
import { 
  getTradingAccount, getPositions, saveTradingAccount, 
  clearTradingHistory, manuallyClosePosition, updateActivePositions,
  processConfluenceSignalForTrading, determineSignalSide, TRADING_ACCOUNT_EVENT,
  updateTargetProfit, updateTimeManagementSettings, updateTrailingStopSettings,
  updateAssetSelectionMode, executeDirectTradeForCrypto, updateInvertedExecutionSettings,
  updateAiDivergenceSettings, updateReentryCooldownSettings, updateAggressionTriggerSettings,
  getArmedTriggers, armOrderTrigger, cancelArmedTrigger, clearArmedTriggers,
  evaluateAndExecuteArmedTriggers, forceExecuteArmedTriggerImmediately,
  armAllTop3ParetoTriggers, ARMED_TRIGGERS_EVENT
} from '../services/tradingExecutionService';
import { tradingSignalBus } from '../services/tradingSignalBus';
import { generateLocalHFTConfluenceAnalysis, selectTop3HighProbabilityCryptos, evaluateAllCryptosForParetoAnalysis } from '../services/hftConfluenceService';
import { ParetoEvaluatedCrypto } from '../types/hftConfluenceTypes';
import { ParetoWinProbabilityChart } from './ParetoWinProbabilityChart';
import { SingleCryptoTimesAndTrades } from './SingleCryptoTimesAndTrades';
import { generateLiveOrderFlowData } from '../services/orderFlowDataService';
import { generateScalpingAiAnalysis, ScalpingAiAnalysis } from '../services/scalpingAiService';
import { analyzeTimesAndTradesTapeAi } from '../services/hftFlowAnalysisService';


interface TradingExecutionDashboardProps {
  cryptos: CryptoMention[];
}

interface RobotLogEntry {
  id: string;
  time: string;
  type: 'ORDER_OPEN' | 'ORDER_CLOSE' | 'SCAN' | 'INFO' | 'WARNING';
  message: string;
}

export function TradingExecutionDashboard({ cryptos }: TradingExecutionDashboardProps) {
  const [account, setAccount] = useState<TradingAccount>(getTradingAccount());
  const [positions, setPositions] = useState<TradePosition[]>(getPositions());
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [newBalanceInput, setNewBalanceInput] = useState(account.demoBalanceUsd.toString());
  const [isScanningNow, setIsScanningNow] = useState(false);
  const [weights, setWeights] = useState({ layer1And2: 14, technical: 86 });

  useEffect(() => {
    const loadWeights = () => {
      let layer1And2 = 14;
      let technical = 86;
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedLayer = window.localStorage.getItem('hft_decision_weight_layer_1_2');
        const savedTech = window.localStorage.getItem('hft_decision_weight_tech');
        if (savedLayer !== null) layer1And2 = parseInt(savedLayer, 10);
        if (savedTech !== null) technical = parseInt(savedTech, 10);
      }
      setWeights({ layer1And2, technical });
    };

    loadWeights();
    window.addEventListener('storage', loadWeights);
    return () => window.removeEventListener('storage', loadWeights);
  }, []);

  const [isCustomSelectorOpen, setIsCustomSelectorOpen] = useState(false);
  const [manualScalpingScore, setManualScalpingScore] = useState<number | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('hft_manual_scalping_score');
      return saved !== null ? parseInt(saved, 10) : null;
    }
    return null;
  });

  const [scalpingAnalysis, setScalpingAnalysis] = useState<ScalpingAiAnalysis>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem('hft_manual_scalping_score');
      if (saved !== null) {
        return generateScalpingAiAnalysis(parseInt(saved, 10));
      }
    }
    return generateScalpingAiAnalysis();
  });

  const [showScalpingWarningModal, setShowScalpingWarningModal] = useState(false);
  const [showParetoFullChart, setShowParetoFullChart] = useState(false);

  const [adminOverrideActive, setAdminOverrideActive] = useState(false);
  const lastUnfavorableLogRef = useRef<number>(0);


  useEffect(() => {
    const interval = setInterval(() => {
      if (manualScalpingScore !== null) {
        setScalpingAnalysis(generateScalpingAiAnalysis(manualScalpingScore));
      } else {
        setScalpingAnalysis(generateScalpingAiAnalysis());
      }
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [manualScalpingScore]);

  // 10-Minute Cycle Countdown Timer for Pareto Top 3 recalculation
  const [cycleTimeRemainingSec, setCycleTimeRemainingSec] = useState<number>(() => {
    const now = Math.floor(Date.now() / 1000);
    const tenMinCycle = 600;
    return tenMinCycle - (now % tenMinCycle);
  });
  const [signalTick, setSignalTick] = useState<number>(0);
  const [isParetoCyclePaused, setIsParetoCyclePaused] = useState<boolean>(false);

  const [logs, setLogs] = useState<RobotLogEntry[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString('pt-BR'),
      type: 'INFO',
      message: 'Módulo Auto-Trader HFT inicializado. Cesta Top 3 Maior Probabilidade (Pareto 80/20) ativada.'
    }
  ]);

  const [logFilter, setLogFilter] = useState<'ALL' | 'ORDERS' | 'INFO' | 'WARNING'>('ALL');
  const [triggerTabFilter, setTriggerTabFilter] = useState<'ALL' | 'PENDING' | 'READY' | 'ACTIVE'>('ALL');
  const [triggerStatusFilter, setTriggerStatusFilter] = useState<'ALL' | 'ARMED' | 'TRIGGERED' | 'CANCELLED'>('ALL');
  const [expandedTriggerId, setExpandedTriggerId] = useState<string | null>(null);
  const [expandedTriggerSymbol, setExpandedTriggerSymbol] = useState<string | null>(null);

  // Armed Order Triggers State
  const [armedTriggers, setArmedTriggers] = useState<ArmedOrderTrigger[]>(() => getArmedTriggers());
  const [quickArmSymbol, setQuickArmSymbol] = useState<string>(cryptos[0]?.symbol || 'BTC');
  const [quickArmSide, setQuickArmSide] = useState<PositionSide>('LONG');
  const [quickArmSizeUsd, setQuickArmSizeUsd] = useState<number>(100);
  const [quickArmLeverage, setQuickArmLeverage] = useState<number>(5);
  const [quickArmTriggerMode, setQuickArmTriggerMode] = useState<OrderTriggerMode>('INSTANT_AGGRESSION');
  const [quickArmMinVolume, setQuickArmMinVolume] = useState<number>(2500);
  const [quickArmAutoRearm, setQuickArmAutoRearm] = useState<boolean>(false);

  useEffect(() => {
    const handleArmedUpdate = () => {
      setArmedTriggers(getArmedTriggers());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(ARMED_TRIGGERS_EVENT, handleArmedUpdate);
      return () => window.removeEventListener(ARMED_TRIGGERS_EVENT, handleArmedUpdate);
    }
  }, []);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'ALL') return logs;
    if (logFilter === 'ORDERS') {
      return logs.filter(log => log.type === 'ORDER_OPEN' || log.type === 'ORDER_CLOSE');
    }
    return logs.filter(log => log.type === logFilter);
  }, [logs, logFilter]);

  const liveBtcPonderado = useMemo(() => {
    const btcObj = cryptos.find(c => c.symbol === 'BTC');
    if (!btcObj) return { score: 50, side: 'LONG' as PositionSide };

    const btcFlow = generateLiveOrderFlowData(btcObj);
    const btcSignal = generateLocalHFTConfluenceAnalysis(btcObj, btcFlow);

    let weightLayer1And2 = 14;
    let weightTechnical = 86;
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedLayer = window.localStorage.getItem('hft_decision_weight_layer_1_2');
      const savedTech = window.localStorage.getItem('hft_decision_weight_tech');
      if (savedLayer !== null) weightLayer1And2 = parseInt(savedLayer, 10);
      if (savedTech !== null) weightTechnical = parseInt(savedTech, 10);
    }

    const layer1And2Score = Math.round((btcSignal.primaryAnalysis.overallPrimaryScore + btcSignal.confluenceScorePct) / 2);
    const technicalScore = btcSignal.technicalScoreSummary?.overallScore ?? btcSignal.primaryAnalysis?.pillars?.technicalIndicators?.score ?? 50;
    const masterWeightedScore = Math.round(
      layer1And2Score * (weightLayer1And2 / 100) + technicalScore * (weightTechnical / 100)
    );

    const side: PositionSide = masterWeightedScore >= 50 ? 'LONG' : 'SHORT';

    return { score: masterWeightedScore, side };
  }, [cryptos]);
  
  // Compute all evaluated cryptos with Pareto rankings (sorted descending by winProbabilityPct)
  const allParetoCryptos = useMemo<ParetoEvaluatedCrypto[]>(() => {
    return evaluateAllCryptosForParetoAnalysis(cryptos);
  }, [cryptos]);

  // Compute Top 3 high probability cryptos dynamically from Pareto analysis
  const top3Cryptos = useMemo<Top10mProfitCrypto[]>(() => {
    return allParetoCryptos.slice(0, 3);
  }, [allParetoCryptos]);

  // Evaluated Triggers for Robot Trigger Monitoring (Monitoramento de Gatilho do Robô)
  const evaluatedTriggers = useMemo(() => {
    const mode = account.assetSelectionMode || 'ALL_ASSETS';
    let targetCryptos: { 
      symbol: string; 
      name: string; 
      rank?: number; 
      winProbabilityPct: number; 
      confluenceScore: number; 
      keyCatalyst: string;
      recommendedAction: string;
    }[] = [];

    if (mode === 'TOP_3_PROBABILITY') {
      targetCryptos = top3Cryptos.slice(0, 3).map(t => ({
        symbol: t.symbol,
        name: t.name,
        rank: t.rank,
        winProbabilityPct: t.winProbabilityPct,
        confluenceScore: t.confluenceScore,
        keyCatalyst: t.keyCatalyst,
        recommendedAction: t.recommendedAction
      }));
    } else if (mode === 'CUSTOM') {
      const selected = account.selectedSymbols || [];
      const filtered = cryptos.filter(c => selected.includes(c.symbol));
      const source = filtered.length > 0 ? filtered : cryptos.slice(0, 3);
      targetCryptos = source.map(c => {
        const topItem = allParetoCryptos.find(p => p.symbol === c.symbol);
        return {
          symbol: c.symbol,
          name: c.name,
          rank: topItem?.rank,
          winProbabilityPct: topItem?.winProbabilityPct || (c.sentimentScore ? Math.round(c.sentimentScore) : 65),
          confluenceScore: topItem?.confluenceScore || 65,
          keyCatalyst: topItem?.keyCatalyst || 'Confluência Técnica e Fluxo On-Chain',
          recommendedAction: topItem?.recommendedAction || ((c.change24h ?? 0) >= 0 ? 'COMPRA FORTE' : 'VENDA FORTE')
        };
      });
    } else {
      // ALL_ASSETS (15 assets)
      targetCryptos = cryptos.slice(0, 15).map(c => {
        const topItem = allParetoCryptos.find(p => p.symbol === c.symbol);
        return {
          symbol: c.symbol,
          name: c.name,
          rank: topItem?.rank,
          winProbabilityPct: topItem?.winProbabilityPct || (c.sentimentScore ? Math.round(c.sentimentScore) : 65),
          confluenceScore: topItem?.confluenceScore || 65,
          keyCatalyst: topItem?.keyCatalyst || 'Varredura Geral de Mercado',
          recommendedAction: topItem?.recommendedAction || ((c.change24h ?? 0) >= 0 ? 'COMPRA FORTE' : 'VENDA FORTE')
        };
      });
    }

    const currentOpenCount = positions.filter(p => p.status === 'OPEN').length;
    const requiredConfluenceScore = currentOpenCount === 0 ? 55 : currentOpenCount === 1 ? 58 : 62;
    const hasAvailableSlot = currentOpenCount < 3;
    const hasAvailableMargin = account.availableMarginUsd >= 10;
    const isMomentumFavorable = scalpingAnalysis.isFavorable || adminOverrideActive;

    return targetCryptos.map(item => {
      const cryptoObj = cryptos.find(c => c.symbol === item.symbol);
      const spotPrice = cryptoObj ? cryptoObj.priceUsd : 0;
      const openPos = positions.find(p => p.status === 'OPEN' && p.symbol === item.symbol);
      
      let savedHft: any = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(`hft_analysis_${item.symbol.toUpperCase()}`);
        if (raw) {
          try { savedHft = JSON.parse(raw); } catch (_) {}
        }
      }

      let side: PositionSide = 'LONG';
      if (item.recommendedAction.includes('SHORT') || item.recommendedAction.includes('VENDA')) {
        side = 'SHORT';
      }
      if (savedHft?.displacementEaseDirection?.value) {
        const easeVal = savedHft.displacementEaseDirection.value.toUpperCase();
        if (easeVal.includes('SHORT') || easeVal.includes('VENDA')) side = 'SHORT';
        else if (easeVal.includes('LONG') || easeVal.includes('COMPRA')) side = 'LONG';
      }

      let isAbsorption = false;
      let absorptionReason = '';
      if (savedHft?.highChurnLowDisplacementZone?.value) {
        const val = savedHft.highChurnLowDisplacementZone.value;
        const numbers = val.match(/[0-9.]+/g);
        if (numbers && numbers.length >= 2 && spotPrice > 0) {
          const low = Math.min(parseFloat(numbers[0]), parseFloat(numbers[1]));
          const high = Math.max(parseFloat(numbers[0]), parseFloat(numbers[1]));
          if (spotPrice >= low && spotPrice <= high) {
            isAbsorption = true;
            absorptionReason = val;
          }
        }
      }

      const supPrice = savedHft?.orderBookReading?.support?.price ?? savedHft?.orderBookReading?.support?.priceLevel ?? 0;
      const resPrice = savedHft?.orderBookReading?.resistance?.price ?? savedHft?.orderBookReading?.resistance?.priceLevel ?? 0;

      // Critical Checks
      const check1_DuplaChancela = side === liveBtcPonderado.side;
      const check2_ConfluenceScore = item.confluenceScore >= requiredConfluenceScore;
      const check3_BookAndAbsorption = !isAbsorption;
      const check4_CapacityAndMargin = hasAvailableSlot && hasAvailableMargin;
      
      let check5_AntiTrap = true;
      let trapReason = '';
      const proximityThreshold = 0.005;
      if (side === 'LONG' && resPrice > spotPrice) {
        const dist = (resPrice - spotPrice) / spotPrice;
        if (dist < proximityThreshold) {
          check5_AntiTrap = false;
          trapReason = `A < 0.5% da resistência (US$ ${resPrice.toFixed(4)})`;
        }
      }
      if (side === 'SHORT' && supPrice > 0 && spotPrice > supPrice) {
        const dist = (spotPrice - supPrice) / spotPrice;
        if (dist < proximityThreshold) {
          check5_AntiTrap = false;
          trapReason = `A < 0.5% do suporte (US$ ${supPrice.toFixed(4)})`;
        }
      }

      // Check 6: HFT Capital Flow Imbalance (IA de Alto Fluxo - Posicionamento no lado com maior dinheiro entrando)
      const bidRatio = savedHft?.orderBookReading?.imbalance?.bidRatioPct ?? 52;
      const askRatio = savedHft?.orderBookReading?.imbalance?.askRatioPct ?? (100 - bidRatio);
      const totalCapitalUsd = cryptoObj?.volume24hUsd ? (cryptoObj.volume24hUsd / 1440) * 10 : 250000;
      const buyCapitalInflowUsd = totalCapitalUsd * (bidRatio / 100);
      const sellCapitalInflowUsd = totalCapitalUsd * (askRatio / 100);
      const capitalDominantSide: PositionSide = bidRatio >= askRatio ? 'LONG' : 'SHORT';
      const capitalImbalanceDelta = Math.abs(bidRatio - askRatio);

      const check6_CapitalImbalance = side === capitalDominantSide;
      let capitalImbalanceReason = '';
      if (!check6_CapitalImbalance) {
        capitalImbalanceReason = `Fluxo divergente: Ordem em ${side}, mas o capital dominante é ${capitalDominantSide} (${capitalDominantSide === 'LONG' ? bidRatio.toFixed(1) : askRatio.toFixed(1)}%). Bloqueado.`;
      }

      // Check 7: HFT Price Displacement / Movement (IA de Alto Fluxo - Análise de Deslocamento de Preço)
      const sparkline = cryptoObj?.sparklineData || [];
      const sparklineMin = sparkline.length ? Math.min(...sparkline) : spotPrice;
      const sparklineMax = sparkline.length ? Math.max(...sparkline) : spotPrice;
      const sparklineRangePct = sparklineMin > 0 ? ((sparklineMax - sparklineMin) / sparklineMin) * 100 : 0.05;
      const isPriceMoving = sparklineRangePct >= 0.02; // Active price displacement threshold
      const check7_PriceDisplacement = isPriceMoving;
      let priceDisplacementReason = '';
      if (!check7_PriceDisplacement) {
        priceDisplacementReason = `Preço lateralizado/travado (Variação de range ${sparklineRangePct.toFixed(3)}% < 0.02%). Sem deslocamento para liberar ordem.`;
      }

      // Check 8: Gatilho de Agressão Ativa no Time & Trades / Sweep de Fita em Tempo Real (Resiliência & Quota-Zero)
      const flowData = generateLiveOrderFlowData(cryptoObj || ({ symbol: item.symbol, name: item.name, priceUsd: spotPrice, change24h: 0 } as any));
      const tapeAiResult = analyzeTimesAndTradesTapeAi(item.symbol, spotPrice, flowData.timesAndTrades);
      const check8_TapeAggression = side === 'LONG' ? tapeAiResult.executionGate.isLongAllowed : tapeAiResult.executionGate.isShortAllowed;
      const tapeAggressionReason = side === 'LONG' ? tapeAiResult.executionGate.reasonLong : tapeAiResult.executionGate.reasonShort;
      const tapeBuyAggressionPct = tapeAiResult.buyAggressionPct;
      const tapeSellAggressionPct = tapeAiResult.sellAggressionPct;
      const isSweepingActive = side === 'LONG' ? tapeAiResult.buyerEscalation.isActive : tapeAiResult.sellerEscalation.isActive;

      const check9_AutoTradingOn = account.isAutoTradingEnabled;

      const checksMetCount = (check1_DuplaChancela ? 1 : 0) + 
                             (check2_ConfluenceScore ? 1 : 0) + 
                             (check3_BookAndAbsorption ? 1 : 0) + 
                             (check4_CapacityAndMargin ? 1 : 0) +
                             (check5_AntiTrap ? 1 : 0) +
                             (check6_CapitalImbalance ? 1 : 0) +
                             (check7_PriceDisplacement ? 1 : 0) +
                             (check8_TapeAggression ? 1 : 0);

      const readinessPct = Math.round((checksMetCount / 8) * 100);

      let status: 'ACTIVE' | 'READY' | 'PENDING' = 'PENDING';
      if (openPos) {
        status = 'ACTIVE';
      } else if (checksMetCount === 8 && check9_AutoTradingOn && isMomentumFavorable) {
        status = 'READY';
      } else {
        status = 'PENDING';
      }

      const pendingItems: { title: string; desc: string; type: 'dupla' | 'confluence' | 'book' | 'capacity' | 'trading_off' | 'momentum' | 'antitrap' | 'capital' | 'displacement' | 'sweeping' }[] = [];
      
      if (!check9_AutoTradingOn && !openPos) {
        pendingItems.push({
          title: 'Auto-Trader Pausado',
          desc: 'Clique em INICIAR ROBO para liberar a execução autônoma.',
          type: 'trading_off'
        });
      }
      if (!check1_DuplaChancela) {
        pendingItems.push({
          title: 'Dupla Chancela Divergente',
          desc: `Sinal sugerido é ${side}, mas BTC Ponderado está em ${liveBtcPonderado.side}. Aguardando convergência.`,
          type: 'dupla'
        });
      }
      if (!check2_ConfluenceScore) {
        pendingItems.push({
          title: 'Score de Confluência Inferior à Meta',
          desc: `Score atual ${item.confluenceScore}% abaixo do limiar ${requiredConfluenceScore}% (Faltam ${requiredConfluenceScore - item.confluenceScore}%).`,
          type: 'confluence'
        });
      }
      if (!check3_BookAndAbsorption) {
        pendingItems.push({
          title: 'Zona de Absorção Institucional (No-Trade)',
          desc: `Preço atual está dentro de faixa de alto churn/absorção (${absorptionReason}).`,
          type: 'book'
        });
      }
      if (!check5_AntiTrap) {
        pendingItems.push({
          title: 'Filtro Anti-Armadilha (Sinc. Book)',
          desc: trapReason,
          type: 'antitrap'
        });
      }
      if (!check6_CapitalImbalance) {
        pendingItems.push({
          title: 'Desbalanço de Capital Adverso (IA Alto Fluxo)',
          desc: capitalImbalanceReason,
          type: 'capital'
        });
      }
      if (!check7_PriceDisplacement) {
        pendingItems.push({
          title: 'Sem Deslocamento de Preço (Mercado Travado)',
          desc: priceDisplacementReason,
          type: 'displacement'
        });
      }
      if (!check8_TapeAggression) {
        pendingItems.push({
          title: 'Agressão Desfavorável no Time & Trades (Tape HFT)',
          desc: tapeAggressionReason,
          type: 'sweeping'
        });
      }
      if (!hasAvailableSlot) {
        pendingItems.push({
          title: 'Capacidade Máxima Atingida',
          desc: 'Limite de 3 posições abertas preenchido. Aguardando Take-Profit (+10¢) para liberar nova vaga.',
          type: 'capacity'
        });
      } else if (!hasAvailableMargin) {
        pendingItems.push({
          title: 'Margem Insuficiente',
          desc: `Saldo livre de US$ ${account.availableMarginUsd.toFixed(2)} menor que o mínimo de US$ 10.00.`,
          type: 'capacity'
        });
      }
      if (!isMomentumFavorable) {
        pendingItems.push({
          title: 'Janela de Scalping Instável',
          desc: `Score momento em ${scalpingAnalysis.score}/100. Aguardando estabilização da volatilidade.`,
          type: 'momentum'
        });
      }

      return {
        ...item,
        spotPrice,
        side,
        openPos,
        supPrice,
        resPrice,
        check1_DuplaChancela,
        check2_ConfluenceScore,
        check3_BookAndAbsorption,
        check4_CapacityAndMargin,
        check5_AntiTrap,
        check6_CapitalImbalance,
        check7_PriceDisplacement,
        check8_TapeAggression,
        tapeBuyAggressionPct,
        tapeSellAggressionPct,
        isSweepingActive,
        tapeAggressionReason,
        check9_AutoTradingOn,
        buyCapitalInflowUsd,
        sellCapitalInflowUsd,
        capitalDominantSide,
        capitalImbalanceDelta,
        sparklineRangePct,
        checksMetCount,
        readinessPct,
        status,
        pendingItems,
        requiredConfluenceScore
      };
    });
  }, [account.assetSelectionMode, account.selectedSymbols, account.availableMarginUsd, account.isAutoTradingEnabled, top3Cryptos, allParetoCryptos, cryptos, positions, liveBtcPonderado, scalpingAnalysis, adminOverrideActive, signalTick]);

  // Use a ref to keep the latest state for event listeners
  const stateRef = useRef({ account, positions, cryptos, top3Cryptos, adminOverrideActive, scalpingAnalysis });
  useEffect(() => {
    stateRef.current = { account, positions, cryptos, top3Cryptos, adminOverrideActive, scalpingAnalysis };
  }, [account, positions, cryptos, top3Cryptos, adminOverrideActive, scalpingAnalysis]);

  // 10-minute cycle ticker
  useEffect(() => {
    if (isParetoCyclePaused) return;
    const timer = setInterval(() => {
      setCycleTimeRemainingSec(prev => (prev <= 1 ? 600 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isParetoCyclePaused]);

  const formattedCycleTime = useMemo(() => {
    const m = Math.floor(cycleTimeRemainingSec / 60);
    const s = cycleTimeRemainingSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [cycleTimeRemainingSec]);

  const addLog = useCallback((type: RobotLogEntry['type'], message: string) => {
    setLogs(prev => [
      {
        id: `log-${Date.now()}-${Math.random()}`,
        time: new Date().toLocaleTimeString('pt-BR'),
        type,
        message
      },
      ...prev.slice(0, 19)
    ]);
  }, []);

  const handleArmTrigger = useCallback((
    symbol: string, 
    targetSide: PositionSide, 
    sizeUsd: number = 100, 
    leverage: number = 5,
    triggerMode: OrderTriggerMode = 'INSTANT_AGGRESSION',
    minAggressionVolumeUsd: number = 2500,
    autoRearmOnClose: boolean = false
  ) => {
    const cryptoObj = cryptos.find(c => c.symbol === symbol);
    const res = armOrderTrigger({
      symbol,
      coinName: cryptoObj?.name || symbol,
      targetSide,
      sizeUsd,
      leverage,
      triggerMode,
      minAggressionVolumeUsd,
      autoRearmOnClose,
      reason: `Gatilho de Emissão Inteligente por Agressão na Fita (${triggerMode})`
    });
    setArmedTriggers(getArmedTriggers());
    addLog(res.success ? 'INFO' : 'WARNING', res.log);
  }, [cryptos, addLog]);

  const handleForceTriggerImmediately = useCallback((triggerId: string) => {
    const res = forceExecuteArmedTriggerImmediately(triggerId, cryptos);
    setArmedTriggers(getArmedTriggers());
    setPositions(getPositions());
    setAccount(getTradingAccount());
    addLog(res.success ? 'ORDER_OPEN' : 'WARNING', res.log);
  }, [cryptos, addLog]);

  const handleArmTop3Pareto = useCallback(() => {
    const candidates = top3Cryptos.map(t => ({
      symbol: t.symbol,
      name: t.name,
      recommendedAction: t.recommendedAction
    }));
    const res = armAllTop3ParetoTriggers(cryptos, candidates, quickArmSizeUsd, quickArmLeverage, quickArmTriggerMode);
    setArmedTriggers(getArmedTriggers());
    res.logs.forEach(l => addLog('INFO', l));
    addLog('INFO', `⚡ ${res.countArmed} gatilhos de emissão armados simultaneamente para a Cesta Top 3 Pareto!`);
  }, [cryptos, top3Cryptos, quickArmSizeUsd, quickArmLeverage, quickArmTriggerMode, addLog]);

  const handleCancelTrigger = useCallback((triggerId: string) => {
    const res = cancelArmedTrigger(triggerId);
    setArmedTriggers(getArmedTriggers());
    addLog('INFO', res.log);
  }, [addLog]);

  const handleClearAllTriggers = useCallback(() => {
    clearArmedTriggers();
    setArmedTriggers([]);
    addLog('INFO', 'Todos os gatilhos armados foram cancelados.');
  }, [addLog]);

  // Premium Microstructural verification function based on HFT AI Flow Analyzer
  const verifyHftAiRecommendations = useCallback((symbol: string, currentPrice: number, side: PositionSide) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { isEligible: true, reason: '', stopLoss: null, takeProfit: null };
    }
    const saved = window.localStorage.getItem(`hft_analysis_${symbol.toUpperCase()}`);
    if (!saved) {
      // If no analysis is stored yet, we allow entry but log it
      return { isEligible: true, reason: 'Sem dados HFT pré-salvos ainda, executando padrão.', stopLoss: null, takeProfit: null };
    }
    try {
      const analysis = JSON.parse(saved);
      
      // 1. Rule 5: High Churn Low Displacement (NÃO OPERAR)
      if (analysis.highChurnLowDisplacementZone && analysis.highChurnLowDisplacementZone.value) {
        const val = analysis.highChurnLowDisplacementZone.value;
        const numbers = val.match(/[0-9.]+/g);
        if (numbers && numbers.length >= 2) {
          const num1 = parseFloat(numbers[0]);
          const num2 = parseFloat(numbers[1]);
          const low = Math.min(num1, num2);
          const high = Math.max(num1, num2);
          if (currentPrice >= low && currentPrice <= high) {
            return {
              isEligible: false,
              reason: `Filtro HFT Ativo: Preço Atual (US$ ${currentPrice.toFixed(4)}) está dentro da faixa tóxica de alta trocação / absorção institucional ($${low.toFixed(2)} - $${high.toFixed(2)}) da recomendação NÃO OPERAR!`,
              stopLoss: null,
              takeProfit: null
            };
          }
        }
      }

      // 2. Rule 3: Displacement Ease Direction Alignment
      if (analysis.displacementEaseDirection && analysis.displacementEaseDirection.value) {
        const easeVal = analysis.displacementEaseDirection.value.toUpperCase();
        if (side === 'LONG' && easeVal.includes('SHORT')) {
          return {
            isEligible: false,
            reason: `Divergência HFT: Deslocamento fácil aponta viés SHORT no orderbook, bloqueando LONG!`,
            stopLoss: null,
            takeProfit: null
          };
        }
        if (side === 'SHORT' && easeVal.includes('LONG')) {
          return {
            isEligible: false,
            reason: `Divergência HFT: Deslocamento fácil aponta viés LONG no orderbook, bloqueando SHORT!`,
            stopLoss: null,
            takeProfit: null
          };
        }
      }

      // 3. Rule 2: Support / Resistance intelligent stop & take profit placement from Order Book Reading
      let customStopLoss: number | null = null;
      let customTakeProfit: number | null = null;

      if (analysis.orderBookReading) {
        const { support, resistance, signal: obSignal } = analysis.orderBookReading;
        const supPrice = support?.price ?? support?.priceLevel ?? 0;
        const resPrice = resistance?.price ?? resistance?.priceLevel ?? 0;
        const sigType = obSignal?.signal ?? obSignal?.signalType ?? obSignal?.type ?? '';
        const confidence = obSignal?.confidencePct ?? 50;
        
        // Block trade if Order Book shows extreme divergence (e.g. attempting LONG against critical ask wall with 85%+ SELL signal)
        if (side === 'LONG' && (sigType.includes('VENDA') || sigType === 'SHORT') && confidence >= 85) {
          return {
            isEligible: false,
            reason: `Order Book HFT Bloqueio: Pressão passiva no book dominada por vendedores (${obSignal?.label || 'Venda'})`,
            stopLoss: null,
            takeProfit: null
          };
        }
        if (side === 'SHORT' && (sigType.includes('COMPRA') || sigType === 'LONG') && confidence >= 85) {
          return {
            isEligible: false,
            reason: `Order Book HFT Bloqueio: Pressão passiva no book dominada por compradores (${obSignal?.label || 'Compra'})`,
            stopLoss: null,
            takeProfit: null
          };
        }

        if (side === 'LONG' && supPrice > 0) {
          customStopLoss = supPrice * 0.997; // Stop loss positioned right below the support wall
          if (resPrice > currentPrice) {
            customTakeProfit = resPrice * 0.999; // Take profit positioned just before the resistance wall
          }
        } else if (side === 'SHORT' && resPrice > 0) {
          customStopLoss = resPrice * 1.003; // Stop loss positioned right above the resistance wall
          if (supPrice < currentPrice && supPrice > 0) {
            customTakeProfit = supPrice * 1.001; // Take profit positioned just before the support wall
          }
        }
      } else if (analysis.supportResistanceVolume && analysis.supportResistanceVolume.value) {
        const srVal = analysis.supportResistanceVolume.value;
        const numbers = srVal.match(/[0-9.]+/g);
        if (numbers && numbers.length >= 1) {
          const level = parseFloat(numbers[0]);
          if (side === 'LONG' && srVal.toUpperCase().includes('SUPORTE')) {
            customStopLoss = level * 0.997;
          } else if (side === 'SHORT' && srVal.toUpperCase().includes('RESISTÊNCIA')) {
            customStopLoss = level * 1.003;
          }
        }
      }

      return {
        isEligible: true,
        reason: 'Sinais HFT de microestrutura validados e autorizados pela IA.',
        stopLoss: customStopLoss,
        takeProfit: customTakeProfit
      };

    } catch (err) {
      console.error("Error verifying HFT rules:", err);
      return { isEligible: true, reason: '', stopLoss: null, takeProfit: null };
    }
  }, []);

  // Cooldown and concurrency locks for automatic immediate execution
  const lastExecutionPerSymbolRef = useRef<{ [symbol: string]: number }>({});
  const isExecutingTriggerRef = useRef(false);

  // Immediate execution engine for assets with 4/4 satisfied checks in Robot Trigger Monitoring
  const executeEvaluatedTriggerImmediately = useCallback((item: {
    symbol: string;
    name: string;
    rank?: number;
    winProbabilityPct: number;
    confluenceScore: number;
    keyCatalyst: string;
    recommendedAction: string;
    spotPrice: number;
    side: PositionSide;
    checksMetCount: number;
  }) => {
    if (isExecutingTriggerRef.current) return;
    const now = Date.now();
    const lastExec = lastExecutionPerSymbolRef.current[item.symbol] || 0;
    if (now - lastExec < 6000) return; // 6s cooldown per symbol to avoid double entries

    const currentAcc = getTradingAccount();
    const currentPos = getPositions();

    if (!currentAcc.isAutoTradingEnabled) return;
    if (currentPos.filter(p => p.status === 'OPEN').length >= 3) return;
    if (currentPos.some(p => p.status === 'OPEN' && p.symbol === item.symbol)) return;
    if (currentAcc.availableMarginUsd < 10) return;

    const cryptoObj = stateRef.current.cryptos.find(c => c.symbol === item.symbol);
    if (!cryptoObj) return;

    isExecutingTriggerRef.current = true;
    lastExecutionPerSymbolRef.current[item.symbol] = now;

    try {
      const entryPrice = cryptoObj.priceUsd > 0 ? cryptoObj.priceUsd : item.spotPrice;
      const flow = generateLiveOrderFlowData(cryptoObj);
      const signal = generateLocalHFTConfluenceAnalysis(cryptoObj, flow);

      const hftVerify = verifyHftAiRecommendations(item.symbol, entryPrice, item.side);
      if (hftVerify.stopLoss) {
        if (!signal.executionPlan) signal.executionPlan = {} as any;
        signal.executionPlan.stopLoss = hftVerify.stopLoss;
      }
      if (hftVerify.takeProfit) {
        if (!signal.executionPlan) signal.executionPlan = {} as any;
        signal.executionPlan.takeProfit1 = hftVerify.takeProfit;
      }

      const res = processConfluenceSignalForTrading(signal, entryPrice, currentAcc, currentPos, item.side, true);
      if (res.tradeOpened) {
        setAccount({ ...res.account });
        setPositions([ ...res.positions ]);
        addLog('ORDER_OPEN', `⚡ Disparo Automático Imediato: 8/8 Verificações 100% Satisfeitas em ${item.symbol} (${item.side === 'LONG' ? 'COMPRA' : 'VENDA'})! Entrada a mercado em US$ ${entryPrice > 10 ? entryPrice.toFixed(2) : entryPrice.toFixed(4)}.`);
      }
    } catch (err) {
      console.error("Erro ao executar disparo imediato de gatilho:", err);
    } finally {
      setTimeout(() => {
        isExecutingTriggerRef.current = false;
      }, 400);
    }
  }, [addLog, verifyHftAiRecommendations]);

  // Full market scanner function
  const runMarketScan = useCallback((forced: boolean = false) => {
    if (forced) {
      addLog('SCAN', `Varredura de mercado solicitada...`);
      setSignalTick(Date.now());
      setIsScanningNow(true);
      setTimeout(() => setIsScanningNow(false), 500);
    }
  }, [addLog]);

  // Tick Loop for Trailing Stop & PnL Updates
  useEffect(() => {
    const interval = setInterval(() => {
      const currentCryptos = stateRef.current.cryptos;
      const currentAcc = getTradingAccount();
      const currentPos = getPositions();
      
      const res = updateActivePositions(
        currentCryptos, 
        tradingSignalBus.getLatestSignals(), 
        currentAcc, 
        currentPos
      );
      
      // Check if any position was closed
      const prevOpenCount = currentPos.filter(p => p.status === 'OPEN').length;
      const newOpenCount = res.positions.filter(p => p.status === 'OPEN').length;
      if (newOpenCount < prevOpenCount) {
        const recentlyClosed = res.positions.find(p => p.status === 'CLOSED' && Date.now() - (p.closeTime || 0) < 2500);
        if (recentlyClosed) {
          const reasonLabel = recentlyClosed.closeReason === 'TAKE_PROFIT' 
            ? '🎯 Take Profit / Meta de Ganho Atingida'
            : recentlyClosed.closeReason === 'TIME_EXPIRATION'
            ? `⏱️ Tempo Limite (${(currentAcc.maxOperationTimeMinutes || 1.5) === 1.5 ? '1m 30s' : `${currentAcc.maxOperationTimeMinutes} min`} / 0¢ Positivo)`
            : recentlyClosed.closeReason === 'AI_DIVERGENCE'
            ? '🤖 Divergência HFT (Reversão)'
            : recentlyClosed.closeReason === 'MARKET_REVERSAL_BTC'
            ? '🚨 Reversão de Mercado BTC (14%/86%)'
            : recentlyClosed.closeReason;
          addLog('ORDER_CLOSE', `Posição em ${recentlyClosed.symbol} finalizada (${reasonLabel}). PnL: ${recentlyClosed.realizedPnlUsd >= 0 ? '+' : ''}$${recentlyClosed.realizedPnlUsd.toFixed(2)} → Margem liberada para nova entrada!`);
          
          // Immediately scan and trigger new entries if auto-trading is ON
          if (currentAcc.isAutoTradingEnabled) {
            setTimeout(() => {
              runMarketScan(false);
            }, 300);
          }
        }
      }

      // Evaluate Armed Order Triggers based on Real-Time Times & Trades Aggression Gate
      const triggerResult = evaluateAndExecuteArmedTriggers(currentCryptos);
      if (triggerResult.executedTriggers.length > 0) {
        triggerResult.logs.forEach(logMsg => {
          addLog('ORDER_OPEN', logMsg);
        });
        setArmedTriggers(getArmedTriggers());
      }

      setAccount({...res.account});
      setPositions([...res.positions]);
    }, 1500); // Check every 1.5s
    
    return () => clearInterval(interval);
  }, [addLog, runMarketScan]);

  // Listen to AI Signals from Event Bus
  useEffect(() => {
    const unsubscribe = tradingSignalBus.subscribe((signal) => {
      setSignalTick(Date.now());
    });
    
    return unsubscribe;
  }, []);

  // Reactive Auto-Execution Engine: Immediately triggers execution the moment 8/8 checks are fulfilled
  useEffect(() => {
    if (!account.isAutoTradingEnabled) return;
    const readyTrigger = evaluatedTriggers.find(t => t.checksMetCount === 8 && !t.openPos && t.status === 'READY');
    if (readyTrigger) {
      executeEvaluatedTriggerImmediately(readyTrigger);
    }
  }, [evaluatedTriggers, account.isAutoTradingEnabled, executeEvaluatedTriggerImmediately]);

  // Background Auto-Trader Scanner Loop (Runs every 4 seconds when ON)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isParetoCyclePaused) {
        runMarketScan(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [runMarketScan, isParetoCyclePaused]);

  // Sync external trading account changes
  useEffect(() => {
    const handleAccountEvent = (e: Event) => {
      const customEvent = e as CustomEvent<TradingAccount>;
      if (customEvent.detail) {
        setAccount(customEvent.detail);
        setNewBalanceInput(customEvent.detail.demoBalanceUsd.toString());
      } else {
        const fresh = getTradingAccount();
        setAccount(fresh);
        setNewBalanceInput(fresh.demoBalanceUsd.toString());
      }
    };

    window.addEventListener(TRADING_ACCOUNT_EVENT, handleAccountEvent);
    window.addEventListener('storage', handleAccountEvent);
    return () => {
      window.removeEventListener(TRADING_ACCOUNT_EVENT, handleAccountEvent);
      window.removeEventListener('storage', handleAccountEvent);
    };
  }, []);

  const startAutoTrading = (withOverride: boolean = false) => {
    setAdminOverrideActive(withOverride);
    const nextState = true;
    const updated = { ...account, isAutoTradingEnabled: nextState };
    saveTradingAccount(updated);
    setAccount(updated);
    
    const modeLabel = (account.assetSelectionMode || 'ALL_ASSETS') === 'ALL_ASSETS'
      ? 'Todos os 15 Ativos'
      : (account.assetSelectionMode === 'CUSTOM')
      ? 'Seleção Personalizada'
      : 'Todos os 15 Ativos';
    addLog('INFO', `Robô Auto-Trader INICIADO no modo [${modeLabel}]. Executando varredura e monitorando sinais IA...`);
    setTimeout(() => runMarketScan(true), 150);
  };

  const handleToggleAutoTrading = () => {
    if (!account.isAutoTradingEnabled) {
      // Trying to turn ON
      const currentAnalysis = manualScalpingScore !== null 
        ? generateScalpingAiAnalysis(manualScalpingScore) 
        : generateScalpingAiAnalysis();
      setScalpingAnalysis(currentAnalysis);
      
      if (!currentAnalysis.isFavorable) {
        setShowScalpingWarningModal(true);
      } else {
        startAutoTrading();
      }
    } else {
      // Trying to turn OFF
      const updated = { ...account, isAutoTradingEnabled: false };
      saveTradingAccount(updated);
      setAccount(updated);
      setAdminOverrideActive(false); // Reset override on stop
      addLog('WARNING', 'Robô Auto-Trader PAUSADO pelo usuário.');
    }
  };

  const handleSetAssetSelectionMode = (mode: AssetSelectionMode) => {
    const updated = updateAssetSelectionMode(mode);
    setAccount(updated);
    const modeLabel = mode === 'TOP_3_PROBABILITY' 
      ? '🎯 Top 3 Criptomoedas com Maior Probabilidade de Lucro (Pareto 80/20 - Ciclo 10min)'
      : mode === 'ALL_ASSETS' 
      ? '🌐 Todos os 15 Ativos Monitorados' 
      : '⚙️ Seleção Manual Personalizada';
    addLog('INFO', `Seleção de Criptomoedas para Operação alterada para: ${modeLabel}`);
    
    if (mode === 'CUSTOM') {
      setIsCustomSelectorOpen(true);
    }
  };

  const handleToggleCustomSymbol = (symbol: string) => {
    const currentSelected = account.selectedSymbols || [];
    const isSelected = currentSelected.includes(symbol);
    const nextSelected = isSelected 
      ? currentSelected.filter(s => s !== symbol)
      : [...currentSelected, symbol];
    
    const updated = updateAssetSelectionMode('CUSTOM', nextSelected);
    setAccount(updated);
  };

  // Direct manual trade trigger for Top 3 Crypto recommendation
  const handleExecuteTop3Directly = (topItem: Top10mProfitCrypto) => {
    const cryptoObj = cryptos.find(c => c.symbol === topItem.symbol);
    if (!cryptoObj) return;

    // Detect live side from HFT analysis stored in localStorage if present
    let side: PositionSide = topItem.recommendedAction.includes('COMPRA') ? 'LONG' : 'SHORT';
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(`hft_analysis_${topItem.symbol.toUpperCase()}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.displacementEaseDirection?.value) {
            const easeVal = parsed.displacementEaseDirection.value.toUpperCase();
            if (easeVal.includes('SHORT') || easeVal.includes('VENDA')) {
              side = 'SHORT';
            } else if (easeVal.includes('LONG') || easeVal.includes('COMPRA')) {
              side = 'LONG';
            }
          }
        } catch (_) {}
      }
    }

    const entryPrice = cryptoObj.priceUsd;

    // Verify HFT AI recommendations before manual order entry
    const hftVerify = verifyHftAiRecommendations(topItem.symbol, entryPrice, side);
    if (!hftVerify.isEligible) {
      addLog('WARNING', `❌ Operação Manual Rejeitada para ${topItem.symbol}: ${hftVerify.reason}`);
      return;
    }

    const flow = generateLiveOrderFlowData(cryptoObj);
    const signal = generateLocalHFTConfluenceAnalysis(cryptoObj, flow);

    if (hftVerify.stopLoss) {
      if (!signal.executionPlan) signal.executionPlan = {} as any;
      signal.executionPlan.stopLoss = hftVerify.stopLoss;
      addLog('INFO', `🛡️ Ajuste HFT Stop Loss inteligente acionado para ${topItem.symbol} em US$ ${hftVerify.stopLoss.toFixed(2)} abaixo do suporte de volume.`);
    }

    if (hftVerify.takeProfit) {
      if (!signal.executionPlan) signal.executionPlan = {} as any;
      signal.executionPlan.takeProfit1 = hftVerify.takeProfit;
      addLog('INFO', `🎯 Ajuste HFT Take Profit cirúrgico acionado para ${topItem.symbol} em US$ ${hftVerify.takeProfit.toFixed(2)}.`);
    }

    const res = executeDirectTradeForCrypto(cryptoObj, side, signal, account, positions);
    
    addLog(res.tradeOpened ? 'ORDER_OPEN' : 'WARNING', res.log);
    if (res.tradeOpened) {
      setAccount({ ...res.account });
      setPositions([ ...res.positions ]);
    }
  };

  const handleSaveBalance = () => {
    const val = parseFloat(newBalanceInput);
    if (!isNaN(val) && val > 0) {
      const updated = { 
        ...account, 
        demoBalanceUsd: val,
        availableMarginUsd: val, 
        totalRealizedPnlUsd: 0 
      };
      saveTradingAccount(updated);
      setAccount(updated);
      clearTradingHistory();
      setPositions([]);
      addLog('INFO', `Saldo demo redefinido para US$ ${val.toLocaleString('en-US')}.`);
    }
    setIsEditingBalance(false);
  };

  const handleSetTargetProfit = (targetUsd: number) => {
    const updated = updateTargetProfit(targetUsd, true);
    setAccount(updated);
    addLog('INFO', `Alvo Scalper de Take-Profit configurado para US$ ${targetUsd.toFixed(2)} (+${Math.round(targetUsd * 100)}¢).`);
  };

  const handleToggleQuickProfit = () => {
    const nextVal = account.isQuickProfitExitEnabled === false;
    const updated = updateTargetProfit(account.targetProfitUsd || 0.10, nextVal);
    setAccount(updated);
    addLog('INFO', nextVal ? 'Auto Take-Profit (+10¢ Scalper) ATIVADO. Finalização em US$ 0.10 de ganho.' : 'Auto Take-Profit (+10¢ Scalper) DESATIVADO.');
  };

  const handleSetTimeLimit = (minutes: number) => {
    const updated = updateTimeManagementSettings(minutes, account.timeDecayProfitTargetUsd ?? 0.00, account.isTimeManagementEnabled !== false);
    setAccount(updated);
    const label = minutes === 1.5 ? '1 minuto e 30 segundos' : `${minutes} minutos`;
    addLog('INFO', `Gerenciamento de Tempo: Limite máximo ajustado para ${label} (Finalização com 0 centavos de lucro / Breakeven).`);
  };

  const handleToggleTimeManagement = () => {
    const nextVal = account.isTimeManagementEnabled === false;
    const currentMins = account.maxOperationTimeMinutes || 1.5;
    const updated = updateTimeManagementSettings(currentMins, account.timeDecayProfitTargetUsd ?? 0.00, nextVal);
    setAccount(updated);
    const label = currentMins === 1.5 ? '1m 30s' : `${currentMins} min`;
    addLog('INFO', nextVal ? `Gerenciamento de Tempo (>${label} / 0¢ lucro) ATIVADO.` : 'Gerenciamento de Tempo DESATIVADO.');
  };

  const handleSetTrailingStep = (stepUsd: number) => {
    const updated = updateTrailingStopSettings(stepUsd, account.isDynamicTrailingStopEnabled !== false);
    setAccount(updated);
    addLog('INFO', `Trailing Stop Dinâmico: Degrau de avanço ajustado para +US$ ${stepUsd.toFixed(2)} (+${Math.round(stepUsd * 100)}¢).`);
  };

  const handleToggleTrailingStop = () => {
    const nextVal = account.isDynamicTrailingStopEnabled === false;
    const updated = updateTrailingStopSettings(account.trailingStepUsd || 0.03, nextVal);
    setAccount(updated);
    addLog('INFO', nextVal ? 'Trailing Stop Dinâmico (+3¢) ATIVADO.' : 'Trailing Stop Dinâmico DESATIVADO.');
  };

  const handleToggleInvertedExecution = () => {
    const nextVal = account.isInvertedExecutionEnabled === false;
    const updated = updateInvertedExecutionSettings(nextVal);
    setAccount(updated);
    addLog('INFO', nextVal 
      ? '🔄 Execução Invertida ATIVADA: Todas as ordens serão executadas no sentido inverso (Compra ➔ Venda | Venda ➔ Compra).' 
      : '▶️ Execução Direta Padrão ATIVADA: Ordens seguem a direção original do sinal de confluência.'
    );
  };

  const handleToggleAiDivergence = () => {
    const nextVal = account.isAiDivergenceExitEnabled === false;
    const updated = updateAiDivergenceSettings(nextVal);
    setAccount(updated);
    addLog('INFO', nextVal 
      ? '🤖 Finalização por Divergência IA ATIVADA (Encerra ordens por mudança de viés se lucro < +1¢).' 
      : '🤖 Finalização por Divergência IA DESATIVADA (Ordens mantidas abertas independente da mudança de direção da IA).'
    );
  };

  const handleSetReentryCooldown = (cooldownSec: number) => {
    const updated = updateReentryCooldownSettings(cooldownSec);
    setAccount(updated);
    const label = cooldownSec === 20 ? '00:20 (20s)' :
                  cooldownSec === 60 ? '00:01:00 (1m)' :
                  cooldownSec === 180 ? '00:03:00 (3m)' :
                  cooldownSec === 300 ? '00:05:00 (5m)' : '00:10:00 (10m)';
    addLog('INFO', `⏳ Tempo de Recompra Pós-Fechamento configurado para: ${label}.`);
  };

  const handleToggleAggressionTrigger = () => {
    const nextVal = account.isAggressionTriggerEnabled === false;
    const updated = updateAggressionTriggerSettings(nextVal);
    setAccount(updated);
    addLog('INFO', nextVal 
      ? '🛡️ Gatilho de Execução Time & Trades ATIVADO: Ordens só serão liberadas se a agressão do fluxo for a favor da posição executada.' 
      : '🛡️ Gatilho de Execução Time & Trades DESATIVADO (Executa sem checagem de fluxo).'
    );
  };

  const handleClosePosition = (id: string) => {
    const res = manuallyClosePosition(id, account, positions);
    setAccount({...res.account});
    setPositions([...res.positions]);
    addLog('ORDER_CLOSE', 'Posição fechada manualmente pelo usuário.');
  };

  const handleClearHistory = () => {
    clearTradingHistory();
    setPositions(positions.filter(p => p.status === 'OPEN'));
    addLog('INFO', 'Histórico de ordens limpo com sucesso.');
  };

  const openPositions = positions.filter(p => p.status === 'OPEN');
  const allClosedPositions = positions.filter(p => p.status === 'CLOSED');
  const closedPositions = useMemo(() => {
    return [...allClosedPositions].sort((a, b) => (b.closeTime || b.openTime || 0) - (a.closeTime || a.openTime || 0));
  }, [allClosedPositions]);

  // --- Analisador de Desempenho (Acertividade) ---
  const performanceStats = useMemo(() => {
    let accuracyPct = 0;
    let bestHourStr = "--:--";
    let worstHourStr = "--:--";
    let bestHourAcc = 0;
    let worstHourAcc = 0;
    let totalTrades = allClosedPositions.length;
    let winningTrades = 0;
    
    if (totalTrades > 0) {
      winningTrades = allClosedPositions.filter(p => p.realizedPnlUsd > 0).length;
      accuracyPct = Math.round((winningTrades / totalTrades) * 100);

      const hourlyStats: Record<number, { total: number; wins: number }> = {};
      allClosedPositions.forEach(p => {
        if (p.closeTime) {
          const hour = new Date(p.closeTime).getHours();
          if (!hourlyStats[hour]) hourlyStats[hour] = { total: 0, wins: 0 };
          hourlyStats[hour].total++;
          if (p.realizedPnlUsd > 0) hourlyStats[hour].wins++;
        }
      });

      let maxAcc = -1;
      let minAcc = 101;
      let bestH = -1;
      let worstH = -1;
      let bestHTotal = 0;
      let worstHTotal = 0;

      Object.entries(hourlyStats).forEach(([hourStr, stats]) => {
        if (stats.total >= 1) {
          const acc = (stats.wins / stats.total) * 100;
          
          if (acc > maxAcc || (acc === maxAcc && stats.total > bestHTotal)) { 
            maxAcc = acc; 
            bestH = parseInt(hourStr); 
            bestHTotal = stats.total;
          }
          if (acc < minAcc || (acc === minAcc && stats.total > worstHTotal)) { 
            minAcc = acc; 
            worstH = parseInt(hourStr); 
            worstHTotal = stats.total;
          }
        }
      });

      if (bestH !== -1) {
        bestHourStr = `${bestH.toString().padStart(2, '0')}h - ${(bestH + 1).toString().padStart(2, '0')}h`;
        bestHourAcc = Math.round(maxAcc);
      }
      if (worstH !== -1) {
        worstHourStr = `${worstH.toString().padStart(2, '0')}h - ${(worstH + 1).toString().padStart(2, '0')}h`;
        worstHourAcc = Math.round(minAcc);
      }
    }

    return {
      totalTrades,
      winningTrades,
      accuracyPct,
      bestHourStr,
      worstHourStr,
      bestHourAcc,
      worstHourAcc
    };
  }, [allClosedPositions]);

  const activeSelectionMode = account.assetSelectionMode || 'ALL_ASSETS';

  return (
    <div className={`border-2 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 transition-all ${account.isAutoTradingEnabled ? 'bg-[#0d1f19]/80 border-emerald-500/50 shadow-emerald-950/30' : 'bg-[#0b0c10] border-indigo-500/30 shadow-indigo-950/20'}`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-2xl border ${account.isAutoTradingEnabled ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            <Crosshair className={`w-6 h-6 ${account.isAutoTradingEnabled ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-mono font-bold text-white flex items-center gap-2">
                Auto-Trader HFT (Modo Demo)
              </h2>
              {account.isAutoTradingEnabled ? (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> ONLINE & EXECUTANDO
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  PAUSADO
                </span>
              )}
            </div>
            <p className="text-xs font-sans text-slate-400 mt-1">
              Execução automatizada com seleção inteligente por probabilidade de lucro, confluência multi-camadas e gestão de risco.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => runMarketScan(true)}
            disabled={isScanningNow}
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 bg-[#12141a] text-cyan-300 border border-cyan-500/40 hover:bg-cyan-950/40 transition disabled:opacity-50"
            title="Força o robô a analisar os ativos da seleção atual e abrir ordens imediatas para confluências válidas"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isScanningNow ? 'animate-spin' : ''}`} />
            <span>{isScanningNow ? 'Analisando...' : 'Escanear Agora'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleAutoTrading}
            className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-lg ${
              account.isAutoTradingEnabled 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30 shadow-rose-900/20'
                : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-950/40 font-black'
            }`}
          >
            {account.isAutoTradingEnabled ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {account.isAutoTradingEnabled ? 'PARAR ROBO' : 'INICIAR ROBO (AUTO-TRADE)'}
          </button>
        </div>
      </div>

      
      {/* SCALPING AI INDICATOR MODULE */}
      <div className="bg-[#12141a] border border-indigo-500/40 rounded-2xl p-4 font-mono shadow-inner my-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${scalpingAnalysis.isFavorable ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-amber-500/20 border-amber-500/50 text-amber-400'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                Indicador IA: Janela de Scalping
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${scalpingAnalysis.isFavorable ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                  {scalpingAnalysis.recommendedAction}
                </span>
                {adminOverrideActive && !scalpingAnalysis.isFavorable && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse">
                    OVERRIDE ADM ATIVO
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {scalpingAnalysis.timeAnalysis}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0 bg-[#0a0a0b] p-2.5 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Score Momento</span>
              <span className={`text-sm font-black ${scalpingAnalysis.isFavorable ? 'text-emerald-400' : 'text-amber-400'}`}>
                {scalpingAnalysis.score}/100
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Força</span>
              <span className="text-sm font-black text-indigo-300">
                {scalpingAnalysis.momentumStrength}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Direção</span>
              <span className="text-sm font-black text-cyan-300">
                {scalpingAnalysis.direction}
              </span>
            </div>
          </div>
        </div>

        {/* Manual Config Section for Janela de Scalping Score Momento */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ajuste Manual do Score:</span>
            <span className="text-slate-500 hidden xl:inline">Permite calibração fina e simulação das travas de volatilidade do robô.</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] select-none text-slate-300 font-bold">
              <input
                type="checkbox"
                checked={manualScalpingScore !== null}
                onChange={(e) => {
                  const active = e.target.checked;
                  if (active) {
                    const defaultScore = 75;
                    setManualScalpingScore(defaultScore);
                    setScalpingAnalysis(generateScalpingAiAnalysis(defaultScore));
                    if (typeof window !== 'undefined' && window.localStorage) {
                      window.localStorage.setItem('hft_manual_scalping_score', defaultScore.toString());
                    }
                  } else {
                    setManualScalpingScore(null);
                    setScalpingAnalysis(generateScalpingAiAnalysis());
                    if (typeof window !== 'undefined' && window.localStorage) {
                      window.localStorage.removeItem('hft_manual_scalping_score');
                    }
                  }
                }}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/30"
              />
              Habilitar Score Manual
            </label>
            {manualScalpingScore !== null && (
              <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={manualScalpingScore}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setManualScalpingScore(val);
                    setScalpingAnalysis(generateScalpingAiAnalysis(val));
                    if (typeof window !== 'undefined' && window.localStorage) {
                      window.localStorage.setItem('hft_manual_scalping_score', val.toString());
                    }
                  }}
                  className="w-24 accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={manualScalpingScore}
                  onChange={(e) => {
                    let val = parseInt(e.target.value, 10);
                    if (isNaN(val)) val = 0;
                    val = Math.min(100, Math.max(0, val));
                    setManualScalpingScore(val);
                    setScalpingAnalysis(generateScalpingAiAnalysis(val));
                    if (typeof window !== 'undefined' && window.localStorage) {
                      window.localStorage.setItem('hft_manual_scalping_score', val.toString());
                    }
                  }}
                  className="w-12 text-center bg-slate-900 text-indigo-300 border border-slate-700 rounded py-0.5 px-1 font-mono text-xs font-black focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ASSET SELECTION MODE SELECTOR (Top 3 Highest Probability / All / Custom) */}
      <div className="p-4 rounded-2xl bg-[#12141a] border border-indigo-500/40 font-mono space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Seleção de Criptomoedas Disponíveis para Operação
              </span>
              <p className="text-[11px] font-sans text-slate-400">
                Determine quais criptomoedas serão monitoradas e operadas pelo robô em tempo real.
              </p>
            </div>
          </div>

          {/* 10-Minute Cycle Synchronizer */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090b0e] border border-indigo-500/30 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-slate-400">Ciclo Pareto 10min:</span>
              <span className="font-bold text-amber-300">{formattedCycleTime}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090b0e] border border-cyan-500/30 text-[11px]" title="Configurado no Painel de Decisão Ponderada (Padrão 14% / 86%)">
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">Decisão Custom:</span>
              <span className="font-bold text-cyan-300">{weights.layer1And2}% / {weights.technical}%</span>
            </div>
          </div>
        </div>

        {/* Mode Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleSetAssetSelectionMode('TOP_3_PROBABILITY')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
              activeSelectionMode === 'TOP_3_PROBABILITY'
                ? 'bg-gradient-to-r from-emerald-950/80 to-cyan-950/70 border-emerald-500/70 shadow-lg shadow-emerald-950/40 text-white ring-1 ring-emerald-400'
                : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Top 3 Maior Probabilidade
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                RECOMENDADO
              </span>
            </div>
            <p className="text-[10.5px] font-sans text-slate-300 leading-snug">
              Opera exclusivamente as <strong>3 criptomoedas com maior probabilidade de lucro</strong> (Pareto 80/20 - Ciclo 10min), executando as sugestões exatas de compra ou venda.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSetAssetSelectionMode('ALL_ASSETS')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
              activeSelectionMode === 'ALL_ASSETS'
                ? 'bg-indigo-950/70 border-indigo-500/70 shadow-lg shadow-indigo-950/40 text-white ring-1 ring-indigo-400'
                : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-400">
                <Crosshair className="w-3.5 h-3.5" />
                Todos os 15 Ativos
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                15 MOEDAS
              </span>
            </div>
            <p className="text-[10.5px] font-sans text-slate-300 leading-snug">
              Varre todas as 15 criptomoedas monitoradas no book e tape e abre posições para qualquer confluência superior a 65%.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSetAssetSelectionMode('CUSTOM')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
              activeSelectionMode === 'CUSTOM'
                ? 'bg-cyan-950/70 border-cyan-500/70 shadow-lg shadow-cyan-950/40 text-white ring-1 ring-cyan-400'
                : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold flex items-center gap-1.5 text-cyan-400">
                <Filter className="w-3.5 h-3.5" />
                Seleção Personalizada
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {(account.selectedSymbols || []).length} ATIVOS
              </span>
            </div>
            <p className="text-[10.5px] font-sans text-slate-300 leading-snug">
              Escolha manualmente quais moedas específicas você autoriza o robô a operar.
            </p>
          </button>
        </div>

        {/* Custom Coins Filter Drawer (when CUSTOM mode is active) */}
        {activeSelectionMode === 'CUSTOM' && (
          <div className="p-3 bg-[#0a0a0c] rounded-xl border border-cyan-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-300 uppercase">
                Marque as moedas autorizadas para o robô:
              </span>
              <span className="text-[10px] text-slate-400">
                {(account.selectedSymbols || []).length} de {cryptos.length} selecionadas
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {cryptos.map(c => {
                const isSelected = (account.selectedSymbols || []).includes(c.symbol);
                return (
                  <button
                    key={c.symbol}
                    type="button"
                    onClick={() => handleToggleCustomSymbol(c.symbol)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                      isSelected
                        ? 'bg-cyan-500 text-black border border-cyan-400 shadow-sm shadow-cyan-900/50'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-black" />}
                    <span>{c.symbol}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* TOP 3 CRIPTOMOEDAS COM MAIOR PROBABILIDADE DE LUCRO - INTERACTIVE DECK */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c141d] to-[#0d1f19] border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/20 font-mono space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Top 3 Criptomoedas com Maior Probabilidade de Lucro (Ciclo 10min)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  PARETO 80/20 ATIVO
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40" title="Nunca compra próximo de resistência ou vende próximo de suporte.">
                  <ShieldCheck className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                  ANTI-ARMADILHA ATIVO
                </span>
                <button
                  type="button"
                  onClick={() => setIsParetoCyclePaused(!isParetoCyclePaused)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    isParetoCyclePaused
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
                      : 'bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/60'
                  }`}
                  title={isParetoCyclePaused ? 'Retomar Ciclo Pareto e Varredura' : 'Pausar Ciclo Pareto e Varredura'}
                >
                  {isParetoCyclePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {isParetoCyclePaused ? 'Retomar Ciclo' : 'Pausar Ciclo'}
                </button>
              </div>
              <p className="text-[11px] font-sans text-slate-300 mt-0.5">
                Calculadas em tempo real pelas confluências On-Chain, Sentimento, Indicadores e Book de 100 níveis com fluxo Times & Trades.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowParetoFullChart(!showParetoFullChart)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow-sm ${
                showParetoFullChart 
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-900/40' 
                  : 'bg-slate-800/90 hover:bg-slate-750 text-emerald-300 border-emerald-500/30'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{showParetoFullChart ? 'Ocultar Gráfico' : '📊 Gráfico Pareto'}</span>
            </button>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block uppercase">Próxima Varredura:</span>
              <span className="text-xs font-bold text-amber-300">{formattedCycleTime}</span>
            </div>
          </div>
        </div>

        {/* Optional Expanded Pareto Chart View */}
        {showParetoFullChart && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <ParetoWinProbabilityChart
              paretoData={allParetoCryptos}
              cycleTimeRemaining={formattedCycleTime}
              onExecuteTrade={handleExecuteTop3Directly}
              autoTradingEnabled={account.isAutoTradingEnabled}
            />
          </div>
        )}

        {/* Top 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {top3Cryptos.map((item) => {
            const isLong = item.recommendedAction.includes('COMPRA') || item.recommendedAction.includes('LONG');
            const openPos = openPositions.find(p => p.symbol === item.symbol);
            const rankMedal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉';
            const rankBorder = item.rank === 1 ? 'border-amber-500/50 bg-amber-950/10' : item.rank === 2 ? 'border-slate-400/40 bg-slate-900/30' : 'border-amber-700/40 bg-amber-950/5';
            
            const savedHft = typeof window !== 'undefined' && window.localStorage 
              ? window.localStorage.getItem(`hft_analysis_${item.symbol.toUpperCase()}`) 
              : null;
            let hftData = null;
            if (savedHft) {
              try { hftData = JSON.parse(savedHft); } catch(_) {}
            }

            // Read live HFT recommendation side for display and dynamic execution
            let activeSide: 'LONG' | 'SHORT' = isLong ? 'LONG' : 'SHORT';
            let isWarningNoTrade = false;
            let warningReason = '';

            if (hftData) {
              if (hftData.displacementEaseDirection?.value) {
                const easeVal = hftData.displacementEaseDirection.value.toUpperCase();
                if (easeVal.includes('SHORT') || easeVal.includes('VENDA')) {
                  activeSide = 'SHORT';
                } else if (easeVal.includes('LONG') || easeVal.includes('COMPRA')) {
                  activeSide = 'LONG';
                }
              }

              // Check if currently inside the no trade/absorption zone
              if (hftData.highChurnLowDisplacementZone?.value) {
                const val = hftData.highChurnLowDisplacementZone.value;
                const numbers = val.match(/[0-9.]+/g);
                const cryptoObj = cryptos.find(c => c.symbol === item.symbol);
                if (numbers && numbers.length >= 2 && cryptoObj) {
                  const num1 = parseFloat(numbers[0]);
                  const num2 = parseFloat(numbers[1]);
                  const low = Math.min(num1, num2);
                  const high = Math.max(num1, num2);
                  const currentPrice = cryptoObj.priceUsd;
                  if (currentPrice >= low && currentPrice <= high) {
                    isWarningNoTrade = true;
                    warningReason = val;
                  }
                }
              }
            }

            const isButtonLong = activeSide === 'LONG';

            return (
              <div 
                key={item.symbol}
                className={`p-4 rounded-xl border bg-[#12141a]/95 flex flex-col justify-between gap-3.5 transition-all shadow-md hover:border-emerald-500/60 ${rankBorder}`}
              >
                {/* Card Top: Rank, Symbol & Win Probability */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{rankMedal}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black text-white">{item.symbol}</span>
                          <span className="text-[10px] text-slate-400 font-sans">{item.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-500 uppercase">Acerto Estimado</span>
                      <span className={`text-sm font-black ${item.winProbabilityPct >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {item.winProbabilityPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Recommendation Label */}
                  <div className={`mt-2 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center border ${
                    activeSide === 'LONG' 
                      ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-950/30 text-rose-300 border-rose-500/30'
                  }`}>
                    {item.recommendedAction} {activeSide !== (isLong ? 'LONG' : 'SHORT') ? '• HFT Ajustado' : ''}
                  </div>

                  {/* Real-Time HFT AI Recommendation Sub-Module */}
                  {hftData ? (
                    <div className="mt-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-[10.5px] leading-relaxed font-sans space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-extrabold uppercase tracking-wider text-indigo-400">
                        <span>Análise HFT Instantânea IA</span>
                        <span className="flex h-1.5 w-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                        </span>
                      </div>
                      <p className="text-slate-200 font-medium text-[10.5px]">
                        {hftData.aiSynthesizedRecommendation}
                      </p>
                      
                      {/* Live HFT Signal Badges & Order Book Reading */}
                      <div className="flex flex-wrap gap-1 mt-1.5 text-[8.5px]">
                        {/* Order Book Reading Badge if available */}
                        {hftData.orderBookReading?.signal && (
                          <span className={`px-1.5 py-0.5 rounded border font-bold ${
                            hftData.orderBookReading.signal.color === 'emerald'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50'
                              : hftData.orderBookReading.signal.color === 'rose'
                              ? 'bg-rose-950/60 text-rose-300 border-rose-500/50'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/50'
                          }`}>
                            📖 {hftData.orderBookReading.signal.label} ({hftData.orderBookReading.signal.confidencePct}%)
                          </span>
                        )}

                        {/* Order Book Key Support / Resistance Level */}
                        {hftData.orderBookReading?.support && (() => {
                          const sup = hftData.orderBookReading.support;
                          const p = sup?.price ?? sup?.priceLevel ?? 0;
                          return (
                            <span className="px-1.5 py-0.5 rounded border bg-emerald-950/50 text-emerald-300 border-emerald-800/45 font-bold">
                              🛡️ Sup: {sup?.priceFormatted || (p > 0 ? `$${p.toFixed(p > 10 ? 2 : 4)}` : 'N/A')}
                            </span>
                          );
                        })()}
                        {hftData.orderBookReading?.resistance && (() => {
                          const res = hftData.orderBookReading.resistance;
                          const p = res?.price ?? res?.priceLevel ?? 0;
                          return (
                            <span className="px-1.5 py-0.5 rounded border bg-rose-950/50 text-rose-300 border-rose-800/45 font-bold">
                              🧱 Res: {res?.priceFormatted || (p > 0 ? `$${p.toFixed(p > 10 ? 2 : 4)}` : 'N/A')}
                            </span>
                          );
                        })()}

                        {/* Stop Hunt Tracking */}
                        <span className={`px-1.5 py-0.5 rounded border font-bold ${
                          hftData.stopLossHuntAlert?.color === 'rose'
                            ? 'bg-rose-950/50 text-rose-300 border-rose-800/45'
                            : hftData.stopLossHuntAlert?.color === 'emerald'
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/45'
                            : 'bg-amber-950/50 text-amber-300 border-amber-800/45'
                        }`}>
                          🎯 {hftData.stopLossHuntAlert?.status || 'Monitorando Stop'}
                        </span>

                        {/* Fluid price range channel */}
                        <span className="px-1.5 py-0.5 rounded border bg-cyan-950/50 text-cyan-300 border-cyan-800/45 font-bold">
                          ⚡ Canal Fluido: Livre
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-2 rounded-lg bg-slate-900/30 border border-slate-800 text-[10px] italic font-sans text-slate-400 text-center">
                      Carregando fluxo HFT com IA de Alto Fluxo...
                    </div>
                  )}
                </div>

                {/* Card Middle: Catalyst & Confluence Details */}
                <div className="space-y-2">
                  <div>
                    <span className="text-[9px] font-sans text-slate-500 uppercase font-bold block mb-0.5">Gatilho (Catalisador):</span>
                    <p className="text-[10px] font-sans text-slate-300 leading-snug line-clamp-3" title={item.keyCatalyst}>
                      {item.keyCatalyst}
                    </p>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-center w-1/3 border-r border-slate-700/50">
                      <span className="text-[8px] text-slate-500 uppercase block">Confluência</span>
                      <span className="text-[11px] font-bold text-cyan-400">{item.confluenceScore}%</span>
                    </div>
                    <div className="text-center w-1/3 border-r border-slate-700/50">
                      <span className="text-[8px] text-slate-500 uppercase block">Técnico</span>
                      <span className="text-[11px] font-bold text-indigo-400">{item.technicalScore}/100</span>
                    </div>
                    <div className="text-center w-1/3">
                      <span className="text-[8px] text-slate-500 uppercase block">TP Estimado</span>
                      <span className="text-[11px] font-bold text-slate-300">{item.takeProfit1 > 0 ? `$${item.takeProfit1.toFixed(item.takeProfit1 > 1 ? 2 : 4)}` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Quick Exec & Arm Trigger Buttons */}
                <div className="space-y-2">
                  {openPos ? (
                    <div className="w-full py-2 bg-slate-800/50 text-slate-400 text-[10px] font-bold rounded-lg text-center border border-slate-700 flex items-center justify-center gap-1.5">
                      <Activity className="w-3 h-3" /> Posição Aberta em Andamento
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const cardTrigger = armedTriggers.find(t => t.symbol === item.symbol && t.status === 'ARMED');
                        if (cardTrigger) {
                          return (
                            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/60 flex items-center justify-between gap-2 shadow-sm animate-pulse">
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <div className="truncate">
                                  <span className="text-[10px] font-black text-amber-300 block truncate">
                                    ⚡ GATILHO ARMADO ({cardTrigger.targetSide})
                                  </span>
                                  <span className="text-[8.5px] text-slate-300 block truncate">
                                    {cardTrigger.currentAggressionStatus}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCancelTrigger(cardTrigger.id)}
                                className="px-2 py-1 rounded bg-rose-600/40 hover:bg-rose-500/50 text-rose-200 border border-rose-500/50 text-[9px] font-bold shrink-0"
                              >
                                Desarmar
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleExecuteTop3Directly(item)}
                              disabled={isScanningNow}
                              className={`py-2 px-2 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 border shadow-sm ${
                                isWarningNoTrade
                                  ? 'bg-amber-600/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 hover:shadow-amber-950/40'
                                  : isButtonLong
                                  ? 'bg-emerald-600/25 hover:bg-emerald-500/35 text-emerald-300 border-emerald-500/50 hover:shadow-emerald-900/40'
                                  : 'bg-rose-600/25 hover:bg-rose-500/35 text-rose-300 border-rose-500/50 hover:shadow-rose-900/40'
                              }`}
                            >
                              {isWarningNoTrade ? (
                                <>
                                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="truncate">Executar (Absorção)</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">Exec. Direta ({isButtonLong ? 'LONG' : 'SHORT'})</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleArmTrigger(item.symbol, isButtonLong ? 'LONG' : 'SHORT', 100, 5)}
                              className="py-2 px-2 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 shadow-sm"
                              title="Armar gatilho de liberação: aguarda o momento em que a fita confirmar agressão a favor antes de abrir a posição"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="truncate">⚡ Armar Gatilho</span>
                            </button>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>

                {/* Individual Time & Trade (100 Negotiation Lines) + Independent Database */}
                <SingleCryptoTimesAndTrades
                  crypto={item}
                  cycleTimeRemaining={formattedCycleTime}
                  isAutoTradingEnabled={account.isAutoTradingEnabled}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Saldo Demo (USD)</span>
            <button onClick={() => setIsEditingBalance(!isEditingBalance)} className="text-slate-500 hover:text-indigo-400" title="Ajustar saldo inicial">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
          {isEditingBalance ? (
            <div className="flex gap-2">
              <input 
                type="number" 
                value={newBalanceInput} 
                onChange={(e) => setNewBalanceInput(e.target.value)}
                className="w-full bg-slate-900 border border-indigo-500/50 rounded px-2 py-1 text-white text-sm"
              />
              <button onClick={handleSaveBalance} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 rounded text-xs font-bold transition">Salvar</button>
            </div>
          ) : (
            <div className="text-2xl font-black text-white">
              ${account.demoBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2">Margem Disponível</span>
          <div className="text-2xl font-black text-cyan-400">
            ${account.availableMarginUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2">PnL Total Realizado</span>
          <div className={`text-2xl font-black ${account.totalRealizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {account.totalRealizedPnlUsd >= 0 ? '+' : ''}${account.totalRealizedPnlUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Auto Take-Profit Scalper Bar (10 Cents Trigger) */}
      <div className="p-4 rounded-xl bg-[#12141a]/90 border border-emerald-500/30 font-mono flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Auto Take-Profit Scalper: Finalizar ao Atingir 2 Centavos
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                +US$ {(account.targetProfitUsd || 0.02).toFixed(2)} (+{Math.round((account.targetProfitUsd || 0.02) * 100)}¢)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Quando a ordem atingir o ganho configurado, o robô encerra automaticamente a mercado, computa o lucro e <strong>libera margem instantânea para abrir a próxima entrada</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="text-[10px] text-slate-400 uppercase">Alvo Rápido:</span>
          {[0.02, 0.05, 0.10, 0.25, 0.50].map((amt) => {
            const isSelected = (account.targetProfitUsd || 0.02) === amt;
            return (
              <button
                key={amt}
                type="button"
                onClick={() => handleSetTargetProfit(amt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isSelected 
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-950/50' 
                    : 'bg-[#0a0a0c] text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                +${amt.toFixed(2)}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleToggleQuickProfit}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition ml-1 ${
              account.isQuickProfitExitEnabled !== false
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/80'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
          >
            {account.isQuickProfitExitEnabled !== false ? 'ATIVO' : 'DESATIVADO'}
          </button>
        </div>
      </div>

      {/* Operation Time Management Bar (1.5 Minutes Max -> Exit on 0 Cents Positive Profit / Never in Loss) */}
      <div className="p-4 rounded-xl bg-[#12141a]/90 border border-amber-500/30 font-mono flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${account.isTimeManagementEnabled !== false ? 'text-white' : 'text-slate-400 line-through'}`}>
                Gerenciamento de Tempo HFT: Max {(account.maxOperationTimeMinutes || 1.5) === 1.5 ? '1m 30s' : `${account.maxOperationTimeMinutes} Minutos`} (0¢ Positivo / Sem Prejuízo)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${account.isTimeManagementEnabled !== false ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-rose-950/40 text-rose-400 border-rose-800/40'}`}>
                {account.isTimeManagementEnabled !== false ? `${(account.maxOperationTimeMinutes || 1.5) === 1.5 ? '1m 30s' : `${account.maxOperationTimeMinutes} min`} • 0¢ Positivo (ATIVO)` : '🔴 DESATIVADO'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              {account.isTimeManagementEnabled !== false ? (
                <>Após o tempo limite (<strong>{(account.maxOperationTimeMinutes || 1.5) === 1.5 ? '1m 30s' : `${account.maxOperationTimeMinutes} min`}</strong>), ordens com lucro <strong>≥ +3¢</strong> ignoram o tempo sob Trailing Stop. Ordens com lucro positivo (&ge; 0¢) são finalizadas no lucro neutro positivo. <strong>Ordens em prejuízo (&lt; US$ 0,00) NUNCA são encerradas por tempo</strong>, mantendo-se abertas até recuperarem.</>
              ) : (
                <span className="text-rose-400/90 font-medium">⚠️ O gerenciamento de tempo está DESATIVADO. As ordens NÃO serão encerradas por tempo limite, permanecendo abertas até atingir o Take Profit ou Stop Loss.</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="text-[10px] text-slate-400 uppercase">Tempo Limite:</span>
          {[1.5, 3, 5, 10, 15].map((mins) => {
            const isSelected = (account.maxOperationTimeMinutes || 1.5) === mins;
            const btnLabel = mins === 1.5 ? '1m 30s' : `${mins} min`;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => handleSetTimeLimit(mins)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isSelected 
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-950/50' 
                    : 'bg-[#0a0a0c] text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {btnLabel}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleToggleTimeManagement}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition ml-1 ${
              account.isTimeManagementEnabled !== false
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:bg-amber-900/80'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
          >
            {account.isTimeManagementEnabled !== false ? 'ATIVO' : 'DESATIVADO'}
          </button>
        </div>
      </div>

      {/* Dynamic Trailing Stop Management Bar (6c -> 3c & 30c -> 15c Trailing) */}
      <div className="p-4 rounded-xl bg-[#12141a]/90 border border-cyan-500/30 font-mono flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Trailing Stop Dinâmico: 6¢ ➔ 3¢ & 30¢ ➔ Rastreamento 15¢ Atrás
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                1º Estágio: +6¢ ➔ Stop +3¢ | 2º Estágio: +30¢ ➔ Segue 15¢ Atrás
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              • <strong>Ao atingir 6¢ (+US$ 0,06)</strong>: Stop move para <strong>+3¢ (+US$ 0,03)</strong> para manter a posição protegida no lucro.<br />
              • <strong>Ao chegar em 30¢ (+US$ 0,30)</strong>: Stop sobe para <strong>+15¢ (+US$ 0,15)</strong> e <strong>continua seguindo a operação</strong>, subindo o stop sempre <strong>15 centavos atrás do pico</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleToggleTrailingStop}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              account.isDynamicTrailingStopEnabled !== false
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 hover:bg-cyan-900/80 shadow-md shadow-cyan-950/40'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
          >
            {account.isDynamicTrailingStopEnabled !== false ? '🛡️ TRAILING ATIVO' : 'DESATIVADO'}
          </button>
        </div>
      </div>

      {/* Inverted Execution Mode Bar (Execução de Ordens Invertidas: COMPRA -> VENDA | VENDA -> COMPRA) & AI Divergence Exit Toggle */}
      <div className="p-4 rounded-xl bg-[#12141a]/90 border border-purple-500/30 font-mono flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Execução Invertida de Ordens (Inverso / Contra-Tendência)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                account.isInvertedExecutionEnabled !== false
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {account.isInvertedExecutionEnabled !== false ? 'COMPRA ➔ VENDA | VENDA ➔ COMPRA' : 'DIREÇÃO PADRÃO'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                account.isAiDivergenceExitEnabled !== false
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                🤖 Divergência IA: {account.isAiDivergenceExitEnabled !== false ? 'ATIVA (< +1¢)' : 'DESATIVADA'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Inverte a execução de ordens e gerencia a finalização por <strong>🤖 Divergência IA</strong> (quando a direção da IA reverte e o lucro é inferior a 1 centavo: &lt; US$ 0,01).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleToggleInvertedExecution}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
              account.isInvertedExecutionEnabled !== false
                ? 'bg-purple-950/80 text-purple-300 border-purple-500/50 hover:bg-purple-900/80 shadow-lg shadow-purple-950/50'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {account.isInvertedExecutionEnabled !== false ? '🔄 INVERSÃO ATIVA' : 'INVERSÃO DESATIVADA'}
          </button>

          <button
            type="button"
            onClick={handleToggleAiDivergence}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
              account.isAiDivergenceExitEnabled !== false
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 hover:bg-cyan-900/80 shadow-lg shadow-cyan-950/50'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {account.isAiDivergenceExitEnabled !== false ? '🤖 DIVERGÊNCIA IA ATIVA' : '🤖 DIVERGÊNCIA IA DESATIVADA'}
          </button>
        </div>
      </div>

      {/* Reentry Cooldown Management Bar (00:20; 00:01:00; 00:03; 00:05:00; 00:10) */}
      <div className="p-4 rounded-xl bg-[#12141a]/90 border border-blue-500/30 font-mono flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Recompra Pós-Fechamento (Cooldown de Reentrada)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                {(account.reentryCooldownSeconds || 20) === 20 ? '00:20 (20s)' :
                 (account.reentryCooldownSeconds || 20) === 60 ? '00:01:00 (1m)' :
                 (account.reentryCooldownSeconds || 20) === 180 ? '00:03 (3m)' :
                 (account.reentryCooldownSeconds || 20) === 300 ? '00:05:00 (5m)' : '00:10 (10m)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Impede que o robô crie nova ordem da mesma criptomoeda que finalizou durante o intervalo selecionado. Após decorrido o tempo, a criação de nova ordem fica liberada respeitando todos os gatilhos e filtros.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="text-[10px] text-slate-400 uppercase">Tempo de Espera:</span>
          {[
            { label: '00:20', sec: 20, tip: '20s' },
            { label: '00:01:00', sec: 60, tip: '1 min' },
            { label: '00:03', sec: 180, tip: '3 min' },
            { label: '00:05:00', sec: 300, tip: '5 min' },
            { label: '00:10', sec: 600, tip: '10 min' }
          ].map(opt => {
            const isSelected = (account.reentryCooldownSeconds || 20) === opt.sec;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleSetReentryCooldown(opt.sec)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  isSelected
                    ? 'bg-blue-500 text-black shadow-md shadow-blue-950/50'
                    : 'bg-[#0a0a0c] text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                }`}
                title={`Bloquear reentrada em ${opt.tip} após finalizar ordem`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gatilho de Execução da Ordem (Liberar SOMENTE se agressão no Time & Trades for a favor) */}
      <div className="p-4 rounded-xl bg-[#12141a]/90 border border-emerald-500/30 font-mono flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Gatilho de Execução Time & Trades (Agressão a Favor)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                account.isAggressionTriggerEnabled !== false
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {account.isAggressionTriggerEnabled !== false ? '🛡️ GATILHO ATIVO (ORDEM BLOQUEADA SE CONTRA O FLUXO)' : 'DESATIVADO (EXECUTA DIRETO)'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                IA TAPE READING INTEGRADA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              • <strong>Ordem de Compra (LONG)</strong>: Liberada <strong>somente</strong> se houver agressão compradora a favor e nenhum vendedor empurrando o preço para baixo no Bid.<br />
              • <strong>Ordem de Venda (SHORT)</strong>: Liberada <strong>somente</strong> se houver agressão vendedora a favor e nenhum comprador pagando mais caro no Ask.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleToggleAggressionTrigger}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-md ${
              account.isAggressionTriggerEnabled !== false
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 hover:bg-emerald-900/80 shadow-emerald-950/50'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{account.isAggressionTriggerEnabled !== false ? '🛡️ GATILHO ATIVADO' : 'GATILHO DESATIVADO'}</span>
          </button>
        </div>
      </div>

      {/* PAINEL AVANÇADO DE GATILHOS DE EMISSÃO DE ORDENS */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#0f141f] via-[#12141a] to-[#0f141f] border border-cyan-500/40 shadow-xl font-mono space-y-4">
        {/* Cabeçalho do Painel */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-950/40 shrink-0">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  ⚡ Gatilho de Liberação Inteligente de Ordens
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {armedTriggers.filter(t => t.status === 'ARMED').length} Armado(s)
                </span>
                {armedTriggers.some(t => t.status === 'TRIGGERED') && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {armedTriggers.filter(t => t.status === 'TRIGGERED').length} Disparado(s)
                  </span>
                )}
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400 animate-spin" /> Monitorando Fita Segundo a Segundo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Arme ordens com inteligência: o robô monitora a fita em tempo real e <strong>libera a emissão no microssegundo exato</strong> em que o fluxo comprador (LONG) ou vendedor (SHORT) for confirmado, com proteção contra reversões falsas!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
            {/* 1-Click Arm Top 3 Pareto */}
            <button
              type="button"
              onClick={handleArmTop3Pareto}
              className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white border border-cyan-400/40 transition shadow-md shadow-cyan-950/60 flex items-center gap-1.5"
              title="Arma ordens simultâneas para os 3 melhores ativos selecionados pelo algoritmo de Pareto 80/20"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-bounce" />
              <span>⚡ Armar Top 3 Pareto (1-Click)</span>
            </button>

            {armedTriggers.some(t => t.status === 'ARMED') && (
              <button
                type="button"
                onClick={handleClearAllTriggers}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 transition flex items-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Desarmar Todos</span>
              </button>
            )}
          </div>
        </div>

        {/* Abas de Filtragem de Status dos Gatilhos */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
          <div className="flex items-center gap-1 bg-[#090c12] p-1 rounded-lg border border-slate-800">
            {(['ALL', 'ARMED', 'TRIGGERED', 'CANCELLED'] as const).map(tab => {
              const count = tab === 'ALL' ? armedTriggers.length : armedTriggers.filter(t => t.status === tab).length;
              const labels = {
                ALL: 'TODOS',
                ARMED: '⚡ ARMADOS',
                TRIGGERED: '🟢 DISPARADOS',
                CANCELLED: '✕ CANCELADOS'
              };
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTriggerStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition flex items-center gap-1.5 ${
                    triggerStatusFilter === tab
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span>{labels[tab]}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                    triggerStatusFilter === tab ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[10px] text-slate-500">
            💡 Os gatilhos executam automaticamente mesmo com o painel fechado.
          </span>
        </div>

        {/* Lista de Gatilhos */}
        {(() => {
          const displayTriggers = triggerStatusFilter === 'ALL'
            ? armedTriggers
            : armedTriggers.filter(t => t.status === triggerStatusFilter);

          if (displayTriggers.length === 0) {
            return (
              <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-slate-400 text-xs font-mono space-y-2 bg-[#090c12]/50">
                <div className="flex items-center justify-center gap-2 text-slate-300 font-bold">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>
                    {triggerStatusFilter === 'ALL' && 'Nenhum gatilho de ordem configurado no momento.'}
                    {triggerStatusFilter === 'ARMED' && 'Nenhum gatilho armado aguardando agressão no momento.'}
                    {triggerStatusFilter === 'TRIGGERED' && 'Nenhum gatilho foi disparado recentemente nesta sessão.'}
                    {triggerStatusFilter === 'CANCELLED' && 'Nenhum gatilho cancelado no histórico.'}
                  </span>
                </div>
                <p className="text-slate-500 max-w-lg mx-auto font-sans text-[11px]">
                  Utilize o painel de armação rápida abaixo ou clique no botão <strong>"⚡ Armar Top 3 Pareto"</strong> para programar disparos inteligentes com base no fluxo institucional do Time & Trades.
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {displayTriggers.map((trigger) => {
                const isLong = trigger.targetSide === 'LONG';
                const isArmed = trigger.status === 'ARMED';
                const isTriggered = trigger.status === 'TRIGGERED';
                const isCancelled = trigger.status === 'CANCELLED';
                const isExpanded = expandedTriggerId === trigger.id;

                const modeLabels: Record<OrderTriggerMode, { label: string; icon: string; color: string }> = {
                  INSTANT_AGGRESSION: { label: 'Agressão Instantânea', icon: '⚡', color: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40' },
                  WHALE_VOLUME: { label: `Volume Baleia (≥ $${trigger.minAggressionVolumeUsd?.toLocaleString() || '2,500'})`, icon: '🐋', color: 'text-indigo-300 border-indigo-500/40 bg-indigo-950/40' },
                  CONFLUENCE_DUAL: { label: 'Dupla Confluência (Fita + 14%/86%)', icon: '🧠', color: 'text-amber-300 border-amber-500/40 bg-amber-950/40' }
                };

                const currentModeInfo = modeLabels[trigger.triggerMode || 'INSTANT_AGGRESSION'];

                return (
                  <div 
                    key={trigger.id}
                    className={`p-3.5 rounded-xl border shadow-lg flex flex-col justify-between gap-3 relative overflow-hidden transition-all ${
                      isArmed
                        ? 'bg-[#0b0e14] border-cyan-500/50 shadow-cyan-950/20'
                        : isTriggered
                        ? 'bg-[#0b120f] border-emerald-500/50 shadow-emerald-950/20'
                        : 'bg-[#0e0f14] border-slate-800 opacity-75'
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
                    
                    <div>
                      {/* Top Header do Card */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black text-white">{trigger.symbol}</span>
                          <span className="text-[10px] text-slate-400 font-sans">({trigger.coinName})</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                            isLong 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                          }`}>
                            {isLong ? '🟢 COMPRA (LONG)' : '🔴 VENDA (SHORT)'}
                          </span>

                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                            isArmed 
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                              : isTriggered
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {isArmed ? '⚡ ARMADO' : isTriggered ? '🟢 DISPARADO' : '✕ CANCELADO'}
                          </span>
                        </div>
                      </div>

                      {/* Badges de Modo e Auto-Rearme */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border flex items-center gap-1 ${currentModeInfo.color}`}>
                          <span>{currentModeInfo.icon}</span>
                          <span>{currentModeInfo.label}</span>
                        </span>

                        {trigger.autoRearmOnClose && (
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-bold border bg-purple-950/40 text-purple-300 border-purple-500/40 flex items-center gap-1">
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Auto-Rearme</span>
                          </span>
                        )}
                      </div>

                      {/* Detalhes do Gatilho */}
                      <div className="space-y-1.5 text-[10.5px]">
                        <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-800">
                          <span className="text-[9px] text-slate-400 uppercase block font-sans">Condição Requerida para Emissão:</span>
                          <span className="text-slate-200 font-sans font-bold leading-tight block">
                            {trigger.requiredCondition}
                          </span>
                        </div>

                        {/* Monitoramento ao Vivo da Fita / Time & Trades */}
                        <div className={`p-2 rounded-lg border ${
                          isArmed 
                            ? 'bg-amber-950/30 border-amber-500/40' 
                            : isTriggered 
                            ? 'bg-emerald-950/30 border-emerald-500/40' 
                            : 'bg-slate-900/60 border-slate-800'
                        }`}>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[9px] text-amber-400 uppercase font-bold flex items-center gap-1">
                              <Activity className={`w-3 h-3 ${isArmed ? 'animate-pulse' : ''}`} /> 
                              {isArmed ? 'Status no Time & Trades:' : isTriggered ? 'Execução Confirmada:' : 'Status:'}
                            </span>
                            <span className="text-[8px] text-slate-400 font-mono">
                              {new Date(trigger.lastTapeCheckTime).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-white font-bold font-mono text-[10px] leading-tight">
                            {trigger.currentAggressionStatus}
                          </p>
                          {isTriggered && trigger.executedPrice && (
                            <div className="mt-1 pt-1 border-t border-emerald-500/30 text-[9.5px] text-emerald-300 flex items-center justify-between">
                              <span>Entrada Executada: <strong>US$ {trigger.executedPrice.toFixed(4)}</strong></span>
                              <span>{new Date(trigger.triggeredAt || Date.now()).toLocaleTimeString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Margem, Alavancagem e Horário */}
                        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                          <span>Margem: <strong className="text-slate-200">${trigger.sizeUsd} ({trigger.leverage}x)</strong></span>
                          <span>Armado às: <strong className="text-slate-200">{new Date(trigger.armedAt).toLocaleTimeString()}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação do Card */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                      {isArmed ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleForceTriggerImmediately(trigger.id)}
                            className="flex-1 py-1.5 rounded-lg bg-cyan-600/90 hover:bg-cyan-500 text-white border border-cyan-400/40 text-[10px] font-black transition flex items-center justify-center gap-1 shadow-sm"
                            title="Dispara a ordem imediatamente a mercado ignorando a espera da fita"
                          >
                            <Zap className="w-3 h-3 text-yellow-300" />
                            <span>⚡ Forçar Disparo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelTrigger(trigger.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-500/50 text-slate-300 border border-slate-700 text-[10px] font-bold transition flex items-center justify-center gap-1"
                            title="Desarmar este gatilho"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Desarmar</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleArmTrigger(
                            trigger.symbol, 
                            trigger.targetSide, 
                            trigger.sizeUsd, 
                            trigger.leverage, 
                            trigger.triggerMode, 
                            trigger.minAggressionVolumeUsd, 
                            trigger.autoRearmOnClose
                          )}
                          className="w-full py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950/80 hover:text-cyan-300 hover:border-cyan-500/50 text-slate-300 border border-slate-700 text-[10px] font-bold transition flex items-center justify-center gap-1"
                        >
                          <Zap className="w-3 h-3 text-cyan-400" />
                          <span>⚡ Re-Armar Gatilho Novamente</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}


      </div>

      {/* Active Positions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="font-mono text-sm font-bold text-white uppercase">Posições Abertas ({openPositions.length}/3)</h3>
          </div>
          {openPositions.length > 0 && (
            <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 animate-pulse" /> Gestão Dinâmica, Scalper +10¢ {account.isTimeManagementEnabled !== false ? `& Tempo (${(account.maxOperationTimeMinutes || 1.5) === 1.5 ? '1m 30s' : `${account.maxOperationTimeMinutes}min`} / 0¢ Positivo) Ativos` : '& Tempo Desativado'}
            </span>
          )}
        </div>
        
        {openPositions.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-400 font-mono text-xs text-center space-y-2">
            {account.isAutoTradingEnabled ? (
              <>
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Varrendo a seleção de ativos ({activeSelectionMode === 'ALL_ASSETS' ? 'Todos os 15 Ativos' : activeSelectionMode === 'CUSTOM' ? 'Ativos Personalizados' : '15 Ativos'}) a cada 4s...</span>
                </div>
                <p className="text-slate-500 max-w-md">
                  O robô abrirá até 3 posições simultâneas e finalizará cada uma automaticamente em +US$ {(account.targetProfitUsd || 0.02).toFixed(2)} {account.isTimeManagementEnabled !== false ? `(ou em 0 centavos positivo após ${(account.maxOperationTimeMinutes || 1.5) === 1.5 ? '1 min 30s' : `${account.maxOperationTimeMinutes} min`}, sem jamais fechar no prejuízo)` : '(tempo limite desativado)'}, liberando nova entrada!
                </p>
              </>
            ) : (
              <>
                <p className="text-slate-400 font-bold">Auto-Trader está desativado.</p>
                <p className="text-slate-500">Clique em "INICIAR ROBO" acima .</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {openPositions.map(pos => {
              const unrealizedPnlUsd = pos.unrealizedPnlUsd ?? 0;
              const unrealizedPnlPct = pos.unrealizedPnlPct ?? 0;
              const sizeUsd = pos.sizeUsd ?? 0;
              const isProfit = unrealizedPnlUsd >= 0;
              const target = pos.targetProfitUsd || account.targetProfitUsd || 0.02;
              const isQuickProfitEnabled = pos.isQuickProfitExitEnabled !== undefined ? pos.isQuickProfitExitEnabled : (account.isQuickProfitExitEnabled !== false);
              const progressPct = Math.min(100, Math.max(0, (unrealizedPnlUsd / target) * 100));

              // Time elapsed calculations
              const elapsedSec = Math.max(0, Math.floor((Date.now() - (pos.openTime || Date.now())) / 1000));
              const elapsedMins = Math.floor(elapsedSec / 60);
              const elapsedRemainderSec = elapsedSec % 60;
              const formattedDuration = `${elapsedMins.toString().padStart(2, '0')}:${elapsedRemainderSec.toString().padStart(2, '0')}`;
              const maxMinutes = pos.maxOperationTimeMinutes || account.maxOperationTimeMinutes || 1.5;
              const isTimeMgmtEnabled = account.isTimeManagementEnabled !== false && pos.isTimeManagementEnabled !== false;
              const maxSeconds = maxMinutes * 60;
              const isTimeExceeded = elapsedSec >= maxSeconds;
              const maxMinutesLabel = maxMinutes === 1.5 ? '1m 30s' : `${maxMinutes}m`;
              const maxMinutesFormatted = maxMinutes === 1.5 ? '01:30' : `${Math.floor(maxMinutes).toString().padStart(2, '0')}:00`;
              const isReadyForTimeExit = isTimeMgmtEnabled && isTimeExceeded;
              const isDynamicTrailingEnabled = pos.isDynamicTrailingStopEnabled !== undefined ? pos.isDynamicTrailingStopEnabled : (account.isDynamicTrailingStopEnabled !== false);

              return (
                <div key={pos.id} className={`p-4 rounded-xl border bg-[#12141a] flex flex-col gap-3 transition-all ${isProfit ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-rose-500/40 bg-rose-950/10'}`}>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-14 rounded-full ${pos.side === 'LONG' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-lg">{pos.symbol}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${pos.side === 'LONG' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-rose-950 text-rose-400 border-rose-800'}`}>
                            {pos.side}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">
                            {pos.coinName}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-1">
                          Entrada Real: <strong className="text-slate-200">${pos.entryPrice}</strong> | Atual: <strong className="text-white">${pos.currentPrice}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-500 uppercase block">Tamanho Alocado</span>
                        <span className="text-sm font-bold text-slate-300">${sizeUsd.toFixed(2)}</span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-500 uppercase block">Trailing Stop / SL</span>
                        <span className={`text-sm font-bold ${pos.trailingLockedProfitUsd && pos.trailingLockedProfitUsd > 0 ? 'text-emerald-400' : pos.currentStopLoss === pos.entryPrice || pos.trailingStepsCount === 1 ? 'text-cyan-300' : 'text-amber-400'}`}>
                          ${pos.currentStopLoss}
                        </span>
                        <span className="text-[9.5px] block font-bold">
                          {pos.trailingLockedProfitUsd && pos.trailingLockedProfitUsd > 0 ? (
                            <span className="text-emerald-400">🛡️ +${(pos.trailingLockedProfitUsd || 0).toFixed(2)} travado</span>
                          ) : pos.currentStopLoss === pos.entryPrice || pos.trailingStepsCount === 1 ? (
                            <span className="text-cyan-400">🛡️ Breakeven (0 risco)</span>
                          ) : (
                            <span className="text-slate-500">SL Inicial</span>
                          )}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-500 uppercase block">Alvo Scalper (+10¢)</span>
                        <span className={`text-sm font-bold ${isQuickProfitEnabled ? 'text-cyan-300' : 'text-slate-500 line-through'}`}>
                          {isQuickProfitEnabled ? `+$${target.toFixed(2)}` : 'Desativado'}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-500 uppercase block">Tempo Decorrido</span>
                        <span className={`text-sm font-bold flex items-center justify-end gap-1 ${isTimeMgmtEnabled && isTimeExceeded ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>
                          <Timer className="w-3 h-3 text-slate-400" />
                          {formattedDuration} / {maxMinutesFormatted} min
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-500 uppercase block">PnL Não Realizado</span>
                        <span className={`text-lg font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${unrealizedPnlUsd.toFixed(2)}
                          <span className="text-[11px] block text-right font-bold opacity-80">({isProfit ? '+' : ''}{unrealizedPnlPct.toFixed(2)}%)</span>
                        </span>
                      </div>

                      <button 
                        type="button"
                        onClick={() => handleClosePosition(pos.id)}
                        className="p-2 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition ml-2 border border-slate-700 bg-slate-900"
                        title="Fechar Posição a Mercado"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Target Profit Progress Indicator & Time Management State */}
                  <div className="pt-2 border-t border-slate-800/60 flex flex-col gap-2 font-mono text-[11px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-slate-400 flex-wrap">
                        <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Meta Scalper ({isQuickProfitEnabled ? `+US$ ${target.toFixed(2)}` : 'Desativada'}):</span>
                        <strong className={isProfit ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          {isProfit ? `+$${pos.unrealizedPnlUsd.toFixed(2)}` : `-$${Math.abs(pos.unrealizedPnlUsd).toFixed(2)}`} / +${target.toFixed(2)}
                        </strong>

                        {/* Time Management Alert / Badge */}
                        {isTimeMgmtEnabled ? (
                          isTimeExceeded ? (
                            pos.unrealizedPnlUsd >= 0.03 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold border ml-1 bg-emerald-950/80 text-emerald-300 border-emerald-600/80 flex items-center gap-1">
                                🛡️ Tempo {formattedDuration} ≥ {maxMinutesLabel}: Lucro +US$ {pos.unrealizedPnlUsd.toFixed(2)} (≥ +3¢) ➔ Tempo Ignorado (Protegida)
                              </span>
                            ) : pos.unrealizedPnlUsd >= 0.00 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold border ml-1 bg-amber-950/80 text-amber-300 border-amber-600/80 animate-pulse">
                                ⏱️ Tempo {formattedDuration} ≥ {maxMinutesLabel}: Lucro +US$ {pos.unrealizedPnlUsd.toFixed(2)} (≥ 0¢) ➔ Finalizando 0¢ Positivo
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold border ml-1 bg-blue-950/80 text-blue-300 border-blue-600/80">
                                🛡️ Tempo {formattedDuration} ≥ {maxMinutesLabel}: Prejuízo -US$ {Math.abs(pos.unrealizedPnlUsd).toFixed(2)} ➔ Não Encerra no Prejuízo (Aguardando ≥ 0¢)
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-500 ml-1">
                              (⏱️ {formattedDuration} de {maxMinutesLabel})
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500 ml-1">
                            (⏱️ Gestão de Tempo Desativada)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 min-w-[180px]">
                        <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${isProfit ? 'bg-gradient-to-r from-cyan-500 to-emerald-400' : 'bg-slate-700'}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{progressPct.toFixed(0)}%</span>
                      </div>
                    </div>

                    {/* Dynamic Trailing Stop Ladder Status */}
                    <div className="flex items-center justify-between gap-2 text-[10px] bg-[#090b0e] p-1.5 rounded-lg border border-slate-800/80">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="text-slate-400">Trailing Stop ({isDynamicTrailingEnabled ? 'Dinâmico Ativo' : 'Fixo'}):</span>
                        <span className="text-slate-300">
                          Pico de Ganho: <strong className="text-cyan-300">+${(pos.highestUnrealizedPnlUsd || 0).toFixed(2)}</strong>
                        </span>
                        {isDynamicTrailingEnabled ? (
                          (pos.highestUnrealizedPnlUsd || 0) >= 0.30 ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold">
                              🛡️ 2º Estágio: Rastreador Ativo (Stop segue 15¢ atrás: +US$ {(pos.trailingLockedProfitUsd || 0.15).toFixed(2)} travado)
                            </span>
                          ) : (pos.highestUnrealizedPnlUsd || 0) >= 0.06 ? (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-bold">
                              🛡️ 1º Estágio: Protegido (+US$ 0,03 travado no Stop)
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              (Aguardando atingir +6¢ para travar stop em +3¢)
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500">
                            (Trailing Stop Dinâmico desativado na abertura da ordem)
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-slate-500">Stop Atual: </span>
                        <strong className={pos.trailingLockedProfitUsd && pos.trailingLockedProfitUsd > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                          ${pos.currentStopLoss}
                        </strong>
                      </div>
                    </div>
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Robot Activity & Audit Logs */}
      <div className="pt-4 border-t border-slate-800/80 font-mono">
        {/* Real-time Status Panel - Monitoramento de Gatilho do Robô */}
        <div className="bg-[#0b0c10] p-4 rounded-2xl border border-slate-800 mb-4 space-y-4 shadow-xl">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                account.isAutoTradingEnabled 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                <Activity className={`w-5 h-5 ${account.isAutoTradingEnabled ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    Monitoramento de Gatilho do Robô
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    account.isAutoTradingEnabled 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 animate-pulse' 
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}>
                    <Zap className="w-3 h-3 shrink-0" />
                    {account.isAutoTradingEnabled ? 'Auto-Trader Online & Monitorando' : 'Auto-Trader Pausado'}
                  </span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full uppercase font-bold">
                    Cesta: {account.assetSelectionMode === 'TOP_3_PROBABILITY' ? 'Top 3 Pareto (10min)' : account.assetSelectionMode === 'CUSTOM' ? `Personalizado (${(account.selectedSymbols || []).length} moedas)` : '15 Ativos'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Acompanhe em tempo real quais condições e gatilhos técnicos estão atendidos ou pendentes para o robô abrir cada ordem automaticamente.
                </p>
              </div>
            </div>

            {/* Global Trigger Status Counters */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-600/50 text-emerald-300 font-bold flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{evaluatedTriggers.filter(t => t.status === 'READY').length} Armado(s)</span>
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-950/70 border border-amber-600/50 text-amber-300 font-bold flex items-center gap-1.5 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{evaluatedTriggers.filter(t => t.status === 'PENDING').length} Pendente(s)</span>
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-600/50 text-cyan-300 font-bold flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{evaluatedTriggers.filter(t => t.status === 'ACTIVE').length} Em Execução</span>
              </span>
            </div>
          </div>

          {/* 4 Pillars Global Triggers Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Pillar 1: Vagas / Capacidade */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 ${
              openPositions.length < 3 ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-bold">
                <span className="flex items-center gap-1 text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> Vagas no Robô
                </span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                  openPositions.length < 3 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'
                }`}>
                  {3 - openPositions.length} VAGA(S) LIVRE(S)
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-black text-white">{openPositions.length} de 3 ocupadas</span>
                <span className="text-[10px] text-slate-400">{openPositions.length >= 3 ? 'Aguardando TP (+10¢)' : 'Pronto para entrada'}</span>
              </div>
            </div>

            {/* Pillar 2: Margem Disponível */}
            <div className={`p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 ${
              account.availableMarginUsd >= 10 ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-rose-950/20 border-rose-500/30'
            }`}>
              <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-bold">
                <span className="flex items-center gap-1 text-slate-300">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" /> Margem de Disparo
                </span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                  account.availableMarginUsd >= 10 ? 'bg-cyan-900/60 text-cyan-300' : 'bg-rose-900/60 text-rose-300'
                }`}>
                  {account.availableMarginUsd >= 10 ? 'MARGEM OK' : 'BAIXA'}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-black text-cyan-300">${account.availableMarginUsd.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400">Mínimo US$ 10.00</span>
              </div>
            </div>

            {/* Pillar 3: Dupla Chancela / BTC Âncora */}
            <div className="p-2.5 rounded-xl border bg-slate-950 border-slate-800/80 flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-bold">
                <span className="flex items-center gap-1 text-slate-300">
                  <Scale className="w-3.5 h-3.5 text-indigo-400" /> Âncora Dupla Chancela
                </span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                  liveBtcPonderado.side === 'LONG' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                }`}>
                  BTC {liveBtcPonderado.side}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-sm font-black ${liveBtcPonderado.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  BTC Ponderado ({liveBtcPonderado.score}/100)
                </span>
                <span className="text-[10px] text-slate-400">Score &gt;50 = LONG</span>
              </div>
            </div>

            {/* Pillar 4: Ciclo e Varredura */}
            <div className="p-2.5 rounded-xl border bg-slate-950 border-slate-800/80 flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-bold">
                <span className="flex items-center gap-1 text-slate-300">
                  <Timer className="w-3.5 h-3.5 text-amber-400" /> Ciclo Pareto & Varredura
                </span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                  isParetoCyclePaused ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {isParetoCyclePaused ? 'PAUSADO' : 'LOOP 4s'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black ${isParetoCyclePaused ? 'text-amber-500/70 line-through' : 'text-amber-300'}`}>
                    {formattedCycleTime} {isParetoCyclePaused && '(Pausado)'}
                  </span>
                  <button
                    onClick={() => setIsParetoCyclePaused(!isParetoCyclePaused)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      isParetoCyclePaused
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                    title={isParetoCyclePaused ? 'Retomar Ciclo Pareto e Varredura' : 'Pausar Ciclo Pareto e Varredura'}
                  >
                    {isParetoCyclePaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    {isParetoCyclePaused ? 'Retomar' : 'Pausar'}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400">
                  {isParetoCyclePaused ? 'Varredura suspensa' : isScanningNow ? 'Varrendo agora...' : 'Varredura ativa'}
                </span>
              </div>
            </div>
          </div>

          {/* Trigger Tabs Filter & Immediate Trigger Rule Banner */}
          <div className="space-y-2 pt-2 border-t border-slate-900">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-indigo-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-300">
                  <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                </span>
                <span className="text-[11px] text-slate-200 font-sans">
                  <strong className="text-emerald-400 font-mono font-bold">DISPARO AUTOMÁTICO IMEDIATO ATIVO:</strong> Ao satisfazer simultaneamente as <strong>8 verificações</strong> (100% dos gatilhos), o robô abre a ordem <strong>instantaneamente a mercado</strong> com gestão de risco e trailing stop dinâmico (6¢ ➔ 3¢ / 30¢ ➔ 15¢).
                </span>
              </div>
              <span className="text-[10px] shrink-0 font-bold px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-600/60 uppercase font-mono">
                8/8 = Execução Imediata
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-500" /> Filtrar Gatilhos:
                </span>
                {(['ALL', 'PENDING', 'READY', 'ACTIVE'] as const).map(tab => {
                  const count = tab === 'ALL' ? evaluatedTriggers.length :
                                tab === 'PENDING' ? evaluatedTriggers.filter(t => t.status === 'PENDING').length :
                                tab === 'READY' ? evaluatedTriggers.filter(t => t.status === 'READY').length :
                                evaluatedTriggers.filter(t => t.status === 'ACTIVE').length;
                  const label = tab === 'ALL' ? 'Todos' :
                                tab === 'PENDING' ? '⏳ Pendentes' :
                                tab === 'READY' ? '⚡ Armados (100%)' : '🚀 Em Execução';
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTriggerTabFilter(tab)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        triggerTabFilter === tab
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm'
                          : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>

              <span className="text-[10px] text-slate-400 font-mono">
                Pilar 1 (Dupla Chancela) + Pilar 2 (Confluência) + Pilar 3 (Livro HFT) + Pilar 4 (Vaga/Margem)
              </span>
            </div>
          </div>

          {/* Detailed Pending Triggers Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {evaluatedTriggers
              .filter(item => {
                if (triggerTabFilter === 'ALL') return true;
                if (triggerTabFilter === 'PENDING') return item.status === 'PENDING';
                if (triggerTabFilter === 'READY') return item.status === 'READY';
                if (triggerTabFilter === 'ACTIVE') return item.status === 'ACTIVE';
                return true;
              })
              .map(item => {
                const isOpen = !!item.openPos;
                const isReady = item.status === 'READY';
                const isLong = item.side === 'LONG';
                const rankMedal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank || '--'}`;

                return (
                  <div
                    key={item.symbol}
                    className={`p-3.5 rounded-xl border bg-slate-950/90 transition-all flex flex-col justify-between gap-3 shadow-md ${
                      isOpen
                        ? 'border-cyan-500/60 bg-cyan-950/10 shadow-cyan-950/20'
                        : isReady
                        ? 'border-emerald-500/70 bg-emerald-950/15 shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                        : 'border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    {/* Card Header */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{rankMedal}</span>
                          <span className="font-bold text-white text-sm">{item.symbol}</span>
                          <span className="text-[10px] text-slate-400 font-sans">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 uppercase block">Prob. Pareto</span>
                          <span className={`text-xs font-black ${item.winProbabilityPct >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {item.winProbabilityPct}%
                          </span>
                        </div>
                      </div>

                      {/* Direction & Price Target Bar */}
                      <div className="flex items-center justify-between bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/80 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">Sinal:</span>
                          <span className={`font-bold px-1.5 py-0.2 rounded border ${
                            isLong 
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}>
                            {item.side === 'LONG' ? 'COMPRA (LONG)' : 'VENDA (SHORT)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Spot: </span>
                          <strong className="text-white">${item.spotPrice > 0 ? item.spotPrice.toFixed(item.spotPrice > 10 ? 2 : 4) : '--'}</strong>
                        </div>
                      </div>

                      {/* Trigger Readiness Progress Bar */}
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Target className="w-3 h-3 text-indigo-400" /> Prontidão de Disparo:
                          </span>
                          <span className={
                            isOpen ? 'text-cyan-400' :
                            isReady ? 'text-emerald-400 font-black animate-pulse' :
                            item.readinessPct >= 75 ? 'text-emerald-300' :
                            item.readinessPct >= 50 ? 'text-amber-400' : 'text-slate-400'
                          }>
                            {isOpen ? 'ORDEM ABERTA' : `${item.readinessPct}% (${item.checksMetCount}/8 Gatilhos)`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 border border-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isOpen ? 'bg-cyan-500' :
                              isReady ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' :
                              item.readinessPct >= 50 ? 'bg-amber-400' : 'bg-slate-600'
                            }`}
                            style={{ width: `${isOpen ? 100 : item.readinessPct}%` }}
                          />
                        </div>
                      </div>

                      {/* 8 Triggers Diagnostic Checklist */}
                      <div className="mt-2.5 space-y-1 text-[10px] font-mono">
                        {/* Trigger 1: Dupla Chancela */}
                        <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                          item.check1_DuplaChancela 
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                            : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                        }`}>
                          <span className="flex items-center gap-1 truncate">
                            {item.check1_DuplaChancela ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <Clock className="w-3 h-3 text-amber-400 shrink-0" />}
                            <span>1. Dupla Chancela (Alinhamento BTC)</span>
                          </span>
                          <span className="font-bold shrink-0 text-[9.5px]">
                            {item.check1_DuplaChancela ? 'OK (Alinhado)' : `Pendente (${item.side} ≠ ${liveBtcPonderado.side})`}
                          </span>
                        </div>

                        {/* Trigger 2: Confluência Técnica */}
                        <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                          item.check2_ConfluenceScore 
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                            : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                        }`}>
                          <span className="flex items-center gap-1 truncate">
                            {item.check2_ConfluenceScore ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <Clock className="w-3 h-3 text-amber-400 shrink-0" />}
                            <span>2. Confluência Sniper</span>
                          </span>
                          <span className="font-bold shrink-0 text-[9.5px]">
                            {item.confluenceScore}% / Meta {item.requiredConfluenceScore}% {item.check2_ConfluenceScore ? '✓' : `(-${item.requiredConfluenceScore - item.confluenceScore}%)`}
                          </span>
                        </div>

                        {/* Trigger 3: Livro HFT & Absorção */}
                        <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                          item.check3_BookAndAbsorption 
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                        }`}>
                          <span className="flex items-center gap-1 truncate">
                            {item.check3_BookAndAbsorption ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />}
                            <span>3. Livro HFT (Sem Absorção)</span>
                          </span>
                          <span className="font-bold shrink-0 text-[9.5px]">
                            {item.check3_BookAndAbsorption ? 'Canal Livre' : 'Absorção Ativa'}
                          </span>
                        </div>

                        {/* Trigger 4: Vaga & Margem */}
                        <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                          item.check4_CapacityAndMargin 
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                        }`}>
                          <span className="flex items-center gap-1 truncate">
                            {item.check4_CapacityAndMargin ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <Clock className="w-3 h-3 text-slate-500 shrink-0" />}
                            <span>4. Vaga no Robô & Margem</span>
                          </span>
                          <span className="font-bold shrink-0 text-[9.5px]">
                            {item.check4_CapacityAndMargin ? `Livre (${openPositions.length}/3)` : '3/3 Preenchido'}
                          </span>
                        </div>

                        {/* Trigger 5: Filtro Anti-Armadilha */}
                        <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                          item.check5_AntiTrap 
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                        }`}>
                          <span className="flex items-center gap-1 truncate">
                            {item.check5_AntiTrap ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />}
                            <span>5. Filtro Anti-Armadilha</span>
                          </span>
                          <span className="font-bold shrink-0 text-[9.5px]">
                            {item.check5_AntiTrap ? 'Distância Segura' : 'Alerta de Proximidade'}
                          </span>
                        </div>

                        {/* Trigger 6: Desbalanço de Capital HFT (IA de Alto Fluxo) */}
                        <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                          item.check6_CapitalImbalance 
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                        }`}>
                          <span className="flex items-center gap-1 truncate">
                            {item.check6_CapitalImbalance ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />}
                            <span>6. Desbalanço de Capital HFT</span>
                          </span>
                          <span className="font-bold shrink-0 text-[9.5px]">
                            {item.check6_CapitalImbalance ? `Dominante (${item.capitalDominantSide})` : 'Divergente / Neutro'}
                          </span>
                        </div>

                        {/* Trigger 7: Deslocamento de Preço HFT (IA de Alto Fluxo) */}
                        <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                          item.check7_PriceDisplacement 
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                        }`}>
                          <span className="flex items-center gap-1 truncate">
                            {item.check7_PriceDisplacement ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />}
                            <span>7. Deslocamento de Preço HFT</span>
                          </span>
                          <span className="font-bold shrink-0 text-[9.5px]">
                            {item.check7_PriceDisplacement ? `Movimento Ativo (${(item.sparklineRangePct || 0).toFixed(2)}%)` : 'Preço Travado'}
                          </span>
                        </div>

                        {/* Trigger 8: Agressão Ativa no Time & Trades / Fita HFT (IA de Fita & Quota-Zero) */}
                        <div className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 ${
                          item.check8_TapeAggression 
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                            : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                        }`}>
                          <span className="flex items-center gap-1 truncate">
                            {item.check8_TapeAggression ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />}
                            <span>8. Agressão Ativa na Fita (Time & Trades)</span>
                          </span>
                          <span className="font-bold shrink-0 text-[9.5px]">
                            {item.check8_TapeAggression 
                              ? `Agressão OK (${item.side === 'LONG' ? item.tapeBuyAggressionPct : item.tapeSellAggressionPct}% a favor)` 
                              : 'Agressão Contrária'}
                          </span>
                        </div>
                      </div>

                      {/* Pending Details Box (Explaining exact reasons waiting) */}
                      {!isOpen && item.pendingItems.length > 0 && (
                        <div className="mt-2.5 p-2 rounded-lg bg-[#0d1017] border border-amber-500/30 font-sans space-y-1">
                          <div className="flex items-center gap-1 text-[9px] font-bold uppercase text-amber-400">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>Gatilhos Pendentes para Acionar Ordem:</span>
                          </div>
                          <ul className="text-[10px] text-slate-300 space-y-0.5 pl-3 list-disc">
                            {item.pendingItems.map((p, idx) => (
                              <li key={idx} className="leading-snug">
                                <strong className="text-amber-300">{p.title}:</strong> {p.desc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Live Status & Action Button */}
                    <div className="pt-2 border-t border-slate-900 space-y-2">
                      {isOpen ? (
                        <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-700/60 text-center">
                          <span className="text-[10.5px] font-bold text-cyan-300 flex items-center justify-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
                            Posição Aberta em Execução (PnL: {item.openPos!.unrealizedPnlUsd >= 0 ? '+' : ''}${item.openPos!.unrealizedPnlUsd.toFixed(2)})
                          </span>
                        </div>
                      ) : isReady ? (
                        <div className="p-2 rounded-lg bg-emerald-950/90 border border-emerald-500 text-center shadow-lg shadow-emerald-950/50">
                          <span className="text-[10.5px] font-black text-emerald-300 flex items-center justify-center gap-1.5 animate-pulse">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            ⚡ GATILHOS 8/8 ATENDIDOS (100%) → EXECUTANDO EM AUTOMÁTICO IMEDIATO...
                          </span>
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
                          <span className="text-[10px] font-bold text-amber-400/90 flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            Aguardando atendimento dos gatilhos pendentes
                          </span>
                        </div>
                      )}

                      {/* Trigger Actions (Armar Gatilho na Fita / Forçar Disparo) */}
                      {!isOpen && (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const symbolArmedTrigger = armedTriggers.find(t => t.symbol === item.symbol && t.status === 'ARMED');
                            if (symbolArmedTrigger) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleCancelTrigger(symbolArmedTrigger.id)}
                                  className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-cyan-950/80 hover:bg-rose-950/80 text-cyan-300 hover:text-rose-300 border border-cyan-500/50 hover:border-rose-500/50 transition flex items-center justify-center gap-1"
                                  title="Gatilho ativo monitorando agressão no Time & Trades. Clique para desarmar."
                                >
                                  <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
                                  <span>⚡ Gatilho Armado (✕ Desarmar)</span>
                                </button>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => handleArmTrigger(
                                  item.symbol, 
                                  isLong ? 'LONG' : 'SHORT', 
                                  quickArmSizeUsd, 
                                  quickArmLeverage, 
                                  quickArmTriggerMode, 
                                  quickArmMinVolume, 
                                  quickArmAutoRearm
                                )}
                                className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-cyan-950/50 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 transition flex items-center justify-center gap-1"
                                title="Arma gatilho para aguardar confirmação de agressão no Time & Trades antes de entrar"
                              >
                                <Zap className="w-3 h-3 text-cyan-400" />
                                <span>⚡ Armar Gatilho</span>
                              </button>
                            );
                          })()}

                          <button
                            type="button"
                            onClick={() => handleExecuteTop3Directly(item as any)}
                            disabled={isScanningNow}
                            className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/50"
                            title="Dispara a ordem imediatamente a mercado"
                          >
                            <Crosshair className="w-3 h-3 text-indigo-400" />
                            <span>Forçar Imediato</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Console Log Header with Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Histórico de Eventos & Auditoria</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-slate-500" />
            {(['ALL', 'ORDERS', 'INFO', 'WARNING'] as const).map(filter => {
              const count = filter === 'ALL' ? logs.length :
                            filter === 'ORDERS' ? logs.filter(l => l.type === 'ORDER_OPEN' || l.type === 'ORDER_CLOSE').length :
                            logs.filter(l => l.type === filter).length;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setLogFilter(filter)}
                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded border transition-all ${
                    logFilter === filter 
                      ? 'bg-indigo-950 text-indigo-300 border-indigo-700' 
                      : 'bg-slate-900/60 text-slate-500 border-slate-800 hover:text-slate-400'
                  }`}
                >
                  {filter === 'ALL' ? 'TODOS' : filter === 'ORDERS' ? 'ORDENS' : filter} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Terminal Output */}
        <div className="p-3 bg-[#0a0a0c] rounded-xl border border-slate-800/90 max-h-40 overflow-y-auto space-y-1 text-[11px] scrollbar-thin scrollbar-thumb-slate-800">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-slate-600 py-4 italic">Nenhum evento registrado com este filtro.</div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed hover:bg-slate-900/30 px-1 py-0.5 rounded transition">
                <span className="text-slate-500 shrink-0 font-mono">[{log.time}]</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono shrink-0 ${
                  log.type === 'ORDER_OPEN' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  log.type === 'ORDER_CLOSE' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                  log.type === 'WARNING' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                  'bg-slate-800/80 text-slate-400'
                }`}>
                  {log.type}
                </span>
                <span className={`text-slate-300 ${
                  log.type === 'ORDER_OPEN' ? 'text-emerald-300 font-bold' : 
                  log.type === 'ORDER_CLOSE' ? 'text-indigo-200 font-bold' : 
                  log.type === 'WARNING' ? 'text-amber-200' : ''
                }`}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* History (Brief) */}
      {closedPositions.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <h3 className="font-mono text-sm font-bold text-slate-300 uppercase">Histórico Recente de Fechamentos ({closedPositions.length})</h3>
            </div>
            <button 
              type="button"
              onClick={handleClearHistory}
              className="text-[10px] font-mono text-slate-500 hover:text-slate-300 underline"
            >
              Limpar Histórico
            </button>
          </div>

          {/* Analisador de Desempenho (Acertividade) */}
          <div className="mb-4 p-4 rounded-xl border border-slate-700/60 bg-[#0f1117] grid grid-cols-1 md:grid-cols-3 gap-4 shadow-inner">
            <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                Acertividade Global
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black font-mono text-indigo-300">{performanceStats.accuracyPct}%</span>
                <span className="text-xs text-slate-500 font-mono font-medium">({performanceStats.winningTrades}/{performanceStats.totalTrades} Wins)</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
              <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> 
                Melhor Horário
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold font-mono text-emerald-300">{performanceStats.bestHourStr}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  {performanceStats.bestHourAcc}% Acerto
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-rose-950/20 border border-rose-900/30">
              <span className="text-[10px] font-bold text-rose-400/80 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> 
                Pior Horário
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-bold font-mono text-rose-300">{performanceStats.worstHourStr}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                  {performanceStats.worstHourAcc}% Acerto
                </span>
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto overflow-x-auto rounded-xl border border-slate-800/80 bg-[#090b0e] p-2 scrollbar-thin scrollbar-thumb-slate-700">
            <table className="w-full text-left font-mono text-[11px] text-slate-400 whitespace-nowrap">
              <thead className="sticky top-0 bg-[#090b0e] border-b border-slate-800 text-slate-400 z-10 shadow-sm">
                <tr>
                  <th className="py-2 px-2 text-slate-400 font-bold">Data & Hora</th>
                  <th className="py-2 px-2 text-slate-400 font-bold">Ativo</th>
                  <th className="py-2 px-2 text-slate-400 font-bold">Side</th>
                  <th className="py-2 px-2 text-slate-400 font-bold">Fechamento (Motivo)</th>
                  <th className="py-2 px-2 text-right text-slate-400 font-bold">PnL Realizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {closedPositions.map(pos => {
                  const eventTime = pos.closeTime || pos.openTime;
                  const dateStr = eventTime ? new Date(eventTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '--/--/--';
                  const timeStr = eventTime ? new Date(eventTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--';
                  const realizedPnlUsd = pos.realizedPnlUsd ?? 0;

                  return (
                    <tr key={pos.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-2 px-2 text-slate-300 font-medium font-mono">
                        <span className="text-slate-200">{dateStr}</span> <span className="text-slate-400 text-[10px]">{timeStr}</span>
                      </td>
                      <td className="py-2 px-2 text-slate-200 font-bold">{pos.symbol}</td>
                      <td className={`py-2 px-2 font-bold ${pos.side === 'LONG' ? 'text-emerald-400' : 'text-rose-400'}`}>{pos.side}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center gap-1 ${pos.closeReason === 'TAKE_PROFIT' || pos.closeReason === 'TIME_EXPIRATION' || (pos.closeReason === 'TRAILING_STOP' && realizedPnlUsd > 0) ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                          {pos.closeReason === 'TRAILING_STOP' ? (realizedPnlUsd > 0 ? `🛡️ Trailing Stop (Travado: +$${realizedPnlUsd.toFixed(2)})` : '🛡️ Trailing Stop (Breakeven Risco Zero)') : 
                           pos.closeReason === 'STOP_LOSS' ? 'Stop Loss Acionado' : 
                           pos.closeReason === 'TAKE_PROFIT' ? '🎯 Take Profit (+10¢ Scalper)' : 
                           pos.closeReason === 'TIME_EXPIRATION' ? `⏱️ Tempo Limite (${(pos.maxOperationTimeMinutes || 1.5) === 1.5 ? '1m 30s' : `${pos.maxOperationTimeMinutes} min`} / 0¢ Positivo)` :
                           pos.closeReason === 'AI_DIVERGENCE' ? '🤖 Divergência IA' : 'Manual'}
                        </span>
                      </td>
                      <td className={`py-2 px-2 text-right font-black ${realizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {realizedPnlUsd >= 0 ? '+' : ''}${realizedPnlUsd.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* SCALPING WARNING MODAL */}
      {showScalpingWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a0a0b] border border-amber-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono">Alerta: Ambiente Desfavorável</h3>
                <p className="text-xs text-amber-300 font-mono mt-0.5">Indicador de Scalping em baixa ({scalpingAnalysis.score}/100)</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              O Indicador IA detectou que o momento atual <strong>não é o ideal para operações de Scalp</strong> (ganhos curtos). 
              A força do movimento direcional está fraca ou o horário atual não favorece alta liquidez institucional.
            </p>
            
            <div className="bg-[#12141a] p-3 rounded-xl border border-slate-800 mb-6 font-mono text-[11px] text-slate-400">
              {scalpingAnalysis.timeAnalysis}
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setShowScalpingWarningModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowScalpingWarningModal(false);
                  startAutoTrading(true);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-amber-500/50 bg-amber-500/20 text-amber-400 font-bold hover:bg-amber-500/30 transition"
              >
                Iniciar Mesmo Assim
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

