  // ----------------------------------------------------------------------------------
  // 10-MINUTE CYCLE: TOP 3 CRYPTOS WITH HIGHEST PROFIT PROBABILITY (PARETO CRITICALITY)
  // ----------------------------------------------------------------------------------
  const [top3ProfitCryptos, setTop3ProfitCryptos] = useState<Top10mProfitCrypto[]>(() => 
    selectTop3HighProbabilityCryptos(cryptos, forumPosts, techFilterConfig)
  );
  const [countdownSeconds, setCountdownSeconds] = useState<number>(600); // 10 minutes = 600s
  const [isRefreshingTop3, setIsRefreshingTop3] = useState<boolean>(false);

  // Function to refresh Top 3 selection
  const refreshTop3Selection = useCallback(() => {
    setIsRefreshingTop3(true);
    try {
      const top3 = selectTop3HighProbabilityCryptos(cryptos, forumPosts, techFilterConfig);
      setTop3ProfitCryptos(top3);
      setCountdownSeconds(600);
    } finally {
      setTimeout(() => setIsRefreshingTop3(false), 500);
    }
  }, [cryptos, forumPosts, techFilterConfig]);
