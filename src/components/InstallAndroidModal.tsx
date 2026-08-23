import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle2, Share2, PlusSquare, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';

interface InstallAndroidModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAndroidModal: React.FC<InstallAndroidModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  const currentUrl = window.location.href;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-gradient-to-b from-[#12141a] via-[#0a0a0b] to-[#12141a] border border-indigo-500/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-mono text-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0a0a0b]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Smartphone className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                PWA Web App Oficial
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                Instalar no Celular Android
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-xs font-sans">
          
          {/* Status / Direct Button */}
          {deferredPrompt ? (
            <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-4 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
              <div>
                <p className="font-bold text-sm text-emerald-300 font-mono">Dispositivo Android Detectado!</p>
                <p className="text-slate-300 text-xs mt-1">Clique no botão abaixo para instalar o aplicativo instantaneamente no seu Android.</p>
              </div>
              <button
                onClick={handleInstallClick}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Aplicativo Agora</span>
              </button>
            </div>
          ) : isInstalled ? (
            <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-4 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-bold text-emerald-300 font-mono">Aplicativo Já Instalado!</p>
              <p className="text-slate-300 text-xs">A plataforma já está rodando como Web App no seu Android.</p>
            </div>
          ) : null}

          {/* Step-by-Step Manual Android Instructions */}
          <div className="space-y-3 font-mono">
            <h4 className="text-xs font-bold text-indigo-300 uppercase flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4 text-indigo-400" /> Como instalar manualmente no Android (Chrome / Brave / Edge):
            </h4>

            <div className="space-y-2.5 font-sans">
              <div className="flex items-start gap-3 p-3 bg-[#12141a] rounded-xl border border-slate-800">
                <span className="bg-indigo-600 text-white font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">1</span>
                <div>
                  <p className="font-semibold text-slate-200">Abra no Navegador do Celular</p>
                  <p className="text-slate-400 text-[11px]">Acesse este link no Google Chrome ou seu navegador no Android.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-[#12141a] rounded-xl border border-slate-800">
                <span className="bg-indigo-600 text-white font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">2</span>
                <div>
                  <p className="font-semibold text-slate-200">Toque no Menu do Navegador (3 pontinhos ⋮)</p>
                  <p className="text-slate-400 text-[11px]">Localizado no canto superior direito do seu navegador Android.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-[#12141a] rounded-xl border border-slate-800">
                <span className="bg-indigo-600 text-white font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">3</span>
                <div>
                  <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                    Selecione <strong className="text-emerald-400">"Adicionar à Tela Inicial"</strong> ou <strong className="text-emerald-400">"Instalar Aplicativo"</strong>
                  </p>
                  <p className="text-slate-400 text-[11px]">O ícone do aplicativo será adicionado diretamente à tela inicial do seu celular.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Share Link Box */}
          <div className="p-3 bg-[#0a0a0b] border border-slate-800 rounded-xl space-y-2 font-mono">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Link Direto para o Celular:</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="bg-[#12141a] border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-indigo-300 w-full font-mono select-all"
              />
              <button
                onClick={() => navigator.clipboard.writeText(currentUrl)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                Copiar
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0a0a0b] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
