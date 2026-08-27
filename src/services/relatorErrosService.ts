// Envia para a auditoria os erros que acontecem no navegador.
//
// Metade das falhas de uma aplicação assim acontece do lado do cliente: um
// componente que rebenta, uma promessa rejeitada, um fetch que morre. Nada
// disso chegava ao servidor, então a auditoria só via metade do quadro.
//
// Regras deste ficheiro:
// - nunca pode rebentar, senão o relator de erros vira fonte de erro;
// - não repete o mesmo erro em série, para uma falha em laço não inundar a base.

const JANELA_REPETICAO_MS = 30000;
const MAXIMO_POR_MINUTO = 12;

const vistosRecentemente = new Map<string, number>();
let enviadosNesteMinuto = 0;
let minutoCorrente = 0;

function podeEnviar(assinatura: string): boolean {
  const agora = Date.now();

  const minuto = Math.floor(agora / 60000);
  if (minuto !== minutoCorrente) {
    minutoCorrente = minuto;
    enviadosNesteMinuto = 0;
  }
  if (enviadosNesteMinuto >= MAXIMO_POR_MINUTO) return false;

  const ultimo = vistosRecentemente.get(assinatura);
  if (ultimo && agora - ultimo < JANELA_REPETICAO_MS) return false;

  vistosRecentemente.set(assinatura, agora);
  enviadosNesteMinuto++;

  // Não deixar o mapa crescer sem limite numa sessão longa.
  if (vistosRecentemente.size > 200) {
    for (const [k, v] of vistosRecentemente) {
      if (agora - v > JANELA_REPETICAO_MS) vistosRecentemente.delete(k);
    }
  }

  return true;
}

export function relatarErro(titulo: string, detalhe?: string, dados?: any, categoria = 'navegador') {
  try {
    const assinatura = `${categoria}|${titulo}|${(detalhe || '').slice(0, 120)}`;
    if (!podeEnviar(assinatura)) return;

    const corpo = JSON.stringify({
      categoria,
      nivel: 'erro',
      titulo: String(titulo).slice(0, 200),
      detalhe: String(detalhe || '').slice(0, 500),
      dados: { ...(dados || {}), url: location.pathname, agente: navigator.userAgent.slice(0, 120) }
    });

    fetch('/api/auditoria/evento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: corpo,
      keepalive: true
    }).catch(() => undefined);
  } catch {
    // O relator de erros nunca pode ser a causa de um erro.
  }
}

let instalado = false;

/** Liga a captura global. Chamar uma vez, no arranque da aplicação. */
export function instalarCapturaDeErros() {
  if (instalado || typeof window === 'undefined') return;
  instalado = true;

  window.addEventListener('error', (evento) => {
    const alvo: any = evento.target;
    // Falha a carregar um recurso (imagem, script) não tem evento.error.
    if (alvo && alvo !== window && (alvo.src || alvo.href)) {
      relatarErro('Recurso não carregou', String(alvo.src || alvo.href).slice(0, 300), {
        tipo: alvo.tagName
      });
      return;
    }

    relatarErro(
      evento.message || 'Erro no navegador',
      evento.error?.stack || String(evento.error || ''),
      { ficheiro: evento.filename, linha: evento.lineno, coluna: evento.colno }
    );
  }, true);

  window.addEventListener('unhandledrejection', (evento) => {
    const motivo: any = evento.reason;
    relatarErro(
      'Promessa rejeitada sem tratamento',
      motivo?.stack || String(motivo?.message || motivo || ''),
      {}
    );
  });
}
