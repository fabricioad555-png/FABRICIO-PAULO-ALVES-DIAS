import React, { useCallback, useEffect, useState } from 'react';
import {
  Database, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Activity, Timer, Server, Plug, Receipt, ScrollText
} from 'lucide-react';

interface Resumo {
  totalLigacoes: number;
  ligacoesComSucesso: number;
  totalOrdens: number;
  ordensComSucesso: number;
  eventosDeErro: number;
  latenciaMediaMs: number | null;
  regiao: string | null;
}

interface LinhaLigacao {
  id: number;
  ambiente: string;
  tipo_conta: string;
  cluster: string | null;
  chave_mascarada: string | null;
  sucesso: boolean;
  codigo_erro: string | null;
  mensagem: string | null;
  ping_ms: number | null;
  saldo_usdt: number | null;
  criada_em: string;
}

interface LinhaOrdem {
  id: number;
  simbolo: string;
  lado: string | null;
  tipo: string | null;
  quantidade: number | null;
  status: string | null;
  order_id_binance: string | null;
  sucesso: boolean;
  mensagem: string | null;
  criada_em: string;
}

interface LinhaEvento {
  id: number;
  categoria: string;
  nivel: string;
  titulo: string;
  detalhe: string | null;
  criado_em: string;
}

interface RespostaAuditoria {
  ativa: boolean;
  mensagem?: string;
  erro?: string;
  diagnostico?: string | null;
  resumo?: Resumo;
  ligacoes?: LinhaLigacao[];
  ordens?: LinhaOrdem[];
  eventos?: LinhaEvento[];
}

function formatarData(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return iso;
  }
}

function Cartao({
  icone,
  rotulo,
  valor,
  cor
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  cor: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
      <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
        {icone} {rotulo}
      </span>
      <div className={`text-lg font-bold mt-1 font-mono ${cor}`}>{valor}</div>
    </div>
  );
}

/**
 * Painel da auditoria gravada em base de dados.
 * Ao contrário do resto do sistema, que vive no localStorage do navegador,
 * estes registos ficam no servidor e sobrevivem a limpar o navegador.
 */
