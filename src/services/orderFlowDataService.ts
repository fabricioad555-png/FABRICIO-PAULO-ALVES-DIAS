import { LiveOrderBookData, OrderBookLevel, TimesAndTradeRow, BookAndTradesAnalysisRecord } from '../types/orderFlowTypes';
import { CryptoMention } from '../types';
import { hftCache } from './cacheService';

/**
 * Generates high-fidelity 100-level visual order book (50 bids + 50 asks)
 * and 100 Times & Trades flow records calibrated to the current real asset price.
 */
export function generateLiveOrderFlowData(crypto: CryptoMention): LiveOrderBookData {
  const basePrice = crypto.priceUsd > 0 ? crypto.priceUsd : 100;
  
  // Local caching to prevent massive CPU overhead and garbage collection on redundant ticks
  const cacheKey = `orderflow_${crypto.symbol.toUpperCase()}_${basePrice.toFixed(4)}`;
  const cachedData = hftCache.get<LiveOrderBookData>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const isBull = crypto.change24h >= 0;
  const absChange = Math.abs(crypto.change24h);
  const stepRatio = basePrice > 1000 ? 0.0003 : basePrice > 10 ? 0.0006 : 0.0012;

  // Generate 50 Bids (Buy Orders) below market price
  const bids: OrderBookLevel[] = [];
  let accumulatedBidUsd = 0;
  let maxSingleBidUsd = 0;

  for (let i = 0; i < 50; i++) {
    const depthStep = (i + 1) * stepRatio * basePrice * (1 + (Math.sin(i * 0.4) * 0.1));
    const price = Number((basePrice - depthStep).toFixed(basePrice < 1 ? 4 : 2));
    
    // Scale token amount with random distribution and institutional walls
    const isBigWall = i === 4 || i === 12 || i === 24 || i === 38;
    const wallMultiplier = isBigWall ? (isBull ? 4.8 : 2.5) : 1;
    const baseAmount = (basePrice > 1000 ? 0.4 : basePrice > 50 ? 12 : 250) * (1 + Math.random() * 1.5) * wallMultiplier;
    const amount = Number(baseAmount.toFixed(basePrice > 1000 ? 3 : 1));
    const totalUsd = Number((price * amount).toFixed(2));
    
    if (totalUsd > maxSingleBidUsd) maxSingleBidUsd = totalUsd;
    accumulatedBidUsd += totalUsd;

    bids.push({
      id: `bid-${i}-${price}`,
      price,
      amount,
      totalUsd,
      accumulatedUsd: accumulatedBidUsd,
      depthPercentage: 0, // Will calibrate below
      ordersCount: Math.floor(Math.random() * 18 + 3) * (isBigWall ? 4 : 1),
      type: 'bid',
      isWall: isBigWall,
      wallStrength: isBigWall ? (i === 12 ? 'Extrema' : 'Alta') : undefined,
      institutionTag: isBigWall ? (i === 12 ? 'Whale Iceberg Bid' : 'Market Maker Support') : undefined
    });
  }

  // Generate 50 Asks (Sell Orders) above market price
  const asks: OrderBookLevel[] = [];
  let accumulatedAskUsd = 0;
  let maxSingleAskUsd = 0;

  for (let i = 0; i < 50; i++) {
    const depthStep = (i + 1) * stepRatio * basePrice * (1 + (Math.cos(i * 0.4) * 0.1));
    const price = Number((basePrice + depthStep).toFixed(basePrice < 1 ? 4 : 2));
    
    const isBigWall = i === 6 || i === 15 || i === 28 || i === 42;
    const wallMultiplier = isBigWall ? (!isBull ? 4.5 : 2.2) : 1;
    const baseAmount = (basePrice > 1000 ? 0.35 : basePrice > 50 ? 10 : 220) * (1 + Math.random() * 1.5) * wallMultiplier;
    const amount = Number(baseAmount.toFixed(basePrice > 1000 ? 3 : 1));
    const totalUsd = Number((price * amount).toFixed(2));

    if (totalUsd > maxSingleAskUsd) maxSingleAskUsd = totalUsd;
    accumulatedAskUsd += totalUsd;

    asks.push({
      id: `ask-${i}-${price}`,
      price,
      amount,
      totalUsd,
      accumulatedUsd: accumulatedAskUsd,
      depthPercentage: 0, // Will calibrate below
      ordersCount: Math.floor(Math.random() * 18 + 3) * (isBigWall ? 4 : 1),
      type: 'ask',
      isWall: isBigWall,
      wallStrength: isBigWall ? (i === 15 ? 'Extrema' : 'Alta') : undefined,
      institutionTag: isBigWall ? (i === 15 ? 'Institutional Resistance Ask' : 'Arbitrage Algorithmic Wall') : undefined
    });
  }

  // Calibrate depth percentages for visual volume bars
  const maxCombinedSingle = Math.max(maxSingleBidUsd, maxSingleAskUsd, 1);
  bids.forEach(b => b.depthPercentage = Math.min(100, Math.round((b.totalUsd / maxCombinedSingle) * 100)));
  asks.forEach(a => a.depthPercentage = Math.min(100, Math.round((a.totalUsd / maxCombinedSingle) * 100)));

  // Generate 100 Times & Trades Entries with Price Displacement tracking
  const timesAndTrades: TimesAndTradeRow[] = [];
  const now = Date.now();
  let cvdAccumulator = 0;
  let runningPrice = basePrice;
  const buyRatio = isBull ? 0.62 + (absChange * 0.015) : 0.42 - (absChange * 0.01);
  const clampedBuyRatio = Math.min(0.85, Math.max(0.25, buyRatio));

  for (let i = 0; i < 100; i++) {
    const isBuy = Math.random() < clampedBuyRatio;
    const tradeSecondsAgo = Math.floor(i * 1.8 + Math.random() * 1.2);
    const tradeDate = new Date(now - tradeSecondsAgo * 1000);
    const timeFormatted = tradeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + Math.floor(Math.random() * 900 + 100);

    // Calculate displacement in price
    const tickStep = (basePrice * (basePrice > 1000 ? 0.0001 : 0.0004));
    const randomShift = (Math.random() - 0.48) * tickStep * (isBuy ? 1.2 : -1.2);
    runningPrice = Number((runningPrice + (isBuy ? Math.abs(randomShift) * 0.4 : -Math.abs(randomShift) * 0.4)).toFixed(basePrice < 1 ? 4 : 2));
    
    // Trade Amount & Impact
    const isWhaleTrade = Math.random() < 0.12;
    const amountMult = isWhaleTrade ? (Math.random() * 8 + 4) : (Math.random() * 2 + 0.3);
    const tokenAmount = (basePrice > 1000 ? 0.25 : basePrice > 50 ? 5.5 : 120) * amountMult;
    const amount = Number(tokenAmount.toFixed(basePrice > 1000 ? 3 : 1));
    const totalUsd = Number((runningPrice * amount).toFixed(2));

    const displacement = isBuy ? Number((Math.random() * 0.35 + 0.05).toFixed(2)) : -Number((Math.random() * 0.35 + 0.05).toFixed(2));
    const displacementLabel = displacement > 0 ? `+${displacement}% Deslocamento de Alta` : `${displacement}% Deslocamento de Baixa`;

    if (isBuy) {
      cvdAccumulator += totalUsd;
    } else {
      cvdAccumulator -= totalUsd;
    }

    const tradeType = isWhaleTrade 
      ? (isBuy ? 'Lote Institucional' : 'Varredura de Liquidez')
      : (Math.random() > 0.4 ? 'Agressão a Mercado' : 'Bloco Algorítmico');

    const impact: TimesAndTradeRow['orderBookImpact'] = isWhaleTrade
      ? (isBuy ? 'Rompimento de Nível' : 'Vácuo de Liquidez')
      : (Math.random() > 0.5 ? 'Absorção Imediata' : 'Consumo Parcial');

    timesAndTrades.push({
      id: `tt-${i}-${tradeDate.getTime()}`,
      timestamp: tradeDate.toISOString(),
      timeFormatted,
      price: runningPrice,
      amount,
      totalUsd,
      aggressor: isBuy ? 'BUY' : 'SELL',
      tradeType,
      priceDisplacement: displacement,
      displacementLabel,
      absorbedInBook: impact === 'Absorção Imediata',
      orderBookImpact: impact
    });
  }

  const bestBid = bids[0]?.price || basePrice;
  const bestAsk = asks[0]?.price || basePrice;
  const spread = Number((bestAsk - bestBid).toFixed(basePrice < 1 ? 4 : 2));
  const spreadPercentage = Number(((spread / basePrice) * 100).toFixed(3));

  const totalBidLiquidityUsd = accumulatedBidUsd;
  const totalAskLiquidityUsd = accumulatedAskUsd;
  const totalBookUsd = totalBidLiquidityUsd + totalAskLiquidityUsd || 1;
  const buyPressurePct = Math.round((totalBidLiquidityUsd / totalBookUsd) * 100);
  const sellPressurePct = 100 - buyPressurePct;
  const orderBookImbalancePct = buyPressurePct - sellPressurePct;

  const result: LiveOrderBookData = {
    symbol: crypto.symbol,
    priceUsd: basePrice,
    spread,
    spreadPercentage,
    bids,
    asks,
    timesAndTrades,
    depth100TotalBidUsd: totalBidLiquidityUsd,
    depth100TotalAskUsd: totalAskLiquidityUsd,
    orderBookImbalancePct,
    buyPressurePct,
    sellPressurePct,
    cvdAccumulated: cvdAccumulator,
    speedTradesPerSec: Number((100 / 180 + Math.random() * 1.2).toFixed(1)),
    averageDisplacementTicks: Number((Math.random() * 4.5 + 1.2).toFixed(1))
  };

  hftCache.set(cacheKey, result, 1500); // Cache for 1.5 seconds

  return result;
}

/**
 * Local Database Management for Book and Trades historical snapshots
 * Stored in localStorage so AI can audit chronological changes over time
 */
const DB_STORAGE_KEY = 'crypto_orderbook_trades_history_v1';

export function getStoredOrderFlowDatabase(): BookAndTradesAnalysisRecord[] {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error loading stored order flow database:', err);
    return [];
  }
}

export function saveOrderFlowRecordToDatabase(record: BookAndTradesAnalysisRecord): BookAndTradesAnalysisRecord[] {
  try {
    const existing = getStoredOrderFlowDatabase();
    // Keep max 150 snapshot records in DB to prevent overflow
    const updated = [record, ...existing.filter(r => r.id !== record.id)].slice(0, 150);
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving order flow snapshot to DB:', err);
    return [];
  }
}

export function clearOrderFlowDatabase(): void {
  try {
    localStorage.removeItem(DB_STORAGE_KEY);
  } catch (err) {
    console.error('Error clearing database:', err);
  }
}
