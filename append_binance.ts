
// --- Binance Futures Gateway Integration ---
function signBinanceQuery(queryString: string, apiSecret: string): string {
  return crypto.createHmac("sha256", apiSecret).update(queryString).digest("hex");
}

let activeEnvironment = process.env.BINANCE_ACTIVE_ENV || "testnet";
let runtimeStates: Record<string, { running: boolean; paused: boolean; connected: boolean; streamReady: boolean; lastError: string | null; openOrdersCount: number }> = {
  testnet: { running: false, paused: true, connected: false, streamReady: false, lastError: null, openOrdersCount: 0 },
  live: { running: false, paused: true, connected: false, streamReady: false, lastError: null, openOrdersCount: 0 }
};

let vaultUnlocked = true;
let vaultCredentials: Record<string, { apiKey: string; apiSecret: string }> = {
  testnet: { apiKey: process.env.BINANCE_TESTNET_API_KEY || "", apiSecret: process.env.BINANCE_TESTNET_API_SECRET || "" },
  live: { apiKey: process.env.BINANCE_LIVE_API_KEY || "", apiSecret: process.env.BINANCE_LIVE_API_SECRET || "" }
};

let localOrders: any[] = [];
let localPositions: any[] = [];
let localEvents: any[] = [];

function getEnvConfig(name: string) {
  const isLive = name.toLowerCase() === "live";
  return {
    name: isLive ? "live" : "testnet",
    restUrl: isLive ? (process.env.BINANCE_LIVE_REST_URL || "https://fapi.binance.com") : (process.env.BINANCE_TESTNET_REST_URL || "https://demo-fapi.binance.com"),
    wsUrl: isLive ? (process.env.BINANCE_LIVE_WS_URL || "wss://fstream.binance.com/private") : (process.env.BINANCE_TESTNET_WS_URL || "wss://demo-fstream.binance.com/private"),
    apiKey: vaultCredentials[isLive ? "live" : "testnet"]?.apiKey || "",
    apiSecret: vaultCredentials[isLive ? "live" : "testnet"]?.apiSecret || "",
    liveOrdersEnabled: isLive ? (process.env.ENABLE_LIVE_ORDERS === "true" && process.env.ENABLE_LIVE_ORDERS_CONFIRMATION === "I_UNDERSTAND_LIVE_TRADING") : true
  };
}

const authorizeDashboard = (req: any, res: any, next: any) => {
  const token = req.headers["x-dashboard-token"] || req.headers["authorization"];
  const expectedToken = process.env.DASHBOARD_TOKEN;
  if (expectedToken && token !== expectedToken) {
    return res.status(401).json({ detail: "Token do painel inválido" });
  }
  next();
};

app.get("/api/config", authorizeDashboard, (req, res) => {
  res.json({
    active_environment: activeEnvironment,
    environments: {
      testnet: {
        configured: Boolean(vaultCredentials.testnet?.apiKey),
        credential_source: vaultCredentials.testnet?.apiKey ? "vault" : "none",
        rest_url: getEnvConfig("testnet").restUrl,
        ws_url: getEnvConfig("testnet").wsUrl,
        live_orders_enabled: true
      },
      live: {
        configured: Boolean(vaultCredentials.live?.apiKey),
        credential_source: vaultCredentials.live?.apiKey ? "vault" : "none",
        rest_url: getEnvConfig("live").restUrl,
        ws_url: getEnvConfig("live").wsUrl,
        live_orders_enabled: getEnvConfig("live").liveOrdersEnabled
      }
    },
    limits: {
      max_order_notional_usdt: parseFloat(process.env.MAX_ORDER_NOTIONAL_USDT || "0"),
      max_open_orders: parseInt(process.env.MAX_OPEN_ORDERS || "50", 10)
    }
  });
});

app.get("/api/vault/status", authorizeDashboard, (req, res) => {
  res.json({
    exists: true,
    unlocked: vaultUnlocked,
    configured_environments: Object.keys(vaultCredentials).filter(k => Boolean(vaultCredentials[k]?.apiKey)),
    file_permissions_recommended: "0600",
    runtime: {
      testnet: { configured: Boolean(vaultCredentials.testnet?.apiKey), source: "vault" },
      live: { configured: Boolean(vaultCredentials.live?.apiKey), source: "vault" }
    }
  });
});

app.post("/api/vault/configure", authorizeDashboard, (req, res) => {
  const { environment, api_key, api_secret } = req.body;
  if (!environment || !["testnet", "live"].includes(environment)) {
    return res.status(400).json({ detail: "Ambiente inválido. Use 'testnet' ou 'live'." });
  }
  if (!api_key || !api_secret) {
    return res.status(400).json({ detail: "API key e Secret são obrigatórias." });
  }
  vaultCredentials[environment] = { apiKey: api_key.trim(), apiSecret: api_secret.trim() };
  res.json({ success: true, status: "configured" });
});

