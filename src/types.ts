export type SentimentType = 'bullish' | 'bearish' | 'neutral' | 'fomo' | 'fud';

export type ForumSourceId = 
  | 'binance' 
  | 'etoro' 
  | 'tradingview' 
  | 'reddit' 
  | 'bitcointalk' 
  | 'coinmarketcap' 
  | 'bybit' 
  | 'telegram';

export interface ForumSource {
  id: ForumSourceId;
  name: string;
  iconName: string;
  category: 'Corretora' | 'Comunidade' | 'Análise Técnica' | 'Sinais/Chat';
  color: string;
  verifiedCount: number;
}

export interface DivergenceBadge {
  badgeTitle: string;
  levelText: string;
  priceRealDelta: string;
  fundamentalScoreText: string;
  sentimentScoreText: string;
  statusTheme: 'emerald' | 'amber' | 'blue' | 'rose' | 'purple';
  explanation: string;
}

export interface TechnicalIndicatorsSummary {
  consensusVerdict: 'COMPRA FORTE' | 'COMPRA' | 'NEUTRO / ACÚMULO' | 'VENDA' | 'VENDA FORTE';
  bullishIndicatorsCount: number; // e.g. 8
  totalIndicatorsCount: number; // e.g. 10
  rsi14: {
    value: number;
    status: 'sobrecompra' | 'alta' | 'neutro' | 'sobrevenda';
    label: string;
  };
  macd: {
    value: string;
    histogramState: 'positivo' | 'negativo' | 'cruzando_alta';
    label: string;
  };
  emaAlignment: {
    status: 'alta_perfeita' | 'acima_200' | 'neutro' | 'abaixo_200';
    label: string;
  };
  bollingerBands: {
    position: 'expansao_alta' | 'meio' | 'teste_suporte' | 'compressao';
    label: string;
  };
  orderBookRatio: {
    buyRatio: number; // e.g. 64%
    sellRatio: number; // e.g. 36%
    label: string;
  };
}

export interface OnChainPillarSummary {
  score: number; // 0-100
  scoreLabel: string; // e.g. 'Forte Acúmulo Institucional', 'Inflow Positivo'
  activeAddresses: string; // e.g. '1.08M (+6.8%)'
  exchangeNetflow: string; // e.g. '-$210M (Saída Líquida/HODL)'
  whaleAccumulation: string; // e.g. '+4.1% carteiras > 1k BTC'
  networkHealthMetric: string; // e.g. 'Hashrate 740 EH/s' or 'TVL $8.9B (+14.2%)'
  mvrvRatio?: string; // e.g. '1.84 (Zona Saudável)'
  analysisSummary: string; // e.g. 'Fluxo líquido negativo em exchanges indica forte absorção de oferta e baixa pressão vendedora.'
  cotReportSummary?: string;
  onChainTrackersSummary?: string;
}

export interface CotReportData {
  reportDate: string; // e.g. 'Terça-feira (Divulgação CFTC)'
  assetCategory: string; // e.g. 'CME Bitcoin Futures & Micro-Futures'
  nonCommercialLongs: number; // Contratos Long de Grandes Especuladores / Fundos
  nonCommercialShorts: number; // Contratos Short
  nonCommercialNetPosition: number; // Longs - Shorts
  commercialLongs: number; // Produtores / Mineradores / Hedgers
  commercialShorts: number;
  leveragedFundsLongPct: number; // % alocação comprada de Hedge Funds
  dealerIntermediaryPct: number; // % market makers / dealers
  netInstitutionalBias: 'BULLISH' | 'LEVEMENTE_BULLISH' | 'NEUTRO' | 'BEARISH';
  institutionalBiasText: string;
  weeklyChangeContracts: number; // Variação líquida na semana
  keyTakeaway: string;
}

export interface EcosystemBranchMetric {
  id: string;
  name: string;
  category: 'DeFi & TVL' | 'Layer 2 & Scaling' | 'NFTs & Gaming' | 'Stablecoins & Payments' | 'Developer Activity' | 'Tokenomics & Staking' | 'Infrastructure & Oracles' | 'Governance & DAOs';
  score: number; // 0-100
  status: 'EXCELENTE' | 'FORTE' | 'MODERADO' | 'ATENÇÃO' | 'EM_DESENVOLVIMENTO';
  valueFormatted: string; // e.g. '$8.9B TVL (+14% 7d)'
  subMetric1: { label: string; value: string };
  subMetric2: { label: string; value: string };
  momentum7d: number; // % variation
  summary: string;
}

