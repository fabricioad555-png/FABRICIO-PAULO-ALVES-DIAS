import re

with open("src/components/TradingExecutionDashboard.tsx", "r") as f:
    content = f.read()

signal_old = """
  // Execution engine: evaluates a signal for a coin
  const executeSignalIfEligible = useCallback((signal: HighFrequencyConfluenceResult, currentPrice: number) => {
    const currentAcc = getTradingAccount();
    const currentPos = getPositions();

    if (!currentAcc.isAutoTradingEnabled) return;

    // Check if symbol is allowed by current asset selection mode
"""

signal_new = """
  // Execution engine: evaluates a signal for a coin
  const executeSignalIfEligible = useCallback((signal: HighFrequencyConfluenceResult, currentPrice: number) => {
    const currentAcc = getTradingAccount();
    const currentPos = getPositions();

    if (!currentAcc.isAutoTradingEnabled) return;

    const { adminOverrideActive: override, scalpingAnalysis: currentAnalysis } = stateRef.current;
    
    // Safety Net: Divergência entre o sinal da moeda e o Indicador IA geral (Janela de Scalping)
    if (!currentAnalysis.isFavorable && !override) {
      // Bloqueia a entrada de novas ordens porque o ambiente está divergente/desfavorável
      return;
    }

    // Check if symbol is allowed by current asset selection mode
"""
content = content.replace(signal_old.strip(), signal_new.strip())

with open("src/components/TradingExecutionDashboard.tsx", "w") as f:
    f.write(content)

