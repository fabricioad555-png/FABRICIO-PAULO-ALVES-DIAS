import re

with open("src/components/OrderBookAndTradesPanel.tsx", "r") as f:
    content = f.read()

effect_code = """
  // Auto-center Order Book on mount, on crypto change, and on filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCenter();
    }, 200);
    return () => clearTimeout(timer);
  }, [crypto.symbol, bookRowsFilter, activeTab]);

  // Sync / regenerate when selected crypto changes
"""
content = content.replace("  // Sync / regenerate when selected crypto changes", effect_code.strip())

with open("src/components/OrderBookAndTradesPanel.tsx", "w") as f:
    f.write(content)
