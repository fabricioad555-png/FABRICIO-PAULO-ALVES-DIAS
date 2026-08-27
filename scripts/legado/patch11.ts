  // Run scan when selected symbol changes
  useEffect(() => {
    handleRunHFTScan(activeCrypto);
  }, [activeCrypto.symbol, activeCrypto.priceUsd]);

  // Auto-scan cycle every 4.5 seconds for High-Frequency responsiveness (Local Flow & Background Emit)
  useEffect(() => {
    if (!isAutoLiveScanning) return;

    const interval = setInterval(() => {
      // Re-generate local order flow
      const freshFlow = generateLiveOrderFlowData(activeCrypto);
      setOrderFlowData(freshFlow);

      // Perform local analysis for instant feedback
      const localRes = generateLocalHFTConfluenceAnalysis(activeCrypto, freshFlow, forumPosts, techFilterConfig);
      setConfluenceResult(localRes);
      
      // Emit to trading bus for auto-trader consumption
      tradingSignalBus.emit(localRes);
    }, 4500);

    return () => clearInterval(interval);
  }, [isAutoLiveScanning, activeCrypto, forumPosts, techFilterConfig]);

  // Master Definitive AI Signal Update every 10 minutes (600000 ms)
  useEffect(() => {
    if (!isAutoLiveScanning) return;

    const interval = setInterval(() => {
      handleRunHFTScan(activeCrypto);
      refreshTop3Selection();
    }, 600000);

    return () => clearInterval(interval);
  }, [isAutoLiveScanning, activeCrypto, handleRunHFTScan, refreshTop3Selection]);

  // Computed styles based on final signal
  const isBuySignal = confluenceResult.finalSignal.includes('COMPRA') || confluenceResult.finalSignal.includes('LONG');
  const isSellSignal = confluenceResult.finalSignal.includes('VENDA') || confluenceResult.finalSignal.includes('SHORT');
  const pareto = confluenceResult.paretoCriticality;

  return (
    <div className="bg-[#0b0c10] border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-indigo-950/20 space-y-6 relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-indigo-500/20 relative z-10">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-base font-black text-white uppercase tracking-wider">
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
