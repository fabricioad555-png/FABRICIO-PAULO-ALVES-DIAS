const fs = require('fs');

let fileContent = fs.readFileSync('src/components/TradingExecutionDashboard.tsx', 'utf8');

// 1. Revert evaluatedTriggers calculation
fileContent = fileContent.replace(
  /const checks1to7Met = Boolean\(check1_DuplaChancela && check2_ConfluenceScore && check3_BookAndAbsorption && check4_CapacityAndMargin && check5_AntiTrap && check6_CapitalImbalance && check7_PriceDisplacement\);\s*const check9_AutoTradingOn = account\.isAutoTradingEnabled;/g,
  `const check9_AutoTradingOn = account.isAutoTradingEnabled;`
);

fileContent = fileContent.replace(
  /\} else if \(checks1to7Met && check9_AutoTradingOn && isMomentumFavorable\) \{/g,
  `} else if (checksMetCount === 8 && check9_AutoTradingOn && isMomentumFavorable) {`
);

fileContent = fileContent.replace(
  /check8_SweepingMomentum,\s*checks1to7Met,/g,
  `check8_SweepingMomentum,`
);

// 2. Revert readyTrigger search condition
fileContent = fileContent.replace(
  /const readyTrigger = evaluatedTriggers\.find\(t => \(t\.checks1to7Met \|\| t\.checksMetCount >= 7\) && !t\.openPos && t\.status === 'READY'\);/g,
  `const readyTrigger = evaluatedTriggers.find(t => t.checksMetCount === 8 && !t.openPos && t.status === 'READY');`
);

// 3. Revert UI text banners & Trigger 8 labels
fileContent = fileContent.replace(
  /Ao satisfazer os <strong>Gatilhos 1 a 7<\/strong> \(100%\), o robô executa a ordem <strong>instantaneamente a mercado com a recomendação do Item 8 INVERTIDA<\/strong> \(se for compra executa venda, se for venda executa compra\)/g,
  `Ao satisfazer simultaneamente as <strong>8 verificações</strong> (100% dos gatilhos), o robô abre a ordem <strong>instantaneamente a mercado</strong>`
);

fileContent = fileContent.replace(
  /Gatilhos 1-7 = Execução Invertida Item 8/g,
  `8/8 = Execução Imediata`
);

fileContent = fileContent.replace(
  /<span>8\. Recomendação Item 8 \(Inversão\)<\/span>/g,
  `<span>8. Varredura Direcional</span>`
);

fileContent = fileContent.replace(
  /Forçar Disparo Invertido \(\$\{isLong \? 'Executar VENDA \[SHORT\]' : 'Executar COMPRA \[LONG\]'\}\)/g,
  `Forçar Disparo \${isLong ? 'Compra (LONG)' : 'Venda (SHORT)'} Imediato`
);

fs.writeFileSync('src/components/TradingExecutionDashboard.tsx', fileContent);
console.log('Revert script executed successfully');
