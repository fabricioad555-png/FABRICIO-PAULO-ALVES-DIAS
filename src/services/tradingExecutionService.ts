import { 
  TradePosition, 
  TradingAccount, 
  PositionSide, 
  CloseReason, 
  AssetSelectionMode, 
  ExecuteHftOrderParams,
  MarketReversalPolicy,
  BtcMarketDirectionResult
} from '../types/tradingTypes';
import { HighFrequencyConfluenceResult } from '../types/hftConfluenceTypes';
import { CryptoMention } from '../types';
import { generateLiveOrderFlowData } from './orderFlowDataService';
import { generateLocalHFTConfluenceAnalysis } from './hftConfluenceService';

const STORAGE_KEY_POSITIONS = 'hft_demo_positions';
const STORAGE_KEY_ACCOUNT = 'hft_demo_account';
export const TRADING_ACCOUNT_EVENT = 'hft_demo_account_updated';

export function notifyTradingAccountUpdate(account: TradingAccount) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRADING_ACCOUNT_EVENT, { detail: account }));
  }
}

/**
 * Computes the Master Weighted Market Direction for BTC (Sistema Ponderado 14% / 86%)
 * - 14% Layer 1 (Intelligence & Signals) + Layer 2 (Forum & Sentiment Radar)
 * - 86% Technical Indicators (EMAs, RSI, MACD, Volume Delta, Order Book)
 */
export function computeBtcMasterWeightedDirection(
  cryptos: CryptoMention[],
  customWeights?: { layer1And2?: number; technical?: number }
): BtcMarketDirectionResult {
  const btcObj = cryptos.find(c => c.symbol === 'BTC');
  
  let weightLayer1And2 = customWeights?.layer1And2 ?? 14;
  let weightTechnical = customWeights?.technical ?? 86;
  
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedLayer = window.localStorage.getItem('hft_decision_weight_layer_1_2');
    const savedTech = window.localStorage.getItem('hft_decision_weight_tech');
    if (savedLayer !== null && customWeights?.layer1And2 === undefined) weightLayer1And2 = parseInt(savedLayer, 10) || 14;
    if (savedTech !== null && customWeights?.technical === undefined) weightTechnical = parseInt(savedTech, 10) || 86;
  }

  if (!btcObj) {
    return {
      score: 50,
      side: 'LONG',
      statusLabel: 'COMPRA',
      layer1And2Score: 50,
      technicalScore: 50,
      weightLayer1And2,
      weightTechnical,
      priceUsd: 0,
      change24h: 0,
      timestamp: Date.now()
    };
  }

  const btcFlow = generateLiveOrderFlowData(btcObj);
  const btcSignal = generateLocalHFTConfluenceAnalysis(btcObj, btcFlow);

  const layer1And2Score = Math.round((btcSignal.primaryAnalysis.overallPrimaryScore + btcSignal.confluenceScorePct) / 2);
  const technicalScore = btcSignal.technicalScoreSummary?.overallScore ?? btcSignal.primaryAnalysis?.pillars?.technicalIndicators?.score ?? 50;
  
  const masterWeightedScore = Math.round(
    layer1And2Score * (weightLayer1And2 / 100) + technicalScore * (weightTechnical / 100)
  );

  const side: PositionSide = masterWeightedScore >= 50 ? 'LONG' : 'SHORT';
  let statusLabel: 'COMPRA FORTE' | 'COMPRA' | 'NEUTRO' | 'VENDA' | 'VENDA FORTE' = 'COMPRA';
  if (masterWeightedScore >= 75) statusLabel = 'COMPRA FORTE';
  else if (masterWeightedScore >= 55) statusLabel = 'COMPRA';
  else if (masterWeightedScore >= 45) statusLabel = 'NEUTRO';
  else if (masterWeightedScore >= 25) statusLabel = 'VENDA';
  else statusLabel = 'VENDA FORTE';

  return {
    score: masterWeightedScore,
    side,
    statusLabel,
    layer1And2Score,
    technicalScore,
    weightLayer1And2,
    weightTechnical,
    priceUsd: btcObj.priceUsd,
    change24h: btcObj.change24h || 0,
    timestamp: Date.now()
  };
}

// Default Account with sanity checks
export function getTradingAccount(): TradingAccount {
  const defaultAcc: TradingAccount = {
    demoBalanceUsd: 10000,
    availableMarginUsd: 10000,
    totalRealizedPnlUsd: 0,
    isAutoTradingEnabled: false,
    maxRiskPerTradePct: 2,
    targetProfitUsd: 0.10,
    isQuickProfitExitEnabled: true,
    maxOperationTimeMinutes: 5,
    timeDecayProfitTargetUsd: 0.03,
    isTimeManagementEnabled: true,
    trailingStepUsd: 0.03,
    isDynamicTrailingStopEnabled: true,
    marketReversalPolicy: 'AUTO_CLOSE',
    isMarketReversalGuardEnabled: true,
    customWeightLayer1And2: 14,
    customWeightTechnical: 86,
    assetSelectionMode: 'TOP_3_PROBABILITY',
    selectedSymbols: []
  };

  const saved = localStorage.getItem(STORAGE_KEY_ACCOUNT);
  if (!saved) return defaultAcc;
  
  try {
    const parsed = JSON.parse(saved);
    const demoBalance = typeof parsed.demoBalanceUsd === 'number' && !isNaN(parsed.demoBalanceUsd) && parsed.demoBalanceUsd > 0
      ? parsed.demoBalanceUsd 
      : 10000;
    
    // Calculate currently locked margin in open positions
    const openPositions = getPositions().filter(p => p.status === 'OPEN');
    const lockedMargin = openPositions.reduce((sum, p) => sum + (p.sizeUsd || 0), 0);
    
    // Always calculate available margin dynamically to prevent out-of-sync or stuck values
    const availableMargin = Math.max(0, demoBalance - lockedMargin);

    return {
      demoBalanceUsd: demoBalance,
      availableMarginUsd: availableMargin,
      totalRealizedPnlUsd: typeof parsed.totalRealizedPnlUsd === 'number' && !isNaN(parsed.totalRealizedPnlUsd) ? parsed.totalRealizedPnlUsd : 0,
      isAutoTradingEnabled: Boolean(parsed.isAutoTradingEnabled),
      maxRiskPerTradePct: typeof parsed.maxRiskPerTradePct === 'number' ? parsed.maxRiskPerTradePct : 2,
      targetProfitUsd: typeof parsed.targetProfitUsd === 'number' && parsed.targetProfitUsd > 0 ? parsed.targetProfitUsd : 0.10,
      isQuickProfitExitEnabled: parsed.isQuickProfitExitEnabled !== false,
      maxOperationTimeMinutes: typeof parsed.maxOperationTimeMinutes === 'number' && parsed.maxOperationTimeMinutes > 0 ? parsed.maxOperationTimeMinutes : 5,
      timeDecayProfitTargetUsd: typeof parsed.timeDecayProfitTargetUsd === 'number' && parsed.timeDecayProfitTargetUsd > 0 ? parsed.timeDecayProfitTargetUsd : 0.03,
      isTimeManagementEnabled: parsed.isTimeManagementEnabled !== false,
      trailingStepUsd: typeof parsed.trailingStepUsd === 'number' && parsed.trailingStepUsd > 0 ? parsed.trailingStepUsd : 0.03,
      isDynamicTrailingStopEnabled: parsed.isDynamicTrailingStopEnabled !== false,
      marketReversalPolicy: (parsed.marketReversalPolicy || 'AUTO_CLOSE') as MarketReversalPolicy,
      isMarketReversalGuardEnabled: parsed.isMarketReversalGuardEnabled !== false,
      customWeightLayer1And2: typeof parsed.customWeightLayer1And2 === 'number' ? parsed.customWeightLayer1And2 : 14,
      customWeightTechnical: typeof parsed.customWeightTechnical === 'number' ? parsed.customWeightTechnical : 86,
      assetSelectionMode: (parsed.assetSelectionMode || 'TOP_3_PROBABILITY') as AssetSelectionMode,
      selectedSymbols: Array.isArray(parsed.selectedSymbols) ? parsed.selectedSymbols : []
    };
  } catch {
    return defaultAcc;
  }
}

