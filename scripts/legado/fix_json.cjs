const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/components/SingleCryptoTimesAndTrades.tsx',
  'src/components/AICryptoChatDrawer.tsx',
  'src/components/PasteAnalyzerModal.tsx',
  'src/components/PredictiveMovementModal.tsx',
  'src/components/IndividualTechnicalAnalysisBlock.tsx',
  'src/components/OnChainHistoryAnalysisBlock.tsx',
  'src/components/AIPatternFilterBlock.tsx'
];

for (const file of targetFiles) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace "const data = await response.json();" with safe version
  const searchStr = "const data = await response.json();";
  const replaceStr = `let data: any;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (parseError) {
        throw new Error('O servidor está sobrecarregado (Limite de requisições excedido). Tente novamente em alguns segundos.');
      }`;
  
  if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
