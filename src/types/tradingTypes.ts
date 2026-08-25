export type PositionSide = 'LONG' | 'SHORT';
export type PositionStatus = 'OPEN' | 'CLOSED';
export type CloseReason = 'TAKE_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'MANUAL' | 'AI_DIVERGENCE' | 'TIME_EXPIRATION' | 'MARKET_REVERSAL_BTC' | 'NONE';

export type MarketReversalPolicy = 'AUTO_CLOSE' | 'TIGHTEN_STOP' | 'AUTO_FLIP' | 'ALERT_ONLY';

export type OrderTriggerMode = 'INSTANT_AGGRESSION' | 'WHALE_VOLUME' | 'CONFLUENCE_DUAL';

export interface ArmedOrderTrigger {
  id: string;
  symbol: string;
  coinName: string;
  targetSide: PositionSide;
  sizeUsd: number;
  leverage: number;
  armedAt: number;
  status: 'ARMED' | 'TRIGGERED' | 'CANCELLED' | 'BLOCKED_WAITING';
  triggerMode: OrderTriggerMode;
  minAggressionVolumeUsd?: number;
  autoRearmOnClose?: boolean;
  reason: string;
  requiredCondition: string;
  lastTapeCheckTime: number;
  currentAggressionStatus?: string;
  buyAggressionPct?: number;
  sellAggressionPct?: number;
  aggressionVolumeDetectedUsd?: number;
  triggerLogs: string[];
  executedPositionId?: string;
  executedPrice?: number;
  executedAt?: number;
  triggeredAt?: number;
}

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
  
  // Risk Management
  initialStopLoss: number;
  currentStopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  
  // Trailing Stop Data
  highestPriceSinceEntry: number;
  lowestPriceSinceEntry: number;
  highestUnrealizedPnlUsd?: number;
  trailingStepsCount?: number;
  trailingLockedProfitUsd?: number;
  
  // PnL
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  realizedPnlUsd: number;
  
  // Meta
  status: PositionStatus;
  closeReason: CloseReason;
  openTime: number;
  closeTime?: number;
  
  // Attached Strategies & Modes at Execution
  isQuickProfitExitEnabled?: boolean;
  targetProfitUsd?: number;
  isTimeManagementEnabled?: boolean;
  maxOperationTimeMinutes?: number;
  timeDecayProfitTargetUsd?: number;
  isDynamicTrailingStopEnabled?: boolean;
  isAggressionTriggerEnabled?: boolean; // Executed only with confirmed order book & tape aggression
  aggressionTriggerStatus?: string;
  timeLimitIgnoredLogAdded?: boolean;
  timeLimitLossHoldingLogAdded?: boolean;
  aiDivergenceIgnoredLogAdded?: boolean;

  // Market Direction Alignment & Reversal Treatment
  btcWeightedMarketSideAtEntry?: PositionSide;
  marketReversalWarning?: boolean;
  marketReversalActionApplied?: string;

  // Logs
  executionLogs: string[];
}

export type AssetSelectionMode = 'TOP_3_PROBABILITY' | 'ALL_ASSETS' | 'CUSTOM';

export interface TradingAccount {
  demoBalanceUsd: number;
  availableMarginUsd: number;
  totalRealizedPnlUsd: number;
  isAutoTradingEnabled: boolean;
  maxRiskPerTradePct?: number; // Configured maximum risk per trade in percentage (default: 2)
  riskCalculationBase?: 'AVAILABLE_MARGIN' | 'TOTAL_BALANCE'; // Base for risk calculation: Available Margin (default) or Total Demo Balance
  maxMarginAllocationPct?: number; // Maximum allocation percentage per trade out of available margin (e.g. 33%)
  targetProfitUsd?: number; // Target profit in USD to auto-close (default: 0.10 = 10 cents)
  isQuickProfitExitEnabled?: boolean; // Whether 10c scalper exit is active (default: true)
  maxOperationTimeMinutes?: number; // Maximum operation time in minutes (default: 5 min)
  timeDecayProfitTargetUsd?: number; // Target profit permitted to close after max operation time (default: 0.00 = 0 cents)
  isTimeManagementEnabled?: boolean; // Whether time-based exit is active (default: true)
  trailingStepUsd?: number; // Trailing step advance in USD (default: 0.03 = 3 cents)
  isDynamicTrailingStopEnabled?: boolean; // Whether dynamic trailing stop is active (default: true)
  isInvertedExecutionEnabled?: boolean; // Execute inverted orders: Buy -> Sell (Short), Sell -> Buy (Long) (default: true)
  isAiDivergenceExitEnabled?: boolean; // Whether closing orders on AI Divergence (< 1 cent) is active (default: true)
  reentryCooldownSeconds?: number; // Cooldown for repurchasing same crypto after position closes (default: 20s. Options: 20, 60, 180, 300, 600)
  isAggressionTriggerEnabled?: boolean; // Liberar ordem somente se agressão no Time & Trades for a favor da ordem (default: true)

  // Market Direction Reversal Management (Sistema Ponderado 14% / 86% - BTC)
  marketReversalPolicy?: MarketReversalPolicy; // 'AUTO_CLOSE' (default), 'TIGHTEN_STOP', 'AUTO_FLIP', 'ALERT_ONLY'
  isMarketReversalGuardEnabled?: boolean; // default: true
  customWeightLayer1And2?: number; // default: 14%
  customWeightTechnical?: number; // default: 86%

  assetSelectionMode?: AssetSelectionMode; // Filter for which coins to trade: Top 3 Pareto (default), All 15, or Custom
  selectedSymbols?: string[]; // Custom selected symbols when mode is 'CUSTOM'
}

export interface ExecuteHftOrderParams {
  symbol: string;
  coinName?: string;
  currentPrice: number;
  side: PositionSide;
  sizeUsd: number;
  leverage?: number;
  entryPrice?: number;
  customStopLoss?: number;
  customTakeProfit?: number;
  hftAnalysis?: any;
  timesAndTrades?: any[];
  account?: TradingAccount;
  positions?: TradePosition[];
  orderNote?: string;
  useAvailableMarginRisk?: boolean;
  isQuickProfitExitEnabled?: boolean;
  targetProfitUsd?: number;
  isTimeManagementEnabled?: boolean;
  maxOperationTimeMinutes?: number;
  timeDecayProfitTargetUsd?: number;
  isDynamicTrailingStopEnabled?: boolean;
  isAggressionTriggerEnabled?: boolean;
}

