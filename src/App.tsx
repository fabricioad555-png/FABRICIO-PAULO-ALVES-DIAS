/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InternationalForumsSentimentBlock } from './components/InternationalForumsSentimentBlock';

import { IndividualTechnicalAnalysisBlock } from './components/IndividualTechnicalAnalysisBlock';
import { HighFrequencyConfluenceAIBlock } from './components/HighFrequencyConfluenceAIBlock';
import { TradingExecutionDashboard } from './components/TradingExecutionDashboard';
import { OnChainHistoryAnalysisBlock } from './components/OnChainHistoryAnalysisBlock';
import { SentimentHeatmap } from './components/SentimentHeatmap';
import { SystemAuditModule } from './components/SystemAuditModule';
import { TopicNavigationAnchorBar } from './components/TopicNavigationAnchorBar';
import { ScrollNavigationFab } from './components/ScrollNavigationFab';
import { LongitudinalScrollRail } from './components/LongitudinalScrollRail';
import { PasteAnalyzerModal } from './components/PasteAnalyzerModal';
import { PredictiveMovementModal } from './components/PredictiveMovementModal';
import { AICryptoChatDrawer } from './components/AICryptoChatDrawer';
import { InstallAndroidModal } from './components/InstallAndroidModal';
import { ErrorBoundary } from './components/ErrorBoundary';

import { 
  INITIAL_MARKET_OVERVIEW, 
  INITIAL_TOP_CRYPTOS, 
  INITIAL_FORUM_POSTS 
} from './data/mockForumsData';
import { CryptoMention, ForumPost } from './types';
import { fetchLiveCryptoPrices } from './services/liveCryptoPriceService';

