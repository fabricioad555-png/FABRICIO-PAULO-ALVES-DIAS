import { 
  TradePosition, 
  TradingAccount, 
  PositionSide, 
  CloseReason, 
  AssetSelectionMode, 
  ExecuteHftOrderParams,
  MarketReversalPolicy,
  BtcMarketDirectionResult,
  ArmedOrderTrigger,
  OrderTriggerMode,
  OperationMode
} from '../types/tradingTypes';
import { HighFrequencyConfluenceResult } from '../types/hftConfluenceTypes';
import { CryptoMention } from '../types';
import { generateLiveOrderFlowData } from './orderFlowDataService';
import { generateLocalHFTConfluenceAnalysis } from './hftConfluenceService';
import { analyzeTimesAndTradesTapeAi, generateLocalHftFlowAnalysis } from './hftFlowAnalysisService';
import { dispatchClientSideBinanceOrder } from './binanceService';

const STORAGE_KEY_POSITIONS = 'hft_demo_positions';
const STORAGE_KEY_ACCOUNT = 'hft_demo_account';
const STORAGE_KEY_ARMED_TRIGGERS = 'hft_armed_order_triggers';
export const TRADING_ACCOUNT_EVENT = 'hft_demo_account_updated';
export const ARMED_TRIGGERS_EVENT = 'hft_armed_triggers_updated';

export function notifyTradingAccountUpdate(account: TradingAccount) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TRADING_ACCOUNT_EVENT, { detail: account }));
  }
}

export function notifyArmedTriggersUpdate(triggers: ArmedOrderTrigger[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ARMED_TRIGGERS_EVENT, { detail: triggers }));
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

  let side: PositionSide = masterWeightedScore >= 50 ? 'LONG' : 'SHORT';
  const account = getTradingAccount();
  if (account.isInvertedExecutionEnabled !== false) {
    side = side === 'LONG' ? 'SHORT' : 'LONG';
  }

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

export function invertSide(side: PositionSide): PositionSide {
  return side === 'LONG' ? 'SHORT' : 'LONG';
}

// Default Account with sanity checks
export function getTradingAccount(): TradingAccount {
  const defaultAcc: TradingAccount = {
    operationMode: 'DEMO',
    demoBalanceUsd: 10000,
    availableMarginUsd: 10000,
    totalRealizedPnlUsd: 0,
    isAutoTradingEnabled: false,
    maxRiskPerTradePct: 2,
    targetProfitUsd: 0.02,
    isQuickProfitExitEnabled: true,
    maxOperationTimeMinutes: 1.5,
    timeDecayProfitTargetUsd: 0.00,
    isTimeManagementEnabled: true,
    trailingStepUsd: 0.03,
    isDynamicTrailingStopEnabled: true,
    isInvertedExecutionEnabled: true,
    isAiDivergenceExitEnabled: true,
    reentryCooldownSeconds: 20,
    isAggressionTriggerEnabled: true,
    isRobotBypassEnabled: false,
    minConfluenceScore: 50,
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
    
    // Check if Binance config is active to allow REAL mode
    const isBinanceActive = parsed.activeBroker === 'BINANCE' && parsed.binanceConfig?.isConnected;
    const operationMode = isBinanceActive ? (parsed.operationMode || 'DEMO') : 'DEMO';
    
    const activeBaseBalance = operationMode === 'REAL' && isBinanceActive 
      ? (parsed.binanceConfig?.accountBalanceUsdt || 0)
      : demoBalance;
    
    const allPositions = getPositions();
    const openPositions = allPositions.filter(p => p.status === 'OPEN');
    const closedPositions = allPositions.filter(p => p.status === 'CLOSED');
    const lockedMargin = openPositions.reduce((sum, p) => sum + (p.sizeUsd || 0), 0);
    const computedTotalRealizedPnl = closedPositions.reduce((sum, p) => sum + (p.realizedPnlUsd || 0), 0);
    const availableMargin = Math.max(0, activeBaseBalance - lockedMargin);

    return {
      ...defaultAcc,
      ...parsed,
      operationMode,
      demoBalanceUsd: demoBalance,
      availableMarginUsd: availableMargin,
      totalRealizedPnlUsd: computedTotalRealizedPnl
    };
  } catch {
    return defaultAcc;
  }
}

export function updateOperationMode(mode: OperationMode): TradingAccount {
  const account = getTradingAccount();
  account.operationMode = mode;
  saveTradingAccount(account);
  notifyTradingAccountUpdate(account);
  return account;
}

export function isRealAccountAuthenticated(account?: TradingAccount): boolean {
  const acc = account || getTradingAccount();
  if (acc.operationMode !== 'REAL') return false;
  return true;
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
    targetProfitUsd: Math.max(0.01, Number(targetProfitUsd) || 0.02),
    isQuickProfitExitEnabled: isEnabled
  };
  saveTradingAccount(updated);
  return updated;
}

export function updateTimeManagementSettings(maxMinutes: number, targetProfitUsd: number = 0.00, isEnabled: boolean = true): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    maxOperationTimeMinutes: Math.max(0.5, Number(maxMinutes) || 1.5),
    timeDecayProfitTargetUsd: Math.max(0, Number(targetProfitUsd) || 0.00),
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

export function updateInvertedExecutionSettings(isEnabled: boolean = true): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    isInvertedExecutionEnabled: isEnabled
  };
  saveTradingAccount(updated);
  return updated;
}

export function updateAiDivergenceSettings(isEnabled: boolean = true): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    isAiDivergenceExitEnabled: isEnabled
  };
  saveTradingAccount(updated);
  return updated;
}

export function updateReentryCooldownSettings(cooldownSeconds: number = 20): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    reentryCooldownSeconds: Math.max(0, Number(cooldownSeconds) || 20)
  };
  saveTradingAccount(updated);
  notifyTradingAccountUpdate(updated);
  return updated;
}

export function updateAggressionTriggerSettings(isEnabled: boolean = true): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    isAggressionTriggerEnabled: isEnabled
  };
  saveTradingAccount(updated);
  notifyTradingAccountUpdate(updated);
  return updated;
}

export function updateRobotBypassSettings(isEnabled: boolean = false): TradingAccount {
  const current = getTradingAccount();
  const updated: TradingAccount = {
    ...current,
    isRobotBypassEnabled: isEnabled
  };
  saveTradingAccount(updated);
  notifyTradingAccountUpdate(updated);
  return updated;
}

export function updateMinConfluenceScore(minScore: number = 50): TradingAccount {
  const current = getTradingAccount();
  const validScore = Math.max(40, Math.min(98, Math.round(Number(minScore) || 50)));
  const updated: TradingAccount = {
    ...current,
    minConfluenceScore: validScore
  };
  saveTradingAccount(updated);
  notifyTradingAccountUpdate(updated);
  return updated;
}

export function getArmedTriggers(): ArmedOrderTrigger[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEY_ARMED_TRIGGERS);
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

export function saveArmedTriggers(triggers: ArmedOrderTrigger[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ARMED_TRIGGERS, JSON.stringify(triggers));
    notifyArmedTriggersUpdate(triggers);
  } catch (err) {
    console.error('Failed to save armed triggers:', err);
  }
}

export function clearArmedTriggers() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_ARMED_TRIGGERS);
  notifyArmedTriggersUpdate([]);
}

