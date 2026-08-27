import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the fake analyze-forum with test-order
content = content.replace('app.post("/api/analyze-forum", async (req, res) => {\n  try {', 'app.post("/api/binance/test-order", async (req, res) => {\n  const startTime = Date.now();\n  try {', 1)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
