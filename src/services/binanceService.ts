// Serviço de ligação à Binance.
//
// As funções e os formatos de retorno são os mesmos de antes, mas o caminho
// mudou: as chamadas passam pelo proxy do próprio servidor em /api/binance/*
// em vez de irem do navegador direto para a Binance.
//
// Motivo: a Binance não devolve cabeçalhos de CORS nos endpoints assinados.
// O navegador consegue chamar /api/v3/ping, que é público, mas /api/v3/account
// e /api/v3/order morrem em "Failed to fetch" antes de sair da página. Foi
// confirmado com um navegador real contra a página publicada.
//
// Efeito colateral bom: a chave secreta deixa de ser usada para assinar dentro
// do JavaScript da página.

/**
 * Assinatura HMAC-SHA256 no navegador.
 *
 * Continua exportada por compatibilidade, mas já não é usada pelo fluxo normal:
 * quem assina agora é o servidor, que é onde a chave secreta deve viver.
 */
export async function signRequest(secret: string, queryString: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await window.crypto.subtle.sign(
      "HMAC",
      key,
      enc.encode(queryString)
    );
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    console.error('Error signing request:', err);
    throw new Error('Falha ao gerar assinatura HMAC-SHA256');
  }
}

interface BinanceTestResult {
  success: boolean;
  message: string;
  pingMs?: number;
  spotBalance?: number;
  futuresBalance?: number;
  permissions?: string[];
  futuresDetails?: {
    totalWalletBalance: number;
    availableBalance: number;
    totalMarginBalance: number;
  };
}

const TEMPO_LIMITE_MS = 30000;

async function chamarProxy(caminho: string, corpo: any) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

  try {
    const resposta = await fetch(caminho, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: controlador.signal
    });

    const texto = await resposta.text();
    let dados: any;
    try {
      dados = texto ? JSON.parse(texto) : {};
    } catch {
      // Resposta ilegível não é ligação estabelecida.
      return {
        success: false,
        message: `Resposta inválida do servidor (HTTP ${resposta.status}).`
      };
    }
    return dados;
  } catch (erro: any) {
    return {
      success: false,
      message: erro?.name === 'AbortError'
        ? 'Tempo limite excedido ao contactar a Binance através do servidor.'
        : (erro?.message || 'Falha de rede ao contactar o servidor.')
    };
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Duplo check da ligação: confirma Spot e Futuros na Binance.
 *
 * Só devolve sucesso quando a corretora responde. Nenhum saldo é inventado:
 * o que aparece é o que a Binance mandou.
 */
export async function doubleCheckBinanceConnection(
  apiKey: string,
  apiSecret: string,
  isTestnet: boolean = false
): Promise<BinanceTestResult> {
  const inicio = Date.now();
  const environment = isTestnet ? 'testnet' : 'binance_pt';

  const [spot, futuros] = await Promise.all([
    chamarProxy('/api/binance/test-connection', {
      apiKey, apiSecret, environment, accountType: 'SPOT'
    }),
    chamarProxy('/api/binance/test-connection', {
      apiKey, apiSecret, environment, accountType: 'FUTURES'
    })
  ]);

  const totalPing = Date.now() - inicio;

  // Nenhum dos dois passou: a chave não serve para nada.
  if (!spot?.success && !futuros?.success) {
    const motivo = spot?.message || futuros?.message || 'Falha de comunicação com a Binance.';
    return { success: false, message: motivo, pingMs: spot?.pingMs || futuros?.pingMs };
  }

  const saldoSpot = spot?.success ? Number(spot.accountBalanceUsdt) || 0 : 0;
  const saldoFuturos = futuros?.success ? Number(futuros.accountBalanceUsdt) || 0 : 0;

  const permissoes: string[] = [];
  if (spot?.success) permissoes.push('SPOT');
  if (futuros?.success) permissoes.push('FUTURES');
  if (spot?.permissions?.length) permissoes.push(...spot.permissions);

  // Um dos dois falhou: é informação útil, não motivo para esconder o resultado.
  const parcial = !spot?.success
    ? ` Spot indisponível para esta chave: ${spot?.message || 'sem detalhe'}`
    : !futuros?.success
    ? ` Futuros indisponível para esta chave: ${futuros?.message || 'sem detalhe'}`
    : '';

  return {
    success: true,
    message: `Ligação confirmada pela Binance em ${totalPing}ms.${parcial}`,
    pingMs: spot?.pingMs || futuros?.pingMs || Math.round(totalPing / 2),
    spotBalance: saldoSpot,
    futuresBalance: saldoFuturos,
    permissions: Array.from(new Set(permissoes)),
    futuresDetails: futuros?.success
      ? {
          totalWalletBalance: saldoFuturos,
          availableBalance: saldoFuturos,
          totalMarginBalance: saldoFuturos
        }
      : undefined
  };
}

/**
 * Envia a ordem à Binance através do proxy do servidor.
 * O nome continua o mesmo para não partir quem já a chama.
 */
export async function dispatchClientSideBinanceOrder(params: {
  apiKey: string;
  apiSecret: string;
  isTestnet: boolean;
  accountType: 'SPOT' | 'FUTURES';
  symbol: string;
  side: 'BUY' | 'SELL';
  sizeUsd: number;
  priceUsd: number;
  type: 'MARKET' | 'LIMIT';
}): Promise<any> {
  const simbolo = params.symbol.toUpperCase().endsWith('USDT')
    ? params.symbol.toUpperCase()
    : `${params.symbol.toUpperCase()}USDT`;

  if (!params.priceUsd || params.priceUsd <= 0) {
    return { success: false, message: 'Preço inválido: não dá para calcular a quantidade da ordem.' };
  }

  const quantidade = (params.sizeUsd / params.priceUsd).toFixed(4);

  const resposta = await chamarProxy('/api/binance/order', {
    apiKey: params.apiKey,
    apiSecret: params.apiSecret,
    environment: params.isTestnet ? 'testnet' : 'binance_pt',
    accountType: params.accountType,
    symbol: simbolo,
    side: params.side.toUpperCase(),
    type: params.type.toUpperCase(),
    quantity: quantidade
  });

  if (!resposta?.success) {
    return {
      success: false,
      message: resposta?.message || 'Falha ao processar ordem na Binance.'
    };
  }

  return {
    success: true,
    orderId: resposta.orderId,
    status: resposta.status || 'FILLED',
    executedQty: resposta.executedQty,
    message: resposta.message || 'Ordem aceite pela Binance.'
  };
}