export function armOrderTrigger(params: {
  symbol: string;
  coinName?: string;
  targetSide: PositionSide;
  sizeUsd?: number;
  leverage?: number;
  triggerMode?: OrderTriggerMode;
  minAggressionVolumeUsd?: number;
  autoRearmOnClose?: boolean;
  reason?: string;
}): { success: boolean; trigger?: ArmedOrderTrigger; log: string } {
  const triggers = getArmedTriggers();
  const openPositions = getPositions().filter(p => p.status === 'OPEN');

  // Check if position already open for symbol
  if (openPositions.some(p => p.symbol === params.symbol)) {
    return {
      success: false,
      log: `Já existe uma posição aberta para ${params.symbol}. Feche-a antes de armar novo gatilho.`
    };
  }

  const mode = params.triggerMode || 'INSTANT_AGGRESSION';
  const minVol = params.minAggressionVolumeUsd || 2500;
  const isAutoRearm = params.autoRearmOnClose ?? false;

  let conditionText = '';
  if (mode === 'INSTANT_AGGRESSION') {
    conditionText = params.targetSide === 'LONG'
      ? 'Aguardando Comprador Comprar Mais Caro (+US$) no Ask / Varredura de Alta'
      : 'Aguardando Vendedor Vender Mais Barato (-US$) no Bid / Varredura de Baixa';
  } else if (mode === 'WHALE_VOLUME') {
    conditionText = params.targetSide === 'LONG'
      ? `Aguardando Agressão Compradora de Baleia (≥ $${minVol.toLocaleString()} USD)`
      : `Aguardando Agressão Vendedora de Baleia (≥ $${minVol.toLocaleString()} USD)`;
  } else if (mode === 'CONFLUENCE_DUAL') {
    // CONFLUENCE_DUAL
    conditionText = params.targetSide === 'LONG'
      ? 'Aguardando Dupla Confirmação: Agressão no Ask + Confluência Técnica 14%/86% em Compra'
      : 'Aguardando Dupla Confirmação: Agressão no Bid + Confluência Técnica 14%/86% em Venda';
  } else if (mode === 'DISPLACEMENT_AI') {
    conditionText = params.targetSide === 'LONG'
      ? 'Aguardando Deslocamento: Demanda no Book + Agressão Compradora (LONG)'
      : 'Aguardando Deslocamento: Barreira no Book + Agressão Vendedora (SHORT)';
  }

  // Check if already armed
  const existingIndex = triggers.findIndex(t => t.symbol === params.symbol && t.status === 'ARMED');
  if (existingIndex >= 0) {
    triggers[existingIndex].targetSide = params.targetSide;
    triggers[existingIndex].triggerMode = mode;
    triggers[existingIndex].minAggressionVolumeUsd = minVol;
    triggers[existingIndex].autoRearmOnClose = isAutoRearm;
    triggers[existingIndex].sizeUsd = params.sizeUsd || triggers[existingIndex].sizeUsd;
    triggers[existingIndex].leverage = params.leverage || triggers[existingIndex].leverage;
    triggers[existingIndex].armedAt = Date.now();
    triggers[existingIndex].requiredCondition = conditionText;
    triggers[existingIndex].triggerLogs.push(`Gatilho reconfigurado para ${params.targetSide} [Modo: ${mode}] às ${new Date().toLocaleTimeString()}.`);
    saveArmedTriggers(triggers);
    return {
      success: true,
      trigger: triggers[existingIndex],
      log: `⚡ Gatilho de Agressão REARMADO para ${params.symbol} (${params.targetSide}) em modo ${mode}. Monitorando fluxo em tempo real!`
    };
  }

  const newTrigger: ArmedOrderTrigger = {
    id: `trigger_${Date.now()}_${params.symbol}`,
    symbol: params.symbol,
    coinName: params.coinName || params.symbol,
    targetSide: params.targetSide,
    sizeUsd: params.sizeUsd || 100,
    leverage: params.leverage || 5,
    armedAt: Date.now(),
    status: 'ARMED',
    triggerMode: mode,
    minAggressionVolumeUsd: minVol,
    autoRearmOnClose: isAutoRearm,
    reason: params.reason || `Gatilho de Emissão Inteligente por Agressão na Fita (${mode})`,
    requiredCondition: conditionText,
    lastTapeCheckTime: Date.now(),
    currentAggressionStatus: 'Aguardando Análise da Fita...',
    buyAggressionPct: 50,
    sellAggressionPct: 50,
    aggressionVolumeDetectedUsd: 0,
    triggerLogs: [
      `⚡ Gatilho Armado com Sucesso às ${new Date().toLocaleTimeString()} [Modo: ${mode}]. Monitorando Time & Trades segundo a segundo para liberar ordem de ${params.targetSide}.`
    ]
  };

  triggers.unshift(newTrigger);
  saveArmedTriggers(triggers);

  return {
    success: true,
    trigger: newTrigger,
    log: `⚡ Gatilho de Emissão Armado para ${params.symbol} (${params.targetSide}) [Modo: ${mode}]! A ordem será liberada no milissegundo em que as condições forem validadas.`
  };
}

export function cancelArmedTrigger(triggerId: string): { success: boolean; log: string } {
  const triggers = getArmedTriggers();
  const trigger = triggers.find(t => t.id === triggerId);
  if (trigger) {
    trigger.status = 'CANCELLED';
    trigger.triggerLogs.push(`Gatilho cancelado pelo usuário às ${new Date().toLocaleTimeString()}.`);
    saveArmedTriggers(triggers);
    return { success: true, log: `Gatilho de ${trigger.symbol} cancelado com sucesso.` };
  }
  return { success: false, log: 'Gatilho não encontrado.' };
}

export function forceExecuteArmedTriggerImmediately(
  triggerId: string,
  cryptos: CryptoMention[]
): { success: boolean; log: string; position?: TradePosition } {
  const triggers = getArmedTriggers();
  const trigger = triggers.find(t => t.id === triggerId);
  if (!trigger || trigger.status !== 'ARMED') {
    return { success: false, log: 'Gatilho não está em estado armado para execução forçada.' };
  }

  const cryptoObj = cryptos.find(c => c.symbol === trigger.symbol) || ({
    symbol: trigger.symbol,
    name: trigger.coinName || trigger.symbol,
    priceUsd: 100,
    change24h: 0
  } as any);

  const flow = generateLiveOrderFlowData(cryptoObj);
  const signal = generateLocalHFTConfluenceAnalysis(cryptoObj, flow);
  const currentAcc = getTradingAccount();
  const currentPositions = getPositions();

  const res = executeDirectTradeForCrypto(cryptoObj, trigger.targetSide, signal, currentAcc, currentPositions);
  if (res.tradeOpened && res.positions[0]) {
    trigger.status = 'TRIGGERED';
    trigger.executedPositionId = res.positions[0].id;
    trigger.executedPrice = res.positions[0].entryPrice;
    trigger.executedAt = Date.now();
    trigger.triggerLogs.push(`⚡ Execução Imediata Forçada pelo Trader em US$ ${res.positions[0].entryPrice} às ${new Date().toLocaleTimeString()}.`);
    saveArmedTriggers(triggers);
    return {
      success: true,
      log: `⚡ Disparo Imediato Executado: Posição ${trigger.targetSide} aberta em ${trigger.symbol} a US$ ${res.positions[0].entryPrice}!`,
      position: res.positions[0]
    };
  }

  return { success: false, log: res.log };
}

