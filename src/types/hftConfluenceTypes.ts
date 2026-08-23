export type ConfluenceSignalType = 'COMPRA FORTE (LONG)' | 'COMPRA EM PULLBACK' | 'VENDA FORTE (SHORT)' | 'VENDA EM REJEIÇÃO' | 'AGUARDAR CONFLUÊNCIA';

export type ParetoCriticalityLevel = 
  | 'CRITICIDADE MÁXIMA (ALTO IMPACTO PARETO - 80% GANHO / 20% CONFLUÊNCIA)' 
  | 'CRITICIDADE ALTA (PADRÃO INSTITUCIONAL EXPANSIVO)' 
  | 'CRITICIDADE MODERADA (ZONA DE EQUILÍBRIO)' 
  | 'BAIXA CRITICIDADE (DIVERGÊNCIA / AGUARDAR)';

export interface TechnicalIndicatorItem {
  id: string;
  name: string;
  category: 'MOMENTUM' | 'TENDENCIA' | 'VOLATILIDADE' | 'VOLUME';
  valueFormatted: string;
  signal: 'COMPRA' | 'VENDA' | 'NEUTRO';
  score: number; // 0-100
  weightPct: number; // e.g. 15%
  statusText: string;
  isEnabled: boolean;
}

export interface TechnicalScoreSummary {
  overallScore: number; // 0-100
  consensus: 'COMPRA FORTE' | 'COMPRA' | 'NEUTRO' | 'VENDA' | 'VENDA FORTE';
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalCount: number;
  activeIndicatorsCount: number;
  weightedScore: number;
  dominantFactor: string;
  indicators: TechnicalIndicatorItem[];
  summaryDiagnostic: string;
}

export interface TechnicalIndicatorsFilterConfig {
  enabledIndicators?: Record<string, boolean>; // e.g. { rsi: true, macd: true, ... }
  customWeights?: Record<string, number>;
  minRsiFilter?: number;
  requireEmaAlignment?: boolean;
}

export interface ParetoLayerScoreBreakdown {
  layerName: string;
  category: 'ON_CHAIN' | 'SENTIMENTO' | 'TECNICO' | 'ORDER_FLOW' | 'BOOK_100' | 'TAPE_READING';
  rawScore: number; // 0-100
  paretoWeightPct: number; // e.g. 15-25%
  weightedImpact: number;
  criticalityState: 'CRÍTICO_COMPRA' | 'CRÍTICO_VENDA' | 'NEUTRO';
  actionableSummary: string;
}

export interface ParetoCriticalityAnalysis {
  globalCriticalityScore: number; // 0-100
  criticalityLevel: ParetoCriticalityLevel;
  patternClarityPct: number; // e.g. 92% (Clareza do Padrão)
  dominantSide: 'COMPRA' | 'VENDA' | 'NEUTRO';
  winProbabilityPct: number; // e.g. 94%
  expectedRoiEstimate: string; // e.g. "+5.4% a +9.2%"
  
  // Operational Facilitation Directives for Both Buy and Sell
  buyDirective: {
    isOptimal: boolean;
    setupName: string;
    entryTrigger: number;
    tpTarget: number;
    stopDefense: number;
    operationalEase: 'MUITO FÁCIL (ALVO CLARO)' | 'MODERADO' | 'DESFAVORÁVEL';
    actionGuidance: string;
  };
  sellDirective: {
    isOptimal: boolean;
    setupName: string;
    entryTrigger: number;
    tpTarget: number;
    stopDefense: number;
    operationalEase: 'MUITO FÁCIL (ALVO CLARO)' | 'MODERADO' | 'DESFAVORÁVEL';
    actionGuidance: string;
  };

  // Pareto Layers Breakdown
  layersBreakdown: ParetoLayerScoreBreakdown[];
  paretoSynthesis: string;
}

export interface Layer1PrimaryPillar {
  name: string;
  weightPct: number; // e.g. 25%
  score: number; // 0 to 100
  signal: 'COMPRA' | 'VENDA' | 'NEUTRO';
  statusLabel: string;
  keyMetric: string;
  diagnostic: string;
}

export interface Layer1PrimaryAnalysis {
  overallPrimaryScore: number; // 0 to 100
  primarySignal: 'COMPRA' | 'VENDA' | 'NEUTRO';
  confidenceScore: number; // 0 to 100%
  pillars: {
    fundamental: Layer1PrimaryPillar;
    sentiment: Layer1PrimaryPillar;
    technicalIndicators: Layer1PrimaryPillar;
    orderFlowAndTrades: Layer1PrimaryPillar;
  };
  summary: string;
}

