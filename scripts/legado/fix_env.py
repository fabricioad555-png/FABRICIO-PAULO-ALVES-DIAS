import re

with open('server.ts', 'r') as f:
    content = f.read()

# Fix /api/orders
content = re.sub(
    r'const { environment = activeEnvironment, (.*?) } = req\.body;\s*const envCfg = getEnvConfig\(environment\);',
    r'const rawEnv = req.body.environment || activeEnvironment;\n  const envCfg = getEnvConfig(rawEnv);\n  const environment = envCfg.name;\n  const { \1 } = req.body;',
    content
)

# Fix /api/orders/modify
content = re.sub(
    r'app\.post\("/api/orders/modify", authorizeDashboard, async \(req, res\) => \{\s*const \{ environment = activeEnvironment, order_id, quantity, price \} = req\.body;',
    r'app.post("/api/orders/modify", authorizeDashboard, async (req, res) => {\n  const rawEnv = req.body.environment || activeEnvironment;\n  const envCfg = getEnvConfig(rawEnv);\n  const environment = envCfg.name;\n  const { order_id, quantity, price } = req.body;',
    content
)

# Fix /api/orders/cancel
content = re.sub(
    r'app\.post\("/api/orders/cancel", authorizeDashboard, async \(req, res\) => \{\s*const \{ environment = activeEnvironment, order_id, client_order_id \} = req\.body;',
    r'app.post("/api/orders/cancel", authorizeDashboard, async (req, res) => {\n  const rawEnv = req.body.environment || activeEnvironment;\n  const envCfg = getEnvConfig(rawEnv);\n  const environment = envCfg.name;\n  const { order_id, client_order_id } = req.body;',
    content
)

# Fix /api/emergency/cancel-all
content = re.sub(
    r'app\.post\("/api/emergency/cancel-all", authorizeDashboard, async \(req, res\) => \{\s*const \{ environment = activeEnvironment \} = req\.body;',
    r'app.post("/api/emergency/cancel-all", authorizeDashboard, async (req, res) => {\n  const rawEnv = req.body.environment || activeEnvironment;\n  const envCfg = getEnvConfig(rawEnv);\n  const environment = envCfg.name;',
    content
)

# Fix getEnvConfig to be more robust
content = content.replace(
    'const isLive = name.toLowerCase() === "live";',
    'const isLive = name.toLowerCase() === "live" || name.toLowerCase() === "mainnet" || name.toLowerCase() === "binance_pt";'
)

with open('server.ts', 'w') as f:
    f.write(content)
