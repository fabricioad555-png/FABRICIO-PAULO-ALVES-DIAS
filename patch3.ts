    const mode = currentAcc.assetSelectionMode || 'TOP_3_PROBABILITY';

    if (mode === 'TOP_3_PROBABILITY') {
      // Prioritize Top 3 Cryptos with highest win probability (Sniper Filter >= 70%)
      for (const topItem of currentTop3) {
        if (tempPos.some(p => p.status === 'OPEN' && p.symbol === topItem.symbol)) continue;
        if (topItem.winProbabilityPct < 70) continue;

        const cryptoObj = currentCryptos.find(c => c.symbol === topItem.symbol);
        if (!cryptoObj) continue;

        let side: PositionSide | null = null;
        if (topItem.recommendedAction.includes('COMPRA') || topItem.recommendedAction.includes('LONG')) {
          side = 'LONG';
        } else if (topItem.recommendedAction.includes('VENDA') || topItem.recommendedAction.includes('SHORT')) {
          side = 'SHORT';
        }
        
        if (!side) continue;

        const flow = generateLiveOrderFlowData(cryptoObj);
        const signal = generateLocalHFTConfluenceAnalysis(cryptoObj, flow);

        const res = processConfluenceSignalForTrading(signal, cryptoObj.priceUsd, tempAcc, tempPos, side);
        if (res.tradeOpened) {
          tempAcc = res.account;
          tempPos = res.positions;
          openedCount++;
          addLog('ORDER_OPEN', `⚡ Auto-Trader executou sugestão de ${topItem.recommendedAction} no Rank #${topItem.rank} (${topItem.symbol}) com ${topItem.winProbabilityPct}% de probabilidade de lucro (Pareto 80/20).`);
          
          if (tempPos.filter(p => p.status === 'OPEN').length >= 3) break;
        }
      }
    } else if (mode === 'CUSTOM') {
      const allowedSymbols = currentAcc.selectedSymbols || [];
      const customAssets = currentCryptos.filter(c => allowedSymbols.includes(c.symbol));

      for (const crypto of customAssets) {
        if (tempPos.some(p => p.status === 'OPEN' && p.symbol === crypto.symbol)) continue;

        const flow = generateLiveOrderFlowData(crypto);
        const signal = generateLocalHFTConfluenceAnalysis(crypto, flow);

        const side = determineSignalSide(signal);
        if (side && signal.confluenceScorePct >= 70) {
          const res = processConfluenceSignalForTrading(signal, crypto.priceUsd, tempAcc, tempPos);
          if (res.tradeOpened) {
            tempAcc = res.account;
            tempPos = res.positions;
            openedCount++;
            addLog('ORDER_OPEN', `⚡ Auto-Trader executou ${side} em ${crypto.symbol} por US$ ${crypto.priceUsd} (Seleção Personalizada - Sniper ${signal.confluenceScorePct}%).`);
            
            if (tempPos.filter(p => p.status === 'OPEN').length >= 3) break;
          }
        }
      }
    } else {
      // Evaluate all 15 assets
      const assetsToScan = currentCryptos.slice(0, 15);
      for (const crypto of assetsToScan) {
        if (tempPos.some(p => p.status === 'OPEN' && p.symbol === crypto.symbol)) continue;

        const flow = generateLiveOrderFlowData(crypto);
        const signal = generateLocalHFTConfluenceAnalysis(crypto, flow);

        const side = determineSignalSide(signal);
        if (side && signal.confluenceScorePct >= 70) {
          const res = processConfluenceSignalForTrading(signal, crypto.priceUsd, tempAcc, tempPos);
          if (res.tradeOpened) {
            tempAcc = res.account;
            tempPos = res.positions;
            openedCount++;
            addLog('ORDER_OPEN', `⚡ Auto-Trader executou ${side} em ${crypto.symbol} por US$ ${crypto.priceUsd} (Sniper Confluência ${signal.confluenceScorePct}%).`);
            
            if (tempPos.filter(p => p.status === 'OPEN').length >= 3) break;
          }
        }
      }
    }

    if (openedCount > 0) {
      setAccount({ ...tempAcc });
      setPositions([ ...tempPos ]);
      addLog('SCAN', `Varredura concluída: ${openedCount} nova(s) operação(ões) executada(s) com base no modo selecionado.`);
    } else if (forced) {
      const modeLabel = mode === 'TOP_3_PROBABILITY' 
        ? 'Top 3 Criptomoedas com Maior Probabilidade' 
        : mode === 'CUSTOM' 
        ? 'Ativos Personalizados' 
        : 'Todos os 15 Ativos';
      addLog('INFO', `Varredura manual concluída (${modeLabel}). Posições abertas ou sem novos gatilhos neste instante.`);
    }
