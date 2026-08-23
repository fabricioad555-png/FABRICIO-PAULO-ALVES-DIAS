    const mode = currentAcc.assetSelectionMode || 'TOP_3_PROBABILITY';
    if (mode === 'TOP_3_PROBABILITY') {
      const top3Symbols = stateRef.current.top3Cryptos.map(t => t.symbol);
      if (!top3Symbols.includes(signal.symbol)) return;
    } else if (mode === 'CUSTOM') {
      const allowed = currentAcc.selectedSymbols || [];
      if (!allowed.includes(signal.symbol)) return;
    }