export function armAllTop3ParetoTriggers(
  cryptos: CryptoMention[],
  top3Candidates: Array<{ symbol: string; name: string; recommendedAction: string }>,
  sizeUsd: number = 100,
  leverage: number = 5,
  triggerMode: OrderTriggerMode = 'INSTANT_AGGRESSION'
): { countArmed: number; logs: string[] } {
  let count = 0;
  const logs: string[] = [];

  for (const item of top3Candidates) {
    const isLong = item.recommendedAction.includes('COMPRA') || item.recommendedAction.includes('LONG');
    const side: PositionSide = isLong ? 'LONG' : 'SHORT';
    const res = armOrderTrigger({
      symbol: item.symbol,
      coinName: item.name,
      targetSide: side,
      sizeUsd,
      leverage,
      triggerMode,
      reason: `Gatilho Rápido em Lote Top 3 Pareto`
    });
    if (res.success) {
      count++;
      logs.push(res.log);
    }
  }

  return { countArmed: count, logs };
}

export function evaluateAndExecuteArmedTriggers(
  cryptos: CryptoMention[]
): { executedTriggers: ArmedOrderTrigger[]; logs: string[] } {
  const triggers = getArmedTriggers();
  const armedList = triggers.filter(t => t.status === 'ARMED');
  if (armedList.length === 0) return { executedTriggers: [], logs: [] };

  const account = getTradingAccount();
  const positions = getPositions();
  const openPositions = positions.filter(p => p.status === 'OPEN');

  const executedTriggers: ArmedOrderTrigger[] = [];
  const logs: string[] = [];
  let triggersUpdated = false;

  for (const trigger of armedList) {
    if (openPositions.length >= MAX_CONCURRENT_POSITIONS) {
      trigger.currentAggressionStatus = 'Em espera (Máximo de 3 posições simultâneas atingido)';
      triggersUpdated = true;
      continue;
    }

    if (openPositions.some(p => p.symbol === trigger.symbol)) {
      trigger.status = 'CANCELLED';
      trigger.triggerLogs.push(`Posição já aberta para ${trigger.symbol}. Gatilho desarmado.`);
      triggersUpdated = true;
      continue;
    }

    const remainingCooldown = getSymbolCooldownRemainingSeconds(trigger.symbol, positions, account.reentryCooldownSeconds);
    if (remainingCooldown > 0) {
      trigger.currentAggressionStatus = `Aguardando Cooldown Pós-Fechamento (${remainingCooldown}s)`;
      triggersUpdated = true;
      continue;
    }

    const cryptoObj = cryptos.find(c => c.symbol === trigger.symbol) || ({
      symbol: trigger.symbol,
      name: trigger.coinName || trigger.symbol,
      priceUsd: 100,
      change24h: 0
    } as any);

    const flowData = generateLiveOrderFlowData(cryptoObj);
    const tapeAiResult = analyzeTimesAndTradesTapeAi(trigger.symbol, cryptoObj.priceUsd, flowData.timesAndTrades);
    trigger.lastTapeCheckTime = Date.now();
    trigger.buyAggressionPct = tapeAiResult.buyAggressionPct;
    trigger.sellAggressionPct = tapeAiResult.sellAggressionPct;

    const isLong = trigger.targetSide === 'LONG';
    const isTapeAllowed = isLong 
      ? tapeAiResult.executionGate.isLongAllowed 
      : tapeAiResult.executionGate.isShortAllowed;

    const detectedVolume = isLong 
      ? tapeAiResult.buyerEscalation.totalVolumeUsd 
      : tapeAiResult.sellerEscalation.totalVolumeUsd;
    trigger.aggressionVolumeDetectedUsd = detectedVolume;

    // Check Trigger Mode Specific Logic
    const mode = trigger.triggerMode || 'INSTANT_AGGRESSION';
    let isTriggerReadyToFire = false;
    let modeDiag = '';

    if (mode === 'INSTANT_AGGRESSION') {
      isTriggerReadyToFire = isTapeAllowed;
      modeDiag = isTapeAllowed ? 'Agressão Instantânea Validada' : (isLong ? tapeAiResult.executionGate.reasonLong : tapeAiResult.executionGate.reasonShort);
    } else if (mode === 'WHALE_VOLUME') {
      const minVol = trigger.minAggressionVolumeUsd || 2500;
      const hasVolume = detectedVolume >= minVol || (isLong ? tapeAiResult.buyAggressionPct >= 70 : tapeAiResult.sellAggressionPct >= 70);
      isTriggerReadyToFire = isTapeAllowed && hasVolume;
      modeDiag = isTriggerReadyToFire 
        ? `Agressão Baleia Confirmada ($${Math.round(detectedVolume).toLocaleString()} USD)` 
        : `Aguardando Volume (Atual: $${Math.round(detectedVolume).toLocaleString()} / Alvo: $${minVol.toLocaleString()})`;
    } else if (mode === 'CONFLUENCE_DUAL') {
      const localSignal = generateLocalHFTConfluenceAnalysis(cryptoObj, flowData);
      const isConfluenceAgreeing = (isLong && (localSignal.finalSignal.includes('COMPRA') || localSignal.confluenceScorePct >= 50))
        || (!isLong && (localSignal.finalSignal.includes('VENDA') || localSignal.confluenceScorePct >= 50));
      
      isTriggerReadyToFire = isTapeAllowed && isConfluenceAgreeing;
      modeDiag = isTriggerReadyToFire
        ? `Dupla Confirmação OK (Fita + Confluência ${localSignal.confluenceScorePct}%)`
        : `Aguardando Alinhamento Duplo (Confluência: ${localSignal.confluenceScorePct}% ${localSignal.finalSignal})`;
    } else if (mode === 'DISPLACEMENT_AI') {
      const fullAnalysis = generateLocalHftFlowAnalysis(cryptoObj.symbol, cryptoObj.priceUsd, flowData.timesAndTrades, flowData as any);
      fullAnalysis.tapeAiAnalysis = tapeAiResult;
      const bookSig = fullAnalysis.orderBookReading.signal.signal;
      const tapeSig = tapeAiResult.dominantAggression;
      
      const isDisplacementLong = (bookSig === 'COMPRA' || bookSig === ('FORTE_COMPRA' as any)) && tapeSig === 'BUY';
      const isDisplacementShort = (bookSig === 'VENDA' || bookSig === ('FORTE_VENDA' as any)) && tapeSig === 'SELL';

      isTriggerReadyToFire = isLong ? isDisplacementLong : isDisplacementShort;
      
      modeDiag = isTriggerReadyToFire
        ? `Deslocamento IA Confirmado (Book ${bookSig} + Tape ${tapeSig})`
        : `Aguardando Deslocamento (Book atual: ${bookSig} | Tape: ${tapeSig})`;
    }

    if (isLong) {
      trigger.currentAggressionStatus = tapeAiResult.buyerEscalation.isActive
        ? `🟢 Comprador Pagando Mais Caro (+${tapeAiResult.buyerEscalation.priceDifferencePct.toFixed(2)}%) | ${modeDiag}`
        : (isTapeAllowed ? `🟢 Pressão Compradora (${tapeAiResult.buyAggressionPct}%) | ${modeDiag}` : `⛔ ${tapeAiResult.executionGate.reasonLong}`);
    } else {
      trigger.currentAggressionStatus = tapeAiResult.sellerEscalation.isActive
        ? `🔴 Vendedor Batendo Mais Barato (-${tapeAiResult.sellerEscalation.priceDifferencePct.toFixed(2)}%) | ${modeDiag}`
        : (isTapeAllowed ? `🔴 Pressão Vendedora (${tapeAiResult.sellAggressionPct}%) | ${modeDiag}` : `⛔ ${tapeAiResult.executionGate.reasonShort}`);
    }

    if (isTriggerReadyToFire || account.isRobotBypassEnabled) {
      trigger.status = 'TRIGGERED';
      trigger.executedAt = Date.now();
      const fireLog = isLong
        ? `⚡ [GATILHO DE EMISSÃO DISPARADO]: Ordem de COMPRA em ${trigger.symbol} liberada com sucesso! [Modo: ${mode}${account.isRobotBypassEnabled ? ' + BYPASS' : ''}] Agressão compradora no Time & Trades a favor (${tapeAiResult.buyerEscalation.isActive ? 'Comprador Comprando Mais Caro no Ask' : 'Pressão Compradora ' + tapeAiResult.buyAggressionPct + '%'}).`
        : `⚡ [GATILHO DE EMISSÃO DISPARADO]: Ordem de VENDA em ${trigger.symbol} liberada com sucesso! [Modo: ${mode}${account.isRobotBypassEnabled ? ' + BYPASS' : ''}] Agressão vendedora no Time & Trades a favor (${tapeAiResult.sellerEscalation.isActive ? 'Vendedor Vendendo Mais Barato no Bid' : 'Pressão Vendedora ' + tapeAiResult.sellAggressionPct + '%'}).`;
      
      trigger.triggerLogs.push(fireLog);
      logs.push(fireLog);
      executedTriggers.push(trigger);
      triggersUpdated = true;

      const flow = generateLiveOrderFlowData(cryptoObj);
      const signal = generateLocalHFTConfluenceAnalysis(cryptoObj, flow);
      const currentAcc = getTradingAccount();
      const currentPositions = getPositions();
      const res = executeDirectTradeForCrypto(cryptoObj, trigger.targetSide, signal, currentAcc, currentPositions);
      if (res.tradeOpened && res.positions[0]) {
        trigger.executedPositionId = res.positions[0].id;
        trigger.executedPrice = res.positions[0].entryPrice;
      }
    } else {
      triggersUpdated = true;
    }
  }

  if (triggersUpdated) {
    saveArmedTriggers(triggers);
  }

  return { executedTriggers, logs };
}

