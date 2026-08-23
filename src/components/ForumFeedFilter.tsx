import React from 'react';
import { FORUM_SOURCES } from '../data/mockForumsData';
import { Filter, Layers, Clock } from 'lucide-react';

interface ForumFeedFilterProps {
  selectedSource: string;
  onSelectSource: (src: string) => void;
  selectedCoin: string;
  onSelectCoin: (coin: string) => void;
  selectedSentiment: string;
  onSelectSentiment: (sent: string) => void;
  timeframe: string;
  onChangeTimeframe: (tf: '1h' | '6h' | '24h' | '7d') => void;
  coinsList: string[];
  totalResults: number;
  onResetAll?: () => void;
}

export const ForumFeedFilter: React.FC<ForumFeedFilterProps> = ({
  selectedSource,
  onSelectSource,
  selectedCoin,
  onSelectCoin,
  selectedSentiment,
  onSelectSentiment,
  timeframe,
  onChangeTimeframe,
  coinsList,
  totalResults,
  onResetAll,
}) => {
  return (
    <div className="bg-[#12141a] border border-slate-800/40 rounded-xl p-4 sm:p-5 shadow-2xl space-y-4">
      
      {/* Top Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-serif italic text-white">
            Filtros do Feed de Fóruns
          </h3>
          <span className="text-[10px] font-mono font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
            {totalResults} tópicos encontrados
          </span>
        </div>

        {(selectedSource !== 'all' || selectedCoin !== 'all' || selectedSentiment !== 'all') && (
          <button
            onClick={() => {
              if (onResetAll) {
                onResetAll();
              } else {
                onSelectSource('all');
                onSelectCoin('all');
                onSelectSentiment('all');
              }
            }}
            className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 uppercase tracking-widest cursor-pointer"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Broker Source Selector Pills */}
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2 block flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-slate-500" />
          Filtrar por Corretora ou Comunidade:
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none font-mono text-xs">
          <button
            onClick={() => onSelectSource('all')}
            className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
              selectedSource === 'all'
                ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                : 'bg-[#0a0a0b] text-slate-300 border-slate-800 hover:bg-slate-900'
            }`}
          >
            🌐 Todas as Fontes
          </button>

          {FORUM_SOURCES.map((src) => (
            <button
              key={src.id}
              onClick={() => onSelectSource(src.id)}
              className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedSource === src.id
                  ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                  : 'bg-[#0a0a0b] text-slate-300 border-slate-800 hover:bg-slate-900'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: src.color }}
              />
              <span>{src.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Coin, Sentiment & Timeframe */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        
        {/* Coin Selector */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block">
            Criptomoeda Específica:
          </label>
          <select
            value={selectedCoin}
            onChange={(e) => onSelectCoin(e.target.value)}
            className="w-full bg-[#0a0a0b] text-slate-200 text-xs font-mono rounded-xl px-3 py-2 border border-slate-800 focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="all">Todas as Criptos</option>
            {coinsList.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Sentiment Type Selector */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block">
            Tipo de Sentimento:
          </label>
          <select
            value={selectedSentiment}
            onChange={(e) => onSelectSentiment(e.target.value)}
            className="w-full bg-[#0a0a0b] text-slate-200 text-xs font-mono rounded-xl px-3 py-2 border border-slate-800 focus:border-indigo-500 outline-none cursor-pointer"
          >
            <option value="all">Todos os Sentimentos</option>
            <option value="bullish">🟢 Otimista / Touro</option>
            <option value="bearish">🔴 Pessimista / Urso</option>
            <option value="fomo">⚡ Alerta FOMO</option>
            <option value="fud">⚠️ Alerta FUD</option>
          </select>
        </div>

        {/* Timeframe Selector */}
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1.5 block flex items-center gap-1">
            <Clock className="h-3 w-3 text-indigo-400" />
            Janela Temporal:
          </label>
          <div className="grid grid-cols-4 gap-1 bg-[#0a0a0b] p-1 rounded-xl border border-slate-800 font-mono text-xs">
            {(['1h', '6h', '24h', '7d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => onChangeTimeframe(tf)}
                className={`py-1 rounded-lg transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