export default function App() {
  const [marketOverview, setMarketOverview] = useState(INITIAL_MARKET_OVERVIEW);
  const [cryptos, setCryptos] = useState<CryptoMention[]>(INITIAL_TOP_CRYPTOS);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(INITIAL_FORUM_POSTS);

  // Auto-Refresh & Scanner States
  const [isAutoRefreshActive, setIsAutoRefreshActive] = useState<boolean>(true);
  const [lastScanTime, setLastScanTime] = useState<string>('Agora mesmo');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCoinFilter, setSelectedCoinFilter] = useState<string>('SOL');
  const [selectedKeyword, setSelectedKeyword] = useState<string>('');

  // Modals & Drawers States
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [pasteInitialText, setPasteInitialText] = useState<string>('');
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState<boolean>(false);
  const [selectedCryptoForPrediction, setSelectedCryptoForPrediction] = useState<CryptoMention | undefined>(undefined);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [isInstallAndroidModalOpen, setIsInstallAndroidModalOpen] = useState<boolean>(false);

  // Fetch real market prices from live API with stable dependency
  const fetchLiveMarketPrices = React.useCallback(async () => {
    try {
      setCryptos((prevCryptos) => {
        // Execute background fetch without blocking state
        fetchLiveCryptoPrices(prevCryptos).then((updatedList) => {
          if (updatedList && updatedList !== prevCryptos) {
            setCryptos(updatedList);
          }
        }).catch((err) => {
          console.debug("Real market prices sync info:", err);
        });
        return prevCryptos;
      });
    } catch (err) {
      console.debug("Real market prices sync info:", err);
    }
  }, []);

  // Trigger Refresh Lógica Instantânea com Cotação Real
  const handleRefreshData = React.useCallback(() => {
    setIsRefreshing(true);
    
    // Atualiza cotações em segundo plano de forma assíncrona sem travar a interface
    fetchLiveMarketPrices();

    // Atualização de métricas de mercado
    setMarketOverview((prev) => ({
      ...prev,
      totalPostsAnalyzed24h: prev.totalPostsAnalyzed24h + Math.floor(Math.random() * 15 + 2),
      fearAndGreedIndex: Math.min(95, Math.max(30, prev.fearAndGreedIndex + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0))),
    }));

    setLastScanTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    setTimeout(() => {
      setIsRefreshing(false);
    }, 250);
  }, [fetchLiveMarketPrices]);

  // Instant Auto-Refresh Interval (Unified single 3-second cycle)
  useEffect(() => {
    fetchLiveMarketPrices();
    if (!isAutoRefreshActive) return;

    const interval = setInterval(() => {
      handleRefreshData();
    }, 3000);

    return () => clearInterval(interval);
  }, [isAutoRefreshActive, handleRefreshData, fetchLiveMarketPrices]);

  // Open prediction modal for a specific coin
  const handleOpenPredictionForCoin = (crypto: CryptoMention) => {
    setSelectedCryptoForPrediction(crypto);
    setIsPredictionModalOpen(true);
  };

  // Open prediction modal by symbol name
  const handleOpenPredictionBySymbol = (symbol: string) => {
    const found = cryptos.find((c) => c.symbol.toUpperCase() === symbol.toUpperCase());
    setSelectedCryptoForPrediction(found || cryptos[0]);
    setIsPredictionModalOpen(true);
  };

  // Callback when a custom analyzed post is generated
  const handleAnalysisSuccess = (analyzedResult: any) => {
    if (analyzedResult) {
      const newPost: ForumPost = {
        id: `custom-post-${Date.now()}`,
        sourceId: 'binance',
        author: 'Análise do Usuário',
        authorBadge: 'Análise do Usuário',
        authorReliability: 95,
        timestamp: 'Agora mesmo',
        title: `Análise Customizada: ${analyzedResult.mentionedCoins?.join(', ') || 'Cripto'}`,
        content: analyzedResult.summary || 'Post analisado manualmente via Gemini AI',
        coinsMentioned: analyzedResult.mentionedCoins || ['BTC'],
        sentiment: analyzedResult.sentimentScore >= 20 ? 'bullish' : analyzedResult.sentimentScore <= -20 ? 'bearish' : 'neutral',
        sentimentScore: analyzedResult.sentimentScore || 50,
        likes: 1,
        replies: 0,
        aiSummary: analyzedResult.summary,
        perceivedMovement: analyzedResult.predictedImpact === 'FORTE_ALTA' ? 'BREAKOUT' : 'UP',
      };

      setForumPosts((prev) => [newPost, ...prev]);
    }
  };

  // Cell selection on Heatmap
  const handleHeatmapSelectCell = (symbol: string) => {
    setSelectedCoinFilter(symbol);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* App Header */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenPasteAnalyzer={() => {
          setPasteInitialText('');
          setIsPasteModalOpen(true);
        }}
        onOpenPredictionModal={() => {
          setSelectedCryptoForPrediction(cryptos[0]);
          setIsPredictionModalOpen(true);
        }}
        onOpenInstallAndroidModal={() => setIsInstallAndroidModalOpen(true)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isRefreshing={isRefreshing}
        onRefresh={handleRefreshData}
        isAutoRefreshActive={isAutoRefreshActive}
        onToggleAutoRefresh={() => setIsAutoRefreshActive(!isAutoRefreshActive)}
        lastScanTime={lastScanTime}
      />

      {/* Sticky Topics/Themes Navigation Bar with Horizontal Scrollbar & Progress Indicator */}
      <TopicNavigationAnchorBar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
        
        {/* Tópico 0: Módulo de Auditoria do Sistema 24h & Otimização Autônoma */}
        <section 
          id="section-system-audit" 
          className="scroll-mt-36 transition-all"
          aria-label="Auditoria do Sistema 24h & Auto-Cura"
        >
          <ErrorBoundary fallbackTitle="Auditoria do Sistema">
            <SystemAuditModule 
              cryptos={cryptos}
              forumPosts={forumPosts}
            />
          </ErrorBoundary>
        </section>

        {/* Tópico 1: Auto-Trading Bot Execution Dashboard (Modo Demo HFT) */}
        <section 
          id="section-trading-bot" 
          className="scroll-mt-36 transition-all"
          aria-label="Bot de Execução & HFT Scalper"
        >
          <ErrorBoundary fallbackTitle="Painel Bot de Execução HFT">
            <TradingExecutionDashboard 
              cryptos={cryptos}
            />
          </ErrorBoundary>
        </section>

        {/* Tópico 2: Master High-Frequency AI Confluence Engine: Dual-Layer Multi-Factor & Microstructure Signal */}
        <section 
          id="section-ai-confluence" 
          className="scroll-mt-36 transition-all"
          aria-label="Confluência de IA & Sinais"
        >
          <ErrorBoundary fallbackTitle="Confluência de IA">
            <HighFrequencyConfluenceAIBlock
              cryptos={cryptos}
              selectedSymbol={selectedCoinFilter}
              onSelectSymbol={(symbol) => {
                setSelectedCoinFilter(symbol);
              }}
              onOpenPredictionModal={handleOpenPredictionBySymbol}
              forumPosts={forumPosts}
            />
          </ErrorBoundary>
        </section>

        {/* Tópico 3: International Crypto Forums Sentiment Radar */}
        <section 
          id="section-forums-sentiment" 
          className="scroll-mt-36 transition-all"
          aria-label="Radar de Fóruns & Sentimento Internacional"
        >
          <ErrorBoundary fallbackTitle="Radar de Fóruns">
            <InternationalForumsSentimentBlock
              cryptos={cryptos}
              forumPosts={forumPosts}
              onSelectCoinFilter={(symbol) => {
                setSelectedCoinFilter(symbol);
              }}
              onOpenPredictionModal={handleOpenPredictionBySymbol}
            />
          </ErrorBoundary>
        </section>

        {/* Tópico 4: Individual Technical & Order Book Analysis Block */}
        <section 
          id="section-technical-analysis" 
          className="scroll-mt-36 transition-all"
          aria-label="Análise Técnica & Livro de Ofertas Individual"
        >
          <ErrorBoundary fallbackTitle="Análise Técnica">
            <IndividualTechnicalAnalysisBlock
              cryptos={cryptos}
              selectedSymbol={selectedCoinFilter}
              onSelectSymbol={(symbol) => {
                setSelectedCoinFilter(symbol);
              }}
              onOpenPredictionModal={handleOpenPredictionBySymbol}
            />
          </ErrorBoundary>
        </section>

        {/* Tópico 5: On-Chain History (Network Data) - 12 Months Historical Analysis Block */}
        <section 
          id="section-onchain-audit" 
          className="scroll-mt-36 transition-all"
          aria-label="Auditoria On-Chain e Histórico de 12 Meses"
        >
          <ErrorBoundary fallbackTitle="Histórico On-Chain">
            <OnChainHistoryAnalysisBlock
              cryptos={cryptos}
              selectedSymbol={selectedCoinFilter}
              onOpenPredictionModal={handleOpenPredictionBySymbol}
            />
          </ErrorBoundary>
        </section>

        {/* Tópico 6: Sentiment Heatmap Matrix */}
        <section 
          id="section-sentiment-heatmap" 
          className="scroll-mt-36 transition-all"
          aria-label="Mapa de Calor de Sentimento (Heatmap)"
        >
          <ErrorBoundary fallbackTitle="Mapa de Calor">
            <SentimentHeatmap
              cryptos={cryptos}
              onSelectCell={handleHeatmapSelectCell}
            />
          </ErrorBoundary>
        </section>

      </main>

      {/* Floating Navigation FAB & Quick Jump */}
      <ScrollNavigationFab />

      {/* Visible Longitudinal Scrollbar Rail & Quick Topic Navigator */}
      <LongitudinalScrollRail />

      {/* Footer */}
      <footer className="border-t border-slate-800/40 bg-[#0a0a0b] py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <p>CryptoForum Sentiment Analyzer • Motor de IA Gemini Server-Side</p>
          </div>
          <p className="text-slate-600">
            Aviso: Análises baseadas em sentimento de fóruns e redes sociais. Não constitui recomendação financeira direta.
          </p>
        </div>
      </footer>

      {/* Paste & Analyze Modal */}
      <PasteAnalyzerModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        initialText={pasteInitialText}
        onAnalysisSuccess={handleAnalysisSuccess}
      />

      {/* Predictive Movement Report Modal */}
      <PredictiveMovementModal
        isOpen={isPredictionModalOpen}
        onClose={() => setIsPredictionModalOpen(false)}
        crypto={selectedCryptoForPrediction}
        allCryptos={cryptos}
      />

      {/* Interactive AI Chat Drawer */}
      <AICryptoChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        selectedCoin={selectedCoinFilter !== 'all' ? selectedCoinFilter : undefined}
      />

      {/* Install Android PWA Modal */}
      <InstallAndroidModal
        isOpen={isInstallAndroidModalOpen}
        onClose={() => setIsInstallAndroidModalOpen(false)}
      />

    </div>
  );
}

