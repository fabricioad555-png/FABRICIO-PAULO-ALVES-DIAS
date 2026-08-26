import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for the order endpoint:
# Find: const { apiKey, ... serverCluster } = req.body;
# up to defaultBaseUrl = ...
pattern_order = r'const \{[\s\S]*?=\s*req\.body;[\s\S]*?if \(!apiKey \|\| !apiSecret[\s\S]*?\}[\s\S]*?const isTestnet[\s\S]*?defaultBaseUrl \= `https\://\$\{serverCluster\.trim\(\)\}`;[\s\n]*\}'

replacement_order = """const { symbol, side, type, quantity, stopPrice, leverage, reduceOnly, closePosition, quoteOrderQty, sizeUsd, priceUsd } = req.body;
    
    const { cleanApiKey: apiKey, cleanApiSecret: apiSecret, isTestnet, isFutures, isBinanceUs, defaultBaseUrl } = resolveBinanceConfig(req.body);

    if (!apiKey || !apiSecret || !symbol || !side) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros da ordem incompletos: Chaves de API, Símbolo e Lado (Compra/Venda) são obrigatórios."
      });
    }"""

content, count1 = re.subn(pattern_order, replacement_order, content, count=1)
print(f"Replaced {count1} blocks for /api/binance/order")

# For test-order
pattern_test_order = r'const \{[\s\S]*?=\s*req\.body;[\s\S]*?if \(!apiKey \|\| !apiSecret[\s\S]*?\}[\s\S]*?const isTestnet[\s\S]*?defaultBaseUrl \= `https\://\$\{serverCluster\.trim\(\)\}`;[\s\n]*\}'

replacement_test_order = """const { symbol, side, type, quantity, price, stopPrice, leverage, closePosition, reduceOnly } = req.body;
    const { cleanApiKey: apiKey, cleanApiSecret: apiSecret, isTestnet, isFutures, isBinanceUs, defaultBaseUrl } = resolveBinanceConfig(req.body);

    if (!apiKey || !apiSecret || !symbol || !side) {
      return res.status(400).json({
        success: false,
        message: "Parâmetros da ordem incompletos."
      });
    }"""

content, count2 = re.subn(pattern_test_order, replacement_test_order, content, count=1)
print(f"Replaced {count2} blocks for /api/binance/test-order")

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
