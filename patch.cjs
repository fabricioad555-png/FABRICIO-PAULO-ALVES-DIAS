const fs = require('fs');
let code = fs.readFileSync('src/services/tradingExecutionService.ts', 'utf8');

const regex = /timeDecayProfitTargetUsd: typeof parsed\.timeDecayProfitTargetUsd === 'number'.*/g;
code = code.replace(regex, "timeDecayProfitTargetUsd: typeof parsed.timeDecayProfitTargetUsd === 'number' && parsed.timeDecayProfitTargetUsd > 0 ? parsed.timeDecayProfitTargetUsd : 0.01,");

fs.writeFileSync('src/services/tradingExecutionService.ts', code);
