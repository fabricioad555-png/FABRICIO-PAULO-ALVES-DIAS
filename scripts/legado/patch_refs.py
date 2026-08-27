with open("src/components/OrderBookAndTradesPanel.tsx", "r") as f:
    content = f.read()

refs_code = """
  // Auto-scroll ref for Times & Trades tape
  const tradesContainerRef = useRef<HTMLDivElement>(null);
  
  // Refs for auto-centering Order Book spread
  const orderBookContainerRef = useRef<HTMLDivElement>(null);
  const spreadDividerRef = useRef<HTMLDivElement>(null);

  const scrollToCenter = () => {
    if (orderBookContainerRef.current && spreadDividerRef.current) {
      const container = orderBookContainerRef.current;
      const divider = spreadDividerRef.current;
      
      const containerHeight = container.clientHeight;
      const dividerTop = divider.offsetTop;
      const dividerHeight = divider.clientHeight;
      
      const scrollTo = dividerTop - (containerHeight / 2) + (dividerHeight / 2);
      
      container.scrollTo({ top: scrollTo, behavior: 'smooth' });
    }
  };
"""

content = content.replace("  // Auto-scroll ref for Times & Trades tape\n  const tradesContainerRef = useRef<HTMLDivElement>(null);", refs_code.strip())

with open("src/components/OrderBookAndTradesPanel.tsx", "w") as f:
    f.write(content)
