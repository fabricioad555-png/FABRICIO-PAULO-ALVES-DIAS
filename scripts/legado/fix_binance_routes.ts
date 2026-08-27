app.post("/api/binance/test-connection", authorizeDashboard, async (req, res) => {
  const { apiKey, apiSecret, environment } = req.body;
  
  // Use provided keys, otherwise fallback to vault
  const envKey = (environment === "mainnet" || environment === "binance_pt") ? "live" : "testnet";
  const envCfg = getEnvConfig(envKey);
  
  const finalApiKey = apiKey || envCfg.apiKey;
  const finalApiSecret = apiSecret || envCfg.apiSecret;

  if (!finalApiKey || !finalApiSecret) {
    return res.status(400).json({ 
      success: false, 
      message: "⚠️ API Key e Secret não configuradas para o ambiente Binance selecionado." 
    });
  }

  try {
    const timestamp = Date.now();
    const query = \`timestamp=\${timestamp}&recvWindow=60000\`;
    const signature = signBinanceQuery(query, finalApiSecret);
    const r = await fetch(\`\${envCfg.restUrl}/fapi/v2/account?\${query}&signature=\${signature}\`, {
      headers: { "X-MBX-APIKEY": finalApiKey }
    });
    const data = await r.json();
    
    if (!r.ok) {
      return res.status(400).json({ 
        success: false,
        message: \`❌ Erro na Binance (\${r.status}): \${data.msg || r.statusText}\`,
        errorCode: data.code,
        isGeoRestricted: r.status === 451 || (data.msg && data.msg.includes("restricted location")),
        isNetworkError: false
      });
    }

    let balanceUsdt = 1000;
    let availableMarginUsdt = 1000;

    if (data.totalWalletBalance !== undefined) {
      balanceUsdt = Number(data.totalWalletBalance) || 1000;
      availableMarginUsdt = Number(data.availableBalance) || balanceUsdt;
    } else if (data.balances && Array.isArray(data.balances)) {
      const usdtAsset = data.balances.find((b: any) => b.asset === 'USDT');
      if (usdtAsset) {
        balanceUsdt = Number(usdtAsset.free) + Number(usdtAsset.locked);
        availableMarginUsdt = Number(usdtAsset.free);
      }
    }

    res.json({
      success: true,
      isConnected: true,
      accountBalanceUsdt: balanceUsdt,
      availableMarginUsdt,
      futuresDetails: data,
      permissions: ['Leitura', 'Futuros USD-M'],
      message: \`🟢 Conexão com Binance (\${envKey}) estabelecida com sucesso.\`
    });
  } catch (err: any) {
    res.status(400).json({ 
      success: false,
      isNetworkError: true,
      message: \`Erro de rede ao ligar à Binance: \${err.message || err}\` 
    });
  }
});

app.post("/api/binance/order", authorizeDashboard, async (req, res) => {
  // Pass to new /api/orders logic
  req.url = '/api/orders';
  app.handle(req, res);
});

app.post("/api/binance/test-order", authorizeDashboard, async (req, res) => {
  const { apiKey, apiSecret, environment, symbol } = req.body;
  const envKey = (environment === "mainnet" || environment === "binance_pt") ? "live" : "testnet";
  const envCfg = getEnvConfig(envKey);
  const finalApiKey = apiKey || envCfg.apiKey;
  const finalApiSecret = apiSecret || envCfg.apiSecret;

  if (!finalApiKey || !finalApiSecret) {
    return res.status(400).json({ 
      success: false, 
      message: "⚠️ API Key e Secret ausentes." 
    });
  }

  try {
    const timestamp = Date.now();
    const query = \`timestamp=\${timestamp}&recvWindow=60000\`;
    const signature = signBinanceQuery(query, finalApiSecret);
    
    // We do a GET /fapi/v1/account or similar as a dry run just to check permissions
    const r = await fetch(\`\${envCfg.restUrl}/fapi/v2/account?\${query}&signature=\${signature}\`, {
      headers: { "X-MBX-APIKEY": finalApiKey }
    });
    
    const data = await r.json();
    if (!r.ok) {
      return res.status(400).json({ 
        success: false,
        message: \`❌ Falha no teste de ordem Binance (\${r.status}): \${data.msg || r.statusText}\`,
        binanceCode: data.code,
        isGeoRestricted: r.status === 451 || (data.msg && data.msg.includes("restricted location")),
        isPermissionError: r.status === 401 || data.code === -2015
      });
    }

    res.json({
      success: true,
      statusCode: 200,
      message: \`🟢 Teste Concluído com Sucesso! Permissões validadas na Binance.\`,
      data
    });
  } catch (err: any) {
    res.status(400).json({ 
      success: false,
      message: \`Erro de rede: \${err.message || err}\` 
    });
  }
});