export function saveTradingAccount(account: TradingAccount) {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
    notifyTradingAccountUpdate(account);
  } catch (err) {
    console.error('Failed to save trading account:', err);
  }
}

export function updateDemoBalance(newBalanceUsd: number): TradingAccount {
  const current = getTradingAccount();
  const openPositions = getPositions().filter(p => p.status === 'OPEN');
  const lockedMargin = openPositions.reduce((sum, p) => sum + (p.sizeUsd || 0), 0);
  
  const sanitizedBalance = Math.max(10, Number(newBalanceUsd) || 1000);
  const updated: TradingAccount = {
    ...current,
    demoBalanceUsd: sanitizedBalance,
    availableMarginUsd: Math.max(0, sanitizedBalance - lockedMargin)
  };
  
  saveTradingAccount(updated);
  return updated;
}

export function updateAssetSelectionMode(mode: AssetSelectionMode, selectedSymbols?: string[]): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    assetSelectionMode: mode,
    selectedSymbols: selectedSymbols !== undefined ? selectedSymbols : current.selectedSymbols
  };
  saveTradingAccount(updated);
  return updated;
}

export function updateTargetProfit(targetProfitUsd: number, isEnabled: boolean = true): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    targetProfitUsd: Math.max(0.01, Number(targetProfitUsd) || 0.10),
    isQuickProfitExitEnabled: isEnabled
  };
  saveTradingAccount(updated);
  return updated;
}

export function updateTimeManagementSettings(maxMinutes: number, targetProfitUsd: number = 0.03, isEnabled: boolean = true): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    maxOperationTimeMinutes: Math.max(1, Number(maxMinutes) || 5),
    timeDecayProfitTargetUsd: Math.max(0.01, Number(targetProfitUsd) || 0.03),
    isTimeManagementEnabled: isEnabled
  };
  saveTradingAccount(updated);
  return updated;
}

export function updateTrailingStopSettings(stepUsd: number = 0.03, isEnabled: boolean = true): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    trailingStepUsd: Math.max(0.01, Number(stepUsd) || 0.03),
    isDynamicTrailingStopEnabled: isEnabled
  };
  saveTradingAccount(updated);
  return updated;
}

export function updateMaxRiskPct(maxRiskPct: number): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    maxRiskPerTradePct: Math.max(0.1, Math.min(100, Number(maxRiskPct) || 2))
  };
  saveTradingAccount(updated);
  return updated;
}

export function getPositions(): TradePosition[] {
  const saved = localStorage.getItem(STORAGE_KEY_POSITIONS);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

export function savePositions(positions: TradePosition[]) {
  try {
    localStorage.setItem(STORAGE_KEY_POSITIONS, JSON.stringify(positions));
  } catch (err) {
    console.error('Failed to save positions:', err);
  }
}

export function clearTradingHistory() {
  localStorage.removeItem(STORAGE_KEY_POSITIONS);
}

// Risk Management Constants
const MAX_CONCURRENT_POSITIONS = 3;

export interface PositionStrategyOptions {
  isQuickProfitExitEnabled?: boolean;
  targetProfitUsd?: number;
  isTimeManagementEnabled?: boolean;
  maxOperationTimeMinutes?: number;
  timeDecayProfitTargetUsd?: number;
  isDynamicTrailingStopEnabled?: boolean;
}

/**
 * Recognizes and resolves active/inactive status of the 3 strategy modes prior to emitting an order.
 * Inserts strategy configurations into the position or marks them as not inserted according to user/account selection.
 */
export function resolvePositionStrategies(
  account: TradingAccount,
  overrides?: PositionStrategyOptions
): {
  isQuickProfit: boolean;
  targetProfitUsd: number;
  isTimeMgmt: boolean;
  maxMinutes: number;
  timeDecayTargetUsd: number;
  isDynamicTrailing: boolean;
  strategySummaryLogs: string[];
} {
  const isQuickProfit = overrides?.isQuickProfitExitEnabled !== undefined
    ? overrides.isQuickProfitExitEnabled
    : (account.isQuickProfitExitEnabled !== false);
  const targetProfitUsd = typeof overrides?.targetProfitUsd === 'number' && overrides.targetProfitUsd > 0
    ? overrides.targetProfitUsd
    : (typeof account.targetProfitUsd === 'number' && account.targetProfitUsd > 0 ? account.targetProfitUsd : 0.10);

  const isTimeMgmt = overrides?.isTimeManagementEnabled !== undefined
    ? overrides.isTimeManagementEnabled
    : (account.isTimeManagementEnabled !== false);
  const maxMinutes = typeof overrides?.maxOperationTimeMinutes === 'number' && overrides.maxOperationTimeMinutes > 0
    ? overrides.maxOperationTimeMinutes
    : (typeof account.maxOperationTimeMinutes === 'number' && account.maxOperationTimeMinutes > 0 ? account.maxOperationTimeMinutes : 5);
  const timeDecayTargetUsd = typeof overrides?.timeDecayProfitTargetUsd === 'number' && overrides.timeDecayProfitTargetUsd > 0
    ? overrides.timeDecayProfitTargetUsd
    : (typeof account.timeDecayProfitTargetUsd === 'number' && account.timeDecayProfitTargetUsd > 0 ? account.timeDecayProfitTargetUsd : 0.03);

  const isDynamicTrailing = overrides?.isDynamicTrailingStopEnabled !== undefined
    ? overrides.isDynamicTrailingStopEnabled
    : (account.isDynamicTrailingStopEnabled !== false);

  const strategySummaryLogs: string[] = [
    `📋 Reconhecimento de Estratégias na Emissão:`,
    isQuickProfit
      ? `🎯 [ESTRATÉGIA INSERIDA] Auto Take-Profit Scalper (+10¢): ATIVO (Alvo: +US$ ${targetProfitUsd.toFixed(2)})`
      : `🎯 [ESTRATÉGIA NÃO INSERIDA] Auto Take-Profit Scalper (+10¢): DESATIVADO conforme seleção`,
    isTimeMgmt
      ? `⏱️ [ESTRATÉGIA INSERIDA] Gerenciamento de Tempo HFT: ATIVO (Máx ${maxMinutes} min | Saída em +US$ ${timeDecayTargetUsd.toFixed(2)} / +3¢)`
      : `⏱️ [ESTRATÉGIA NÃO INSERIDA] Gerenciamento de Tempo HFT (5 min +3¢): DESATIVADO conforme seleção`,
    isDynamicTrailing
      ? `🛡️ [ESTRATÉGIA INSERIDA] Trailing Stop Dinâmico: ATIVO (1º Estágio: 6¢ ➔ +3¢ | 2º Estágio: 30¢ ➔ Rastreamento 15¢ atrás)`
      : `🛡️ [ESTRATÉGIA NÃO INSERIDA] Trailing Stop Dinâmico (6¢ ➔ 3¢ & 30¢ ➔ 15¢): DESATIVADO conforme seleção`
  ];

  return {
    isQuickProfit,
    targetProfitUsd,
    isTimeMgmt,
    maxMinutes,
    timeDecayTargetUsd,
    isDynamicTrailing,
    strategySummaryLogs
  };
}

/**
 * Parses directional intention from any AI confluence signal
 */
export function determineSignalSide(signal: HighFrequencyConfluenceResult): PositionSide | null {
  // Read custom decision weights for the customizable decision system
  let weightLayer1And2 = 14;
  let weightTechnical = 86;
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedLayer = window.localStorage.getItem('hft_decision_weight_layer_1_2');
    const savedTech = window.localStorage.getItem('hft_decision_weight_tech');
    if (savedLayer !== null) weightLayer1And2 = parseInt(savedLayer, 10);
    if (savedTech !== null) weightTechnical = parseInt(savedTech, 10);
  }

  // Calculate the custom weighted decision score matching WeightedConfluenceSignalStatusCard precisely
  const layer1And2Score = Math.round((signal.primaryAnalysis.overallPrimaryScore + signal.confluenceScorePct) / 2);
  const technicalScore = signal.technicalScoreSummary?.overallScore ?? signal.primaryAnalysis?.pillars?.technicalIndicators?.score ?? 50;
  const masterWeightedScore = Math.round(
    layer1And2Score * (weightLayer1And2 / 100) + technicalScore * (weightTechnical / 100)
  );

  // Buy trigger based on the weighted decision system (LONG)
  if (masterWeightedScore >= 56) {
    return 'LONG';
  }

  // Sell trigger based on the weighted decision system (SHORT)
  if (masterWeightedScore <= 48) {
    return 'SHORT';
  }

  // If no clear threshold is reached, check legacy string patterns as robust fallback
  const finalSig = (signal.finalSignal || '').toUpperCase();
  const primarySig = (signal.primaryAnalysis?.primarySignal || '').toUpperCase();
  const secondarySig = (signal.secondaryValidation?.secondaryConfirmationSignal || '').toUpperCase();

  if (finalSig.includes('AGUARDAR') && !primarySig.includes('COMPRA') && !primarySig.includes('VENDA')) {
    return null;
  }

  if (
    finalSig.includes('COMPRA') || 
    finalSig.includes('LONG') || 
    finalSig.includes('BUY') ||
    primarySig.includes('COMPRA') ||
    secondarySig.includes('COMPRA')
  ) {
    return 'LONG';
  }

  if (
    finalSig.includes('VENDA') || 
    finalSig.includes('SHORT') || 
    finalSig.includes('SELL') ||
    primarySig.includes('VENDA') ||
    secondarySig.includes('VENDA')
  ) {
    return 'SHORT';
  }

  return null;
}

