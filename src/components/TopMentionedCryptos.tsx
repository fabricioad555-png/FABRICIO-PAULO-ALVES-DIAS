import React, { useState } from 'react';
import { CryptoMention, ForumSourceId } from '../types';
import { FORUM_SOURCES } from '../data/mockForumsData';
import { 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  BarChart3, 
  ChevronRight, 
  Zap,
  Activity
} from 'lucide-react';

interface TopMentionedCryptosProps {
  cryptos: CryptoMention[];
  onSelectCryptoForPrediction: (crypto: CryptoMention) => void;
  selectedCoinFilter?: string;
  onFilterCoin?: (symbol: string) => void;
}

export const TopMentionedCryptos: React.FC<TopMentionedCryptosProps> = ({
  cryptos,
  onSelectCryptoForPrediction,
  selectedCoinFilter,
  onFilterCoin,
}) => {
  const [tabFilter, setTabFilter] = useState<'all' | 'volume' | 'bullish' | 'surge' | 'predictive'>('all');

  // Filter and Sort Cryptos
  const filteredCryptos = [...cryptos].filter((c) => {
    if (selectedCoinFilter && selectedCoinFilter !== 'all') {
      return c.symbol.toLowerCase() === selectedCoinFilter.toLowerCase();
    }
    return true;
  }).sort((a, b) => {
    if (tabFilter === 'volume') return b.mentions24h - a.mentions24h;
    if (tabFilter === 'bullish') return b.sentimentScore - a.sentimentScore;
    if (tabFilter === 'surge') return b.mentionsChange24h - a.mentionsChange24h;
    if (tabFilter === 'predictive') return b.predictionConfidence - a.predictionConfidence;
    return b.mentions24h - a.mentions24h;
  });

  const getSourceInfo = (id: ForumSourceId) => {
    return FORUM_SOURCES.find((s) => s.id === id) || FORUM_SOURCES[0];
  };

  const getSignalBadge = (crypto: CryptoMention) => {
    switch (crypto.signal) {
      case 'alta_forte':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-3 w-3" />
            Alta Forte ({crypto.predictedChangeRange})
          </span>
        );
      case 'alta_moderada':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="h-3 w-3" />
            Alta Moderada ({crypto.predictedChangeRange})
          </span>
        );
      case 'fomo_alerta':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="h-3 w-3" />
            Alerta FOMO ({crypto.predictedChangeRange})
          </span>
        );
      case 'baixa_moderada':
      case 'baixa_forte':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <TrendingDown className="h-3 w-3" />
            Risco ({crypto.predictedChangeRange})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            <Activity className="h-3 w-3" />
            Lateral ({crypto.predictedChangeRange})
          </span>
        );
    }
  };

  return (
    <section className="bg-[#12141a] border border-slate-800/40 rounded-xl p-5 sm:p-6 shadow-2xl">
      
      {/* Header Title & Tab Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-serif italic text-white">
              Criptomoedas Mais Mencionadas nos Fóruns
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ranking dinâmico por volume de citações em corretoras e redes sociais
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-[#0a0a0b] p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none font-mono text-[11px]">
          <button
            onClick={() => setTabFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
              tabFilter === 'all'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Todas
          </button>

          <button
            onClick={() => setTabFilter('volume')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              tabFilter === 'volume'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-3 w-3" />
            Volume
          </button>

          <button
            onClick={() => setTabFilter('surge')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              tabFilter === 'surge'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Flame className="h-3 w-3 text-amber-400" />
            Explosões (% Surge)
          </button>

          <button
            onClick={() => setTabFilter('bullish')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              tabFilter === 'bullish'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            Bullish
          </button>

          <button
            onClick={() => setTabFilter('predictive')}
            className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              tabFilter === 'predictive'
                ? 'bg-indigo-600 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="h-3 w-3 text-amber-300" />
            Alta Confiança
          </button>
        </div>
      </div>

      {/* Active Coin Filter Indicator Banner */}
      {selectedCoinFilter && selectedCoinFilter !== 'all' && (
        <div className="mb-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs font-mono text-indigo-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
            <span>Filtro Ativo na Moeda: <strong className="text-white uppercase font-bold">{selectedCoinFilter}</strong></span>
          </div>
          <button
            onClick={() => onFilterCoin && onFilterCoin('all')}
            className="text-[10px] uppercase font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Ver Todas as Moedas
          </button>
        </div>
      )}

      {/* Grid of Top Cryptos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCryptos.map((crypto, index) => {
          const source = getSourceInfo(crypto.topForum);
          const isPositiveChange = crypto.change24h >= 0;

          return (
            <div
              key={crypto.id}
              className="bg-[#0a0a0b]/60 border border-slate-800/60 hover:border-indigo-500/40 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-sm"
            >
              <div>
                {/* Top Row: Rank, Symbol, Name, Price */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-bold font-mono text-white group-hover:text-indigo-400 transition-colors">
                          {crypto.symbol}
                        </span>
                        <span className="text-xs text-slate-400">
                          {crypto.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        Destaque em <strong className="text-slate-300">{source.name}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-slate-100">
                      ${crypto.priceUsd < 1 ? crypto.priceUsd.toFixed(3) : crypto.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <span
                      className={`text-xs font-semibold inline-flex items-center gap-0.5 ${
                        isPositiveChange ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositiveChange ? '+' : ''}{crypto.change24h}%
                    </span>
                  </div>
                </div>

                {/* Mentions Volume & Surge Metric */}
                <div className="bg-[#12141a] border border-slate-800/60 rounded-lg p-2.5 my-3 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Menções (24h)</span>
                    <strong className="text-slate-100 text-xs">{crypto.mentions24h.toLocaleString('pt-BR')} posts</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase">Surge</span>
                    <span className={`font-bold text-xs ${crypto.mentionsChange24h >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      +{crypto.mentionsChange24h}%
                    </span>
                  </div>
                </div>

                {/* Comparativo Valor Real (Mercado) vs Valor Sentimento */}
                <div className="bg-slate-900/90 border border-indigo-500/25 rounded-lg p-2.5 mb-3 font-mono">
                  <div className="flex items-center justify-between text-[10px] uppercase text-indigo-300 font-bold mb-1.5 pb-1 border-b border-slate-800">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Valor Real Mercado
                    </span>
                    <span className="text-slate-400 font-normal">vs</span>
                    <span className="text-amber-300">Valor Sentimento</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-[#0a0a0b] p-1.5 rounded border border-slate-800">
                      <span className="text-[9px] text-slate-500 block uppercase">Cotação Real</span>
                      <strong className="text-slate-100 block text-xs">
                        ${crypto.priceUsd < 1 ? crypto.priceUsd.toFixed(4) : crypto.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                      </strong>
                      <span className="text-[9px] text-slate-400 block font-normal">
                        (R$ {(crypto.priceBrl || (crypto.priceUsd * 5.68)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BRL)
                      </span>
                    </div>

                    <div className="bg-[#0a0a0b] p-1.5 rounded border border-slate-800 text-right">
                      <span className="text-[9px] text-slate-500 block uppercase">Score Fórum</span>
                      <strong className={`block text-xs ${crypto.sentimentScore >= 60 ? 'text-emerald-400' : crypto.sentimentScore <= 40 ? 'text-rose-400' : 'text-amber-300'}`}>
                        {crypto.sentimentScore} / 100
                      </strong>
                      <span className="text-[9px] text-slate-400 block font-normal">
                        {crypto.bullishPercent}% Otimista
                      </span>
                    </div>
                  </div>

                  {/* Divergence Analysis Badge */}
                  <div className="mt-1">
                    {crypto.change24h >= 0 && crypto.sentimentScore >= 65 && (
                      <span className="block text-center text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 py-1 px-1.5 rounded">
                        🟢 Alinhado: Preço Real & Sentimento em Alta
                      </span>
                    )}
                    {crypto.change24h < 0 && crypto.sentimentScore >= 65 && (
                      <span className="block text-center text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 py-1 px-1.5 rounded animate-pulse">
                        ⚡ Divergência: Preço Caiu ({crypto.change24h}%), Fórum Otimista ({crypto.sentimentScore})
                      </span>
                    )}
                    {crypto.change24h >= 0 && crypto.sentimentScore <= 40 && (
                      <span className="block text-center text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 py-1 px-1.5 rounded">
                        ⚠️ Divergência: Preço Subiu (+{crypto.change24h}%), Fórum Cauteloso
                      </span>
                    )}
                    {crypto.change24h < 0 && crypto.sentimentScore <= 40 && (
                      <span className="block text-center text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 py-1 px-1.5 rounded">
                        🔴 Alinhado: Preço Real & Sentimento em Baixa
                      </span>
                    )}
                    {crypto.change24h >= 0 && crypto.sentimentScore > 40 && crypto.sentimentScore < 65 && (
                      <span className="block text-center text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 py-1 px-1.5 rounded">
                        ⚖️ Equilíbrio Mercado x Fórum
                      </span>
                    )}
                    {crypto.change24h < 0 && crypto.sentimentScore > 40 && crypto.sentimentScore < 65 && (
                      <span className="block text-center text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 py-1 px-1.5 rounded">
                        ⚖️ Equilíbrio Mercado x Fórum
                      </span>
                    )}
                  </div>
                </div>

                {/* Sentiment Distribution Bar */}
                <div className="mb-3 font-mono">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span className="text-emerald-400">Bull: {crypto.bullishPercent}%</span>
                    <span className="text-slate-300">Score: {crypto.sentimentScore}</span>
                    <span className="text-rose-400">Bear: {crypto.bearishPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${crypto.bullishPercent}%` }} />
                    <div className="bg-slate-700 h-full" style={{ width: `${crypto.neutralPercent}%` }} />
                    <div className="bg-rose-500 h-full" style={{ width: `${crypto.bearishPercent}%` }} />
                  </div>
                </div>

                {/* Predictive Signal & Catalyst */}
                <div className="mb-3">
                  <div className="mb-1.5">{getSignalBadge(crypto)}</div>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-[#12141a] p-2 rounded border border-slate-800/60 font-sans">
                    💡 <span className="font-semibold text-slate-200">Gatilho:</span> {crypto.keyCatalyst}
                  </p>
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                {onFilterCoin && (
                  <button
                    onClick={() => {
                      onFilterCoin(crypto.symbol);
                      const feedElement = document.getElementById('forum-feed-section');
                      if (feedElement) {
                        feedElement.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="text-[10px] font-mono font-bold uppercase text-indigo-400 hover:text-indigo-300 hover:underline px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    Filtrar Posts
                  </button>
                )}
                <button
                  onClick={() => onSelectCryptoForPrediction(crypto)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-3 text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Previsão IA</span>
                  <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
};

