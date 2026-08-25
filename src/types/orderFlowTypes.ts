export interface OrderBookLevel {
  id: string;
  price: number;
  amount: number;
  totalUsd: number;
  accumulatedUsd: number;
  depthPercentage: number;
  ordersCount: number;
  type: 'bid' | 'ask';
  isWall?: boolean;
  wallStrength?: 'Alta' | 'Extrema' | 'Moderada';
  institutionTag?: string;
}

export interface TimesAndTradeRow {
  id: string;
  timestamp: string;
  timeFormatted: string;
  price: number;
  amount: number;
  totalUsd: number;
  aggressor: 'BUY' | 'SELL'; // Comprador agredindo no Ask ou Vendedor no Bid
  tradeType: 'Agressão a Mercado' | 'Varredura de Liquidez' | 'Lote Institucional' | 'Bloco Algorítmico';
  priceDisplacement: number; // Deslocamento de ticks/cents (positivo ou negativo)
  displacementLabel: string;
  absorbedInBook: boolean;
  orderBookImpact: 'Rompimento de Nível' | 'Absorção Imediata' | 'Consumo Parcial' | 'Vácuo de Liquidez';
}

export interface BookAndTradesAnalysisRecord {
  id: string;
  symbol: string;
  coinName: string;
  priceUsd: number;
  timestamp: string;
  bidsCount: number;
  asksCount: number;
  tradesCount: number;
  totalBidLiquidityUsd: number;
  totalAskLiquidityUsd: number;
  bidAskRatio: number;
  orderBookImbalance: number; // -100% (Ask dominante) a +100% (Bid dominante)
  largestBidWall: { price: number; amount: number; totalUsd: number };
  largestAskWall: { price: number; amount: number; totalUsd: number };
  cumulativeVolumeDelta: number; // CVD
  deltaAggressionPercent: number; // e.g. 68% buy
  lastDisplacementTicks: number;
  displacementSpeed: 'Aceleração Alta' | 'Neutro / Estável' | 'Exaustão';
  bestEntryOpportunity: {
    recommendedAction: 'COMPRA IMEDIATA' | 'COMPRA EM PULLBACK' | 'VENDA / SHORT' | 'AGUARDAR CONFIRMAÇÃO';
    triggerPrice: number;
    confirmationSignal: string;
    displacementPotentialPct: string;
    expectedTarget: number;
    recommendedStop: number;
    riskRewardRatio: string;
    confidenceScore: number;
    rationale: string;
  };
  aiAnalysis?: {
    summary: string;
    bookAbsorptionDiagnosis: string;
    tapeReadingInsight: string;
    liquidityVacuumDetected: boolean;
    whaleFootprint: string;
  };
}

export interface LiveOrderBookData {
  symbol: string;
  priceUsd: number;
  spread: number;
  spreadPercentage: number;
  bids: OrderBookLevel[]; // 50 bids
  asks: OrderBookLevel[]; // 50 asks (total 100 levels)
  timesAndTrades: TimesAndTradeRow[]; // 100 recent trades
  depth100TotalBidUsd: number;
  depth100TotalAskUsd: number;
  orderBookImbalancePct: number; // -100 to +100
  buyPressurePct: number;
  sellPressurePct: number;
  cvdAccumulated: number;
  speedTradesPerSec: number;
  averageDisplacementTicks: number;
}

export interface OrderBookSignal {
  signal?: 'COMPRA' | 'VENDA' | 'NEUTRO' | string;
  signalType?: 'FORTE_COMPRA' | 'COMPRA' | 'NEUTRO_ABSORCAO' | 'VENDA' | 'FORTE_VENDA' | string;
  type?: string;
  label: string;
  confidencePct: number;
  color: 'emerald' | 'rose' | 'amber' | 'cyan' | string;
  biasDescription?: string;
  rationale?: string;
}

