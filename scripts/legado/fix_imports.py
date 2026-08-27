with open("src/components/TradingExecutionDashboard.tsx", "r") as f:
    content = f.read()

import_statement = "import { generateScalpingAiAnalysis, ScalpingAiAnalysis } from '../services/scalpingAiService';\n"
content = content.replace("import { generateLiveOrderFlowData } from '../services/orderFlowDataService';", "import { generateLiveOrderFlowData } from '../services/orderFlowDataService';\n" + import_statement)

with open("src/components/TradingExecutionDashboard.tsx", "w") as f:
    f.write(content)