export function getPositions(): TradePosition[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEY_POSITIONS);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((p: any) => ({
          ...p,
          sizeUsd: typeof p.sizeUsd === 'number' && !isNaN(p.sizeUsd) ? p.sizeUsd : 100,
          leverage: typeof p.leverage === 'number' && !isNaN(p.leverage) ? p.leverage : 5,
          entryPrice: typeof p.entryPrice === 'number' && !isNaN(p.entryPrice) ? p.entryPrice : 0,
          currentPrice: typeof p.currentPrice === 'number' && !isNaN(p.currentPrice) ? p.currentPrice : (p.entryPrice || 0),
          unrealizedPnlUsd: typeof p.unrealizedPnlUsd === 'number' && !isNaN(p.unrealizedPnlUsd) ? p.unrealizedPnlUsd : 0,
          unrealizedPnlPct: typeof p.unrealizedPnlPct === 'number' && !isNaN(p.unrealizedPnlPct) ? p.unrealizedPnlPct : 0,
          realizedPnlUsd: typeof p.realizedPnlUsd === 'number' && !isNaN(p.realizedPnlUsd) ? p.realizedPnlUsd : 0,
          highestUnrealizedPnlUsd: typeof p.highestUnrealizedPnlUsd === 'number' && !isNaN(p.highestUnrealizedPnlUsd) ? p.highestUnrealizedPnlUsd : 0,
          trailingLockedProfitUsd: typeof p.trailingLockedProfitUsd === 'number' && !isNaN(p.trailingLockedProfitUsd) ? p.trailingLockedProfitUsd : 0,
          targetProfitUsd: typeof p.targetProfitUsd === 'number' && !isNaN(p.targetProfitUsd) ? p.targetProfitUsd : 0.02,
          currentStopLoss: typeof p.currentStopLoss === 'number' && !isNaN(p.currentStopLoss) ? p.currentStopLoss : (p.entryPrice || 0),
          trailingStepsCount: typeof p.trailingStepsCount === 'number' && !isNaN(p.trailingStepsCount) ? p.trailingStepsCount : 0,
        }));
      }
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
  const positions = getPositions();
  const openPositions = positions.filter(p => p.status === 'OPEN');
  savePositions(openPositions);

  const account = getTradingAccount();
  account.totalRealizedPnlUsd = 0;
  saveTradingAccount(account);
  notifyTradingAccountUpdate(account);
}

// Risk Management Constants
const MAX_CONCURRENT_POSITIONS = 3;
export const DEFAULT_REENTRY_COOLDOWN_SECONDS = 20;

/**
 * Calculates remaining seconds of cooldown for a crypto symbol after a position has finalized/closed.
 * Rule: Never execute a new order for a crypto symbol that just finalized until the cooldown period has elapsed.
 * Available options: 00:20 (20s), 00:01:00 (60s), 00:03:00 (180s), 00:05:00 (300s), 00:10:00 (600s).
 */
