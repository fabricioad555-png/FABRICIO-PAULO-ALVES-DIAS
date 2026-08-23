  const handleSetAssetSelectionMode = (mode: AssetSelectionMode) => {
    const updated = updateAssetSelectionMode(mode);
    setAccount(updated);
    const modeLabel = mode === 'TOP_3_PROBABILITY' 
      ? '🎯 Top 3 Criptomoedas com Maior Probabilidade de Lucro (Pareto 80/20 - Ciclo 10min)'
      : mode === 'ALL_ASSETS' 
      ? '🌐 Todos os 15 Ativos Monitorados' 
      : '⚙️ Seleção Manual Personalizada';
    addLog('INFO', `Seleção de Criptomoedas para Operação alterada para: ${modeLabel}`);
    
    if (mode === 'CUSTOM') {
      setIsCustomSelectorOpen(true);
    }
  };
