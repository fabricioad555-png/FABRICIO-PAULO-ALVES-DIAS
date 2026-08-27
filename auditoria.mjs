// Camada de auditoria persistente (Supabase / Postgres).
//
// Escreve pelo PostgREST com fetch simples, sem dependencia nova no projeto.
// As tabelas tem RLS ligado e nenhuma politica publica, por isso so a chave de
// servico consegue ler e escrever. Sem essa variavel de ambiente a auditoria
// fica desligada e a API continua a funcionar exatamente como antes.

// As variaveis sao lidas na hora do uso, e nao no carregamento do modulo.
// Em ESM os imports correm antes do dotenv.config() do server.ts, por isso
// ler aqui em cima deixava tudo vazio quando o servidor corre em casa.
function urlBase() {
  return process.env.SUPABASE_URL || '';
}

// A chave de servico tem precedencia. A publicavel serve porque as politicas
// da base sao append-only: com ela da para inserir e ler, nunca alterar nem
// apagar. Basta definir SUPABASE_SERVICE_ROLE_KEY para passar a usa-la.
function chave() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
}

const TEMPO_LIMITE_MS = 2500;

export function auditoriaAtiva() {
  return Boolean(urlBase() && chave());
}

function cabecalhos(extra = {}) {
  const k = chave();
  return {
    apikey: k,
    Authorization: `Bearer ${k}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

/**
 * Mascara a chave da API: guarda o suficiente para distinguir uma chave da
 * outra e nunca o suficiente para a reutilizar. O segredo nunca e guardado.
 */
export function mascararChave(chave) {
  if (!chave || typeof chave !== 'string') return null;
  const limpa = chave.trim();
  if (limpa.length < 12) return '***';
  return `${limpa.slice(0, 4)}...${limpa.slice(-4)}`;
}

async function inserir(tabela, registo) {
  if (!auditoriaAtiva()) return null;

  try {
    const resposta = await fetch(`${urlBase()}/rest/v1/${tabela}`, {
      method: 'POST',
      headers: cabecalhos({ Prefer: 'return=minimal' }),
      body: JSON.stringify(registo),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS)
    });

    if (!resposta.ok) {
      const texto = await resposta.text().catch(() => '');
      console.warn(`[auditoria] falha ao escrever em ${tabela}: ${resposta.status} ${texto}`);
      return null;
    }

    return true;
  } catch (erro) {
    // A auditoria nunca pode derrubar a rota que esta a auditar.
    console.warn(`[auditoria] erro ao escrever em ${tabela}: ${erro?.message || erro}`);
    return null;
  }
}

export function registarChamada({ metodo, rota, statusHttp, duracaoMs, regiao }) {
  return inserir('chamadas_api', {
    metodo,
    rota,
    status_http: statusHttp,
    duracao_ms: duracaoMs,
    regiao: regiao || process.env.VERCEL_REGION || null
  });
}

export function registarLigacao({
  ambiente,
  tipoConta,
  cluster,
  chaveMascarada,
  sucesso,
  codigoErro,
  mensagem,
  pingMs,
  saldoUsdt
}) {
  return inserir('ligacoes_binance', {
    ambiente: ambiente || 'desconhecido',
    tipo_conta: tipoConta || 'SPOT',
    cluster: cluster || null,
    chave_mascarada: chaveMascarada || null,
    sucesso: Boolean(sucesso),
    codigo_erro: codigoErro != null ? String(codigoErro) : null,
    mensagem: mensagem || null,
    ping_ms: Number.isFinite(pingMs) ? Math.round(pingMs) : null,
    saldo_usdt: Number.isFinite(saldoUsdt) ? saldoUsdt : null
  });
}

export function registarOrdem({
  ambiente,
  tipoConta,
  simbolo,
  lado,
  tipo,
  quantidade,
  status,
  orderIdBinance,
  quantidadeExecutada,
  valorExecutado,
  sucesso,
  mensagem,
  resposta
}) {
  return inserir('ordens', {
    ambiente: ambiente || null,
    tipo_conta: tipoConta || null,
    simbolo: simbolo || 'desconhecido',
    lado: lado || null,
    tipo: tipo || null,
    quantidade: Number.isFinite(Number(quantidade)) ? Number(quantidade) : null,
    status: status || null,
    order_id_binance: orderIdBinance != null ? String(orderIdBinance) : null,
    quantidade_executada: Number.isFinite(Number(quantidadeExecutada)) ? Number(quantidadeExecutada) : null,
    valor_executado: Number.isFinite(Number(valorExecutado)) ? Number(valorExecutado) : null,
    sucesso: Boolean(sucesso),
    mensagem: mensagem || null,
    resposta: resposta || null
  });
}

export function registarEvento({ categoria, nivel, titulo, detalhe, dados } = {}) {
  const niveisValidos = ['info', 'alerta', 'erro'];
  return inserir('eventos_auditoria', {
    categoria: categoria || 'geral',
    nivel: niveisValidos.includes(nivel) ? nivel : 'info',
    titulo: titulo || 'sem titulo',
    detalhe: detalhe || null,
    dados: dados || null
  });
}

async function listar(tabela, { limite = 50, ordem = 'criada_em' } = {}) {
  if (!auditoriaAtiva()) return { linhas: [], erro: 'auditoria desligada' };

  try {
    const url = `${urlBase()}/rest/v1/${tabela}?select=*&order=${ordem}.desc&limit=${limite}`;
    const resposta = await fetch(url, {
      headers: cabecalhos(),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS * 2)
    });

    if (!resposta.ok) {
      const texto = await resposta.text().catch(() => '');
      return { linhas: [], erro: `${tabela}: HTTP ${resposta.status} ${texto}`.trim() };
    }

    return { linhas: await resposta.json(), erro: null };
  } catch (erro) {
    return { linhas: [], erro: `${tabela}: ${erro?.message || erro}` };
  }
}

/**
 * Devolve o retrato da auditoria para o painel: ligacoes, ordens, eventos e
 * a telemetria das chamadas ao proxy.
 */
export async function lerAuditoria({ limite = 40 } = {}) {
  const [resLigacoes, resOrdens, resEventos, resChamadas] = await Promise.all([
    listar('ligacoes_binance', { limite }),
    listar('ordens', { limite }),
    listar('eventos_auditoria', { limite, ordem: 'criado_em' }),
    listar('chamadas_api', { limite })
  ]);

  const ligacoes = resLigacoes.linhas;
  const ordens = resOrdens.linhas;
  const eventos = resEventos.linhas;
  const chamadas = resChamadas.linhas;

  // Distingue "ligada e ainda sem registos" de "ligada mas sem permissao".
  const diagnostico =
    resLigacoes.erro || resOrdens.erro || resEventos.erro || resChamadas.erro || null;

  const totalOrdens = ordens.length;
  const ordensComSucesso = ordens.filter((o) => o.sucesso).length;
  const totalLigacoes = ligacoes.length;
  const ligacoesComSucesso = ligacoes.filter((l) => l.sucesso).length;
  const latencias = chamadas.map((c) => c.duracao_ms).filter((d) => Number.isFinite(d));
  const latenciaMedia = latencias.length
    ? Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length)
    : null;

  return {
    ativa: true,
    diagnostico,
    resumo: {
      totalLigacoes,
      ligacoesComSucesso,
      totalOrdens,
      ordensComSucesso,
      eventosDeErro: eventos.filter((e) => e.nivel === 'erro').length,
      latenciaMediaMs: latenciaMedia,
      regiao: process.env.VERCEL_REGION || 'local'
    },
    ligacoes,
    ordens,
    eventos,
    chamadas
  };
}