/**
 * Attempts to execute a trade based on AI Confluence Signal
 */
export function processConfluenceSignalForTrading(
  signal: HighFrequencyConfluenceResult,
  currentPrice: number,
  account: TradingAccount,
  positions: TradePosition[],
  forcedSide?: PositionSide,
  bypassFilters?: boolean
): { account: TradingAccount, positions: TradePosition[], log: string, tradeOpened: boolean } {
  
  if (!account.isAutoTradingEnabled) {
    return { account, positions, log: 'Auto-Trading desativado.', tradeOpened: false };
  }

  const side = forcedSide || determineSignalSide(signal);
  if (!side) {
    return { account, positions, log: `Sinal Neutro/Aguardar para ${signal.symbol}. Nenhuma ação executada.`, tradeOpened: false };
  }

  const openPositions = positions.filter(p => p.status === 'OPEN');

  // Rule 1: Max 3 concurrent open positions
  if (openPositions.length >= MAX_CONCURRENT_POSITIONS) {
    return { account, positions, log: `Limite de ${MAX_CONCURRENT_POSITIONS} posições abertas atingido.`, tradeOpened: false };
  }

  // Rule 2: Max 1 open position per symbol
  const hasOpenForSymbol = openPositions.some(p => p.symbol === signal.symbol);
  if (hasOpenForSymbol) {
    return { account, positions, log: `Já existe uma posição aberta para ${signal.symbol}.`, tradeOpened: false };
  }

  // Rule 3: Sniper Precision Score Filter (Adaptive: 55% for 1st order, 58% for 2nd, 62% for 3rd)
  if (!bypassFilters) {
    const currentOpenCount = openPositions.length;
    const requiredScore = currentOpenCount === 0 ? 55 : currentOpenCount === 1 ? 58 : 62;
    if (signal.confluenceScorePct < requiredScore) {
      return { account, positions, log: `Score de Precisão (${signal.confluenceScorePct}%) abaixo do Filtro Sniper mínimo adaptativo (${requiredScore}%) para ${signal.symbol}.`, tradeOpened: false };
    }
  }

  // Sizing Calculation: Strictly follow "3. Gerenciamento de Risco Automatizado"
  const maxRiskPct = account.maxRiskPerTradePct || 2;
  const maxRiskUsd = (account.demoBalanceUsd * maxRiskPct) / 100;
  
  // Standard Stop Loss distance estipulated as 3.5% (same as UI risk calculator)
  const standardSlDistance = 0.035; 
  let desiredSizeUsd = maxRiskUsd / standardSlDistance;
  
  // Cap position size to max 30% of total demo balance to allow up to 3 concurrent positions
  const maxPositionCap = account.demoBalanceUsd * 0.30;
  if (desiredSizeUsd > maxPositionCap) {
    desiredSizeUsd = maxPositionCap;
  }
  
  if (desiredSizeUsd > account.availableMarginUsd) {
    desiredSizeUsd = account.availableMarginUsd;
  }

  // If available margin is tight but balance is healthy, allow minimal trade size
  if (desiredSizeUsd < 10) {
    if (account.availableMarginUsd < 10) {
      return { account, positions, log: `Margem insuficiente (US$ ${account.availableMarginUsd.toFixed(2)}) para abrir nova posição.`, tradeOpened: false };
    } else {
      desiredSizeUsd = Math.max(10, Math.min(account.availableMarginUsd, account.demoBalanceUsd * 0.30));
    }
  }

  // Use real market value to execute the order
  const entryPrice = currentPrice > 0 ? currentPrice : signal.currentPriceUsd || 100;
  const isLong = side === 'LONG';
  const stepRatio = entryPrice > 1000 ? 0.003 : 0.008;

  // Calibrate Stop Loss strictly relative to actual entry price so it never triggers instantly
  let sl = signal.executionPlan?.stopLoss;
  if (isLong) {
    if (!sl || sl >= entryPrice || isNaN(sl)) {
      sl = Number((entryPrice * (1 - stepRatio * 3.2)).toFixed(entryPrice < 1 ? 4 : 2));
    }
  } else {
    if (!sl || sl <= entryPrice || isNaN(sl)) {
      sl = Number((entryPrice * (1 + stepRatio * 3.2)).toFixed(entryPrice < 1 ? 4 : 2));
    }
  }

  // Calibrate Take Profits strictly relative to actual entry price
  let tp1 = signal.executionPlan?.takeProfit1;
  let tp2 = signal.executionPlan?.takeProfit2;
  let tp3 = signal.executionPlan?.takeProfit3;

  if (isLong) {
    if (!tp1 || tp1 <= entryPrice || isNaN(tp1)) {
      tp1 = Number((entryPrice * (1 + stepRatio * 4)).toFixed(entryPrice < 1 ? 4 : 2));
    }
    if (!tp2 || tp2 <= tp1 || isNaN(tp2)) {
      tp2 = Number((entryPrice * (1 + stepRatio * 8)).toFixed(entryPrice < 1 ? 4 : 2));
    }
    if (!tp3 || tp3 <= tp2 || isNaN(tp3)) {
      tp3 = Number((entryPrice * (1 + stepRatio * 14)).toFixed(entryPrice < 1 ? 4 : 2));
    }
  } else {
    if (!tp1 || tp1 >= entryPrice || isNaN(tp1)) {
      tp1 = Number((entryPrice * (1 - stepRatio * 4)).toFixed(entryPrice < 1 ? 4 : 2));
    }
    if (!tp2 || tp2 >= tp1 || isNaN(tp2)) {
      tp2 = Number((entryPrice * (1 - stepRatio * 8)).toFixed(entryPrice < 1 ? 4 : 2));
    }
    if (!tp3 || tp3 >= tp2 || isNaN(tp3)) {
      tp3 = Number((entryPrice * (1 - stepRatio * 14)).toFixed(entryPrice < 1 ? 4 : 2));
    }
  }

  // Pre-Order Recognition of the 3 Strategy Modes
  const strategies = resolvePositionStrategies(account);

  // Create Position
  const newPosition: TradePosition = {
    id: `pos_${Date.now()}_${signal.symbol}`,
    symbol: signal.symbol,
    coinName: signal.coinName || signal.symbol,
    side,
    entryPrice,
    currentPrice: entryPrice,
    sizeUsd: Number(desiredSizeUsd.toFixed(2)),
    positionSizingPct: Number(((desiredSizeUsd / account.demoBalanceUsd) * 100).toFixed(2)),
    leverage: 1, // Spot/1x leverage assumed for simple demo
    initialStopLoss: sl,
    currentStopLoss: sl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    highestPriceSinceEntry: entryPrice,
    lowestPriceSinceEntry: entryPrice,
    highestUnrealizedPnlUsd: 0,
    trailingStepsCount: 0,
    trailingLockedProfitUsd: 0,
    unrealizedPnlUsd: 0,
    unrealizedPnlPct: 0,
    realizedPnlUsd: 0,
    status: 'OPEN',
    closeReason: 'NONE',
    openTime: Date.now(),
    isQuickProfitExitEnabled: strategies.isQuickProfit,
    targetProfitUsd: strategies.targetProfitUsd,
    isTimeManagementEnabled: strategies.isTimeMgmt,
    maxOperationTimeMinutes: strategies.maxMinutes,
    timeDecayProfitTargetUsd: strategies.timeDecayTargetUsd,
    isDynamicTrailingStopEnabled: strategies.isDynamicTrailing,
    executionLogs: [
      `Posição ${side} EXECUTADA A MERCADO em US$ ${entryPrice.toFixed(4)} (Sinal IA: ${signal.finalSignal})`,
      `Gestão de Risco: Stop Loss inicial armado em US$ ${sl} | TP1: US$ ${tp1} | TP2: US$ ${tp2}`,
      ...strategies.strategySummaryLogs
    ]
  };

  // Update Account Margin
  account.availableMarginUsd = Math.max(0, account.availableMarginUsd - desiredSizeUsd);
  positions.unshift(newPosition);
  
  saveTradingAccount(account);
  savePositions(positions);

  return { 
    account, 
    positions, 
    log: `Ordem ${side} ABERTA em ${signal.symbol} a mercado por US$ ${entryPrice}. Tamanho: US$ ${desiredSizeUsd.toFixed(2)}`, 
    tradeOpened: true 
  };
}

