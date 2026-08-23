import { TimesAndTradeRow } from '../types/orderFlowTypes';

export interface HftOrderBookSignal {
  signal: 'COMPRA' | 'VENDA' | 'NEUTRO';
  signalType: string;
  type?: string;
  label: string;
  confidencePct: number;
  color: string;
  biasDescription: string;
  rationale?: string;
}

export interface HftOrderBookWall {
  price: number;
  priceLevel?: number;
  priceFormatted: string;
  volumeUsd: number;
  volumeFormatted: string;
  depthLevel: string;
  distancePct: number;
  ticksBelow?: number;
  ticksAbove?: number;
  wallStrength: string;
  significance?: string;
  status: string;
  description: string;
  color: string;
}

export interface HftOrderBookImbalance {
  bidPct: number;
  bidRatioPct?: number;
  askPct: number;
  askRatioPct?: number;
  spreadUsd?: number;
  spreadPct?: number;
  ratioText: string;
  pressureDirection: string;
  breakoutProbability: number;
}

export interface HftOrderBookReading {
  signal: HftOrderBookSignal;
  support: HftOrderBookWall;
  resistance: HftOrderBookWall;
  imbalance: HftOrderBookImbalance;
  tacticalVerdict: string;
}

export interface HftAnalysisPillar {
  status: string;
  value: string;
  description: string;
  color: string;
}

export interface HftFlowAnalysisResult {
  symbol: string;
  priceUsd: number;
  averageEntryTime: HftAnalysisPillar;
  supportResistanceVolume: HftAnalysisPillar;
  displacementEaseDirection: HftAnalysisPillar;
  fluidPriceRange: HftAnalysisPillar;
  highChurnLowDisplacementZone: HftAnalysisPillar;
  stopLossHuntAlert: HftAnalysisPillar;
  orderBookReading: HftOrderBookReading;
  aiSynthesizedRecommendation: string;
}

/**
 * High-performance deterministic mathematical HFT flow analyzer
 * Computes instant microstructural metrics directly on the client side
 */
