import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Database, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  History, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Timer,
  Compass,
  ShieldAlert,
  Zap,
  RefreshCw,
  ArrowDownUp,
  BookOpen,
  Target,
  Scale,
  Shield,
  Crosshair,
  Flame,
  AlertTriangle,
  Lock,
  Unlock,
  Sliders,
  DollarSign,
  Percent,
  XCircle
} from 'lucide-react';
import { Top10mProfitCrypto } from '../types/hftConfluenceTypes';
import { TimesAndTradeRow } from '../types/orderFlowTypes';
import { CoinDatabaseSnapshot } from '../types/cryptoTapeDbTypes';
import { 
  generate100NegotiationTradesForCoin, 
  pushLiveTradeTo100Tape, 
  calculateCoinTapeMetrics,
  getIndependentCoinDbSnapshots,
  saveIndependentCoinDbSnapshot,
  clearIndependentCoinDb,
  exportCoinDbToCSV,
  exportCoinDbToJSON
} from '../services/cryptoTapeDbService';
import { 
  executeHftOrderWithImputedData, 
  getTradingAccount, 
  getPositions, 
  manuallyClosePosition,
  updateAggressionTriggerSettings,
  armOrderTrigger,
  cancelArmedTrigger,
  getArmedTriggers,
  ARMED_TRIGGERS_EVENT,
  TRADING_ACCOUNT_EVENT 
} from '../services/tradingExecutionService';
import { TradePosition, PositionSide, TradingAccount, ArmedOrderTrigger } from '../types/tradingTypes';
import { generateLocalHftFlowAnalysis, HftFlowAnalysisResult, analyzeTimesAndTradesTapeAi } from '../services/hftFlowAnalysisService';

interface SingleCryptoTimesAndTradesProps {
  crypto: Top10mProfitCrypto;
  cycleTimeRemaining: string;
  isAutoTradingEnabled?: boolean;
}