/**
 * Directly opens a position for a crypto following a specific side or recommended signal
 */
export function executeDirectTradeForCrypto(
  crypto: CryptoMention,
  side: PositionSide,
  signal: HighFrequencyConfluenceResult,
  account: TradingAccount,
  positions: TradePosition[]
): { account: TradingAccount, positions: TradePosition[], log: string, tradeOpened: boolean } {
  const openPositions = positions.filter(p => p.status === 'OPEN');

  if (openPositions.length >= MAX_CONCURRENT_POSITIONS) {
    return { account, positions, log: `Limite máximo de ${MAX_CONCURRENT_POSITIONS} posições abertas já atingido. Feche uma posição para abrir nova.`, tradeOpened: false };
  }

  const hasOpenForSymbol = openPositions.some(p => p.symbol === crypto.symbol);
  if (hasOpenForSymbol) {
    return { account, positions, log: `Já existe uma posição aberta para ${crypto.symbol}.`, tradeOpened: false };
  }

  const maxRiskPct = account.maxRiskPerTradePct || 2;
  const maxRiskUsd = (account.demoBalanceUsd * maxRiskPct) / 100;
  const standardSlDistance = 0.035; 
  let desiredSizeUsd = maxRiskUsd / standardSlDistance;
  
  if (desiredSizeUsd > account.availableMarginUsd) {
    desiredSizeUsd = account.availableMarginUsd;
  }

  if (desiredSizeUsd < 10) {
    if (account.availableMarginUsd < 10) {
      return { account, positions, log: `Margem insuficiente (US$ ${account.availableMarginUsd.toFixed(2)}) para abrir operação.`, tradeOpened: false };
    }
    desiredSizeUsd = Math.max(10, account.availableMarginUsd * 0.9);
  }

  const entryPrice = crypto.priceUsd > 0 ? crypto.priceUsd : signal.currentPriceUsd || 100;
  const isLong = side === 'LONG';
  const stepRatio = entryPrice > 1000 ? 0.003 : 0.008;

  let sl = signal.executionPlan?.stopLoss;
  if (isLong) {
    if (!sl || sl >= entryPrice || isNaN(sl)) {
      sl = Number((entryPrice * (1 - stepRatio * 3.2)).toFixed(entryPrice < 1 ? 4 : 2));
    }
  } else {
    if (!sl || sl <= entryPrice || isNaN(sl)) {
      sl = Number((entryPrice * (1 + stepRatio * 3.2)).toFixed(entryPrice < 1 ? 4 : 2));
    }
  }

  let tp1 = signal.executionPlan?.takeProfit1;
  let tp2 = signal.executionPlan?.takeProfit2;
  let tp3 = signal.executionPlan?.takeProfit3;

  if (isLong) {
    if (!tp1 || tp1 <= entryPrice || isNaN(tp1)) tp1 = Number((entryPrice * (1 + stepRatio * 4)).toFixed(entryPrice < 1 ? 4 : 2));
    if (!tp2 || tp2 <= tp1 || isNaN(tp2)) tp2 = Number((entryPrice * (1 + stepRatio * 8)).toFixed(entryPrice < 1 ? 4 : 2));
    if (!tp3 || tp3 <= tp2 || isNaN(tp3)) tp3 = Number((entryPrice * (1 + stepRatio * 14)).toFixed(entryPrice < 1 ? 4 : 2));
  } else {
    if (!tp1 || tp1 >= entryPrice || isNaN(tp1)) tp1 = Number((entryPrice * (1 - stepRatio * 4)).toFixed(entryPrice < 1 ? 4 : 2));
    if (!tp2 || tp2 >= tp1 || isNaN(tp2)) tp2 = Number((entryPrice * (1 - stepRatio * 8)).toFixed(entryPrice < 1 ? 4 : 2));
    if (!tp3 || tp3 >= tp2 || isNaN(tp3)) tp3 = Number((entryPrice * (1 - stepRatio * 14)).toFixed(entryPrice < 1 ? 4 : 2));
  }

  // Pre-Order Recognition of the 3 Strategy Modes
  const strategies = resolvePositionStrategies(account);

  const newPosition: TradePosition = {
    id: `pos_${Date.now()}_${crypto.symbol}`,
    symbol: crypto.symbol,
    coinName: crypto.name || signal.coinName || crypto.symbol,
    side,
    entryPrice,
    currentPrice: entryPrice,
    sizeUsd: Number(desiredSizeUsd.toFixed(2)),
    positionSizingPct: Number(((desiredSizeUsd / account.demoBalanceUsd) * 100).toFixed(2)),
    leverage: 1,
    initialStopLoss: sl,
    currentStopLoss: sl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    highestPriceSinceEntry: entryPrice,
    lowestPriceSinceEntry: entryPrice,
    highestUnrealizedPnlUsd: 0,
    trailingStepsCount: 0,
    trailingLockedProfitUsd: 0,
    unrealizedPnlUsd: 0,
    unrealizedPnlPct: 0,
    realizedPnlUsd: 0,
    status: 'OPEN',
    closeReason: 'NONE',
    openTime: Date.now(),
    isQuickProfitExitEnabled: strategies.isQuickProfit,
    targetProfitUsd: strategies.targetProfitUsd,
    isTimeManagementEnabled: strategies.isTimeMgmt,
    maxOperationTimeMinutes: strategies.maxMinutes,
    timeDecayProfitTargetUsd: strategies.timeDecayTargetUsd,
    isDynamicTrailingStopEnabled: strategies.isDynamicTrailing,
    executionLogs: [
      `Posição ${side} executada manualmente com base na sugestão Top 3 / Pareto em US$ ${entryPrice.toFixed(4)}`,
      `Stop Loss inicial: US$ ${sl} | TP1: US$ ${tp1}`,
      ...strategies.strategySummaryLogs
    ]
  };

  account.availableMarginUsd = Math.max(0, account.availableMarginUsd - desiredSizeUsd);
  positions.unshift(newPosition);
  
  saveTradingAccount(account);
  savePositions(positions);

  return { 
    account, 
    positions, 
    log: `⚡ Execução Direta: Ordem ${side} ABERTA em ${crypto.symbol} por US$ ${entryPrice}. Tamanho: US$ ${desiredSizeUsd.toFixed(2)}`, 
    tradeOpened: true 
  };
}

