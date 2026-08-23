  // 10-Minute Cycle Countdown Timer for Pareto Top 3 recalculation
  const [cycleTimeRemainingSec, setCycleTimeRemainingSec] = useState<number>(() => {
    const now = Math.floor(Date.now() / 1000);
    const tenMinCycle = 600;
    return tenMinCycle - (now % tenMinCycle);
  });

  const [logs, setLogs] = useState<RobotLogEntry[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString('pt-BR'),
      type: 'INFO',
      message: 'Módulo Auto-Trader HFT inicializado. Cesta Top 3 Maior Probabilidade (Pareto 80/20) ativada.'
    }
  ]);
  
  // Compute Top 3 high probability cryptos dynamically
  const top3Cryptos = useMemo<Top10mProfitCrypto[]>(() => {
    return selectTop3HighProbabilityCryptos(cryptos);
  }, [cryptos]);

  // Use a ref to keep the latest state for event listeners
  const stateRef = useRef({ account, positions, cryptos, top3Cryptos, adminOverrideActive, scalpingAnalysis });
  useEffect(() => {
    stateRef.current = { account, positions, cryptos, top3Cryptos, adminOverrideActive, scalpingAnalysis };
  }, [account, positions, cryptos, top3Cryptos, adminOverrideActive, scalpingAnalysis]);

  // 10-minute cycle ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCycleTimeRemainingSec(prev => (prev <= 1 ? 600 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedCycleTime = useMemo(() => {
    const m = Math.floor(cycleTimeRemainingSec / 60);
    const s = cycleTimeRemainingSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [cycleTimeRemainingSec]);