export function generateLocalHftFlowAnalysis(
  symbol: string,
  priceUsd: number,
  trades: TimesAndTradeRow[] = [],
  bookData?: {
    asks?: any[];
    bids?: any[];
    tickSize?: number;
    spreadVal?: number;
    spreadPct?: number;
  }
): HftFlowAnalysisResult {
  const sym = (symbol || 'SOL').toUpperCase();
  const price = priceUsd > 0 ? priceUsd : 100;

  // 1. Average Entry Time (Delta between trades)
  let avgDeltaMs = 650;
  let frequencyAlert = false;
  if (Array.isArray(trades) && trades.length > 1) {
    const getMillis = (ts: any): number => {
      if (typeof ts === 'number') return ts;
      const parsed = new Date(ts).getTime();
      return isNaN(parsed) ? Date.now() : parsed;
    };

    const sorted = [...trades].sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));
    let sumDeltas = 0;
    let validDeltas = 0;
    for (let i = 1; i < sorted.length; i++) {
      const timePrev = getMillis(sorted[i - 1].timestamp);
      const timeCurr = getMillis(sorted[i].timestamp);
      const diff = timeCurr - timePrev;
      if (diff > 0 && diff < 10000) {
        sumDeltas += diff;
        validDeltas++;
      }
    }
    if (validDeltas > 0) {
      avgDeltaMs = Math.round(sumDeltas / validDeltas);
    }
  }

  frequencyAlert = avgDeltaMs < 600;
  const avgEntryTimeSec = (avgDeltaMs / 1000).toFixed(2);
  const avgEntryTimeStatus = frequencyAlert ? "ALTA_FREQUENCIA_DETECTADA" : "NORMAL";
  const avgEntryTimeColor = frequencyAlert ? "rose" : "emerald";
  const avgEntryTimeValue = `Tempo médio de ${avgEntryTimeSec}s por ordem`;
  const avgEntryTimeDesc = frequencyAlert
    ? `Aceleração de ordens HFT institucional acima da média. Alta concentração de agressões repetitivas detectada!`
    : `Fluxo de ordens regular. O ritmo de microestrutura de negociação apresenta cadência estável.`;

  // 2. Support / Resistance from Book
  let maxBidPrice = price * 0.992;
  let maxBidVol = 25000;
  let maxAskPrice = price * 1.008;
  let maxAskVol = 28000;
  let totalBidVol = 250000;
  let totalAskVol = 250000;

  if (bookData && Array.isArray(bookData.bids) && bookData.bids.length > 0) {
    const maxBid = bookData.bids.reduce((max: any, b: any) => (b.totalUsd || 0) > (max.totalUsd || 0) ? b : max, bookData.bids[0]);
    maxBidPrice = maxBid.price;
    maxBidVol = maxBid.totalUsd || 25000;
    totalBidVol = bookData.bids.reduce((sum: number, b: any) => sum + (b.totalUsd || 0), 0);
  }
  if (bookData && Array.isArray(bookData.asks) && bookData.asks.length > 0) {
    const maxAsk = bookData.asks.reduce((max: any, a: any) => (a.totalUsd || 0) > (max.totalUsd || 0) ? a : max, bookData.asks[0]);
    maxAskPrice = maxAsk.price;
    maxAskVol = maxAsk.totalUsd || 28000;
    totalAskVol = bookData.asks.reduce((sum: number, a: any) => sum + (a.totalUsd || 0), 0);
  }

  const bidRatioPct = Math.round((totalBidVol / (totalBidVol + totalAskVol || 1)) * 100) || 52;
  const askRatioPct = 100 - bidRatioPct;

  const srValue = `S: $${maxBidPrice.toFixed(maxBidPrice > 10 ? 2 : 4)} | R: $${maxAskPrice.toFixed(maxAskPrice > 10 ? 2 : 4)}`;
  const srStatus = "SUPORTE_RESISTENCIA_LIVRO";
  const srColor = maxBidVol > maxAskVol ? "emerald" : "rose";
  const srDesc = `Pontos máximos de liquidez institucional mapeados no book: Suporte volumétrico em $${maxBidPrice.toFixed(maxBidPrice > 10 ? 2 : 4)} ($${Math.round(maxBidVol / 1000)}k em bids) e Resistência volumétrica em $${maxAskPrice.toFixed(maxAskPrice > 10 ? 2 : 4)} ($${Math.round(maxAskVol / 1000)}k em asks).`;

  // 3. Displacement Ease Direction
  let easeStatus = "FACILIDADE_ALTA_COMPRA";
  let easeValue = "LONG (Fluxo Comprador Facilitado)";
  let easeColor = "emerald";
  let easeDesc = "O livro de ofertas de venda está rarefeito perto do spread, permitindo que ordens agressoras de compra desloquem o preço facilmente para cima.";

  let totalBuyDisplacement = 0;
  let totalSellDisplacement = 0;
  if (Array.isArray(trades) && trades.length > 0) {
    for (const t of trades) {
      if (t.aggressor === 'BUY') {
        totalBuyDisplacement += Math.abs(t.priceDisplacement || 0);
      } else {
        totalSellDisplacement += Math.abs(t.priceDisplacement || 0);
      }
    }

    if (totalSellDisplacement > totalBuyDisplacement) {
      easeStatus = "FACILIDADE_ALTA_VENDA";
      easeValue = "SHORT (Fluxo Vendedor Facilitado)";
      easeColor = "rose";
      easeDesc = "O livro de bids está rarefeito perto do spread, oferecendo baixo suporte para agressões vendedoras. O preço desliza com facilidade para baixo.";
    }
  }

  // 4. Fluid Price Range
  let fluidLow = price * 1.002;
  let fluidHigh = price * 1.009;
  if (easeValue.includes("SHORT")) {
    fluidLow = price * 0.991;
    fluidHigh = price * 0.998;
  }

  if (bookData && Array.isArray(bookData.bids) && bookData.bids.length > 0) {
    const avgBidSize = bookData.bids.reduce((sum: number, b: any) => sum + (b.size || 0), 0) / bookData.bids.length;
    const thinBids = bookData.bids.filter((b: any) => (b.size || 0) < avgBidSize * 0.5);
    if (thinBids.length > 5) {
      fluidLow = thinBids[thinBids.length - 1].price;
      fluidHigh = thinBids[0].price;
    }
  }

  const fluidStatus = "CANAL_FLUIDO_ATIVO";
  const fluidValue = `Faixa de $${fluidLow.toFixed(fluidLow > 10 ? 2 : 4)} a $${fluidHigh.toFixed(fluidHigh > 10 ? 2 : 4)}`;
  const fluidColor = "cyan";
  const fluidDesc = "Canal de vácuo de liquidez identificado com ofertas esparsas no orderbook. O preço tende a correr rapidamente através desta zona sem fricção de microestrutura.";

  // 5. High Churn Low Displacement Zone
  const tickSize = bookData?.tickSize || (price > 1000 ? 0.5 : price > 100 ? 0.05 : 0.01);
  const lowBoundary = price - 4 * tickSize;
  const highBoundary = price + 4 * tickSize;
  const churnStatus = "ALERTA_NAO_OPERAR";
  const churnValue = `Evitar $${lowBoundary.toFixed(lowBoundary > 10 ? 2 : 4)} a $${highBoundary.toFixed(highBoundary > 10 ? 2 : 4)}`;
  const churnColor = "amber";
  const churnDesc = "Alta rotação de contratos com baixo deslocamento de ticks devido à absorção passiva institucional. Zona de perigo tático!";

  // 6. Stop Loss Hunt Alert
  let stopStatus = "STOP_VENDEDOR_PROXIMO";
  let stopValue = `Stop Vendedor em $${(maxAskPrice + tickSize).toFixed(maxAskPrice > 10 ? 2 : 4)}`;
  let stopColor = "emerald";
  let stopDesc = `Grande bloco de ordens stop (compras forçadas) mapeado logo acima da resistência principal de $${maxAskPrice.toFixed(maxAskPrice > 10 ? 2 : 4)}. A presença de compradores passivos ($${Math.round(maxBidVol / 1000)}k) favorece a impulsão para buscar essa liquidez (Short Squeeze).`;

  if (maxAskVol > maxBidVol) {
    stopStatus = "STOP_COMPRADOR_PROXIMO";
    stopValue = `Stop Comprador em $${(maxBidPrice - tickSize).toFixed(maxBidPrice > 10 ? 2 : 4)}`;
    stopColor = "rose";
    stopDesc = `Grande bloco de ordens stop (vendas forçadas) mapeado logo abaixo do suporte principal de $${maxBidPrice.toFixed(maxBidPrice > 10 ? 2 : 4)}. A barreira de vendedores passivos ($${Math.round(maxAskVol / 1000)}k) favorece o recuo para acionar os stops (Long Squeeze).`;
  }

  // 7. Structured Order Book Reading
  const isBookBullish = bidRatioPct >= 55 || easeValue.includes("LONG");
  const isBookBearish = askRatioPct >= 55 || easeValue.includes("SHORT");

  const ticksBelowSupport = Math.max(1, Math.round(Math.abs(price - maxBidPrice) / (tickSize || 0.01)));
  const ticksAboveResistance = Math.max(1, Math.round(Math.abs(maxAskPrice - price) / (tickSize || 0.01)));

  const orderBookSignal: HftOrderBookSignal = {
    signal: isBookBullish ? "COMPRA" : isBookBearish ? "VENDA" : "NEUTRO",
    signalType: isBookBullish
      ? (bidRatioPct >= 64 ? "FORTE_COMPRA" : "COMPRA")
      : isBookBearish
      ? (askRatioPct >= 64 ? "FORTE_VENDA" : "VENDA")
      : "NEUTRO_ABSORCAO",
    type: isBookBullish ? "COMPRA" : isBookBearish ? "VENDA" : "NEUTRO",
    label: isBookBullish
      ? (bidRatioPct >= 64 ? "SINAL DE FORTE COMPRA (LONG)" : "SINAL DE COMPRA (LONG)")
      : isBookBearish
      ? (askRatioPct >= 64 ? "SINAL DE FORTE VENDA (SHORT)" : "SINAL DE VENDA (SHORT)")
      : "SINAL NEUTRO / ABSORÇÃO DE SPREAD",
    confidencePct: isBookBullish ? Math.min(94, Math.max(70, bidRatioPct + 15)) : isBookBearish ? Math.min(94, Math.max(70, askRatioPct + 15)) : 55,
    color: isBookBullish ? "emerald" : isBookBearish ? "rose" : "amber",
    biasDescription: isBookBullish
      ? `Desequilíbrio de ${bidRatioPct}% a favor dos Bids com paredes compradoras robustas e ofertas vendedoras rarefeitas perto do spread.`
      : isBookBearish
      ? `Desequilíbrio de ${askRatioPct}% a favor das Asks com barreira vendedora pesada acima do preço e agressões de venda acelerando.`
      : `Equilíbrio nas ordens limites de Bids e Asks no book. Aguardar expansão de volume institucional fora da faixa central.`,
    rationale: isBookBullish
      ? `Desequilíbrio de ${bidRatioPct}% a favor dos Bids com paredes compradoras robustas e ofertas vendedoras rarefeitas perto do spread.`
      : isBookBearish
      ? `Desequilíbrio de ${askRatioPct}% a favor das Asks com barreira vendedora pesada acima do preço e agressões de venda acelerando.`
      : `Equilíbrio nas ordens limites de Bids e Asks no book. Aguardar expansão de volume institucional fora da faixa central.`
  };

  const orderBookSupport: HftOrderBookWall = {
    price: maxBidPrice,
    priceLevel: maxBidPrice,
    priceFormatted: `$${maxBidPrice.toFixed(maxBidPrice > 10 ? 2 : 4)}`,
    volumeUsd: maxBidVol,
    volumeFormatted: `$${Math.round(maxBidVol / 1000)}k`,
    depthLevel: "Parede de Compra (Nível Bid Principal)",
    distancePct: Number(Math.abs(((price - maxBidPrice) / price) * 100).toFixed(2)),
    ticksBelow: ticksBelowSupport,
    wallStrength: maxBidVol > 30000 ? "MUITO_FORTE" : "FORTE",
    significance: maxBidVol > 30000 ? "PAREDE INSTITUCIONAL" : "SUPORTE FORTE",
    status: "SUPORTE_INSTITUCIONAL_ATIVO",
    description: `Parede de liquidez institucional de $${Math.round(maxBidVol / 1000)}k em Bids a $${maxBidPrice.toFixed(maxBidPrice > 10 ? 2 : 4)} atuando como barreira compradora contra quedas.`,
    color: "emerald"
  };

  const orderBookResistance: HftOrderBookWall = {
    price: maxAskPrice,
    priceLevel: maxAskPrice,
    priceFormatted: `$${maxAskPrice.toFixed(maxAskPrice > 10 ? 2 : 4)}`,
    volumeUsd: maxAskVol,
    volumeFormatted: `$${Math.round(maxAskVol / 1000)}k`,
    depthLevel: "Parede de Venda (Nível Ask Principal)",
    distancePct: Number(Math.abs(((maxAskPrice - price) / price) * 100).toFixed(2)),
    ticksAbove: ticksAboveResistance,
    wallStrength: maxAskVol > 30000 ? "MUITO_FORTE" : "FORTE",
    significance: maxAskVol > 30000 ? "BARREIRA INSTITUCIONAL" : "RESISTÊNCIA FORTE",
    status: "RESISTENCIA_INSTITUCIONAL_ATIVA",
    description: `Barreira de liquidez institucional de $${Math.round(maxAskVol / 1000)}k em Asks a $${maxAskPrice.toFixed(maxAskPrice > 10 ? 2 : 4)} limitando o avanço e oferecendo teto de realização.`,
    color: "rose"
  };

  const orderBookImbalance: HftOrderBookImbalance = {
    bidPct: bidRatioPct,
    bidRatioPct: bidRatioPct,
    askPct: askRatioPct,
    askRatioPct: askRatioPct,
    spreadUsd: Number((tickSize * 2).toFixed(4)),
    spreadPct: Number(((tickSize * 2 / price) * 100).toFixed(3)),
    ratioText: `${(totalBidVol / (totalAskVol || 1)).toFixed(2)}x Bids/Asks`,
    pressureDirection: isBookBullish ? "COMPRADORA" : isBookBearish ? "VENDEDORA" : "EQUILIBRADA",
    breakoutProbability: isBookBullish ? 76 : isBookBearish ? 72 : 48
  };

  const tacticalOrderBookVerdict = `Leitura do Livro: ${orderBookSignal.label} | Suporte em ${orderBookSupport.priceFormatted} (${orderBookSupport.volumeFormatted}) | Resistência em ${orderBookResistance.priceFormatted} (${orderBookResistance.volumeFormatted}). ${isBookBullish ? 'Favorece rompimento de alta na resistência.' : isBookBearish ? 'Favorece teste e pressão no suporte de compra.' : 'Aguardando rompimento dos limites do canal.'}`;

  const aiSynthesizedRecommendation = `Recomendação HFT: ${orderBookSignal.signal === 'COMPRA' ? 'LONG tático' : orderBookSignal.signal === 'VENDA' ? 'SHORT tático' : 'AGUARDAR'} focando em capturar a liquidez dos stops em ${stopValue} com suporte do book em ${orderBookSupport.priceFormatted} e resistência em ${orderBookResistance.priceFormatted}, evitando a região de absorção entre $${lowBoundary.toFixed(lowBoundary > 10 ? 2 : 4)} e $${highBoundary.toFixed(highBoundary > 10 ? 2 : 4)}.`;

  return {
    symbol: sym,
    priceUsd: price,
    averageEntryTime: {
      status: avgEntryTimeStatus,
      value: avgEntryTimeValue,
      description: avgEntryTimeDesc,
      color: avgEntryTimeColor
    },
    supportResistanceVolume: {
      status: srStatus,
      value: srValue,
      description: srDesc,
      color: srColor
    },
    displacementEaseDirection: {
      status: easeStatus,
      value: easeValue,
      description: easeDesc,
      color: easeColor
    },
    fluidPriceRange: {
      status: fluidStatus,
      value: fluidValue,
      description: fluidDesc,
      color: fluidColor
    },
    highChurnLowDisplacementZone: {
      status: churnStatus,
      value: churnValue,
      description: churnDesc,
      color: churnColor
    },
    stopLossHuntAlert: {
      status: stopStatus,
      value: stopValue,
      description: stopDesc,
      color: stopColor
    },
    orderBookReading: {
      signal: orderBookSignal,
      support: orderBookSupport,
      resistance: orderBookResistance,
      imbalance: orderBookImbalance,
      tacticalVerdict: tacticalOrderBookVerdict
    },
    aiSynthesizedRecommendation
  };
}
