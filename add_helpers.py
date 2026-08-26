import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

helpers = """
// Helper: Safe JSON parsing from fetch Response
async function safeParseResponse(res: Response): Promise<{ ok: boolean; data: any; rawText: string }> {
  try {
    const rawText = await res.text();
    if (!rawText || !rawText.trim()) {
      return { ok: res.ok, data: null, rawText: "" };
    }
    const data = JSON.parse(rawText);
    return { ok: res.ok, data, rawText };
  } catch (err: any) {
    return { ok: false, data: null, rawText: "" };
  }
}

// Helper: Sign Binance Query
function signBinanceQuery(queryString: string, apiSecret: string): string {
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
}

function resolveBinanceConfig(reqBody: any) {
  const { environment = process.env.BINANCE_ACTIVE_ENV || 'binance_pt', accountType = 'SPOT', proxyUrl, serverCluster } = reqBody;
  
  const isTestnet = environment === 'testnet';
  const isBinanceUs = environment === 'binance_us';
  const isFutures = accountType === 'FUTURES';
  
  let cleanApiKey = reqBody.apiKey ? String(reqBody.apiKey).trim().replace(/[\\r\\n\\t"']/g, '') : '';
  let cleanApiSecret = reqBody.apiSecret ? String(reqBody.apiSecret).trim().replace(/[\\r\\n\\t"']/g, '') : '';

  if (!cleanApiKey || !cleanApiSecret) {
    if (isTestnet) {
      cleanApiKey = cleanApiKey || process.env.BINANCE_TESTNET_API_KEY || '';
      cleanApiSecret = cleanApiSecret || process.env.BINANCE_TESTNET_API_SECRET || '';
    } else {
      cleanApiKey = cleanApiKey || process.env.BINANCE_LIVE_API_KEY || '';
      cleanApiSecret = cleanApiSecret || process.env.BINANCE_LIVE_API_SECRET || '';
    }
  }

  let defaultBaseUrl = process.env.BINANCE_LIVE_REST_URL || "https://api.binance.com";
  
  if (proxyUrl && typeof proxyUrl === 'string' && proxyUrl.trim().startsWith('http')) {
    defaultBaseUrl = proxyUrl.trim().replace(/\\/$/, '');
  } else if (isTestnet) {
    defaultBaseUrl = isFutures ? (process.env.BINANCE_TESTNET_REST_URL || "https://demo-fapi.binance.com") : "https://testnet.binance.vision";
  } else if (isFutures) {
    defaultBaseUrl = process.env.BINANCE_LIVE_REST_URL || "https://fapi.binance.com";
  } else if (isBinanceUs) {
    defaultBaseUrl = "https://api.binance.us";
  } else if (serverCluster && typeof serverCluster === 'string') {
    defaultBaseUrl = `https://${serverCluster.trim()}`;
  }

  return { cleanApiKey, cleanApiSecret, isTestnet, isFutures, isBinanceUs, defaultBaseUrl };
}
"""

# add it before app.post("/api/crypto-live-prices
content = content.replace('app.get("/api/crypto-live-prices"', helpers + '\napp.get("/api/crypto-live-prices"')

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
