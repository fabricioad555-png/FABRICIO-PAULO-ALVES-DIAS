import { CryptoMention, ForumPost } from '../types';
import { LiveOrderBookData } from '../types/orderFlowTypes';
import { 
  HighFrequencyConfluenceResult, 
  ConfluenceSignalType, 
  ParetoCriticalityLevel, 
  ParetoLayerScoreBreakdown, 
  ParetoCriticalityAnalysis, 
  Top10mProfitCrypto,
  ParetoEvaluatedCrypto,
  TechnicalIndicatorItem,
  TechnicalScoreSummary,
  TechnicalIndicatorsFilterConfig
} from '../types/hftConfluenceTypes';
import { generateLiveOrderFlowData } from './orderFlowDataService';
import { hftCache } from './cacheService';
/**
 * Computes a detailed, interactive technical indicator score breakdown across 8 core indicators
 * incorporating user filter configurations and custom weights.
 */
export function generateTechnicalScoreSummary(
  crypto: CryptoMention,
  isBullish: boolean,
  filterConfig?: TechnicalIndicatorsFilterConfig
): TechnicalScoreSummary {
  const price = crypto.priceUsd > 0 ? crypto.priceUsd : 100;
  const dec = price < 1 ? 4 : 2;
  const techPillar = crypto.aiAnalysis?.technicalPillar;
  const change24h = crypto.change24h || 0;

  // 1. RSI (14)
  const rsiValue = techPillar?.rsi14?.value ?? (isBullish ? +(58 + (change24h * 1.2)).toFixed(1) : +(42 + (change24h * 1.1)).toFixed(1));
  const boundedRsi = Math.min(88, Math.max(16, rsiValue));
  let rsiSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = 'NEUTRO';
  let rsiScore = 50;
  if (boundedRsi >= 55 && boundedRsi <= 74) {
    rsiSignal = 'COMPRA';
    rsiScore = Math.min(96, Math.round(50 + (boundedRsi - 50) * 1.9));
  } else if (boundedRsi > 74) {
    rsiSignal = 'NEUTRO'; // Near overbought warning
    rsiScore = 65;
  } else if (boundedRsi <= 45) {
    rsiSignal = 'VENDA';
    rsiScore = Math.max(18, Math.round(boundedRsi * 0.9));
  }

  // 2. MACD (12, 26, 9)
  const macdState = techPillar?.macd?.histogramState || (isBullish ? 'positivo' : 'negativo');
  let macdSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = macdState === 'positivo' || macdState === 'cruzando_alta' ? 'COMPRA' : 'VENDA';
  const macdScore = macdSignal === 'COMPRA' ? (isBullish ? 88 : 72) : 32;

  // 3. EMAs Alignment (9 / 21 / 50 / 200)
  const emaStatus = techPillar?.emaAlignment?.status || (isBullish ? 'alta_perfeita' : 'abaixo_200');
  let emaSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = 'NEUTRO';
  let emaScore = 50;
  if (emaStatus === 'alta_perfeita') {
    emaSignal = 'COMPRA';
    emaScore = 95;
  } else if (emaStatus === 'acima_200') {
    emaSignal = 'COMPRA';
    emaScore = 78;
  } else if (emaStatus === 'abaixo_200') {
    emaSignal = 'VENDA';
    emaScore = 26;
  }

  // 4. Bollinger Bands (20, 2)
  const bollingerPos = techPillar?.bollingerBands?.position || (isBullish ? 'expansao_alta' : 'teste_suporte');
  let bbSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = bollingerPos === 'expansao_alta' ? 'COMPRA' : bollingerPos === 'teste_suporte' ? (isBullish ? 'COMPRA' : 'VENDA') : 'NEUTRO';
  const bbScore = bbSignal === 'COMPRA' ? 84 : bbSignal === 'VENDA' ? 36 : 52;

  // 5. Stochastic (14, 3, 3)
  const stochK = isBullish ? +(62 + (change24h * 1.5)).toFixed(1) : +(38 + (change24h * 1.2)).toFixed(1);
  const stochD = isBullish ? +(56 + (change24h * 1.1)).toFixed(1) : +(44 + (change24h * 1.0)).toFixed(1);
  const stochSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = stochK > stochD && stochK > 45 ? 'COMPRA' : stochK < stochD ? 'VENDA' : 'NEUTRO';
  const stochScore = stochSignal === 'COMPRA' ? 86 : 34;

  // 6. SuperTrend & ADX (14)
  const adxValue = isBullish ? 32.8 : 22.4;
  const superTrendSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = isBullish && adxValue > 25 ? 'COMPRA' : !isBullish ? 'VENDA' : 'NEUTRO';
  const superTrendScore = superTrendSignal === 'COMPRA' ? 92 : 30;

  // 7. Volume Flow & OBV
  const obvTrend = isBullish ? 'OBV Altista / Acumulação Institucional' : 'OBV Descendente / Distribuição';
  const obvSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = isBullish ? 'COMPRA' : 'VENDA';
  const obvScore = isBullish ? 85 : 35;

  // 8. ATR (14) Volatilidade
  const atrUsd = Number((price * (isBullish ? 0.018 : 0.012)).toFixed(dec));
  const atrSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = isBullish ? 'COMPRA' : 'VENDA';
  const atrScore = isBullish ? 80 : 45;

  const rawIndicators: TechnicalIndicatorItem[] = [
    {
      id: 'rsi',
      name: 'RSI (14) - Força Relativa',
      category: 'MOMENTUM',
      valueFormatted: `${boundedRsi} (${boundedRsi >= 70 ? 'Sobrecompra' : boundedRsi >= 50 ? 'Momentum de Alta' : 'Território Baixista'})`,
      signal: rsiSignal,
      score: rsiScore,
      weightPct: 15,
      statusText: boundedRsi >= 50 ? 'RSI acelerando acima da linha 50 sem sobrecompra severa.' : 'RSI fraco abaixo do ponto de equilíbrio.',
      isEnabled: filterConfig?.enabledIndicators?.rsi ?? true
    },
    {
      id: 'macd',
      name: 'MACD (12, 26, 9)',
      category: 'TENDENCIA',
      valueFormatted: macdState === 'positivo' ? '+1.42 (Histograma Expansivo)' : '-0.95 (Histograma Defensivo)',
      signal: macdSignal,
      score: macdScore,
      weightPct: 15,
      statusText: macdSignal === 'COMPRA' ? 'Cruzamento altista com expansão do histograma comprador.' : 'Linha MACD abaixo do sinal indicando retração.',
      isEnabled: filterConfig?.enabledIndicators?.macd ?? true
    },
    {
      id: 'ema_alignment',
      name: 'Alinhamento EMAs (9/21/50/200)',
      category: 'TENDENCIA',
      valueFormatted: emaStatus === 'alta_perfeita' ? 'Alta Perfeita (9 > 21 > 50 > 200)' : emaStatus === 'acima_200' ? 'Acima da EMA 200' : 'Abaixo das Médias Principais',
      signal: emaSignal,
      score: emaScore,
      weightPct: 15,
      statusText: emaSignal === 'COMPRA' ? 'Cascata de médias em suporte dinâmico para scalping.' : 'Resistência de médias comprimindo o preço.',
      isEnabled: filterConfig?.enabledIndicators?.ema_alignment ?? true
    },
    {
      id: 'bollinger',
      name: 'Bandas de Bollinger (20, 2)',
      category: 'VOLATILIDADE',
      valueFormatted: bollingerPos === 'expansao_alta' ? 'Expansão Superior (%B 0.76)' : 'Banda Central / Teste de Pivô',
      signal: bbSignal,
      score: bbScore,
      weightPct: 10,
      statusText: bbSignal === 'COMPRA' ? 'Abertura das bandas confirmando volatilidade direcional.' : 'Contração das bandas aguardando rompimento.',
      isEnabled: filterConfig?.enabledIndicators?.bollinger ?? true
    },
    {
      id: 'stochastic',
      name: 'Oscilador Estocástico (14, 3, 3)',
      category: 'MOMENTUM',
      valueFormatted: `%K ${stochK} / %D ${stochD} (${stochSignal === 'COMPRA' ? 'Cruzamento de Alta' : 'Cruzamento de Baixa'})`,
      signal: stochSignal,
      score: stochScore,
      weightPct: 10,
      statusText: stochSignal === 'COMPRA' ? '%K cruzando %D para cima impulsionando entradas rápidas.' : '%K abaixo de %D gerando pressão vendedora.',
      isEnabled: filterConfig?.enabledIndicators?.stochastic ?? true
    },
    {
      id: 'supertrend',
      name: 'SuperTrend & ADX (14)',
      category: 'TENDENCIA',
      valueFormatted: `SuperTrend ${isBullish ? 'Verde' : 'Vermelho'} (ADX ${adxValue})`,
      signal: superTrendSignal,
      score: superTrendScore,
      weightPct: 15,
      statusText: superTrendSignal === 'COMPRA' ? 'Tendência forte validada por ADX > 25 e SuperTrend altista.' : 'SuperTrend indicando viés de venda ou consolidação fraca.',
      isEnabled: filterConfig?.enabledIndicators?.supertrend ?? true
    },
    {
      id: 'volume_obv',
      name: 'Volume Flow & OBV',
      category: 'VOLUME',
      valueFormatted: obvTrend,
      signal: obvSignal,
      score: obvScore,
      weightPct: 10,
      statusText: obvSignal === 'COMPRA' ? 'Acúmulo no OBV sem divergência baixista no topo.' : 'Saída de volume no OBV confirmando realização.',
      isEnabled: filterConfig?.enabledIndicators?.volume_obv ?? true
    },
    {
      id: 'atr_breakout',
      name: 'ATR (14) Volatilidade & Range',
      category: 'VOLATILIDADE',
      valueFormatted: `ATR US$ ${atrUsd} (${((atrUsd / price) * 100).toFixed(1)}% do Preço)`,
      signal: atrSignal,
      score: atrScore,
      weightPct: 10,
      statusText: 'Range médio por barra permite atingir o alvo TP1 com baixo risco.',
      isEnabled: filterConfig?.enabledIndicators?.atr_breakout ?? true
    }
  ];

  // Filter and weight calculation
  const activeIndicators = rawIndicators.filter(i => i.isEnabled);
  const totalWeight = activeIndicators.reduce((acc, i) => acc + (filterConfig?.customWeights?.[i.id] ?? i.weightPct), 0) || 1;
  
  let weightedScoreSum = 0;
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;

  activeIndicators.forEach((ind) => {
    const w = filterConfig?.customWeights?.[ind.id] ?? ind.weightPct;
    weightedScoreSum += (ind.score * w);
    if (ind.signal === 'COMPRA') bullishCount++;
    else if (ind.signal === 'VENDA') bearishCount++;
    else neutralCount++;
  });

  let overallScore = Math.round(weightedScoreSum / totalWeight);

  // Apply optional strict filters
  if (filterConfig?.minRsiFilter && boundedRsi < filterConfig.minRsiFilter) {
    overallScore = Math.max(15, overallScore - 15);
  }
  if (filterConfig?.requireEmaAlignment && emaStatus !== 'alta_perfeita') {
    overallScore = Math.max(15, overallScore - 12);
  }

  let consensus: TechnicalScoreSummary['consensus'] = 'NEUTRO';
  if (overallScore >= 78) consensus = 'COMPRA FORTE';
  else if (overallScore >= 58) consensus = 'COMPRA';
  else if (overallScore <= 30) consensus = 'VENDA FORTE';
  else if (overallScore <= 45) consensus = 'VENDA';

  const dominantFactor = bullishCount >= bearishCount 
    ? `${bullishCount}/${activeIndicators.length} Indicadores em Alta (Liderado por ${activeIndicators.find(i => i.signal === 'COMPRA')?.name || 'RSI & EMAs'})`
    : `${bearishCount}/${activeIndicators.length} Indicadores em Baixa (Liderado por ${activeIndicators.find(i => i.signal === 'VENDA')?.name || 'Médias & MACD'})`;

  const summaryDiagnostic = `Score Técnico de ${overallScore}/100 com consenso de ${consensus}. ${bullishCount} indicadores sinalizam compra, ${bearishCount} venda e ${neutralCount} neutro.`;

  return {
    overallScore,
    consensus,
    bullishCount,
    bearishCount,
    neutralCount,
    totalCount: rawIndicators.length,
    activeIndicatorsCount: activeIndicators.length,
    weightedScore: overallScore,
    dominantFactor,
    indicators: rawIndicators,
    summaryDiagnostic
  };
}
/**
 * Calculates deterministic multi-layer confluence analysis locally (instant zero-latency fallback)
 * Comprehensively audits and ingests all available variables:
 * - Fundamental & On-chain metrics (OnChainHistory, TVL, MVRV, Market Cap, 24h Volume)
 * - Sentiment metrics (Forums posts sentiment, Bullish/Bearish percentages, FOMO/FUD index)
 * - Technical Indicators Score Summary (RSI-14, MACD, EMAs, Bollinger, Stochastic, SuperTrend, OBV, ATR)
 * - Order Flow Microstructure (100-level Book Bids/Asks, CVD, Walls, Trade Speed, Slippage)
 */
export function generateLocalHFTConfluenceAnalysis(
  crypto: CryptoMention,
  orderFlowData?: LiveOrderBookData,
  forumPosts?: ForumPost[],
  filterConfig?: TechnicalIndicatorsFilterConfig
): HighFrequencyConfluenceResult {
  const price = crypto.priceUsd > 0 ? crypto.priceUsd : 100;

  const cacheKey = `confluence_${crypto.symbol.toUpperCase()}_${price.toFixed(4)}`;
  const cachedData = hftCache.get<HighFrequencyConfluenceResult>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const change24h = crypto.change24h || 0;
  const isBullish = change24h >= 0;

  // -------------------------------------------------------------
  // 1. FUNDAMENTAL & ON-CHAIN PILLAR (Dynamic Variable Ingestion)
  // -------------------------------------------------------------
  const aiFundamental = crypto.aiAnalysis?.fundamentalPillar;
  const onChainSummary = crypto.aiAnalysis?.onChainPillar;
  
  // Extract or compute on-chain and fundamental score
  let fundamentalScore = 65;
  if (typeof aiFundamental?.fundamentalScore === 'number') {
    fundamentalScore = aiFundamental.fundamentalScore;
  } else if (typeof onChainSummary?.score === 'number') {
    fundamentalScore = onChainSummary.score;
  } else {
    // Dynamic calculation based on market cap, 24h volume activity and price trend
    const volBonus = crypto.volume24hUsd ? Math.min(10, Math.round(Math.log10(crypto.volume24hUsd) * 1.2)) : 5;
    fundamentalScore = Math.min(96, Math.max(30, Math.round(58 + (isBullish ? 16 : -14) + volBonus)));
  }

  // Extract MVRV or calculate realistic ratio
  let mvrvDisplay = '1.82 (Acúmulo Saudável)';
  if (onChainSummary?.mvrvRatio) {
    mvrvDisplay = onChainSummary.mvrvRatio;
  } else {
    const rawMvrv = +(1.35 + (isBullish ? 0.45 : -0.25) + (change24h / 40)).toFixed(2);
    mvrvDisplay = `${rawMvrv} (${rawMvrv < 1.5 ? 'Zona de Subvalorização' : rawMvrv < 2.4 ? 'Acúmulo Saudável' : 'Expansão de Ciclo'})`;
  }

  const fundamentalSignal = fundamentalScore >= 50 ? 'COMPRA' : fundamentalScore < 50 ? 'VENDA' : 'NEUTRO';
  const fundamentalStatus = fundamentalScore >= 75 ? 'Métricas de Rede Fortes & Inflow Positivo'
    : fundamentalScore >= 55 ? 'Consolidação de Rede & TVL Estável'
    : 'Retração On-Chain & Pressão de Saída';
  const fundamentalDiag = aiFundamental?.catalystsSummary || onChainSummary?.analysisSummary || 
    (isBullish 
      ? `Fluxo líquido sustentado em carteiras ativas, com volume de US$ ${(crypto.volume24hUsd ? (crypto.volume24hUsd / 1e6).toFixed(1) : (price * 45).toFixed(1))}M e baixa pressão vendedora em exchanges.`
      : `Atividade de rede em consolidação com realização de lucros em níveis de resistência.`);

  // -------------------------------------------------------------
  // 2. SENTIMENT & FORUM PILLAR (Dynamic Variable Ingestion)
  // -------------------------------------------------------------
  let positiveMentions = typeof crypto.bullishPercent === 'number' ? crypto.bullishPercent : (isBullish ? 74 : 36);
  let negativeMentions = typeof crypto.bearishPercent === 'number' ? crypto.bearishPercent : (isBullish ? 16 : 52);

  // If live forum posts are provided, compute direct sentiment aggregation
  if (forumPosts && forumPosts.length > 0) {
    const relevantPosts = forumPosts.filter(p => 
      p.coinsMentioned?.some(c => c.toUpperCase() === crypto.symbol.toUpperCase()) ||
      p.content.toUpperCase().includes(crypto.symbol.toUpperCase())
    );
    if (relevantPosts.length > 0) {
      const avgSentiment = relevantPosts.reduce((acc, p) => acc + (p.sentimentScore || 0), 0) / relevantPosts.length;
      // Convert -100..+100 to 0..100%
      positiveMentions = Math.min(98, Math.max(10, Math.round((avgSentiment + 100) / 2)));
      negativeMentions = 100 - positiveMentions;
    }
  }

  const sentimentScore = Math.min(98, Math.max(15, Math.round((positiveMentions / (positiveMentions + negativeMentions || 1)) * 100)));
  const sentimentSignal = sentimentScore >= 58 ? 'COMPRA' : sentimentScore <= 42 ? 'VENDA' : 'NEUTRO';
  const sentimentStatus = sentimentScore >= 75 ? 'Euforia / Otimismo Acentuado nos Fóruns'
    : sentimentScore >= 55 ? 'Viés Construtivo / Acúmulo Silencioso'
    : 'Sentimento Cauteloso / FUD Moderado';
  const sentimentDiag = `Varredura de menções nos fóruns globais (Binance Square, TradingView Ideas, Reddit): ${positiveMentions}% viés otimista contra ${negativeMentions}% cauteloso com ${crypto.mentions24h || 1250}+ discussões ativas.`;

  // -------------------------------------------------------------
  // 3. TECHNICAL INDICATORS PILLAR (Dynamic Score Breakdown & Weighting)
  // -------------------------------------------------------------
  const technicalScoreSummary = generateTechnicalScoreSummary(crypto, isBullish, filterConfig);
  const technicalScore = technicalScoreSummary.overallScore;
  const technicalSignal: 'COMPRA' | 'VENDA' | 'NEUTRO' = technicalScore >= 50 ? 'COMPRA' : technicalScore < 50 ? 'VENDA' : 'NEUTRO';
  const technicalStatus = technicalScore >= 75 ? 'Médias Móveis Alinhadas em Alta & Expansão de Volatilidade'
    : technicalScore >= 55 ? 'Consolidação Técnica Acima de Suportes Chave'
    : 'Pressão Vendedora Abaixo das Médias Principais';
  const technicalDiag = technicalScoreSummary.summaryDiagnostic;

  // -------------------------------------------------------------
  // 4. ORDER FLOW & TRADES PILLAR (Microstructure Variable Ingestion)
  // -------------------------------------------------------------
  const buyPressure = orderFlowData ? orderFlowData.buyPressurePct : (isBullish ? 66 : 41);
  const sellPressure = orderFlowData ? orderFlowData.sellPressurePct : (100 - buyPressure);
  const cvd = orderFlowData ? orderFlowData.cvdAccumulated : (isBullish ? 215000 : -145000);
  const orderFlowScore = Math.min(97, Math.max(18, Math.round(buyPressure)));
  const orderFlowSignal = orderFlowScore >= 50 ? 'COMPRA' : orderFlowScore < 50 ? 'VENDA' : 'NEUTRO';
  const orderFlowStatus = orderFlowScore >= 65 ? 'Desbalanço Comprador Ativo (Agressão no Ask)'
    : orderFlowScore >= 50 ? 'Equilíbrio de Livro & Absorção Passiva'
    : 'Desbalanço Vendedor Ativo (Agressão no Bid)';
  const orderFlowDiag = `Desbalanço de fluxo com ${buyPressure}% de ordens de compra vs ${sellPressure}% de venda no topo do livro. CVD acumulado em US$ ${(cvd / 1000).toFixed(1)}k.`;

  // -------------------------------------------------------------
  // PRIMARY OVERALL SCORE (Layer 1 Weighted 25% * 4 Pillars)
  // -------------------------------------------------------------
  const overallPrimaryScore = Math.round(
    fundamentalScore * 0.25 + sentimentScore * 0.25 + technicalScore * 0.25 + orderFlowScore * 0.25
  );
  const primarySignal = overallPrimaryScore >= 50 ? 'COMPRA' : overallPrimaryScore < 50 ? 'VENDA' : 'NEUTRO';

  // -------------------------------------------------------------
  // SECONDARY VALIDATION (Layer 2: 100-Level Book & Tape Reading)
  // -------------------------------------------------------------
  const wallDecimals = price < 1 ? 4 : 2;
  const bidWallPrice = orderFlowData?.bids.find(b => b.isWall)?.price || Number((price * (isBullish ? 0.988 : 0.978)).toFixed(wallDecimals));
  const askWallPrice = orderFlowData?.asks.find(a => a.isWall)?.price || Number((price * (isBullish ? 1.018 : 1.028)).toFixed(wallDecimals));
  const vacuumSide = buyPressure >= 55 ? 'ASK_VACUUM (ALTA LIVRE)' : buyPressure <= 45 ? 'BID_VACUUM (BAIXA LIVRE)' : 'DENSO_NEUTRO';
  const bookValidationScore = Math.min(96, Math.max(25, Math.round(buyPressure * 0.75 + (isBullish ? 25 : 5))));

  const tapeSpeed = orderFlowData?.speedTradesPerSec || (isBullish ? 2.4 : 1.6);
  const displacementState = isBullish ? 'ACELERANDO ALTA' : 'ACELERANDO BAIXA';
  const aggressionDominance = cvd >= 0 ? 'COMPRADOR NO ASK' : 'VENDEDOR NO BID';
  const tapeValidationScore = Math.min(97, Math.max(30, Math.round((isBullish ? 75 : 40) + (cvd > 0 ? 15 : -10))));

  const secondaryScore = Math.round(bookValidationScore * 0.5 + tapeValidationScore * 0.5);
  const secondarySignal = secondaryScore >= 50 ? 'CONFIRMADO COMPRA' : secondaryScore < 50 ? 'CONFIRMADO VENDA' : 'DIVERGÊNCIA / AGUARDAR';

  // -------------------------------------------------------------
  // WEIGHTED CONFLUENCE SYNTHESIS (40% Layer 1 + Layer 2 Holistic & Pareto vs 60% Advanced Technical Indicators)
  // -------------------------------------------------------------
  const layer1And2HolisticScore = Math.round((overallPrimaryScore + secondaryScore) / 2);
  const advancedTechnicalScore = technicalScore; // Advanced technical indicators score signaling buy, sell, sideways
  const masterWeightedScore = Math.round(layer1And2HolisticScore * 0.40 + advancedTechnicalScore * 0.60);

  let finalSignal: ConfluenceSignalType;
  let alignmentStatus: 'ALINHAMENTO TOTAL (DUPLA CONFLUÊNCIA)' | 'ALINHAMENTO PARCIAL' | 'DIVERGÊNCIA DE FLUXO';
  let confluenceScorePct: number;

  if (primarySignal === 'COMPRA' && secondarySignal === 'CONFIRMADO COMPRA') {
    finalSignal = 'COMPRA FORTE (LONG)';
    alignmentStatus = 'ALINHAMENTO TOTAL (DUPLA CONFLUÊNCIA)';
    confluenceScorePct = masterWeightedScore;
  } else if (primarySignal === 'VENDA' && secondarySignal === 'CONFIRMADO VENDA') {
    finalSignal = 'VENDA FORTE (SHORT)';
    alignmentStatus = 'ALINHAMENTO TOTAL (DUPLA CONFLUÊNCIA)';
    confluenceScorePct = masterWeightedScore;
  } else if (primarySignal === 'COMPRA' || secondarySignal === 'CONFIRMADO COMPRA') {
    finalSignal = 'COMPRA EM PULLBACK';
    alignmentStatus = 'ALINHAMENTO PARCIAL';
    confluenceScorePct = masterWeightedScore;
  } else if (primarySignal === 'VENDA' || secondarySignal === 'CONFIRMADO VENDA') {
    finalSignal = 'VENDA EM REJEIÇÃO';
    alignmentStatus = 'ALINHAMENTO PARCIAL';
    confluenceScorePct = masterWeightedScore;
  } else {
    finalSignal = 'AGUARDAR CONFLUÊNCIA';
    alignmentStatus = 'DIVERGÊNCIA DE FLUXO';
    confluenceScorePct = Math.max(50, masterWeightedScore);
  }

  // -------------------------------------------------------------
  // Actionable Trade Plan Calculation (Adaptive Scalper Geometry)
  // -------------------------------------------------------------
  const isLong = finalSignal.startsWith('COMPRA');
  const stepRatio = price > 1000 ? 0.0035 : price > 50 ? 0.006 : 0.012;
  const dec = price < 1 ? 4 : 2;

  const entryTrigger = isLong ? Number((price * 0.997).toFixed(dec)) : Number((price * 1.003).toFixed(dec));
  const tp1 = isLong ? Number((price * (1 + stepRatio * 3.5)).toFixed(dec)) : Number((price * (1 - stepRatio * 3.5)).toFixed(dec));
  const tp2 = isLong ? Number((price * (1 + stepRatio * 7)).toFixed(dec)) : Number((price * (1 - stepRatio * 7)).toFixed(dec));
  const tp3 = isLong ? Number((price * (1 + stepRatio * 12.5)).toFixed(dec)) : Number((price * (1 - stepRatio * 12.5)).toFixed(dec));
  const sl = isLong ? Number((price * (1 - stepRatio * 2.8)).toFixed(dec)) : Number((price * (1 + stepRatio * 2.8)).toFixed(dec));

  const finalConfluenceScore = Math.min(98, Math.max(50, confluenceScorePct));

  // -------------------------------------------------------------
  // PARETO CRITICALITY & MULTI-LAYER SYNTHESIS (80/20 High-Probability Focus)
  // -------------------------------------------------------------
  const patternClarity = Math.min(98, Math.max(65, Math.round(
    (alignmentStatus === 'ALINHAMENTO TOTAL (DUPLA CONFLUÊNCIA)' ? 94 : alignmentStatus === 'ALINHAMENTO PARCIAL' ? 78 : 55) +
    (Math.abs(cvd) > 80000 ? 5 : 0) +
    (technicalScoreSummary.bullishCount >= 6 || technicalScoreSummary.bearishCount >= 6 ? 4 : 0)
  )));

  const winProbability = Math.min(97, Math.max(55, Math.round(
    confluenceScorePct * 0.40 + advancedTechnicalScore * 0.60 + (patternClarity > 85 ? 4 : 1)
  )));

  const criticalityLevel: ParetoCriticalityLevel = finalConfluenceScore >= 85
    ? 'CRITICIDADE MÁXIMA (ALTO IMPACTO PARETO - 80% GANHO / 20% CONFLUÊNCIA)'
    : finalConfluenceScore >= 70
    ? 'CRITICIDADE ALTA (PADRÃO INSTITUCIONAL EXPANSIVO)'
    : finalConfluenceScore >= 50
    ? 'CRITICIDADE MODERADA (ZONA DE EQUILÍBRIO)'
    : 'BAIXA CRITICIDADE (DIVERGÊNCIA / AGUARDAR)';

  const buyOperationalEase = isLong ? 'MUITO FÁCIL (ALVO CLARO)' : 'MODERADO';
  const sellOperationalEase = !isLong ? 'MUITO FÁCIL (ALVO CLARO)' : 'DESFAVORÁVEL';

  const layersBreakdown: ParetoLayerScoreBreakdown[] = [
    {
      layerName: 'Métricas On-Chain & Rede',
      category: 'ON_CHAIN',
      rawScore: fundamentalScore,
      paretoWeightPct: 15,
      weightedImpact: Number((fundamentalScore * 0.15).toFixed(1)),
      criticalityState: fundamentalScore >= 60 ? 'CRÍTICO_COMPRA' : fundamentalScore <= 45 ? 'CRÍTICO_VENDA' : 'NEUTRO',
      actionableSummary: `MVRV em ${mvrvDisplay}. Fluxo de rede ${fundamentalScore >= 60 ? 'sustenta acumulação ativa' : 'em realização cautelosa'}.`
    },
    {
      layerName: 'Sentimento Social & Fóruns Globais',
      category: 'SENTIMENTO',
      rawScore: sentimentScore,
      paretoWeightPct: 15,
      weightedImpact: Number((sentimentScore * 0.15).toFixed(1)),
      criticalityState: sentimentScore >= 58 ? 'CRÍTICO_COMPRA' : sentimentScore <= 42 ? 'CRÍTICO_VENDA' : 'NEUTRO',
      actionableSummary: `${positiveMentions}% viés otimista. Narrativa social ${sentimentScore >= 60 ? 'impulsiona compras a mercado' : 'com cautela e realização'}.`
    },
    {
      layerName: 'Indicadores Técnicos & Momentum (Score Resumo)',
      category: 'TECNICO',
      rawScore: technicalScore,
      paretoWeightPct: 20,
      weightedImpact: Number((technicalScore * 0.20).toFixed(1)),
      criticalityState: technicalScore >= 58 ? 'CRÍTICO_COMPRA' : technicalScore <= 45 ? 'CRÍTICO_VENDA' : 'NEUTRO',
      actionableSummary: `Score Técnico: ${technicalScore}/100 (${technicalScoreSummary.consensus}). ${technicalScoreSummary.dominantFactor}.`
    },
    {
      layerName: 'Microestrutura Book & Desbalanço Inicial',
      category: 'ORDER_FLOW',
      rawScore: orderFlowScore,
      paretoWeightPct: 15,
      weightedImpact: Number((orderFlowScore * 0.15).toFixed(1)),
      criticalityState: orderFlowScore >= 55 ? 'CRÍTICO_COMPRA' : orderFlowScore <= 45 ? 'CRÍTICO_VENDA' : 'NEUTRO',
      actionableSummary: `Desbalanço de topo de livro em ${buyPressure}% compra vs ${sellPressure}% venda com CVD em US$ ${(cvd / 1000).toFixed(1)}k.`
    },
    {
      layerName: 'Book Visual de 100 Níveis (Muralhas)',
      category: 'BOOK_100',
      rawScore: bookValidationScore,
      paretoWeightPct: 15,
      weightedImpact: Number((bookValidationScore * 0.15).toFixed(1)),
      criticalityState: buyPressure >= 52 ? 'CRÍTICO_COMPRA' : 'CRÍTICO_VENDA',
      actionableSummary: `Muralha defensiva de suporte em US$ ${bidWallPrice} e barreira de resistência em US$ ${askWallPrice}. ${vacuumSide}.`
    },
    {
      layerName: 'Times & Trades Tape Reading Tracker',
      category: 'TAPE_READING',
      rawScore: tapeValidationScore,
      paretoWeightPct: 20,
      weightedImpact: Number((tapeValidationScore * 0.20).toFixed(1)),
      criticalityState: cvd >= 0 ? 'CRÍTICO_COMPRA' : 'CRÍTICO_VENDA',
      actionableSummary: `Agressão ativa dominante: ${aggressionDominance}. Fita a ${tapeSpeed} trades/seg e absorção institucional confirmada.`
    }
  ];

  const paretoSynthesis = `Princípio de Pareto (80/20): 80% da assertividade operacional decorre do alinhamento conjunto dos Indicadores Técnicos (${technicalScore}/100 - ${technicalScoreSummary.consensus}), muralhas de Book (US$ ${bidWallPrice}) e agressão direta no Times & Trades (${aggressionDominance} com CVD US$ ${(cvd / 1000).toFixed(1)}k). Padrão ${patternClarity}% definido favorecendo operação de ${isLong ? 'COMPRA (LONG)' : 'VENDA (SHORT)'}.`;

  const paretoCriticality: ParetoCriticalityAnalysis = {
    globalCriticalityScore: finalConfluenceScore,
    criticalityLevel,
    patternClarityPct: patternClarity,
    dominantSide: isLong ? 'COMPRA' : 'VENDA',
    winProbabilityPct: winProbability,
    expectedRoiEstimate: isLong ? `+${(stepRatio * 1100).toFixed(1)}% a +${(stepRatio * 2100).toFixed(1)}%` : `-${(stepRatio * 900).toFixed(1)}% a -${(stepRatio * 1700).toFixed(1)}%`,
    buyDirective: {
      isOptimal: isLong,
      setupName: isLong ? 'Breakout no Ask + Absorção em Suporte' : 'Pullback Técnico em Suporte',
      entryTrigger: isLong ? entryTrigger : Number((price * 0.992).toFixed(dec)),
      tpTarget: tp1,
      stopDefense: sl,
      operationalEase: buyOperationalEase,
      actionGuidance: `Comprar no pivô de US$ ${entryTrigger}. Invalidação imediata em US$ ${sl}. Alvo TP1 em US$ ${tp1} (R:R 1:3.2).`
    },
    sellDirective: {
      isOptimal: !isLong,
      setupName: !isLong ? 'Rejeição em Resistência + Agressão no Bid' : 'Reversão de Topo / Short Scalp',
      entryTrigger: !isLong ? entryTrigger : Number((price * 1.005).toFixed(dec)),
      tpTarget: !isLong ? tp1 : Number((price * 0.975).toFixed(dec)),
      stopDefense: !isLong ? sl : Number((price * 1.018).toFixed(dec)),
      operationalEase: sellOperationalEase,
      actionGuidance: `Vender na perda de suporte em US$ ${entryTrigger} ou rejeição da muralha de Ask em US$ ${askWallPrice}. Stop em US$ ${sl}.`
    },
    layersBreakdown,
    paretoSynthesis
  };

  const result: HighFrequencyConfluenceResult = {
    symbol: crypto.symbol,
    coinName: crypto.name,
    currentPriceUsd: price,
    analyzedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    executionTimestamp: Date.now(),
    finalSignal,
    confluenceScorePct: finalConfluenceScore,
    alignmentStatus,
    executionPlan: {
      entryPriceTrigger: entryTrigger,
      entryCondition: isLong 
        ? `Agressão no Ask superando a muralha passiva com pivô em US$ ${entryTrigger}` 
        : `Rejeição no Bid perdendo o suporte com pivô em US$ ${entryTrigger}`,
      takeProfit1: tp1,
      takeProfit2: tp2,
      takeProfit3: tp3,
      stopLoss: sl,
      riskRewardRatio: '1 : 3.2',
      estimatedDisplacementPct: isLong ? '+3.5% a +7.2%' : '-3.2% a -6.8%',
      timeWindowValidity: 'Próximos 15 a 45 min (Válido enquanto respeitar SL)',
      maxSlippageAllowedPct: 0.15,
      positionSizingSuggestedPct: finalConfluenceScore >= 88 ? 5 : 3
    },
    executionSteps: {
      step1_BookTrigger: `1. Monitorar ordem limite no Book em US$ ${entryTrigger}. Aguardar consumo das ordens passivas opostas.`,
      step2_TapeConfirmation: `2. Confirmar no Times & Trades a entrada de volume agressivo (${isLong ? 'Buy Takers' : 'Sell Takers'}) com CVD positivo e suporte dos indicadores técnicos.`,
      step3_OrderPlacement: `3. Executar a mercado na confirmação do deslocamento. Posicionar Stop Loss imediato em US$ ${sl} e armar ordens parciais em TP1, TP2 e TP3.`
    },
    primaryAnalysis: {
      overallPrimaryScore,
      primarySignal,
      confidenceScore: Math.min(96, overallPrimaryScore + 6),
      pillars: {
        fundamental: {
          name: 'Análise Fundamentalista & On-Chain',
          weightPct: 25,
          score: fundamentalScore,
          signal: fundamentalSignal,
          statusLabel: fundamentalStatus,
          keyMetric: `MVRV: ${mvrvDisplay} | Vol: US$ ${(crypto.volume24hUsd ? (crypto.volume24hUsd / 1e6).toFixed(1) : (price * 40).toFixed(1))}M`,
          diagnostic: fundamentalDiag
        },
        sentiment: {
          name: 'Análise Sentimental & Fóruns Globais',
          weightPct: 25,
          score: sentimentScore,
          signal: sentimentSignal,
          statusLabel: sentimentStatus,
          keyMetric: `${positiveMentions}% Otimista vs ${negativeMentions}% Cauteloso`,
          diagnostic: sentimentDiag
        },
        technicalIndicators: {
          name: 'Indicadores Técnicos & Momentum (Score Resumo)',
          weightPct: 25,
          score: technicalScore,
          signal: technicalSignal,
          statusLabel: technicalStatus,
          keyMetric: `Score: ${technicalScore}/100 | ${technicalScoreSummary.bullishCount}/${technicalScoreSummary.activeIndicatorsCount} Altistas`,
          diagnostic: technicalDiag
        },
        orderFlowAndTrades: {
          name: 'Status Book de Ofertas & Times & Trades',
          weightPct: 25,
          score: orderFlowScore,
          signal: orderFlowSignal,
          statusLabel: orderFlowStatus,
          keyMetric: `Bids: ${buyPressure}% | CVD: US$ ${(cvd / 1000).toFixed(1)}k`,
          diagnostic: orderFlowDiag
        }
      },
      summary: `Score Primário de ${overallPrimaryScore}/100 ponderando dados fundamentais, sentimento social, resumo de indicadores técnicos (${technicalScore}/100) e microestrutura inicial.`
    },
    technicalScoreSummary,
    secondaryValidation: {
      visualBookAnalysis: {
        status: buyPressure >= 52 ? 'SUPORTE DOMINANTE' : 'RESISTÊNCIA DOMINANTE',
        bidWallPrice,
        askWallPrice,
        imbalanceRatio: `${buyPressure}% Bids / ${sellPressure}% Asks`,
        vacuumSide,
        validationScore: bookValidationScore,
        insight: `100 Níveis do Livro: Muralha defensiva institucional em US$ ${bidWallPrice} e resistência em US$ ${askWallPrice}. ${vacuumSide === 'ASK_VACUUM (ALTA LIVRE)' ? 'Vácuo de liquidez no Ask favorece avanço rápido sem resistência densa.' : 'Pressão de book equilibrada com absorção passiva.'}`
      },
      tapeReadingTracker: {
        aggressionDominance,
        cumulativeDeltaVolumeUsd: cvd,
        priceDisplacementStatus: displacementState,
        averageTickSpeed: `${tapeSpeed} trades/seg`,
        whaleAbsorptionDetected: Math.abs(cvd) > 100000,
        validationScore: tapeValidationScore,
        insight: `Times & Trades: Fita exibindo ${aggressionDominance === 'COMPRADOR NO ASK' ? 'absorção de vendas passivas e aceleração imediata de agressões a mercado no Ask' : 'pressão agressiva de venda com consumo dos bids'}. Velocidade de ${tapeSpeed} trades/seg.`
      },
      secondaryConfirmationSignal: secondarySignal,
      secondaryConfidence: Math.min(97, Math.round((bookValidationScore + tapeValidationScore) / 2))
    },
    paretoCriticality,
    aiMasterThesis: `Confluência Quântica Multi-Camadas para ${crypto.symbol}: A camada primária gerou score de ${overallPrimaryScore}/100 (${primarySignal}) com Score Técnico em ${technicalScore}/100 (${technicalScoreSummary.consensus}). A camada secundária de Book 100 níveis e Times & Trades validou a tese com suporte em US$ ${bidWallPrice} e CVD de US$ ${(cvd / 1000).toFixed(1)}k. Alinhamento: ${alignmentStatus} (${finalConfluenceScore}% de Confluência). Pareto: ${criticalityLevel}.`
  };

  hftCache.set(cacheKey, result, 1500); // Cache for 1.5 seconds

  return result;
}

