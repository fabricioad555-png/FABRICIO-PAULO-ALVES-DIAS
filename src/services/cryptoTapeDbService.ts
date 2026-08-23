import { TimesAndTradeRow } from '../types/orderFlowTypes';
import { Top10mProfitCrypto } from '../types/hftConfluenceTypes';
import { CoinDatabaseSnapshot, CryptoTapeMetrics } from '../types/cryptoTapeDbTypes';

const DB_PREFIX = 'tape_db_coin_';

/**
 * Generates 100 realistic negotiation lines (Times & Trades) for a specific crypto
 */
export function generate100NegotiationTradesForCoin(crypto: Top10mProfitCrypto): TimesAndTradeRow[] {
  const trades: TimesAndTradeRow[] = [];
  const basePrice = crypto.takeProfit1 > 0 ? crypto.takeProfit1 * 0.98 : 100;
  const isBullBias = crypto.recommendedAction.includes('COMPRA') || crypto.recommendedAction.includes('LONG');
  const now = Date.now();

  for (let i = 0; i < 100; i++) {
    // Generate timestamps counting back from now (e.g. 50ms to 800ms between trades)
    const tradeTime = new Date(now - (100 - i) * 650);
    const timeStr = `${tradeTime.toTimeString().split(' ')[0]}.${tradeTime.getMilliseconds().toString().padStart(3, '0')}`;

    // Price small random walk around basePrice
    const priceVariance = (Math.sin(i * 0.3) * 0.0018 + (Math.random() - 0.5) * 0.0012) * basePrice;
    const price = Math.max(0.000001, basePrice + priceVariance);

    // Probability of BUY based on bias
    const buyProbability = isBullBias ? 0.62 : 0.38;
    const isBuy = Math.random() < buyProbability;
    const aggressor: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';

    // Trade size
    const isWhale = Math.random() < 0.14; // ~14% whale blocks
    const sizeMultiplier = isWhale ? 15 + Math.random() * 45 : 0.5 + Math.random() * 4.5;
    
    // Scale quantity according to unit price
    let rawAmount = (1200 * sizeMultiplier) / price;
    if (price > 1000) rawAmount = Number(rawAmount.toFixed(4));
    else if (price > 10) rawAmount = Number(rawAmount.toFixed(2));
    else rawAmount = Math.round(rawAmount);

    const totalUsd = Math.round(rawAmount * price);

    // Trade classification
    let tradeType: TimesAndTradeRow['tradeType'] = 'Agressão a Mercado';
    if (isWhale) {
      tradeType = 'Lote Institucional';
    } else if (Math.random() < 0.22) {
      tradeType = 'Varredura de Liquidez';
    } else if (Math.random() < 0.18) {
      tradeType = 'Bloco Algorítmico';
    }

    // Displacement
    const displacement = Number(((Math.random() * 0.18) * (isBuy ? 1 : -1)).toFixed(3));
    const displacementLabel = displacement >= 0 ? `+${displacement}% Impulso` : `${displacement}% Recuo`;

    // Book impact
    const impacts: TimesAndTradeRow['orderBookImpact'][] = ['Consumo Parcial', 'Absorção Imediata', 'Rompimento de Nível', 'Vácuo de Liquidez'];
    const orderBookImpact = impacts[Math.floor(Math.random() * impacts.length)];
    const absorbedInBook = orderBookImpact === 'Absorção Imediata';

    trades.push({
      id: `${crypto.symbol}-${tradeTime.getTime()}-${i}`,
      timestamp: tradeTime.toISOString(),
      timeFormatted: timeStr,
      price,
      amount: rawAmount,
      totalUsd,
      aggressor,
      tradeType,
      priceDisplacement: displacement,
      displacementLabel,
      absorbedInBook,
      orderBookImpact
    });
  }

  // Return with latest trade at top (index 0)
  return trades.reverse();
}

/**
 * Appends a new live tick trade and maintains exactly 100 rows
 */
