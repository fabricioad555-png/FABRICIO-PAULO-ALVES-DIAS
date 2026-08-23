import { CryptoMention } from '../types';
import { hftCache } from './cacheService';

const PRICES_CACHE_KEY = 'api_live_prices';
const PRICES_CACHE_TTL_MS = 3000; // 3 seconds TTL for live API price fetching

export async function fetchLiveCryptoPrices(currentList: CryptoMention[]): Promise<CryptoMention[]> {
  try {
    let pricesData = hftCache.get<any>(PRICES_CACHE_KEY);

    if (!pricesData) {
      const res = await fetch('/api/crypto-live-prices', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      
      if (!res.ok) return currentList;
      
      const data = await res.json();
      if (!data.success || !Array.isArray(data.prices) || data.prices.length === 0) {
        return currentList;
      }
      
      pricesData = data.prices;
      hftCache.set(PRICES_CACHE_KEY, pricesData, PRICES_CACHE_TTL_MS);
    }

    const livePriceMap = new Map<string, { priceUsd: number; priceBrl: number; change24h: number; volume24hUsd?: number; isRealMarketLive: boolean; lastMarketUpdate?: string }>();
    
    pricesData.forEach((item: any) => {
      if (item.symbol) {
        livePriceMap.set(item.symbol.toUpperCase(), {
          priceUsd: item.priceUsd,
          priceBrl: item.priceBrl,
          change24h: item.change24h,
          volume24hUsd: item.volume24hUsd,
          isRealMarketLive: item.isRealMarketLive ?? true,
          lastMarketUpdate: item.lastMarketUpdate,
        });
      }
    });

    let hasAnyChanges = false;
    const updatedList = currentList.map((crypto) => {
      const live = livePriceMap.get(crypto.symbol.toUpperCase());
      if (live) {
        // Only trigger update if value has changed
        if (crypto.priceUsd !== live.priceUsd || crypto.change24h !== live.change24h || crypto.priceBrl !== live.priceBrl) {
          hasAnyChanges = true;
          
          const formattedUsd = `$${live.priceUsd >= 1 ? live.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : live.priceUsd.toFixed(4)} (${live.change24h >= 0 ? '+' : ''}${live.change24h.toFixed(2)}%)`;
          const formattedDelta = `Preço Real: ${live.change24h >= 0 ? '+' : ''}${live.change24h.toFixed(2)}%`;

          const updatedAiAnalysis = crypto.aiAnalysis ? {
            ...crypto.aiAnalysis,
            realMarketPillar: {
              ...crypto.aiAnalysis.realMarketPillar,
              priceUsdFormatted: formattedUsd,
              volume24h: live.volume24hUsd ? `$${(live.volume24hUsd / 1e9).toFixed(1)}B USDT` : crypto.aiAnalysis.realMarketPillar.volume24h,
            },
            divergenceBadge: {
              ...crypto.aiAnalysis.divergenceBadge,
              priceRealDelta: formattedDelta,
            }
          } : undefined;

          return {
            ...crypto,
            priceUsd: live.priceUsd,
            priceBrl: live.priceBrl,
            change24h: live.change24h,
            volume24hUsd: live.volume24hUsd || crypto.volume24hUsd,
            isRealMarketLive: live.isRealMarketLive,
            lastMarketUpdate: live.lastMarketUpdate || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            ...(updatedAiAnalysis ? { aiAnalysis: updatedAiAnalysis } : {}),
          };
        }
      }
      return crypto;
    });

    // If no values actually changed, return the exact same array reference to prevent React re-renders
    return hasAnyChanges ? updatedList : currentList;
  } catch (err) {
    console.debug('[Live Crypto Price] Server sync info:', err);
    return currentList;
  }
}