export const SingleCryptoTimesAndTrades: React.FC<SingleCryptoTimesAndTradesProps> = ({
  crypto,
  cycleTimeRemaining
}) => {
  // Armed Triggers State for this crypto
  const [armedTriggers, setArmedTriggers] = useState<ArmedOrderTrigger[]>(() => getArmedTriggers());

  useEffect(() => {
    const handleArmedUpdate = () => {
      setArmedTriggers(getArmedTriggers());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(ARMED_TRIGGERS_EVENT, handleArmedUpdate);
      return () => window.removeEventListener(ARMED_TRIGGERS_EVENT, handleArmedUpdate);
    }
  }, []);

  const handleArmTrigger = (side: PositionSide) => {
    const res = armOrderTrigger({
      symbol: crypto.symbol,
      coinName: crypto.name || crypto.symbol,
      targetSide: side,
      sizeUsd: 100,
      leverage: 5,
      reason: `Gatilho Armado manualmente no Time & Trades para ${crypto.symbol}`
    });
    setArmedTriggers(getArmedTriggers());
    setSaveSuccessMsg(res.log);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleCancelTrigger = (triggerId: string) => {
    const res = cancelArmedTrigger(triggerId);
    setArmedTriggers(getArmedTriggers());
    setSaveSuccessMsg(res.log);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // 100 negotiation lines state
  const [trades, setTrades] = useState<TimesAndTradeRow[]>(() => generate100NegotiationTradesForCoin(crypto));
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL' | 'WHALE'>('ALL');
  const [minUsdFilter, setMinUsdFilter] = useState<number>(0);
  
  // Independent Database state
  const [savedSnapshots, setSavedSnapshots] = useState<CoinDatabaseSnapshot[]>([]);
  const [showDbHistory, setShowDbHistory] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // HFT AI Analyzer State with robust immediate local computation & localStorage cache
  const [hftAnalysis, setHftAnalysis] = useState<HftFlowAnalysisResult | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cached = window.localStorage.getItem(`hft_analysis_${crypto.symbol.toUpperCase()}`);
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return generateLocalHftFlowAnalysis(crypto.symbol, crypto.priceUsd || 100);
  });
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [hftError, setHftError] = useState<string | null>(null);

  // Trading Engine & Imputed Data Trigger State
  const [account, setAccount] = useState<TradingAccount>(() => getTradingAccount());
  const [positions, setPositions] = useState<TradePosition[]>(() => getPositions());
  const [orderSide, setOrderSide] = useState<PositionSide>('LONG');
  const [orderLeverage, setOrderLeverage] = useState<number>(1);
  const [entryMode, setEntryMode] = useState<'MARKET' | 'SUPPORT' | 'RESISTANCE' | 'CUSTOM'>('MARKET');
  const [customEntryPrice, setCustomEntryPrice] = useState<string>('');
  const [customStopLoss, setCustomStopLoss] = useState<string>('');
  const [customTakeProfit, setCustomTakeProfit] = useState<string>('');
  const [orderNote, setOrderNote] = useState<string>('');
  const [isTriggerPanelOpen, setIsTriggerPanelOpen] = useState<boolean>(true);
  const [orderFeedback, setOrderFeedback] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);

  // Synchronize trading account & positions with global state updates
  useEffect(() => {
    const handleAccountUpdate = () => {
      setAccount(getTradingAccount());
      setPositions(getPositions());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(TRADING_ACCOUNT_EVENT, handleAccountUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(TRADING_ACCOUNT_EVENT, handleAccountUpdate);
      }
    };
  }, []);

  // Find active open position for this crypto
  const currentOpenPosition = useMemo(() => {
    return positions.find(p => p.status === 'OPEN' && p.symbol === crypto.symbol);
  }, [positions, crypto.symbol]);

  // Active Tab: TAPE (Fita de Negócios) or BOOK (Livro de Ofertas Centralizado)
  const [activeTab, setActiveTab] = useState<'TAPE' | 'BOOK'>('TAPE');

  const bookContainerRef = useRef<HTMLDivElement>(null);
  const spotPriceRef = useRef<HTMLDivElement>(null);

  const tradesRef = useRef(trades);
  useEffect(() => {
    tradesRef.current = trades;
  }, [trades]);

  const scrollToCenter = () => {
    if (bookContainerRef.current && spotPriceRef.current) {
      const container = bookContainerRef.current;
      const target = spotPriceRef.current;
      const containerHeight = container.clientHeight;
      const targetOffsetTop = target.offsetTop;
      const targetHeight = target.clientHeight;
      container.scrollTop = targetOffsetTop - containerHeight / 2 + targetHeight / 2;
    }
  };

  // Centralized Order Book generator with 100 Asks (SELLs) and 100 Bids (BUYs)
  const bookData = useMemo(() => {
    const currentPrice = trades.length > 0 ? trades[0].price : (crypto.priceUsd || 100);
    const tickSize = currentPrice > 1000 ? 0.5 : currentPrice > 100 ? 0.05 : currentPrice > 10 ? 0.01 : currentPrice > 1 ? 0.001 : 0.0001;

    // 100 ASKs (Sells above current price) - ordered from level 100 down to level 1
    const asks = [];
    let cumulativeAskVol = 0;
    for (let i = 100; i >= 1; i--) {
      const askPrice = currentPrice + i * tickSize;
      // Stable pseudo-randomness based on price and coin symbol to avoid flickering but remain dynamic
      const seed = Math.sin(askPrice * 1000 + crypto.symbol.charCodeAt(0));
      // Standardize depth sizing to feel like a real professional market order book
      const size = Math.abs(seed * (crypto.symbol === 'BTC' ? 4 : crypto.symbol === 'ETH' ? 45 : 320)) + 0.1;
      const totalUsd = askPrice * size;
      cumulativeAskVol += totalUsd;
      asks.push({
        price: askPrice,
        size,
        totalUsd,
        cumulativeUsd: cumulativeAskVol,
        level: i
      });
    }

    // 100 BIDs (Buys below current price) - ordered from level 1 down to level 100
    const bids = [];
    let cumulativeBidVol = 0;
    for (let i = 1; i <= 100; i++) {
      const bidPrice = currentPrice - i * tickSize;
      const seed = Math.sin(bidPrice * 1000 + crypto.symbol.charCodeAt(1));
      const size = Math.abs(seed * (crypto.symbol === 'BTC' ? 4 : crypto.symbol === 'ETH' ? 45 : 320)) + 0.1;
      const totalUsd = bidPrice * size;
      cumulativeBidVol += totalUsd;
      bids.push({
        price: bidPrice,
        size,
        totalUsd,
        cumulativeUsd: cumulativeBidVol,
        level: i
      });
    }

    const maxCumulative = Math.max(cumulativeAskVol, cumulativeBidVol) || 1;
    const spreadVal = tickSize * 2;
    const spreadPct = (spreadVal / currentPrice) * 100;

    return { asks, bids, maxCumulative, tickSize, spreadVal, spreadPct };
  }, [trades, crypto.symbol, crypto.priceUsd]);

  const triggerHftAnalysis = async () => {
    setIsAnalyzing(true);
    setHftError(null);
    const currentPrice = tradesRef.current.length > 0 ? tradesRef.current[0].price : (crypto.priceUsd || 100);
    const localResult = generateLocalHftFlowAnalysis(crypto.symbol, currentPrice, tradesRef.current, bookData);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch("/api/analyze-hft-flow", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: crypto.symbol,
          priceUsd: currentPrice,
          trades: tradesRef.current.slice(0, 30),
          bookData: {
            asks: bookData.asks.slice(0, 30),
            bids: bookData.bids.slice(0, 30),
            spreadVal: bookData.spreadVal,
            spreadPct: bookData.spreadPct,
            tickSize: bookData.tickSize
          }
        })
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.result) {
          setHftAnalysis(data.result);
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(`hft_analysis_${crypto.symbol.toUpperCase()}`, JSON.stringify(data.result));
          }
          setHftError(null);
          return;
        }
      }

      // If response not ok or data empty, smoothly apply local result
      setHftAnalysis(localResult);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`hft_analysis_${crypto.symbol.toUpperCase()}`, JSON.stringify(localResult));
      }
      setHftError(null);
    } catch (_err) {
      // Smoothly apply instantaneous local calculation without error alerts
      setHftAnalysis(localResult);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`hft_analysis_${crypto.symbol.toUpperCase()}`, JSON.stringify(localResult));
      }
      setHftError(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run initial HFT analysis on mount and symbol change
  useEffect(() => {
    triggerHftAnalysis();
  }, [crypto.symbol]);

  // Auto-scroll the order book to center when tab is opened or coin is changed
  useEffect(() => {
    if (activeTab === 'BOOK') {
      const t = setTimeout(() => {
        scrollToCenter();
      }, 120);
      return () => clearTimeout(t);
    }
  }, [activeTab, crypto.symbol, trades]);

  // Periodically refresh HFT analysis every 20 seconds
  useEffect(() => {
    if (!isLiveStreaming) return;
    const interval = setInterval(() => {
      triggerHftAnalysis();
    }, 20000);
    return () => clearInterval(interval);
  }, [isLiveStreaming, crypto.symbol]);

  const prevSymbolRef = useRef(crypto.symbol);

  // Load initial database records
  useEffect(() => {
    setSavedSnapshots(getIndependentCoinDbSnapshots(crypto.symbol));
  }, [crypto.symbol]);

  // Re-generate 100 trades if symbol changes
  useEffect(() => {
    if (prevSymbolRef.current !== crypto.symbol) {
      prevSymbolRef.current = crypto.symbol;
      setTrades(generate100NegotiationTradesForCoin(crypto));
      setSavedSnapshots(getIndependentCoinDbSnapshots(crypto.symbol));
    }
  }, [crypto]);

  // Live order flow tick stream
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setTrades(prev => pushLiveTradeTo100Tape(crypto, prev));
    }, 1100 + Math.random() * 800);

    return () => clearInterval(interval);
  }, [isLiveStreaming, crypto]);

  // Tape Reading metrics calculated from current 100 lines
  const metrics = useMemo(() => calculateCoinTapeMetrics(trades), [trades]);

  // Filtered trades for UI display
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      if (filterType === 'BUY' && t.aggressor !== 'BUY') return false;
      if (filterType === 'SELL' && t.aggressor !== 'SELL') return false;
      if (filterType === 'WHALE' && t.tradeType !== 'Lote Institucional' && t.totalUsd < 8000) return false;
      if (minUsdFilter > 0 && t.totalUsd < minUsdFilter) return false;
      return true;
    });
  }, [trades, filterType, minUsdFilter]);

  // Handlers for independent database
  const handleSaveSnapshot = () => {
    const snap = saveIndependentCoinDbSnapshot(
      crypto,
      cycleTimeRemaining,
      trades,
      `Registro manual de 100 linhas - CVD: $${metrics.cvdNetUsd.toLocaleString()}`
    );
    setSavedSnapshots(getIndependentCoinDbSnapshots(crypto.symbol));
    setSaveSuccessMsg(`100 trades salvos no BD (${snap.timestamp})`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleClearDb = () => {
    if (window.confirm(`Deseja limpar todo o histórico do banco de dados de ${crypto.symbol}?`)) {
      clearIndependentCoinDb(crypto.symbol);
      setSavedSnapshots([]);
      setSaveSuccessMsg(`BD de ${crypto.symbol} limpo.`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    }
  };

  const handleDownloadCsv = () => {
    const csvContent = exportCoinDbToCSV(crypto.symbol);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tape_db_${crypto.symbol}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJson = () => {
    const jsonContent = exportCoinDbToJSON(crypto.symbol);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tape_db_${crypto.symbol}_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Synchronize imputed defaults whenever HFT analysis updates or symbol changes
  useEffect(() => {
    if (!hftAnalysis) return;

    const currentPrice = tradesRef.current.length > 0 ? tradesRef.current[0].price : (crypto.takeProfit1 || 100);
    const obSignal = hftAnalysis.orderBookReading?.signal;
    const sigType = obSignal?.signal || obSignal?.signalType || obSignal?.type || '';
    const easeVal = hftAnalysis.displacementEaseDirection?.value?.toUpperCase() || '';
    
    // Auto-detect optimal direction from HFT micro-structure reading
    let detectedSide: PositionSide = 'LONG';
    if (sigType.includes('VENDA') || sigType.includes('SHORT') || easeVal.includes('SHORT') || easeVal.includes('VENDA')) {
      detectedSide = 'SHORT';
    } else if (crypto.recommendedAction.includes('VENDA') || crypto.recommendedAction.includes('SHORT')) {
      detectedSide = 'SHORT';
    }
    setOrderSide(detectedSide);

    // Auto-calculate suggested Stop Loss & Take Profit from HFT order book walls
    const supPrice = hftAnalysis.orderBookReading?.support?.price ?? hftAnalysis.orderBookReading?.support?.priceLevel ?? 0;
    const resPrice = hftAnalysis.orderBookReading?.resistance?.price ?? hftAnalysis.orderBookReading?.resistance?.priceLevel ?? 0;
    const stepRatio = currentPrice > 1000 ? 0.003 : 0.008;

    if (detectedSide === 'LONG') {
      const suggestedSl = supPrice > 0 && supPrice < currentPrice ? supPrice * 0.997 : currentPrice * (1 - stepRatio * 3.2);
      const suggestedTp = resPrice > currentPrice ? resPrice * 0.999 : currentPrice * (1 + stepRatio * 4);
      setCustomStopLoss(suggestedSl.toFixed(currentPrice < 1 ? 4 : 2));
      setCustomTakeProfit(suggestedTp.toFixed(currentPrice < 1 ? 4 : 2));
    } else {
      const suggestedSl = resPrice > currentPrice ? resPrice * 1.003 : currentPrice * (1 + stepRatio * 3.2);
      const suggestedTp = supPrice > 0 && supPrice < currentPrice ? supPrice * 1.001 : currentPrice * (1 - stepRatio * 4);
      setCustomStopLoss(suggestedSl.toFixed(currentPrice < 1 ? 4 : 2));
      setCustomTakeProfit(suggestedTp.toFixed(currentPrice < 1 ? 4 : 2));
    }
  }, [hftAnalysis, crypto.symbol]);

  const handleSwitchSide = (newSide: PositionSide) => {
    setOrderSide(newSide);
    const currentPrice = tradesRef.current.length > 0 ? tradesRef.current[0].price : (crypto.takeProfit1 || 100);
    const supPrice = hftAnalysis?.orderBookReading?.support?.price ?? hftAnalysis?.orderBookReading?.support?.priceLevel ?? 0;
    const resPrice = hftAnalysis?.orderBookReading?.resistance?.price ?? hftAnalysis?.orderBookReading?.resistance?.priceLevel ?? 0;
    const stepRatio = currentPrice > 1000 ? 0.003 : 0.008;

    if (newSide === 'LONG') {
      const suggestedSl = supPrice > 0 && supPrice < currentPrice ? supPrice * 0.997 : currentPrice * (1 - stepRatio * 3.2);
      const suggestedTp = resPrice > currentPrice ? resPrice * 0.999 : currentPrice * (1 + stepRatio * 4);
      setCustomStopLoss(suggestedSl.toFixed(currentPrice < 1 ? 4 : 2));
      setCustomTakeProfit(suggestedTp.toFixed(currentPrice < 1 ? 4 : 2));
    } else {
      const suggestedSl = resPrice > currentPrice ? resPrice * 1.003 : currentPrice * (1 + stepRatio * 3.2);
      const suggestedTp = supPrice > 0 && supPrice < currentPrice ? supPrice * 1.001 : currentPrice * (1 - stepRatio * 4);
      setCustomStopLoss(suggestedSl.toFixed(currentPrice < 1 ? 4 : 2));
      setCustomTakeProfit(suggestedTp.toFixed(currentPrice < 1 ? 4 : 2));
    }
  };

  const handleExecuteHftOrder = () => {
    const currentPrice = tradesRef.current.length > 0 ? tradesRef.current[0].price : (crypto.takeProfit1 || 100);
    const supPrice = hftAnalysis?.orderBookReading?.support?.price ?? hftAnalysis?.orderBookReading?.support?.priceLevel ?? 0;
    const resPrice = hftAnalysis?.orderBookReading?.resistance?.price ?? hftAnalysis?.orderBookReading?.resistance?.priceLevel ?? 0;
    const stepRatio = currentPrice > 1000 ? 0.003 : 0.008;

    // Automated SL & TP calculation matching Auto-Trader HFT
    let derivedSl: number;
    let derivedTp1: number;

    if (orderSide === 'LONG') {
      if (supPrice > 0 && supPrice < currentPrice) {
        derivedSl = Number((supPrice * 0.997).toFixed(currentPrice < 1 ? 4 : 2));
      } else {
        derivedSl = Number((currentPrice * (1 - stepRatio * 3.2)).toFixed(currentPrice < 1 ? 4 : 2));
      }
      if (resPrice > currentPrice) {
        derivedTp1 = Number((resPrice * 0.999).toFixed(currentPrice < 1 ? 4 : 2));
      } else {
        derivedTp1 = Number((currentPrice * (1 + stepRatio * 4)).toFixed(currentPrice < 1 ? 4 : 2));
      }
    } else {
      if (resPrice > currentPrice) {
        derivedSl = Number((resPrice * 1.003).toFixed(currentPrice < 1 ? 4 : 2));
      } else {
        derivedSl = Number((currentPrice * (1 + stepRatio * 3.2)).toFixed(currentPrice < 1 ? 4 : 2));
      }
      if (supPrice > 0 && supPrice < currentPrice) {
        derivedTp1 = Number((supPrice * 1.001).toFixed(currentPrice < 1 ? 4 : 2));
      } else {
        derivedTp1 = Number((currentPrice * (1 - stepRatio * 4)).toFixed(currentPrice < 1 ? 4 : 2));
      }
    }

    // Automated Risk Management & Position Sizing matching Auto-Trader HFT
    const maxRiskPct = account.maxRiskPerTradePct || 2;
    const maxRiskUsd = (account.demoBalanceUsd * maxRiskPct) / 100;
    const slDistRatio = Math.max(0.015, Math.abs(currentPrice - derivedSl) / (currentPrice || 1));
    let desiredSizeUsd = maxRiskUsd / slDistRatio;

    if (desiredSizeUsd > account.availableMarginUsd) {
      desiredSizeUsd = account.availableMarginUsd;
    }
    if (desiredSizeUsd < 10) {
      desiredSizeUsd = Math.max(10, Math.min(account.availableMarginUsd, account.demoBalanceUsd * 0.30));
    }

    const effectiveSize = Math.max(5, desiredSizeUsd);

    const res = executeHftOrderWithImputedData({
      symbol: crypto.symbol,
      coinName: crypto.name,
      currentPrice,
      entryPrice: currentPrice,
      side: orderSide,
      sizeUsd: effectiveSize,
      leverage: 1,
      customStopLoss: derivedSl,
      customTakeProfit: derivedTp1,
      isQuickProfitExitEnabled: account.isQuickProfitExitEnabled,
      targetProfitUsd: account.targetProfitUsd,
      isTimeManagementEnabled: account.isTimeManagementEnabled,
      maxOperationTimeMinutes: account.maxOperationTimeMinutes,
      timeDecayProfitTargetUsd: account.timeDecayProfitTargetUsd,
      isDynamicTrailingStopEnabled: account.isDynamicTrailingStopEnabled,
      hftAnalysis,
      account,
      positions,
      orderNote: `⚡ Disparo HFT ${orderSide} | Dimensionamento Automático: US$ ${effectiveSize.toFixed(2)} (Risco: ${maxRiskPct}% = US$ ${maxRiskUsd.toFixed(2)})`
    });

    if (res.tradeOpened) {
      setAccount({ ...res.account });
      setPositions([...res.positions]);
      setOrderFeedback({ type: 'success', message: res.log });
    } else {
      setOrderFeedback({ type: 'warning', message: res.log });
    }

    setTimeout(() => {
      setOrderFeedback(null);
    }, 6000);
  };

  const handleCloseActivePosition = () => {
    if (!currentOpenPosition) return;
    const res = manuallyClosePosition(currentOpenPosition.id, account, positions);
    setAccount({ ...res.account });
    setPositions([...res.positions]);
    setOrderFeedback({ type: 'success', message: `Posição em ${crypto.symbol} encerrada com sucesso! Margem liberada.` });
    setTimeout(() => setOrderFeedback(null), 4000);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-800/80 font-mono text-xs flex flex-col space-y-2.5">
      {/* Tape Header & Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                Time & Trade (100L)
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {trades.length} trades
              </span>
              {isLiveStreaming ? (
                <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE
                </span>
              ) : (
                <span className="text-[9px] text-amber-400 font-bold">PAUSADO</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons: Pause, Expand, Gravar BD */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`p-1 rounded border text-[10px] transition ${
              isLiveStreaming 
                ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-amber-500/30' 
                : 'bg-emerald-600/30 hover:bg-emerald-500/40 text-emerald-300 border-emerald-500/50'
            }`}
            title={isLiveStreaming ? 'Pausar fluxo em tempo real' : 'Retomar fluxo ao vivo'}
          >
            {isLiveStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={handleSaveSnapshot}
            className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold flex items-center gap-1 shadow-sm transition"
            title={`Salvar snapshot dos 100 trades no banco de dados de ${crypto.symbol}`}
          >
            <Database className="w-3 h-3 text-indigo-400" />
            <span>Gravar BD</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDbHistory(!showDbHistory)}
            className={`px-2 py-1 rounded border text-[10px] font-bold flex items-center gap-1 transition ${
              showDbHistory
                ? 'bg-cyan-600 text-white border-cyan-400'
                : 'bg-slate-800/90 hover:bg-slate-750 text-cyan-300 border-cyan-500/30'
            }`}
            title="Abrir histórico gravado no banco de dados independente"
          >
            <History className="w-3 h-3" />
            <span>BD ({savedSnapshots.length})</span>
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-[10px] flex items-center gap-1.5 animate-in fade-in">
          <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Mini Order Flow Metrics Ribbon for this Coin */}
      <div className="p-2 rounded-lg bg-[#0b0f14] border border-slate-800 flex items-center justify-between gap-2 text-[10px]">
        <div>
          <span className="text-[8px] text-slate-500 uppercase block">CVD Líquido (100L)</span>
          <span className={`font-bold ${metrics.cvdNetUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {metrics.cvdNetUsd >= 0 ? '+' : ''}${Math.round(metrics.cvdNetUsd).toLocaleString()}
          </span>
        </div>

        <div className="text-center">
          <span className="text-[8px] text-slate-500 uppercase block">Pressão C/V</span>
          <span className="font-bold text-slate-200">
            <span className="text-emerald-400">{metrics.buyPressurePct}%</span> / <span className="text-rose-400">{metrics.sellPressurePct}%</span>
          </span>
        </div>

        <div className="text-center">
          <span className="text-[8px] text-slate-500 uppercase block">Baleias 🐋</span>
          <span className="font-bold text-amber-300">
            {metrics.whaleTradesCount} ({Math.round(metrics.whaleVolumeUsd / 1000)}k)
          </span>
        </div>

        <div className="text-right">
          <span className="text-[8px] text-slate-500 uppercase block">Dominância</span>
          <span className="font-bold text-cyan-400">{metrics.institutionalDominanceScore}%</span>
        </div>
      </div>

      {/* RASTREADORES DE FLUXO E GATILHOS NO TIMES & TRADES */}
      {(() => {
        const currentSpot = trades.length > 0 ? trades[0].price : (crypto.priceUsd || 100);
        const tapeAi = hftAnalysis?.tapeAiAnalysis || analyzeTimesAndTradesTapeAi(crypto.symbol, currentSpot, trades);
        
        const isBuyerActive = tapeAi.buyerEscalation.isActive;
        const isSellerActive = tapeAi.sellerEscalation.isActive;
        const isTriggerActive = account.isAggressionTriggerEnabled !== false;

        const handleToggleLocalTrigger = () => {
          const nextVal = !isTriggerActive;
          const updated = updateAggressionTriggerSettings(nextVal);
          setAccount(updated);
        };

        return (
          <div className="space-y-2">
            {/* RASTREADOR 1: IA ANALISA COMPRADOR COMPRANDO MAIS CARO */}
            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md transition-all ${
              isBuyerActive 
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-emerald-950/50 ring-1 ring-emerald-400/50' 
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-xl border shrink-0 ${
                  isBuyerActive 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60 animate-pulse shadow-md shadow-emerald-500/20' 
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      IA Tape Reading: Compradores Comprando Mais Caro
                    </span>
                    <span className={`text-[8.5px] px-2 py-0.5 rounded font-extrabold border ${
                      isBuyerActive 
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {isBuyerActive ? '🟢 SINALIZADO: COMPRADOR COMPRANDO MAIS CARO' : '⚪ AGUARDANDO COMPRA MAIS CARA'}
                    </span>
                  </div>
                  <p className="text-[10px] leading-tight font-sans">
                    {tapeAi.buyerEscalation.aiDiagnosis}
                  </p>
                  {isBuyerActive && (
                    <div className="flex items-center gap-3 text-[9px] text-emerald-300 font-mono font-bold pt-0.5 flex-wrap">
                      <span>• Aumento: <strong>+${tapeAi.buyerEscalation.priceDifferenceUsd.toFixed(4)} (+{tapeAi.buyerEscalation.priceDifferencePct.toFixed(2)}%)</strong></span>
                      <span>• Início: <strong>${tapeAi.buyerEscalation.startPrice.toFixed(4)}</strong> ➔ Atual: <strong>${tapeAi.buyerEscalation.currentPrice.toFixed(4)}</strong></span>
                      <span>• Sequência Ask: <strong>{tapeAi.buyerEscalation.consecutiveCount} ordens</strong></span>
                      <span>• Volume Comprador: <strong>${Math.round(tapeAi.buyerEscalation.totalVolumeUsd).toLocaleString()}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right self-end sm:self-center">
                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border shadow-sm ${
                  isBuyerActive 
                    ? 'bg-emerald-500 text-black border-emerald-300 shadow-emerald-900/40 animate-pulse' 
                    : 'bg-slate-800/90 text-slate-400 border-slate-700'
                }`}>
                  {isBuyerActive ? '🟢 COMPRADOR COMPRANDO MAIS CARO' : '⚪ AGUARDANDO VARREDURA ASK'}
                </span>
              </div>
            </div>

            {/* RASTREADOR 2: IA ANALISA VENDEDOR VENDENDO MAIS BARATO */}
            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md transition-all ${
              isSellerActive 
                ? 'bg-rose-950/70 border-rose-500 text-rose-200 shadow-rose-950/50 ring-1 ring-rose-400/50' 
                : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
            }`}>
              <div className="flex items-start gap-2.5">
                <div className={`p-2 rounded-xl border shrink-0 ${
                  isSellerActive 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/60 animate-pulse shadow-md shadow-rose-500/20' 
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}>
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      IA Tape Reading: Vendedores Vendendo Mais Barato
                    </span>
                    <span className={`text-[8.5px] px-2 py-0.5 rounded font-extrabold border ${
                      isSellerActive 
                        ? 'bg-rose-500/30 text-rose-200 border-rose-400' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {isSellerActive ? '🔴 SINALIZADO: VENDEDOR VENDENDO MAIS BARATO' : '⚪ AGUARDANDO VENDA MAIS BARATA'}
                    </span>
                  </div>
                  <p className="text-[10px] leading-tight font-sans">
                    {tapeAi.sellerEscalation.aiDiagnosis}
                  </p>
                  {isSellerActive && (
                    <div className="flex items-center gap-3 text-[9px] text-rose-300 font-mono font-bold pt-0.5 flex-wrap">
                      <span>• Queda: <strong>-${tapeAi.sellerEscalation.priceDifferenceUsd.toFixed(4)} (-{tapeAi.sellerEscalation.priceDifferencePct.toFixed(2)}%)</strong></span>
                      <span>• Início: <strong>${tapeAi.sellerEscalation.startPrice.toFixed(4)}</strong> ➔ Atual: <strong>${tapeAi.sellerEscalation.currentPrice.toFixed(4)}</strong></span>
                      <span>• Sequência Bid: <strong>{tapeAi.sellerEscalation.consecutiveCount} ordens</strong></span>
                      <span>• Volume Vendedor: <strong>${Math.round(tapeAi.sellerEscalation.totalVolumeUsd).toLocaleString()}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right self-end sm:self-center">
                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 border shadow-sm ${
                  isSellerActive 
                    ? 'bg-rose-500 text-white border-rose-300 shadow-rose-900/40 animate-pulse' 
                    : 'bg-slate-800/90 text-slate-400 border-slate-700'
                }`}>
                  {isSellerActive ? '🔴 VENDEDOR VENDENDO MAIS BARATO' : '⚪ AGUARDANDO VARREDURA BID'}
                </span>
              </div>
            </div>

            {/* GATILHO DE EXECUÇÃO DA ORDEM (LIBERAR SOMENTE SE AGRESSÃO FOR A FAVOR) */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#0d141e] via-[#0e1726] to-[#0d141e] border border-cyan-500/40 shadow-lg space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-wider text-white">
                        Gatilho de Execução: Liberar Somente com Agressão a Favor
                      </span>
                      <span className={`text-[8.5px] px-2 py-0.5 rounded font-bold border ${
                        isTriggerActive 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {isTriggerActive ? '🛡️ GATILHO TIME & TRADES ATIVO' : 'DESATIVADO'}
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-400 font-sans">
                      Analisa a fita em tempo real: bloqueia compras se vendedores estiverem despejando e bloqueia vendas se compradores estiverem varrendo para cima.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleLocalTrigger}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition shrink-0 ${
                    isTriggerActive
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {isTriggerActive ? '🛡️ Ativo (Clique p/ Desativar)' : 'Desativado (Clique p/ Ativar)'}
                </button>
              </div>

              {/* Status de Liberação para LONG e SHORT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9.5px]">
                {/* Status Compra (LONG) */}
                <div className={`p-2 rounded-lg border flex items-start justify-between gap-2 ${
                  tapeAi.executionGate.isLongAllowed 
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold mb-0.5">
                      <span>Ordem COMPRA (LONG):</span>
                      <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase ${
                        tapeAi.executionGate.isLongAllowed ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'
                      }`}>
                        {tapeAi.executionGate.isLongAllowed ? '🟢 LIBERADA' : '⛔ BLOQUEADA'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-300 leading-tight">
                      {tapeAi.executionGate.reasonLong}
                    </p>
                  </div>
                  <span className="text-[12px] shrink-0 font-bold">
                    {tapeAi.executionGate.isLongAllowed ? '✓' : '✗'}
                  </span>
                </div>

                {/* Status Venda (SHORT) */}
                <div className={`p-2 rounded-lg border flex items-start justify-between gap-2 ${
                  tapeAi.executionGate.isShortAllowed 
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200' 
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                }`}>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold mb-0.5">
                      <span>Ordem VENDA (SHORT):</span>
                      <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase ${
                        tapeAi.executionGate.isShortAllowed ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'
                      }`}>
                        {tapeAi.executionGate.isShortAllowed ? '🔴 LIBERADA' : '⛔ BLOQUEADA'}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-300 leading-tight">
                      {tapeAi.executionGate.reasonShort}
                    </p>
                  </div>
                  <span className="text-[12px] shrink-0 font-bold">
                    {tapeAi.executionGate.isShortAllowed ? '✓' : '✗'}
                  </span>
                </div>
              </div>

              {/* CONTROLES DE ARMAR GATILHO PARA LIBERAÇÃO DE ORDEM */}
              {(() => {
                const activeTrigger = armedTriggers.find(t => t.symbol === crypto.symbol && t.status === 'ARMED');
                return (
                  <div className="pt-2 border-t border-slate-800/80">
                    {activeTrigger ? (
                      <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md animate-pulse">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
                                ⚡ GATILHO ARMADO: {activeTrigger.targetSide === 'LONG' ? 'COMPRA (LONG)' : 'VENDA (SHORT)'}
                              </span>
                              <span className="text-[8.5px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 font-bold">
                                Monitorando Fita Segundo a Segundo
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-300 mt-0.5">
                              Status Atual: <strong className="text-white">{activeTrigger.currentAggressionStatus}</strong>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCancelTrigger(activeTrigger.id)}
                          className="px-2.5 py-1 rounded bg-rose-600/30 hover:bg-rose-500/40 text-rose-200 border border-rose-500/50 text-[9.5px] font-bold transition shrink-0 self-end sm:self-center"
                        >
                          ✕ Desarmar Gatilho
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        <span className="text-[9px] text-slate-400 font-sans">
                          ⚡ <strong>Armar Gatilho:</strong> O robô aguarda o momento exato em que a agressão no Time & Trades fica a favor antes de liberar a ordem.
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleArmTrigger('LONG')}
                            className="px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/50 text-[9px] font-bold flex items-center gap-1 transition"
                            title="Armar gatilho de compra para liberar assim que houver agressão compradora"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Armar Gatilho COMPRA</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArmTrigger('SHORT')}
                            className="px-2 py-1 rounded bg-rose-600/30 hover:bg-rose-500/40 text-rose-300 border border-rose-500/50 text-[9px] font-bold flex items-center gap-1 transition"
                            title="Armar gatilho de venda para liberar assim que houver agressão vendedora"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Armar Gatilho VENDA</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* HFT AI FLOW ANALYZER DASHBOARD */}
      <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3.5 shadow-xl shadow-indigo-500/5 select-text">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Brain className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-white font-black text-[11px] uppercase tracking-wider">
                  Analisador HFT com IA de Alto Fluxo
                </h4>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              </div>
              <p className="text-[9px] text-slate-400">
                Análise de microestrutura de ordens ao vivo para {crypto.symbol}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={triggerHftAnalysis}
            disabled={isAnalyzing}
            className={`px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/50 text-[10px] font-bold flex items-center gap-1 transition ${
              isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analisando...' : 'Recalcular Fluxo IA'}</span>
          </button>
        </div>

        {/* Display Error if any */}
        {hftError && (
          <div className="p-2 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[9.5px]">
            {hftError}
          </div>
        )}

        {/* HFT AI FLOW & ORDER BOOK READING DASHBOARD */}
        {hftAnalysis ? (
          <div className="space-y-3">
            {/* NOVO: MÓDULO EXCLUSIVO DE LEITURA DO BOOK DE OFERTAS (DOM) */}
            {hftAnalysis.orderBookReading && (
              <div className="p-3 rounded-xl bg-gradient-to-br from-[#090d16] via-[#0e1320] to-[#0c161f] border border-indigo-500/40 space-y-2.5 shadow-lg shadow-indigo-950/40">
                <div className="flex items-center justify-between gap-2 border-b border-indigo-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-white uppercase tracking-wider">
                          Leitura do Book de Ofertas com IA (DOM Microstructure)
                        </span>
                        <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          PROFUNDIDADE 200 NÍVEIS
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400">
                        Identificação de sinais, suporte e resistência derivados das ordens passivas acumuladas
                      </span>
                    </div>
                  </div>

                  {/* DOM Imbalance Gauge */}
                  <div className="flex items-center gap-2 text-[9px] bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
                    <span className="text-slate-400">Desequilíbrio DOM:</span>
                    <span className="font-bold text-emerald-400">
                      {hftAnalysis.orderBookReading.imbalance?.bidRatioPct ?? hftAnalysis.orderBookReading.imbalance?.bidPct ?? 50}% Bids
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="font-bold text-rose-400">
                      {hftAnalysis.orderBookReading.imbalance?.askRatioPct ?? hftAnalysis.orderBookReading.imbalance?.askPct ?? 50}% Asks
                    </span>
                  </div>
                </div>

                {/* 3 Core Order Book Cards: SINAL | SUPORTE | RESISTÊNCIA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* Card 1: SINAL OPERACIONAL DO LIVRO DE OFERTAS */}
                  <div className={`p-2.5 rounded-xl border flex flex-col justify-between space-y-2 ${
                    hftAnalysis.orderBookReading.signal.color === 'emerald'
                      ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm shadow-emerald-950/30'
                      : hftAnalysis.orderBookReading.signal.color === 'rose'
                      ? 'bg-rose-950/30 border-rose-500/50 shadow-sm shadow-rose-950/30'
                      : hftAnalysis.orderBookReading.signal.color === 'cyan'
                      ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm shadow-cyan-950/30'
                      : 'bg-amber-950/30 border-amber-500/50 shadow-sm shadow-amber-950/30'
                  }`}>
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                          <Activity className="w-3 h-3 text-indigo-400" />
                          Sinal do Livro de Ofertas
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                          hftAnalysis.orderBookReading.signal.color === 'emerald'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                            : hftAnalysis.orderBookReading.signal.color === 'rose'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {hftAnalysis.orderBookReading.signal.signalType || hftAnalysis.orderBookReading.signal.type || hftAnalysis.orderBookReading.signal.signal || 'SINAL'}
                        </span>
                      </div>

                      <div className="text-[11px] font-black leading-snug">
                        <span className={
                          hftAnalysis.orderBookReading.signal.color === 'emerald'
                            ? 'text-emerald-300'
                            : hftAnalysis.orderBookReading.signal.color === 'rose'
                            ? 'text-rose-300'
                            : hftAnalysis.orderBookReading.signal.color === 'cyan'
                            ? 'text-cyan-300'
                            : 'text-amber-300'
                        }>
                          {hftAnalysis.orderBookReading.signal.label}
                        </span>
                      </div>

                      {/* Confidence Progress Bar */}
                      <div className="mt-1.5 space-y-0.5">
                        <div className="flex justify-between text-[8px] text-slate-400">
                          <span>Convicção HFT</span>
                          <span className="font-bold text-slate-200">
                            {hftAnalysis.orderBookReading.signal.confidencePct || 70}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              hftAnalysis.orderBookReading.signal.color === 'emerald'
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : hftAnalysis.orderBookReading.signal.color === 'rose'
                                ? 'bg-gradient-to-r from-rose-500 to-red-400'
                                : 'bg-gradient-to-r from-amber-500 to-orange-400'
                            }`}
                            style={{ width: `${hftAnalysis.orderBookReading.signal.confidencePct || 70}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[8.5px] text-slate-300 leading-tight border-t border-slate-800/80 pt-1.5">
                      {hftAnalysis.orderBookReading.signal.biasDescription || hftAnalysis.orderBookReading.signal.rationale || 'Análise de fluxo baseada nas ordens limites.'}
                    </p>
                  </div>

                  {/* Card 2: SUPORTE VOLUMÉTRICO PRINCIPAL (BIDS / PAREDE) */}
                  {(() => {
                    const sup = hftAnalysis.orderBookReading.support;
                    const supPrice = sup?.price ?? sup?.priceLevel ?? crypto.priceUsd * 0.995;
                    const supVol = sup?.volumeUsd ?? 10000;
                    const dist = sup?.distancePct ?? 0.5;
                    const ticks = sup?.ticksBelow ?? Math.max(1, Math.round(dist * 10));
                    const sig = sup?.significance || sup?.wallStrength || 'PAREDE COMPRADORA';
                    return (
                      <div className="p-2.5 rounded-xl border bg-emerald-950/20 border-emerald-500/40 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[8.5px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                              <Shield className="w-3 h-3 text-emerald-400" />
                              Suporte do Livro (Bids)
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {sig}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-base font-black text-emerald-400">
                              ${supPrice.toFixed(supPrice > 10 ? 2 : 4)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold">
                              {dist.toFixed(2)}% ({ticks} ticks abaixo)
                            </span>
                          </div>

                          <div className="text-[9px] text-emerald-300/90 font-semibold mt-0.5 flex items-center gap-1">
                            <span>Parede:</span>
                            <span className="font-black text-white">
                              {sup?.volumeFormatted || (supVol >= 1000 ? `$${(supVol / 1000).toFixed(0)}k USD` : `$${supVol.toFixed(0)} USD`)}
                            </span>
                            <span className="text-slate-500 text-[8px]">• Defesa Compradora</span>
                          </div>
                        </div>

                        <p className="text-[8.5px] text-slate-300 leading-tight border-t border-slate-800/80 pt-1.5">
                          {sup?.description || `Parede de liquidez institucional atuando como suporte.`}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Card 3: RESISTÊNCIA VOLUMÉTRICA PRINCIPAL (ASKS / BARREIRA) */}
                  {(() => {
                    const res = hftAnalysis.orderBookReading.resistance;
                    const resPrice = res?.price ?? res?.priceLevel ?? crypto.priceUsd * 1.005;
                    const resVol = res?.volumeUsd ?? 10000;
                    const dist = res?.distancePct ?? 0.5;
                    const ticks = res?.ticksAbove ?? Math.max(1, Math.round(dist * 10));
                    const sig = res?.significance || res?.wallStrength || 'BARREIRA VENDEDORA';
                    return (
                      <div className="p-2.5 rounded-xl border bg-rose-950/20 border-rose-500/40 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[8.5px] font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1">
                              <Target className="w-3 h-3 text-rose-400" />
                              Resistência do Livro (Asks)
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              {sig}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between gap-1">
                            <span className="text-base font-black text-rose-400">
                              ${resPrice.toFixed(resPrice > 10 ? 2 : 4)}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold">
                              +{dist.toFixed(2)}% ({ticks} ticks acima)
                            </span>
                          </div>

                          <div className="text-[9px] text-rose-300/90 font-semibold mt-0.5 flex items-center gap-1">
                            <span>Barreira:</span>
                            <span className="font-black text-white">
                              {res?.volumeFormatted || (resVol >= 1000 ? `$${(resVol / 1000).toFixed(0)}k USD` : `$${resVol.toFixed(0)} USD`)}
                            </span>
                            <span className="text-slate-500 text-[8px]">• Teto Vendedor</span>
                          </div>
                        </div>

                        <p className="text-[8.5px] text-slate-300 leading-tight border-t border-slate-800/80 pt-1.5">
                          {res?.description || `Barreira de liquidez institucional atuando como resistência.`}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Tactical Verdict Ribbon */}
                {hftAnalysis.orderBookReading.tacticalVerdict && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-indigo-500/30 flex items-center justify-between gap-2 text-[9.5px]">
                    <div className="flex items-center gap-1.5 text-indigo-300 font-medium">
                      <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{hftAnalysis.orderBookReading.tacticalVerdict}</span>
                    </div>
                    <span className="text-[8.5px] text-slate-500 font-mono shrink-0">
                      Spread: ${(hftAnalysis.orderBookReading.imbalance?.spreadUsd ?? 0.01).toFixed(4)} ({((hftAnalysis.orderBookReading.imbalance?.spreadPct ?? 0.01)).toFixed(3)}%)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 7 PILARES DE MICROESTRUTURA HFT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              
              {/* 1. Tempo Médio por Ordem (Frequência) */}
              <div className="p-2 rounded-lg bg-[#0a0d12] border border-slate-800 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] text-slate-500 font-bold uppercase truncate">Tempo de Entrada</span>
                  <span className={`px-1 py-0.2 rounded text-[7.5px] font-black uppercase ${
                    hftAnalysis.averageEntryTime.color === 'rose'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {hftAnalysis.averageEntryTime.status === 'ALTA_FREQUENCIA_DETECTADA' ? 'ALERTA HFT' : 'ESTÁVEL'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-slate-200 font-bold text-[10px]">
                    <Timer className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>{hftAnalysis.averageEntryTime.value}</span>
                  </div>
                  <p className="text-[8.5px] text-slate-400 leading-tight mt-1">
                    {hftAnalysis.averageEntryTime.description}
                  </p>
                </div>
              </div>

              {/* 2. Suporte ou Resistência por Volume */}
              <div className="p-2 rounded-lg bg-[#0a0d12] border border-slate-800 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] text-slate-500 font-bold uppercase truncate">Suporte / Resistência</span>
                  <span className={`px-1 py-0.2 rounded text-[7.5px] font-black uppercase ${
                    hftAnalysis.supportResistanceVolume.color === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {hftAnalysis.supportResistanceVolume.status.replace('_RELEVANTE_ATIVO', '').replace('_RELEVANTE_ATIVA', '')}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-slate-200 font-bold text-[10px]">
                    <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className={hftAnalysis.supportResistanceVolume.color === 'emerald' ? 'text-emerald-400' : 'text-rose-400'}>
                      {hftAnalysis.supportResistanceVolume.value}
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-400 leading-tight mt-1">
                    {hftAnalysis.supportResistanceVolume.description}
                  </p>
                </div>
              </div>

              {/* 3. Direção do Deslocamento com Facilidade */}
              <div className="p-2 rounded-lg bg-[#0a0d12] border border-slate-800 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] text-slate-500 font-bold uppercase truncate">Deslocamento</span>
                  <span className={`px-1 py-0.2 rounded text-[7.5px] font-black uppercase ${
                    hftAnalysis.displacementEaseDirection.color === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    FACILITADO
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-slate-200 font-bold text-[10px]">
                    <Compass className="w-3 h-3 text-indigo-400 shrink-0 animate-spin" style={{ animationDuration: '8s' }} />
                    <span className={hftAnalysis.displacementEaseDirection.color === 'emerald' ? 'text-emerald-400' : 'text-rose-400'}>
                      {hftAnalysis.displacementEaseDirection.value}
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-400 leading-tight mt-1">
                    {hftAnalysis.displacementEaseDirection.description}
                  </p>
                </div>
              </div>

              {/* 4. Faixa de Preço de Movimentação Fácil */}
              <div className="p-2 rounded-lg bg-[#0a0d12] border border-slate-800 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] text-slate-500 font-bold uppercase truncate">Canal Fluido</span>
                  <span className="px-1 py-0.2 rounded text-[7.5px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    LIVRE
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-slate-200 font-bold text-[10px]">
                    <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="text-cyan-300">{hftAnalysis.fluidPriceRange.value}</span>
                  </div>
                  <p className="text-[8.5px] text-slate-400 leading-tight mt-1">
                    {hftAnalysis.fluidPriceRange.description}
                  </p>
                </div>
              </div>

              {/* 5. Região de Alta Trocação e Baixo Deslocamento (Não Operar) */}
              <div className="p-2 rounded-lg bg-[#0a0d12] border border-slate-800 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] text-slate-500 font-bold uppercase truncate">Zona Perigo</span>
                  <span className="px-1 py-0.2 rounded text-[7.5px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                    NÃO OPERAR
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-slate-200 font-bold text-[10px]">
                    <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-amber-300 leading-none">{hftAnalysis.highChurnLowDisplacementZone.value}</span>
                  </div>
                  <p className="text-[8.5px] text-slate-400 leading-tight mt-1">
                    {hftAnalysis.highChurnLowDisplacementZone.description}
                  </p>
                </div>
              </div>

              {/* 6. Rastreamento de Stop, Liquidez Passiva & Liquidez de Stops (Stop Hunt) */}
              <div className="p-2 rounded-lg bg-[#0a0d12] border border-slate-800 flex flex-col justify-between space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] text-slate-500 font-bold uppercase truncate">Rastreio de Stop</span>
                  <span className={`px-1 py-0.2 rounded text-[7.5px] font-black uppercase ${
                    (hftAnalysis.stopLossHuntAlert?.color || 'amber') === 'rose'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                      : (hftAnalysis.stopLossHuntAlert?.color || 'amber') === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {hftAnalysis.stopLossHuntAlert?.status || 'MONITORANDO'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-slate-200 font-bold text-[10px]">
                    <Target className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className={
                      (hftAnalysis.stopLossHuntAlert?.color || 'amber') === 'rose'
                        ? 'text-rose-400'
                        : (hftAnalysis.stopLossHuntAlert?.color || 'amber') === 'emerald'
                        ? 'text-emerald-400'
                        : 'text-amber-300'
                    }>
                      {hftAnalysis.stopLossHuntAlert?.value || 'Analisando Liquidez'}
                    </span>
                  </div>
                  <p className="text-[8.5px] text-slate-400 leading-tight mt-1">
                    {hftAnalysis.stopLossHuntAlert?.description || 'Rastreando posicionamento de compradores e vendedores passivos no livro de ofertas para antecipar disparos de ordens stop.'}
                  </p>
                </div>
              </div>

              {/* 7. Varredura Direcional (Sweeping Momentum) */}
              {hftAnalysis.sweepingMomentum && (
                <div className="p-2 rounded-lg bg-[#0a0d12] border border-slate-800 flex flex-col justify-between space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[8px] text-slate-500 font-bold uppercase truncate">Varredura Direcional</span>
                    <span className={`px-1 py-0.2 rounded text-[7.5px] font-black uppercase ${
                      hftAnalysis.sweepingMomentum.color === 'rose'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                        : hftAnalysis.sweepingMomentum.color === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                        : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                    }`}>
                      {hftAnalysis.sweepingMomentum.status}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-slate-200 font-bold text-[10px]">
                      <Activity className="w-3 h-3 text-fuchsia-400 shrink-0" />
                      <span className={
                        hftAnalysis.sweepingMomentum.color === 'rose'
                          ? 'text-rose-400'
                          : hftAnalysis.sweepingMomentum.color === 'emerald'
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                      }>
                        {hftAnalysis.sweepingMomentum.value}
                      </span>
                    </div>
                    <p className="text-[8.5px] text-slate-400 leading-tight mt-1">
                      {hftAnalysis.sweepingMomentum.description}
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* AI Synthesized Recommendation Footer */}
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-2">
              <Brain className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[8px] text-indigo-400 font-extrabold uppercase block tracking-wider">RECOMENDAÇÃO SCALPING CONVERTIDA</span>
                <p className="text-[10px] text-slate-200 font-semibold leading-relaxed">
                  {hftAnalysis.aiSynthesizedRecommendation}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center space-y-2 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <p className="text-[10px] text-slate-400 italic">
              Conectando com o motor de IA para sintetizar fluxo HFT...
            </p>
          </div>
        )}
      </div>

      {/* PAINEL DE GATILHO DE ENTRADA DE ORDEM HFT (EXECUÇÃO COM DADOS IMPUTADOS) */}
      {(() => {
        const currentSpotPrice = trades.length > 0 ? trades[0].price : (crypto.takeProfit1 || 100);
        const supPrice = hftAnalysis?.orderBookReading?.support?.price ?? hftAnalysis?.orderBookReading?.support?.priceLevel ?? 0;
        const resPrice = hftAnalysis?.orderBookReading?.resistance?.price ?? hftAnalysis?.orderBookReading?.resistance?.priceLevel ?? 0;
        const obSignal = hftAnalysis?.orderBookReading?.signal;
        const sigType = obSignal?.signal || obSignal?.signalType || obSignal?.type || '';
        const sigConfidence = obSignal?.confidencePct ?? 75;
        const easeVal = hftAnalysis?.displacementEaseDirection?.value || 'Neutro';
        
        const isAiRecommendingLong = sigType.includes('COMPRA') || sigType.includes('LONG') || easeVal.toUpperCase().includes('LONG');
        const isAiRecommendingShort = sigType.includes('VENDA') || sigType.includes('SHORT') || easeVal.toUpperCase().includes('SHORT');

        const maxRiskPct = account.maxRiskPerTradePct || 2;
        const maxRiskUsd = (account.availableMarginUsd * maxRiskPct) / 100;
        
        const slNum = parseFloat(customStopLoss) || 0;
        const tpNum = parseFloat(customTakeProfit) || 0;
        
        const slDistPct = slNum > 0 && currentSpotPrice > 0 ? ((slNum - currentSpotPrice) / currentSpotPrice) * 100 : 0;
        const tpDistPct = tpNum > 0 && currentSpotPrice > 0 ? ((tpNum - currentSpotPrice) / currentSpotPrice) * 100 : 0;

        const effectiveSlDistPct = slNum > 0 && currentSpotPrice > 0 ? (Math.abs(slNum - currentSpotPrice) / currentSpotPrice) * 100 : 2.5;
        const autoRiskSizeUsd = effectiveSlDistPct > 0.05 
          ? Math.min((maxRiskUsd / (effectiveSlDistPct / 100)), account.availableMarginUsd * orderLeverage)
          : (account.availableMarginUsd * 0.25 * orderLeverage);
        const finalCalculatedSize = Math.max(5, autoRiskSizeUsd);
        const requiredMargin = finalCalculatedSize / orderLeverage;
        const isMarginAvailable = requiredMargin <= account.availableMarginUsd && account.availableMarginUsd >= 5;

        return (
          <div className="p-3 rounded-xl bg-gradient-to-b from-[#0e131d] to-[#080b10] border border-amber-500/30 space-y-3 shadow-xl shadow-amber-500/5">
            {/* Trigger Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/40">
                  <Zap className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-white font-black text-[11px] uppercase tracking-wider">
                      Gatilho de Entrada HFT (Execução com Dados Imputados)
                    </h4>
                    <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      AO VIVO
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400">
                    Siga as recomendações do analisador e execute ordens nos dados imputados para {crypto.symbol}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <span className="text-[8px] text-slate-500 uppercase block">Margem Disp.</span>
                  <span className="text-[10px] font-bold text-emerald-400">
                    US$ {account.availableMarginUsd.toFixed(2)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTriggerPanelOpen(!isTriggerPanelOpen)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title={isTriggerPanelOpen ? 'Recolher formulário' : 'Expandir formulário'}
                >
                  {isTriggerPanelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Active Position for this Coin Monitor */}
            {currentOpenPosition && (
              <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/40 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      currentOpenPosition.side === 'LONG'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}>
                      {currentOpenPosition.side} ATIVO
                    </span>
                    <span className="text-[10px] text-slate-300 font-bold">
                      {crypto.symbol} @ US$ {currentOpenPosition.entryPrice.toFixed(4)} ({currentOpenPosition.leverage}x)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[8px] text-slate-400 block uppercase">PnL Atual</span>
                      <span className={`text-[10.5px] font-black ${
                        currentOpenPosition.unrealizedPnlUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {currentOpenPosition.unrealizedPnlUsd >= 0 ? '+' : ''}US$ {currentOpenPosition.unrealizedPnlUsd.toFixed(2)} ({currentOpenPosition.unrealizedPnlPct >= 0 ? '+' : ''}{currentOpenPosition.unrealizedPnlPct.toFixed(2)}%)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCloseActivePosition}
                      className="px-2.5 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-[9.5px] font-bold flex items-center gap-1 transition shadow-sm"
                      title="Fechar posição imediatamente e liberar margem"
                    >
                      <XCircle className="w-3 h-3 text-rose-400" />
                      <span>Encerrar Posição</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[9px] pt-1 border-t border-slate-800">
                  <div className="bg-slate-900/60 p-1 rounded border border-slate-800">
                    <span className="text-slate-500 text-[8px] block">Stop Atual (Trailing)</span>
                    <span className="font-bold text-amber-300">US$ {currentOpenPosition.currentStopLoss.toFixed(4)}</span>
                  </div>
                  <div className="bg-slate-900/60 p-1 rounded border border-slate-800">
                    <span className="text-slate-500 text-[8px] block">Take Profit 1</span>
                    <span className="font-bold text-emerald-400">US$ {currentOpenPosition.takeProfit1.toFixed(4)}</span>
                  </div>
                  <div className="bg-slate-900/60 p-1 rounded border border-slate-800">
                    <span className="text-slate-500 text-[8px] block">Tamanho da Posição</span>
                    <span className="font-bold text-cyan-300">US$ {currentOpenPosition.sizeUsd.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Alert */}
            {orderFeedback && (
              <div className={`p-2 rounded-lg text-[10px] flex items-center gap-2 animate-in fade-in ${
                orderFeedback.type === 'success' 
                  ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200' 
                  : orderFeedback.type === 'warning'
                  ? 'bg-amber-950/80 border border-amber-500/50 text-amber-200'
                  : 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
              }`}>
                {orderFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span>{orderFeedback.message}</span>
              </div>
            )}

            {/* Imputed Data Form Body */}
            {isTriggerPanelOpen && (
              <div className="space-y-3">
                {/* Recommendation Ribbon from AI Flow Analyzer */}
                <div className="p-2 rounded-lg bg-slate-900/80 border border-indigo-500/20 flex items-center justify-between gap-2 flex-wrap text-[9.5px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Direção Sugerida pela IA:</span>
                    {isAiRecommendingLong ? (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/30 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        LONG ({sigConfidence}%)
                      </span>
                    ) : isAiRecommendingShort ? (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-black border border-rose-500/30 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3 text-rose-400" />
                        SHORT ({sigConfidence}%)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">
                        NEUTRO / AGUARDAR
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[8.5px] text-slate-400">
                    <span>Suporte: <strong className="text-emerald-400">${supPrice > 0 ? supPrice.toFixed(4) : '--'}</strong></span>
                    <span>•</span>
                    <span>Resistência: <strong className="text-rose-400">${resPrice > 0 ? resPrice.toFixed(4) : '--'}</strong></span>
                  </div>
                </div>

                {/* ROW 1: Direção da Ordem (LONG vs SHORT) */}
                <div>
                  <label className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                    1. Direção da Ordem
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchSide('LONG')}
                      className={`py-2 px-3 rounded-lg text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition border ${
                        orderSide === 'LONG'
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>LONG (Compra)</span>
                      {isAiRecommendingLong && (
                        <span className="text-[8px] px-1 rounded bg-emerald-500/30 text-emerald-200 ml-1">
                          ★ IA
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchSide('SHORT')}
                      className={`py-2 px-3 rounded-lg text-[10.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition border ${
                        orderSide === 'SHORT'
                          ? 'bg-rose-600/30 text-rose-300 border-rose-500 shadow-md shadow-rose-500/10'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      <span>SHORT (Venda)</span>
                      {isAiRecommendingShort && (
                        <span className="text-[8px] px-1 rounded bg-rose-500/30 text-rose-200 ml-1">
                          ★ IA
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Gerenciamento de Risco Automatizado & Dimensionamento de Posição (Auto-Trader HFT Modo Demo) */}
                {(() => {
                  const maxRiskPct = account.maxRiskPerTradePct || 2;
                  const maxRiskUsd = (account.demoBalanceUsd * maxRiskPct) / 100;
                  const currentSpotPrice = trades.length > 0 ? trades[0].price : (crypto.takeProfit1 || 100);
                  const stepRatio = currentSpotPrice > 1000 ? 0.003 : 0.008;

                  let derivedSl: number;
                  let derivedTp1: number;

                  if (orderSide === 'LONG') {
                    if (supPrice > 0 && supPrice < currentSpotPrice) {
                      derivedSl = Number((supPrice * 0.997).toFixed(currentSpotPrice < 1 ? 4 : 2));
                    } else {
                      derivedSl = Number((currentSpotPrice * (1 - stepRatio * 3.2)).toFixed(currentSpotPrice < 1 ? 4 : 2));
                    }
                    if (resPrice > currentSpotPrice) {
                      derivedTp1 = Number((resPrice * 0.999).toFixed(currentSpotPrice < 1 ? 4 : 2));
                    } else {
                      derivedTp1 = Number((currentSpotPrice * (1 + stepRatio * 4)).toFixed(currentSpotPrice < 1 ? 4 : 2));
                    }
                  } else {
                    if (resPrice > currentSpotPrice) {
                      derivedSl = Number((resPrice * 1.003).toFixed(currentSpotPrice < 1 ? 4 : 2));
                    } else {
                      derivedSl = Number((currentSpotPrice * (1 + stepRatio * 3.2)).toFixed(currentSpotPrice < 1 ? 4 : 2));
                    }
                    if (supPrice > 0 && supPrice < currentSpotPrice) {
                      derivedTp1 = Number((supPrice * 1.001).toFixed(currentSpotPrice < 1 ? 4 : 2));
                    } else {
                      derivedTp1 = Number((currentSpotPrice * (1 - stepRatio * 4)).toFixed(currentSpotPrice < 1 ? 4 : 2));
                    }
                  }

                  const slDistRatio = Math.max(0.015, Math.abs(currentSpotPrice - derivedSl) / (currentSpotPrice || 1));
                  let previewDesiredSizeUsd = maxRiskUsd / slDistRatio;
                  if (previewDesiredSizeUsd > account.availableMarginUsd) {
                    previewDesiredSizeUsd = account.availableMarginUsd;
                  }
                  if (previewDesiredSizeUsd < 10) {
                    previewDesiredSizeUsd = Math.max(10, Math.min(account.availableMarginUsd, account.demoBalanceUsd * 0.30));
                  }

                  return (
                    <div className="p-2.5 rounded-xl bg-[#090b10] border border-cyan-500/30 font-mono space-y-2">
                      <div className="flex items-center justify-between text-[9px] uppercase font-bold text-cyan-400 border-b border-slate-800 pb-1">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                          Gerenciamento de Risco & Dimensionamento Automático
                        </span>
                        <span className="text-[8.5px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                          Auto-Trader HFT (Demo)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-[8px] text-slate-500 uppercase block">Preço de Entrada (Mercado):</span>
                          <span className="font-bold text-white">${currentSpotPrice.toFixed(currentSpotPrice < 1 ? 4 : 2)}</span>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-[8px] text-slate-500 uppercase block">Risco Máx. Calculado:</span>
                          <span className="font-bold text-amber-300">{maxRiskPct}% (${maxRiskUsd.toFixed(2)})</span>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-[8px] text-slate-500 uppercase block">Dimensionamento de Posição:</span>
                          <span className="font-bold text-emerald-400">${previewDesiredSizeUsd.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-[8px] text-slate-500 uppercase block">Stop Loss Automático:</span>
                          <span className="font-bold text-rose-300">${derivedSl.toFixed(currentSpotPrice < 1 ? 4 : 2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Trailing Stop & Active Rules Summary (Reconhecimento pré-ordem) */}
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-2 flex-wrap text-[8.5px]">
                  <div className={`flex items-center gap-1 font-semibold ${account.isDynamicTrailingStopEnabled !== false ? 'text-cyan-400' : 'text-slate-500 line-through'}`}>
                    <ShieldCheck className="w-3 h-3" />
                    <span>Trailing Dinâmico (6¢➔3¢ | 30¢➔15¢): {account.isDynamicTrailingStopEnabled !== false ? 'ATIVO' : 'DESATIVADO'}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold ${account.isTimeManagementEnabled !== false ? 'text-amber-400' : 'text-slate-500 line-through'}`}>
                    <Timer className="w-3 h-3" />
                    <span>Tempo ({(account.maxOperationTimeMinutes || 1.5) === 1.5 ? '1m 30s' : `${account.maxOperationTimeMinutes}min`} | Proteção ≥3¢): {account.isTimeManagementEnabled !== false ? 'ATIVO' : 'DESATIVADO'}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold ${account.isQuickProfitExitEnabled !== false ? 'text-emerald-400' : 'text-slate-500 line-through'}`}>
                    <Zap className="w-3 h-3" />
                    <span>Scalper (+{Math.round((account.targetProfitUsd || 0.10) * 100)}¢): {account.isQuickProfitExitEnabled !== false ? 'ATIVO' : 'DESATIVADO'}</span>
                  </div>
                </div>

                {/* Trigger Execution Action Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleExecuteHftOrder}
                    disabled={!isMarginAvailable || !!currentOpenPosition}
                    className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                      currentOpenPosition
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                        : !isMarginAvailable
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-500/40 cursor-not-allowed'
                        : orderSide === 'LONG'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 border border-emerald-400 cursor-pointer active:scale-[0.99]'
                        : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-500/20 border border-rose-400 cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                    <span>
                      {currentOpenPosition
                        ? `Posição já aberta para ${crypto.symbol}`
                        : !isMarginAvailable
                        ? `Margem insuficiente (Disp: $${account.availableMarginUsd.toFixed(2)})`
                        : `⚡ Disparar Ordem ${orderSide} HFT (Execução 100% Automatizada)`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* TABS SELECTOR */}
      <div className="flex items-center gap-1.5 border-b border-slate-850 pb-1.5 pt-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('TAPE')}
          className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border ${
            activeTab === 'TAPE'
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 font-black shadow-sm'
              : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <span>Fita de Negócios</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('BOOK');
          }}
          className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border ${
            activeTab === 'BOOK'
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 font-black shadow-sm'
              : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>Livro de Ofertas (200N)</span>
        </button>
      </div>

      {activeTab === 'TAPE' ? (
        <>
          {/* Tape Filters */}
          <div className="flex items-center justify-between gap-1.5 text-[9px]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-1.5 py-0.5 rounded border transition ${
                  filterType === 'ALL'
                    ? 'bg-slate-700 text-white border-slate-500 font-bold'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300'
                }`}
              >
                Todos ({trades.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('BUY')}
                className={`px-1.5 py-0.5 rounded border transition ${
                  filterType === 'BUY'
                    ? 'bg-emerald-900/60 text-emerald-300 border-emerald-500 font-bold'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-emerald-400'
                }`}
              >
                Compras
              </button>
              <button
                type="button"
                onClick={() => setFilterType('SELL')}
                className={`px-1.5 py-0.5 rounded border transition ${
                  filterType === 'SELL'
                    ? 'bg-rose-900/60 text-rose-300 border-rose-500 font-bold'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-rose-400'
                }`}
              >
                Vendas
              </button>
              <button
                type="button"
                onClick={() => setFilterType('WHALE')}
                className={`px-1.5 py-0.5 rounded border transition ${
                  filterType === 'WHALE'
                    ? 'bg-amber-900/60 text-amber-300 border-amber-500 font-bold'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-amber-300'
                }`}
              >
                🐋 Baleias
              </button>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-0.5"
                title={isExpanded ? 'Visualização compacta' : 'Expandir tabela de 100 linhas'}
              >
                <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* INDEPENDENT DATABASE HISTORY VIEW (IF TOGGLED) */}
          {showDbHistory && (
            <div className="p-2.5 rounded-xl bg-[#090d12] border border-cyan-500/40 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] font-bold text-white">
                    BD Independente: {crypto.symbol} ({savedSnapshots.length} gravados)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    disabled={savedSnapshots.length === 0}
                    className="px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-[9px] font-bold flex items-center gap-0.5 disabled:opacity-40"
                    title="Exportar base de dados para CSV"
                  >
                    <FileSpreadsheet className="w-2.5 h-2.5" /> CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    disabled={savedSnapshots.length === 0}
                    className="px-1.5 py-0.5 rounded bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 text-[9px] font-bold flex items-center gap-0.5 disabled:opacity-40"
                    title="Exportar base de dados para JSON"
                  >
                    <FileCode className="w-2.5 h-2.5" /> JSON
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDb}
                    disabled={savedSnapshots.length === 0}
                    className="px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700/50 text-[9px] font-bold flex items-center gap-0.5 disabled:opacity-40"
                    title="Limpar banco de dados desta moeda"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {savedSnapshots.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic text-center py-2">
                  Nenhum snapshot de 100 linhas gravado ainda. Clique em "Gravar BD" para salvar o estado atual.
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {savedSnapshots.map((snap) => (
                    <div key={snap.id} className="p-1.5 rounded bg-slate-900/80 border border-slate-800 text-[9px] flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block">{snap.timestamp}</span>
                        <span className="text-slate-300 font-bold">${snap.priceUsd.toFixed(snap.priceUsd > 1 ? 2 : 4)}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold block ${snap.metrics.cvdNetUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          CVD: {snap.metrics.cvdNetUsd >= 0 ? '+' : ''}${Math.round(snap.metrics.cvdNetUsd).toLocaleString()}
                        </span>
                        <span className="text-[8px] text-slate-500">
                          Baleias: {snap.metrics.whaleTradesCount} ({Math.round(snap.metrics.whaleVolumeUsd / 1000)}k)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 100-ROW NEGOTIATION TABLE */}
          <div className={`rounded-lg border border-slate-800 bg-[#080c10] overflow-hidden flex flex-col ${
            isExpanded ? 'h-96' : 'h-52'
          }`}>
            {/* Table Column Headers */}
            <div className="bg-slate-900/90 px-2 py-1.5 border-b border-slate-800 text-[8px] uppercase tracking-wider text-slate-400 font-bold grid grid-cols-12 gap-1 sticky top-0 z-10">
              <span className="col-span-3">Hora</span>
              <span className="col-span-3 text-right">Preço ($)</span>
              <span className="col-span-2 text-right">Total ($)</span>
              <span className="col-span-2 text-center">Agressor</span>
              <span className="col-span-2 text-right">Tipo</span>
            </div>

            {/* Scrollable Trades List (100 Lines) */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-900 font-mono text-[9px] select-text">
              {filteredTrades.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-[10px] italic">
                  Nenhuma negociação encontrada para os filtros selecionados.
                </div>
              ) : (
                filteredTrades.map((t, idx) => {
                  const isBuy = t.aggressor === 'BUY';
                  const isWhaleTrade = t.tradeType === 'Lote Institucional' || t.totalUsd >= 8000;

                  return (
                    <div 
                      key={t.id || `${t.timeFormatted}-${idx}`}
                      className={`px-2 py-1 grid grid-cols-12 gap-1 items-center hover:bg-slate-800/40 transition-colors ${
                        isWhaleTrade ? 'bg-amber-950/20' : idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-950/30'
                      }`}
                    >
                      {/* Timestamp */}
                      <span className="col-span-3 text-slate-400 text-[8.5px] truncate" title={t.timeFormatted}>
                        {t.timeFormatted}
                      </span>

                      {/* Price */}
                      <span className={`col-span-3 text-right font-bold ${
                        isBuy ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {t.price.toFixed(t.price > 10 ? 2 : t.price > 1 ? 3 : 5)}
                      </span>

                      {/* Total USD */}
                      <span className={`col-span-2 text-right font-bold ${
                        isWhaleTrade ? 'text-amber-300' : 'text-slate-200'
                      }`}>
                        ${t.totalUsd >= 1000 ? `${(t.totalUsd / 1000).toFixed(1)}k` : t.totalUsd}
                      </span>

                      {/* Aggressor Badge */}
                      <div className="col-span-2 flex justify-center">
                        <span className={`px-1 py-0.2 rounded text-[7.5px] font-black uppercase tracking-tight ${
                          isBuy 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {t.aggressor}
                        </span>
                      </div>

                      {/* Classification / Impact */}
                      <span className="col-span-2 text-right text-[8px] text-slate-400 truncate" title={`${t.tradeType} | Impacto: ${t.orderBookImpact}`}>
                        {isWhaleTrade ? '🐋 Baleia' : t.tradeType === 'Varredura de Liquidez' ? 'Varredura' : 'Mercado'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Table Footer Status */}
            <div className="px-2 py-1 bg-slate-900/80 border-t border-slate-800 text-[8px] text-slate-500 flex items-center justify-between">
              <span>Exibindo {filteredTrades.length} de {trades.length} linhas</span>
              <span className="text-cyan-400 font-bold">{metrics.tapeDiagnosis}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Book Toolbar & AI HUD */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1.5 text-[9px] h-6">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-indigo-400 font-black uppercase tracking-wide">PROFUNDIDADE DE MERCADO (DOM)</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 text-[8.5px]">Tick Size: ${bookData.tickSize.toFixed(bookData.tickSize > 0.1 ? 2 : 4)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={scrollToCenter}
                  className="px-1.5 py-0.5 rounded-md bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 text-[9px] font-bold flex items-center gap-0.5 transition"
                  title="Centralizar o livro na cotação atual"
                >
                  <ArrowDownUp className="w-2.5 h-2.5 text-indigo-400" />
                  <span>Centralizar DOM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-slate-400 hover:text-slate-200 flex items-center gap-0.5 text-[10px]"
                >
                  <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* DOM AI Quick HUD Ribbon */}
            {hftAnalysis?.orderBookReading && (() => {
              const sup = hftAnalysis.orderBookReading.support;
              const res = hftAnalysis.orderBookReading.resistance;
              const supPrice = sup?.price ?? sup?.priceLevel ?? 0;
              const resPrice = res?.price ?? res?.priceLevel ?? 0;
              const supVol = sup?.volumeUsd ?? 0;
              const resVol = res?.volumeUsd ?? 0;

              return (
                <div className="p-1.5 rounded-lg bg-[#0b1018] border border-indigo-500/30 flex items-center justify-between gap-2 flex-wrap text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Sinal Book:</span>
                    <span className={`px-1.5 py-0.2 rounded font-black text-[8px] uppercase ${
                      hftAnalysis.orderBookReading.signal.color === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : hftAnalysis.orderBookReading.signal.color === 'rose'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}>
                      {hftAnalysis.orderBookReading.signal.label} ({hftAnalysis.orderBookReading.signal.confidencePct}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Support Tag */}
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Shield className="w-2.5 h-2.5" />
                      <span>Suporte: {sup?.priceFormatted || (supPrice > 0 ? `$${supPrice.toFixed(supPrice > 10 ? 2 : 4)}` : 'N/A')}</span>
                      <span className="text-[7.5px] text-emerald-300/70">(${Math.round(supVol / 1000)}k)</span>
                    </span>

                    <span className="text-slate-600">|</span>

                    {/* Resistance Tag */}
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <Target className="w-2.5 h-2.5" />
                      <span>Resistência: {res?.priceFormatted || (resPrice > 0 ? `$${resPrice.toFixed(resPrice > 10 ? 2 : 4)}` : 'N/A')}</span>
                      <span className="text-[7.5px] text-rose-300/70">(${Math.round(resVol / 1000)}k)</span>
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 200-ROW CENTRALIZED ORDER BOOK */}
          <div className={`rounded-lg border border-slate-800 bg-[#080c10] overflow-hidden flex flex-col ${
            isExpanded ? 'h-96' : 'h-52'
          }`}>
            {/* Table Column Headers */}
            <div className="bg-slate-900/90 px-2 py-1.5 border-b border-slate-800 text-[8px] uppercase tracking-wider text-slate-400 font-bold grid grid-cols-12 gap-1 sticky top-0 z-10">
              <span className="col-span-3">Nível / Preço ($)</span>
              <span className="col-span-3 text-right">Tamanho (Amt)</span>
              <span className="col-span-3 text-right">Total ($)</span>
              <span className="col-span-3 text-right">Profundidade Acum.</span>
            </div>

            {/* Scrollable Order Book (100 Asks + 1 Spot + 100 Bids = 201 levels) */}
            <div 
              ref={bookContainerRef}
              className="overflow-y-auto flex-1 divide-y divide-slate-900/60 font-mono text-[9px] select-text scroll-smooth"
            >
              {/* ASKS (100 levels) - Sells (Red) */}
              {bookData.asks.map((ask) => {
                const resistancePrice = hftAnalysis?.orderBookReading?.resistance?.price ?? hftAnalysis?.orderBookReading?.resistance?.priceLevel;
                const isKeyResistance = !!(resistancePrice && Math.abs(ask.price - resistancePrice) < (bookData.tickSize * 0.9));

                return (
                  <div 
                    key={`ask-${ask.level}`}
                    className={`px-2 py-0.5 grid grid-cols-12 gap-1 items-center relative hover:bg-slate-800/20 transition-colors ${
                      isKeyResistance ? 'bg-rose-950/40 border-y border-rose-500/50 shadow-inner' : ''
                    }`}
                  >
                    {/* Depth Progress Bar */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 bg-rose-500/5 pointer-events-none transition-all duration-300"
                      style={{ width: `${(ask.cumulativeUsd / bookData.maxCumulative) * 100}%` }}
                    />
                    <div className="col-span-3 flex items-center gap-1 z-10">
                      <span className="text-rose-400 font-bold">
                        {ask.price.toFixed(ask.price > 10 ? 2 : 4)}
                      </span>
                      {isKeyResistance && (
                        <span className="px-1 py-0.2 rounded bg-rose-600/40 text-rose-200 border border-rose-400/50 text-[7px] font-black uppercase tracking-tight animate-pulse">
                          🧱 RESISTÊNCIA
                        </span>
                      )}
                    </div>
                    <span className="col-span-3 text-right text-slate-300 z-10">
                      {ask.size.toFixed(ask.price > 1000 ? 4 : 2)}
                    </span>
                    <span className="col-span-3 text-right text-slate-400 z-10 font-medium">
                      ${ask.totalUsd >= 1000 ? `${(ask.totalUsd / 1000).toFixed(1)}k` : ask.totalUsd.toFixed(0)}
                    </span>
                    <span className="col-span-3 text-right text-slate-500 font-semibold z-10">
                      ${(ask.cumulativeUsd / 1000).toFixed(1)}k
                    </span>
                  </div>
                );
              })}

              {/* SPOT PRICE ROW (Centralizer Anchor) */}
              <div 
                ref={spotPriceRef}
                className="bg-indigo-950/40 border-y-2 border-indigo-500/40 px-2 py-1.5 grid grid-cols-12 gap-1 items-center sticky top-[24px] z-10 shadow shadow-indigo-500/10"
              >
                <div className="col-span-6 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                  <span className="text-[10.5px] font-black text-indigo-300">
                    ${(trades[0]?.price || crypto.priceUsd).toFixed((trades[0]?.price || crypto.priceUsd) > 10 ? 2 : 4)}
                  </span>
                  <span className={`text-[7.5px] font-bold px-1 rounded ${
                    trades[0]?.aggressor === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {trades[0]?.aggressor === 'BUY' ? '▲ COMPRA' : '▼ VENDA'}
                  </span>
                </div>
                <div className="col-span-6 text-right">
                  <span className="text-[7.5px] font-extrabold text-indigo-400 tracking-wider uppercase block">
                    SPREAD: ${bookData.spreadVal.toFixed(bookData.spreadVal > 0.1 ? 2 : 5)} ({bookData.spreadPct.toFixed(3)}%)
                  </span>
                </div>
              </div>

              {/* BIDS (100 levels) - Buys (Green) */}
              {bookData.bids.map((bid) => {
                const supportPrice = hftAnalysis?.orderBookReading?.support?.price ?? hftAnalysis?.orderBookReading?.support?.priceLevel;
                const isKeySupport = !!(supportPrice && Math.abs(bid.price - supportPrice) < (bookData.tickSize * 0.9));

                return (
                  <div 
                    key={`bid-${bid.level}`}
                    className={`px-2 py-0.5 grid grid-cols-12 gap-1 items-center relative hover:bg-slate-800/20 transition-colors ${
                      isKeySupport ? 'bg-emerald-950/40 border-y border-emerald-500/50 shadow-inner' : ''
                    }`}
                  >
                    {/* Depth Progress Bar */}
                    <div 
                      className="absolute top-0 bottom-0 left-0 bg-emerald-500/5 pointer-events-none transition-all duration-300"
                      style={{ width: `${(bid.cumulativeUsd / bookData.maxCumulative) * 100}%` }}
                    />
                    <div className="col-span-3 flex items-center gap-1 z-10">
                      <span className="text-emerald-400 font-bold">
                        {bid.price.toFixed(bid.price > 10 ? 2 : 4)}
                      </span>
                      {isKeySupport && (
                        <span className="px-1 py-0.2 rounded bg-emerald-600/40 text-emerald-200 border border-emerald-400/50 text-[7px] font-black uppercase tracking-tight animate-pulse">
                          🛡️ SUPORTE
                        </span>
                      )}
                    </div>
                    <span className="col-span-3 text-right text-slate-300 z-10">
                      {bid.size.toFixed(bid.price > 1000 ? 4 : 2)}
                    </span>
                    <span className="col-span-3 text-right text-slate-400 z-10 font-medium">
                      ${bid.totalUsd >= 1000 ? `${(bid.totalUsd / 1000).toFixed(1)}k` : bid.totalUsd.toFixed(0)}
                    </span>
                    <span className="col-span-3 text-right text-slate-500 font-semibold z-10">
                      ${(bid.cumulativeUsd / 1000).toFixed(1)}k
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Table Footer Status */}
            <div className="px-2 py-1 bg-slate-900/80 border-t border-slate-800 text-[8px] text-slate-500 flex items-center justify-between">
              <span>Exibindo 100 ask e 100 bid (200 níveis de profundidade)</span>
              <span className="text-cyan-400 font-bold">LIVRO CENTRALIZADO HFT</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