/**
 * Executes an order using the HFT AI Flow Analyzer recommendations combined with user-imputed data
 */
export function executeHftOrderWithImputedData(
  params: ExecuteHftOrderParams
): { 
  account: TradingAccount; 
  positions: TradePosition[]; 
  log: string; 
  tradeOpened: boolean;
  position?: TradePosition;
} {
  const account = params.account || getTradingAccount();
  const positions = params.positions || getPositions();
  const openPositions = positions.filter(p => p.status === 'OPEN');

  // Check 1: Max 3 concurrent positions
  if (openPositions.length >= MAX_CONCURRENT_POSITIONS) {
    return { 
      account, 
      positions, 
      log: `❌ Limite de ${MAX_CONCURRENT_POSITIONS} posições abertas já atingido. Feche uma posição para liberar margem.`, 
      tradeOpened: false 
    };
  }

  // Check 2: Max 1 position per symbol
  const hasOpenForSymbol = openPositions.some(p => p.symbol === params.symbol);
  if (hasOpenForSymbol) {
    return { 
      account, 
      positions, 
      log: `⚠️ Já existe uma posição aberta para ${params.symbol}. Aguarde a finalização ou encerre-a manualmente.`, 
      tradeOpened: false 
    };
  }

  const leverage = Math.max(1, Math.min(20, params.leverage || 1));
  const rawSizeUsd = params.sizeUsd > 0 ? params.sizeUsd : (account.demoBalanceUsd * 0.05);
  const marginRequired = rawSizeUsd / leverage;

  // Margin Check
  if (marginRequired > account.availableMarginUsd) {
    if (account.availableMarginUsd < 5) {
      return { 
        account, 
        positions, 
        log: `❌ Margem insuficiente (Disponível: US$ ${account.availableMarginUsd.toFixed(2)}, Requerido: US$ ${marginRequired.toFixed(2)}).`, 
        tradeOpened: false 
      };
    }
  }

  const effectiveMargin = Math.min(marginRequired, account.availableMarginUsd);
  const effectiveSizeUsd = effectiveMargin * leverage;

  const isLong = params.side === 'LONG';
  const entryPrice = params.entryPrice && params.entryPrice > 0 ? params.entryPrice : (params.currentPrice > 0 ? params.currentPrice : 100);
  const stepRatio = entryPrice > 1000 ? 0.003 : 0.008;

  // Derive Stop Loss from Imputed Data or HFT Analysis
  let sl = params.customStopLoss;
  if (!sl || isNaN(sl) || (isLong ? sl >= entryPrice : sl <= entryPrice)) {
    if (params.hftAnalysis?.orderBookReading) {
      const { support, resistance } = params.hftAnalysis.orderBookReading;
      const supPrice = support?.price ?? support?.priceLevel ?? 0;
      const resPrice = resistance?.price ?? resistance?.priceLevel ?? 0;
      if (isLong && supPrice > 0 && supPrice < entryPrice) {
        sl = Number((supPrice * 0.997).toFixed(entryPrice < 1 ? 4 : 2));
      } else if (!isLong && resPrice > 0 && resPrice > entryPrice) {
        sl = Number((resPrice * 1.003).toFixed(entryPrice < 1 ? 4 : 2));
      }
    }
  }
  // Fallback SL if still not set or invalid
  if (!sl || isNaN(sl) || (isLong ? sl >= entryPrice : sl <= entryPrice)) {
    sl = isLong 
      ? Number((entryPrice * (1 - stepRatio * 3.2)).toFixed(entryPrice < 1 ? 4 : 2))
      : Number((entryPrice * (1 + stepRatio * 3.2)).toFixed(entryPrice < 1 ? 4 : 2));
  }

  // Derive Take Profits from Imputed Data or HFT Analysis
  let tp1 = params.customTakeProfit;
  if (!tp1 || isNaN(tp1) || (isLong ? tp1 <= entryPrice : tp1 >= entryPrice)) {
    if (params.hftAnalysis?.orderBookReading) {
      const { support, resistance } = params.hftAnalysis.orderBookReading;
      const supPrice = support?.price ?? support?.priceLevel ?? 0;
      const resPrice = resistance?.price ?? resistance?.priceLevel ?? 0;
      if (isLong && resPrice > 0 && resPrice > entryPrice) {
        tp1 = Number((resPrice * 0.999).toFixed(entryPrice < 1 ? 4 : 2));
      } else if (!isLong && supPrice > 0 && supPrice < entryPrice) {
        tp1 = Number((supPrice * 1.001).toFixed(entryPrice < 1 ? 4 : 2));
      }
    }
  }
  // Fallback TP1 if still not set or invalid
  if (!tp1 || isNaN(tp1) || (isLong ? tp1 <= entryPrice : tp1 >= entryPrice)) {
    tp1 = isLong 
      ? Number((entryPrice * (1 + stepRatio * 4)).toFixed(entryPrice < 1 ? 4 : 2))
      : Number((entryPrice * (1 - stepRatio * 4)).toFixed(entryPrice < 1 ? 4 : 2));
  }

  const tp2 = isLong
    ? Number((entryPrice * (1 + stepRatio * 8)).toFixed(entryPrice < 1 ? 4 : 2))
    : Number((entryPrice * (1 - stepRatio * 8)).toFixed(entryPrice < 1 ? 4 : 2));

  const tp3 = isLong
    ? Number((entryPrice * (1 + stepRatio * 14)).toFixed(entryPrice < 1 ? 4 : 2))
    : Number((entryPrice * (1 - stepRatio * 14)).toFixed(entryPrice < 1 ? 4 : 2));

  const hftSigText = params.hftAnalysis?.orderBookReading?.signal?.label 
    ? `[HFT: ${params.hftAnalysis.orderBookReading.signal.label}]` 
    : '';

  // Pre-Order Recognition of the 3 Strategy Modes
  const strategies = resolvePositionStrategies(account, {
    isQuickProfitExitEnabled: params.isQuickProfitExitEnabled,
    targetProfitUsd: params.targetProfitUsd,
    isTimeManagementEnabled: params.isTimeManagementEnabled,
    maxOperationTimeMinutes: params.maxOperationTimeMinutes,
    timeDecayProfitTargetUsd: params.timeDecayProfitTargetUsd,
    isDynamicTrailingStopEnabled: params.isDynamicTrailingStopEnabled
  });

  const newPosition: TradePosition = {
    id: `pos_${Date.now()}_${params.symbol}`,
    symbol: params.symbol,
    coinName: params.coinName || params.symbol,
    side: params.side,
    entryPrice,
    currentPrice: entryPrice,
    sizeUsd: Number(effectiveSizeUsd.toFixed(2)),
    positionSizingPct: Number(((effectiveSizeUsd / account.demoBalanceUsd) * 100).toFixed(2)),
    leverage,
    initialStopLoss: sl,
    currentStopLoss: sl,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    highestPriceSinceEntry: entryPrice,
    lowestPriceSinceEntry: entryPrice,
    highestUnrealizedPnlUsd: 0,
    trailingStepsCount: 0,
    trailingLockedProfitUsd: 0,
    unrealizedPnlUsd: 0,
    unrealizedPnlPct: 0,
    realizedPnlUsd: 0,
    status: 'OPEN',
    closeReason: 'NONE',
    openTime: Date.now(),
    isQuickProfitExitEnabled: strategies.isQuickProfit,
    targetProfitUsd: strategies.targetProfitUsd,
    isTimeManagementEnabled: strategies.isTimeMgmt,
    maxOperationTimeMinutes: strategies.maxMinutes,
    timeDecayProfitTargetUsd: strategies.timeDecayTargetUsd,
    isDynamicTrailingStopEnabled: strategies.isDynamicTrailing,
    executionLogs: [
      `⚡ Gatilho HFT com Dados Imputados: Ordem ${params.side} aberta em ${params.symbol} a US$ ${entryPrice.toFixed(4)} ${hftSigText}`,
      `⚙️ Parâmetros: Tamanho: US$ ${effectiveSizeUsd.toFixed(2)} (Margem: US$ ${effectiveMargin.toFixed(2)} @ ${leverage}x) | SL: US$ ${sl} | TP1: US$ ${tp1}`,
      params.orderNote ? `📝 Nota: ${params.orderNote}` : `🤖 Calibrado com base nas recomendações do Analisador HFT e dados imputados.`,
      ...strategies.strategySummaryLogs
    ]
  };

  account.availableMarginUsd = Math.max(0, account.availableMarginUsd - effectiveMargin);
  positions.unshift(newPosition);

  saveTradingAccount(account);
  savePositions(positions);

  return {
    account,
    positions,
    log: `⚡ Gatilho HFT Executado: Ordem ${params.side} ABERTA em ${params.symbol} por US$ ${entryPrice} (Tamanho: US$ ${effectiveSizeUsd.toFixed(2)}).`,
    tradeOpened: true,
    position: newPosition
  };
}

