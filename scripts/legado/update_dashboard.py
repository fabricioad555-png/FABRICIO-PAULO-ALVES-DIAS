import re

with open("src/components/TradingExecutionDashboard.tsx", "r") as f:
    content = f.read()

# Add imports
imports = """
import { generateScalpingAiAnalysis, ScalpingAiAnalysis } from '../services/scalpingAiService';
"""
content = content.replace("import { updateDemoBalance, saveTradingAccount, getTradingAccount, updateAssetSelectionMode } from '../services/tradingExecutionService';", "import { updateDemoBalance, saveTradingAccount, getTradingAccount, updateAssetSelectionMode } from '../services/tradingExecutionService';" + imports)

# Add states inside component
states = """
  const [scalpingAnalysis, setScalpingAnalysis] = useState<ScalpingAiAnalysis>(() => generateScalpingAiAnalysis());
  const [showScalpingWarningModal, setShowScalpingWarningModal] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setScalpingAnalysis(generateScalpingAiAnalysis());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);
"""

content = content.replace("const [isCustomSelectorOpen, setIsCustomSelectorOpen] = useState(false);", "const [isCustomSelectorOpen, setIsCustomSelectorOpen] = useState(false);" + states)

# Update handleToggleAutoTrading
toggle_logic = """
  const startAutoTrading = () => {
    const nextState = true;
    const updated = { ...account, isAutoTradingEnabled: nextState };
    saveTradingAccount(updated);
    setAccount(updated);
    
    const modeLabel = (account.assetSelectionMode || 'TOP_3_PROBABILITY') === 'TOP_3_PROBABILITY'
      ? 'Cesta Top 3 Maior Probabilidade (Ciclo 10min)'
      : (account.assetSelectionMode === 'CUSTOM')
      ? 'Seleção Personalizada'
      : 'Todos os 15 Ativos';
    addLog('INFO', `Robô Auto-Trader INICIADO no modo [${modeLabel}]. Executando varredura e monitorando sinais IA...`);
    setTimeout(() => runMarketScan(true), 150);
  };

  const handleToggleAutoTrading = () => {
    if (!account.isAutoTradingEnabled) {
      // Trying to turn ON
      const currentAnalysis = generateScalpingAiAnalysis();
      setScalpingAnalysis(currentAnalysis);
      
      if (!currentAnalysis.isFavorable) {
        setShowScalpingWarningModal(true);
      } else {
        startAutoTrading();
      }
    } else {
      // Trying to turn OFF
      const updated = { ...account, isAutoTradingEnabled: false };
      saveTradingAccount(updated);
      setAccount(updated);
      addLog('WARNING', 'Robô Auto-Trader PAUSADO pelo usuário.');
    }
  };
"""
# Replace the original handleToggleAutoTrading
content = re.sub(
    r"const handleToggleAutoTrading = \(\) => \{.*?\};", 
    toggle_logic.strip(), 
    content, 
    flags=re.DOTALL
)

# Add Scalping Indicator UI right below the Header (after the `<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80"> ... </div>`)
ui_html = """
      {/* SCALPING AI INDICATOR MODULE */}
      <div className="bg-[#12141a] border border-indigo-500/40 rounded-2xl p-4 font-mono shadow-inner my-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${scalpingAnalysis.isFavorable ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-amber-500/20 border-amber-500/50 text-amber-400'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                Indicador IA: Janela de Scalping
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${scalpingAnalysis.isFavorable ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                  {scalpingAnalysis.recommendedAction}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {scalpingAnalysis.timeAnalysis}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 shrink-0 bg-[#0a0a0b] p-2.5 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Score Momento</span>
              <span className={`text-sm font-black ${scalpingAnalysis.isFavorable ? 'text-emerald-400' : 'text-amber-400'}`}>
                {scalpingAnalysis.score}/100
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Força</span>
              <span className="text-sm font-black text-indigo-300">
                {scalpingAnalysis.momentumStrength}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Direção</span>
              <span className="text-sm font-black text-cyan-300">
                {scalpingAnalysis.direction}
              </span>
            </div>
          </div>
        </div>
      </div>
"""

# Insert the ui html just before the ASSET SELECTION MODE SELECTOR
content = content.replace("{/* ASSET SELECTION MODE SELECTOR (Top 3 Highest Probability / All / Custom) */}", ui_html + "\n      {/* ASSET SELECTION MODE SELECTOR (Top 3 Highest Probability / All / Custom) */}")

# Add Modal at the end of the file
modal_html = """
      {/* SCALPING WARNING MODAL */}
      {showScalpingWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a0a0b] border border-amber-500/50 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-mono">Alerta: Ambiente Desfavorável</h3>
                <p className="text-xs text-amber-300 font-mono mt-0.5">Indicador de Scalping em baixa ({scalpingAnalysis.score}/100)</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              O Indicador IA detectou que o momento atual <strong>não é o ideal para operações de Scalp</strong> (ganhos curtos). 
              A força do movimento direcional está fraca ou o horário atual não favorece alta liquidez institucional.
            </p>
            
            <div className="bg-[#12141a] p-3 rounded-xl border border-slate-800 mb-6 font-mono text-[11px] text-slate-400">
              {scalpingAnalysis.timeAnalysis}
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setShowScalpingWarningModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white font-bold hover:bg-slate-700 transition"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowScalpingWarningModal(false);
                  startAutoTrading();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-amber-500/50 bg-amber-500/20 text-amber-400 font-bold hover:bg-amber-500/30 transition"
              >
                Iniciar Mesmo Assim
              </button>
            </div>
          </div>
        </div>
      )}
"""
content = content.replace("</section>", modal_html + "\n    </section>")

with open("src/components/TradingExecutionDashboard.tsx", "w") as f:
    f.write(content)

