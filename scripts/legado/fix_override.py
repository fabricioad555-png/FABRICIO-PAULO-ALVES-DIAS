import re

with open("src/components/TradingExecutionDashboard.tsx", "r") as f:
    content = f.read()

# 1. Add adminOverrideActive state
state_code = """
  const [adminOverrideActive, setAdminOverrideActive] = useState(false);
  const lastUnfavorableLogRef = useRef<number>(0);
"""
content = content.replace("const [showScalpingWarningModal, setShowScalpingWarningModal] = useState(false);", "const [showScalpingWarningModal, setShowScalpingWarningModal] = useState(false);\n" + state_code)

# 2. Update stateRef
ref_code_old = """
  // Use a ref to keep the latest state for event listeners
  const stateRef = useRef({ account, positions, cryptos, top3Cryptos });
  useEffect(() => {
    stateRef.current = { account, positions, cryptos, top3Cryptos };
  }, [account, positions, cryptos, top3Cryptos]);
"""
ref_code_new = """
  // Use a ref to keep the latest state for event listeners
  const stateRef = useRef({ account, positions, cryptos, top3Cryptos, adminOverrideActive, scalpingAnalysis });
  useEffect(() => {
    stateRef.current = { account, positions, cryptos, top3Cryptos, adminOverrideActive, scalpingAnalysis };
  }, [account, positions, cryptos, top3Cryptos, adminOverrideActive, scalpingAnalysis]);
"""
content = content.replace(ref_code_old.strip(), ref_code_new.strip())

# 3. Add override check to runMarketScan
run_scan_old = """
    if (!currentAcc.isAutoTradingEnabled && !forced) return;

    setIsScanningNow(true);
"""
run_scan_new = """
    if (!currentAcc.isAutoTradingEnabled && !forced) return;

    const { adminOverrideActive: override, scalpingAnalysis: currentAnalysis } = stateRef.current;
    
    // Safety Net: Se o ambiente não for favorável e o operador não deu override manual
    if (!currentAnalysis.isFavorable && !override && !forced) {
      const now = Date.now();
      if (now - lastUnfavorableLogRef.current > 60000) { // Log once a minute to avoid spam
        addLog('WARNING', `Auto-Trader bloqueado: Indicador IA desfavorável (${currentAnalysis.score}/100). Aguardando melhora ou liberação manual.`);
        lastUnfavorableLogRef.current = now;
      }
      return;
    }

    setIsScanningNow(true);
"""
content = content.replace(run_scan_old.strip(), run_scan_new.strip())

# 4. Handle override in handleToggleAutoTrading
toggle_old = """
  const startAutoTrading = () => {
"""
toggle_new = """
  const startAutoTrading = (withOverride: boolean = false) => {
    setAdminOverrideActive(withOverride);
"""
content = content.replace(toggle_old.strip(), toggle_new.strip())

modal_old = """
              <button 
                type="button"
                onClick={() => {
                  setShowScalpingWarningModal(false);
                  startAutoTrading();
                }}
"""
modal_new = """
              <button 
                type="button"
                onClick={() => {
                  setShowScalpingWarningModal(false);
                  startAutoTrading(true);
                }}
"""
content = content.replace(modal_old.strip(), modal_new.strip())

# Add visual badge on dashboard if override is active
dashboard_ui_old = """
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                Indicador IA: Janela de Scalping
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${scalpingAnalysis.isFavorable ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                  {scalpingAnalysis.recommendedAction}
                </span>
              </h3>
"""
dashboard_ui_new = """
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                Indicador IA: Janela de Scalping
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${scalpingAnalysis.isFavorable ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                  {scalpingAnalysis.recommendedAction}
                </span>
                {adminOverrideActive && !scalpingAnalysis.isFavorable && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse">
                    OVERRIDE ADM ATIVO
                  </span>
                )}
              </h3>
"""
content = content.replace(dashboard_ui_old.strip(), dashboard_ui_new.strip())

# When user manually pauses, remove override
stop_old = """
    } else {
      // Trying to turn OFF
      const updated = { ...account, isAutoTradingEnabled: false };
      saveTradingAccount(updated);
      setAccount(updated);
      addLog('WARNING', 'Robô Auto-Trader PAUSADO pelo usuário.');
    }
"""
stop_new = """
    } else {
      // Trying to turn OFF
      const updated = { ...account, isAutoTradingEnabled: false };
      saveTradingAccount(updated);
      setAccount(updated);
      setAdminOverrideActive(false); // Reset override on stop
      addLog('WARNING', 'Robô Auto-Trader PAUSADO pelo usuário.');
    }
"""
content = content.replace(stop_old.strip(), stop_new.strip())

with open("src/components/TradingExecutionDashboard.tsx", "w") as f:
    f.write(content)

