import React, { useCallback, useEffect, useState } from 'react';
import { Radio, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';

interface Enlace {
  ok: boolean;
  existe?: boolean;
  endereco?: string;
  anunciadoEm?: string;
  idadeMinutos?: number;
  vivo?: boolean;
}

/**
 * Mostra onde o terminal de operação está atendendo agora.
 *
 * A Binance exige lista branca de IP em chave com Futuros, então operar de
 * verdade só funciona a partir da máquina autorizada. O endereço do túnel muda
 * a cada arranque, e esta faixa existe para ninguém precisar decorá-lo: a
 * máquina de casa anuncia, e esta página, que tem endereço fixo, aponta.
 *
 * Só aparece quando o endereço é diferente de onde já se está, para não
 * convidar a ir para o mesmo lugar.
 */
export function EnlaceOperacaoBanner() {
  const [enlace, setEnlace] = useState<Enlace | null>(null);
  const [aCarregar, setACarregar] = useState(true);

  const carregar = useCallback(async () => {
    setACarregar(true);
    try {
      const r = await fetch('/api/enlace');
      setEnlace(await r.json());
    } catch {
      setEnlace(null);
    } finally {
      setACarregar(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 120000);
    return () => clearInterval(t);
  }, [carregar]);

  if (aCarregar && !enlace) return null;
  if (!enlace?.ok || !enlace.existe || !enlace.endereco) return null;

  // Já estamos no terminal de operação: não faz sentido apontar para ele.
  try {
    if (new URL(enlace.endereco).host === window.location.host) return null;
  } catch {
    return null;
  }

  const vivo = enlace.vivo;

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${
        vivo
          ? 'bg-emerald-950/25 border-emerald-500/30'
          : 'bg-slate-900/60 border-slate-700'
      }`}
    >
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              vivo
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {vivo ? <Radio className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white">
              {vivo ? 'Terminal de operação disponível' : 'Terminal de operação parece desligado'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {vivo ? (
                <>
                  Esta página mostra cotações e análises. Para <strong>operar de verdade</strong>,
                  entre pelo endereço abaixo, que sai pelo IP autorizado na Binance.
                </>
              ) : (
                <>
                  O último endereço anunciado foi há {enlace.idadeMinutos} minutos e provavelmente
                  já não atende. Ligue o computador de casa e rode o atalho para gerar um novo.
                </>
              )}
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-1.5 break-all">{enlace.endereco}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={carregar}
            disabled={aCarregar}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Verificar se há um endereço mais recente"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${aCarregar ? 'animate-spin' : ''}`} />
          </button>

          {vivo && (
            <a
              href={enlace.endereco}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir terminal</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