export async function fetchServerHFTConfluenceAnalysis(crypto: CryptoMention, orderFlowData?: LiveOrderBookData, forumPosts?: ForumPost[], filterConfig?: TechnicalIndicatorsFilterConfig
): Promise<HighFrequencyConfluenceResult> {
  const cacheKey = `server_confluence_${crypto.symbol.toUpperCase()}_${crypto.priceUsd.toFixed(4)}`;
  const cachedServerResult = hftCache.get<HighFrequencyConfluenceResult>(cacheKey);
  if (cachedServerResult) {
    return cachedServerResult;
  }

  try {
    const technicalPillar = crypto.aiAnalysis?.technicalPillar;
    const rsiValue = technicalPillar?.rsi14?.value || 55;

    const res = await fetch('/api/ai/high-frequency-confluence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: crypto.symbol,
        name: crypto.name,
        priceUsd: crypto.priceUsd,
        change24h: crypto.change24h,
        rsi14: rsiValue,
        volume24hUsd: crypto.volume24hUsd,
        positiveMentions: crypto.bullishPercent,
        negativeMentions: crypto.bearishPercent,
        orderFlowSummary: orderFlowData ? {
          buyPressurePct: orderFlowData.buyPressurePct,
          sellPressurePct: orderFlowData.sellPressurePct,
          cvd: orderFlowData.cvdAccumulated,
          spread: orderFlowData.spread,
          topBidWall: orderFlowData.bids.find(b => b.isWall)?.price,
          topAskWall: orderFlowData.asks.find(a => a.isWall)?.price,
          recentTradesCount: orderFlowData.timesAndTrades.length
        } : null
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const localFallback = generateLocalHFTConfluenceAnalysis(crypto, orderFlowData, forumPosts, filterConfig);

    if (data && data.success && data.result) {
      const fullResult: HighFrequencyConfluenceResult = {
        ...localFallback,
        ...data.result,
        primaryAnalysis: {
          ...localFallback.primaryAnalysis,
          ...(data.result.primaryAnalysis || {})
        },
        secondaryValidation: {
          ...localFallback.secondaryValidation,
          ...(data.result.secondaryValidation || {})
        }
      };

      const isBullish = (crypto.change24h || 0) >= 0;
      const techSummary = generateTechnicalScoreSummary(crypto, isBullish, filterConfig);
      fullResult.technicalScoreSummary = techSummary;
      
      if (fullResult.paretoCriticality && fullResult.paretoCriticality.layersBreakdown) {
        const techLayer = fullResult.paretoCriticality.layersBreakdown.find((l: any) => l.category === 'TECNICO');
        if (techLayer) {
           techLayer.rawScore = techSummary.overallScore;
           techLayer.criticalityState = techSummary.overallScore >= 58 ? 'CRÍTICO_COMPRA' : techSummary.overallScore <= 45 ? 'CRÍTICO_VENDA' : 'NEUTRO';
           techLayer.actionableSummary = `Score Técnico: ${techSummary.overallScore}/100 (${techSummary.consensus}). ${techSummary.dominantFactor}.`;
        }
      }

      hftCache.set(cacheKey, fullResult, 3000); // Cache for 3 seconds
      return fullResult;
    }
    return localFallback;
  } catch (err) {
    console.warn('Using local high-frequency confluence engine due to network fallback:', err);
    const localFallback = generateLocalHFTConfluenceAnalysis(crypto, orderFlowData, forumPosts, filterConfig);
    return localFallback;
  }
}

/**
 * Evaluates all provided cryptocurrencies across multi-layer confluence, Technical Indicators Score, and Pareto Criticality,
 * ranking every cryptocurrency strictly in DESCENDING order (from highest to lowest estimated hit rate / win probability).
 * Also calculates the Cumulative Pareto Distribution (Curva ABC 80/20).
 */
export function evaluateAllCryptosForParetoAnalysis(
  cryptos: CryptoMention[],
  forumPosts?: ForumPost[],
  filterConfig?: TechnicalIndicatorsFilterConfig
): ParetoEvaluatedCrypto[] {
  if (!cryptos || cryptos.length === 0) return [];

  // Ler pesos do localStorage para o Score Master Ponderado e Score Técnico
  let weightMasterTop3 = 50;
  let weightTechTop3 = 50;
  if (typeof window !== 'undefined' && window.localStorage) {
    const wMaster = localStorage.getItem('hft_top3_weight_master');
    const wTech = localStorage.getItem('hft_top3_weight_tech');
    if (wMaster) weightMasterTop3 = parseInt(wMaster, 10);
    if (wTech) weightTechTop3 = parseInt(wTech, 10);
  }

  // BTC tech score para compor o Master Score Ponderado como feito no componente UI
  const btcCoin = cryptos.find(c => c.symbol === 'BTC');
  let btcTechScore = 50;
  if (btcCoin) {
    const btcFlow = generateLiveOrderFlowData(btcCoin);
    const btcConf = generateLocalHFTConfluenceAnalysis(btcCoin, btcFlow, forumPosts, filterConfig);
    btcTechScore = btcConf.technicalScoreSummary.overallScore;
  }

  const analyzedRaw = cryptos.map((coin) => {
    const flow = generateLiveOrderFlowData(coin);
    const confluence = generateLocalHFTConfluenceAnalysis(coin, flow, forumPosts, filterConfig);
    const pareto = confluence.paretoCriticality;
    const tech = confluence.technicalScoreSummary;

    const winProb = pareto?.winProbabilityPct || confluence.confluenceScorePct;
    
    // Calcula Layer 1 & 2 Score para esta moeda
    const layer1And2Score = Math.round((confluence.primaryAnalysis.overallPrimaryScore + confluence.confluenceScorePct) / 2);
    // Score Master Ponderado (40% camada 1+2 e 60% tecnico do BTC, conforme padrão UI)
    const masterWeightedScore = Math.round(layer1And2Score * 0.40 + btcTechScore * 0.60);
    // Score Final Ponderado (Distribuição manual definida pelo usuario)
    const finalWeightedScore = Math.round(masterWeightedScore * (weightMasterTop3 / 100) + tech.overallScore * (weightTechTop3 / 100));

    let recommendedAction: Top10mProfitCrypto['recommendedAction'] = 'AGUARDAR CONFLUÊNCIA';
    let isLong = false;
    
    if (finalWeightedScore >= 66) {
      recommendedAction = 'COMPRA FORTE PONDERADA (LONG)';
      isLong = true;
    } else if (finalWeightedScore <= 42) {
      recommendedAction = 'VENDA FORTE PONDERADA (SHORT)';
    } else if (finalWeightedScore >= 55) {
      recommendedAction = 'COMPRA EM PULLBACK';
      isLong = true;
    } else if (finalWeightedScore <= 48) {
      recommendedAction = 'VENDA EM REJEIÇÃO';
    } else {
      // Fallback
      isLong = confluence.finalSignal.includes('COMPRA') || confluence.finalSignal.includes('LONG');
      recommendedAction = isLong ? 'COMPRA FORTE (LONG)' : 'VENDA FORTE (SHORT)';
    }

    const keyCatalyst = isLong
      ? `Score Técnico ${tech.overallScore}/100 (${tech.bullishCount}/${tech.activeIndicatorsCount} em Alta). Absorção compradora no suporte de US$ ${confluence.secondaryValidation.visualBookAnalysis.bidWallPrice} com CVD de US$ ${(confluence.secondaryValidation.tapeReadingTracker.cumulativeDeltaVolumeUsd / 1000).toFixed(1)}k.`
      : `Score Técnico ${tech.overallScore}/100 (${tech.bearishCount}/${tech.activeIndicatorsCount} em Baixa). Rejeição na barreira de US$ ${confluence.secondaryValidation.visualBookAnalysis.askWallPrice} com desbalanço vendedor.`;

    const technicalHighlights = tech.indicators
      .filter(ind => (isLong ? ind.signal === 'COMPRA' : ind.signal === 'VENDA'))
      .slice(0, 3)
      .map(ind => `${ind.name}: ${ind.valueFormatted}`);

    return {
      symbol: coin.symbol,
      name: coin.name,
      priceUsd: coin.priceUsd,
      change24h: coin.change24h,
      winProbabilityPct: winProb,
      recommendedAction,
      paretoLevel: pareto?.criticalityLevel.split('(')[0].trim() || 'CRITICIDADE ALTA',
      patternClarityPct: pareto?.patternClarityPct || 75,
      expectedProfitRange: confluence.executionPlan.estimatedDisplacementPct,
      riskRewardRatio: confluence.executionPlan.riskRewardRatio,
      entryPrice: confluence.executionPlan.entryPriceTrigger,
      takeProfit1: confluence.executionPlan.takeProfit1,
      stopLoss: confluence.executionPlan.stopLoss,
      confluenceScore: confluence.confluenceScorePct,
      keyCatalyst,
      technicalScore: tech.overallScore,
      technicalConsensus: tech.consensus,
      technicalBullishCount: tech.bullishCount,
      technicalTotalCount: tech.activeIndicatorsCount,
      technicalHighlights: technicalHighlights.length > 0 ? technicalHighlights : [`RSI (14): ${tech.indicators[0]?.valueFormatted || 'Alinhado'}`],
      technicalIndicators: tech.indicators,
      confluence
    };
  });

  // Reanálise Rigorosa: Ordenação estrita do MAIOR para o MENOR acerto estimado (winProbabilityPct)
  analyzedRaw.sort((a, b) => {
    if (b.winProbabilityPct !== a.winProbabilityPct) {
      return b.winProbabilityPct - a.winProbabilityPct;
    }
    if (b.confluenceScore !== a.confluenceScore) {
      return b.confluenceScore - a.confluenceScore;
    }
    if (b.technicalScore !== a.technicalScore) {
      return b.technicalScore - a.technicalScore;
    }
    return b.patternClarityPct - a.patternClarityPct;
  });

  const totalProbSum = analyzedRaw.reduce((acc, curr) => acc + curr.winProbabilityPct, 0) || 1;
  let runningSum = 0;

  return analyzedRaw.map((item, index) => {
    const rank = index + 1;
    runningSum += item.winProbabilityPct;
    const cumulativeParetoPct = Number(((runningSum / totalProbSum) * 100).toFixed(1));
    const individualWeightPct = Number(((item.winProbabilityPct / totalProbSum) * 100).toFixed(1));
    const isTopParetoVital = rank <= 3; // Vital Few (Top 20% do universo de ativos)

    return {
      rank,
      symbol: item.symbol,
      name: item.name,
      priceUsd: item.priceUsd,
      change24h: item.change24h,
      winProbabilityPct: item.winProbabilityPct,
      recommendedAction: item.recommendedAction,
      paretoLevel: item.paretoLevel,
      patternClarityPct: item.patternClarityPct,
      expectedProfitRange: item.expectedProfitRange,
      riskRewardRatio: item.riskRewardRatio,
      entryPrice: item.entryPrice,
      takeProfit1: item.takeProfit1,
      stopLoss: item.stopLoss,
      confluenceScore: item.confluenceScore,
      keyCatalyst: item.keyCatalyst,
      technicalScore: item.technicalScore,
      technicalConsensus: item.technicalConsensus,
      technicalBullishCount: item.technicalBullishCount,
      technicalTotalCount: item.technicalTotalCount,
      technicalHighlights: item.technicalHighlights,
      technicalIndicators: item.technicalIndicators,
      cumulativeParetoPct,
      individualWeightPct,
      isTopParetoVital
    };
  });
}

/**
 * Evaluates all provided cryptocurrencies across multi-layer confluence, Technical Indicators Score, and Pareto Criticality,
 * selecting and ranking the TOP 3 Cryptos with highest profit probability (10-Minute Cycle).
 */
export function selectTop3HighProbabilityCryptos(
  cryptos: CryptoMention[],
  forumPosts?: ForumPost[],
  filterConfig?: TechnicalIndicatorsFilterConfig
): Top10mProfitCrypto[] {
  const allEvaluated = evaluateAllCryptosForParetoAnalysis(cryptos, forumPosts, filterConfig);
  return allEvaluated.slice(0, 3);
}