export interface EcosystemHealthData {
  symbol: string;
  name: string;
  overallHealthScore: number; // 0-100
  healthRating: 'SAÚDE EXCEPCIONAL' | 'ECOSSISTEMA ROBUSTO' | 'EXPANSÃO EQUILIBRADA' | 'FASE DE CONSOLIDAÇÃO' | 'ALERTA DE RETRAÇÃO';
  ecosystemMaturity: 'Geração L1 Estabelecida' | 'Supercadeia / Multi-Rollup' | 'Hub DeFi de Alta Velocidade' | 'Ecossistema em Aceleração';
  networkDecentralizationScore: number; // 0-100
  developerEcosystemScore: number; // 0-100
  economicSustainabilityScore: number; // 0-100
  branches: EcosystemBranchMetric[];
  keyStrengths: string[];
  vulnerabilities: string[];
  ecosystemThesis: string;
}

export interface OnChainTrackerEntity {
  id: string;
  category: 'Exchange Cold Wallet' | 'Miner Pool' | 'ETF Custody' | 'Whale Cluster' | 'Smart Money Fund' | 'Protocol Bridge';
  name: string;
  addressOrLabel: string;
  holdingsFormatted: string; // e.g. '184,200 BTC'
  holdingsValueUsd: string; // e.g. '$12.7B'
  flow7dUsd: string; // e.g. '+$340M (Inflow/Acúmulo)' ou '-$120M'
  flowDirection: 'inflow' | 'outflow' | 'neutral';
  signal: 'Acúmulo Institucional' | 'HODL Estável' | 'Distribuição / Venda' | 'Transf. Interna';
  lastActivityTime: string;
}

export interface OnChainDimensionAnalysis {
  dimensionKey: 'overview_12m' | 'ecosystem_health' | 'cot_report' | 'onchain_trackers' | 'exchange_netflow' | 'mvrv_cycle' | 'whales_network_score';
  title: string;
  subtitle: string;
  iconName: string;
  score: number; // 0 - 100
  signal: 'FORTE_COMPRA' | 'COMPRA' | 'NEUTRO' | 'VENDA' | 'FORTE_VENDA';
  signalLabel: string; // e.g. 'Forte Sinal de Compra', 'Acúmulo Institucional'
  weightPct: number; // e.g. 15%
  metricPrimary: { label: string; value: string };
  metricSecondary: { label: string; value: string };
  keyDiagnostic: string;
  riskAssessment: string;
}

export interface AIOnChainMasterVerdict {
  symbol: string;
  name: string;
  overallScore: number; // 0 - 100
  consensusSignal: 'FORTE COMPRA' | 'COMPRA' | 'NEUTRO / ACÚMULO' | 'VENDA' | 'FORTE VENDA';
  confidencePct: number; // e.g. 88%
  macroCyclePhase: string; // e.g. 'Fase de Acúmulo Institucional & Absorção em Baixa'
  onChainSummary: string;
  dimensions: OnChainDimensionAnalysis[];
  buySignalsCount: number;
  neutralSignalsCount: number;
  sellSignalsCount: number;
  bullishPillars: string[];
  bearishRisks: string[];
  executionStrategy: {
    idealAccumulationZone: string;
    onChainInvalidationPrice: string;
    longTermCycleTarget: string;
    recommendedHoldingPeriod: string;
    institutionalConviction: 'MÉDIA' | 'ALTA' | 'EXTREMA';
  };
}

export interface OnChainHistoricalMonth {
  monthKey: string; // e.g. '2025-08'
  monthLabel: string; // e.g. 'Agosto 2025'
  shortLabel: string; // e.g. 'Ago/25'
  avgPriceUsd: number;
  activeAddressesDailyAvg: number; // in thousands or raw count
  activeAddressesFormatted: string; // '1.02M'
  activeAddressesChangeMoM: number; // % e.g. +4.5
  exchangeNetflowUsdMillions: number; // negative = net outflow (HODL), positive = inflow (sell)
  exchangeNetflowFormatted: string; // '-$420M'
  whaleSupplyHeldPct: number; // e.g. 41.8%
  whaleSupplyChangeMoM: number; // e.g. +0.8%
  mvrvRatio: number; // e.g. 1.75
  mvrvZone: 'Subvalorizado' | 'Acúmulo Saudável' | 'Expansão' | 'Aquecimento' | 'Euforia / Topo';
  tvlOrHashrateMetric: string; // e.g. '680 EH/s' or '$7.2B TVL'
  nvtRatio: number; // e.g. 45.2
  onChainScore: number; // 0-100
  keyEvent: string; // e.g. 'Aceleração de saídas institucionais para custódia fria'
}

export interface OnChainHistoryData {
  symbol: string;
  name: string;
  twelveMonthsData: OnChainHistoricalMonth[];
  summary12m: {
    totalNetflow12mUsd: string;
    activeAddressesGrowth12m: string;
    whaleHoldingTrend: string;
    averageMvrv12m: number;
    currentOnChainHealthScore: number;
    cyclePhaseSummary: string;
    keyTakeaway12m: string;
  };
}

