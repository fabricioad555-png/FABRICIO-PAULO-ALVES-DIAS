import React, { useState, useMemo, useEffect } from 'react';
import { 
  Cpu, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Layers, 
  DollarSign, 
  Copy, 
  Check, 
  Calendar, 
  ShieldCheck, 
  Database, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Sparkles, 
  Info, 
  FileText,
  Clock,
  ArrowRight,
  Landmark,
  Radar,
  Lock,
  ExternalLink,
  Compass,
  HeartPulse,
  Network,
  Code2,
  Coins,
  Boxes,
  Zap,
  Globe,
  Award,
  BrainCircuit,
  Gauge,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkle,
  Filter,
  Building2,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  BarChart, 
  LineChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  Cell, 
  Area, 
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar
} from 'recharts';
import { 
  CryptoMention, 
  OnChainHistoryData, 
  OnChainHistoricalMonth,
  CotReportData,
  OnChainTrackerEntity,
  EcosystemHealthData,
  EcosystemBranchMetric,
  AIOnChainMasterVerdict,
  OnChainDimensionAnalysis 
} from '../types';
import { 
  getOnChainHistoryForCrypto, 
  getCotReportForCrypto, 
  getOnChainTrackersForCrypto,
  getEcosystemHealthData 
} from '../data/onChainHistoryData';

interface OnChainHistoryAnalysisBlockProps {
  cryptos: CryptoMention[];
  selectedSymbol?: string;
  initialSymbol?: string;
  onOpenPredictionModal?: (symbol: string) => void;
}

