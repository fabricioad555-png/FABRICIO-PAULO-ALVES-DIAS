import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, 
  Layers, 
  Activity, 
  Zap, 
  BrainCircuit, 
  Database, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  AlertTriangle, 
  RotateCcw, 
  Search, 
  Play, 
  Pause, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight,
  Filter,
  Eye,
  Sliders,
  Radio,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { CryptoMention } from '../types';
import { 
  LiveOrderBookData, 
  OrderBookLevel, 
  TimesAndTradeRow, 
  BookAndTradesAnalysisRecord 
} from '../types/orderFlowTypes';
import { 
  generateLiveOrderFlowData, 
  getStoredOrderFlowDatabase, 
  saveOrderFlowRecordToDatabase, 
  clearOrderFlowDatabase 
} from '../services/orderFlowDataService';

interface OrderBookAndTradesPanelProps {
  crypto: CryptoMention;
  onOpenPredictionModal?: (symbol: string) => void;
}

export function OrderBookAndTradesPanel({ crypto, onOpenPredictionModal }: OrderBookAndTradesPanelProps) {
  // Live Data State (100 levels: 50 Bids + 50 Asks, 100 Times & Trades rows)
  const [orderFlowData, setOrderFlowData] = useState<LiveOrderBookData>(() => generateLiveOrderFlowData(crypto));
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'visual_flow' | 'ai_scanner' | 'database_history'>('visual_flow');
  
  // Book View Filters & Grouping
  const [bookRowsFilter, setBookRowsFilter] = useState<100 | 50 | 20>(100);
  const [tradeFilterType, setTradeFilterType] = useState<'ALL' | 'BUY' | 'SELL' | 'WHALES'>('ALL');
  const [minTradeValueUsd, setMinTradeValueUsd] = useState<number>(0);
const [highlightWhaleThresholdUsd, setHighlightWhaleThresholdUsd] = useState<number>(5000);
  
  // Auto-center state
  const [isAutoCenterEnabled, setIsAutoCenterEnabled] = useState(true);
  const isProgrammaticScroll = useRef(false);

  // AI Tape Reading & Entry Tracker State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [currentAiAnalysis, setCurrentAiAnalysis] = useState<BookAndTradesAnalysisRecord | null>(null);
  const [storedDatabaseRecords, setStoredDatabaseRecords] = useState<BookAndTradesAnalysisRecord[]>(() => getStoredOrderFlowDatabase());
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

// Auto-scroll ref for Times & Trades tape
  const tradesContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs for auto-centering Order Book spread
  const orderBookContainerRef = useRef<HTMLDivElement>(null);
  const spreadDividerRef = useRef<HTMLDivElement>(null);

const scrollToCenter = () => {
    if (orderBookContainerRef.current && spreadDividerRef.current) {
      isProgrammaticScroll.current = true;
      const container = orderBookContainerRef.current;
      const divider = spreadDividerRef.current;
      
      const containerHeight = container.clientHeight;
      const dividerTop = divider.offsetTop;
      const dividerHeight = divider.clientHeight;
      
      const scrollTo = dividerTop - (containerHeight / 2) + (dividerHeight / 2);
      
      container.scrollTo({ top: scrollTo, behavior: 'smooth' });
      
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 500);
    }
  };

  const handleOrderBookScroll = () => {
    if (!isProgrammaticScroll.current) {
      setIsAutoCenterEnabled(false);
    }
  };

  useEffect(() => {
    if (isAutoCenterEnabled) {
      // Just center it without smooth scrolling if it's constantly adjusting, 
      // but here we just need to do it once when enabled or when rows filter changes
      scrollToCenter();
    }
  }, [isAutoCenterEnabled, bookRowsFilter]);

