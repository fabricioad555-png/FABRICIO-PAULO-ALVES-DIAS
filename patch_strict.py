import re

with open("src/components/TradingExecutionDashboard.tsx", "r") as f:
    content = f.read()

scan_old = """
    // Safety Net: Se o ambiente não for favorável e o operador não deu override manual
    if (!currentAnalysis.isFavorable && !override && !forced) {
      const now = Date.now();
      if (now - lastUnfavorableLogRef.current > 60000) { // Log once a minute to avoid spam
        addLog('WARNING', `Auto-Trader bloqueado: Indicador IA desfavorável (${currentAnalysis.score}/100). Aguardando melhora ou liberação manual.`);
        lastUnfavorableLogRef.current = now;
      }
      return;
    }
"""

scan_new = """
    // Safety Net: Se o ambiente não for favorável e o operador não deu override manual
    if (!currentAnalysis.isFavorable && !override) {
      const now = Date.now();
      if (now - lastUnfavorableLogRef.current > 60000 || forced) { // Log once a minute to avoid spam, or immediately if user clicked 'Scan'
        addLog('WARNING', `Auto-Trader bloqueado: Indicador IA aponta Divergência/Baixa Liquidez (${currentAnalysis.score}/100). Só será permitido entrada de novas ordens com Override ADM ou quando indicador liberar.`);
        lastUnfavorableLogRef.current = now;
      }
      setIsScanningNow(false);
      return;
    }
"""
content = content.replace(scan_old.strip(), scan_new.strip())

with open("src/components/TradingExecutionDashboard.tsx", "w") as f:
    f.write(content)