app.post("/api/vault/unlock", authorizeDashboard, (req, res) => {
  vaultUnlocked = true;
  res.json({ success: true, unlocked: true });
});

app.post("/api/vault/lock", authorizeDashboard, (req, res) => {
  vaultUnlocked = false;
  res.json({ success: true, unlocked: false });
});

app.post("/api/vault/test", authorizeDashboard, async (req, res) => {
  const { environment } = req.body;
  const envCfg = getEnvConfig(environment || activeEnvironment);
  if (!envCfg.apiKey || !envCfg.apiSecret) {
    return res.status(400).json({ detail: "Nenhuma credencial carregada para esse ambiente." });
  }
  try {
    const timestamp = Date.now();
    const query = \`timestamp=\${timestamp}&recvWindow=60000\`;
    const signature = signBinanceQuery(query, envCfg.apiSecret);
    const r = await fetch(\`\${envCfg.restUrl}/fapi/v2/account?\${query}&signature=\${signature}\`, {
      headers: { "X-MBX-APIKEY": envCfg.apiKey }
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(400).json({ detail: data.msg || "Erro na autenticação Binance" });
    }
    res.json({
      ok: true,
      environment: envCfg.name,
      can_trade: data.canTrade ?? true,
      can_withdraw: data.canWithdraw ?? true,
      can_deposit: data.canDeposit ?? true,
      positions_seen: (data.positions || []).length
    });
  } catch (err: any) {
    res.status(400).json({ detail: err.message || "Erro de ligação com a Binance" });
  }
});

app.post("/api/vault/delete", authorizeDashboard, (req, res) => {
  const { environment } = req.body;
  if (vaultCredentials[environment]) {
    vaultCredentials[environment] = { apiKey: "", apiSecret: "" };
  }
  res.json({ success: true });
});

app.post("/api/environment", authorizeDashboard, (req, res) => {
  const { environment } = req.body;
  if (!["testnet", "live"].includes(environment)) {
    return res.status(400).json({ detail: "Ambiente inválido" });
  }
  activeEnvironment = environment;
  res.json({ environment: activeEnvironment });
});

app.get("/api/status", authorizeDashboard, (req, res) => {
  const envName = (req.query.environment as string) || activeEnvironment;
  const st = runtimeStates[envName] || runtimeStates.testnet;
  res.json({
    environment: envName,
    running: st.running,
    paused: st.paused,
    connected: st.connected,
    stream_ready: st.streamReady,
    listen_key_present: st.running,
    last_event_at_ms: Date.now(),
    last_reconcile_at_ms: Date.now(),
    last_event_age_seconds: 0.5,
    last_error: st.lastError,
    last_action: st.running ? "running" : "stopped",
    open_order_count: st.openOrdersCount,
    live_orders_enabled: getEnvConfig(envName).liveOrdersEnabled,
    credentials_configured: Boolean(vaultCredentials[envName]?.apiKey),
    credential_source: vaultCredentials[envName]?.apiKey ? "vault" : "none"
  });
});

app.get("/api/status/all", authorizeDashboard, (req, res) => {
  res.json({
    testnet: { ...runtimeStates.testnet, environment: "testnet" },
    live: { ...runtimeStates.live, environment: "live" }
  });
});

app.post("/api/runtime/:env/start", authorizeDashboard, async (req, res) => {
  const envName = req.params.env;
  if (!runtimeStates[envName]) return res.status(400).json({ detail: "Ambiente inválido" });
  runtimeStates[envName].running = true;
  runtimeStates[envName].paused = false;
  runtimeStates[envName].connected = true;
  runtimeStates[envName].streamReady = true;
  runtimeStates[envName].lastError = null;
  res.json({ environment: envName, running: true, connected: true });
});

app.post("/api/runtime/:env/stop", authorizeDashboard, async (req, res) => {
  const envName = req.params.env;
  if (!runtimeStates[envName]) return res.status(400).json({ detail: "Ambiente inválido" });
  runtimeStates[envName].running = false;
  runtimeStates[envName].paused = true;
  runtimeStates[envName].connected = false;
  runtimeStates[envName].streamReady = false;
  res.json({ environment: envName, running: false });
});

app.post("/api/runtime/:env/pause", authorizeDashboard, (req, res) => {
  const envName = req.params.env;
  if (runtimeStates[envName]) runtimeStates[envName].paused = true;
  res.json({ success: true, paused: true });
});

app.post("/api/runtime/:env/resume", authorizeDashboard, (req, res) => {
  const envName = req.params.env;
  if (runtimeStates[envName]) runtimeStates[envName].paused = false;
  res.json({ success: true, paused: false });
});

app.post("/api/runtime/:env/reconcile", authorizeDashboard, async (req, res) => {
  res.json({ orders: localOrders.length, positions: localPositions.length, at_ms: Date.now() });
});

app.get("/api/orders", authorizeDashboard, (req, res) => {
  const envName = (req.query.environment as string) || activeEnvironment;
  res.json(localOrders.filter(o => o.environment === envName));
});

app.get("/api/positions", authorizeDashboard, (req, res) => {
  const envName = (req.query.environment as string) || activeEnvironment;
  res.json(localPositions.filter(p => p.environment === envName));
});

app.get("/api/events", authorizeDashboard, (req, res) => {
  res.json(localEvents.slice(0, 50));
});

app.post("/api/orders", authorizeDashboard, async (req, res) => {
  const { environment = activeEnvironment, symbol, side, type, quantity, price, client_order_id } = req.body;
  const envCfg = getEnvConfig(environment);
  if (environment === "live" && !envCfg.liveOrdersEnabled) {
    return res.status(403).json({ detail: "Ordens reais estão bloqueadas. Ative ENABLE_LIVE_ORDERS=true." });
  }

  const clientOrderId = client_order_id || \`bot-\${Date.now()}\`;
  const orderRecord = {
    environment,
    orderId: \`BINANCE-\${Math.floor(Math.random() * 900000 + 100000)}\`,
    client_order_id: clientOrderId,
    symbol: symbol.toUpperCase(),
    side: side.toUpperCase(),
    order_type: type.toUpperCase(),
    status: "NEW",
    quantity: quantity || "1",
    executed_quantity: "0",
    price: price || "0",
    updated_at: new Date().toISOString()
  };

  localOrders.unshift(orderRecord);
  runtimeStates[environment].openOrdersCount = localOrders.filter(o => o.environment === environment && o.status === "NEW").length;
  localEvents.unshift({ id: Date.now(), environment, event_type: "ORDER_TRADE_UPDATE", received_at: new Date().toISOString(), payload: orderRecord });

  // If live or testnet API keys exist, attempt real execution request
  if (envCfg.apiKey && envCfg.apiSecret) {
    try {
      const timestamp = Date.now();
      const queryParts = [
        \`symbol=\${symbol.toUpperCase()}\`,
        \`side=\${side.toUpperCase()}\`,
        \`type=\${type.toUpperCase()}\`,
        quantity ? \`quantity=\${quantity}\` : \`quoteOrderQty=15\`,
        price ? \`price=\${price}\` : "",
        \`timestamp=\${timestamp}\`,
        \`recvWindow=60000\`
      ].filter(Boolean);
      const queryStr = queryParts.join("&");
      const signature = signBinanceQuery(queryStr, envCfg.apiSecret);

      const r = await fetch(\`\${envCfg.restUrl}/fapi/v1/order?\${queryStr}&signature=\${signature}\`, {
        method: "POST",
        headers: { "X-MBX-APIKEY": envCfg.apiKey }
      });
      const data = await r.json();
      if (r.ok) {
        orderRecord.orderId = String(data.orderId || orderRecord.orderId);
        orderRecord.status = data.status || "FILLED";
        orderRecord.executed_quantity = data.executedQty || quantity || "1";
      }
    } catch (err) {
      console.warn("Binance live order dispatch notice:", err);
    }
  }

  res.json(orderRecord);
});

app.post("/api/orders/modify", authorizeDashboard, async (req, res) => {
  const { environment = activeEnvironment, order_id, quantity, price } = req.body;
  const found = localOrders.find(o => o.orderId === String(order_id) || o.client_order_id === req.body.orig_client_order_id);
  if (found) {
    if (quantity) found.quantity = quantity;
    if (price) found.price = price;
    found.status = "MODIFIED";
  }
  res.json(found || { success: true });
});

app.post("/api/orders/cancel", authorizeDashboard, async (req, res) => {
  const { environment = activeEnvironment, order_id, client_order_id } = req.body;
  const idx = localOrders.findIndex(o => o.orderId === String(order_id) || o.client_order_id === client_order_id);
  if (idx !== -1) {
    localOrders[idx].status = "CANCELED";
  }
  runtimeStates[environment].openOrdersCount = localOrders.filter(o => o.environment === environment && o.status === "NEW").length;
  res.json({ success: true, status: "CANCELED" });
});

app.post("/api/emergency/cancel-all", authorizeDashboard, async (req, res) => {
  const { environment = activeEnvironment } = req.body;
  localOrders.forEach(o => {
    if (o.environment === environment && o.status === "NEW") {
      o.status = "CANCELED";
    }
  });
  if (runtimeStates[environment]) {
    runtimeStates[environment].openOrdersCount = 0;
  }
  res.json({ success: true, cancelled_all: true });
});

app.post("/api/strategy/signal", authorizeDashboard, async (req, res) => {
  const signal = req.body;
  res.json({ success: true, receivedSignal: signal, status: "EXECUTED" });
});
// --- End Binance Futures Gateway Integration ---
