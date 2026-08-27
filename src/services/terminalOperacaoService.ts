// Descobre se esta página é o terminal onde dá para operar.
//
// A Binance exige lista branca de IP em chave com Futuros, então só a máquina
// autorizada consegue autenticar. Abrir a janela de chaves noutro lugar leva a
// pessoa direto a um erro que nada ali pode resolver.

export interface TerminalDeOperacao {
  /** Existe um terminal anunciado e recente. */
  disponivel: boolean;
  /** Esta página é esse terminal. */
  aqui: boolean;
  endereco?: string;
}

let cache: TerminalDeOperacao | null = null;
let consultaEmCurso: Promise<TerminalDeOperacao> | null = null;

/**
 * Na dúvida devolve `aqui: true`.
 *
 * Se o servidor não responder, é melhor deixar a pessoa tentar do que bloquear
 * um terminal que talvez funcione: o custo de tentar é uma mensagem de erro, o
 * de bloquear é não conseguir operar.
 */
export async function consultarTerminalDeOperacao(): Promise<TerminalDeOperacao> {
  if (cache) return cache;
  if (consultaEmCurso) return consultaEmCurso;

  consultaEmCurso = (async () => {
    try {
      const r = await fetch('/api/enlace');
      const d = await r.json();

      if (!d?.ok || !d.existe || !d.endereco || !d.vivo) {
        return { disponivel: false, aqui: true };
      }

      const mesmo = new URL(d.endereco).host === window.location.host;
      return { disponivel: true, aqui: mesmo, endereco: d.endereco };
    } catch {
      return { disponivel: false, aqui: true };
    } finally {
      consultaEmCurso = null;
    }
  })();

  cache = await consultaEmCurso;
  return cache;
}
