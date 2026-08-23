import re

with open("src/components/OrderBookAndTradesPanel.tsx", "r") as f:
    content = f.read()

state_code = """
  const [highlightWhaleThresholdUsd, setHighlightWhaleThresholdUsd] = useState<number>(5000);
  
  // Auto-center state
  const [isAutoCenterEnabled, setIsAutoCenterEnabled] = useState(true);
  const isProgrammaticScroll = useRef(false);
"""
content = content.replace("  const [highlightWhaleThresholdUsd, setHighlightWhaleThresholdUsd] = useState<number>(5000);", state_code.strip())

scroll_code = """
  const scrollToCenter = () => {
    if (orderBookContainerRef.current && spreadDividerRef.current) {
      isProgrammaticScroll.current = true;
      const container = orderBookContainerRef.current;
      const divider = spreadDividerRef.current;
      
      const containerHeight = container.clientHeight;
      const dividerTop = divider.offsetTop;
      const dividerHeight = divider.clientHeight;
      
      const scrollTo = dividerTop - (containerHeight / 2) + (dividerHeight / 2);
      
      container.scrollTo({ top: scrollTo, behavior: 'smooth' });
      
      setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 500);
    }
  };

  const handleOrderBookScroll = () => {
    if (!isProgrammaticScroll.current) {
      setIsAutoCenterEnabled(false);
    }
  };

  useEffect(() => {
    if (isAutoCenterEnabled) {
      scrollToCenter();
    }
  }, [orderFlowData.priceUsd, isAutoCenterEnabled]);
"""

content = content.replace("""  const scrollToCenter = () => {
    if (orderBookContainerRef.current && spreadDividerRef.current) {
      const container = orderBookContainerRef.current;
      const divider = spreadDividerRef.current;
      
      const containerHeight = container.clientHeight;
      const dividerTop = divider.offsetTop;
      const dividerHeight = divider.clientHeight;
      
      const scrollTo = dividerTop - (containerHeight / 2) + (dividerHeight / 2);
      
      container.scrollTo({ top: scrollTo, behavior: 'smooth' });
    }
  };""", scroll_code.strip())


container_old = '<div ref={orderBookContainerRef} className="space-y-1 max-h-[460px] overflow-y-auto pr-1 select-none custom-scrollbar">'
container_new = '<div ref={orderBookContainerRef} onScroll={handleOrderBookScroll} className="space-y-1 max-h-[460px] overflow-y-auto pr-1 select-none custom-scrollbar">'
content = content.replace(container_old, container_new)

# Add center button
header_old = """
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    Livro de Ofertas ({displayedBids.length + displayedAsks.length} Níveis Visuais)
                  </span>
                </div>
"""
header_new = """
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                    Livro de Ofertas ({displayedBids.length + displayedAsks.length} Níveis Visuais)
                  </span>
                  {!isAutoCenterEnabled && (
                    <button
                      onClick={() => setIsAutoCenterEnabled(true)}
                      className="ml-2 text-[9px] font-mono bg-cyan-950/60 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800 hover:bg-cyan-900 transition-colors flex items-center gap-1"
                    >
                      <Target className="w-3 h-3" />
                      Centralizar
                    </button>
                  )}
                </div>
"""
content = content.replace(header_old.strip(), header_new.strip())

with open("src/components/OrderBookAndTradesPanel.tsx", "w") as f:
    f.write(content)
