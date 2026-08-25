import React, { useState, useMemo, useEffect } from 'react';
import { CryptoMention, ForumSource } from '../types';
import { FORUM_SOURCES } from '../data/mockForumsData';
import { 
  Grid, 
  Globe, 
  Info, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Copy, 
  Check, 
  Sparkles, 
  Filter, 
  MessageSquare, 
  BarChart2,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface SentimentHeatmapProps {
  cryptos: CryptoMention[];
  onSelectCell: (symbol: string, sourceId: string) => void;
}

type ViewMode = 'score' | 'bullishPercent' | 'volume';

const SentimentHeatmapComponent: React.FC<SentimentHeatmapProps> = ({
  cryptos,
  onSelectCell,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [viewMode, setViewMode] = useState<ViewMode>('score');
  const [hoveredCell, setHoveredCell] = useState<{
    symbol: string;
    cryptoName: string;
    sourceName: string;
    sourceId: string;
    score: number;
    bullishPercent: number;
    mentions: number;
    category: string;
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdated(new Date());
    }, 10 * 60 * 1000); // Every 10 minutes
    return () => clearInterval(timer);
  }, []);

  const handleRefreshNow = () => {
    setLastUpdated(new Date());
  };

  // Filter Sources by Category
  const filteredSources = useMemo(() => {
    if (selectedCategory === 'TODOS') return FORUM_SOURCES;
    return FORUM_SOURCES.filter((src) => src.category === selectedCategory);
  }, [selectedCategory]);

  // Deterministic cell data generation based on crypto base metrics + forum hash
  const getCellData = (crypto: CryptoMention, source: ForumSource) => {
    const hash = (crypto.symbol.charCodeAt(0) * 7 + source.id.charCodeAt(0) * 13) % 29;
    const offset = hash - 14; // Range -14 to +14
    let score = crypto.sentimentScore + offset;
    score = Math.max(-95, Math.min(98, score));

    // Convert score to bullish percent (approx 0 to 100%)
    const bullishPercent = Math.max(10, Math.min(96, Math.round(50 + score * 0.45)));

    // Estimate 24h posts share
    const sourceShare = (source.verifiedCount / 120000);
    const mentions = Math.round((crypto.mentions24h * sourceShare) * (0.8 + (hash % 6) / 10));

    return { score, bullishPercent, mentions: Math.max(12, mentions) };
  };

  // Cell Color scale matching international sentiment levels
  const getCellColor = (score: number, mode: ViewMode, bullishPercent: number) => {
    if (mode === 'bullishPercent') {
      if (bullishPercent >= 75) return 'bg-emerald-500/90 text-white font-bold hover:bg-emerald-400 border-emerald-400/40';
      if (bullishPercent >= 60) return 'bg-emerald-600/70 text-emerald-100 hover:bg-emerald-500/80 border-emerald-500/30';
      if (bullishPercent >= 45) return 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700/50';
      if (bullishPercent >= 30) return 'bg-rose-600/60 text-rose-100 hover:bg-rose-500/80 border-rose-500/30';
      return 'bg-rose-700/90 text-white font-bold hover:bg-rose-600 border-rose-400/40';
    }

    // Default Score mode (-100 to +100)
    if (score >= 65) return 'bg-emerald-500/90 text-white font-extrabold hover:bg-emerald-400 border-emerald-400/50 shadow-sm shadow-emerald-500/20';
    if (score >= 25) return 'bg-emerald-600/60 text-emerald-100 font-bold hover:bg-emerald-500/80 border-emerald-500/30';
    if (score >= -10) return 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border-slate-700/50';
    if (score >= -45) return 'bg-rose-600/60 text-rose-100 font-bold hover:bg-rose-500/80 border-rose-500/30';
    return 'bg-rose-700/90 text-white font-extrabold hover:bg-rose-600 border-rose-400/50 shadow-sm shadow-rose-500/20';
  };

  // Average sentiment per forum source (column)
  const sourceAverages = useMemo(() => {
    const averages: Record<string, number> = {};
    FORUM_SOURCES.forEach((source) => {
      let sum = 0;
      cryptos.forEach((crypto) => {
        const { score } = getCellData(crypto, source);
        sum += score;
      });
      averages[source.id] = Math.round(sum / (cryptos.length || 1));
    });
    return averages;
  }, [cryptos]);

  // Average sentiment per crypto (row)
  const cryptoAverages = useMemo(() => {
    const averages: Record<string, number> = {};
    cryptos.forEach((crypto) => {
      let sum = 0;
      FORUM_SOURCES.forEach((source) => {
        const { score } = getCellData(crypto, source);
        sum += score;
      });
      averages[crypto.symbol] = Math.round(sum / FORUM_SOURCES.length);
    });
    return averages;
  }, [cryptos]);

  const handleExportHeatmapReport = () => {
    const text = `🌍 *MAPA DE CALOR DE SENTIMENTO DOS FÓRUNS CRIPTO INTERNACIONAIS*
📊 *Base de Dados Mapeada:* Binance Square, eToro, TradingView Global, Reddit r/CC, Bitcointalk, CoinMarketCap, Bybit e Telegram/Discord VIP.

🔥 *MÉDIAS DE SENTIMENTO POR PLATAFORMA GLOBAL:*
${FORUM_SOURCES.map(
  (s) => `• *${s.name}* [${s.category}]: Score Médio ${sourceAverages[s.id] > 0 ? '+' : ''}${sourceAverages[s.id]} pts`
).join('\n')}

💎 *SENTIMENTO INTERNACIONAL POR ATIVO:*
${cryptos.map(
  (c) => `• *$${c.symbol} (${c.name})*: Média Global ${cryptoAverages[c.symbol] > 0 ? '+' : ''}${cryptoAverages[c.symbol]} pts`
).join('\n')}

🔗 Gerado via Crypto Sentiment Pro - Base Internacional`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <section className="bg-[#0e1017] border border-indigo-500/20 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden font-sans text-slate-100">
      
      {/* Background Accent Blur */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Block Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Grid className="h-5 w-5 animate-pulse" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight uppercase">
              MAPA DE CALOR DE SENTIMENTO POR FÓRUM INTERNACIONAL
            </h2>
            <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
              International DB
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>Matriz de dados cruzando o sentimento de cada criptomoeda com as principais comunidades e corretoras do mercado global</span>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900 flex items-center gap-1">
              <span>⏱️ Auto-Update 10m</span>
              <span className="text-slate-300">• {lastUpdated.toLocaleTimeString()}</span>
              <button
                onClick={handleRefreshNow}
                className="ml-1 hover:text-white underline cursor-pointer"
                title="Atualizar agora"
              >
                🔄
              </button>
            </span>
          </p>
        </div>

        {/* Action Export & Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              Euforia (+65+)
            </span>
            <span className="flex items-center gap-1 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600/70"></span>
              Otimista
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-800"></span>
              Neutro
            </span>
            <span className="flex items-center gap-1 text-rose-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600"></span>
              FUD / Medo
            </span>
          </div>

          <button
            onClick={handleExportHeatmapReport}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Copiar dados formatados do mapa de calor"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Exportar Mapa'}</span>
          </button>
        </div>
      </div>

      {/* Controls Bar: Category Filters + View Mode Selector */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Fóruns:
          </span>
          {['TODOS', 'Corretora', 'Comunidade', 'Análise Técnica', 'Sinais/Chat'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => setViewMode('score')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'score'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Score (-100 a +100)
          </button>
          <button
            onClick={() => setViewMode('bullishPercent')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'bullishPercent'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            % Bullish
          </button>
          <button
            onClick={() => setViewMode('volume')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'volume'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Volume 24h
          </button>
        </div>

      </div>

      {/* Heatmap Grid Table */}
      <div className="mt-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800">
        <table className="w-full text-left border-collapse min-w-[780px]">
          <thead>
            <tr>
              <th className="p-3 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-950 rounded-tl-xl border-b border-slate-800">
                Moeda (Ativo Global)
              </th>
              {filteredSources.map((src) => {
                const avgScore = sourceAverages[src.id] || 0;
                return (
                  <th
                    key={src.id}
                    className="p-2.5 text-[10px] font-mono font-semibold text-slate-300 text-center bg-slate-950 border-b border-slate-800 whitespace-nowrap"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-bold text-white max-w-[110px] truncate" title={src.name}>
                        {src.name}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${avgScore >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        Média: {avgScore > 0 ? `+${avgScore}` : avgScore}
                      </span>
                    </div>
                  </th>
                );
              })}
              <th className="p-3 text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-widest bg-slate-950 rounded-tr-xl border-b border-slate-800 text-center">
                Média Ativo
              </th>
            </tr>
          </thead>
          <tbody>
            {cryptos.map((crypto) => {
              const rowAvg = cryptoAverages[crypto.symbol] || 0;

              return (
                <tr key={crypto.id} className="border-t border-slate-800/60 hover:bg-slate-900/40 transition-colors">
                  
                  {/* Left Column: Crypto Info */}
                  <td className="p-2.5 font-mono font-bold text-slate-200 text-xs whitespace-nowrap bg-slate-950/40 border-r border-slate-800/80">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[11px]">
                          ${crypto.symbol}
                        </span>
                        <span className="text-xs text-slate-400 font-normal hidden md:inline truncate max-w-[100px]">
                          {crypto.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold ${(crypto.change24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {(crypto.change24h ?? 0) >= 0 ? '+' : ''}{crypto.change24h ?? 0}%
                      </span>
                    </div>
                  </td>

                  {/* Heatmap Matrix Cells */}
                  {filteredSources.map((source) => {
                    const { score, bullishPercent, mentions } = getCellData(crypto, source);
                    const colorClass = getCellColor(score, viewMode, bullishPercent);

                    return (
                      <td key={source.id} className="p-1 text-center font-mono">
                        <button
                          onClick={() => onSelectCell(crypto.symbol, source.id)}
                          onMouseEnter={() =>
                            setHoveredCell({
                              symbol: crypto.symbol,
                              cryptoName: crypto.name,
                              sourceName: source.name,
                              sourceId: source.id,
                              score,
                              bullishPercent,
                              mentions,
                              category: source.category,
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`w-full py-2.5 px-1 rounded-xl text-xs transition-all duration-150 border cursor-pointer flex flex-col items-center justify-center space-y-0.5 ${colorClass}`}
                        >
                          {viewMode === 'score' && (
                            <>
                              <span className="font-extrabold text-[12px]">
                                {score > 0 ? `+${score}` : score}
                              </span>
                              <span className="text-[9px] opacity-80">
                                {mentions} posts
                              </span>
                            </>
                          )}

                          {viewMode === 'bullishPercent' && (
                            <>
                              <span className="font-extrabold text-[12px]">
                                {bullishPercent}%
                              </span>
                              <span className="text-[9px] opacity-80">
                                Bullish
                              </span>
                            </>
                          )}

                          {viewMode === 'volume' && (
                            <>
                              <span className="font-extrabold text-[11px] text-white">
                                {mentions}
                              </span>
                              <span className="text-[9px] opacity-80">
                                posts/24h
                              </span>
                            </>
                          )}
                        </button>
                      </td>
                    );
                  })}

                  {/* Right Column: Crypto Average Score */}
                  <td className="p-2 text-center font-mono font-bold text-xs bg-slate-950/40 border-l border-slate-800/80">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${rowAvg >= 50 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : rowAvg >= 0 ? 'text-indigo-300 bg-indigo-500/10 border border-indigo-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'}`}>
                      {rowAvg > 0 ? `+${rowAvg}` : rowAvg}
                    </span>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Hover Inspector Card */}
      {hoveredCell ? (
        <div className="mt-4 bg-slate-950 border border-indigo-500/40 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-slate-200 animate-fadeIn">
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white">{hoveredCell.sourceName}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {hoveredCell.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ativo: <strong className="text-indigo-300">${hoveredCell.symbol} ({hoveredCell.cryptoName})</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 block">Score Sentimento:</span>
              <span className={`font-bold ${hoveredCell.score > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hoveredCell.score > 0 ? `+${hoveredCell.score}` : hoveredCell.score} pts
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Consenso Comprador:</span>
              <span className="font-bold text-emerald-300">
                {hoveredCell.bullishPercent}% Bull
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Volume Fórum (24h):</span>
              <span className="font-bold text-white">
                ~{hoveredCell.mentions} discussões
              </span>
            </div>

            <button
              onClick={() => onSelectCell(hoveredCell.symbol, hoveredCell.sourceId)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-xs cursor-pointer shadow-md shadow-indigo-600/20"
            >
              Filtrar Fórum
            </button>
          </div>

        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Passe o mouse sobre qualquer célula para ver detalhes ou clique para filtrar os posts do fórum internacional correspondente.</span>
        </p>
      )}

    </section>
  );
};

export const SentimentHeatmap = React.memo(SentimentHeatmapComponent);