export interface AiCrossAnalysis {
  sentimentPillar: {
    scoreText: string;
    socialVolume: string;
    communityVibe: string;
  };
  fundamentalPillar: {
    onChainHealth: string;
    networkAdoption: string;
    fundamentalScore: number; // 0-100
    catalystsSummary: string;
  };
  technicalPillar?: TechnicalIndicatorsSummary;
  onChainPillar?: OnChainPillarSummary;
  realMarketPillar: {
    priceUsdFormatted: string;
    volume24h: string;
    technicalStructure: string;
    liquidityStatus: string;
  };
  divergenceBadge?: DivergenceBadge;
  aiCrossVerdict: {
    alignmentType: 'ALINHAMENTO_BULLISH' | 'DIVERGENCIA_ACUMULACAO' | 'FOMO_SEM_FUNDAMENTO' | 'CORRECAO_SAUDAVEL';
    statusTitle: string;
    detailedDiagnosis: string;
    confidenceRating: number;
  };
}

export interface CryptoMention {
  id: string;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  mentions24h: number;
  mentionsChange24h: number; // percentage change, e.g. +85%
  sentimentScore: number; // -100 (Extremely Bearish) to +100 (Extremely Bullish)
  bullishPercent: number;
  bearishPercent: number;
  neutralPercent: number;
  topForum: ForumSourceId;
  signal: 'alta_forte' | 'alta_moderada' | 'neutro' | 'baixa_moderada' | 'baixa_forte' | 'fomo_alerta';
  predictedDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  predictedChangeRange: string; // e.g. "+5% a +12%"
  predictionConfidence: number; // 0 to 100
  keyCatalyst: string;
  sparklineData: number[];
  priceBrl?: number;
  volume24hUsd?: number;
  isRealMarketLive?: boolean;
  lastMarketUpdate?: string;
  aiAnalysis?: AiCrossAnalysis;
}

export interface ForumPost {
  id: string;
  sourceId: ForumSourceId;
  author: string;
  authorBadge?: string;
  authorReliability: number; // e.g. 92%
  timestamp: string;
  title: string;
  content: string;
  coinsMentioned: string[];
  sentiment: SentimentType;
  sentimentScore: number;
  likes: number;
  replies: number;
  aiSummary: string;
  perceivedMovement: 'UP' | 'DOWN' | 'ACCUMULATION' | 'BREAKOUT';
  url?: string;
}

export interface MarketSentimentOverview {
  fearAndGreedIndex: number; // 0-100
  fearAndGreedLabel: 'Medo Extremo' | 'Medo' | 'Neutro' | 'Otimismo' | 'Euforia/FOMO';
  overallBullishPercent: number;
  overallBearishPercent: number;
  totalPostsAnalyzed24h: number;
  dominantTopic: string;
  topSurgingCoin: string;
  sentimentVelocity: 'Acelerando Alta' | 'Estável' | 'Pânico/Queda' | 'Divergência Bullish';
  trendingKeywords: { text: string; count: number; sentiment: SentimentType }[];
}

export interface CryptoPatternItem {
  rank: number;
  symbol: string;
  name: string;
  priceUsd: number;
  priceBrl?: number;
  change24h: number;
  patternName: string;
  patternType: 'bullish' | 'bearish' | 'fomo' | 'accumulation' | 'divergence';
  patternConfidence: number;
  timeframe: string;
  targetPriceRange: string;
  forumSignal: string;
  patternDescription: string;
  tacticalAction: string;
  isRealMarketLive?: boolean;
  lastMarketUpdate?: string;
  divergenceState?: string;
}

export interface PatternScanResult {
  scanTimestamp: string;
  totalAnalysedPosts: number;
  top5Patterns: CryptoPatternItem[];
  aiMarketSummary: string;
}

export interface AIPredictionReport {
  symbol: string;
  coinName: string;
  timestamp: string;
  overallScore: number; // -100 to +100
  prediction: {
    direction: 'ALTA' | 'BAIXA' | 'LATERAL';
    horizon: '12h' | '24h' | '3-7 dias';
    expectedMovePercentage: string;
    targetPriceRange: string;
    confidenceLevel: number; // %
    riskLevel: 'Baixo' | 'Médio' | 'Alto' | 'Extremo';
  };
  sentimentSummary: string;
  bullishDrivers: string[];
  bearishRisks: string[];
  forumBreakdown: {
    sourceName: string;
    sentiment: string;
    postVolume: string;
    keyQuote: string;
  }[];
  technicalSentimentAlignment: string;
  traderRecommendation: string;
}

export interface AnalyzeCustomTextInput {
  text: string;
  sourceName?: string;
}

export interface FilterState {
  source: string; // 'all' or specific sourceId
  coin: string; // 'all' or specific symbol
  sentiment: string; // 'all' or sentiment type
  timeframe: '1h' | '6h' | '24h' | '7d';
  searchQuery: string;
  sortBy: 'mentions' | 'sentiment' | 'change' | 'confidence';
}
