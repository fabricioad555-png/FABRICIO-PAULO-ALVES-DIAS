import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace analyze-orderflow mock
old_orderflow = """app.post("/api/ai/analyze-orderflow", async (req, res) => {
  return handleGenericAIRoute(req, res, "Analyze orderbook and trades flow. Return { success: true, buyPressure: number, sellPressure: number, tapeReading: string }", { success: true, buyPressure: 50, sellPressure: 50, tapeReading: "Neutral tape." });
});"""

new_orderflow = """app.post("/api/ai/analyze-orderflow", async (req, res) => {
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
});"""

content = content.replace(old_orderflow, new_orderflow)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

