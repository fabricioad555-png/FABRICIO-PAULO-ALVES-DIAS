import { TimesAndTradeRow } from './orderFlowTypes';

export interface CryptoTapeMetrics {
  tradesCount: number; // 100
  totalVolumeUsd: number;
  buyVolumeUsd: number;
  sellVolumeUsd: number;
  cvdNetUsd: number;
  buyPressurePct: number;
  sellPressurePct: number;
  whaleTradesCount: number;
  whaleVolumeUsd: number;
  whaleBuyRatioPct: number;
  absorbedTradesCount: number;
  breakoutTradesCount: number;
  avgDisplacementPct: number;
  institutionalDominanceScore: number;
  tapeDiagnosis: string;
}

export interface CoinDatabaseSnapshot {
  id: string;
  symbol: string;
  cryptoName: string;
  rank: number;
  timestamp: string;
  cycleTimeRemaining: string;
  priceUsd: number;
  metrics: CryptoTapeMetrics;
  trades: TimesAndTradeRow[]; // 100 lines
  notes?: string;
}