export function pushLiveTradeTo100Tape(
  crypto: Top10mProfitCrypto,
  currentTrades: TimesAndTradeRow[]
): TimesAndTradeRow[] {
  const isBullBias = crypto.recommendedAction.includes('COMPRA') || crypto.recommendedAction.includes('LONG');
  const now = new Date();
  const timeStr = `${now.toTimeString().split(' ')[0]}.${now.getMilliseconds().toString().padStart(3, '0')}`;

  const lastPrice = currentTrades.length > 0 ? currentTrades[0].price : (crypto.takeProfit1 || 100);
  const delta = (Math.random() - (isBullBias ? 0.45 : 0.55)) * 0.0006 * lastPrice;
  const price = Math.max(0.000001, lastPrice + delta);

  const isBuy = Math.random() < (isBullBias ? 0.63 : 0.37);
  const aggressor: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';

  const isWhale = Math.random() < 0.12;
  const sizeMultiplier = isWhale ? 18 + Math.random() * 40 : 0.6 + Math.random() * 5.0;
  
  let rawAmount = (1400 * sizeMultiplier) / price;
  if (price > 1000) rawAmount = Number(rawAmount.toFixed(4));
  else if (price > 10) rawAmount = Number(rawAmount.toFixed(2));
  else rawAmount = Math.round(rawAmount);

  const totalUsd = Math.round(rawAmount * price);

  let tradeType: TimesAndTradeRow['tradeType'] = 'Agressão a Mercado';
  if (isWhale) tradeType = 'Lote Institucional';
  else if (Math.random() < 0.2) tradeType = 'Varredura de Liquidez';

  const displacement = Number(((Math.random() * 0.14) * (isBuy ? 1 : -1)).toFixed(3));
  const displacementLabel = displacement >= 0 ? `+${displacement}% Impulso` : `${displacement}% Recuo`;

  const impacts: TimesAndTradeRow['orderBookImpact'][] = ['Consumo Parcial', 'Absorção Imediata', 'Rompimento de Nível', 'Vácuo de Liquidez'];
  const orderBookImpact = impacts[Math.floor(Math.random() * impacts.length)];
  const absorbedInBook = orderBookImpact === 'Absorção Imediata';

  const newTrade: TimesAndTradeRow = {
    id: `${crypto.symbol}-${now.getTime()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: now.toISOString(),
    timeFormatted: timeStr,
    price,
    amount: rawAmount,
    totalUsd,
    aggressor,
    tradeType,
    priceDisplacement: displacement,
    displacementLabel,
    absorbedInBook,
    orderBookImpact
  };

  // Keep latest 100 rows
  return [newTrade, ...currentTrades.slice(0, 99)];
}

/**
 * Calculates Tape Reading order flow metrics from the 100 trades
 */
export function calculateCoinTapeMetrics(trades: TimesAndTradeRow[]): CryptoTapeMetrics {
  if (!trades || trades.length === 0) {
    return {
      tradesCount: 0,
      totalVolumeUsd: 0,
      buyVolumeUsd: 0,
      sellVolumeUsd: 0,
      cvdNetUsd: 0,
      buyPressurePct: 50,
      sellPressurePct: 50,
      whaleTradesCount: 0,
      whaleVolumeUsd: 0,
      whaleBuyRatioPct: 50,
      absorbedTradesCount: 0,
      breakoutTradesCount: 0,
      avgDisplacementPct: 0,
      institutionalDominanceScore: 50,
      tapeDiagnosis: 'Aguardando fluxo de dados...'
    };
  }

  let totalVol = 0;
  let buyVol = 0;
  let sellVol = 0;
  let whaleTrades = 0;
  let whaleVol = 0;
  let whaleBuyVol = 0;
  let absorbedCount = 0;
  let breakoutCount = 0;
  let sumDisplacement = 0;

  for (const t of trades) {
    totalVol += t.totalUsd;
    sumDisplacement += Math.abs(t.priceDisplacement || 0);

    if (t.aggressor === 'BUY') {
      buyVol += t.totalUsd;
    } else {
      sellVol += t.totalUsd;
    }

    if (t.tradeType === 'Lote Institucional' || t.totalUsd >= 8000) {
      whaleTrades++;
      whaleVol += t.totalUsd;
      if (t.aggressor === 'BUY') whaleBuyVol += t.totalUsd;
    }

    if (t.orderBookImpact === 'Absorção Imediata' || t.absorbedInBook) absorbedCount++;
    if (t.orderBookImpact === 'Rompimento de Nível') breakoutCount++;
  }

  const cvdNet = buyVol - sellVol;
  const buyPressurePct = totalVol > 0 ? Math.round((buyVol / totalVol) * 100) : 50;
  const sellPressurePct = 100 - buyPressurePct;
  const whaleBuyRatioPct = whaleVol > 0 ? Math.round((whaleBuyVol / whaleVol) * 100) : 50;
  const avgDisplacement = Number((sumDisplacement / trades.length).toFixed(3));

  const instDominance = Math.min(99, Math.max(20, Math.round(
    ((whaleVol / (totalVol || 1)) * 50) + (buyPressurePct > 55 ? 30 : sellPressurePct > 55 ? 30 : 15)
  )));

  let tapeDiagnosis = 'Fluxo Neutro / Equilíbrio';
  if (buyPressurePct >= 65 && cvdNet > 0 && whaleBuyRatioPct >= 60) {
    tapeDiagnosis = 'Agressão Compradora Forte (Baleias Ativas)';
  } else if (sellPressurePct >= 65 && cvdNet < 0 && whaleBuyRatioPct <= 40) {
    tapeDiagnosis = 'Despejo Institucional / Agressão Vendedora';
  } else if (absorbedCount > 25) {
    tapeDiagnosis = 'Absorção Passiva Intensa no Livro';
  } else if (breakoutCount > 20) {
    tapeDiagnosis = 'Rompimento de Nível com Deslocamento';
  }

  return {
    tradesCount: trades.length,
    totalVolumeUsd: totalVol,
    buyVolumeUsd: buyVol,
    sellVolumeUsd: sellVol,
    cvdNetUsd: cvdNet,
    buyPressurePct,
    sellPressurePct,
    whaleTradesCount: whaleTrades,
    whaleVolumeUsd: whaleVol,
    whaleBuyRatioPct,
    absorbedTradesCount: absorbedCount,
    breakoutTradesCount: breakoutCount,
    avgDisplacementPct: avgDisplacement,
    institutionalDominanceScore: instDominance,
    tapeDiagnosis
  };
}

/**
 * INDEPENDENT DATABASE STORAGE FOR EACH COIN
 */

function getCoinDbKey(symbol: string): string {
  return `${DB_PREFIX}${symbol.toUpperCase()}`;
}

export function getIndependentCoinDbSnapshots(symbol: string): CoinDatabaseSnapshot[] {
  try {
    const raw = localStorage.getItem(getCoinDbKey(symbol));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Erro ao carregar banco de dados de trades para ${symbol}:`, err);
    return [];
  }
}