export interface Layer2SecondaryValidation {
  visualBookAnalysis: {
    status: 'SUPORTE DOMINANTE' | 'RESISTÊNCIA DOMINANTE' | 'EQUILÍBRIO';
    bidWallPrice: number;
    askWallPrice: number;
    imbalanceRatio: string;
    vacuumSide: 'ASK_VACUUM (ALTA LIVRE)' | 'BID_VACUUM (BAIXA LIVRE)' | 'DENSO_NEUTRO';
    validationScore: number;
    insight: string;
  };
  tapeReadingTracker: {
    aggressionDominance: 'COMPRADOR NO ASK' | 'VENDEDOR NO BID' | 'LATERAL';
    cumulativeDeltaVolumeUsd: number;
    priceDisplacementStatus: 'ACELERANDO ALTA' | 'ACELERANDO BAIXA' | 'ABSORÇÃO PASSIVA' | 'EXAUSTÃO';
    averageTickSpeed: string;
    whaleAbsorptionDetected: boolean;
    validationScore: number;
    insight: string;
  };
  secondaryConfirmationSignal: 'CONFIRMADO COMPRA' | 'CONFIRMADO VENDA' | 'DIVERGÊNCIA / AGUARDAR';
  secondaryConfidence: number;
}

export interface HighFrequencyConfluenceResult {
  symbol: string;
  coinName: string;
  currentPriceUsd: number;
  analyzedAt: string;
  executionTimestamp: number;
  
  // Master Final High-Frequency Signal
  finalSignal: ConfluenceSignalType;
  confluenceScorePct: number; // 0-100%
  alignmentStatus: 'ALINHAMENTO TOTAL (DUPLA CONFLUÊNCIA)' | 'ALINHAMENTO PARCIAL' | 'DIVERGÊNCIA DE FLUXO';
  
  // High Frequency Actionable Trade Parameters
  executionPlan: {
    entryPriceTrigger: number;
    entryCondition: string;
    takeProfit1: number;
    takeProfit2: number;
    takeProfit3: number;
    stopLoss: number;
    riskRewardRatio: string;
    estimatedDisplacementPct: string;
    timeWindowValidity: string;
    maxSlippageAllowedPct: number;
    positionSizingSuggestedPct: number;
  };

  // Execution Step-by-Step Checklist
  executionSteps: {
    step1_BookTrigger: string;
    step2_TapeConfirmation: string;
    step3_OrderPlacement: string;
  };

  // Layer 1 (Primary Multi-Factor)
  primaryAnalysis: Layer1PrimaryAnalysis;

  // Technical Indicators Score Summary (Dynamic & Filterable)
  technicalScoreSummary: TechnicalScoreSummary;

  // Layer 2 (Secondary Microstructure Verification)
  secondaryValidation: Layer2SecondaryValidation;

  // Pareto Criticality & Cross-Layer Score Synthesis
  paretoCriticality?: ParetoCriticalityAnalysis;

  // AI Strategic Deep Thesis
  aiMasterThesis: string;
}

export interface Top10mProfitCrypto {
  rank: number;
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  winProbabilityPct: number;
  recommendedAction: 'COMPRA FORTE (LONG)' | 'VENDA FORTE (SHORT)' | 'COMPRA EM PULLBACK' | 'VENDA EM REJEIÇÃO' | 'COMPRA FORTE PONDERADA (LONG)' | 'VENDA FORTE PONDERADA (SHORT)' | string;
  paretoLevel: string;
  expectedProfitRange: string;
  riskRewardRatio: string;
  entryPrice: number;
  takeProfit1: number;
  stopLoss: number;
  confluenceScore: number;
  keyCatalyst: string;
  // Technical Score Integration & Weighting Breakdown
  technicalScore: number; // 0-100
  technicalConsensus: 'COMPRA FORTE' | 'COMPRA' | 'NEUTRO' | 'VENDA' | 'VENDA FORTE';
  technicalBullishCount: number;
  technicalTotalCount: number;
  technicalHighlights: string[];
  technicalIndicators: TechnicalIndicatorItem[];
}

export interface ParetoEvaluatedCrypto extends Top10mProfitCrypto {
  cumulativeParetoPct: number;
  isTopParetoVital: boolean;
  individualWeightPct: number;
  patternClarityPct: number;
}


