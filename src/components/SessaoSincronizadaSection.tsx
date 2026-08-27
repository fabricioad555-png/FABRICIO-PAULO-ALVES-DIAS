import React, { useEffect, useState } from 'react';
import {
  Cloud, CloudOff, RefreshCw, Check, AlertTriangle, LogOut, Lock, Upload, Download
} from 'lucide-react';
import {
  obterCodigo, definirCodigo, esquecerCodigo,
  carregarDoServidor, guardarNoServidor, iniciarSincronizacao
} from '../services/sessaoSyncService';

/**
 * Sessão sincronizada: permite abrir o terminal noutro computador com as
 * chaves, as posições e os gatilhos no lugar.
 *
 * O estado é gravado cifrado no servidor, com chave derivada deste código.
 * O código não é guardado em lado nenhum além deste navegador, por isso não
 * existe recuperação: perdê-lo é perder o estado gravado.
 */
export function SessaoSincronizadaSection() {
  const [codigo, setCodigo] = useState('');
  const [ligada, setLigada] = useState(false);
  const [ocupada, setOcupada] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro' | 'info'; texto: string } | null>(null);

  useEffect(() => {
    const guardado = obterCodigo();
    if (guardado) {
      setCodigo(guardado);
      setLigada(true);
      iniciarSincronizacao(guardado);
    }
  }, []);

  const entrar = async () => {
    const limpo = codigo.trim();
    if (limpo.length < 6) {
      setAviso({ tipo: 'erro', texto: 'Use pelo menos 6 caracteres. Código curto é código adivinhável.' });
      return;
    }

    setOcupada(true);
    setAviso(null);

    const r = await carregarDoServidor(limpo);
    setOcupada(false);

    if (!r.ok) {
      setAviso({ tipo: 'erro', texto: r.erro || 'Não foi possível ler a sessão.' });
      return;
    }

    definirCodigo(limpo);
    setLigada(true);
    iniciarSincronizacao(limpo);

    if (r.existe) {
      setAviso({ tipo: 'ok', texto: 'Sessão restaurada. A página vai recarregar para aplicar.' });
      window.setTimeout(() => window.location.reload(), 1400);
    } else {
      setAviso({
        tipo: 'info',
        texto: 'Código novo criado. O que estiver neste navegador passa a ser gravado a partir de agora.'
      });
      guardarNoServidor(limpo);
    }
  };

  const enviarAgora = async () => {
    setOcupada(true);
    const r = await guardarNoServidor(codigo.trim());
    setOcupada(false);
    setAviso(
      r.ok
        ? { tipo: 'ok', texto: 'Estado enviado para o servidor.' }
        : { tipo: 'erro', texto: r.erro || 'Falha ao enviar.' }
    );
  };

  const puxarAgora = async () => {
    setOcupada(true);
    const r = await carregarDoServidor(codigo.trim());
    setOcupada(false);
    if (r.ok && r.existe) {
      setAviso({ tipo: 'ok', texto: 'Estado recebido. A página vai recarregar.' });
      window.setTimeout(() => window.location.reload(), 1400);
    } else {
      setAviso({
        tipo: r.ok ? 'info' : 'erro',
        texto: r.ok ? 'Ainda não há nada gravado com este código.' : (r.erro || 'Falha ao ler.')
      });
    }
  };

  const sair = () => {
    esquecerCodigo();
    setLigada(false);
    setAviso({
      tipo: 'info',
      texto: 'Este navegador parou de sincronizar. O que está gravado no servidor continua lá.'
    });
  };

  const corAviso =
    aviso?.tipo === 'ok'
      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
      : aviso?.tipo === 'erro'
      ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
      : 'bg-slate-900/60 border-slate-700 text-slate-300';

  return (
    <div id="painel-sessao-sincronizada" className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-violet-950/30 via-slate-900 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
            {ligada ? <Cloud className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Sessão Sincronizada
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  ligada
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                }`}
              >
                {ligada ? 'Ligada' : 'Desligada'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Abra o terminal noutro computador com tudo no lugar.
            </p>
          </div>
        </div>

        {ligada && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={enviarAgora}
              disabled={ocupada}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" /> Enviar
            </button>
            <button
              type="button"
              onClick={puxarAgora}
              disabled={ocupada}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Buscar
            </button>
            <button
              type="button"
              onClick={sair}
              className="py-2 px-3 rounded-xl text-rose-300 hover:bg-rose-950/40 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Desligar
            </button>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {!ligada && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-violet-400" /> Código de acesso
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') entrar(); }}
                  placeholder="Escolha um código com pelo menos 6 caracteres"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm font-mono text-slate-100 placeholder-slate-600 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={entrar}
                  disabled={ocupada}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {ocupada ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Ligar sessão</span>
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <Lock className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>
                  O estado é gravado <strong className="text-slate-200">cifrado</strong> no servidor, com
                  chave derivada deste código. O código não é guardado em lugar nenhum além deste
                  navegador.
                </p>
                <p className="text-amber-300/90">
                  Por isso não existe recuperação: se perder o código, perde o que estava gravado.
                  Use o mesmo código no outro computador para encontrar tudo lá.
                </p>
              </div>
            </div>
          </>
        )}

        {ligada && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Sincronizando chaves da Binance, posições e gatilhos. As mudanças sobem sozinhas, e
              ao fechar a aba o que faltar é enviado antes de sair. Noutro computador, use o mesmo
              código para trazer tudo.
            </span>
          </div>
        )}

        {aviso && (
          <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs ${corAviso}`}>
            {aviso.tipo === 'erro' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{aviso.texto}</span>
          </div>
        )}
      </div>
    </div>
  );
}