export function saveIndependentCoinDbSnapshot(
  crypto: Top10mProfitCrypto,
  cycleTimeRemaining: string,
  trades: TimesAndTradeRow[],
  notes?: string
): CoinDatabaseSnapshot {
  const metrics = calculateCoinTapeMetrics(trades);
  const currentPrice = trades.length > 0 ? trades[0].price : (crypto.takeProfit1 || 0);

  const snapshot: CoinDatabaseSnapshot = {
    id: `snap-${crypto.symbol}-${Date.now()}`,
    symbol: crypto.symbol,
    cryptoName: crypto.name,
    rank: crypto.rank,
    timestamp: new Date().toLocaleString('pt-BR'),
    cycleTimeRemaining,
    priceUsd: currentPrice,
    metrics,
    trades: [...trades],
    notes: notes || `Ciclo 10m - Ação: ${crypto.recommendedAction} (WinProb: ${crypto.winProbabilityPct.toFixed(1)}%)`
  };

  try {
    const existing = getIndependentCoinDbSnapshots(crypto.symbol);
    // Keep max 50 historical snapshots per coin to respect local storage
    const updated = [snapshot, ...existing].slice(0, 50);
    localStorage.setItem(getCoinDbKey(crypto.symbol), JSON.stringify(updated));
  } catch (err) {
    console.error(`Erro ao gravar snapshot no BD independente de ${crypto.symbol}:`, err);
  }

  return snapshot;
}

export function clearIndependentCoinDb(symbol: string): void {
  try {
    localStorage.removeItem(getCoinDbKey(symbol));
  } catch (err) {
    console.error(`Erro ao limpar banco de dados de ${symbol}:`, err);
  }
}

export function exportCoinDbToCSV(symbol: string): string {
  const snapshots = getIndependentCoinDbSnapshots(symbol);
  if (snapshots.length === 0) {
    return 'Nenhum dado gravado no banco de dados para exportação.';
  }

  const headers = [
    'Snapshot_ID',
    'Timestamp',
    'Simbolo',
    'Rank',
    'Preco_USD',
    'Total_Trades',
    'Volume_Total_USD',
    'CVD_Liquido_USD',
    'Pressao_Compra_Pct',
    'Pressao_Venda_Pct',
    'Baleias_Trades',
    'Volume_Baleias_USD',
    'Dominancia_Institucional',
    'Diagnostico_Tape'
  ];

  const rows = snapshots.map(s => [
    s.id,
    `"${s.timestamp}"`,
    s.symbol,
    s.rank,
    s.priceUsd.toFixed(6),
    s.metrics.tradesCount,
    s.metrics.totalVolumeUsd,
    s.metrics.cvdNetUsd,
    s.metrics.buyPressurePct,
    s.metrics.sellPressurePct,
    s.metrics.whaleTradesCount,
    s.metrics.whaleVolumeUsd,
    s.metrics.institutionalDominanceScore,
    `"${s.metrics.tapeDiagnosis}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportCoinDbToJSON(symbol: string): string {
  const snapshots = getIndependentCoinDbSnapshots(symbol);
  return JSON.stringify(snapshots, null, 2);
}