export const OnChainHistoryAnalysisBlock: React.FC<OnChainHistoryAnalysisBlockProps> = ({
  cryptos,
  selectedSymbol: propSelectedSymbol,
  initialSymbol = 'SOL',
  onOpenPredictionModal,
}) => {
  // Active selected crypto driven by unified forum selection
  const activeSymbol = propSelectedSymbol || initialSymbol;
  const [activeTab, setActiveTab] = useState<'ai_master' | 'overview' | 'ecosystem_health' | 'cot_report' | 'onchain_trackers' | 'netflow' | 'mvrv' | 'whales' | 'table'>('ai_master');
  const [trackerFilter, setTrackerFilter] = useState<string>('all');
  const [selectedBranchCategory, setSelectedBranchCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<OnChainHistoricalMonth | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // AI Master Analyzer State
  const [aiVerdict, setAiVerdict] = useState<AIOnChainMasterVerdict | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiFilterBias, setAiFilterBias] = useState<'all' | 'buy' | 'neutral' | 'sell'>('all');
  const [copiedAiSummary, setCopiedAiSummary] = useState<boolean>(false);

  // Selected crypto object linked directly to the unified crypto selection
  const selectedCrypto = useMemo(() => {
    const found = cryptos.find((c) => c.symbol.toUpperCase() === activeSymbol.toUpperCase());
    return found || cryptos[0] || {
      id: 'sol',
      symbol: 'SOL',
      name: 'Solana',
      priceUsd: 214.50,
      change24h: 8.45,
      mentions24h: 24890,
      mentionsChange24h: 38,
      sentimentScore: 84,
      bullishPercent: 80,
      bearishPercent: 12,
      neutralPercent: 8,
      topForum: 'binance',
      signal: 'alta_forte',
      predictedDirection: 'UP',
      predictedChangeRange: '+5% a +12%',
      predictionConfidence: 91,
    };
  }, [cryptos, activeSymbol]);

  // Retrieve Ecosystem Health & Vertical Branches Data
  const ecosystemHealth: EcosystemHealthData = useMemo(() => {
    return getEcosystemHealthData(selectedCrypto);
  }, [selectedCrypto]);

  // Retrieve 12-month on-chain history data
  const onChainHistory: OnChainHistoryData = useMemo(() => {
    return getOnChainHistoryForCrypto(selectedCrypto);
  }, [selectedCrypto]);

  // Retrieve COT (Commitment of Traders - CFTC) Report Data
  const cotReportData: CotReportData = useMemo(() => {
    return getCotReportForCrypto(selectedCrypto);
  }, [selectedCrypto]);

  // Retrieve Live On-Chain Trackers (ETFs, Baleias, Mineradores, Cold Wallets)
  const onChainTrackers: OnChainTrackerEntity[] = useMemo(() => {
    return getOnChainTrackersForCrypto(selectedCrypto);
  }, [selectedCrypto]);

  // Fetch or Refresh AI Master Analysis
  const executeAiOnChainAudit = async () => {
    setIsLoadingAi(true);
    try {
      const response = await fetch('/api/ai/onchain-master-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedCrypto.symbol,
          name: selectedCrypto.name,
          priceUsd: selectedCrypto.priceUsd,
          change24h: selectedCrypto.change24h,
          onChainContext: {
            ecosystemScore: ecosystemHealth.overallHealthScore,
            ecosystemRating: ecosystemHealth.healthRating,
            cotInstitutionalBias: cotReportData.institutionalBiasText,
            cotWeeklyChange: cotReportData.weeklyChangeContracts,
            trackersCount: onChainTrackers.length,
            latestNetflow: onChainHistory.twelveMonthsData[onChainHistory.twelveMonthsData.length - 1]?.exchangeNetflowUsdMillions,
            latestMvrv: onChainHistory.twelveMonthsData[onChainHistory.twelveMonthsData.length - 1]?.mvrvRatio,
          }
        })
      });
      const data = await response.json();
      if (data.success && data.result) {
        setAiVerdict(data.result);
      }
    } catch (err) {
      console.warn('Error fetching AI OnChain Analysis:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Automatically fetch AI analysis when crypto changes
  useEffect(() => {
    executeAiOnChainAudit();
  }, [selectedCrypto.symbol]);

  // Filtered on-chain trackers
  const filteredTrackers = useMemo(() => {
    if (trackerFilter === 'all') return onChainTrackers;
    return onChainTrackers.filter((t) => t.category === trackerFilter);
  }, [onChainTrackers, trackerFilter]);

  // Enriched chart data with 3-Month Moving Averages for each month
  const chartDataWith3mAvg = useMemo(() => {
    return onChainHistory.twelveMonthsData.map((item, index, arr) => {
      // Compute 3-month window ending at current month
      const startIdx = Math.max(0, index - 2);
      const windowSlice = arr.slice(startIdx, index + 1);
      
      const avgActiveAddresses = Math.round(
        windowSlice.reduce((sum, curr) => sum + curr.activeAddressesDailyAvg, 0) / windowSlice.length
      );
      
      const avgNetflow = Math.round(
        windowSlice.reduce((sum, curr) => sum + curr.exchangeNetflowUsdMillions, 0) / windowSlice.length
      );

      return {
        ...item,
        activeAddresses3mAvg: avgActiveAddresses,
        activeAddresses3mAvgFormatted: avgActiveAddresses >= 1000 
          ? `${(avgActiveAddresses / 1000).toFixed(2)}M` 
          : `${avgActiveAddresses}k`,
        netflow3mAvg: avgNetflow,
      };
    });
  }, [onChainHistory]);

  // 3-Month Comparative Analytics vs Current Month (New Entries)
  const threeMonthAnalysis = useMemo(() => {
    const rawData = onChainHistory.twelveMonthsData;
    if (!rawData || rawData.length < 3) {
      return null;
    }

    const currentMonth = rawData[rawData.length - 1]; // Latest month / new entries
    const last3Months = rawData.slice(-3); // Last 3 months window

    // 3M Averages
    const avgNetflow3m = Math.round(
      last3Months.reduce((acc, m) => acc + m.exchangeNetflowUsdMillions, 0) / last3Months.length
    );
    const avgActiveAddresses3m = Math.round(
      last3Months.reduce((acc, m) => acc + m.activeAddressesDailyAvg, 0) / last3Months.length
    );

    // Active addresses comparison
    const activeDiffRaw = currentMonth.activeAddressesDailyAvg - avgActiveAddresses3m;
    const activeDiffPct = Number(((activeDiffRaw / (avgActiveAddresses3m || 1)) * 100).toFixed(1));
    const activeGrowthTrend = activeDiffPct >= 0 ? 'Expansão de Novas Entradas' : 'Estabilidade de Base';

    // Netflow comparison
    const netflowDiffRaw = currentMonth.exchangeNetflowUsdMillions - avgNetflow3m;
    const isAccumulation = currentMonth.exchangeNetflowUsdMillions <= 0;
    const isOutflowAccelerating = currentMonth.exchangeNetflowUsdMillions <= avgNetflow3m;

    // Cross Absorption Diagnosis
    let crossDiagnosis = '';
    if (isAccumulation && activeDiffPct >= 0) {
      crossDiagnosis = `Forte absorção on-chain: Novas entradas de usuários (${activeDiffPct >= 0 ? '+' : ''}${activeDiffPct}% acima da média de 3 meses) combinadas com saídas contínuas de corretoras ($${Math.abs(currentMonth.exchangeNetflowUsdMillions)}M retirados para carteiras frias) confirmam acumulação institucional saudável sem pressão vendedora.`;
    } else if (isAccumulation && activeDiffPct < 0) {
      crossDiagnosis = `Consolidação com retenção: Embora o ritmo de novos endereços esteja ${activeDiffPct}% em relação à média trimestral, o fluxo de corretoras continua em forte regime de saída ($${Math.abs(currentMonth.exchangeNetflowUsdMillions)}M retirados), mantendo o choque de oferta.`;
    } else if (!isAccumulation && activeDiffPct >= 0) {
      crossDiagnosis = `Atenção à liquidez em CEXs: Houve aumento de novos endereços (+${activeDiffPct}% vs média 3M), porém com entradas líquidas em corretoras (+$${currentMonth.exchangeNetflowUsdMillions}M), sinalizando potencial aumento na oferta disponível para negociação.`;
    } else {
      crossDiagnosis = `Neutralidade com desaceleração: Atividade de rede abaixo da média trimestral com fluxos equilibrados em corretoras.`;
    }

    return {
      currentMonth,
      last3Months,
      avgNetflow3m,
      avgActiveAddresses3m,
      avgActiveFormatted: avgActiveAddresses3m >= 1000 
        ? `${(avgActiveAddresses3m / 1000).toFixed(2)}M` 
        : `${avgActiveAddresses3m}k`,
      currentActiveFormatted: currentMonth.activeAddressesFormatted,
      activeDiffRaw,
      activeDiffPct,
      activeGrowthTrend,
      netflowDiffRaw,
      isAccumulation,
      isOutflowAccelerating,
      crossDiagnosis,
    };
  }, [onChainHistory]);

  // Current month / latest entry
  const latestMonth = onChainHistory.twelveMonthsData[onChainHistory.twelveMonthsData.length - 1];

  // Copy full 12-month On-Chain Report
  const handleCopyReport = () => {
    const text = `⛓️ *RELATÓRIO ON-CHAIN 12 MESES: $${onChainHistory.symbol} (${onChainHistory.name})*
📅 *Período:* Últimos 12 Meses (Setembro 2025 - Agosto 2026)
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 *Score On-Chain Atual:* ${onChainHistory.summary12m.currentOnChainHealthScore}/100
🔄 *Fase do Ciclo:* ${onChainHistory.summary12m.cyclePhaseSummary}
🏦 *Netflow em Corretoras (12M):* ${onChainHistory.summary12m.totalNetflow12mUsd}
👥 *Crescimento de Endereços Ativos (12M):* ${onChainHistory.summary12m.activeAddressesGrowth12m}
🐋 *Acúmulo de Grandes Carteiras (Baleias):* ${onChainHistory.summary12m.whaleHoldingTrend}
📊 *MVRV Ratio Médio (12M):* ${onChainHistory.summary12m.averageMvrv12m} (Zona Atual: ${latestMonth?.mvrvZone || 'Saudável'})

📋 *HISTÓRICO MÊS A MÊS (ÚLTIMOS 12 MESES):*
${onChainHistory.twelveMonthsData
  .map(
    (m) =>
      `• ${m.monthLabel}: Preço $${m.avgPriceUsd.toLocaleString('en-US')} | Ativos: ${m.activeAddressesFormatted} | Netflow: ${m.exchangeNetflowFormatted} | MVRV: ${m.mvrvRatio} | Score: ${m.onChainScore}/100`
  )
  .join('\n')}

💡 *DIAGNÓSTICO ESTRUTURAL IA:*
${onChainHistory.summary12m.keyTakeaway12m}`;

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <section 
      id="onchain-history-analysis-block"
      className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md relative overflow-hidden space-y-6"
    >
      {/* Background ambient neon glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400 shadow-inner">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 font-mono">
                  VARIÁVEIS ON-CHAIN (DADOS DA REDE)
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40 shadow-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  Histórico dos Últimos 12 Meses
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Métricas estruturais na blockchain: fluxo em corretoras (netflow), endereços ativos, acúmulo de baleias e MVRV vinculados à criptomoeda ativa nos fóruns.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {onOpenPredictionModal && (
            <button
              id="onchain-open-predictive-modal-btn"
              onClick={() => onOpenPredictionModal(selectedCrypto.symbol)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold transition shadow-sm"
              title="Abrir Raio-X Preditivo"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Raio-X Preditivo
            </button>
          )}

          <button
            id="onchain-copy-report-btn"
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition shadow-sm"
            title="Copiar Relatório On-Chain de 12 Meses"
          >
            {copiedReport ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiar Relatório 12M</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Linked Synchronized Active Coin Banner */}
      <div className="bg-slate-950/80 rounded-xl p-3 sm:p-4 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Criptomoeda Selecionada (On-Chain):
              </span>
              <span className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border border-emerald-400 text-white font-mono font-black text-sm flex items-center gap-2 shadow-sm">
                <span>${selectedCrypto.symbol}</span>
                <span className="text-slate-300 font-sans text-xs font-normal">({selectedCrypto.name})</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  selectedCrypto.change24h >= 0 ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                }`}>
                  {selectedCrypto.change24h >= 0 ? '+' : ''}{selectedCrypto.change24h}%
                </span>
              </span>
            </div>
            <p className="text-[11px] font-mono text-emerald-400/90 mt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Sincronizado diretamente com a Seleção de Criptomoeda dos Fóruns ({cryptos.length} de {cryptos.length} moedas)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 flex-wrap">
          <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 flex items-center gap-1.5">
            <span className="text-slate-400">Preço Spot:</span>
            <strong className="text-white">${selectedCrypto.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300 hidden md:flex items-center gap-1.5">
            <span className="text-slate-400">Menções 24h:</span>
            <strong className="text-cyan-300">{selectedCrypto.mentions24h.toLocaleString('pt-BR')}</strong>
          </div>
        </div>
      </div>

      {/* Selected Coin Profile & 12M KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Netflow 12 Meses */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80 hover:border-emerald-500/40 transition flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Netflow Corretoras (12M)
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Fluxo Líquido
            </span>
          </div>
          <div>
            <div className="text-base sm:text-lg font-mono font-black text-emerald-300 truncate">
              {onChainHistory.summary12m.totalNetflow12mUsd.split(' ')[0]}
            </div>
            <p className="text-[10px] text-slate-300 font-sans leading-tight mt-0.5">
              {onChainHistory.summary12m.totalNetflow12mUsd}
            </p>
          </div>
        </div>

        {/* KPI 2: Endereços Ativos */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80 hover:border-cyan-500/40 transition flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Crescimento de Usuários (12M)
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Ativos Diários
            </span>
          </div>
          <div>
            <div className="text-base sm:text-lg font-mono font-black text-cyan-300">
              {latestMonth?.activeAddressesFormatted || '0'}
            </div>
            <p className="text-[10px] text-slate-300 font-sans leading-tight mt-0.5">
              {onChainHistory.summary12m.activeAddressesGrowth12m}
            </p>
          </div>
        </div>

        {/* KPI 3: Carteiras Baleia */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80 hover:border-indigo-500/40 transition flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Acúmulo Baleias & Smart Money
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Supply Retido
            </span>
          </div>
          <div>
            <div className="text-base sm:text-lg font-mono font-black text-indigo-300">
              {latestMonth?.whaleSupplyHeldPct}% do Supply
            </div>
            <p className="text-[10px] text-slate-300 font-sans leading-tight mt-0.5">
              {onChainHistory.summary12m.whaleHoldingTrend}
            </p>
          </div>
        </div>

        {/* KPI 4: MVRV Ratio & Score On-Chain */}
        <div className="bg-slate-950/70 rounded-xl p-3.5 border border-slate-800/80 hover:border-amber-500/40 transition flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              MVRV Ratio & Score On-Chain
            </span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Score {onChainHistory.summary12m.currentOnChainHealthScore}/100
            </span>
          </div>
          <div>
            <div className="text-base sm:text-lg font-mono font-black text-amber-300 flex items-center gap-2">
              <span>{latestMonth?.mvrvRatio || 1.85}</span>
              <span className="text-xs font-sans text-amber-200/80 font-normal">
                ({latestMonth?.mvrvZone || 'Zona Saudável'})
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-sans leading-tight mt-0.5">
              Média 12M: {onChainHistory.summary12m.averageMvrv12m} • {onChainHistory.summary12m.cyclePhaseSummary}
            </p>
          </div>
        </div>

      </div>

      {/* Tabs Navigation for 12-Month Views & Specialized On-Chain Trackers */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            id="onchain-tab-ai-master"
            onClick={() => setActiveTab('ai_master')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 shadow-md ${
              activeTab === 'ai_master'
                ? 'bg-gradient-to-r from-purple-950/90 via-slate-900 to-emerald-950/90 text-purple-200 border border-purple-500/60 shadow-purple-500/20 ring-1 ring-purple-500/50'
                : 'text-purple-300/80 bg-purple-950/30 border border-purple-800/40 hover:text-purple-100 hover:bg-purple-900/40'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>IA Analisador: 7 Variáveis On-Chain</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-purple-500/30 text-purple-300 border border-purple-400/40">
              {aiVerdict?.overallScore || 92}/100
            </span>
          </button>

          <button
            id="onchain-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Visão Geral 12M
          </button>

          <button
            id="onchain-tab-ecosystem"
            onClick={() => setActiveTab('ecosystem_health')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === 'ecosystem_health'
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400 shadow-md ring-1 ring-emerald-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Saúde do Ecossistema & Vertentes
            <span className="px-1 py-0.2 rounded text-[8.5px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {ecosystemHealth.overallHealthScore}/100
            </span>
          </button>

          <button
            id="onchain-tab-cot"
            onClick={() => setActiveTab('cot_report')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === 'cot_report'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm ring-1 ring-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-amber-400" />
            Relatório COT (Commitment of Traders)
          </button>

          <button
            id="onchain-tab-trackers"
            onClick={() => setActiveTab('onchain_trackers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === 'onchain_trackers'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm ring-1 ring-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Radar className="w-3.5 h-3.5 text-cyan-400" />
            Rastreadores On-Chain (Carteiras & Fundos)
          </button>

          <button
            id="onchain-tab-netflow"
            onClick={() => setActiveTab('netflow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === 'netflow'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Fluxo em Corretoras (Netflow)
          </button>

          <button
            id="onchain-tab-mvrv"
            onClick={() => setActiveTab('mvrv')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === 'mvrv'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            MVRV Ratio & Ciclo
          </button>

          <button
            id="onchain-tab-whales"
            onClick={() => setActiveTab('whales')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === 'whales'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Baleias & Score de Rede
          </button>

          <button
            id="onchain-tab-table"
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeTab === 'table'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Tabela Mês a Mês (12 Meses)
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Ativo: <strong className="text-white">${onChainHistory.symbol}</strong></span>
        </div>
      </div>

      {/* Main Charts & Visualizations Container */}
      <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800/80">
        
        {/* Tab 0: AI Master Analyzer: ON-CHAIN VARIABLES (7 DIMENSIONS AUDIT & BUY/SELL SIGNALS) */}
        {activeTab === 'ai_master' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Header Master Banner with AI Verdict & Overall Score */}
            <div className="bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-950 rounded-2xl p-5 border border-purple-500/30 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left: Summary & Macro Phase */}
                <div className="space-y-3 max-w-3xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5 shadow-sm">
                      <BrainCircuit className="w-3 h-3 text-purple-400 animate-pulse" />
                      Auditoria Quantitativa de Redes
                    </span>

                    <span className={`px-3 py-1 rounded-md text-xs font-mono font-black border shadow-md flex items-center gap-1.5 ${
                      (aiVerdict?.consensusSignal || '').includes('COMPRA')
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 shadow-emerald-500/20 ring-1 ring-emerald-400/40'
                        : (aiVerdict?.consensusSignal || '').includes('VENDA')
                        ? 'bg-rose-500/25 text-rose-300 border-rose-400 shadow-rose-500/20 ring-1 ring-rose-400/40'
                        : 'bg-amber-500/25 text-amber-300 border-amber-400 shadow-amber-500/20 ring-1 ring-amber-400/40'
                    }`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      VEREDITO ON-CHAIN: {aiVerdict?.consensusSignal || 'FORTE COMPRA'}
                    </span>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60">
                      Convicção IA: {aiVerdict?.confidencePct || 92}%
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-mono font-black text-white flex items-center gap-2">
                      Analisador Master de Variáveis On-Chain (${selectedCrypto.symbol})
                    </h3>
                    <p className="text-xs text-purple-200/80 font-sans font-medium mt-0.5">
                      Fase do Ciclo: <strong className="text-cyan-300 font-mono">{aiVerdict?.macroCyclePhase || 'Acúmulo Institucional & Drenagem de Liquidez'}</strong>
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                    {aiVerdict?.onChainSummary || `A auditoria multi-dimensional para ${selectedCrypto.symbol} aponta confluência altista superior com score médio ponderado de 92/100, fundamentada em saídas constantes de moedas das corretoras (choque de oferta), posicionamento comprado dos fundos no relatório COT e saúde exemplar do ecossistema.`}
                  </p>
                </div>

                {/* Right: Score Gauge & Action Controls */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-center lg:items-end justify-between gap-4 shrink-0">
                  <div className="bg-slate-900/90 border border-purple-500/40 px-5 py-3.5 rounded-2xl flex items-center gap-4 shadow-lg text-center">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">Score Global On-Chain</span>
                      <div className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300">
                        {aiVerdict?.overallScore || 92}<span className="text-xs text-slate-400 font-normal">/100</span>
                      </div>
                    </div>
                    <div className="h-10 w-px bg-slate-800" />
                    <div className="text-left font-mono text-[10px] space-y-0.5">
                      <div className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {aiVerdict?.buySignalsCount ?? 6} Sinais Compra
                      </div>
                      <div className="text-amber-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {aiVerdict?.neutralSignalsCount ?? 1} Neutro/Acúmulo
                      </div>
                      <div className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {aiVerdict?.sellSignalsCount ?? 0} Sinais Venda
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full justify-end">
                    <button
                      onClick={executeAiOnChainAudit}
                      disabled={isLoadingAi}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 disabled:opacity-50"
                      title="Recalcular com IA"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin text-purple-400' : 'text-slate-400'}`} />
                      <span>{isLoadingAi ? 'Analisando...' : 'Re-auditar IA'}</span>
                    </button>

                    <button
                      onClick={() => {
                        const text = `=== AUDITORIA ON-CHAIN MASTER IA: ${selectedCrypto.symbol} ===\nScore Geral: ${aiVerdict?.overallScore || 92}/100\nVeredito: ${aiVerdict?.consensusSignal || 'FORTE COMPRA'}\nFase de Ciclo: ${aiVerdict?.macroCyclePhase}\n\nSíntese:\n${aiVerdict?.onChainSummary}\n\nEstratégia:\nZona Acúmulo: ${aiVerdict?.executionStrategy.idealAccumulationZone}\nInvalidação: ${aiVerdict?.executionStrategy.onChainInvalidationPrice}\nAlvo de Ciclo: ${aiVerdict?.executionStrategy.longTermCycleTarget}`;
                        navigator.clipboard.writeText(text);
                        setCopiedAiSummary(true);
                        setTimeout(() => setCopiedAiSummary(false), 2500);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40"
                    >
                      {copiedAiSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAiSummary ? 'Copiado!' : 'Copiar Resumo'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tactical Execution & Institutional Accumulation Box */}
            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  Estratégia Tática On-Chain & Gestão Institucional (${selectedCrypto.symbol})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Convicção Institucional: {aiVerdict?.executionStrategy.institutionalConviction || 'EXTREMA'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10.5px] font-mono text-slate-400 block">🎯 Zona Ideal de Acúmulo</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 block mt-1">
                    {aiVerdict?.executionStrategy.idealAccumulationZone || `US$ ${(selectedCrypto.priceUsd * 0.98).toFixed(2)} - US$ ${(selectedCrypto.priceUsd * 1.01).toFixed(2)}`}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10.5px] font-mono text-slate-400 block">🛡️ Invalidação On-Chain</span>
                  <span className="text-xs font-mono font-bold text-rose-400 block mt-1">
                    {aiVerdict?.executionStrategy.onChainInvalidationPrice || `US$ ${(selectedCrypto.priceUsd * 0.92).toFixed(2)} (Abaixo do Custo Médio)`}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10.5px] font-mono text-slate-400 block">🚀 Alvo de Ciclo de Longo Prazo</span>
                  <span className="text-xs font-mono font-bold text-cyan-300 block mt-1">
                    {aiVerdict?.executionStrategy.longTermCycleTarget || `US$ ${(selectedCrypto.priceUsd * 1.55).toFixed(2)} - US$ ${(selectedCrypto.priceUsd * 1.95).toFixed(2)}`}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-[10.5px] font-mono text-slate-400 block">⏳ Horizonte Recomendado</span>
                  <span className="text-xs font-mono font-bold text-purple-300 block mt-1">
                    {aiVerdict?.executionStrategy.recommendedHoldingPeriod || 'Médio a Longo Prazo (3 a 12 meses)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bias Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-purple-400" />
                  Diagnóstico das 7 Variáveis On-Chain com Status de Compra & Venda
                </h4>
                <p className="text-xs text-slate-400">
                  Auditoria pontual de cada vetor: score quantitativo (0-100), peso na decisão e justificativa algorítmica.
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setAiFilterBias('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                    aiFilterBias === 'all'
                      ? 'bg-purple-500/25 text-purple-200 border-purple-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Todas as 7 Dimensões (7)
                </button>
                <button
                  onClick={() => setAiFilterBias('buy')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                    aiFilterBias === 'buy'
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Sinais de Compra ({aiVerdict?.buySignalsCount ?? 6})
                </button>
                <button
                  onClick={() => setAiFilterBias('neutral')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                    aiFilterBias === 'neutral'
                      ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Neutro / Acúmulo ({aiVerdict?.neutralSignalsCount ?? 1})
                </button>
                <button
                  onClick={() => setAiFilterBias('sell')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border ${
                    aiFilterBias === 'sell'
                      ? 'bg-rose-500/25 text-rose-300 border-rose-500/40 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Sinais de Venda ({aiVerdict?.sellSignalsCount ?? 0})
                </button>
              </div>
            </div>

            {/* 7 Dimensions Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(aiVerdict?.dimensions || [])
                .filter((dim) => {
                  if (aiFilterBias === 'buy') return dim.signal.includes('COMPRA');
                  if (aiFilterBias === 'neutral') return dim.signal === 'NEUTRO';
                  if (aiFilterBias === 'sell') return dim.signal.includes('VENDA');
                  return true;
                })
                .map((dim, idx) => {
                  const isBuy = dim.signal.includes('COMPRA');
                  const isSell = dim.signal.includes('VENDA');
                  return (
                    <div
                      key={dim.dimensionKey || idx}
                      className="bg-slate-900/90 rounded-xl p-4 border border-slate-800/90 hover:border-purple-500/40 transition space-y-3 shadow-md flex flex-col justify-between"
                    >
                      {/* Card Top: Title, Subtitle, and Signal Badge */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                Peso: {dim.weightPct}%
                              </span>
                              <span className={`px-2.5 py-0.5 rounded text-[10.5px] font-mono font-black border ${
                                dim.signal === 'FORTE_COMPRA'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                                  : dim.signal === 'COMPRA'
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                  : dim.signal === 'NEUTRO'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}>
                                {dim.signal.replace('_', ' ')}: {dim.signalLabel}
                              </span>
                            </div>
                            <h4 className="text-sm font-mono font-bold text-white mt-1.5 flex items-center gap-2">
                              {dim.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-sans">
                              {dim.subtitle}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base font-mono font-black text-purple-300 block">
                              {dim.score}/100
                            </span>
                            <span className="text-[9.5px] font-mono text-slate-400">
                              Score Vetorial
                            </span>
                          </div>
                        </div>

                        {/* Visual Score Bar */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2.5">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isBuy ? 'bg-gradient-to-r from-teal-500 to-emerald-400' : isSell ? 'bg-rose-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${dim.score}%` }}
                          />
                        </div>
                      </div>

                      {/* Primary and Secondary Metrics Box */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">{dim.metricPrimary.label}:</span>
                          <span className="text-cyan-300 font-bold text-xs block mt-0.5 truncate" title={dim.metricPrimary.value}>
                            {dim.metricPrimary.value}
                          </span>
                        </div>
                        <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                          <span className="text-slate-400 text-[10px] block">{dim.metricSecondary.label}:</span>
                          <span className="text-emerald-300 font-bold text-xs block mt-0.5 truncate" title={dim.metricSecondary.value}>
                            {dim.metricSecondary.value}
                          </span>
                        </div>
                      </div>

                      {/* AI Key Diagnostic */}
                      <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60 space-y-1">
                        <div className="text-[10px] font-mono font-bold text-purple-300 flex items-center gap-1">
                          <Sparkle className="w-3 h-3 text-purple-400" />
                          Diagnóstico da Inteligência Artificial:
                        </div>
                        <p className="text-xs text-slate-200 font-sans leading-relaxed">
                          {dim.keyDiagnostic}
                        </p>
                      </div>

                      {/* Risk Assessment & Quick Jump Action */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-400 font-sans truncate" title={dim.riskAssessment}>
                          <strong className="text-amber-400 font-mono">Risco: </strong>{dim.riskAssessment}
                        </span>
                        <button
                          onClick={() => {
                            if (dim.dimensionKey === 'overview_12m') setActiveTab('overview');
                            else if (dim.dimensionKey === 'ecosystem_health') setActiveTab('ecosystem_health');
                            else if (dim.dimensionKey === 'cot_report') setActiveTab('cot_report');
                            else if (dim.dimensionKey === 'onchain_trackers') setActiveTab('onchain_trackers');
                            else if (dim.dimensionKey === 'exchange_netflow') setActiveTab('netflow');
                            else if (dim.dimensionKey === 'mvrv_cycle') setActiveTab('mvrv');
                            else if (dim.dimensionKey === 'whales_network_score') setActiveTab('whales');
                          }}
                          className="text-cyan-400 hover:text-cyan-300 font-mono text-[10px] shrink-0 flex items-center gap-1 hover:underline"
                        >
                          Ver Gráficos <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Bullish Pillars vs Bearish Risks Bottom Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-900/90 rounded-xl p-4 border border-emerald-500/30 space-y-2.5">
                <h4 className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Pilares de Sustentação Altista On-Chain
                </h4>
                <div className="space-y-2">
                  {(aiVerdict?.bullishPillars || [
                    `Drenagem de liquidez em exchanges com netflow negativo consistente em 30 dias para ${selectedCrypto.symbol}`,
                    `Posicionamento majoritariamente comprado no relatório oficial COT (CFTC) por fundos institucionais`,
                    `MVRV Z-Score em região de expansão saudável, indicando amplo potencial antes de topo de ciclo`,
                    `Alta atividade de desenvolvedores e expansão das principais vertentes tecnológicas do ecossistema`
                  ]).map((pillar, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{pillar}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-xl p-4 border border-amber-500/30 space-y-2.5">
                <h4 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Pontos de Monitoramento & Riscos de Rede
                </h4>
                <div className="space-y-2">
                  {(aiVerdict?.bearishRisks || [
                    `Necessidade de monitoramento de desbloqueios secundários e correlação temporária com o índice S&P 500`,
                    `Resistência técnica momentânea em níveis de máximas de 90 dias`
                  ]).map((risk, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Overview Chart (Netflow Bars + Active Addresses Line + 3M Moving Average) */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Evolução de Fluxo em Corretoras e Endereços Ativos Diários (12 Meses)
                </h3>
                <p className="text-xs text-slate-400">
                  Barras Verdes = Saída Líquida de CEXs (HODL/Acúmulo) • Barras Vermelhas = Inflow (Venda) • Linha Ciano = Endereços Ativos • Linha Tracejada = Média Móvel 3M
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Saída Líquida (HODL)
                </span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" /> Endereços Ativos
                </span>
                <span className="flex items-center gap-1 text-sky-300">
                  <span className="w-4 h-0.5 border-t-2 border-dashed border-sky-400 inline-block" /> Média Móvel 3M
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartDataWith3mAvg}
                  margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  onClick={(e: any) => {
                    if (e && e.activePayload && e.activePayload.length > 0) {
                      setSelectedMonth(e.activePayload[0].payload as OnChainHistoricalMonth);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis 
                    dataKey="shortLabel" 
                    stroke="#64748b" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => `$${val}M`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    stroke="#06b6d4"
                    tick={{ fill: '#06b6d4', fontSize: 11 }}
                    tickFormatter={(val) => `${val}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#10b981',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#f8fafc',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8)',
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === 'exchangeNetflowUsdMillions' || name === 'Netflow Corretoras (US$ Milhões)') {
                        return [`$${value}M (${value < 0 ? 'Saída Líquida / HODL' : 'Entrada em CEXs'})`, 'Netflow Corretoras'];
                      }
                      if (name === 'activeAddressesDailyAvg' || name === 'Endereços Ativos Diários (k)') {
                        return [`${value}k endereços/dia`, 'Endereços Ativos'];
                      }
                      if (name === 'activeAddresses3mAvg' || name === 'Média Móvel 3M (Endereços Ativos)') {
                        return [`${value}k endereços/dia`, 'Média Móvel 3M (Ativos)'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Mês: ${label}`}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} 
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="exchangeNetflowUsdMillions" 
                    name="Netflow Corretoras (US$ Milhões)" 
                    radius={[4, 4, 0, 0]}
                  >
                    {chartDataWith3mAvg.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.exchangeNetflowUsdMillions <= 0 ? '#10b981' : '#f43f5e'} 
                      />
                    ))}
                  </Bar>
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="activeAddressesDailyAvg" 
                    name="Endereços Ativos Diários (k)" 
                    stroke="#06b6d4" 
                    strokeWidth={2.5}
                    dot={{ fill: '#06b6d4', r: 3 }}
                    activeDot={{ r: 6, fill: '#38bdf8' }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="activeAddresses3mAvg" 
                    name="Média Móvel 3M (Endereços Ativos)" 
                    stroke="#38bdf8" 
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Intuitive 3-Month Historical Average vs. New Entries Analysis Card */}
            {threeMonthAnalysis && (
              <div 
                id="onchain-3m-comparative-analysis"
                className="bg-slate-900/95 border border-emerald-500/40 rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                        COMPARAÇÃO TRIMESTRAL: MÉDIA DOS ÚLTIMOS 3 MESES vs. NOVAS ENTRADAS
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Benchmark dinâmico comparando a média dos últimos 3 meses ({threeMonthAnalysis.last3Months.map(m => m.shortLabel).join(', ')}) contra as novas entradas e o fluxo do mês atual ({threeMonthAnalysis.currentMonth.monthLabel}).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono self-start lg:self-auto">
                    <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                      Período Base: <strong>3 Meses</strong>
                    </span>
                    <span className={`px-2.5 py-1 rounded-md border font-bold flex items-center gap-1 ${
                      threeMonthAnalysis.activeDiffPct >= 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {threeMonthAnalysis.activeDiffPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      Novas Entradas: {threeMonthAnalysis.activeDiffPct >= 0 ? `+${threeMonthAnalysis.activeDiffPct}%` : `${threeMonthAnalysis.activeDiffPct}%`} vs 3M
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Metric 1: Exchange Netflow Comparison */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-emerald-500/30 transition">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                          <Database className="w-3.5 h-3.5 text-emerald-400" />
                          Fluxo em Corretoras (Netflow)
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          threeMonthAnalysis.currentMonth.exchangeNetflowUsdMillions <= 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {threeMonthAnalysis.currentMonth.exchangeNetflowUsdMillions <= 0 ? 'Retiradas (HODL)' : 'Depósitos (CEX)'}
                        </span>
                      </div>

                      <div className="space-y-2 mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Média 3 Últimos Meses:</span>
                          <span className="font-mono font-bold text-slate-200">
                            {threeMonthAnalysis.avgNetflow3m <= 0 
                              ? `-$${Math.abs(threeMonthAnalysis.avgNetflow3m)}M / mês` 
                              : `+$${threeMonthAnalysis.avgNetflow3m}M / mês`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Mês Atual / Entradas:</span>
                          <span className={`font-mono font-bold ${
                            threeMonthAnalysis.currentMonth.exchangeNetflowUsdMillions <= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}>
                            {threeMonthAnalysis.currentMonth.exchangeNetflowUsdMillions <= 0 
                              ? `-$${Math.abs(threeMonthAnalysis.currentMonth.exchangeNetflowUsdMillions)}M` 
                              : `+$${threeMonthAnalysis.currentMonth.exchangeNetflowUsdMillions}M`}
                          </span>
                        </div>
                      </div>

                      {/* Visual Flow Balance Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>Pressão Vendedora</span>
                          <span className="text-emerald-400 font-bold">Choque de Oferta</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              threeMonthAnalysis.currentMonth.exchangeNetflowUsdMillions <= 0 
                                ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' 
                                : 'bg-gradient-to-r from-rose-500 to-amber-500'
                            }`}
                            style={{ 
                              width: `${Math.min(100, Math.max(20, Math.abs(threeMonthAnalysis.currentMonth.exchangeNetflowUsdMillions) / 15))}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300">
                      {threeMonthAnalysis.isOutflowAccelerating ? (
                        <span className="text-emerald-300 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Retirada para custódia fria acelerada em relação à média trimestral.
                        </span>
                      ) : (
                        <span className="text-slate-300 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          Fluxo mantém padrão consistente de retenção de moedas fora de corretoras.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metric 2: Active Addresses & New User Entries Comparison */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-cyan-500/30 transition">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                          <Activity className="w-3.5 h-3.5 text-cyan-400" />
                          Endereços Ativos Diários
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                          threeMonthAnalysis.activeDiffPct >= 0
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {threeMonthAnalysis.activeGrowthTrend}
                        </span>
                      </div>

                      <div className="space-y-2 mt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Média 3 Últimos Meses:</span>
                          <span className="font-mono font-bold text-slate-200">
                            {threeMonthAnalysis.avgActiveFormatted} / dia
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Mês Atual (Novas Entradas):</span>
                          <span className="font-mono font-bold text-cyan-300">
                            {threeMonthAnalysis.currentActiveFormatted} / dia
                          </span>
                        </div>
                      </div>

                      {/* Visual Addresses Momentum Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                          <span>Média 3M: {threeMonthAnalysis.avgActiveFormatted}</span>
                          <span className="text-cyan-300 font-bold">
                            {threeMonthAnalysis.activeDiffPct >= 0 ? `+${threeMonthAnalysis.activeDiffPct}%` : `${threeMonthAnalysis.activeDiffPct}%`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                            style={{ 
                              width: `${Math.min(100, Math.max(15, 50 + threeMonthAnalysis.activeDiffPct * 3))}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-300">
                      <span className="text-cyan-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        {threeMonthAnalysis.activeDiffPct >= 0
                          ? `Atividade de rede ${threeMonthAnalysis.activeDiffPct}% superior ao padrão trimestral.`
                          : `Volume de novos participantes em patamar estável de consolidação.`}
                      </span>
                    </div>
                  </div>

                  {/* Metric 3: Cross Synthesis & Absorption Ratio */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-emerald-500/30 transition md:col-span-2 lg:col-span-1">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Diagnóstico Cruzado On-Chain
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Score {onChainHistory.summary12m.currentOnChainHealthScore}/100
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
                        {threeMonthAnalysis.crossDiagnosis}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Fase de Ciclo 12M:</span>
                      <span className="font-bold text-emerald-400">
                        {onChainHistory.summary12m.cyclePhaseSummary}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Saúde do Ecossistema e suas Vertentes */}
        {activeTab === 'ecosystem_health' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header with Ecosystem Overview & Macro Pillars */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <HeartPulse className="w-4 h-4 text-emerald-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                      Índice Multissetorial de Saúde do Ecossistema (${ecosystemHealth.symbol})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Avaliação aprofundada da infraestrutura, finanças descentralizadas (DeFi), atividade de programadores, sustentabilidade econômica e vertentes operacionais.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status and Overall Score Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">Maturidade:</span>
                  <span className="text-xs font-mono font-bold text-cyan-300">
                    {ecosystemHealth.ecosystemMaturity}
                  </span>
                </div>
                <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
                  <span className="text-xs font-mono text-slate-300">Score Global:</span>
                  <span className="text-sm font-mono font-black text-emerald-300">
                    {ecosystemHealth.overallHealthScore}/100
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {ecosystemHealth.healthRating}
                  </span>
                </div>
              </div>
            </div>

            {/* Radar & Macro Dimensions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Radar Chart of Ecosystem Dimensions */}
              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-emerald-400" />
                    Radar de Força do Ecossistema
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Escala 0-100</span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart 
                      data={[
                        { subject: 'Descentralização', value: ecosystemHealth.networkDecentralizationScore, fullMark: 100 },
                        { subject: 'Dev Activity', value: ecosystemHealth.developerEcosystemScore, fullMark: 100 },
                        { subject: 'Sustentabilidade', value: ecosystemHealth.economicSustainabilityScore, fullMark: 100 },
                        { subject: 'DeFi & Liquidez', value: ecosystemHealth.branches[0]?.score || 90, fullMark: 100 },
                        { subject: 'Adoção Real', value: ecosystemHealth.branches[1]?.score || 88, fullMark: 100 },
                      ]}
                      margin={{ top: 10, right: 25, bottom: 10, left: 25 }}
                    >
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={false} />
                      <RechartsRadar 
                        name="Score Ecossistema" 
                        dataKey="value" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.4} 
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono text-[11px]">
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9.5px]">Descentralização</span>
                    <strong className="text-emerald-400 font-bold">{ecosystemHealth.networkDecentralizationScore}/100</strong>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9.5px]">Desenvolvedores</span>
                    <strong className="text-cyan-400 font-bold">{ecosystemHealth.developerEcosystemScore}/100</strong>
                  </div>
                  <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9.5px]">Sustentabilidade</span>
                    <strong className="text-amber-400 font-bold">{ecosystemHealth.economicSustainabilityScore}/100</strong>
                  </div>
                </div>
              </div>

              {/* Strengths & Vulnerabilities Breakdown */}
              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 flex flex-col justify-between space-y-3 lg:col-span-2">
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Principais Fortalezas Estruturais do Ecossistema
                  </h4>
                  <div className="space-y-2">
                    {ecosystemHealth.keyStrengths.map((st, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{st}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    Ponto de Monitoramento / Desafio
                  </h4>
                  {ecosystemHealth.vulnerabilities.map((v, i) => (
                    <div key={i} className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span>{v}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-emerald-950/40 via-slate-950 to-cyan-950/40 p-3 rounded-lg border border-emerald-500/30 text-xs font-sans text-slate-200">
                  <strong className="text-emerald-400 font-mono">Tese Fundamental do Ecossistema: </strong>
                  {ecosystemHealth.ecosystemThesis}
                </div>
              </div>
            </div>

            {/* Verticals / Branches Section Header & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 pt-2">
              <div>
                <h4 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <Network className="w-4 h-4 text-emerald-400" />
                  Métricas das Vertentes do Ecossistema (${selectedCrypto.symbol})
                </h4>
                <p className="text-xs text-slate-400">
                  Raio-x por setor tecnológico: finanças descentralizadas, escalabilidade, pagamentos e atividade de repositórios.
                </p>
              </div>

              {/* Filter by Category */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {['all', 'DeFi & TVL', 'Layer 2 & Scaling', 'NFTs & Gaming', 'Stablecoins & Payments', 'Developer Activity', 'Tokenomics & Staking', 'Infrastructure & Oracles', 'Governance & DAOs'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedBranchCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex-shrink-0 border ${
                      selectedBranchCategory === cat
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'Todas as Vertentes' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Branch Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ecosystemHealth.branches
                .filter((b) => selectedBranchCategory === 'all' || b.category === selectedBranchCategory)
                .map((branch) => {
                  const isPositive = branch.momentum7d >= 0;
                  return (
                    <div
                      key={branch.id}
                      className="bg-slate-900/90 rounded-xl p-4 border border-slate-800/90 hover:border-emerald-500/40 transition space-y-3 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                              {branch.category}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              branch.status === 'EXCELENTE'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : branch.status === 'FORTE'
                                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              {branch.status}
                            </span>
                          </div>
                          <h4 className="text-sm font-mono font-bold text-white mt-1.5">
                            {branch.name}
                          </h4>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-mono font-black text-emerald-400 block">
                            {branch.score}/100
                          </span>
                          <span className={`text-[10px] font-mono font-bold flex items-center justify-end gap-0.5 ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {isPositive ? '+' : ''}{branch.momentum7d}% 7d
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/70">
                        <span className="text-[10px] font-mono text-slate-400 block">Métrica Principal da Vertente:</span>
                        <span className="text-sm font-mono font-bold text-cyan-300 block mt-0.5">
                          {branch.valueFormatted}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-slate-950/50 p-2 rounded border border-slate-800/50">
                          <span className="text-slate-400 text-[10px] block">{branch.subMetric1.label}:</span>
                          <span className="text-white font-bold text-[11px] block truncate" title={branch.subMetric1.value}>
                            {branch.subMetric1.value}
                          </span>
                        </div>
                        <div className="bg-slate-950/50 p-2 rounded border border-slate-800/50">
                          <span className="text-slate-400 text-[10px] block">{branch.subMetric2.label}:</span>
                          <span className="text-white font-bold text-[11px] block truncate" title={branch.subMetric2.value}>
                            {branch.subMetric2.value}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 font-sans leading-relaxed pt-1 border-t border-slate-800/60">
                        {branch.summary}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 2: Netflow Specific Chart */}
        {activeTab === 'netflow' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Fluxo Líquido Mensal em Corretoras (Exchange Netflow em US$ Milhões)
                </h3>
                <p className="text-xs text-slate-400">
                  Valores negativos representam moedas retiradas de exchanges para carteiras frias (choque de oferta).
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-emerald-300">
                Acumulado 12M: {onChainHistory.summary12m.totalNetflow12mUsd.split(' ')[0]}
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={onChainHistory.twelveMonthsData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="shortLabel" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${v}M`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#10b981',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`$${val}M`, 'Netflow Mensal']}
                  />
                  <Bar dataKey="exchangeNetflowUsdMillions" name="Netflow em CEXs (US$ M)">
                    {onChainHistory.twelveMonthsData.map((entry, index) => (
                      <Cell 
                        key={`cell-nf-${index}`} 
                        fill={entry.exchangeNetflowUsdMillions <= 0 ? '#10b981' : '#f43f5e'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 3: MVRV Ratio & Cycle Health Chart */}
        {activeTab === 'mvrv' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  MVRV Ratio & Correlação com Preço Médio Spot (12 Meses)
                </h3>
                <p className="text-xs text-slate-400">
                  MVRV &lt; 1.3: Subvalorizado | 1.3 - 2.2: Zona Saudável de Acúmulo/Expansão | &gt; 3.0: Zona de Topo
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-amber-300">
                MVRV Atual: {latestMonth?.mvrvRatio} ({latestMonth?.mvrvZone})
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={onChainHistory.twelveMonthsData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="shortLabel" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis yAxisId="mvrv" stroke="#f59e0b" tick={{ fill: '#f59e0b', fontSize: 11 }} domain={[0.8, 3.2]} />
                  <YAxis yAxisId="price" orientation="right" stroke="#3b82f6" tick={{ fill: '#3b82f6', fontSize: 11 }} tickFormatter={(p) => `$${p >= 1000 ? `${(p/1000).toFixed(0)}k` : p}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#f59e0b',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line yAxisId="mvrv" type="monotone" dataKey="mvrvRatio" name="MVRV Ratio" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 4 }} />
                  <Line yAxisId="price" type="monotone" dataKey="avgPriceUsd" name="Preço Spot Médio (US$)" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 4: Whales Supply & On-Chain Score Chart */}
        {activeTab === 'whales' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Supply Retido por Carteiras Baleia (%) & Score On-Chain (0-100)
                </h3>
                <p className="text-xs text-slate-400">
                  Acompanha a retenção por grandes investidores e a robustez geral da blockchain nos últimos 12 meses.
                </p>
              </div>
              <div className="text-xs font-mono font-bold text-indigo-300">
                Supply Baleias: {latestMonth?.whaleSupplyHeldPct}% (+{latestMonth?.whaleSupplyChangeMoM}%)
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={onChainHistory.twelveMonthsData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="whaleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="shortLabel" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[20, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#6366f1',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="onChainScore" name="Score On-Chain (0-100)" stroke="#10b981" fillOpacity={1} fill="url(#scoreGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="whaleSupplyHeldPct" name="Supply em Baleias (%)" stroke="#6366f1" fillOpacity={1} fill="url(#whaleGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab: Relatório COT (Commitment of Traders - CFTC) */}
        {activeTab === 'cot_report' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header / Intro */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-amber-400" />
                  Relatório COT (Commitment of Traders - CFTC): {cotReportData.assetCategory}
                </h3>
                <p className="text-xs text-slate-400">
                  Desagrega o posicionamento de grandes fundos institucionais (Hedge Funds / Asset Managers) e Produtores / Mineradores no mercado de derivativos regulado.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                  cotReportData.netInstitutionalBias === 'BULLISH'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : cotReportData.netInstitutionalBias === 'LEVEMENTE_BULLISH'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : cotReportData.netInstitutionalBias === 'NEUTRO'
                    ? 'bg-slate-700/40 text-slate-300 border-slate-600/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  Viés: {cotReportData.institutionalBiasText}
                </span>
              </div>
            </div>

            {/* COT Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Metric 1: Non-Commercial Net Position */}
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Grandes Especuladores (Net)</span>
                  <span className="text-amber-400 font-bold">CFTC</span>
                </div>
                <div className="text-lg font-mono font-black text-white flex items-center gap-2">
                  <span className={cotReportData.nonCommercialNetPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {cotReportData.nonCommercialNetPosition >= 0 ? '+' : ''}{cotReportData.nonCommercialNetPosition.toLocaleString('en-US')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">contratos</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  Longs: <strong className="text-emerald-400">{cotReportData.nonCommercialLongs.toLocaleString('en-US')}</strong> • Shorts: <strong className="text-rose-400">{cotReportData.nonCommercialShorts.toLocaleString('en-US')}</strong>
                </p>
              </div>

              {/* Metric 2: Leveraged Funds Allocation */}
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Hedge Funds Alavancados</span>
                  <span className="text-cyan-400 font-bold">Long / Short</span>
                </div>
                <div className="text-lg font-mono font-black text-cyan-300 flex items-center gap-2">
                  <span>{cotReportData.leveragedFundsLongPct}% Long</span>
                  <span className="text-[10px] text-slate-400 font-normal">vs {100 - cotReportData.leveragedFundsLongPct}% Short</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                  <div className="bg-emerald-400 h-full" style={{ width: `${cotReportData.leveragedFundsLongPct}%` }} />
                  <div className="bg-rose-400 h-full" style={{ width: `${100 - cotReportData.leveragedFundsLongPct}%` }} />
                </div>
              </div>

              {/* Metric 3: Weekly Contract Delta */}
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Variação Semanal Líquida</span>
                  <span className="text-indigo-400 font-bold">Delta</span>
                </div>
                <div className={`text-lg font-mono font-black ${cotReportData.weeklyChangeContracts >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {cotReportData.weeklyChangeContracts >= 0 ? '+' : ''}{cotReportData.weeklyChangeContracts.toLocaleString('en-US')} contratos
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  {cotReportData.weeklyChangeContracts >= 0 ? 'Aumento de posições compradoras institucionais' : 'Redução de exposição comprada / hedge'}
                </p>
              </div>

              {/* Metric 4: Commercial Hedgers */}
              <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>Comerciais (Mineradores/Hedge)</span>
                  <span className="text-slate-400 font-bold">Hedgers</span>
                </div>
                <div className="text-lg font-mono font-black text-amber-300">
                  {cotReportData.commercialShorts.toLocaleString('en-US')} Shorts
                </div>
                <p className="text-[10px] text-slate-300 leading-tight">
                  Longs: {cotReportData.commercialLongs.toLocaleString('en-US')} (Travamento de custos e produção)
                </p>
              </div>
            </div>

            {/* COT Visual Bar Chart Comparison */}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                  Distribuição de Contratos por Categoria de Participante (CFTC Breakdown)
                </h4>
                <span className="text-[10px] font-mono text-slate-400">{cotReportData.reportDate}</span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        category: 'Fundos & Especuladores (Non-Comm)',
                        Comprados: cotReportData.nonCommercialLongs,
                        Vendidos: cotReportData.nonCommercialShorts,
                      },
                      {
                        category: 'Comerciais / Mineradores (Hedge)',
                        Comprados: cotReportData.commercialLongs,
                        Vendidos: cotReportData.commercialShorts,
                      },
                      {
                        category: 'Dealers & Formadores de Mercado',
                        Comprados: Math.round(cotReportData.nonCommercialLongs * 0.42),
                        Vendidos: Math.round(cotReportData.nonCommercialShorts * 0.38),
                      },
                    ]}
                    margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="category" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: '#f59e0b',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                      formatter={(val: any, name: any) => [`${Number(val).toLocaleString('en-US')} contratos`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                    <Bar dataKey="Comprados" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Vendidos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Diagnosis Box on COT */}
            <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900/90 rounded-xl p-4 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <h4 className="text-xs font-mono font-bold text-amber-300 uppercase">
                  Diagnóstico Institucional CFTC (Motor Gemini AI)
                </h4>
              </div>
              <p className="text-xs text-slate-200 font-sans leading-relaxed">
                {cotReportData.keyTakeaway}
              </p>
            </div>
          </div>
        )}

        {/* Tab: Rastreadores On-Chain (Para Criptomoedas) */}
        {activeTab === 'onchain_trackers' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                  <Radar className="w-4 h-4 text-cyan-400" />
                  Rastreadores On-Chain (Baleias, ETFs, Mineradores & Cold Wallets)
                </h3>
                <p className="text-xs text-slate-400">
                  Monitoramento em tempo real de fluxos e saldos nas maiores carteiras e entidades institucionais para ${selectedCrypto.symbol}.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {['all', 'ETF Custody', 'Exchange Cold Wallet', 'Whale Cluster', 'Smart Money Fund', 'Miner Pool', 'Protocol Bridge'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setTrackerFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex-shrink-0 border ${
                      trackerFilter === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'Todos os Rastreadores' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Trackers List Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTrackers.map((tracker) => {
                const isOut = tracker.flowDirection === 'outflow';
                const isIn = tracker.flowDirection === 'inflow';
                return (
                  <div
                    key={tracker.id}
                    className="bg-slate-900/90 rounded-xl p-4 border border-slate-800/90 hover:border-cyan-500/40 transition space-y-3 shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {tracker.category}
                        </span>
                        <h4 className="text-sm font-mono font-bold text-white mt-1.5 flex items-center gap-1.5">
                          {tracker.name}
                        </h4>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>{tracker.addressOrLabel}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex-shrink-0 ${
                        tracker.signal === 'Acúmulo Institucional'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : tracker.signal === 'HODL Estável'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}>
                        {tracker.signal}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-xs font-mono">
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">Saldo em Custódia:</span>
                        <span className="text-white font-bold text-sm block">{tracker.holdingsFormatted}</span>
                        <span className="text-slate-400 text-[10px]">Valor: {tracker.holdingsValueUsd}</span>
                      </div>

                      <div className="bg-slate-950/60 p-2 rounded border border-slate-800/60">
                        <span className="text-slate-400 text-[10px] block">Fluxo Líquido 7D:</span>
                        <span className={`font-bold text-sm block ${isIn ? 'text-emerald-400' : isOut ? 'text-cyan-300' : 'text-slate-300'}`}>
                          {tracker.flow7dUsd}
                        </span>
                        <span className="text-slate-400 text-[10px]">Última mov: {tracker.lastActivityTime}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 5: Complete 12-Month Table */}
        {activeTab === 'table' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                Tabela Histórica Detalhada dos Últimos 12 Meses (${onChainHistory.symbol})
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Clique em uma linha para ver o detalhe do mês
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-800 custom-scrollbar">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-300 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Mês / Ano</th>
                    <th className="py-2.5 px-3">Preço Médio</th>
                    <th className="py-2.5 px-3">Endereços Ativos</th>
                    <th className="py-2.5 px-3">Netflow CEXs</th>
                    <th className="py-2.5 px-3">Baleias %</th>
                    <th className="py-2.5 px-3">MVRV Ratio</th>
                    <th className="py-2.5 px-3">Score On-Chain</th>
                    <th className="py-2.5 px-3">Evento On-Chain Marcante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {onChainHistory.twelveMonthsData.map((m, idx) => {
                    const isSelected = selectedMonth?.monthKey === m.monthKey;
                    const isLatest = idx === onChainHistory.twelveMonthsData.length - 1;
                    return (
                      <tr
                        key={m.monthKey}
                        onClick={() => setSelectedMonth(m)}
                        className={`cursor-pointer transition hover:bg-slate-800/70 ${
                          isSelected ? 'bg-emerald-950/40 border-l-2 border-emerald-400' : isLatest ? 'bg-slate-900/40' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-bold flex items-center gap-1.5 text-white">
                          <span>{m.monthLabel}</span>
                          {isLatest && (
                            <span className="px-1.5 py-0.2 rounded text-[8.5px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Atual
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-blue-300 font-bold">
                          ${m.avgPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-cyan-300">
                          {m.activeAddressesFormatted}{' '}
                          <span className={`text-[9.5px] ${m.activeAddressesChangeMoM >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ({m.activeAddressesChangeMoM >= 0 ? '+' : ''}{m.activeAddressesChangeMoM}%)
                          </span>
                        </td>
                        <td className={`py-2 px-3 font-bold ${m.exchangeNetflowUsdMillions <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.exchangeNetflowFormatted}
                        </td>
                        <td className="py-2 px-3 text-indigo-300">
                          {m.whaleSupplyHeldPct}%
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {m.mvrvRatio} ({m.mvrvZone})
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border ${
                            m.onChainScore >= 85 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                              : m.onChainScore >= 75
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {m.onChainScore}/100
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-sans text-[11px] max-w-xs truncate" title={m.keyEvent}>
                          {m.keyEvent}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Selected Month Deep-Dive Inspector (when user clicks on a month) */}
      {selectedMonth && (
        <div className="bg-gradient-to-br from-emerald-950/50 via-slate-950 to-slate-900 rounded-xl p-4 border border-emerald-500/40 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-mono font-bold text-white">
                Raio-X On-Chain: <span className="text-emerald-300">{selectedMonth.monthLabel}</span> (${onChainHistory.symbol})
              </h4>
            </div>
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-xs text-slate-400 hover:text-white font-mono px-2 py-0.5 rounded bg-slate-800"
            >
              Fechar
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px]">Preço Médio Spot:</div>
              <div className="text-blue-300 font-bold text-sm">${selectedMonth.avgPriceUsd.toLocaleString('en-US')}</div>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px]">Endereços Ativos Diários:</div>
              <div className="text-cyan-300 font-bold text-sm">{selectedMonth.activeAddressesFormatted} ({selectedMonth.activeAddressesChangeMoM >= 0 ? '+' : ''}{selectedMonth.activeAddressesChangeMoM}%)</div>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px]">Netflow CEXs:</div>
              <div className={`font-bold text-sm ${selectedMonth.exchangeNetflowUsdMillions <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedMonth.exchangeNetflowFormatted}
              </div>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <div className="text-slate-400 text-[10px]">MVRV & Score:</div>
              <div className="text-amber-300 font-bold text-sm">{selectedMonth.mvrvRatio} • Score {selectedMonth.onChainScore}/100</div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-900/90 border border-emerald-500/20 text-xs font-sans text-slate-200">
            <strong className="text-emerald-400 font-mono">Evento On-Chain do Mês:</strong> {selectedMonth.keyEvent}
          </div>
        </div>
      )}

      {/* AI Retrospective 12-Month Synthesis Box */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 via-slate-950 to-cyan-950/60 border border-emerald-500/30 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-emerald-200 uppercase tracking-wider">
              Diagnóstico Estrutural de 12 Meses (Motor Gemini AI)
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            {onChainHistory.summary12m.cyclePhaseSummary}
          </span>
        </div>

        <p className="text-xs text-slate-200 font-sans leading-relaxed">
          {onChainHistory.summary12m.keyTakeaway12m}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] font-mono text-slate-300">
          <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
            <strong className="text-emerald-400">Choque de Oferta:</strong> {onChainHistory.summary12m.totalNetflow12mUsd.split(' ')[0]} retirados de CEXs.
          </div>
          <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
            <strong className="text-cyan-400">Adesão Orgânica:</strong> {onChainHistory.summary12m.activeAddressesGrowth12m}.
          </div>
          <div className="bg-slate-900/70 p-2 rounded border border-slate-800">
            <strong className="text-amber-400">Zona de Ciclo:</strong> MVRV médio de {onChainHistory.summary12m.averageMvrv12m} com score {onChainHistory.summary12m.currentOnChainHealthScore}/100.
          </div>
        </div>
      </div>

    </section>
  );
};
