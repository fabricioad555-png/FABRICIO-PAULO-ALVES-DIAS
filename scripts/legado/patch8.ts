  // Interactive Technical Indicators Filter Helpers
  const handleToggleIndicator = useCallback((id: string) => {
    setTechFilterConfig((prev) => {
      const next: TechnicalIndicatorsFilterConfig = {
        ...prev,
        enabledIndicators: {
          ...prev.enabledIndicators,
          [id]: !(prev.enabledIndicators?.[id] ?? true)
        }
      };
      setTop3ProfitCryptos(selectTop3HighProbabilityCryptos(cryptos, forumPosts, next));
      setConfluenceResult(generateLocalHFTConfluenceAnalysis(activeCrypto, orderFlowData, forumPosts, next));
      return next;
    });
  }, [cryptos, forumPosts, activeCrypto, orderFlowData]);

  const handleChangeMinRsi = useCallback((minRsi: number) => {
    setTechFilterConfig((prev) => {
      const next: TechnicalIndicatorsFilterConfig = {
        ...prev,
        minRsiFilter: minRsi
      };
      setTop3ProfitCryptos(selectTop3HighProbabilityCryptos(cryptos, forumPosts, next));
      setConfluenceResult(generateLocalHFTConfluenceAnalysis(activeCrypto, orderFlowData, forumPosts, next));
      return next;
    });
  }, [cryptos, forumPosts, activeCrypto, orderFlowData]);

  const handleToggleRequireEma = useCallback((requireEma: boolean) => {
    setTechFilterConfig((prev) => {
      const next: TechnicalIndicatorsFilterConfig = {
        ...prev,
        requireEmaAlignment: requireEma
      };
      setTop3ProfitCryptos(selectTop3HighProbabilityCryptos(cryptos, forumPosts, next));
      setConfluenceResult(generateLocalHFTConfluenceAnalysis(activeCrypto, orderFlowData, forumPosts, next));
      return next;
    });
  }, [cryptos, forumPosts, activeCrypto, orderFlowData]);

  const handleResetTechFilters = useCallback(() => {
    const defaultConfig: TechnicalIndicatorsFilterConfig = {
      enabledIndicators: {
        rsi: true,
        macd: true,
        ema_alignment: true,
        bollinger: true,
        stochastic: true,
        supertrend: true,
        obv: true,
        atr: true
      },
      minRsiFilter: 30,
      requireEmaAlignment: false
    };
    setTechFilterConfig(defaultConfig);
    setTop3ProfitCryptos(selectTop3HighProbabilityCryptos(cryptos, forumPosts, defaultConfig));
    setConfluenceResult(generateLocalHFTConfluenceAnalysis(activeCrypto, orderFlowData, forumPosts, defaultConfig));
  }, [cryptos, forumPosts, activeCrypto, orderFlowData]);

  // 10-Minute Countdown Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Re-evaluate Top 3 when timer expires
          refreshTop3Selection();
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshTop3Selection]);

  // Format countdown mm:ss
  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };
