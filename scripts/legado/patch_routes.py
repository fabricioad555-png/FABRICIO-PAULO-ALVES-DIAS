import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern 1: test-connection
old_block_1 = """    const { apiKey, apiSecret, environment = 'binance_pt', accountType = 'SPOT', proxyUrl, serverCluster, customBalanceUsdt } = req.body;

    const cleanApiKey = apiKey ? String(apiKey).trim().replace(/[\\r\\n\\t"']/g, '') : '';
    const cleanApiSecret = apiSecret ? String(apiSecret).trim().replace(/[\\r\\n\\t"']/g, '') : '';

    if (!cleanApiKey || !cleanApiSecret) {
      return res.status(400).json({
        success: false,
        message: "A Chave da API (API Key) e a Chave Secreta (API Secret) são obrigatórias para ligar à Binance."
      });
    }

    if (cleanApiKey.length < 15 || cleanApiSecret.length < 15) {
      return res.status(400).json({
        success: false,
        message: "Chaves da API com formato inválido. Verifique se copiou a API Key e o Secret completos da Binance."
      });
    }

    const isTestnet = environment === 'testnet';
    const isBinanceUs = environment === 'binance_us';
    const isFutures = accountType === 'FUTURES';
    const parsedCustomBalance = Math.max(10, parseFloat(customBalanceUsdt) || 1000);

    let defaultBaseUrl = "https://api.binance.com";
    if (proxyUrl && typeof proxyUrl === 'string' && proxyUrl.trim().startsWith('http')) {
      defaultBaseUrl = proxyUrl.trim().replace(/\\/$/, '');
    } else if (isTestnet) {
      defaultBaseUrl = isFutures ? "https://testnet.binancefuture.com" : "https://testnet.binance.vision";
    } else if (isFutures) {
      defaultBaseUrl = "https://fapi.binance.com";
    } else if (isBinanceUs) {
      defaultBaseUrl = "https://api.binance.us";
    } else if (serverCluster && typeof serverCluster === 'string') {
      defaultBaseUrl = `https://${serverCluster.trim()}`;
    }"""

new_block_1 = """    const { customBalanceUsdt } = req.body;
    const { cleanApiKey, cleanApiSecret, isTestnet, isFutures, isBinanceUs, defaultBaseUrl } = resolveBinanceConfig(req.body);

    if (!cleanApiKey || !cleanApiSecret) {
      return res.status(400).json({
        success: false,
        message: "A Chave da API (API Key) e a Chave Secreta (API Secret) são obrigatórias para ligar à Binance."
      });
    }

    if (cleanApiKey.length < 15 || cleanApiSecret.length < 15) {
      return res.status(400).json({
        success: false,
        message: "Chaves da API com formato inválido. Verifique se copiou a API Key e o Secret completos da Binance."
      });
    }

    const parsedCustomBalance = Math.max(10, parseFloat(customBalanceUsdt) || 1000);"""

content = content.replace(old_block_1, new_block_1)


old_block_2 = """    const { apiKey, apiSecret, environment = 'binance_pt', accountType = 'SPOT', symbol, side, type, quantity, price, stopPrice, proxyUrl, serverCluster } = req.body;

    const cleanApiKey = apiKey ? String(apiKey).trim().replace(/[\\r\\n\\t"']/g, '') : '';
    const cleanApiSecret = apiSecret ? String(apiSecret).trim().replace(/[\\r\\n\\t"']/g, '') : '';

    if (!cleanApiKey || !cleanApiSecret) {
      return res.status(400).json({ success: false, message: "A Chave da API e o Secret são obrigatórios." });
    }

    const isTestnet = environment === 'testnet';
    const isBinanceUs = environment === 'binance_us';
    const isFutures = accountType === 'FUTURES';

    let defaultBaseUrl = "https://api.binance.com";
    if (proxyUrl && typeof proxyUrl === 'string' && proxyUrl.trim().startsWith('http')) {
      defaultBaseUrl = proxyUrl.trim().replace(/\\/$/, '');
    } else if (isTestnet) {
      defaultBaseUrl = isFutures ? "https://testnet.binancefuture.com" : "https://testnet.binance.vision";
    } else if (isFutures) {
      defaultBaseUrl = "https://fapi.binance.com";
    } else if (isBinanceUs) {
      defaultBaseUrl = "https://api.binance.us";
    } else if (serverCluster && typeof serverCluster === 'string') {
      defaultBaseUrl = `https://${serverCluster.trim()}`;
    }"""

new_block_2 = """    const { symbol, side, type, quantity, price, stopPrice } = req.body;
    const { cleanApiKey, cleanApiSecret, isTestnet, isFutures, isBinanceUs, defaultBaseUrl } = resolveBinanceConfig(req.body);

    if (!cleanApiKey || !cleanApiSecret) {
      return res.status(400).json({ success: false, message: "A Chave da API e o Secret são obrigatórios." });
    }"""

content = content.replace(old_block_2, new_block_2)

old_block_3 = """    const { apiKey, apiSecret, environment = 'binance_pt', accountType = 'SPOT', symbol, side, type, quantity, price, stopPrice, proxyUrl, serverCluster } = req.body;

    const cleanApiKey = apiKey ? String(apiKey).trim().replace(/[\\r\\n\\t"']/g, '') : '';
    const cleanApiSecret = apiSecret ? String(apiSecret).trim().replace(/[\\r\\n\\t"']/g, '') : '';

    if (!cleanApiKey || !cleanApiSecret) {
      return res.status(400).json({ success: false, message: "A Chave da API e o Secret são obrigatórios." });
    }

    const isTestnet = environment === 'testnet';
    const isBinanceUs = environment === 'binance_us';
    const isFutures = accountType === 'FUTURES';

    let defaultBaseUrl = "https://api.binance.com";
    if (proxyUrl && typeof proxyUrl === 'string' && proxyUrl.trim().startsWith('http')) {
      defaultBaseUrl = proxyUrl.trim().replace(/\\/$/, '');
    } else if (isTestnet) {
      defaultBaseUrl = isFutures ? "https://testnet.binancefuture.com" : "https://testnet.binance.vision";
    } else if (isFutures) {
      defaultBaseUrl = "https://fapi.binance.com";
    } else if (isBinanceUs) {
      defaultBaseUrl = "https://api.binance.us";
    } else if (serverCluster && typeof serverCluster === 'string') {
      defaultBaseUrl = `https://${serverCluster.trim()}`;
    }"""

# It's the same string as old_block_2, but it occurs twice. String `.replace` will replace all occurrences.

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)

