// Onde o terminal de operacao esta atendendo agora.
//
// O tunel gratuito sorteia um endereco novo a cada arranque, e decorar isso e
// impraticavel. Entao a maquina de casa anuncia o endereco atual, e a pagina
// da Vercel, que nunca muda, mostra para onde ir.
//
// Nao cria tabela nova: reaproveita o armazenamento cifrado da sessao com uma
// chave interna fixa. O conteudo e so um endereco publico, mas fica cifrado na
// mesma, porque e o mecanismo que ja existe.

import { guardarEstado, lerEstado, sessaoAtiva } from './sessao.mjs';

// Chave interna, nao e segredo de utilizador: serve so para separar este
// registo dos estados de sessao das pessoas.
const CHAVE_INTERNA = 'enlace-do-terminal-de-operacao';

// Passado este tempo sem anuncio, o endereco e considerado morto. O tunel
// reanuncia a cada cinco minutos, entao vinte minutos e folga suficiente para
// uma falha de rede passageira nao apagar um terminal que esta de pe.
const VALIDADE_MS = 20 * 60 * 1000;

export function enlaceDisponivel() {
  return sessaoAtiva();
}

export async function anunciarEnlace(endereco, origem) {
  if (!enlaceDisponivel()) return { ok: false, erro: 'armazenamento desligado no servidor' };

  const limpo = String(endereco || '').trim();
  if (!/^https?:\/\//.test(limpo)) {
    return { ok: false, erro: 'endereco invalido' };
  }

  return guardarEstado(CHAVE_INTERNA, {
    endereco: limpo,
    origem: String(origem || 'desconhecida').slice(0, 60),
    anunciadoEm: new Date().toISOString()
  });
}

export async function lerEnlace() {
  if (!enlaceDisponivel()) return { ok: false, erro: 'armazenamento desligado no servidor' };

  const r = await lerEstado(CHAVE_INTERNA);
  if (!r.ok) return r;
  if (!r.existe || !r.estado?.endereco) return { ok: true, existe: false };

  const anunciadoEm = new Date(r.estado.anunciadoEm).getTime();
  const idadeMs = Date.now() - anunciadoEm;

  return {
    ok: true,
    existe: true,
    endereco: r.estado.endereco,
    origem: r.estado.origem,
    anunciadoEm: r.estado.anunciadoEm,
    idadeMinutos: Math.round(idadeMs / 60000),
    // Vivo significa "anunciou ha pouco", nao "respondeu agora". Quem abrir o
    // endereco descobre o resto; aqui so evitamos apontar para algo antigo.
    vivo: idadeMs < VALIDADE_MS
  };
}
