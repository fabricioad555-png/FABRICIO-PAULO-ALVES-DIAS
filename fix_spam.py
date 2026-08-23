import re

with open("src/components/OrderBookAndTradesPanel.tsx", "r") as f:
    content = f.read()

# Replace the useEffect with [orderFlowData.priceUsd, isAutoCenterEnabled]
spam_effect_old = """
  useEffect(() => {
    if (isAutoCenterEnabled) {
      scrollToCenter();
    }
  }, [orderFlowData.priceUsd, isAutoCenterEnabled]);
"""
spam_effect_new = """
  useEffect(() => {
    if (isAutoCenterEnabled) {
      // Just center it without smooth scrolling if it's constantly adjusting, 
      // but here we just need to do it once when enabled or when rows filter changes
      scrollToCenter();
    }
  }, [isAutoCenterEnabled, bookRowsFilter]);
"""
content = content.replace(spam_effect_old.strip(), spam_effect_new.strip())

with open("src/components/OrderBookAndTradesPanel.tsx", "w") as f:
    f.write(content)