export function getSymbolCooldownRemainingSeconds(
  symbol: string, 
  positions?: TradePosition[], 
  configuredCooldownSeconds?: number
): number {
  const storedPositions = getPositions();
  const passedPositions = positions || [];
  // Combine passed positions and stored positions to ensure closed positions are never missed even if passed array is filtered
  const posMap = new Map<string, TradePosition>();
  for (const p of [...storedPositions, ...passedPositions]) {
    if (p && p.id) {
      posMap.set(p.id, p);
    }
  }
  const allPositions = Array.from(posMap.values());

  const cooldownSec = typeof configuredCooldownSeconds === 'number' && configuredCooldownSeconds >= 0
    ? configuredCooldownSeconds
    : (getTradingAccount().reentryCooldownSeconds ?? DEFAULT_REENTRY_COOLDOWN_SECONDS);

  if (cooldownSec <= 0) return 0;

  const closedForSymbol = allPositions.filter(
    p => p.symbol === symbol && p.status === 'CLOSED' && typeof p.closeTime === 'number' && p.closeTime > 0
  );
  if (closedForSymbol.length === 0) return 0;

  const lastCloseTime = Math.max(...closedForSymbol.map(p => p.closeTime || 0));
  if (!lastCloseTime) return 0;

  const elapsedSec = (Date.now() - lastCloseTime) / 1000;
  if (elapsedSec < cooldownSec) {
    return Math.ceil(cooldownSec - elapsedSec);
  }
  return 0;
}

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
    : (typeof account.targetProfitUsd === 'number' && account.targetProfitUsd > 0 ? account.targetProfitUsd : 0.02);

  const accountTimeMgmt = account.isTimeManagementEnabled !== false;
  const isTimeMgmt = overrides?.isTimeManagementEnabled !== undefined
    ? (overrides.isTimeManagementEnabled && accountTimeMgmt)
    : accountTimeMgmt;
  const maxMinutes = typeof overrides?.maxOperationTimeMinutes === 'number' && overrides.maxOperationTimeMinutes > 0
    ? overrides.maxOperationTimeMinutes
    : (typeof account.maxOperationTimeMinutes === 'number' && account.maxOperationTimeMinutes > 0 ? account.maxOperationTimeMinutes : 1.5);
  const timeDecayTargetUsd = typeof overrides?.timeDecayProfitTargetUsd === 'number' && overrides.timeDecayProfitTargetUsd >= 0
    ? overrides.timeDecayProfitTargetUsd
    : (typeof account.timeDecayProfitTargetUsd === 'number' && account.timeDecayProfitTargetUsd >= 0 ? account.timeDecayProfitTargetUsd : 0.00);

  const isDynamicTrailing = overrides?.isDynamicTrailingStopEnabled !== undefined
    ? overrides.isDynamicTrailingStopEnabled
    : (account.isDynamicTrailingStopEnabled !== false);

  const maxMinLabel = maxMinutes === 1.5 ? '1m 30s' : `${maxMinutes} min`;

  const strategySummaryLogs: string[] = [
    `📋 Reconhecimento de Estratégias na Emissão:`,
    isQuickProfit
      ? `🎯 [ESTRATÉGIA INSERIDA] Auto Take-Profit Scalper (+10¢): ATIVO (Alvo: +US$ ${targetProfitUsd.toFixed(2)})`
      : `🎯 [ESTRATÉGIA NÃO INSERIDA] Auto Take-Profit Scalper (+10¢): DESATIVADO conforme seleção`,
    isTimeMgmt
      ? `⏱️ [ESTRATÉGIA INSERIDA] Gerenciamento de Tempo HFT: ATIVO (Máx ${maxMinLabel} | Encerramento Imediato após Tempo Máximo)`
      : `⏱️ [ESTRATÉGIA NÃO INSERIDA] Gerenciamento de Tempo HFT (${maxMinLabel}): DESATIVADO conforme seleção`,
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
export function determineSignalSide(signal: HighFrequencyConfluenceResult, isInverted: boolean = false): PositionSide | null {
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

  let rawSide: PositionSide | null = null;

  // Buy trigger based on the weighted decision system (LONG)
  if (masterWeightedScore >= 56) {
    rawSide = 'LONG';
  } else if (masterWeightedScore <= 48) {
    // Sell trigger based on the weighted decision system (SHORT)
    rawSide = 'SHORT';
  } else {
    // If no clear threshold is reached, check legacy string patterns as robust fallback
    const finalSig = (signal.finalSignal || '').toUpperCase();
    const primarySig = (signal.primaryAnalysis?.primarySignal || '').toUpperCase();
    const secondarySig = (signal.secondaryValidation?.secondaryConfirmationSignal || '').toUpperCase();

    if (finalSig.includes('AGUARDAR') && !primarySig.includes('COMPRA') && !primarySig.includes('VENDA')) {
      rawSide = null;
    } else if (
      finalSig.includes('COMPRA') || 
      finalSig.includes('LONG') || 
      finalSig.includes('BUY') ||
      primarySig.includes('COMPRA') ||
      secondarySig.includes('COMPRA')
    ) {
      rawSide = 'LONG';
    } else if (
      finalSig.includes('VENDA') || 
      finalSig.includes('SHORT') || 
      finalSig.includes('SELL') ||
      primarySig.includes('VENDA') ||
      secondarySig.includes('VENDA')
    ) {
      rawSide = 'SHORT';
    }
  }

  if (!rawSide) return null;
  return isInverted ? (rawSide === 'LONG' ? 'SHORT' : 'LONG') : rawSide;
}

/**
 * Attempts to execute a trade based on AI Confluence Signal
 */
/**
 * Envia a posicao recem-aberta para a Binance.
 *
 * Existiam tres caminhos que abriam posicao e so um enviava a ordem de verdade.
 * Nos outros dois a posicao aparecia no painel e nada acontecia na corretora,
 * o que da a impressao de estar operando sem estar. Agora os tres passam por
 * aqui.
 *
 * Nao lanca: uma falha de envio fica registada nos logs da posicao.
 */
export function enviarOrdemParaBinance(account: TradingAccount, novaPosicao: TradePosition) {
  const cfg = account.binanceConfig;

  if (account.operationMode !== 'REAL' || !cfg?.isConnected) {
    const posicoes = getPositions();
    const alvo = posicoes.find(p => p.id === novaPosicao.id);
    if (alvo) {
      alvo.executionLogs.push(
        account.operationMode !== 'REAL'
          ? 'Modo Demo: posicao simulada, nenhuma ordem foi enviada a Binance.'
          : 'Sem ligacao a Binance: posicao simulada, nenhuma ordem foi enviada.'
      );
      savePositions(posicoes);
    }
    return;
  }

  dispatchClientSideBinanceOrder({
    apiKey: cfg.apiKey,
    apiSecret: cfg.apiSecret,
    isTestnet: cfg.environment === 'testnet',
    accountType: cfg.accountType,
    symbol: novaPosicao.symbol,
    side: novaPosicao.side === 'LONG' ? 'BUY' : 'SELL',
    sizeUsd: novaPosicao.sizeUsd,
    priceUsd: novaPosicao.entryPrice,
    type: 'MARKET'
  }).then(res => {
    const posicoes = getPositions();
    const alvo = posicoes.find(p => p.id === novaPosicao.id);
    if (!alvo) return;
    alvo.executionLogs.push(
      res.success
        ? `Ordem aceite pela Binance (${cfg.accountType === 'FUTURES' ? 'Futuros USD-M' : 'Spot'}). ID: ${res.orderId}`
        : `Binance recusou a ordem: ${res.message}`
    );
    savePositions(posicoes);
  }).catch(err => {
    const posicoes = getPositions();
    const alvo = posicoes.find(p => p.id === novaPosicao.id);
    if (!alvo) return;
    alvo.executionLogs.push(`Falha ao enviar a ordem a Binance: ${err?.message || err}`);
    savePositions(posicoes);
  });
}

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

  const rawSide = forcedSide || determineSignalSide(signal, false);
  if (!rawSide) {
    return { account, positions, log: `Sinal Neutro/Aguardar para ${signal.symbol}. Nenhuma ação executada.`, tradeOpened: false };
  }

  const isInverted = account.isInvertedExecutionEnabled !== false;
  const side = isInverted ? (rawSide === 'LONG' ? 'SHORT' : 'LONG') : rawSide;

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

  // Rule 2b: Configurable Post-Close Cooldown per symbol (20s, 1m, 3m, 5m, 10m)
  const remainingCooldown = getSymbolCooldownRemainingSeconds(signal.symbol, positions, account.reentryCooldownSeconds);
  if (remainingCooldown > 0) {
    return { account, positions, log: `⏳ Cooldown pós-fechamento ativo para ${signal.symbol}: Liberado para nova ordem em ${remainingCooldown}s (Ordem anterior encerrada recentemente).`, tradeOpened: false };
  }

  // Rule 3: Sniper Precision Score Filter (Adaptive: Base Meta 50%, +3% for 2nd order, +7% for 3rd)
  if (!bypassFilters && !account.isRobotBypassEnabled) {
    const currentOpenCount = openPositions.length;
    const baseTarget = account.minConfluenceScore ?? 50;
    const requiredScore = currentOpenCount === 0 ? baseTarget : currentOpenCount === 1 ? Math.min(98, baseTarget + 3) : Math.min(98, baseTarget + 7);
    if (signal.confluenceScorePct < requiredScore) {
      return { account, positions, log: `Score de Precisão (${signal.confluenceScorePct}%) abaixo do Filtro Sniper mínimo adaptativo (${requiredScore}%) para ${signal.symbol}.`, tradeOpened: false };
    }
  }

  // Rule 4: Anti-Trap Filter (Nunca comprar próximo à resistência / Nunca vender próximo ao suporte)
  const entryPriceCheck = currentPrice > 0 ? currentPrice : (signal.currentPriceUsd || 1);
  if (!bypassFilters && !account.isRobotBypassEnabled && signal.secondaryValidation?.visualBookAnalysis) {
    const { askWallPrice, bidWallPrice } = signal.secondaryValidation.visualBookAnalysis;
    const proximityThreshold = 0.005; // 0.5% proximity warning
    
    if (side === 'LONG' && askWallPrice > entryPriceCheck) {
      const distanceToRes = (askWallPrice - entryPriceCheck) / entryPriceCheck;
      if (distanceToRes < proximityThreshold) {
        return { account, positions, log: `Filtro Anti-Armadilha (Sinc. Book): Compra abortada para ${signal.symbol}. Preço atual (US$ ${entryPriceCheck.toFixed(4)}) perigosamente próximo da muralha de venda/resistência (US$ ${askWallPrice.toFixed(4)}).`, tradeOpened: false };
      }
    }
    
    if (side === 'SHORT' && bidWallPrice > 0 && entryPriceCheck > bidWallPrice) {
      const distanceToSup = (entryPriceCheck - bidWallPrice) / entryPriceCheck;
      if (distanceToSup < proximityThreshold) {
        return { account, positions, log: `Filtro Anti-Armadilha (Sinc. Book): Venda abortada para ${signal.symbol}. Preço atual (US$ ${entryPriceCheck.toFixed(4)}) perigosamente próximo da muralha de compra/suporte (US$ ${bidWallPrice.toFixed(4)}).`, tradeOpened: false };
      }
    }
  }

  // Rule 5: Gatilho de Execução Time & Trades (Liberar SOMENTE se agressão for a favor da ordem executada)
  let tapeAiResult: any = null;
  if (!bypassFilters && account.isAggressionTriggerEnabled !== false && !account.isRobotBypassEnabled) {
    const coinObj = { symbol: signal.symbol, name: signal.coinName || signal.symbol, priceUsd: entryPriceCheck, change24h: 0 } as any;
    const flowData = generateLiveOrderFlowData(coinObj);
    tapeAiResult = analyzeTimesAndTradesTapeAi(signal.symbol, entryPriceCheck, flowData.timesAndTrades);

    if (side === 'LONG' && !tapeAiResult.executionGate.isLongAllowed) {
      return { 
        account, 
        positions, 
        log: `🛡️ Gatilho de Agressão Time&Trades: Compra (${side}) bloqueada para ${signal.symbol}. ${tapeAiResult.executionGate.reasonLong}`, 
        tradeOpened: false 
      };
    }

    if (side === 'SHORT' && !tapeAiResult.executionGate.isShortAllowed) {
      return { 
        account, 
        positions, 
        log: `🛡️ Gatilho de Agressão Time&Trades: Venda (${side}) bloqueada para ${signal.symbol}. ${tapeAiResult.executionGate.reasonShort}`, 
        tradeOpened: false 
      };
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
    isAggressionTriggerEnabled: account.isAggressionTriggerEnabled !== false,
    aggressionTriggerStatus: tapeAiResult 
      ? (side === 'LONG' 
          ? (tapeAiResult.buyerEscalation.isActive ? 'Comprador Comprando Mais Caro' : 'Agressão Compradora A Favor') 
          : (tapeAiResult.sellerEscalation.isActive ? 'Vendedor Vendendo Mais Barato' : 'Agressão Vendedora A Favor'))
      : 'Gatilho A Favor Confirmado',
    executionLogs: [
      `Posição ${side} EXECUTADA A MERCADO em US$ ${entryPrice.toFixed(4)} (Sinal IA: ${signal.finalSignal})`,
      `Gestão de Risco: Stop Loss inicial armado em US$ ${sl} | TP1: US$ ${tp1} | TP2: US$ ${tp2}`,
      ...(account.isAggressionTriggerEnabled !== false 
        ? [`🛡️ [GATILHO DE AGRESSÃO LIBERADO]: Agressão no Time & Trades a favor (${side === 'LONG' ? (tapeAiResult?.buyerEscalation.isActive ? 'Comprador Comprando Mais Caro no Ask' : 'Pressão Compradora') : (tapeAiResult?.sellerEscalation.isActive ? 'Vendedor Vendendo Mais Barato no Bid' : 'Pressão Vendedora')})`] 
        : [`🛡️ [GATILHO DE AGRESSÃO]: Desativado nas configurações`]),
      ...strategies.strategySummaryLogs
    ]
  };

  // Update Account Margin
  account.availableMarginUsd = Math.max(0, account.availableMarginUsd - desiredSizeUsd);
  positions.unshift(newPosition);
  
  saveTradingAccount(account);
  savePositions(positions);
  enviarOrdemParaBinance(account, newPosition);
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
  requestedSide: PositionSide,
  signal: HighFrequencyConfluenceResult,
  account: TradingAccount,
  positions: TradePosition[]
): { account: TradingAccount, positions: TradePosition[], log: string, tradeOpened: boolean } {
  const isInverted = account.isInvertedExecutionEnabled !== false;
  const side = isInverted ? invertSide(requestedSide) : requestedSide;
  const openPositions = positions.filter(p => p.status === 'OPEN');

  if (openPositions.length >= MAX_CONCURRENT_POSITIONS) {
    return { account, positions, log: `Limite máximo de ${MAX_CONCURRENT_POSITIONS} posições abertas já atingido. Feche uma posição para abrir nova.`, tradeOpened: false };
  }

  const hasOpenForSymbol = openPositions.some(p => p.symbol === crypto.symbol);
  if (hasOpenForSymbol) {
    return { account, positions, log: `Já existe uma posição aberta para ${crypto.symbol}.`, tradeOpened: false };
  }

  // Cooldown check post-close (20s, 1m, 3m, 5m, 10m)
  const remainingCooldown = getSymbolCooldownRemainingSeconds(crypto.symbol, positions, account.reentryCooldownSeconds);
  if (remainingCooldown > 0) {
    return { account, positions, log: `⏳ Cooldown pós-fechamento ativo para ${crypto.symbol}: Liberado para nova ordem em ${remainingCooldown}s após o fechamento da ordem anterior.`, tradeOpened: false };
  }

  // Anti-Trap & Aggression checks are advisory for manual trades to ensure execution succeeds
  const entryPriceCheck = crypto.priceUsd > 0 ? crypto.priceUsd : (signal.currentPriceUsd || 1);
  let tapeAiResult: any = null;
  if (account.isAggressionTriggerEnabled) {
    const flowData = generateLiveOrderFlowData(crypto);
    tapeAiResult = analyzeTimesAndTradesTapeAi(crypto.symbol, entryPriceCheck, flowData.timesAndTrades);
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
  enviarOrdemParaBinance(account, newPosition);

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

  const isInverted = account.isInvertedExecutionEnabled !== false;
  const side = isInverted ? invertSide(params.side) : params.side;

  // Anti-Trap Filter
  if (params.hftAnalysis?.secondaryValidation?.visualBookAnalysis) {
    const { askWallPrice, bidWallPrice } = params.hftAnalysis.secondaryValidation.visualBookAnalysis;
    const entryPriceCheck = params.entryPrice || params.currentPrice || 1;
    const proximityThreshold = 0.005; // 0.5% proximity warning
    
    if (side === 'LONG' && askWallPrice > entryPriceCheck) {
      const distanceToRes = (askWallPrice - entryPriceCheck) / entryPriceCheck;
      if (distanceToRes < proximityThreshold) {
        return { 
          account, 
          positions, 
          log: `Filtro Anti-Armadilha (Sinc. Book): Compra HFT bloqueada para ${params.symbol}. Preço (US$ ${entryPriceCheck.toFixed(4)}) perigosamente próximo da resistência (US$ ${askWallPrice.toFixed(4)}).`, 
          tradeOpened: false 
        };
      }
    }
    
    if (side === 'SHORT' && bidWallPrice > 0 && entryPriceCheck > bidWallPrice) {
      const distanceToSup = (entryPriceCheck - bidWallPrice) / entryPriceCheck;
      if (distanceToSup < proximityThreshold) {
        return { 
          account, 
          positions, 
          log: `Filtro Anti-Armadilha (Sinc. Book): Venda HFT bloqueada para ${params.symbol}. Preço (US$ ${entryPriceCheck.toFixed(4)}) perigosamente próximo do suporte (US$ ${bidWallPrice.toFixed(4)}).`, 
          tradeOpened: false 
        };
      }
    }
  }

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

  // Check 2b: Configurable Post-Close Cooldown per symbol (20s, 1m, 3m, 5m, 10m)
  const remainingCooldown = getSymbolCooldownRemainingSeconds(params.symbol, positions, account.reentryCooldownSeconds);
  if (remainingCooldown > 0) {
    return { 
      account, 
      positions, 
      log: `⏳ Cooldown pós-fechamento ativo para ${params.symbol}: Liberado para nova ordem em ${remainingCooldown}s após o fechamento da ordem anterior.`, 
      tradeOpened: false 
    };
  }

  // Gatilho de Execução Time & Trades (Liberar SOMENTE se agressão for a favor da ordem executada)
  let tapeAiResult: any = null;
  if (params.isAggressionTriggerEnabled !== false && account.isAggressionTriggerEnabled !== false) {
    const entryPriceCheck = params.entryPrice && params.entryPrice > 0 ? params.entryPrice : (params.currentPrice > 0 ? params.currentPrice : 100);
    const trades = params.timesAndTrades && params.timesAndTrades.length > 0 
      ? params.timesAndTrades 
      : generateLiveOrderFlowData({ symbol: params.symbol, name: params.coinName || params.symbol, priceUsd: entryPriceCheck, change24h: 0 } as any).timesAndTrades;
    
    tapeAiResult = analyzeTimesAndTradesTapeAi(params.symbol, entryPriceCheck, trades);

    if (side === 'LONG' && !tapeAiResult.executionGate.isLongAllowed) {
      return { 
        account, 
        positions, 
        log: `🛡️ Gatilho de Agressão Time&Trades: Ordem HFT de COMPRA bloqueada para ${params.symbol}. ${tapeAiResult.executionGate.reasonLong}`, 
        tradeOpened: false 
      };
    }

    if (side === 'SHORT' && !tapeAiResult.executionGate.isShortAllowed) {
      return { 
        account, 
        positions, 
        log: `🛡️ Gatilho de Agressão Time&Trades: Ordem HFT de VENDA bloqueada para ${params.symbol}. ${tapeAiResult.executionGate.reasonShort}`, 
        tradeOpened: false 
      };
    }
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

  const isLong = side === 'LONG';
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
    side,
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
    isAggressionTriggerEnabled: account.isAggressionTriggerEnabled !== false && params.isAggressionTriggerEnabled !== false,
    aggressionTriggerStatus: tapeAiResult 
      ? (side === 'LONG' 
          ? (tapeAiResult.buyerEscalation.isActive ? 'Comprador Comprando Mais Caro' : 'Agressão Compradora A Favor') 
          : (tapeAiResult.sellerEscalation.isActive ? 'Vendedor Vendendo Mais Barato' : 'Agressão Vendedora A Favor'))
      : 'Gatilho A Favor Confirmado',
    executionLogs: [
      isInverted
        ? `🔄 Execução Invertida (Inverso / Contra-Tendência): Ordem original [${params.side}] executada como ${side} em ${params.symbol} a US$ ${entryPrice.toFixed(4)} ${hftSigText}`
        : `⚡ Gatilho HFT com Dados Imputados: Ordem ${side} aberta em ${params.symbol} a US$ ${entryPrice.toFixed(4)} ${hftSigText}`,
      `⚙️ Parâmetros: Tamanho: US$ ${effectiveSizeUsd.toFixed(2)} (Margem: US$ ${effectiveMargin.toFixed(2)} @ ${leverage}x) | SL: US$ ${sl} | TP1: US$ ${tp1}`,
      ...(account.isAggressionTriggerEnabled !== false && params.isAggressionTriggerEnabled !== false
        ? [`🛡️ [GATILHO DE AGRESSÃO LIBERADO]: Agressão no Time & Trades a favor (${side === 'LONG' ? (tapeAiResult?.buyerEscalation.isActive ? 'Comprador Comprando Mais Caro no Ask' : 'Pressão Compradora') : (tapeAiResult?.sellerEscalation.isActive ? 'Vendedor Vendendo Mais Barato no Bid' : 'Pressão Vendedora')})`] 
        : [`🛡️ [GATILHO DE AGRESSÃO]: Desativado nas configurações`]),
      params.orderNote ? `📝 Nota: ${params.orderNote}` : `🤖 Calibrado com base nas recomendações do Analisador HFT e dados imputados.`,
      ...strategies.strategySummaryLogs
    ]
  };

  account.availableMarginUsd = Math.max(0, account.availableMarginUsd - effectiveMargin);
  positions.unshift(newPosition);

  saveTradingAccount(account);
  savePositions(positions);

  enviarOrdemParaBinance(account, newPosition);

  return {
    account,
    positions,
    log: isInverted
      ? `🔄 Execução Invertida: Ordem ${side} (invertida de ${params.side}) ABERTA em ${params.symbol} por US$ ${entryPrice} (Tamanho: US$ ${effectiveSizeUsd.toFixed(2)}).`
      : `⚡ Gatilho HFT Executado: Ordem ${side} ABERTA em ${params.symbol} por US$ ${entryPrice} (Tamanho: US$ ${effectiveSizeUsd.toFixed(2)}).`,
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

    // 1. Check Quick Profit Target (Auto Take-Profit Scalper: 2 cents / US$ 0.02)
    const isQuickProfitEnabled = pos.isQuickProfitExitEnabled !== undefined
      ? pos.isQuickProfitExitEnabled
      : (account.isQuickProfitExitEnabled !== false);
    const targetProfit = typeof pos.targetProfitUsd === 'number' && pos.targetProfitUsd > 0
      ? pos.targetProfitUsd
      : (typeof account.targetProfitUsd === 'number' && account.targetProfitUsd > 0 ? account.targetProfitUsd : 0.02);

    if (isQuickProfitEnabled && pos.unrealizedPnlUsd >= targetProfit) {
      shouldClose = true;
      closeReason = 'TAKE_PROFIT';
      closeLog = `🎯 Alvo Scalper Atingido (+US$ ${pos.unrealizedPnlUsd.toFixed(2)} ≥ US$ ${targetProfit.toFixed(2)} / +${pos.unrealizedPnlPct.toFixed(2)}%)! Ordem finalizada no ganho e margem liberada para nova entrada.`;
    }

    // 2. Check Operation Time Management (Never close in loss / prejuízo; only close with 0 cents positive >= US$ 0.00)
    const isTimeManagementEnabled = account.isTimeManagementEnabled !== false && pos.isTimeManagementEnabled !== false;
    const maxOperationMinutes = typeof pos.maxOperationTimeMinutes === 'number' && pos.maxOperationTimeMinutes > 0
      ? pos.maxOperationTimeMinutes
      : (account.maxOperationTimeMinutes || 1.5);
    const maxOperationTimeMs = maxOperationMinutes * 60 * 1000;

    const positionOpenTime = pos.openTime || Date.now();
    const elapsedMs = Date.now() - positionOpenTime;

    if (!shouldClose && isTimeManagementEnabled && elapsedMs >= maxOperationTimeMs) {
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const elapsedMinStr = elapsedSec >= 60 ? `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s` : `${elapsedSec}s`;
      const targetMinStr = maxOperationMinutes === 1.5 ? '1m 30s' : `${maxOperationMinutes} min`;

      // Case A: If profit is >= 3 cents (+US$ 0.03), ignore time limit and let Trailing Stop ride
      if (pos.unrealizedPnlUsd >= 0.03) {
        if (!pos.timeLimitIgnoredLogAdded) {
          pos.timeLimitIgnoredLogAdded = true;
          pos.executionLogs.push(`⏱️ Tempo Limite (${targetMinStr}) atingido, porém a ordem apresenta lucro de +US$ ${pos.unrealizedPnlUsd.toFixed(2)} (≥ +3¢). Tempo de operação ignorado; mantendo posição aberta sob proteção do Trailing Stop.`);
          positionsChanged = true;
        }
      } 
      // Case B: If profit is between 0 cents positive and 3 cents (+US$ 0.00 to +US$ 0.029), close on 0 cents positive without loss
      else if (pos.unrealizedPnlUsd >= 0.00) {
        shouldClose = true;
        closeReason = 'TIME_EXPIRATION';
        closeLog = `⏱️ Tempo Limite (${elapsedMinStr} ≥ ${targetMinStr}): Ordem finalizada com 0 centavos positivo (+US$ ${pos.unrealizedPnlUsd.toFixed(2)} ≥ US$ 0,00 / Sem Prejuízo) para liberar margem.`;
      } 
      // Case C: Order is in loss / negative PnL (< US$ 0.00) -> NEVER close on time! Hold position.
      else {
        if (!pos.timeLimitLossHoldingLogAdded) {
          pos.timeLimitLossHoldingLogAdded = true;
          pos.executionLogs.push(`🛡️ Regra Anti-Prejuízo de Tempo: Tempo Limite (${elapsedMinStr} ≥ ${targetMinStr}) atingido, mas a ordem está em prejuízo (-US$ ${Math.abs(pos.unrealizedPnlUsd).toFixed(2)}). Ordem mantida aberta aguardando retorno a 0 centavos positivo ou Take Profit.`);
          positionsChanged = true;
        }
      }
    }

    // 3. Check AI Divergence (Only close if enabled and unrealized PnL is less than 1 cent of dollar: < US$ 0.01)
    const latestSignal = latestAiSignals[pos.symbol];
    const isAiDivergenceExitEnabled = account.isAiDivergenceExitEnabled !== false;
    
    if (!shouldClose && isAiDivergenceExitEnabled && latestSignal) {
      const latestSide = determineSignalSide(latestSignal);
      // If AI detected a solid new direction that opposes the current position side
      if (latestSide && latestSide !== pos.side) {
        if (pos.unrealizedPnlUsd < 0.01) {
          shouldClose = true;
          closeReason = 'AI_DIVERGENCE';
          closeLog = `🤖 Divergência de Fluxo HFT: Direção reverteu para ${latestSide} (${latestSignal.finalSignal}) e o lucro de +US$ ${pos.unrealizedPnlUsd.toFixed(2)} é menor que 1 centavo (< US$ 0,01). Posição encerrada instantaneamente para reanálise e nova entrada.`;
        } else {
          if (!pos.aiDivergenceIgnoredLogAdded) {
            pos.aiDivergenceIgnoredLogAdded = true;
            pos.executionLogs.push(`🤖 Divergência de Fluxo HFT (${latestSide}): Direção reverteu, porém a ordem apresenta lucro de +US$ ${pos.unrealizedPnlUsd.toFixed(2)} (≥ +1¢ / US$ 0,01). Encerramento por divergência ignorado; mantendo posição sob proteção.`);
            positionsChanged = true;
          }
        }
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
        
        // Garante a execução no preço exato do Stop Loss (sem slippage)
        const exactPriceDiff = pos.currentStopLoss - pos.entryPrice;
        pos.unrealizedPnlPct = (exactPriceDiff / pos.entryPrice) * 100;
        pos.unrealizedPnlUsd = (pos.sizeUsd * pos.unrealizedPnlPct) / 100;
        
        const isProfitLocked = pos.currentStopLoss >= pos.entryPrice || (pos.trailingLockedProfitUsd && pos.trailingLockedProfitUsd > 0);
        closeReason = isProfitLocked ? 'TRAILING_STOP' : 'STOP_LOSS';
        
        if (isProfitLocked && pos.trailingLockedProfitUsd && pos.trailingLockedProfitUsd > 0) {
          pos.unrealizedPnlUsd = Math.max(pos.unrealizedPnlUsd, pos.trailingLockedProfitUsd);
        }
        
        closeLog = isProfitLocked 
          ? `🛡️ Trailing Stop (Lucro Garantido): Execução cravada no Stop em US$ ${pos.currentStopLoss.toFixed(4)}. PnL Realizado protegido: +US$ ${pos.unrealizedPnlUsd.toFixed(2)}.`
          : `Stop Loss de Invalidação acionado em US$ ${pos.currentStopLoss.toFixed(4)}.`;
      } else if (pos.side === 'SHORT' && currentPrice >= pos.currentStopLoss) {
        shouldClose = true;
        
        // Garante a execução no preço exato do Stop Loss (sem slippage)
        const exactPriceDiff = pos.entryPrice - pos.currentStopLoss;
        pos.unrealizedPnlPct = (exactPriceDiff / pos.entryPrice) * 100;
        pos.unrealizedPnlUsd = (pos.sizeUsd * pos.unrealizedPnlPct) / 100;
        
        const isProfitLocked = pos.currentStopLoss <= pos.entryPrice || (pos.trailingLockedProfitUsd && pos.trailingLockedProfitUsd > 0);
        closeReason = isProfitLocked ? 'TRAILING_STOP' : 'STOP_LOSS';
        
        if (isProfitLocked && pos.trailingLockedProfitUsd && pos.trailingLockedProfitUsd > 0) {
          pos.unrealizedPnlUsd = Math.max(pos.unrealizedPnlUsd, pos.trailingLockedProfitUsd);
        }
        
        closeLog = isProfitLocked 
          ? `🛡️ Trailing Stop (Lucro Garantido): Execução cravada no Stop em US$ ${pos.currentStopLoss.toFixed(4)}. PnL Realizado protegido: +US$ ${pos.unrealizedPnlUsd.toFixed(2)}.`
          : `Stop Loss de Invalidação acionado em US$ ${pos.currentStopLoss.toFixed(4)}.`;
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

