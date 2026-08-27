      {/* TOP 3 CRIPTOMOEDAS COM MAIOR PROBABILIDADE DE LUCRO - INTERACTIVE DECK */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0c141d] to-[#0d1f19] border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/20 font-mono space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Top 3 Criptomoedas com Maior Probabilidade de Lucro (Ciclo 10min)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  PARETO 80/20 ATIVO
                </span>
              </div>
              <p className="text-[11px] font-sans text-slate-300 mt-0.5">
                Calculadas em tempo real pelas confluências On-Chain, Sentimento, Indicadores e Book de 100 níveis com fluxo Times & Trades.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase">Próxima Varredura:</span>
            <span className="text-xs font-bold text-amber-300">{formattedCycleTime}</span>
          </div>
        </div>

        {/* Top 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {top3Cryptos.map((item) => {
            const isLong = item.recommendedAction.includes('COMPRA') || item.recommendedAction.includes('LONG');
            const openPos = openPositions.find(p => p.symbol === item.symbol);
            const rankMedal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉';
            const rankBorder = item.rank === 1 ? 'border-amber-500/50 bg-amber-950/10' : item.rank === 2 ? 'border-slate-400/40 bg-slate-900/30' : 'border-amber-700/40 bg-amber-950/5';
            
            return (
              <div 
                key={item.symbol}
                className={`p-4 rounded-xl border bg-[#12141a]/95 flex flex-col justify-between gap-3.5 transition-all shadow-md hover:border-emerald-500/60 ${rankBorder}`}
              >
                {/* Card Top: Rank, Symbol & Win Probability */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{rankMedal}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black text-white">{item.symbol}</span>
                          <span className="text-[10px] text-slate-400 font-sans">{item.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-500 uppercase">Acerto Estimado</span>
                      <span className={`text-sm font-black ${item.winProbabilityPct >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {item.winProbabilityPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Recommendation Label */}
                  <div className={`mt-2 py-1.5 px-2 rounded-lg text-[10px] font-bold text-center border ${
                    isLong 
                      ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-950/30 text-rose-300 border-rose-500/30'
                  }`}>
                    {item.recommendedAction}
                  </div>
                </div>

                {/* Card Middle: Catalyst & Confluence Details */}
                <div className="space-y-2">
                  <div>
                    <span className="text-[9px] font-sans text-slate-500 uppercase font-bold block mb-0.5">Gatilho (Catalisador):</span>
                    <p className="text-[10px] font-sans text-slate-300 leading-snug line-clamp-3" title={item.keyCatalyst}>
                      {item.keyCatalyst}
                    </p>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                    <div className="text-center w-1/3 border-r border-slate-700/50">
                      <span className="text-[8px] text-slate-500 uppercase block">Confluência</span>
                      <span className="text-[11px] font-bold text-cyan-400">{item.confluenceScore}%</span>
                    </div>
                    <div className="text-center w-1/3 border-r border-slate-700/50">
                      <span className="text-[8px] text-slate-500 uppercase block">Técnico</span>
                      <span className="text-[11px] font-bold text-indigo-400">{item.technicalScore}/100</span>
                    </div>
                    <div className="text-center w-1/3">
                      <span className="text-[8px] text-slate-500 uppercase block">TP Estimado</span>
                      <span className="text-[11px] font-bold text-slate-300">{item.takeProfit1 > 0 ? `$${item.takeProfit1.toFixed(item.takeProfit1 > 1 ? 2 : 4)}` : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Quick Exec Button */}
                <div>
                  {openPos ? (
                    <div className="w-full py-2 bg-slate-800/50 text-slate-400 text-[10px] font-bold rounded-lg text-center border border-slate-700 flex items-center justify-center gap-1.5">
                      <Activity className="w-3 h-3" /> Posição Aberta em Andamento
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleExecuteDirectTrade(item)}
                      disabled={!account.isAutoTradingEnabled || isScanningNow}
                      className={`w-full py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 border shadow-sm ${
                        isLong
                          ? 'bg-emerald-600/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/50 hover:shadow-emerald-900/40 disabled:opacity-50'
                          : 'bg-rose-600/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/50 hover:shadow-rose-900/40 disabled:opacity-50'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Executar {isLong ? 'Compra' : 'Venda'} no Top #{item.rank}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
