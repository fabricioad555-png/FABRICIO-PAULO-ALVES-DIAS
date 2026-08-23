  // Computed styles based on final signal
  const isBuySignal = confluenceResult.finalSignal.includes('COMPRA') || confluenceResult.finalSignal.includes('LONG');
  const isSellSignal = confluenceResult.finalSignal.includes('VENDA') || confluenceResult.finalSignal.includes('SHORT');
  const pareto = confluenceResult.paretoCriticality;

  return (
    <div className="bg-[#0b0c10] border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-indigo-950/20 space-y-6 relative overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className={`absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none ${isBuySignal ? 'bg-emerald-600/10' : 'bg-rose-600/10'}`} />

      {/* Main Header & Controls */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-900 to-cyan-950 border border-indigo-500/50 text-cyan-300 shadow-lg shadow-indigo-950/50">
            <Zap className="h-6 w-6 animate-pulse text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-xl font-mono font-bold text-white tracking-wide flex items-center gap-2">
                IA de Alta Frequência & Confluência Multi-Camadas
              </h2>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                <BrainCircuit className="w-3 h-3 text-cyan-300" /> Motor Quântico & Pareto 80/20
              </span>
            </div>
            <p className="text-xs font-sans text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Ponderação holística da <strong className="text-slate-200">Camada 1</strong> (Fundamentalista, Sentimental, Indicadores Técnicos, Book & Tape Inicial) com validação mandatória na <strong className="text-slate-200">Camada 2</strong> (Book 100 Níveis & Times & Trades), sintetizando <strong className="text-cyan-300">Pareto de Criticidade</strong> e seleção de <strong className="text-emerald-300">Top 3 Criptos de Maior Probabilidade</strong>.
            </p>
          </div>
        </div>
