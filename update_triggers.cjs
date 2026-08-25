const fs = require('fs');

let fileContent = fs.readFileSync('src/components/TradingExecutionDashboard.tsx', 'utf8');

// 1. Update evaluatedTriggers calculation for checks1to7Met
fileContent = fileContent.replace(
  /const check9_AutoTradingOn = account\.isAutoTradingEnabled;/g,
  `const checks1to7Met = Boolean(check1_DuplaChancela && check2_ConfluenceScore && check3_BookAndAbsorption && check4_CapacityAndMargin && check5_AntiTrap && check6_CapitalImbalance && check7_PriceDisplacement);
      const check9_AutoTradingOn = account.isAutoTradingEnabled;`
);

fileContent = fileContent.replace(
  /\} else if \(checksMetCount === 8 && check9_AutoTradingOn && isMomentumFavorable\) \{/g,
  `} else if (checks1to7Met && check9_AutoTradingOn && isMomentumFavorable) {`
);

// Include checks1to7Met in return object of evaluatedTriggers
fileContent = fileContent.replace(
  /check8_SweepingMomentum,/g,
  `check8_SweepingMomentum,
        checks1to7Met,`
);

// 2. Update executeEvaluatedTriggerImmediately for inverted side execution
const oldExecTrigger = `    try {
      const entryPrice = cryptoObj.priceUsd > 0 ? cryptoObj.priceUsd : item.spotPrice;
      const flow = generateLiveOrderFlowData(cryptoObj);
      const signal = generateLocalHFTConfluenceAnalysis(cryptoObj, flow);
      const hftVerify = verifyHftAiRecommendations(item.symbol, entryPrice, item.side);
      if (hftVerify.stopLoss) {
        if (!signal.executionPlan) signal.executionPlan = {} as any;
        signal.executionPlan.stopLoss = hftVerify.stopLoss;
      }
      if (hftVerify.takeProfit) {
        if (!signal.executionPlan) signal.executionPlan = {} as any;
        signal.executionPlan.takeProfit1 = hftVerify.takeProfit;
      }
      const res = processConfluenceSignalForTrading(signal, entryPrice, currentAcc, currentPos, item.side, true);
      if (res.tradeOpened) {
        setAccount({ ...res.account });
        setPositions([ ...res.positions ]);
        addLog('ORDER_OPEN', \`⚡ Disparo Automático Imediato: 8/8 Verificações 100% Satisfeitas em \${item.symbol} (\${item.side === 'LONG' ? 'COMPRA' : 'VENDA'})! Entrada a mercado em US$ \${entryPrice > 10 ? entryPrice.toFixed(2) : entryPrice.toFixed(4)}.\`);
      }
    } catch (err) {`;

const newExecTrigger = `    try {
      const entryPrice = cryptoObj.priceUsd > 0 ? cryptoObj.priceUsd : item.spotPrice;
      const baseSide = item.side;
      // Invert order direction following Item 8 recommendation (COMPRA -> VENDA / VENDA -> COMPRA)
      const executionSide: PositionSide = baseSide === 'LONG' ? 'SHORT' : 'LONG';

      const flow = generateLiveOrderFlowData(cryptoObj);
      const signal = generateLocalHFTConfluenceAnalysis(cryptoObj, flow);
      const hftVerify = verifyHftAiRecommendations(item.symbol, entryPrice, executionSide);
      if (hftVerify.stopLoss) {
        if (!signal.executionPlan) signal.executionPlan = {} as any;
        signal.executionPlan.stopLoss = hftVerify.stopLoss;
      }
      if (hftVerify.takeProfit) {
        if (!signal.executionPlan) signal.executionPlan = {} as any;
        signal.executionPlan.takeProfit1 = hftVerify.takeProfit;
      }
      const res = processConfluenceSignalForTrading(signal, entryPrice, currentAcc, currentPos, executionSide, true);
      if (res.tradeOpened) {
        setAccount({ ...res.account });
        setPositions([ ...res.positions ]);
        addLog('ORDER_OPEN', \`⚡ Disparo Automático (Gatilhos 1-7 Satisfeitos): Ordem Invertida conforme Item 8 executada em \${item.symbol} (\${baseSide === 'LONG' ? 'Sinal COMPRA ➔ Executando VENDA [SHORT]' : 'Sinal VENDA ➔ Executando COMPRA [LONG]'})! Entrada a mercado em US$ \${entryPrice > 10 ? entryPrice.toFixed(2) : entryPrice.toFixed(4)}.\`);
      }
    } catch (err) {`;

fileContent = fileContent.replace(oldExecTrigger, newExecTrigger);

