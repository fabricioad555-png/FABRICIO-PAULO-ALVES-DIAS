        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0 justify-end">
          <button
            type="button"
            onClick={() => setShowFuncionamentoDetails(!showFuncionamentoDetails)}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 border border-cyan-500/50 shadow-md transition"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showFuncionamentoDetails ? 'Ocultar Detalhes de Funcionamento' : '📖 Detalhes de Funcionamento & Ponderação (40%/60%)'}</span>
          </button>