export interface OrderBookSupportLevel {
  price?: number;
  priceLevel?: number;
  priceFormatted?: string;
  volumeUsd?: number;
  volumeFormatted?: string;
  depthLevel?: string;
  distancePct?: number;
  wallStrength?: 'MUITO_FORTE' | 'FORTE' | 'MODERADO' | string;
  significance?: string;
  ticksBelow?: number;
  status?: string;
  description?: string;
  color?: 'emerald' | string;
}

export interface OrderBookResistanceLevel {
  price?: number;
  priceLevel?: number;
  priceFormatted?: string;
  volumeUsd?: number;
  volumeFormatted?: string;
  depthLevel?: string;
  distancePct?: number;
  wallStrength?: 'MUITO_FORTE' | 'FORTE' | 'MODERADO' | string;
  significance?: string;
  ticksAbove?: number;
  status?: string;
  description?: string;
  color?: 'rose' | string;
}

export interface OrderBookImbalanceMetrics {
  bidPct?: number;
  bidRatioPct?: number;
  askPct?: number;
  askRatioPct?: number;
  spreadUsd?: number;
  spreadPct?: number;
  ratioText?: string;
  pressureDirection?: 'COMPRADORA' | 'VENDEDORA' | 'EQUILIBRADA' | string;
  breakoutProbability?: number;
}

export interface OrderBookReading {
  signal: OrderBookSignal;
  support: OrderBookSupportLevel;
  resistance: OrderBookResistanceLevel;
  imbalance: OrderBookImbalanceMetrics;
  tacticalVerdict: string;
}

export interface HftPillarDetail {
  status: string;
  value: string;
  description: string;
  color: string;
}

export interface TapeEscalationDetail {
  status: 'COMPRADOR_COMPRANDO_MAIS_CARO' | 'VENDEDOR_VENDENDO_MAIS_BARATO' | 'INICIO_VARREDURA' | 'NEUTRO';
  isActive: boolean;
  consecutiveCount: number;
  startPrice: number;
  currentPrice: number;
  priceDifferenceUsd: number;
  priceDifferencePct: number;
  totalVolumeUsd: number;
  speedTradesPerSec?: number;
  intensityScore: number; // 0-100%
  description: string;
  aiDiagnosis: string;
}

export interface OneMinute75AggressionGate {
  totalTrades1Min: number;
  buyTrades1Min: number;
  sellTrades1Min: number;
  buyVolume1MinUsd: number;
  sellVolume1MinUsd: number;
  buyForcePct: number;
  sellForcePct: number;
  majorAggressor: 'BUY' | 'SELL' | 'NEUTRAL';
  isStrengthAbove75Pct: boolean;
  isLongAllowed: boolean;
  isShortAllowed: boolean;
  reasonLong: string;
  reasonShort: string;
  badgeText: string;
}

export interface TimesAndTradesAiAnalysis {
  symbol: string;
  timestamp: string;
  dominantAggression: 'BUY' | 'SELL' | 'NEUTRAL';
  buyAggressionPct: number;
  sellAggressionPct: number;
  buyerEscalation: TapeEscalationDetail; // Comprador comprando mais caro
  sellerEscalation: TapeEscalationDetail; // Vendedor vendendo mais barato
  oneMinute75AggressionGate?: OneMinute75AggressionGate;
  executionGate: {
    isLongAllowed: boolean;
    isShortAllowed: boolean;
    reasonLong: string;
    reasonShort: string;
    activeBiasMessage: string;
  };
  summaryAiInsight: string;
}

export interface HftFlowAnalysis {
  symbol: string;
  priceUsd: number;
  averageEntryTime: HftPillarDetail;
  supportResistanceVolume: HftPillarDetail;
  displacementEaseDirection: HftPillarDetail;
  fluidPriceRange: HftPillarDetail;
  highChurnLowDisplacementZone: HftPillarDetail;
  stopLossHuntAlert: HftPillarDetail;
  sweepingMomentum?: HftPillarDetail;
  tapeAiAnalysis?: TimesAndTradesAiAnalysis;
  orderBookReading?: OrderBookReading;
  aiSynthesizedRecommendation: string;
}


