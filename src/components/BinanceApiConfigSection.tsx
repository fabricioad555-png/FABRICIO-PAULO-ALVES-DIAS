import React, { useEffect, useState } from 'react';
import {
  KeyRound, ShieldCheck, AlertTriangle, Wallet, Signal, Plug, Lock, Server
} from 'lucide-react';
import { BinanceApiConfigModal } from './BinanceApiConfigModal';
import { getTradingAccount, TRADING_ACCOUNT_EVENT } from '../services/tradingExecutionService';
import { BinanceApiConfig } from '../types/tradingTypes';

const PROMPT_FLAG = 'binance_api_prompt_shown';

/**
 * Aba de ligação à Binance: primeiro bloco do sistema.
 * Serve para introduzir manualmente a Chave da API e a Chave Secreta
 * logo à entrada, antes de o bot começar a operar.
 */
export function BinanceApiConfigSection() {
  const [config, setConfig] = useState<BinanceApiConfig | undefined>(
    () => getTradingAccount().binanceConfig
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const sync = () => setConfig(getTradingAccount().binanceConfig);
    window.addEventListener(TRADING_ACCOUNT_EVENT, sync);
    return () => window.removeEventListener(TRADING_ACCOUNT_EVENT, sync);
  }, []);

  // Abre a janela automaticamente na primeira entrada, enquanto não houver chaves gravadas.
  useEffect(() => {
    const current = getTradingAccount().binanceConfig;
    if (current?.isConnected) return;
    try {
      if (sessionStorage.getItem(PROMPT_FLAG)) return;
      sessionStorage.setItem(PROMPT_FLAG, '1');
    } catch {
      // Armazenamento indisponível (janela anónima): abre à mesma.
    }
    setIsModalOpen(true);
  }, []);

  const isConnected = Boolean(config?.isConnected);
  const hasKeys = Boolean(config?.apiKey && config?.apiSecret);

  const maskedKey = config?.apiKey
    ? `${config.apiKey.slice(0, 6)}${'•'.repeat(10)}${config.apiKey.slice(-4)}`
    : '—';

  return (
    <div id="binance-api-config-section" className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Ligação à API Binance
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  isConnected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                {isConnected ? 'Ligada' : 'Por configurar'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Introduza aqui a Chave da API e a Chave Secreta para o bot operar na sua conta.
            </p>
          </div>
        </div>

        <button
          id="btn-open-binance-config-tab"
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
        >
          <Plug className="w-4 h-4" />
          <span>{isConnected ? 'Gerir chaves' : 'Introduzir chaves da API'}</span>
        </button>
      </div>

      <div className="p-5">
        {isConnected ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Saldo USDT
              </span>
              <div className="text-base font-bold text-emerald-400 mt-1 font-mono">
                ${(config?.accountBalanceUsdt || 0).toLocaleString('pt-PT', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Chave da API
              </span>
              <div className="text-xs font-mono text-slate-200 mt-1.5 truncate">{maskedKey}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400" /> Mercado / Ambiente
              </span>
              <div className="text-xs font-medium text-slate-200 mt-1.5 truncate">
                {config?.accountType || 'SPOT'} · {config?.environment || 'production'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Signal className="w-3.5 h-3.5 text-indigo-400" /> Latência
              </span>
              <div className="text-base font-bold text-indigo-300 mt-1 font-mono">
                {config?.pingMs ? `${config.pingMs} ms` : '—'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start gap-3 p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
              <p className="font-semibold text-amber-200">
                O bot ainda não tem chaves da Binance gravadas neste dispositivo.
              </p>
              <p>
                Crie uma chave em <strong>Binance ➔ Gestão de API</strong> com permissões de
                <strong> Leitura</strong> e <strong>Spot / Futuros</strong>.
                Nunca ative <strong>Levantamentos</strong>.
              </p>
              <p className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                As chaves ficam guardadas apenas no seu navegador
                {hasKeys ? ' (já existem chaves por validar).' : '.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <BinanceApiConfigModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={config}
        onConnectedSuccess={() => setConfig(getTradingAccount().binanceConfig)}
      />
    </div>
  );
}