// Auto-center Order Book on mount, on crypto change, and on filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCenter();
    }, 200);
    return () => clearTimeout(timer);
  }, [crypto.symbol, bookRowsFilter, activeTab]);

  // Sync / regenerate when selected crypto changes
  useEffect(() => {
    const freshData = generateLiveOrderFlowData(crypto);
    setOrderFlowData(freshData);
    // Auto trigger initial AI scan
    handleTriggerAiTapeReading(freshData);
  }, [crypto.symbol, crypto.priceUsd]);

  // High-frequency live simulator interval (updates micro ticks, new trades and depths)
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setOrderFlowData((prev) => {
        const isBull = crypto.change24h >= 0;
        const tickMove = (Math.random() - 0.48) * (crypto.priceUsd > 1000 ? 0.8 : crypto.priceUsd > 20 ? 0.04 : 0.001);
        const newPrice = Number((prev.priceUsd + tickMove).toFixed(crypto.priceUsd < 1 ? 4 : 2));
        
        // Generate a new immediate trade on tape
        const isBuy = Math.random() < (isBull ? 0.64 : 0.44);
        const isWhale = Math.random() < 0.15;
        const lotMultiplier = isWhale ? (Math.random() * 8 + 3) : (Math.random() * 2 + 0.4);
        const amount = Number(((crypto.priceUsd > 1000 ? 0.2 : crypto.priceUsd > 50 ? 6 : 140) * lotMultiplier).toFixed(crypto.priceUsd < 1 ? 2 : 2));
        const totalUsd = Number((newPrice * amount).toFixed(2));
        const disp = Number(((Math.random() * 0.28 + 0.02) * (isBuy ? 1 : -1)).toFixed(2));

        const newTrade: TimesAndTradeRow = {
          id: `trade-live-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
          timeFormatted: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + Math.floor(Math.random() * 900 + 100),
          price: newPrice,
          amount,
          totalUsd,
          aggressor: isBuy ? 'BUY' : 'SELL',
          tradeType: isWhale ? 'Lote Institucional' : 'Agressão a Mercado',
          priceDisplacement: disp,
          displacementLabel: disp > 0 ? `+${disp}% Deslocamento` : `${disp}% Deslocamento`,
          absorbedInBook: isWhale ? false : Math.random() > 0.45,
          orderBookImpact: isWhale ? 'Rompimento de Nível' : 'Consumo Parcial'
        };

        const updatedTrades = [newTrade, ...prev.timesAndTrades.slice(0, 99)];

        return {
          ...prev,
          priceUsd: newPrice,
          timesAndTrades: updatedTrades,
          cvdAccumulated: prev.cvdAccumulated + (isBuy ? totalUsd : -totalUsd)
        };
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isLiveStreaming, crypto.priceUsd, crypto.change24h]);

  // Request AI Tape Reading and Best Entry Tracker Analysis
  const handleTriggerAiTapeReading = async (customData?: LiveOrderBookData) => {
    const dataToUse = customData || orderFlowData;
    setIsAiAnalyzing(true);

    try {
      // Prepare compact representations for server AI payload
      const orderBookSummary = {
        totalBidUsd: dataToUse.depth100TotalBidUsd,
        totalAskUsd: dataToUse.depth100TotalAskUsd,
        imbalancePct: dataToUse.orderBookImbalancePct,
        top5Bids: dataToUse.bids.slice(0, 5).map(b => ({ price: b.price, amount: b.amount, totalUsd: b.totalUsd, wall: b.isWall })),
        top5Asks: dataToUse.asks.slice(0, 5).map(a => ({ price: a.price, amount: a.amount, totalUsd: a.totalUsd, wall: a.isWall })),
        wallsDetected: {
          bids: dataToUse.bids.filter(b => b.isWall).map(b => ({ price: b.price, usd: b.totalUsd, tag: b.institutionTag })),
          asks: dataToUse.asks.filter(a => a.isWall).map(a => ({ price: a.price, usd: a.totalUsd, tag: a.institutionTag }))
        }
      };

      const tradesSummary = {
        totalTradesSampled: dataToUse.timesAndTrades.length,
        buyTradesCount: dataToUse.timesAndTrades.filter(t => t.aggressor === 'BUY').length,
        sellTradesCount: dataToUse.timesAndTrades.filter(t => t.aggressor === 'SELL').length,
        whaleTradesCount: dataToUse.timesAndTrades.filter(t => t.tradeType === 'Lote Institucional' || t.totalUsd > 10000).length,
        cvdTotalUsd: dataToUse.cvdAccumulated,
        averageDisplacement: dataToUse.averageDisplacementTicks,
        recentDisplacements: dataToUse.timesAndTrades.slice(0, 10).map(t => ({ time: t.timeFormatted, price: t.price, disp: t.displacementLabel, impact: t.orderBookImpact }))
      };

      const recentDbSnapshots = getStoredOrderFlowDatabase().slice(0, 5).map(s => ({
        timestamp: s.timestamp,
        priceUsd: s.priceUsd,
        imbalance: s.orderBookImbalance,
        deltaAggression: s.deltaAggressionPercent,
        action: s.bestEntryOpportunity.recommendedAction
      }));

      const res = await fetch('/api/ai/analyze-orderflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: crypto.symbol,
          name: crypto.name,
          priceUsd: crypto.priceUsd,
          change24h: crypto.change24h,
          orderBookSummary,
          tradesSummary,
          historicalSnapshots: recentDbSnapshots
        })
      });

      const json = await res.json();
      if (json && json.result) {
        const record: BookAndTradesAnalysisRecord = {
          id: `flow-record-${Date.now()}`,
          symbol: crypto.symbol,
          coinName: crypto.name,
          priceUsd: crypto.priceUsd,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          bidsCount: dataToUse.bids.length,
          asksCount: dataToUse.asks.length,
          tradesCount: dataToUse.timesAndTrades.length,
          totalBidLiquidityUsd: dataToUse.depth100TotalBidUsd,
          totalAskLiquidityUsd: dataToUse.depth100TotalAskUsd,
          bidAskRatio: Number((dataToUse.depth100TotalBidUsd / (dataToUse.depth100TotalAskUsd || 1)).toFixed(2)),
          orderBookImbalance: dataToUse.orderBookImbalancePct,
          largestBidWall: {
            price: dataToUse.bids.find(b => b.isWall)?.price || dataToUse.bids[4]?.price || crypto.priceUsd * 0.98,
            amount: dataToUse.bids.find(b => b.isWall)?.amount || 1500,
            totalUsd: dataToUse.bids.find(b => b.isWall)?.totalUsd || 250000
          },
          largestAskWall: {
            price: dataToUse.asks.find(a => a.isWall)?.price || dataToUse.asks[6]?.price || crypto.priceUsd * 1.02,
            amount: dataToUse.asks.find(a => a.isWall)?.amount || 1400,
            totalUsd: dataToUse.asks.find(a => a.isWall)?.totalUsd || 240000
          },
          cumulativeVolumeDelta: dataToUse.cvdAccumulated,
          deltaAggressionPercent: dataToUse.buyPressurePct,
          lastDisplacementTicks: dataToUse.averageDisplacementTicks,
          displacementSpeed: crypto.change24h > 4 ? 'Aceleração Alta' : 'Neutro / Estável',
          bestEntryOpportunity: json.result.bestEntryOpportunity,
          aiAnalysis: json.result.aiAnalysis
        };

        setCurrentAiAnalysis(record);
        setLastAnalyzedAt(record.timestamp);
        const updatedDb = saveOrderFlowRecordToDatabase(record);
        setStoredDatabaseRecords(updatedDb);
      }
    } catch (err) {
      console.error('Error during AI Order Flow Analysis:', err);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Filtered Times & Trades Rows
  const filteredTrades = useMemo(() => {
    return orderFlowData.timesAndTrades.filter(trade => {
      if (tradeFilterType === 'BUY' && trade.aggressor !== 'BUY') return false;
      if (tradeFilterType === 'SELL' && trade.aggressor !== 'SELL') return false;
      if (tradeFilterType === 'WHALES' && trade.totalUsd < highlightWhaleThresholdUsd) return false;
      if (minTradeValueUsd > 0 && trade.totalUsd < minTradeValueUsd) return false;
      return true;
    });
  }, [orderFlowData.timesAndTrades, tradeFilterType, minTradeValueUsd, highlightWhaleThresholdUsd]);

  // Display levels based on rows filter
  const displayedBids = useMemo(() => {
    const count = bookRowsFilter === 100 ? 50 : bookRowsFilter === 50 ? 25 : 10;
    return orderFlowData.bids.slice(0, count);
  }, [orderFlowData.bids, bookRowsFilter]);

  const displayedAsks = useMemo(() => {
    const count = bookRowsFilter === 100 ? 50 : bookRowsFilter === 50 ? 25 : 10;
    return orderFlowData.asks.slice(0, count);
  }, [orderFlowData.asks, bookRowsFilter]);

  return (
    <div className="bg-[#0a0a0b] border border-cyan-500/30 rounded-2xl p-4 md:p-6 shadow-2xl space-y-6">
      
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-400 shadow-md">
            <BarChart3 className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Order Book (100 Níveis) & Times & Trades com Banco de Dados IA
              </h2>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                ${crypto.symbol} Spot Tape Reading
              </span>
            </div>
            <p className="text-xs font-sans text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Visualizador completo de profundidade com 100 ordens reais (50 Bids + 50 Asks), fluxo contínuo de agressões e persistência cronológica em banco de dados para rastreamento de melhor momento de entrada por IA.
            </p>
          </div>
        </div>

        {/* Master Control Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border transition-all ${
              isLiveStreaming 
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/60' 
                : 'bg-amber-950/60 text-amber-300 border-amber-500/50 hover:bg-amber-900/60'
            }`}
          >
            {isLiveStreaming ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
            <span>{isLiveStreaming ? 'Streaming Ao Vivo (ON)' : 'Streaming Pausado'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTriggerAiTapeReading()}
            disabled={isAiAnalyzing}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-2 border border-cyan-400/40 shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50"
          >
            <BrainCircuit className={`w-4 h-4 text-cyan-200 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAiAnalyzing ? 'IA Rastreando Livro & Tape...' : 'Rastrear Entrada com IA'}</span>
          </button>
        </div>
      </div>

      {/* Top Fast Metric Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        {/* Metric 1: Cotação & Spread */}
        <div className="p-3 bg-[#12141a] rounded-xl border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Cotação Spot / Spread:</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-white">US$ {orderFlowData.priceUsd.toLocaleString('en-US', { minimumFractionDigits: crypto.priceUsd < 1 ? 4 : 2 })}</span>
          </div>
          <span className="text-[10px] text-cyan-400 block">
            Spread: US$ {orderFlowData.spread} ({orderFlowData.spreadPercentage}%)
          </span>
        </div>

        {/* Metric 2: Liquidez Total 100 Níveis Bid */}
        <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-800/40 space-y-1">
          <span className="text-[10px] text-emerald-400 uppercase font-bold block">Profundidade Bids (50 Níveis):</span>
          <div className="text-sm font-bold text-emerald-300">
            US$ {(orderFlowData.depth100TotalBidUsd / 1000).toFixed(1)}k
          </div>
          <div className="text-[10px] text-slate-400">
            Pressão Compra: <strong className="text-emerald-400">{orderFlowData.buyPressurePct}%</strong>
          </div>
        </div>

        {/* Metric 3: Liquidez Total 100 Níveis Ask */}
        <div className="p-3 bg-rose-950/20 rounded-xl border border-rose-800/40 space-y-1">
          <span className="text-[10px] text-rose-400 uppercase font-bold block">Profundidade Asks (50 Níveis):</span>
          <div className="text-sm font-bold text-rose-300">
            US$ {(orderFlowData.depth100TotalAskUsd / 1000).toFixed(1)}k
          </div>
          <div className="text-[10px] text-slate-400">
            Pressão Venda: <strong className="text-rose-400">{orderFlowData.sellPressurePct}%</strong>
          </div>
        </div>

        {/* Metric 4: CVD (Cumulative Volume Delta) */}
        <div className="p-3 bg-[#12141a] rounded-xl border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Delta CVD Cumulativo:</span>
          <div className={`text-sm font-bold ${orderFlowData.cvdAccumulated >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {orderFlowData.cvdAccumulated >= 0 ? '+' : ''}US$ {(orderFlowData.cvdAccumulated / 1000).toFixed(1)}k
          </div>
          <span className="text-[10px] text-indigo-300 block">
            {orderFlowData.cvdAccumulated >= 0 ? '▲ Agressão Líquida no Ask' : '▼ Agressão Líquida no Bid'}
          </span>
        </div>

        {/* Metric 5: Deslocamento Médio de Preço */}
        <div className="p-3 bg-[#12141a] rounded-xl border border-slate-800/80 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Deslocamento por Trade:</span>
          <div className="text-sm font-bold text-amber-300">
            {orderFlowData.averageDisplacementTicks} Ticks
          </div>
          <span className="text-[10px] text-slate-400 block">
            Velocidade: ~{orderFlowData.speedTradesPerSec} trades/s
          </span>
        </div>

        {/* Metric 6: Banco de Dados de Snapshots */}
        <div className="p-3 bg-cyan-950/20 rounded-xl border border-cyan-800/40 space-y-1">
          <span className="text-[10px] text-cyan-300 uppercase font-bold block flex items-center gap-1">
            <Database className="w-3 h-3 text-cyan-400" /> Snapshots no BD:
          </span>
          <div className="text-sm font-bold text-cyan-200">
            {storedDatabaseRecords.length} Registros
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Último: {lastAnalyzedAt || 'Agora'}
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('visual_flow')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition ${
            activeTab === 'visual_flow'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>1. Book Visual (100 Linhas) & Times & Trades</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai_scanner')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition ${
            activeTab === 'ai_scanner'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Target className="w-3.5 h-3.5 text-indigo-400" />
          <span>2. Rastreamento de Entrada IA & Tape Reading</span>
          {currentAiAnalysis && (
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 text-[10px]">
              {currentAiAnalysis.bestEntryOpportunity.recommendedAction}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database_history')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition ${
            activeTab === 'database_history'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span>3. Histórico Banco de Dados ({storedDatabaseRecords.length})</span>
        </button>
      </div>

      {/* TAB 1: Visual Order Book (100 Rows) & Times & Trades Live Panel */}
      {activeTab === 'visual_flow' && (
        <div className="space-y-5">
          
          {/* Controls Bar for 100-row view and trade filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#12141a] rounded-xl border border-slate-800/80 font-mono text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span>Exibir Profundidade:</span>
                <div className="flex items-center bg-[#0a0a0b] border border-slate-700 rounded-lg p-0.5">
                  {[100, 50, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBookRowsFilter(num as any)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                        bookRowsFilter === num ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {num} Linhas
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400">
                <span>Filtro Tape:</span>
                <select
                  value={tradeFilterType}
                  onChange={(e) => setTradeFilterType(e.target.value as any)}
                  className="bg-[#0a0a0b] border border-slate-700 text-slate-200 rounded px-2 py-1 outline-none text-[11px]"
                >
                  <option value="ALL">Todos os Trades</option>
                  <option value="BUY">Apenas Compras (Ask)</option>
                  <option value="SELL">Apenas Vendas (Bid)</option>
                  <option value="WHALES">Grandes Lotes / Baleias (&gt; ${highlightWhaleThresholdUsd})</option>
                </select>
              </div>
            </div>

            {/* Imbalance Progress Bar */}
            <div className="w-full sm:w-64 space-y-1">
              <div className="flex justify-between text-[10.5px]">
                <span className="text-emerald-400 font-bold">Bids: {orderFlowData.buyPressurePct}%</span>
                <span className="text-rose-400 font-bold">Asks: {orderFlowData.sellPressurePct}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${orderFlowData.buyPressurePct}%` }} />
                <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${orderFlowData.sellPressurePct}%` }} />
              </div>
            </div>
          </div>

          {/* Main 2-Column Grid: 100-Row Order Book (Left) vs Times & Trades (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* LEFT: 100-Level Visual Order Book (7 cols) */}
            <div className="lg:col-span-7 bg-[#0f1117] border border-slate-800 rounded-xl p-3.5 space-y-3 font-mono text-xs flex flex-col justify-between">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    Livro de Ofertas ({displayedBids.length + displayedAsks.length} Níveis Visuais)
                  </span>
                  {!isAutoCenterEnabled && (
                    <button
                      onClick={() => setIsAutoCenterEnabled(true)}
                      className="ml-2 text-[9px] font-mono bg-cyan-950/60 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800 hover:bg-cyan-900 transition-colors flex items-center gap-1"
                    >
                      <Target className="w-3 h-3" />
                      Centralizar
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-400">
                  Formato: Preço (US$) | Qtd (${crypto.symbol}) | Total (US$) | Profundidade
                </span>
              </div>

              {/* Table Column Headers */}
              <div className="grid grid-cols-12 gap-1 text-[10px] text-slate-500 font-bold uppercase pb-1 border-b border-slate-800/60 px-1">
                <span className="col-span-3">Preço (US$)</span>
                <span className="col-span-3 text-right">Qtd ({crypto.symbol})</span>
                <span className="col-span-3 text-right">Total (US$)</span>
                <span className="col-span-3 text-right">Muralha / Profundidade</span>
              </div>

              {/* Scrollable Container with 50 Asks (Top, in reverse) + Current Spread + 50 Bids (Bottom) */}
              <div ref={orderBookContainerRef} onScroll={handleOrderBookScroll} className="relative space-y-1 max-h-[460px] overflow-y-auto pr-1 select-none custom-scrollbar">
                
                {/* 50 ASKS (SELL ORDERS) - Displayed from highest to lowest ask */}
                <div className="space-y-0.5">
                  {displayedAsks.slice().reverse().map((ask, idx) => (
                    <div 
                      key={ask.id} 
                      className={`grid grid-cols-12 gap-1 items-center py-1 px-1.5 rounded relative text-[11px] transition-colors ${
                        ask.isWall ? 'bg-rose-950/40 border border-rose-700/50' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Depth Bar Background */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 bg-rose-500/15 pointer-events-none rounded"
                        style={{ width: `${ask.depthPercentage}%` }}
                      />
                      
                      <span className="col-span-3 text-rose-400 font-bold z-10">
                        US$ {ask.price.toFixed(crypto.priceUsd < 1 ? 4 : 2)}
                      </span>
                      <span className="col-span-3 text-right text-slate-300 z-10">
                        {ask.amount.toLocaleString()}
                      </span>
                      <span className="col-span-3 text-right text-slate-400 z-10">
                        ${ask.totalUsd.toLocaleString()}
                      </span>
                      <div className="col-span-3 flex items-center justify-end gap-1.5 z-10">
                        {ask.isWall && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold uppercase truncate max-w-[90px]" title={ask.institutionTag || 'Muralha Vendedora'}>
                            {ask.wallStrength || 'Muralha'}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">{ask.depthPercentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SPREAD DIVIDER */}
                <div ref={spreadDividerRef} className="py-2 my-1 bg-[#12141a] border-y border-cyan-500/40 px-3 flex items-center justify-between text-xs rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-sm">US$ {orderFlowData.priceUsd.toFixed(crypto.priceUsd < 1 ? 4 : 2)}</span>
                    <span className={`text-[10.5px] font-bold ${crypto.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h}%
                    </span>
                  </div>
                  <div className="text-[11px] text-cyan-300 font-bold">
                    Spread: US$ {orderFlowData.spread} ({orderFlowData.spreadPercentage}%)
                  </div>
                </div>

                {/* 50 BIDS (BUY ORDERS) */}
                <div className="space-y-0.5">
                  {displayedBids.map((bid, idx) => (
                    <div 
                      key={bid.id} 
                      className={`grid grid-cols-12 gap-1 items-center py-1 px-1.5 rounded relative text-[11px] transition-colors ${
                        bid.isWall ? 'bg-emerald-950/40 border border-emerald-700/50' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Depth Bar Background */}
                      <div 
                        className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 pointer-events-none rounded"
                        style={{ width: `${bid.depthPercentage}%` }}
                      />
                      
                      <span className="col-span-3 text-emerald-400 font-bold z-10">
                        US$ {bid.price.toFixed(crypto.priceUsd < 1 ? 4 : 2)}
                      </span>
                      <span className="col-span-3 text-right text-slate-300 z-10">
                        {bid.amount.toLocaleString()}
                      </span>
                      <span className="col-span-3 text-right text-slate-400 z-10">
                        ${bid.totalUsd.toLocaleString()}
                      </span>
                      <div className="col-span-3 flex items-center justify-end gap-1.5 z-10">
                        {bid.isWall && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold uppercase truncate max-w-[90px]" title={bid.institutionTag || 'Muralha Compradora'}>
                            {bid.wallStrength || 'Muralha'}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">{bid.depthPercentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>

            {/* RIGHT: Times & Trades (Tape Reading Flow) with Displacement Tracker (5 cols) */}
            <div className="lg:col-span-5 bg-[#0f1117] border border-slate-800 rounded-xl p-3.5 space-y-3 font-mono text-xs flex flex-col justify-between">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    Times & Trades (100 Execuções)
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                  Deslocamento Real
                </span>
              </div>

              {/* Table Column Headers */}
              <div className="grid grid-cols-12 gap-1 text-[10px] text-slate-500 font-bold uppercase pb-1 border-b border-slate-800/60 px-1">
                <span className="col-span-3">Hora</span>
                <span className="col-span-3">Preço (US$)</span>
                <span className="col-span-3 text-right">Qtd / Vol (US$)</span>
                <span className="col-span-3 text-right">Deslocamento</span>
              </div>

              {/* Scrollable Container with Recent Trades */}
              <div ref={tradesContainerRef} className="relative space-y-1 max-h-[460px] overflow-y-auto pr-1 select-none custom-scrollbar">
                {filteredTrades.map((trade) => {
                  const isBuy = trade.aggressor === 'BUY';
                  const isWhale = trade.totalUsd >= highlightWhaleThresholdUsd || trade.tradeType === 'Lote Institucional';

                  return (
                    <div 
                      key={trade.id}
                      className={`grid grid-cols-12 gap-1 items-center py-1.5 px-2 rounded border text-[11px] transition-all ${
                        isWhale
                          ? isBuy ? 'bg-emerald-950/50 border-emerald-500/60 shadow-sm' : 'bg-rose-950/50 border-rose-500/60 shadow-sm'
                          : 'bg-[#12141a]/80 border-slate-800/70 hover:bg-slate-800/50'
                      }`}
                    >
                      {/* Time */}
                      <span className="col-span-3 text-[10px] text-slate-400 truncate">
                        {trade.timeFormatted}
                      </span>

                      {/* Price */}
                      <span className={`col-span-3 font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${trade.price.toFixed(crypto.priceUsd < 1 ? 4 : 2)}
                      </span>

                      {/* Amount & Value */}
                      <div className="col-span-3 text-right">
                        <span className="text-slate-200 block">{trade.amount}</span>
                        <span className="text-[10px] text-slate-400 block">${trade.totalUsd.toLocaleString()}</span>
                      </div>

                      {/* Displacement & Tag */}
                      <div className="col-span-3 text-right space-y-0.5">
                        <span className={`text-[10.5px] font-bold block ${trade.priceDisplacement >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.priceDisplacement >= 0 ? '+' : ''}{trade.priceDisplacement}%
                        </span>
                        {isWhale && (
                          <span className="inline-block text-[9px] px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 uppercase">
                            Baleia
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB 2: AI Tape Reading & Entry Tracker Diagnosis */}
      {activeTab === 'ai_scanner' && (
        <div className="space-y-5">
          {currentAiAnalysis ? (
            <div className="space-y-5 font-mono text-xs">
              
              {/* Master AI Trade Signal Banner */}
              <div className="bg-gradient-to-r from-[#12141a] via-[#161a24] to-[#0f1117] border border-cyan-500/50 rounded-2xl p-5 shadow-xl space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-cyan-300 font-bold block">
                        Diagnóstico IA: Ponto Ótimo de Entrada Rastreado
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {currentAiAnalysis.bestEntryOpportunity.recommendedAction} em ${currentAiAnalysis.symbol}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs">
                      Confiança IA: {currentAiAnalysis.bestEntryOpportunity.confidenceScore}%
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold text-xs">
                      R:R {currentAiAnalysis.bestEntryOpportunity.riskRewardRatio}
                    </span>
                  </div>
                </div>

                {/* 4 Trade Parameters Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="p-3 bg-[#0a0a0b] rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase block">Gatilho de Entrada:</span>
                    <div className="text-base font-bold text-cyan-300">
                      US$ {currentAiAnalysis.bestEntryOpportunity.triggerPrice.toLocaleString('en-US', { minimumFractionDigits: crypto.priceUsd < 1 ? 4 : 2 })}
                    </div>
                    <span className="text-[10.5px] text-slate-400 block font-sans">
                      Entrada por confirmação de ordem no Book
                    </span>
                  </div>

                  <div className="p-3 bg-[#0a0a0b] rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase block">Alvo Projetado (Take Profit):</span>
                    <div className="text-base font-bold text-emerald-400">
                      US$ {currentAiAnalysis.bestEntryOpportunity.expectedTarget.toLocaleString('en-US', { minimumFractionDigits: crypto.priceUsd < 1 ? 4 : 2 })}
                    </div>
                    <span className="text-[10.5px] text-emerald-400 block">
                      Potencial: {currentAiAnalysis.bestEntryOpportunity.displacementPotentialPct}
                    </span>
                  </div>

                  <div className="p-3 bg-[#0a0a0b] rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase block">Stop Loss de Invalidação:</span>
                    <div className="text-base font-bold text-rose-400">
                      US$ {currentAiAnalysis.bestEntryOpportunity.recommendedStop.toLocaleString('en-US', { minimumFractionDigits: crypto.priceUsd < 1 ? 4 : 2 })}
                    </div>
                    <span className="text-[10.5px] text-slate-400 block font-sans">
                      Abaixo da maior muralha de suporte
                    </span>
                  </div>

                  <div className="p-3 bg-[#0a0a0b] rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase block">Sinal no Times & Trades:</span>
                    <div className="text-xs font-bold text-amber-300 leading-snug">
                      {currentAiAnalysis.bestEntryOpportunity.confirmationSignal}
                    </div>
                  </div>
                </div>

                {/* Rationale Explanation */}
                <div className="p-3.5 bg-[#0a0a0b]/80 rounded-xl border border-slate-800 font-sans text-xs text-slate-300 leading-relaxed">
                  <strong className="text-cyan-400 font-mono block mb-1">Tese Quantitativa de Entrada:</strong>
                  {currentAiAnalysis.bestEntryOpportunity.rationale}
                </div>

              </div>

              {/* 4 Deep Tape Reading Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Pillar 1: Absorção no Book */}
                <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold pb-2 border-b border-slate-800">
                    <Layers className="w-4 h-4" />
                    <span>Diagnóstico de Absorção de Livro (100 Níveis)</span>
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed">
                    {currentAiAnalysis.aiAnalysis?.bookAbsorptionDiagnosis}
                  </p>
                </div>

                {/* Pillar 2: Tape Reading & Agressão */}
                <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold pb-2 border-b border-slate-800">
                    <Activity className="w-4 h-4" />
                    <span>Leitura de Fita (Times & Trades Flow)</span>
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed">
                    {currentAiAnalysis.aiAnalysis?.tapeReadingInsight}
                  </p>
                </div>

                {/* Pillar 3: Vácuo de Liquidez & Deslocamento */}
                <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold pb-2 border-b border-slate-800">
                    <Zap className="w-4 h-4" />
                    <span>Deslocamento de Preço & Vácuo de Liquidez</span>
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed">
                    {currentAiAnalysis.aiAnalysis?.liquidityVacuumDetected 
                      ? 'Vácuo de liquidez ativo detectado acima do spread. Poucas ordens limites no Ask facilitam avanço veloz de preço ao entrar agressão.'
                      : 'Livro denso com distribuição uniforme de ordens em ambos os lados.'}
                  </p>
                </div>

                {/* Pillar 4: Rastro Institucional (Whale Footprint) */}
                <div className="p-4 bg-[#12141a] rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold pb-2 border-b border-slate-800">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Rastro de Baleias & Market Makers</span>
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed">
                    {currentAiAnalysis.aiAnalysis?.whaleFootprint}
                  </p>
                </div>

              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-[#12141a] rounded-2xl border border-slate-800 space-y-3 font-mono">
              <BrainCircuit className="w-10 h-10 text-cyan-400 mx-auto animate-pulse" />
              <h4 className="text-sm font-bold text-white">Nenhuma análise de IA executada ainda para ${crypto.symbol}</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clique no botão abaixo para processar 100 níveis do Book de Ofertas e o Times & Trades pelo motor Gemini Server-Side.
              </p>
              <button
                type="button"
                onClick={() => handleTriggerAiTapeReading()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs inline-flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span>Processar Análise IA Agora</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Historical Database Records Table */}
      {activeTab === 'database_history' && (
        <div className="space-y-4 font-mono text-xs">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#12141a] rounded-xl border border-slate-800">
            <div>
              <span className="font-bold text-slate-200 block text-xs">
                Banco de Dados de Order Flow & Tape Reading ({storedDatabaseRecords.length} Snapshots)
              </span>
              <p className="text-[11px] font-sans text-slate-400">
                Snapshots auditáveis gravados a cada varredura de IA para comparação cronológica de desbalanço e pontos de entrada.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearOrderFlowDatabase();
                  setStoredDatabaseRecords([]);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Banco</span>
              </button>
            </div>
          </div>

          {storedDatabaseRecords.length > 0 ? (
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#0f1117]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#12141a] text-[10px] text-slate-400 uppercase">
                    <th className="p-3">Horário</th>
                    <th className="p-3">Ativo</th>
                    <th className="p-3">Preço Spot</th>
                    <th className="p-3">Desbalanço Book</th>
                    <th className="p-3">CVD Agressão</th>
                    <th className="p-3">Ação Sugerida</th>
                    <th className="p-3">Gatilho Entrada</th>
                    <th className="p-3">Confiança IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {storedDatabaseRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-slate-400">{rec.timestamp}</td>
                      <td className="p-3 font-bold text-white">${rec.symbol}</td>
                      <td className="p-3 font-bold text-cyan-300">US$ {rec.priceUsd}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.orderBookImbalance >= 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {rec.orderBookImbalance >= 0 ? '+' : ''}{rec.orderBookImbalance}% Bids
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={rec.cumulativeVolumeDelta >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          ${(rec.cumulativeVolumeDelta / 1000).toFixed(1)}k
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold text-[10.5px]">
                          {rec.bestEntryOpportunity.recommendedAction}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-400">
                        US$ {rec.bestEntryOpportunity.triggerPrice}
                      </td>
                      <td className="p-3 text-slate-300">
                        {rec.bestEntryOpportunity.confidenceScore}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 bg-[#12141a] rounded-xl border border-slate-800">
              Nenhum registro gravado no banco ainda.
            </div>
          )}

        </div>
      )}

    </div>
  );
}
