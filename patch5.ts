          {/* 10-Minute Cycle Synchronizer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090b0e] border border-indigo-500/30 text-[11px] self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="text-slate-400">Ciclo Pareto 10min:</span>
            <span className="font-bold text-amber-300">{formattedCycleTime}</span>
          </div>
        </div>

        {/* Mode Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => handleSetAssetSelectionMode('TOP_3_PROBABILITY')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
              activeSelectionMode === 'TOP_3_PROBABILITY'
                ? 'bg-gradient-to-r from-emerald-950/80 to-cyan-950/70 border-emerald-500/70 shadow-lg shadow-emerald-950/40 text-white ring-1 ring-emerald-400'
                : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Top 3 Maior Probabilidade
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                RECOMENDADO
              </span>
            </div>
            <p className="text-[10.5px] font-sans text-slate-300 leading-snug">
              Opera exclusivamente as <strong>3 criptomoedas com maior probabilidade de lucro</strong> (Pareto 80/20 - Ciclo 10min), executando as sugestões exatas de compra ou venda.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSetAssetSelectionMode('ALL_ASSETS')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
              activeSelectionMode === 'ALL_ASSETS'
                ? 'bg-indigo-950/70 border-indigo-500/70 shadow-lg shadow-indigo-950/40 text-white ring-1 ring-indigo-400'
                : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold flex items-center gap-1.5 text-indigo-400">
                <Crosshair className="w-3.5 h-3.5" />
                Todos os 15 Ativos
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                15 MOEDAS
              </span>
            </div>
            <p className="text-[10.5px] font-sans text-slate-300 leading-snug">
              Varre todas as 15 criptomoedas monitoradas no book e tape e abre posições para qualquer confluência superior a 65%.
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSetAssetSelectionMode('CUSTOM')}
            className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
              activeSelectionMode === 'CUSTOM'
                ? 'bg-cyan-950/70 border-cyan-500/70 shadow-lg shadow-cyan-950/40 text-white ring-1 ring-cyan-400'
                : 'bg-[#0b0c10] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold flex items-center gap-1.5 text-cyan-400">
                <Filter className="w-3.5 h-3.5" />
                Seleção Personalizada
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {(account.selectedSymbols || []).length} ATIVOS
              </span>
            </div>
            <p className="text-[10.5px] font-sans text-slate-300 leading-snug">
              Escolha manualmente quais moedas específicas você autoriza o robô a operar.
            </p>
