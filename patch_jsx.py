import re

with open("src/components/OrderBookAndTradesPanel.tsx", "r") as f:
    content = f.read()

# Add ref to scrollable container
container_old = '<div className="space-y-1 max-h-[460px] overflow-y-auto pr-1 select-none custom-scrollbar">'
container_new = '<div ref={orderBookContainerRef} className="space-y-1 max-h-[460px] overflow-y-auto pr-1 select-none custom-scrollbar">'
content = content.replace(container_old, container_new)

# Add ref to spread divider
spread_old = '<div className="py-2 my-1 bg-[#12141a] border-y border-cyan-500/40 px-3 flex items-center justify-between text-xs rounded">'
spread_new = '<div ref={spreadDividerRef} className="py-2 my-1 bg-[#12141a] border-y border-cyan-500/40 px-3 flex items-center justify-between text-xs rounded">'
content = content.replace(spread_old, spread_new)

with open("src/components/OrderBookAndTradesPanel.tsx", "w") as f:
    f.write(content)