/**
 * Tick loop to update positions with current market data and trailing stops
 */
export function updateActivePositions(
  currentCryptos: CryptoMention[],
  latestAiSignals: Record<string, HighFrequencyConfluenceResult>, // To check for divergence
  account: TradingAccount,
  positions: TradePosition[]
): { account: TradingAccount, positions: TradePosition[] } {
  
  let accountChanged = false;
  let positionsChanged = false;

  const openPositions = positions.filter(p => p.status === 'OPEN');

  // Compute BTC master direction once per tick loop
  const btcMasterDir = computeBtcMasterWeightedDirection(currentCryptos, {
    layer1And2: account.customWeightLayer1And2,
    technical: account.customWeightTechnical
  });

  openPositions.forEach(pos => {
    const marketData = currentCryptos.find(c => c.symbol === pos.symbol);
    if (!marketData || !marketData.priceUsd) return;

    const currentPrice = marketData.priceUsd;
    pos.currentPrice = currentPrice;
    
    // Update Highest/Lowest for Trailing Stop logic
    if (currentPrice > pos.highestPriceSinceEntry) pos.highestPriceSinceEntry = currentPrice;
    if (currentPrice < pos.lowestPriceSinceEntry) pos.lowestPriceSinceEntry = currentPrice;

    // Calculate PnL
    const priceDiff = pos.side === 'LONG' ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
    pos.unrealizedPnlPct = (priceDiff / pos.entryPrice) * 100;
    pos.unrealizedPnlUsd = (pos.sizeUsd * pos.unrealizedPnlPct) / 100;
    pos.highestUnrealizedPnlUsd = Math.max(pos.highestUnrealizedPnlUsd || 0, pos.unrealizedPnlUsd);

    let shouldClose = false;
    let closeReason: CloseReason = 'NONE';
    let closeLog = '';

    // Market Reversal Guard Check (Sistema Ponderado 14% Layer 1+2 / 86% Technical - BTC)
    if (account.isMarketReversalGuardEnabled !== false && btcMasterDir) {
      if (btcMasterDir.side !== pos.side) {
        pos.marketReversalWarning = true;
        const policy = account.marketReversalPolicy || 'AUTO_CLOSE';
        pos.marketReversalActionApplied = policy;

        if (policy === 'AUTO_CLOSE') {
          shouldClose = true;
          closeReason = 'MARKET_REVERSAL_BTC';
          closeLog = `🚨 Reversão de Mercado BTC (Score: ${btcMasterDir.score}/100 - ${btcMasterDir.statusLabel}): Posição ${pos.side} em ${pos.symbol} fechada automaticamente pelo Sistema Ponderado de Proteção (14%/86%).`;
        } else if (policy === 'TIGHTEN_STOP') {
          if (pos.side === 'LONG' && pos.currentStopLoss < pos.entryPrice) {
            pos.currentStopLoss = pos.entryPrice;
            pos.executionLogs.push(`🛡️ Guard de Reversão BTC (TIGHTEN_STOP): Stop Loss ajustado para Breakeven (US$ ${pos.entryPrice}) devido à reversão do mercado BTC (${btcMasterDir.statusLabel}).`);
            positionsChanged = true;
          } else if (pos.side === 'SHORT' && pos.currentStopLoss > pos.entryPrice) {
            pos.currentStopLoss = pos.entryPrice;
            pos.executionLogs.push(`🛡️ Guard de Reversão BTC (TIGHTEN_STOP): Stop Loss ajustado para Breakeven (US$ ${pos.entryPrice}) devido à reversão do mercado BTC (${btcMasterDir.statusLabel}).`);
            positionsChanged = true;
          }
        } else if (policy === 'ALERT_ONLY') {
          if (!pos.executionLogs.some(l => l.includes('Alerta de Reversão BTC'))) {
            pos.executionLogs.push(`⚠️ Alerta de Reversão de Mercado BTC: Direção dominante mudou para ${btcMasterDir.side} (${btcMasterDir.statusLabel}). Risco de reversão elevado.`);
            positionsChanged = true;
          }
        }
      } else {
        pos.marketReversalWarning = false;
      }
    }

    // 1. Check Quick Profit Target (Auto Take-Profit Scalper: 10 cents / US$ 0.10)
    const isQuickProfitEnabled = pos.isQuickProfitExitEnabled !== undefined
      ? pos.isQuickProfitExitEnabled
      : (account.isQuickProfitExitEnabled !== false);
    const targetProfit = typeof pos.targetProfitUsd === 'number' && pos.targetProfitUsd > 0
      ? pos.targetProfitUsd
      : (typeof account.targetProfitUsd === 'number' && account.targetProfitUsd > 0 ? account.targetProfitUsd : 0.10);

    if (isQuickProfitEnabled && pos.unrealizedPnlUsd >= targetProfit) {
      shouldClose = true;
      closeReason = 'TAKE_PROFIT';
      closeLog = `🎯 Alvo Scalper Atingido (+US$ ${pos.unrealizedPnlUsd.toFixed(2)} ≥ US$ ${targetProfit.toFixed(2)} / +${pos.unrealizedPnlPct.toFixed(2)}%)! Ordem finalizada no ganho e margem liberada para nova entrada.`;
    }

    // 2. Check Operation Time Management (Max 5 minutes -> close permitted only if >= 3 cents / US$ 0.03 positive)
    const isTimeManagementEnabled = pos.isTimeManagementEnabled !== undefined
      ? pos.isTimeManagementEnabled
      : (account.isTimeManagementEnabled !== false);
    const maxOperationMinutes = typeof pos.maxOperationTimeMinutes === 'number' && pos.maxOperationTimeMinutes > 0
      ? pos.maxOperationTimeMinutes
      : (account.maxOperationTimeMinutes || 5);
    const maxOperationTimeMs = maxOperationMinutes * 60 * 1000;
    const timeDecayProfitTargetUsd = typeof pos.timeDecayProfitTargetUsd === 'number' && pos.timeDecayProfitTargetUsd > 0
      ? pos.timeDecayProfitTargetUsd
      : (typeof account.timeDecayProfitTargetUsd === 'number' && account.timeDecayProfitTargetUsd > 0 ? account.timeDecayProfitTargetUsd : 0.03);

    const positionOpenTime = pos.openTime || Date.now();
    const elapsedMs = Date.now() - positionOpenTime;

    if (!shouldClose && isTimeManagementEnabled && elapsedMs >= maxOperationTimeMs && pos.unrealizedPnlUsd >= timeDecayProfitTargetUsd) {
      shouldClose = true;
      closeReason = 'TIME_EXPIRATION';
      const elapsedMinStr = (elapsedMs / (60 * 1000)).toFixed(1);
      closeLog = `⏱️ Tempo Limite (${elapsedMinStr} min ≥ ${maxOperationMinutes} min): Ordem finalizada com lucro permitido de +US$ ${pos.unrealizedPnlUsd.toFixed(2)} (≥ +US$ ${timeDecayProfitTargetUsd.toFixed(2)} / +3¢)! Margem liberada para nova entrada.`;
    }

    // 3. Check AI Divergence (Strict check: any change in direction closes the order)
    const latestSignal = latestAiSignals[pos.symbol];
    
    if (!shouldClose && latestSignal) {
      const latestSide = determineSignalSide(latestSignal);
      // If AI detected a solid new direction that opposes the current position side
      if (latestSide && latestSide !== pos.side) {
        shouldClose = true;
        closeReason = 'AI_DIVERGENCE';
        closeLog = `🤖 Divergência de Fluxo HFT: Direção reverteu para ${latestSide} (${latestSignal.finalSignal}). Posição encerrada instantaneamente para reanálise e nova entrada.`;
      }
    }

    // 4. Dynamic Trailing Stop:
    // - Stage 1: When peak profit reaches +$0.06 (6¢), move stop to lock +$0.03 (3¢) to protect the position.
    // - Stage 2: When peak profit reaches +$0.30 (30¢), move stop to lock +$0.15 (15¢) and continue trailing $0.15 behind peak profit.
    const isDynamicTrailingStopEnabled = pos.isDynamicTrailingStopEnabled !== undefined
      ? pos.isDynamicTrailingStopEnabled
      : (account.isDynamicTrailingStopEnabled !== false);

    if (!shouldClose && isDynamicTrailingStopEnabled) {
      const peakProfit = Math.max(pos.highestUnrealizedPnlUsd || 0, pos.unrealizedPnlUsd || 0);

      if (peakProfit >= 0.06) {
        let targetLockedProfitUsd = 0.03;
        let stageNumber = 1;
        let stageLabel = '1º Estágio (Pico ≥ 6¢ → Stop travado em +3¢)';

        if (peakProfit >= 0.30) {
          targetLockedProfitUsd = Number((peakProfit - 0.15).toFixed(2));
          stageNumber = 2;
          stageLabel = `2º Estágio (Pico +$${peakProfit.toFixed(2)} → Stop seguindo 15¢ atrás: +$${targetLockedProfitUsd.toFixed(2)})`;
        }

        const priceOffset = (targetLockedProfitUsd * pos.entryPrice) / pos.sizeUsd;

        if (pos.side === 'LONG') {
          const targetStopPrice = Number((pos.entryPrice + priceOffset).toFixed(pos.entryPrice < 1 ? 4 : 2));
          if (targetStopPrice > pos.currentStopLoss) {
            pos.currentStopLoss = targetStopPrice;
            pos.trailingStepsCount = stageNumber;
            pos.trailingLockedProfitUsd = targetLockedProfitUsd;

            pos.executionLogs.push(`🛡️ Trailing Stop Dinâmico: ${stageLabel}. Stop elevado para US$ ${targetStopPrice.toFixed(4)} (Lucro travado: +US$ ${targetLockedProfitUsd.toFixed(2)}).`);
            positionsChanged = true;
          }
        } else {
          // SHORT
          const targetStopPrice = Number((pos.entryPrice - priceOffset).toFixed(pos.entryPrice < 1 ? 4 : 2));
          if (targetStopPrice < pos.currentStopLoss) {
            pos.currentStopLoss = targetStopPrice;
            pos.trailingStepsCount = stageNumber;
            pos.trailingLockedProfitUsd = targetLockedProfitUsd;

            pos.executionLogs.push(`🛡️ Trailing Stop Dinâmico: ${stageLabel}. Stop rebaixado para US$ ${targetStopPrice.toFixed(4)} (Lucro travado: +US$ ${targetLockedProfitUsd.toFixed(2)}).`);
            positionsChanged = true;
          }
        }
      }
    } else if (!shouldClose && !isDynamicTrailingStopEnabled) {
      // Fallback TP1 / TP2 standard trailing stop
      if (pos.side === 'LONG') {
        if (pos.highestPriceSinceEntry >= pos.takeProfit1 && pos.currentStopLoss < pos.entryPrice) {
          pos.currentStopLoss = pos.entryPrice;
          pos.executionLogs.push(`Trailing Stop ativado: Stop Loss movido para Breakeven (US$ ${pos.entryPrice}) após atingir TP1.`);
          positionsChanged = true;
        }
        if (pos.highestPriceSinceEntry >= pos.takeProfit2 && pos.currentStopLoss < pos.takeProfit1) {
          pos.currentStopLoss = pos.takeProfit1;
          pos.executionLogs.push(`Trailing Stop ativado: Stop Loss protegido em TP1 (US$ ${pos.takeProfit1}) após atingir TP2.`);
          positionsChanged = true;
        }
      } else {
        if (pos.lowestPriceSinceEntry <= pos.takeProfit1 && pos.currentStopLoss > pos.entryPrice) {
          pos.currentStopLoss = pos.entryPrice;
          pos.executionLogs.push(`Trailing Stop ativado: Stop Loss movido para Breakeven (US$ ${pos.entryPrice}) após atingir TP1.`);
          positionsChanged = true;
        }
        if (pos.lowestPriceSinceEntry <= pos.takeProfit2 && pos.currentStopLoss > pos.takeProfit1) {
          pos.currentStopLoss = pos.takeProfit1;
          pos.executionLogs.push(`Trailing Stop ativado: Stop Loss protegido em TP1 (US$ ${pos.takeProfit1}) após atingir TP2.`);
          positionsChanged = true;
        }
      }
    }

    // 5. Check Stop Loss / Trailing Stop hits
    if (!shouldClose) {
      if (pos.side === 'LONG' && currentPrice <= pos.currentStopLoss) {
        shouldClose = true;
        const isProfitLocked = pos.currentStopLoss > pos.entryPrice || (pos.trailingLockedProfitUsd && pos.trailingLockedProfitUsd > 0);
        closeReason = isProfitLocked ? 'TRAILING_STOP' : 'STOP_LOSS';
        closeLog = isProfitLocked 
          ? `🛡️ Trailing Stop Dinâmico (Lucro Travado): Proteção acionada em US$ ${currentPrice} (PnL Realizado: ${pos.unrealizedPnlUsd >= 0 ? '+' : ''}$${pos.unrealizedPnlUsd.toFixed(2)} | Travado no Stop: +US$ ${(pos.trailingLockedProfitUsd || 0).toFixed(2)}).`
          : `Stop Loss de Invalidação acionado em US$ ${currentPrice}.`;
      } else if (pos.side === 'SHORT' && currentPrice >= pos.currentStopLoss) {
        shouldClose = true;
        const isProfitLocked = pos.currentStopLoss < pos.entryPrice || (pos.trailingLockedProfitUsd && pos.trailingLockedProfitUsd > 0);
        closeReason = isProfitLocked ? 'TRAILING_STOP' : 'STOP_LOSS';
        closeLog = isProfitLocked 
          ? `🛡️ Trailing Stop Dinâmico (Lucro Travado): Proteção acionada em US$ ${currentPrice} (PnL Realizado: ${pos.unrealizedPnlUsd >= 0 ? '+' : ''}$${pos.unrealizedPnlUsd.toFixed(2)} | Travado no Stop: +US$ ${(pos.trailingLockedProfitUsd || 0).toFixed(2)}).`
          : `Stop Loss de Invalidação acionado em US$ ${currentPrice}.`;
      }
    }

    // 6. Check Take Profit 3 (Max target hit)
    if (!shouldClose) {
      if (pos.side === 'LONG' && currentPrice >= pos.takeProfit3) {
        shouldClose = true;
        closeReason = 'TAKE_PROFIT';
        closeLog = `Take Profit Máximo (TP3) atingido com sucesso em US$ ${currentPrice}.`;
      } else if (pos.side === 'SHORT' && currentPrice <= pos.takeProfit3) {
        shouldClose = true;
        closeReason = 'TAKE_PROFIT';
        closeLog = `Take Profit Máximo (TP3) atingido com sucesso em US$ ${currentPrice}.`;
      }
    }

    if (shouldClose) {
      pos.status = 'CLOSED';
      pos.closeReason = closeReason;
      pos.closeTime = Date.now();
      pos.realizedPnlUsd = pos.unrealizedPnlUsd;
      pos.executionLogs.push(closeLog);
      
      account.availableMarginUsd += pos.sizeUsd;
      account.demoBalanceUsd += pos.realizedPnlUsd;
      account.totalRealizedPnlUsd += pos.realizedPnlUsd;
      
      accountChanged = true;
    }
    
    positionsChanged = true;
  });

  if (accountChanged) saveTradingAccount(account);
  if (positionsChanged) savePositions(positions);

  return { account, positions };
}

export function manuallyClosePosition(
  positionId: string, 
  account: TradingAccount, 
  positions: TradePosition[]
): { account: TradingAccount, positions: TradePosition[] } {
  const pos = positions.find(p => p.id === positionId);
  if (pos && pos.status === 'OPEN') {
    pos.status = 'CLOSED';
    pos.closeReason = 'MANUAL';
    pos.closeTime = Date.now();
    pos.realizedPnlUsd = pos.unrealizedPnlUsd;
    pos.executionLogs.push(`Fechamento manual executado em US$ ${pos.currentPrice}.`);
    
    account.availableMarginUsd += pos.sizeUsd;
    account.demoBalanceUsd += pos.realizedPnlUsd;
    account.totalRealizedPnlUsd += pos.realizedPnlUsd;
    
    saveTradingAccount(account);
    savePositions(positions);
  }
  return { account, positions };
}