// 3. Update handleExecuteTop3Directly for inverted side execution
const oldTop3Direct = `    const entryPrice = cryptoObj.priceUsd;
    // Verify HFT AI recommendations before manual order entry
    const hftVerify = verifyHftAiRecommendations(topItem.symbol, entryPrice, side);
    if (!hftVerify.isEligible) {
      addLog('WARNING', \`❌ Operação Manual Rejeitada para \${topItem.symbol}: \${hftVerify.reason}\`);
      return;
    }
    const flow = generateLiveOrderFlowData(cryptoObj);
    const signal = generateLocalHFTConfluenceAnalysis(cryptoObj, flow);
    if (hftVerify.stopLoss) {
      if (!signal.executionPlan) signal.executionPlan = {} as any;
      signal.executionPlan.stopLoss = hftVerify.stopLoss;
      addLog('INFO', \`🛡️ Ajuste HFT Stop Loss inteligente acionado para \${topItem.symbol} em US$ \${hftVerify.stopLoss.toFixed(2)} abaixo do suporte de volume.\`);
    }
    if (hftVerify.takeProfit) {
      if (!signal.executionPlan) signal.executionPlan = {} as any;
      signal.executionPlan.takeProfit1 = hftVerify.takeProfit;
    }
    const res = processConfluenceSignalForTrading(signal, entryPrice, account, positions, side, true);
    if (res.tradeOpened) {
      setAccount({...res.account});
      setPositions([...res.positions]);
      addLog('ORDER_OPEN', \`⚡ Operação Manual Solicitada: Posição aberta em \${topItem.symbol} (\${side === 'LONG' ? 'COMPRA' : 'VENDA'}) em US$ \${entryPrice > 10 ? entryPrice.toFixed(2) : entryPrice.toFixed(4)}.\`);
    }`;

const newTop3Direct = `    const entryPrice = cryptoObj.priceUsd;
    // Invert execution side following Item 8 recommendation
    const executionSide: PositionSide = side === 'LONG' ? 'SHORT' : 'LONG';

    // Verify HFT AI recommendations before manual order entry
    const hftVerify = verifyHftAiRecommendations(topItem.symbol, entryPrice, executionSide);
    if (!hftVerify.isEligible) {
      addLog('WARNING', \`❌ Operação Manual Rejeitada para \${topItem.symbol}: \${hftVerify.reason}\`);
      return;
    }
    const flow = generateLiveOrderFlowData(cryptoObj);
    const signal = generateLocalHFTConfluenceAnalysis(cryptoObj, flow);
    if (hftVerify.stopLoss) {
      if (!signal.executionPlan) signal.executionPlan = {} as any;
      signal.executionPlan.stopLoss = hftVerify.stopLoss;
      addLog('INFO', \`🛡️ Ajuste HFT Stop Loss inteligente acionado para \${topItem.symbol} em US$ \${hftVerify.stopLoss.toFixed(2)}.\`);
    }
    if (hftVerify.takeProfit) {
      if (!signal.executionPlan) signal.executionPlan = {} as any;
      signal.executionPlan.takeProfit1 = hftVerify.takeProfit;
    }
    const res = processConfluenceSignalForTrading(signal, entryPrice, account, positions, executionSide, true);
    if (res.tradeOpened) {
      setAccount({...res.account});
      setPositions([...res.positions]);
      addLog('ORDER_OPEN', \`⚡ Disparo Manual (Inversão Item 8): \${topItem.symbol} (\${side === 'LONG' ? 'Sinal COMPRA ➔ Executando VENDA [SHORT]' : 'Sinal VENDA ➔ Executando COMPRA [LONG]'})! Entrada em US$ \${entryPrice > 10 ? entryPrice.toFixed(2) : entryPrice.toFixed(4)}.\`);
    }`;

fileContent = fileContent.replace(oldTop3Direct, newTop3Direct);

// 4. Update readyTrigger search condition
fileContent = fileContent.replace(
  /const readyTrigger = evaluatedTriggers\.find\(t => t\.checksMetCount === 8 && !t\.openPos && t\.status === 'READY'\);/g,
  `const readyTrigger = evaluatedTriggers.find(t => (t.checks1to7Met || t.checksMetCount >= 7) && !t.openPos && t.status === 'READY');`
);

// 5. Update UI text banners & Trigger 8 labels
fileContent = fileContent.replace(
  /Ao satisfazer simultaneamente as <strong>8 verificações<\/strong> \(100% dos gatilhos\), o robô abre a ordem <strong>instantaneamente a mercado<\/strong>/g,
  `Ao satisfazer os <strong>Gatilhos 1 a 7<\/strong> (100%), o robô executa a ordem <strong>instantaneamente a mercado com a recomendação do Item 8 INVERTIDA<\/strong> (se for compra executa venda, se for venda executa compra)`
);

fileContent = fileContent.replace(
  /8\/8 = Execução Imediata/g,
  `Gatilhos 1-7 = Execução Invertida Item 8`
);

fileContent = fileContent.replace(
  /⚡ 4\/4 GATILHOS ATENDIDOS \(100%\) → EXECUTANDO EM AUTOMÁTICO IMEDIATO\.\.\./g,
  `⚡ GATILHOS 1-7 ATENDIDOS (100%) → EXECUTANDO ORDEM INVERTIDA ITEM 8...`
);

fileContent = fileContent.replace(
  /<span>8\. Varredura Direcional<\/span>/g,
  `<span>8. Recomendação Item 8 (Inversão)</span>`
);

fileContent = fileContent.replace(
  /\{item\.check8_SweepingMomentum \? 'Agressão a Favor' : 'Neutro \/ Contra'\}/g,
  `{item.side === 'LONG' ? 'Sinal Compra ➔ Executar VENDA (SHORT)' : 'Sinal Venda ➔ Executar COMPRA (LONG)'}`
);

fileContent = fileContent.replace(
  /Forçar Disparo \{isLong \? 'Compra \(LONG\)' : 'Venda \(SHORT\)'\} Imediato/g,
  `Forçar Disparo Invertido (\${isLong ? 'Executar VENDA [SHORT]' : 'Executar COMPRA [LONG]'})`
);

fs.writeFileSync('src/components/TradingExecutionDashboard.tsx', fileContent);
console.log('Update script executed successfully');
