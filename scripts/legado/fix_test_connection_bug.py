import re

with open('server.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the bypass logic to only allow 451 (IP Restricted) or specific Binance cloud errors, NOT 401 or 400.
old_logic = """    if (isIpOrGeoRestricted || !apiRes || !apiRes.ok) {
      return res.json({
        success: true,
        isConnected: true,
        isVerified: true,
        accountBalanceUsdt: parsedCustomBalance,
        assetsBreakdown: [{ asset: 'USDT', free: parsedCustomBalance, locked: 0, total: parsedCustomBalance, estimatedUsdt: parsedCustomBalance }],
        permissions: ['Leitura', 'Trading Spot'],
        message: `🟢 (Bypass Nuvem) Sessão Binance ativada com sucesso!`,
        pingMs
      });
    }"""

new_logic = """    if (isIpOrGeoRestricted) {
      return res.json({
        success: true,
        isConnected: true,
        isVerified: true,
        accountBalanceUsdt: parsedCustomBalance,
        assetsBreakdown: [{ asset: 'USDT', free: parsedCustomBalance, locked: 0, total: parsedCustomBalance, estimatedUsdt: parsedCustomBalance }],
        permissions: ['Leitura', 'Trading Spot'],
        message: `🟢 (Bypass Nuvem) Restrição de IP contornada. Sessão local ativada!`,
        pingMs
      });
    }

    if (!apiRes || !apiRes.ok) {
      return res.json({
        success: false,
        isConnected: false,
        isVerified: false,
        pingMs,
        message: `❌ Falha na conexão com a Binance. Verifique suas credenciais.`
      });
    }"""

content = content.replace(old_logic, new_logic)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
