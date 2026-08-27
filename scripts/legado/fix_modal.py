with open("src/components/TradingExecutionDashboard.tsx", "r") as f:
    content = f.read()

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

content = content.replace("    </div>\n  );\n}", modal_html + "\n    </div>\n  );\n}")

with open("src/components/TradingExecutionDashboard.tsx", "w") as f:
    f.write(content)