export function AuditoriaPersistentePanel() {
  const [dados, setDados] = useState<RespostaAuditoria | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setACarregar(true);
    setErro(null);
    try {
      const resposta = await fetch('/api/auditoria?limite=25');
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      setDados(await resposta.json());
    } catch (e: any) {
      setErro(e?.message || 'falha ao contactar o servidor');
    } finally {
      setACarregar(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const temporizador = setInterval(carregar, 60000);
    return () => clearInterval(temporizador);
  }, [carregar]);

  const resumo = dados?.resumo;

  return (
    <div id="painel-auditoria-persistente" className="rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-sky-950/30 via-slate-900 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Auditoria em Base de Dados
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                  dados?.ativa
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                }`}
              >
                {dados?.ativa ? 'Ativa' : 'Desligada'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Registo permanente no servidor. Não se perde ao limpar o navegador.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={carregar}
          disabled={aCarregar}
          className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${aCarregar ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      <div className="p-5 space-y-5">
        {erro && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>Não foi possível ler a auditoria: {erro}</span>
          </div>
        )}

        {dados && !dados.ativa && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-slate-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{dados.mensagem || 'Auditoria desligada no servidor.'}</span>
          </div>
        )}

        {dados?.ativa && dados.diagnostico && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-slate-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">A base respondeu, mas recusou a leitura.</p>
              <p className="font-mono text-[10.5px] text-slate-400 break-all">{dados.diagnostico}</p>
            </div>
          </div>
        )}

        {resumo && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Cartao
              icone={<Plug className="w-3.5 h-3.5 text-amber-400" />}
              rotulo="Ligações"
              valor={`${resumo.ligacoesComSucesso}/${resumo.totalLigacoes}`}
              cor="text-amber-300"
            />
            <Cartao
              icone={<Receipt className="w-3.5 h-3.5 text-emerald-400" />}
              rotulo="Ordens aceites"
              valor={`${resumo.ordensComSucesso}/${resumo.totalOrdens}`}
              cor="text-emerald-300"
            />
            <Cartao
              icone={<XCircle className="w-3.5 h-3.5 text-rose-400" />}
              rotulo="Eventos de erro"
              valor={String(resumo.eventosDeErro)}
              cor={resumo.eventosDeErro > 0 ? 'text-rose-300' : 'text-slate-300'}
            />
            <Cartao
              icone={<Timer className="w-3.5 h-3.5 text-indigo-400" />}
              rotulo="Latência média"
              valor={resumo.latenciaMediaMs != null ? `${resumo.latenciaMediaMs} ms` : '—'}
              cor="text-indigo-300"
            />
            <Cartao
              icone={<Server className="w-3.5 h-3.5 text-cyan-400" />}
              rotulo="Região"
              valor={resumo.regiao || '—'}
              cor="text-cyan-300"
            />
          </div>
        )}

        {dados?.ligacoes && dados.ligacoes.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Plug className="w-3.5 h-3.5 text-amber-400" /> Últimas ligações à Binance
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-950/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Quando</th>
                    <th className="px-3 py-2 font-semibold">Chave</th>
                    <th className="px-3 py-2 font-semibold">Ambiente</th>
                    <th className="px-3 py-2 font-semibold">Resultado</th>
                    <th className="px-3 py-2 font-semibold">Detalhe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {dados.ligacoes.map((l) => (
                    <tr key={l.id} className="bg-slate-900/40">
                      <td className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap">{formatarData(l.criada_em)}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{l.chave_mascarada || '—'}</td>
                      <td className="px-3 py-2 text-slate-300">{l.ambiente} · {l.tipo_conta}</td>
                      <td className="px-3 py-2">
                        {l.sucesso ? (
                          <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> ligou</span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {l.codigo_erro || 'falhou'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-400 max-w-md truncate">{l.mensagem || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {dados?.ordens && dados.ordens.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-400" /> Últimas ordens enviadas
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-950/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Quando</th>
                    <th className="px-3 py-2 font-semibold">Par</th>
                    <th className="px-3 py-2 font-semibold">Lado</th>
                    <th className="px-3 py-2 font-semibold">Quantidade</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {dados.ordens.map((o) => (
                    <tr key={o.id} className="bg-slate-900/40">
                      <td className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap">{formatarData(o.criada_em)}</td>
                      <td className="px-3 py-2 font-mono text-slate-200">{o.simbolo}</td>
                      <td className={`px-3 py-2 font-semibold ${o.lado === 'SELL' ? 'text-rose-400' : 'text-emerald-400'}`}>{o.lado || '—'}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">{o.quantidade ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{o.sucesso ? (o.status || 'aceite') : (o.mensagem || 'recusada')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {dados?.eventos && dados.eventos.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ScrollText className="w-3.5 h-3.5 text-indigo-400" /> Eventos
            </h3>
            <ul className="space-y-1.5">
              {dados.eventos.map((e) => (
                <li key={e.id} className="flex items-start gap-2 text-[11px] p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                      e.nivel === 'erro'
                        ? 'bg-rose-500/20 text-rose-300'
                        : e.nivel === 'alerta'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    {e.nivel}
                  </span>
                  <span className="text-slate-300 font-medium">{e.titulo}</span>
                  {e.detalhe && <span className="text-slate-500 truncate">{e.detalhe}</span>}
                  <span className="ml-auto font-mono text-slate-500 whitespace-nowrap">{formatarData(e.criado_em)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {dados?.ativa && !aCarregar &&
          !dados.ligacoes?.length && !dados.ordens?.length && !dados.eventos?.length && (
            <div className="flex items-center gap-2.5 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
              <Activity className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Base de dados ligada e ainda sem registos. Assim que ligar as chaves ou enviar uma ordem, aparece aqui.</span>
            </div>
          )}
      </div>
    </div>
  );
}
