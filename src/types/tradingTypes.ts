export type OperationMode = 'DEMO' | 'REAL';
export type PositionSide = 'LONG' | 'SHORT';
export type PositionStatus = 'OPEN' | 'CLOSED';
export type CloseReason = 'NONE' | 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL' | 'REVERSAL' | 'TIME_EXPIRED' | 'DYNAMIC_TRAILING' | 'QUICK_PROFIT' | 'AI_DIVERGENCE' | 'AUTO_CLOSE' | 'MARKET_REVERSAL_BTC' | 'TIME_EXPIRATION' | 'TRAILING_STOP';
export type AssetSelectionMode = 'ALL_ASSETS' | 'TOP_3_PROBABILITY' | 'PARETO_80_20' | 'CUSTOM';
export type OrderTriggerMode = 'PRICE_TOUCH' | 'IMBALANCE_DETECTED' | 'VOLUME_SPIKE' | 'DISPLACEMENT_AI' | 'INSTANT_AGGRESSION' | 'WHALE_VOLUME' | 'CONFLUENCE_DUAL';
export type MarketReversalPolicy = 'STOP_ALL' | 'REDUCE_ONLY' | 'AUTO_CLOSE' | 'TIGHTEN_STOP' | 'ALERT_ONLY';

export interface BtcMarketDirectionResult {
  score: number;
  side: PositionSide;
  statusLabel: 'COMPRA FORTE' | 'COMPRA' | 'NEUTRO' | 'VENDA' | 'VENDA FORTE';
  layer1And2Score: number;
  technicalScore: number;
  weightLayer1And2: number;
  weightTechnical: number;
  priceUsd: number;
  change24h: number;
  timestamp: number;
}

export interface BinanceApiConfig {
  apiKey: string;
  apiSecret: string;
  environment: 'production' | 'testnet' | 'sandbox_local';
  accountType: 'SPOT' | 'FUTURES';
  isConnected: boolean;
  isVerified?: boolean;
  accountBalanceUsdt?: number;
  availableMarginUsdt?: number;
  lastError?: string;
  pingMs?: number;
  permissions?: string[];
  futuresDetails?: {
    totalWalletBalance: number;
    availableBalance: number;
    totalMarginBalance: number;
  };
}

export interface TradePosition {
  id: string;
  symbol: string;
  coinName: string;
  side: PositionSide;
  entryPrice: number;
  currentPrice: number;
  sizeUsd: number;
  positionSizingPct: number;
  leverage: number;
  initialStopLoss: number;
  currentStopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  highestPriceSinceEntry: number;
  lowestPriceSinceEntry: number;
  highestUnrealizedPnlUsd: number;
  trailingStepsCount: number;
  trailingLockedProfitUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  realizedPnlUsd: number;
  status: PositionStatus;
  closeReason: CloseReason;
  openTime: number;
  closeTime?: number;
  isQuickProfitExitEnabled?: boolean;
  targetProfitUsd?: number;
  isTimeManagementEnabled?: boolean;
  maxOperationTimeMinutes?: number;
  timeDecayProfitTargetUsd?: number;
  isDynamicTrailingStopEnabled?: boolean;
  isAggressionTriggerEnabled?: boolean;
  aggressionTriggerStatus?: string;
  executionLogs: string[];
  
  marketReversalWarning?: boolean;
  marketReversalActionApplied?: MarketReversalPolicy | boolean;
  timeLimitIgnoredLogAdded?: boolean;
  timeLimitLossHoldingLogAdded?: boolean;
  aiDivergenceIgnoredLogAdded?: boolean;
}

export interface ExecuteHftOrderParams {
  symbol: string;
  coinName?: string;
  side: PositionSide;
  sizeUsd: number;
  currentPrice: number;
  entryPrice?: number;
  leverage?: number;
  hftAnalysis?: any;
  timesAndTrades?: any;
  orderBookReading?: any;
  isAggressionTriggerEnabled?: boolean;
  isRobotBypassEnabled?: boolean;
  isQuickProfitExitEnabled?: boolean;
  targetProfitUsd?: number;
  isTimeManagementEnabled?: boolean;
  maxOperationTimeMinutes?: number;
  timeDecayProfitTargetUsd?: number;
  isDynamicTrailingStopEnabled?: boolean;
  orderNote?: string;
  
  account?: TradingAccount;
  positions?: TradePosition[];
  customStopLoss?: number;
  customTakeProfit?: number;
}

export interface ArmedOrderTrigger {
  id: string;
  symbol: string;
  coinName?: string;
  side?: PositionSide;
  targetSide?: PositionSide;
  triggerPrice?: number;
  mode?: OrderTriggerMode;
  triggerMode?: OrderTriggerMode;
  status: 'ARMED' | 'EXECUTED' | 'CANCELLED' | 'TRIGGERED';
  timestamp?: number;
  
  minAggressionVolumeUsd?: number;
  autoRearmOnClose?: boolean;
  sizeUsd?: number;
  leverage?: number;
  armedAt?: number;
  requiredCondition?: string;
  triggerLogs?: string[];
  executedPositionId?: string;
  executedPrice?: number;
  executedAt?: number;
  currentAggressionStatus?: string;
  lastTapeCheckTime?: number;
  buyAggressionPct?: number;
  sellAggressionPct?: number;
  aggressionVolumeDetectedUsd?: number;
  reason?: string;
}

export interface TradingAccount {
  operationMode: OperationMode;
  binanceConfig?: BinanceApiConfig;
  activeBroker?: 'BINANCE';
  demoBalanceUsd: number;
  availableMarginUsd: number;
  totalRealizedPnlUsd: number;
  isAutoTradingEnabled: boolean;
  
  // Strategy & Risk Settings
  isAggressionTriggerEnabled?: boolean;
  isRobotBypassEnabled?: boolean;
  minConfluenceScore?: number;
  reentryCooldownSeconds?: number;
  maxRiskPerTradePct?: number;
  isInvertedExecutionEnabled?: boolean;
  
  // Strategy Modes
  isQuickProfitExitEnabled?: boolean;
  targetProfitUsd?: number;
  isTimeManagementEnabled?: boolean;
  maxOperationTimeMinutes?: number;
  timeDecayProfitTargetUsd?: number;
  isDynamicTrailingStopEnabled?: boolean;
  isAiDivergenceExitEnabled?: boolean;
  trailingStepUsd?: number;
  
  // Weights
  customWeightLayer1And2?: number;
  customWeightTechnical?: number;
  
  // Market Guard
  isMarketReversalGuardEnabled?: boolean;
  marketReversalPolicy?: MarketReversalPolicy;
  
  // Selection
  assetSelectionMode?: AssetSelectionMode;
  selectedSymbols?: string[];
}
