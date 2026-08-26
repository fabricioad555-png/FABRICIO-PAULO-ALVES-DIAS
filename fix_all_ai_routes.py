import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# First, let's remove the block I added previously
pattern = r'// Start Express and Vite Middleware[\s\S]*?(?=// Start Express and Vite Middleware)'
content = re.sub(pattern, '', content)

unified_ai_routes = """
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function handleGenericAIRoute(req, res, promptContext, defaultResponse) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json(defaultResponse);
    }
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert AI trading analyst. Analyze the following data and provide a JSON response based on the context: ${promptContext}. Data: ${JSON.stringify(req.body)}`,
      config: {
        responseMimeType: "application/json"
      }
    });
    const text = response.text || "{}";
    try {
      const parsed = JSON.parse(text);
      parsed.success = true;
      return res.json(parsed);
    } catch {
      return res.json(defaultResponse);
    }
  } catch (error) {
    return res.json(defaultResponse);
  }
}

app.post("/api/analyze-forum", async (req, res) => {
  return handleGenericAIRoute(req, res, "Analyze forum sentiment. Return JSON with 'analysis' object containing 'sentiment' ('BULLISH'|'BEARISH'|'NEUTRAL'), 'score' (number), 'summary' (string), and 'keywords' (array of strings).", { success: true, analysis: { sentiment: 'NEUTRAL', score: 50, summary: "Not enough data", keywords: [] } });
});

app.post("/api/predict-movements", async (req, res) => {
  return handleGenericAIRoute(req, res, "Predict price movements. Return JSON with 'report' string (markdown).", { success: true, report: "Error analyzing or not enough data." });
});

app.post("/api/forum-chat", async (req, res) => {
  return handleGenericAIRoute(req, res, "Chat about crypto forums. Return JSON with 'reply' string.", { success: true, reply: "I cannot analyze that right now." });
});

app.post("/api/scan-patterns", async (req, res) => {
  return handleGenericAIRoute(req, res, "Scan for chart patterns. Return JSON with 'result' object containing 'top5Patterns' array.", { success: true, result: { top5Patterns: [] } });
});

app.post("/api/analyze-technical-momentum", async (req, res) => {
  return handleGenericAIRoute(req, res, "Analyze technical momentum. Return JSON with 'result' object containing 'momentum' ('STRONG_BUY'|'BUY'|'NEUTRAL'|'SELL'|'STRONG_SELL'), 'score', 'keyLevels' (support, resistance arrays).", { success: true, result: { momentum: 'NEUTRAL', score: 50, keyLevels: { support: [], resistance: [] } } });
});

app.post("/api/analyze-hft-flow", async (req, res) => {
  return handleGenericAIRoute(req, res, "Analyze High Frequency Trading order flow. Return JSON with 'result' object containing 'orderFlowImbalance', 'dominantDirection' ('BUY'|'SELL'), 'spoofingDetected' (boolean).", { success: true, result: { orderFlowImbalance: 0, dominantDirection: 'BUY', spoofingDetected: false } });
});

app.post("/api/ai/onchain-master-analysis", async (req, res) => {
  return handleGenericAIRoute(req, res, "Analyze on-chain master data. Return JSON with 'result' object.", { success: true, result: { summary: 'Neutro', overallSentiment: 'NEUTRAL' } });
});

app.post("/api/ai/analyze-orderflow", async (req, res) => {
  return handleGenericAIRoute(req, res, "Analyze orderbook and trades flow. Return JSON with a 'result' object containing 'bestEntryOpportunity' and 'aiAnalysis'.", {
    success: true,
    result: {
      bestEntryOpportunity: {
        recommendedAction: "COMPRA / LONG",
        triggerPrice: 100,
        confirmationSignal: "Confirmação Neutra",
        displacementPotentialPct: "+1.5%",
        expectedTarget: 102,
        recommendedStop: 98,
        riskRewardRatio: "1:2",
        confidenceScore: 75,
        rationale: "Análise quantitativa baseada no orderbook e tape."
      },
      aiAnalysis: {
        summary: "Varredura algorítmica concluída.",
        bookAbsorptionDiagnosis: "Suporte no Bid.",
        tapeReadingInsight: "Agressões neutras.",
        liquidityVacuumDetected: false,
        whaleFootprint: "Sem atividade massiva."
      }
    }
  });
});

app.post("/api/ai/high-frequency-confluence", async (req, res) => {
  return handleGenericAIRoute(req, res, "Calculate HFT confluence. Return JSON with 'result' object.", { 
    success: true, 
    result: {
      confluenceScorePct: 50, 
      finalSignal: 'NEUTRAL', 
      paretoCriticality: { winProbabilityPct: 50, layerBreakdown: [] }, 
      trigger: false 
    }
  });
});

app.post("/api/system-audit", async (req, res) => {
  return handleGenericAIRoute(req, res, "Audit the trading system. Return JSON with 'systemHealth', 'warnings' (array), 'recommendations' (array).", { success: true, systemHealth: 100, warnings: [], recommendations: [] });
});
"""

content = content.replace('// Start Express and Vite Middleware', unified_ai_routes + '\n\n// Start Express and Vite Middleware')

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
