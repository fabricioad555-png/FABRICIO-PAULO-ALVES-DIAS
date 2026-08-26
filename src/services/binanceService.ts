import { BinanceApiConfig } from '../types/tradingTypes';

// Native HMAC-SHA256 signing using browser SubtleCrypto API
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

/**
 * Performs a highly secure browser-direct API test ("Duplo Check") using the user's local IP.
 * Bypasses US-based cloud servers directly through client-side fetches.
 */
export async function doubleCheckBinanceConnection(
  apiKey: string,
  apiSecret: string,
  isTestnet: boolean = false
): Promise<BinanceTestResult> {
  const startTime = Date.now();
  
  // Choose correct base URLs for direct local connection
  const spotBase = isTestnet 
    ? 'https://testnet.binance.vision' 
    : 'https://api.binance.com';
    
  const futuresBase = isTestnet 
    ? 'https://testnet.binancefuture.com' 
    : 'https://fapi.binance.com';

  try {
    // -------------------------------------------------------------
    // CHECK 1: SPOT GENERAL CONNECTIVITY & TIMING (Check 1 of Dual Check)
    // -------------------------------------------------------------
    const spotTimeStart = Date.now();
    const serverTimeRes = await fetch(`${spotBase}/api/v3/time`);
    if (!serverTimeRes.ok) {
      throw new Error(`Servidor Spot indisponível (HTTP ${serverTimeRes.status})`);
    }
    const serverTimeData = await serverTimeRes.json();
    const serverTime = serverTimeData.serverTime;
    const pingMs = Date.now() - spotTimeStart;

    // Build signed query for Spot Account test
    const spotQueryString = `timestamp=${serverTime}&recvWindow=10000`;
    const spotSignature = await signRequest(apiSecret, spotQueryString);
    
    const spotAccRes = await fetch(`${spotBase}/api/v3/account?${spotQueryString}&signature=${spotSignature}`, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!spotAccRes.ok) {
      const errorData = await spotAccRes.json().catch(() => ({}));
      throw new Error(`Check 1 Falhou (Spot/Geral): ${errorData.msg || 'API Key inválida ou sem permissão IP'}`);
    }
    
    const spotAccData = await spotAccRes.json();
    const permissions = spotAccData.permissions || ['SPOT'];
    
    // Extract USDT Spot balance if any
    let spotUsdtBalance = 0;
    if (spotAccData.balances) {
      const usdtAsset = spotAccData.balances.find((b: any) => b.asset === 'USDT');
      if (usdtAsset) {
        spotUsdtBalance = parseFloat(usdtAsset.free || '0') + parseFloat(usdtAsset.locked || '0');
      }
    }

    // -------------------------------------------------------------
    // CHECK 2: FUTURES ACCOUNT SPECIFIC ACCESS (Check 2 of Dual Check)
    // -------------------------------------------------------------
    const futuresQueryString = `timestamp=${serverTime}&recvWindow=10000`;
    const futuresSignature = await signRequest(apiSecret, futuresQueryString);

    const futuresAccRes = await fetch(`${futuresBase}/fapi/v2/account?${futuresQueryString}&signature=${futuresSignature}`, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!futuresAccRes.ok) {
      const errorData = await futuresAccRes.json().catch(() => ({}));
      throw new Error(`Check 2 Falhou (Futuros): ${errorData.msg || 'Acesso Futuros USD-M desativado para esta chave.'}`);
    }

    const futuresAccData = await futuresAccRes.json();
    const totalWalletBalance = parseFloat(futuresAccData.totalWalletBalance || '0');
    const availableBalance = parseFloat(futuresAccData.availableBalance || '0');
    const totalMarginBalance = parseFloat(futuresAccData.totalMarginBalance || '0');

    const totalPing = Date.now() - startTime;

    return {
      success: true,
      message: `Duplo Check bem-sucedido! Conexão Spot & Futuros validada via IP local (${totalPing}ms)`,
      pingMs: Math.max(1, Math.round(totalPing / 2)),
      spotBalance: spotUsdtBalance,
      futuresBalance: totalWalletBalance,
      permissions: [...permissions, 'FUTURES'],
      futuresDetails: {
        totalWalletBalance,
        availableBalance,
        totalMarginBalance
      }
    };

  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Falha de comunicação com os servidores da Binance.'
    };
  }
}

/**
 * Execute client-side order dispatching for Futuros/Spot directly from user browser IP
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
  const spotBase = params.isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
  const futuresBase = params.isTestnet ? 'https://testnet.binancefuture.com' : 'https://fapi.binance.com';
  
  const formattedSymbol = params.symbol.toUpperCase().endsWith('USDT') 
    ? params.symbol.toUpperCase() 
    : `${params.symbol.toUpperCase()}USDT`;

  try {
    // Sync time
    const timeRes = await fetch(`${spotBase}/api/v3/time`);
    const timeData = await timeRes.json();
    const timestamp = timeData.serverTime;

    const qty = (params.sizeUsd / params.priceUsd).toFixed(4);

    let queryParts = [
      `symbol=${formattedSymbol}`,
      `side=${params.side.toUpperCase()}`,
      `type=${params.type.toUpperCase()}`,
      `quantity=${qty}`,
      `timestamp=${timestamp}`,
      `recvWindow=10000`
    ];

    if (params.type === 'LIMIT') {
      queryParts.push(`price=${params.priceUsd.toFixed(2)}`);
      queryParts.push(`timeInForce=GTC`);
    }

    if (params.accountType === 'FUTURES') {
      // Add standard fields if needed, futures often defaults timeInForce
    }

    const queryString = queryParts.join('&');
    const signature = await signRequest(params.apiSecret, queryString);
    const finalUrl = params.accountType === 'FUTURES'
      ? `${futuresBase}/fapi/v1/order?${queryString}&signature=${signature}`
      : `${spotBase}/api/v3/order?${queryString}&signature=${signature}`;

    const orderRes = await fetch(finalUrl, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': params.apiKey,
        'Content-Type': 'application/json'
      }
    });

    const data = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(data.msg || 'Erro ao enviar ordem na Binance');
    }

    return {
      success: true,
      orderId: data.orderId || data.clientOrderId,
      status: data.status || 'FILLED',
      message: 'Ordem despachada com sucesso diretamente via IP local!'
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Falha ao processar ordem na Binance.'
    };
  }
}
