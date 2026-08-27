import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

helper_code = """// Helper: Parse and resolve Binance Config mimicking Python dataclass behavior
function resolveBinanceConfig(reqBody: any) {
  // Use active env from dot env if not provided
  const { environment = process.env.BINANCE_ACTIVE_ENV || 'binance_pt', accountType = 'SPOT', proxyUrl, serverCluster } = reqBody;
  
  const isTestnet = environment === 'testnet';
  const isBinanceUs = environment === 'binance_us';
  const isFutures = accountType === 'FUTURES';
  
  let cleanApiKey = reqBody.apiKey ? String(reqBody.apiKey).trim().replace(/[\r\n\t"']/g, '') : '';
  let cleanApiSecret = reqBody.apiSecret ? String(reqBody.apiSecret).trim().replace(/[\r\n\t"']/g, '') : '';

  // Fallback to env variables (mimics the python configuration setup)
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
    defaultBaseUrl = proxyUrl.trim().replace(/\/$/, '');
  } else if (isTestnet) {
    defaultBaseUrl = isFutures ? (process.env.BINANCE_TESTNET_REST_URL || "https://demo-fapi.binance.com") : "https://testnet.binance.vision";
  } else if (isFutures) {
    defaultBaseUrl = process.env.BINANCE_LIVE_REST_URL || "https://fapi.binance.com";
  } else if (isBinanceUs) {
    defaultBaseUrl = "https://api.binance.us";
  } else if (serverCluster && typeof serverCluster === 'string') {
    defaultBaseUrl = `https://${serverCluster.trim()}`;
  }

  return {
    cleanApiKey,
    cleanApiSecret,
    isTestnet,
    isFutures,
    isBinanceUs,
    defaultBaseUrl
  };
}

// Endpoint: Test Binance API Connection & Fetch Account Info"""

content = content.replace('// Endpoint: Test Binance API Connection & Fetch Account Info', helper_code)


def replace_in_endpoint(start_str, endpoint_name, content_string):
    pattern = r'(?<=const { apiKey, apiSecret).*?(?=const endpoint =)'
    # ... this is too complex to regex robustly across 3 large functions. Let's do it inline with simple replace.
    pass

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
