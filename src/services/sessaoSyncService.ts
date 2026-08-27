// Sincroniza o estado do terminal com o servidor, para abrir igual em qualquer
// computador.
//
// O app inteiro lê e escreve no localStorage de forma síncrona. Em vez de
// reescrever isso, este serviço espelha: puxa do servidor para o localStorage
// ao entrar, e empurra o localStorage para o servidor quando muda.
//
// O conteúdo vai cifrado no servidor, com chave derivada do código de acesso.
// O código fica só neste navegador e nunca é enviado para lugar nenhum além do
// próprio servidor da aplicação.

const CHAVE_CODIGO = 'sentinela_codigo_sessao';

// Só o que representa a sessão de operação. Cache de cotações e afins não entra:
// é volumoso, envelhece rápido e não faz falta noutro computador.
const CHAVES_ESPELHADAS = [
  'hft_demo_account',
  'hft_demo_positions',
  'hft_armed_order_triggers'
];

const INTERVALO_VERIFICACAO_MS = 15000;
const ATRASO_ENVIO_MS = 2500;

let ultimoRetrato = '';
let temporizadorEnvio: number | null = null;
let vigilanciaAtiva = false;

export function obterCodigo(): string | null {
  try {
    return localStorage.getItem(CHAVE_CODIGO);
  } catch {
    return null;
  }
}

export function definirCodigo(codigo: string) {
  try {
    localStorage.setItem(CHAVE_CODIGO, codigo.trim());
  } catch {
    // Armazenamento indisponível: a sessão funciona, só não persiste o código.
  }
}

export function esquecerCodigo() {
  try {
    localStorage.removeItem(CHAVE_CODIGO);
  } catch {
    // nada a fazer
  }
}

function montarRetrato(): Record<string, string> {
  const retrato: Record<string, string> = {};
  for (const chave of CHAVES_ESPELHADAS) {
    try {
      const valor = localStorage.getItem(chave);
      if (valor !== null) retrato[chave] = valor;
    } catch {
      // ignora chave inacessível
    }
  }
  return retrato;
}

function aplicarRetrato(retrato: Record<string, string>) {
  for (const [chave, valor] of Object.entries(retrato || {})) {
    if (!CHAVES_ESPELHADAS.includes(chave)) continue;
    try {
      localStorage.setItem(chave, valor);
    } catch {
      // ignora
    }
  }
}

/**
 * Puxa o estado do servidor e escreve no localStorage.
 * Devolve se encontrou algo, para quem chama decidir se recarrega a página.
 */
export async function carregarDoServidor(
  codigo: string
): Promise<{ ok: boolean; existe?: boolean; erro?: string; atualizadoEm?: string }> {
  try {
    const resposta = await fetch('/api/sessao/ler', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo })
    });

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok || !dados.ok) {
      return { ok: false, erro: dados.erro || `HTTP ${resposta.status}` };
    }

    if (dados.existe && dados.estado) {
      aplicarRetrato(dados.estado);
      ultimoRetrato = JSON.stringify(dados.estado);
    }

    return { ok: true, existe: Boolean(dados.existe), atualizadoEm: dados.atualizadoEm };
  } catch (erro: any) {
    return { ok: false, erro: erro?.message || 'falha de rede' };
  }
}

/** Empurra o estado atual para o servidor. */
export async function guardarNoServidor(codigo: string): Promise<{ ok: boolean; erro?: string }> {
  const retrato = montarRetrato();

  try {
    const resposta = await fetch('/api/sessao/guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, estado: retrato })
    });

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok || !dados.ok) {
      return { ok: false, erro: dados.erro || `HTTP ${resposta.status}` };
    }

    ultimoRetrato = JSON.stringify(retrato);
    return { ok: true };
  } catch (erro: any) {
    return { ok: false, erro: erro?.message || 'falha de rede' };
  }
}

function agendarEnvio(codigo: string) {
  if (temporizadorEnvio !== null) window.clearTimeout(temporizadorEnvio);
  temporizadorEnvio = window.setTimeout(() => {
    temporizadorEnvio = null;
    guardarNoServidor(codigo);
  }, ATRASO_ENVIO_MS);
}

/**
 * Passa a vigiar as mudanças e a enviá-las.
 *
 * A verificação é por comparação periódica em vez de gancho em cada escrita:
 * o estado é alterado em muitos pontos do código e ligar-se a todos eles seria
 * frágil, além de esquecer os que ainda vão existir.
 */
export function iniciarSincronizacao(codigo: string) {
  if (vigilanciaAtiva || typeof window === 'undefined') return;
  vigilanciaAtiva = true;

  ultimoRetrato = JSON.stringify(montarRetrato());

  const verificar = () => {
    const atual = JSON.stringify(montarRetrato());
    if (atual !== ultimoRetrato) {
      ultimoRetrato = atual;
      agendarEnvio(codigo);
    }
  };

  window.setInterval(verificar, INTERVALO_VERIFICACAO_MS);

  // Fechar a aba não pode perder o que acabou de acontecer.
  window.addEventListener('beforeunload', () => {
    const atual = JSON.stringify(montarRetrato());
    if (atual === ultimoRetrato) return;
    try {
      navigator.sendBeacon(
        '/api/sessao/guardar',
        new Blob([JSON.stringify({ codigo, estado: montarRetrato() })], { type: 'application/json' })
      );
    } catch {
      // melhor esforço
    }
  });
}

/** Apaga o estado gravado no servidor. Exige o código correto. */
export async function apagarDoServidor(codigo: string): Promise<{ ok: boolean; erro?: string; apagado?: boolean }> {
  try {
    const resposta = await fetch('/api/sessao/apagar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo })
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok || !dados.ok) return { ok: false, erro: dados.erro || `HTTP ${resposta.status}` };
    return { ok: true, apagado: Boolean(dados.apagado) };
  } catch (erro: any) {
    return { ok: false, erro: erro?.message || 'falha de rede' };
  }
}
