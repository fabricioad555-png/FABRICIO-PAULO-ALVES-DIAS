// Estado da sessao guardado no servidor, para o terminal abrir igual em
// qualquer computador.
//
// O conteudo vai CIFRADO. A chave e derivada do codigo de acesso com scrypt e
// nunca sai daqui; do codigo em si so guardamos o hash. Isto importa porque o
// estado inclui a chave secreta da Binance: sem cifra, quem alcancasse o banco
// alcancaria a conta.
//
// Consequencia assumida: codigo perdido e estado perdido. Nao ha recuperacao.

import crypto from 'crypto';

const TEMPO_LIMITE_MS = 6000;
const TABELA = 'sessoes_estado';

function urlBase() {
  return process.env.SUPABASE_URL || '';
}

function chaveSupabase() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
}

export function sessaoAtiva() {
  return Boolean(urlBase() && chaveSupabase());
}

function cabecalhos(extra = {}) {
  const k = chaveSupabase();
  return {
    apikey: k,
    Authorization: `Bearer ${k}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

/** Identificador da linha. O codigo nunca e guardado, so este hash. */
function identificador(codigo) {
  return crypto.createHash('sha256').update(`sentinela:${codigo}`).digest('hex');
}

function derivarChave(codigo, salt) {
  return crypto.scryptSync(codigo, salt, 32);
}

function cifrar(codigo, objeto) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const chave = derivarChave(codigo, salt);
  const cifra = crypto.createCipheriv('aes-256-gcm', chave, iv);
  const dados = Buffer.concat([cifra.update(JSON.stringify(objeto), 'utf8'), cifra.final()]);
  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cifra.getAuthTag().toString('base64'),
    dados: dados.toString('base64')
  };
}

function decifrar(codigo, linha) {
  const chave = derivarChave(codigo, Buffer.from(linha.salt, 'base64'));
  const decifra = crypto.createDecipheriv('aes-256-gcm', chave, Buffer.from(linha.iv, 'base64'));
  decifra.setAuthTag(Buffer.from(linha.tag, 'base64'));
  const texto = Buffer.concat([
    decifra.update(Buffer.from(linha.dados, 'base64')),
    decifra.final()
  ]).toString('utf8');
  return JSON.parse(texto);
}

export function codigoValido(codigo) {
  return typeof codigo === 'string' && codigo.trim().length >= 6;
}

/** Grava o estado. Substitui o anterior do mesmo codigo. */
export async function guardarEstado(codigo, estado) {
  if (!sessaoAtiva()) return { ok: false, erro: 'armazenamento de sessao desligado no servidor' };
  if (!codigoValido(codigo)) return { ok: false, erro: 'codigo de acesso invalido' };

  const linha = { id: identificador(codigo), ...cifrar(codigo, estado), atualizado_em: new Date().toISOString() };

  try {
    const resposta = await fetch(`${urlBase()}/rest/v1/${TABELA}`, {
      method: 'POST',
      headers: cabecalhos({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(linha),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS)
    });

    if (!resposta.ok) {
      const texto = await resposta.text().catch(() => '');
      return { ok: false, erro: `HTTP ${resposta.status} ${texto}`.trim() };
    }

    return { ok: true, atualizadoEm: linha.atualizado_em };
  } catch (erro) {
    return { ok: false, erro: erro?.message || String(erro) };
  }
}

/** Le o estado. Codigo errado nao decifra, e isso e o proprio controlo de acesso. */
export async function lerEstado(codigo) {
  if (!sessaoAtiva()) return { ok: false, erro: 'armazenamento de sessao desligado no servidor' };
  if (!codigoValido(codigo)) return { ok: false, erro: 'codigo de acesso invalido' };

  try {
    const url = `${urlBase()}/rest/v1/${TABELA}?id=eq.${identificador(codigo)}&select=*`;
    const resposta = await fetch(url, {
      headers: cabecalhos(),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS)
    });

    if (!resposta.ok) {
      const texto = await resposta.text().catch(() => '');
      return { ok: false, erro: `HTTP ${resposta.status} ${texto}`.trim() };
    }

    const linhas = await resposta.json();
    if (!linhas.length) return { ok: true, existe: false, estado: null };

    try {
      return {
        ok: true,
        existe: true,
        estado: decifrar(codigo, linhas[0]),
        atualizadoEm: linhas[0].atualizado_em
      };
    } catch {
      // A cifra e autenticada: falhar aqui significa codigo errado.
      return { ok: false, erro: 'codigo de acesso incorreto' };
    }
  } catch (erro) {
    return { ok: false, erro: erro?.message || String(erro) };
  }
}
