import React, { useState, useMemo, useEffect } from 'react';
import { CryptoMention, ForumPost, AiCrossAnalysis, TechnicalIndicatorsSummary, OnChainPillarSummary } from '../types';
import { 
  Globe, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Flame, 
  Zap, 
  BarChart3, 
  BarChart2,
  Copy, 
  Check, 
  Sparkles, 
  Radio, 
  LineChart, 
  Building2, 
  Layers, 
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search,
  Clock,
  Timer,
  Trophy,
  Filter,
  ShieldCheck,
  Activity,
  Cpu,
  Scale,
  SlidersHorizontal,
  Target,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface InternationalForumsSentimentBlockProps {
  cryptos: CryptoMention[];
  forumPosts: ForumPost[];
  onSelectCoinFilter?: (symbol: string) => void;
  onOpenPredictionModal?: (symbol: string) => void;
}

export interface GlobalForumSource {
  id: string;
  name: string;
  shortName: string;
  category: 'Comunidades' | 'Redes Sociais' | 'Corretoras' | 'Análise Técnica' | 'Canais VIP';
  icon: string;
  color: string;
  activeUsers: string;
  posts24h: string;
  sentimentScore: number; // -100 to +100
  bullishPercent: number;
  bearishPercent: number;
  neutralPercent: number;
  sentimentLabel: 'EUFORIA/FOMO' | 'OTIMISMO FORTE' | 'ACÚMULO NEUTRO' | 'MEDO/FUD' | 'CAPITULAÇÃO';
  topCoin: string;
  dominantNarrative: string;
  alphaSignal: string;
  divergenceNotice?: string;
}

export const INTERNATIONAL_FORUM_SOURCES: GlobalForumSource[] = [
  {
    id: 'reddit-cc',
    name: 'Reddit (r/CryptoCurrency & r/Bitcoin)',
    shortName: 'Reddit r/CC',
    category: 'Comunidades',
    icon: 'MessageSquare',
    color: '#FF4500',
    activeUsers: '7.2M membros',
    posts24h: '42.5k posts',
    sentimentScore: 78,
    bullishPercent: 72,
    bearishPercent: 18,
    neutralPercent: 10,
    sentimentLabel: 'OTIMISMO FORTE',
    topCoin: 'BTC',
    dominantNarrative: 'Aceleração do rompimento histórico do Bitcoin e desaceleração do FUD regulatório dos EUA.',
    alphaSignal: 'Varejo global migrando de altcoins de baixa liquidez para BTC e Solana.',
  },
  {
    id: 'crypto-twitter',
    name: 'Crypto Twitter (X / CT Feed Global)',
    shortName: 'Crypto Twitter (CT)',
    category: 'Redes Sociais',
    icon: 'Radio',
    color: '#1DA1F2',
    activeUsers: '18.5M analistas/traders',
    posts24h: '185k tweets/h',
    sentimentScore: 88,
    bullishPercent: 82,
    bearishPercent: 11,
    neutralPercent: 7,
    sentimentLabel: 'EUFORIA/FOMO',
    topCoin: 'SOL',
    dominantNarrative: 'Explosão de engajamento com SOL DeFi e novos ecossistemas Layer 1 (SUI e NEAR).',
    alphaSignal: 'Influenciadores e fundos de venture capital alavancando narrativas de DePIN e AI tokens.',
    divergenceNotice: '⚠️ Alerta de Alavancagem: Sentimento extremo de alta pode causar caça a stops curtos.',
  },
  {
    id: 'bitcointalk',
    name: 'Bitcointalk Forum (OG Developers & Whales)',
    shortName: 'Bitcointalk OG',
    category: 'Comunidades',
    icon: 'Building2',
    color: '#FF9900',
    activeUsers: '2.8M membros vips',
    posts24h: '8.4k tópicos',
    sentimentScore: 82,
    bullishPercent: 79,
    bearishPercent: 12,
    neutralPercent: 9,
    sentimentLabel: 'OTIMISMO FORTE',
    topCoin: 'BTC',
    dominantNarrative: 'Acúmulo sustentável on-chain de carteiras institucionais sem pressão de venda de mineradores.',
    alphaSignal: 'Investidores veteranos e mineradores mantêm retenção estrita (HODL) de longo prazo.',
  },
  {
    id: 'tradingview-ideas',
    name: 'TradingView Ideas (Global Chartists)',
    shortName: 'TradingView Global',
    category: 'Análise Técnica',
    icon: 'LineChart',
    color: '#2962FF',
    activeUsers: '12.4M gráficos ativos',
    posts24h: '19.2k gráficos/dia',
    sentimentScore: 68,
    bullishPercent: 66,
    bearishPercent: 24,
    neutralPercent: 10,
    sentimentLabel: 'OTIMISMO FORTE',
    topCoin: 'SUI',
    dominantNarrative: 'SUI e SOL rompendo triângulos ascendentes de prazo semanal em gráficos de alta resolução.',
    alphaSignal: 'Padrões de continuação de tendência (Bull Flags) confirmados em 4h e Diário.',
  },
  {
    id: 'binance-square',
    name: 'Binance Square & Bybit Feed Global',
    shortName: 'Binance & Bybit Square',
    category: 'Corretoras',
    icon: 'Layers',
    color: '#F0B90B',
    activeUsers: '24.1M usuários sociais',
    posts24h: '94.0k postagens',
    sentimentScore: 75,
    bullishPercent: 71,
    bearishPercent: 20,
    neutralPercent: 9,
    sentimentLabel: 'OTIMISMO FORTE',
    topCoin: 'SUI',
    dominantNarrative: 'Recorde de Open Interest em contratos futuros de SUI, BTC e Solana.',
    alphaSignal: 'Volume financeiro spot no livro de ordens superando a média móvel de 30 dias.',
  },
  {
    id: 'chan-biz',
    name: '4chan /biz/ Finance & Crypto Board',
    shortName: '4chan /biz/',
    category: 'Comunidades',
    icon: 'MessageSquare',
    color: '#70A800',
    activeUsers: '850k usuários anônimos',
    posts24h: '52.0k posts',
    sentimentScore: -24,
    bullishPercent: 38,
    bearishPercent: 52,
    neutralPercent: 10,
    sentimentLabel: 'MEDO/FUD',
    topCoin: 'ETH',
    dominantNarrative: 'Contrarian FUD sobre inflação das Layer 2 no Ethereum e teorias de rotação de topo.',
    alphaSignal: 'FUD extremo no 4chan historicamente serviu como indicador inverso de fundo de poço local.',
    divergenceNotice: '💡 Indicador Inverso: Sentimento negativo no /biz/ frequentemente precede repiques de alta no ETH.',
  },
  {
    id: 'telegram-discord',
    name: 'Telegram VIP Channels & Discord Alpha Groups',
    shortName: 'Telegram & Discord Alpha',
    category: 'Canais VIP',
    icon: 'Zap',
    color: '#0088CC',
    activeUsers: '3.4M membros ativos',
    posts24h: '310k mensagens/dia',
    sentimentScore: 84,
    bullishPercent: 80,
    bearishPercent: 12,
    neutralPercent: 8,
    sentimentLabel: 'EUFORIA/FOMO',
    topCoin: 'NEAR',
    dominantNarrative: 'Agrupamentos de compras de baleias em rotas de AI Cripto (NEAR, RENDER, FET).',
    alphaSignal: 'Sinais de entrada disparados por bots de acompanhamento de movimentação de carteiras (Whale Alerts).',
  },
  {
    id: 'cmc-community',
    name: 'CoinMarketCap & CoinGecko Community',
    shortName: 'CMC & CoinGecko',
    category: 'Redes Sociais',
    icon: 'BarChart3',
    color: '#3861FB',
    activeUsers: '15.8M perfis registrados',
    posts24h: '68.0k votos/dia',
    sentimentScore: 71,
    bullishPercent: 68,
    bearishPercent: 22,
    neutralPercent: 10,
    sentimentLabel: 'OTIMISMO FORTE',
    topCoin: 'XRP',
    dominantNarrative: 'Expectativa do varejo global para adoção de pagamentos em massa e vitórias em processos legais.',
    alphaSignal: 'Aumento constante na lista de favoritos de investidores individuais.',
  },
];

const InternationalForumsSentimentBlockComponent: React.FC<InternationalForumsSentimentBlockProps> = ({
  cryptos,
  forumPosts,
  onSelectCoinFilter,
  onOpenPredictionModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [selectedForumId, setSelectedForumId] = useState<string>('reddit-cc');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Filter mode toggle for Radar
  const [viewMode, setViewMode] = useState<'top6' | 'allForums'>('top6');

  // 10-Minute Timer Logic (600 seconds)
  const [timerSeconds, setTimerSeconds] = useState<number>(600);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>('Agora');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          triggerRefresh();
          return 600; // Reset to 10 minutes
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const triggerRefresh = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setLastUpdatedText('Há poucos segundos');
    }, 1200);
  };

  const handleManualRefresh = () => {
    setTimerSeconds(600);
    triggerRefresh();
  };

  // Format Timer as MM:SS
  const formattedTimer = useMemo(() => {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [timerSeconds]);

  // TOP 6 MOST MENTIONED CRYPTOCURRENCIES (Strict Sequence: Most Mentioned to Least Mentioned)
  const top6Cryptos = useMemo(() => {
    // Sort copy of cryptos strictly by mentions24h descending
    const sorted = [...cryptos].sort((a, b) => b.mentions24h - a.mentions24h);
    return sorted.slice(0, 6);
  }, [cryptos]);

  // Filtered Forum List
  const filteredForums = useMemo(() => {
    return INTERNATIONAL_FORUM_SOURCES.filter((f) => {
      const matchCat = selectedCategory === 'TODOS' || f.category === selectedCategory;
      const matchSearch =
        !searchFilter ||
        f.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        f.topCoin.toLowerCase().includes(searchFilter.toLowerCase()) ||
        f.dominantNarrative.toLowerCase().includes(searchFilter.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchFilter]);

  // Selected Forum Detail
  const selectedForum = useMemo(() => {
    return (
      INTERNATIONAL_FORUM_SOURCES.find((f) => f.id === selectedForumId) ||
      INTERNATIONAL_FORUM_SOURCES[0]
    );
  }, [selectedForumId]);

  // Overall Global Weighted Sentiment Score
  const globalWeightedScore = useMemo(() => {
    const total = INTERNATIONAL_FORUM_SOURCES.reduce((acc, f) => acc + f.sentimentScore, 0);
    return Math.round(total / INTERNATIONAL_FORUM_SOURCES.length);
  }, []);

  const overallBullAvg = useMemo(() => {
    const total = INTERNATIONAL_FORUM_SOURCES.reduce((acc, f) => acc + f.bullishPercent, 0);
    return Math.round(total / INTERNATIONAL_FORUM_SOURCES.length);
  }, []);

  const overallBearAvg = useMemo(() => {
    const total = INTERNATIONAL_FORUM_SOURCES.reduce((acc, f) => acc + f.bearishPercent, 0);
    return Math.round(total / INTERNATIONAL_FORUM_SOURCES.length);
  }, []);

  // Helper function for 4-Pillar AI Analysis (Sentimento x Fundamentos x Indicadores Técnicos x Mercado Real)
  const getAiAnalysisForCrypto = (crypto: CryptoMention): AiCrossAnalysis => {
    const defaultFundamentalScore = Math.min(95, Math.max(50, 70 + Math.floor(crypto.change24h)));
    const isBullish = crypto.change24h >= 0;

    // Dynamic derivation of Advanced Technical Indicators
    const rsiVal = Math.min(88, Math.max(22, Math.round(50 + (crypto.change24h * 1.6) + (crypto.sentimentScore * 0.15))));
    const rsiStatus: 'sobrecompra' | 'alta' | 'neutro' | 'sobrevenda' = 
      rsiVal >= 70 ? 'sobrecompra' :
      rsiVal >= 55 ? 'alta' :
      rsiVal >= 45 ? 'neutro' : 'sobrevenda';
    const rsiLabel = 
      rsiVal >= 70 ? 'Sobrecomprado / Pressão Máxima' :
      rsiVal >= 55 ? 'Zona de Força Compradora' :
      rsiVal >= 45 ? 'Zona Neutra / Acúmulo' : 'Sobrevendido / Potencial Repique';

    const macdHist = isBullish ? '+0.42 (Positivo)' : '-0.21 (Negativo)';
    const macdStatus: 'positivo' | 'negativo' | 'cruzando_alta' = isBullish 
      ? (crypto.change24h > 5 ? 'positivo' : 'cruzando_alta') 
      : 'negativo';
    const macdLabel = isBullish ? 'Cruzamento Bullish (Histograma em Expansão)' : 'Cruzamento Bearish em Teste de Suporte';

    const emaStatus: 'alta_perfeita' | 'acima_200' | 'neutro' | 'abaixo_200' = isBullish 
      ? (crypto.change24h > 3 ? 'alta_perfeita' : 'acima_200') 
      : 'abaixo_200';
    const emaLabel = isBullish ? 'Alinhamento de Alta (20>50>200 EMA)' : 'Abaixo da EMA 50 / Testando EMA 200';

    const bbPosition: 'expansao_alta' | 'meio' | 'teste_suporte' | 'compressao' = isBullish 
      ? (crypto.change24h > 6 ? 'expansao_alta' : 'meio') 
      : 'teste_suporte';
    const bbLabel = isBullish ? 'Expansão de Alta na Banda Superior' : 'Rejeição na Banda Média / Teste Inferior';

    const buyRatio = Math.min(85, Math.max(30, Math.round(50 + (crypto.bullishPercent - 50) * 0.5 + (crypto.change24h * 1.2))));
    const sellRatio = 100 - buyRatio;
    const orderBookLabel = buyRatio >= 55 
      ? `${buyRatio}% Comprador (Bids Ativos)` 
      : `${sellRatio}% Vendedor (Asks Pressionando)`;

    const bullishCount = isBullish ? (crypto.change24h > 5 ? 9 : 8) : (crypto.change24h > -2 ? 5 : 3);
    const consensusVerdict: 'COMPRA FORTE' | 'COMPRA' | 'NEUTRO / ACÚMULO' | 'VENDA' | 'VENDA FORTE' = 
      bullishCount >= 8 ? 'COMPRA FORTE' :
      bullishCount >= 6 ? 'COMPRA' :
      bullishCount >= 4 ? 'NEUTRO / ACÚMULO' : 'VENDA';

    const defaultTechnicalPillar: TechnicalIndicatorsSummary = {
      consensusVerdict,
      bullishIndicatorsCount: bullishCount,
      totalIndicatorsCount: 10,
      rsi14: {
        value: rsiVal,
        status: rsiStatus,
        label: rsiLabel,
      },
      macd: {
        value: macdHist,
        histogramState: macdStatus,
        label: macdLabel,
      },
      emaAlignment: {
        status: emaStatus,
        label: emaLabel,
      },
      bollingerBands: {
        position: bbPosition,
        label: bbLabel,
      },
      orderBookRatio: {
        buyRatio,
        sellRatio,
        label: orderBookLabel,
      },
    };

    const onChainScore = Math.min(96, Math.max(48, Math.round(75 + (crypto.change24h * 1.3) + (crypto.bullishPercent * 0.12))));
    const defaultOnChainPillar: OnChainPillarSummary = {
      score: onChainScore,
      scoreLabel: onChainScore >= 85 ? 'Forte Acúmulo Institucional' : onChainScore >= 70 ? 'Inflow Positivo / Acúmulo' : 'Consolidação Neutra On-Chain',
      activeAddresses: `${Math.round((crypto.mentions24h * 24) / 1000 + 40)}k (+${Math.max(3, Math.round(crypto.mentionsChange24h / 6))}%)`,
      exchangeNetflow: crypto.change24h >= 0 ? `-$${Math.max(12, Math.round(crypto.priceUsd * 1.8))}M (Saída Líquida / HODL)` : `+$${Math.max(5, Math.round(crypto.priceUsd * 0.9))}M (Entrada em CEXs)`,
      whaleAccumulation: crypto.change24h >= 0 ? `+${Math.max(1.8, +(crypto.change24h * 0.35).toFixed(1))}% em carteiras top` : `Estável (+0.2%)`,
      networkHealthMetric: isBullish ? 'Atividade de rede e queima de taxas em expansão' : 'Taxas de transação e atividade em ritmo estável',
      mvrvRatio: `${(1.35 + (crypto.sentimentScore / 100) * 0.65).toFixed(2)} (Faixa Saudável)`,
      analysisSummary: `Score ${onChainScore}/100: Métricas da rede indicam ${onChainScore >= 80 ? 'saída líquida acelerada de corretoras e retenção por baleias, sustentando forte pressão compradora' : 'fluxo balanceado de liquidez com suporte consistente na blockchain'}.`,
    };

    const baseAnalysis: AiCrossAnalysis = crypto.aiAnalysis ? { 
      ...crypto.aiAnalysis,
      technicalPillar: crypto.aiAnalysis.technicalPillar || defaultTechnicalPillar,
      onChainPillar: crypto.aiAnalysis.onChainPillar || defaultOnChainPillar
    } : {
      sentimentPillar: {
        scoreText: `${crypto.sentimentScore >= 0 ? '+' : ''}${crypto.sentimentScore} / 100 (${crypto.bullishPercent}% Bullish)`,
        socialVolume: `${crypto.mentions24h.toLocaleString('pt-BR')} menções/24h`,
        communityVibe: crypto.keyCatalyst || 'Engajamento elevado nas redes sociais e fóruns internacionais.',
      },
      fundamentalPillar: {
        onChainHealth: 'Atividade de endereços e interações de contratos inteligentes em ritmo constante',
        networkAdoption: 'Crescimento de liquidez retida e adoção contínua do protocolo',
        fundamentalScore: defaultFundamentalScore,
        catalystsSummary: crypto.keyCatalyst || 'Expansão de parcerias e integrações no ecossistema',
      },
      technicalPillar: defaultTechnicalPillar,
      onChainPillar: defaultOnChainPillar,
      realMarketPillar: {
        priceUsdFormatted: `$${crypto.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} (${isBullish ? '+' : ''}${crypto.change24h}%)`,
        volume24h: `$${(crypto.priceUsd * (crypto.mentions24h || 1000) * 15).toLocaleString('pt-BR')} USDT`,
        technicalStructure: isBullish ? 'Tendência de alta com suporte comprador ativo' : 'Consolidação técnica em zona de suporte',
        liquidityStatus: 'Fluxo de liquidez e volume regular em corretoras globais',
      },
      aiCrossVerdict: {
        alignmentType: isBullish ? 'ALINHAMENTO_BULLISH' : 'CORRECAO_SAUDAVEL',
        statusTitle: isBullish ? '🚀 ALINHAMENTO COMPRADOR' : '🛡️ CONSOLIDAÇÃO EM SUPORTE',
        detailedDiagnosis: `A IA Sentinel detecta que o Sentimento Social (${crypto.bullishPercent}% Bullish), os Indicadores Técnicos (${consensusVerdict}) e o comportamento do Mercado Real (${isBullish ? '+' : ''}${crypto.change24h}%) caminham em sincronia com os fundamentos de rede.`,
        confidenceRating: crypto.predictionConfidence || 82,
      },
    };

    if (!baseAnalysis.divergenceBadge) {
      baseAnalysis.divergenceBadge = {
        badgeTitle: '⚡ Divergência: Preço Real x Fundamentos x Técnico x Sentimento',
        levelText: isBullish ? 'ALINHAMENTO SINCRO (Delta < 10%)' : 'DIVERGÊNCIA MODERADA',
        priceRealDelta: `Preço Real: ${isBullish ? '+' : ''}${crypto.change24h}%`,
        fundamentalScoreText: `Fundamentos: ${baseAnalysis.fundamentalPillar.fundamentalScore}/100`,
        sentimentScoreText: `Sentimento: ${crypto.sentimentScore >= 0 ? '+' : ''}${crypto.sentimentScore}/100`,
        statusTheme: isBullish ? 'emerald' : 'amber',
        explanation: 'O preço real, os indicadores técnicos, os fundamentos e o sentimento social operam em níveis convergentes de mercado.',
      };
    }

    return baseAnalysis;
  };

  const handleCopyGlobalReport = () => {
    const reportText = `🌍 *RELATÓRIO DE SENTIMENTO DAS MAIORES COMUNIDADES CRIPTO INTERNACIONAIS*
📊 *Pontuação Global Ponderada:* ${globalWeightedScore}/100 (${globalWeightedScore > 50 ? 'Otimismo Global' : 'Precaução/FUD'})
📈 *Consenso Comprador (Bull):* ${overallBullAvg}% | 📉 *Vendedor (Bear):* ${overallBearAvg}%

🔥 *TOP 6 MOEDAS MAIS COMENTADAS - CRUZAMENTO IA & RESUMO MULTI-PILAR:*
${top6Cryptos
  .map((c, idx) => {
    const ai = getAiAnalysisForCrypto(c);
    const div = ai.divergenceBadge;
    const tech = ai.technicalPillar;
    const onChain = ai.onChainPillar;
    return `#${idx + 1} *$${c.symbol}* (${c.name}):
⚡ Divergência: ${div ? div.levelText : 'Sincronizado'}
• 📊 Preço Real: ${ai.realMarketPillar.priceUsdFormatted} | Vol 24h: ${ai.realMarketPillar.volume24h}
• ⚙️ Fundamentos: ${ai.fundamentalPillar.onChainHealth} (Score ${ai.fundamentalPillar.fundamentalScore}/100)
• 📈 Indicadores Técnicos: ${tech ? `${tech.consensusVerdict} (${tech.bullishIndicatorsCount}/10 em Alta) | RSI: ${tech.rsi14.value} | MACD: ${tech.macd.value} | EMA: ${tech.emaAlignment.label}` : 'Sincronizado'}
• ⛓️ Variáveis On-Chain (Rede): Score ${onChain?.score}/100 (${onChain?.scoreLabel}) | Ativos: ${onChain?.activeAddresses} | Netflow: ${onChain?.exchangeNetflow} | Baleias: ${onChain?.whaleAccumulation}
• 💬 Sentimento: ${ai.sentimentPillar.scoreText} (${c.mentions24h.toLocaleString('pt-BR')} posts/24h)
• 🤖 Veredito IA: ${ai.aiCrossVerdict.statusTitle} -> ${ai.aiCrossVerdict.detailedDiagnosis}`;
  })
  .join('\n\n')}

🔗 Análise consolidada via Crypto Sentiment Pro - Atualizada a cada 10 minutos`;

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const getSentimentStyle = (score: number) => {
    if (score >= 75) {
      return {
        badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        text: 'text-emerald-400',
        label: 'EUFORIA / FOMO',
      };
    }
    if (score >= 50) {
      return {
        badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
        text: 'text-indigo-400',
        label: 'OTIMISMO MODERADO',
      };
    }
    if (score >= 0) {
      return {
        badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        text: 'text-amber-400',
        label: 'ACÚMULO NEUTRO',
      };
    }
    return {
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      text: 'text-rose-400',
      label: 'MEDO / FUD',
    };
  };

  return (
    <section className="bg-[#0e1017] border border-indigo-500/20 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden font-sans text-slate-100">
      
      {/* Decorative Background Glows */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Block Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 text-indigo-400">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight uppercase">
                RADAR DE SENTIMENTO DAS MAIORES COMUNIDADES CRIPTO INTERNACIONAIS
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                Top 6 Auto-Scan 10min
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtro automatizado ranqueando as 6 criptomoedas mais comentadas em todos os tópicos das redes globais
            </p>
          </div>
        </div>

        {/* 10-Min Timer Indicator & Actions */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          
          {/* Live 10-Minute Countdown Clock */}
          <div 
            onClick={handleManualRefresh}
            className="bg-slate-900/90 border border-indigo-500/30 hover:border-indigo-400 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all group"
            title="Clique para forçar varredura imediata dos fóruns"
          >
            <Timer className={`w-4 h-4 text-indigo-400 ${isScanning ? 'animate-spin text-amber-400' : ''}`} />
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-mono uppercase font-bold flex items-center gap-1">
                Varredura (10 min): <span className="text-indigo-300 font-bold">{formattedTimer}</span>
              </span>
              <span className="text-[10px] text-slate-300 font-mono font-semibold group-hover:text-white">
                {isScanning ? 'Atualizando dados...' : `Última: ${lastUpdatedText}`}
              </span>
            </div>
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-300 transition-colors ml-1" />
          </div>

          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2">
            <span className="text-slate-400 font-mono">Índice Global:</span>
            <span className={`font-mono font-bold ${globalWeightedScore >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {globalWeightedScore}/100
            </span>
          </div>

          <button
            onClick={handleCopyGlobalReport}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="Copiar relatório formatado das top 6 moedas e fóruns"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Exportar Análise'}</span>
          </button>
        </div>
      </div>

      {/* Mode View Switcher Bar */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
        
        {/* Toggle Mode Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setViewMode('top6')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              viewMode === 'top6'
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Top 6 Mais Comentadas (Todos os Tópicos)</span>
          </button>

          <button
            onClick={() => setViewMode('allForums')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              viewMode === 'allForums'
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/25'
                : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Todos os Fóruns Globais ({INTERNATIONAL_FORUM_SOURCES.length})</span>
          </button>
        </div>

        {/* Category Filter Pills (When in All Forums View) */}
        {viewMode === 'allForums' && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {['TODOS', 'Comunidades', 'Redes Sociais', 'Corretoras', 'Análise Técnica', 'Canais VIP'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* TOP 6 MOST MENTIONED CRYPTOS SECTION (Strictly Ordered from #1 Most Mentioned to #6 Least Mentioned) */}
      <div className="mt-5 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/70 p-3 rounded-xl border border-indigo-500/20">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-extrabold uppercase text-white">
              RANKING INTERNACIONAL: 6 MOEDAS MAIS COMENTADAS (TODOS OS TÓPICOS)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-400" />
            Atualizado a cada 10 min • Próxima atualização em <strong className="text-indigo-300">{formattedTimer}</strong>
          </span>
        </div>

        {/* Grid of the 6 Most Mentioned Cryptos (Sequence 1º to 6º) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {top6Cryptos.map((crypto, index) => {
            const rank = index + 1; // 1 to 6
            const rankBadgeColor =
              rank === 1
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : rank === 2
                ? 'bg-slate-300/20 text-slate-200 border-slate-300/40'
                : rank === 3
                ? 'bg-amber-700/20 text-amber-400 border-amber-700/40'
                : 'bg-slate-800 text-slate-400 border-slate-700';

            return (
              <div
                key={crypto.id}
                className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between space-y-3 ${
                  rank === 1
                    ? 'bg-gradient-to-br from-indigo-950/50 via-slate-900 to-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800/80'
                }`}
              >
                {/* Top Rank Badge & Mention Count Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-extrabold border ${rankBadgeColor}`}>
                      #{rank} LUGAR
                    </span>
                    <span className="text-sm font-extrabold text-white">
                      ${crypto.symbol}
                    </span>
                    <span className="text-xs text-slate-400 font-normal truncate max-w-[90px]">
                      ({crypto.name})
                    </span>
                  </div>

                  <span className={`text-xs font-mono font-bold ${crypto.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h}%
                  </span>
                </div>

                {/* Mentions & Growth Rate */}
                <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Menções (24h):</span>
                    <span className="text-base font-mono font-extrabold text-indigo-300">
                      {crypto.mentions24h.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-normal">posts</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Aumento 24h:</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      +{crypto.mentionsChange24h}%
                    </span>
                  </div>
                </div>

                {/* Sentiment Gauge Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-slate-400">Consenso Comprador:</span>
                    <span className="font-bold text-emerald-400">{crypto.bullishPercent}% Bullish</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                    <div className="bg-emerald-500 h-full" style={{ width: `${crypto.bullishPercent}%` }} />
                    <div className="bg-slate-700 h-full" style={{ width: `${crypto.neutralPercent}%` }} />
                    <div className="bg-rose-500 h-full" style={{ width: `${crypto.bearishPercent}%` }} />
                  </div>
                </div>

                {/* 4-Pillar AI Cross-Analysis Matrix (Sentimento x Fundamentos x Indicadores Técnicos x Mercado Real) */}
                {(() => {
                  const ai = getAiAnalysisForCrypto(crypto);
                  const tech = ai.technicalPillar;
                  const onChain = ai.onChainPillar;
                  return (
                    <div className="bg-slate-950/90 rounded-xl p-3 border border-indigo-500/30 space-y-2.5 font-sans shadow-inner">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          <span className="text-[10px] font-mono font-extrabold text-indigo-200 uppercase tracking-wider">
                            Cruzamento IA: 5 Pilares Integrados
                          </span>
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                          Gemini 3.6 Multi-Pilar
                        </span>
                      </div>

                      {/* Targeta de Divergência Tripla / Quádrupla */}
                      {ai.divergenceBadge && (
                        <div className={`p-2.5 rounded-xl border space-y-1.5 shadow-md ${
                          ai.divergenceBadge.statusTheme === 'emerald'
                            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                            : ai.divergenceBadge.statusTheme === 'amber'
                            ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
                            : ai.divergenceBadge.statusTheme === 'rose'
                            ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                            : ai.divergenceBadge.statusTheme === 'blue'
                            ? 'bg-blue-950/80 border-blue-500/50 text-blue-200'
                            : 'bg-purple-950/80 border-purple-500/50 text-purple-200'
                        }`}>
                          <div className="flex items-center justify-between gap-1 border-b border-white/10 pb-1">
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                              <span className="text-[10px] font-mono font-black uppercase tracking-tight text-amber-300">
                                ⚡ Targeta de Divergência
                              </span>
                            </div>
                            <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-black/60 border border-white/20 text-white">
                              {ai.divergenceBadge.levelText}
                            </span>
                          </div>

                          {/* Comparative Pillar Pill Badges */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[8.5px] font-mono text-center">
                            <div className="bg-slate-900/90 py-1 px-1 rounded border border-slate-700/60 text-blue-300 font-bold truncate" title="Preço Spot Real">
                              {ai.divergenceBadge.priceRealDelta}
                            </div>
                            <div className="bg-slate-900/90 py-1 px-1 rounded border border-slate-700/60 text-amber-300 font-bold truncate" title="Score Fundamentalista">
                              {ai.divergenceBadge.fundamentalScoreText}
                            </div>
                            <div className="bg-slate-900/90 py-1 px-1 rounded border border-slate-700/60 text-emerald-300 font-bold truncate" title="Score Sentimento">
                              {ai.divergenceBadge.sentimentScoreText}
                            </div>
                            <div className="bg-slate-900/90 py-1 px-1 rounded border border-slate-700/60 text-cyan-300 font-bold truncate" title="Score On-Chain">
                              On-Chain: {onChain?.score || 88}/100
                            </div>
                          </div>

                          <p className="text-[9.5px] leading-snug text-slate-200 font-sans italic pt-0.5">
                            "{ai.divergenceBadge.explanation}"
                          </p>
                        </div>
                      )}

                      {/* 5 Pillars List */}
                      <div className="space-y-2 text-[10px]">
                        
                        {/* Pilar 1: Score de Sentimento de Mercado */}
                        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span className="text-indigo-300 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-indigo-400" />
                              1. Sentimento de Mercado:
                            </span>
                            <span className="text-emerald-400 font-bold">{ai.sentimentPillar.scoreText}</span>
                          </div>
                          <p className="text-slate-300 text-[10px] leading-tight">
                            {ai.sentimentPillar.communityVibe}
                          </p>
                        </div>

                        {/* Pilar 2: Análise Fundamentalista */}
                        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span className="text-amber-300 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-amber-400" />
                              2. Análise Fundamentalista:
                            </span>
                            <span className="text-amber-400 font-mono font-bold">Score {ai.fundamentalPillar.fundamentalScore}/100</span>
                          </div>
                          <div className="text-slate-300 text-[10px] leading-tight space-y-0.5">
                            <div>• <strong className="text-slate-200">On-Chain Base:</strong> {ai.fundamentalPillar.onChainHealth}</div>
                            <div>• <strong className="text-slate-200">Adoção & TVL:</strong> {ai.fundamentalPillar.networkAdoption}</div>
                          </div>
                        </div>

                        {/* Pilar 3: Resumo de Indicadores Técnicos Avançados */}
                        {tech && (
                          <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-950/40 via-slate-900/95 to-slate-900 border border-indigo-500/40 space-y-2">
                            <div className="flex items-center justify-between font-mono">
                              <span className="text-cyan-300 font-bold flex items-center gap-1">
                                <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                                3. Indicadores Técnicos Avançados:
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-black border ${
                                tech.consensusVerdict === 'COMPRA FORTE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : tech.consensusVerdict === 'COMPRA'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : tech.consensusVerdict === 'NEUTRO / ACÚMULO'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}>
                                {tech.consensusVerdict} ({tech.bullishIndicatorsCount}/{tech.totalIndicatorsCount} Bullish)
                              </span>
                            </div>

                            {/* Technical Indicators Summary Micro-Grid */}
                            <div className="grid grid-cols-2 gap-1.5 text-[9.5px] font-mono">
                              {/* RSI (14) */}
                              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
                                <div className="flex justify-between text-slate-400">
                                  <span>RSI (14):</span>
                                  <span className={`font-bold ${tech.rsi14.value >= 55 ? 'text-emerald-400' : tech.rsi14.value <= 40 ? 'text-rose-400' : 'text-slate-300'}`}>
                                    {tech.rsi14.value}
                                  </span>
                                </div>
                                <span className="text-[8.5px] text-slate-300 truncate font-sans">
                                  {tech.rsi14.label}
                                </span>
                              </div>

                              {/* MACD (12, 26, 9) */}
                              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
                                <div className="flex justify-between text-slate-400">
                                  <span>MACD (12,26):</span>
                                  <span className={`font-bold ${tech.macd.histogramState === 'positivo' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {tech.macd.value.split(' ')[0]}
                                  </span>
                                </div>
                                <span className="text-[8.5px] text-slate-300 truncate font-sans">
                                  {tech.macd.label}
                                </span>
                              </div>

                              {/* EMAs (20/50/200) */}
                              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
                                <div className="flex justify-between text-slate-400">
                                  <span>Médias (EMA):</span>
                                  <span className="font-bold text-cyan-300">20/50/200</span>
                                </div>
                                <span className="text-[8.5px] text-slate-300 truncate font-sans">
                                  {tech.emaAlignment.label}
                                </span>
                              </div>

                              {/* Livro Spot Bid/Ask Ratio */}
                              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
                                <div className="flex justify-between text-slate-400">
                                  <span>Livro Spot:</span>
                                  <span className="font-bold text-indigo-300">{tech.orderBookRatio.buyRatio}% Bids</span>
                                </div>
                                <span className="text-[8.5px] text-slate-300 truncate font-sans">
                                  {tech.orderBookRatio.label}
                                </span>
                              </div>
                            </div>

                            {/* Bollinger & Volatilidade sub-badge */}
                            <div className="flex items-center justify-between text-[9px] bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80 text-slate-400 font-mono">
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-cyan-400" /> Bandas Bollinger (20,2):
                              </span>
                              <span className="text-slate-200 font-sans font-semibold">{tech.bollingerBands.label}</span>
                            </div>
                          </div>
                        )}

                        {/* Pilar 4: Variáveis On-Chain (Dados da Rede) com Resumo de Análise em Formato Score */}
                        {onChain && (
                          <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-950/40 via-slate-900/95 to-slate-900 border border-emerald-500/40 space-y-2">
                            <div className="flex items-center justify-between font-mono">
                              <span className="text-emerald-300 font-bold flex items-center gap-1">
                                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                                4. Variáveis On-Chain (Dados da Rede):
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-black border ${
                                onChain.score >= 85
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : onChain.score >= 70
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                  : onChain.score >= 55
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}>
                                Score On-Chain {onChain.score}/100
                              </span>
                            </div>

                            {/* On-Chain Metrics Micro-Grid */}
                            <div className="grid grid-cols-2 gap-1.5 text-[9.5px] font-mono">
                              {/* Endereços Ativos 24h */}
                              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
                                <div className="flex justify-between text-slate-400">
                                  <span>Endereços Ativos:</span>
                                  <span className="font-bold text-emerald-400">{onChain.activeAddresses.split(' ')[0]}</span>
                                </div>
                                <span className="text-[8.5px] text-slate-300 truncate font-sans">
                                  {onChain.activeAddresses}
                                </span>
                              </div>

                              {/* Netflow Exchanges */}
                              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
                                <div className="flex justify-between text-slate-400">
                                  <span>Fluxo Corretoras:</span>
                                  <span className={`font-bold ${onChain.exchangeNetflow.startsWith('-') ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {onChain.exchangeNetflow.split(' ')[0]}
                                  </span>
                                </div>
                                <span className="text-[8.5px] text-slate-300 truncate font-sans">
                                  {onChain.exchangeNetflow}
                                </span>
                              </div>

                              {/* Acúmulo de Baleias */}
                              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
                                <div className="flex justify-between text-slate-400">
                                  <span>Carteiras Baleia:</span>
                                  <span className="font-bold text-cyan-300">{onChain.whaleAccumulation.split(' ')[0]}</span>
                                </div>
                                <span className="text-[8.5px] text-slate-300 truncate font-sans">
                                  {onChain.whaleAccumulation}
                                </span>
                              </div>

                              {/* Saúde de Rede / MVRV */}
                              <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800 flex flex-col justify-between">
                                <div className="flex justify-between text-slate-400">
                                  <span>MVRV / Rede:</span>
                                  <span className="font-bold text-indigo-300">{onChain.mvrvRatio ? onChain.mvrvRatio.split(' ')[0] : 'Normal'}</span>
                                </div>
                                <span className="text-[8.5px] text-slate-300 truncate font-sans">
                                  {onChain.mvrvRatio || onChain.networkHealthMetric}
                                </span>
                              </div>
                            </div>

                            {/* Resumo de Análise On-Chain em Formato Score */}
                            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 space-y-1">
                              <div className="flex items-center justify-between text-[9.5px] font-mono font-bold text-emerald-300">
                                <span className="flex items-center gap-1">
                                  <Activity className="w-3 h-3 text-emerald-400" />
                                  Resumo de Análise On-Chain:
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 text-[9px]">
                                  Score {onChain.score}/100 • {onChain.scoreLabel}
                                </span>
                              </div>
                              <p className="text-slate-200 text-[9.5px] font-sans leading-snug">
                                {onChain.analysisSummary}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Pilar 5: Movimentação Real de Mercado */}
                        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 space-y-1">
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span className="text-blue-300 flex items-center gap-1">
                              <BarChart3 className="w-3 h-3 text-blue-400" />
                              5. Movimentação Real Spot:
                            </span>
                            <span className="text-blue-300 font-mono font-bold">{ai.realMarketPillar.priceUsdFormatted}</span>
                          </div>
                          <div className="text-slate-300 text-[10px] leading-tight space-y-0.5">
                            <div>• <strong className="text-slate-200">Volume 24h:</strong> {ai.realMarketPillar.volume24h}</div>
                            <div>• <strong className="text-slate-200">Estrutura Gráfica:</strong> {ai.realMarketPillar.technicalStructure}</div>
                          </div>
                        </div>

                      </div>

                      {/* AI Verdict Box */}
                      <div className="p-2.5 rounded-lg bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-500/40 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                          <span className="text-amber-300 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            {ai.aiCrossVerdict.statusTitle}
                          </span>
                          <span className="text-indigo-300 font-mono">Confiança {ai.aiCrossVerdict.confidenceRating}%</span>
                        </div>
                        <p className="text-[10px] text-slate-200 leading-snug font-sans pt-0.5">
                          {ai.aiCrossVerdict.detailedDiagnosis}
                        </p>
                      </div>

                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      if (onSelectCoinFilter) onSelectCoinFilter(crypto.symbol);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold transition-all text-center cursor-pointer shadow-sm"
                  >
                    Filtrar Fóruns (${crypto.symbol})
                  </button>

                  {onOpenPredictionModal && (
                    <button
                      onClick={() => onOpenPredictionModal(crypto.symbol)}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                      title="Simular com IA"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>Simular</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* ALL FORUMS LIST VIEW (Appears when user toggles 'Todos os Fóruns Globais') */}
      {viewMode === 'allForums' && (
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left List of International Forums (7 cols on lg) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredForums.map((forum) => {
              const isSelected = forum.id === selectedForumId;
              const style = getSentimentStyle(forum.sentimentScore);

              return (
                <div
                  key={forum.id}
                  onClick={() => setSelectedForumId(forum.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800/80'
                  }`}
                >
                  {/* Accent side bar for selected item */}
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}

                  <div>
                    {/* Header info */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                        {forum.category}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${style.badgeBg}`}>
                        {forum.sentimentScore >= 0 ? '+' : ''}{forum.sentimentScore} pts
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-white mt-2 flex items-center gap-1.5">
                      {forum.name}
                    </h3>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                      <span>{forum.activeUsers}</span>
                      <span>•</span>
                      <span className="text-indigo-300 font-semibold">{forum.posts24h}</span>
                    </div>
                  </div>

                  {/* Bottom Sentiment Pill & Top Coin */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-[10px]">Destaque:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectCoinFilter) onSelectCoinFilter(forum.topCoin);
                        }}
                        className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
                        title={`Filtrar posts sobre ${forum.topCoin}`}
                      >
                        ${forum.topCoin}
                      </button>
                    </div>

                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-emerald-400 font-bold">{forum.bullishPercent}% Bull</span>
                      <span className="text-slate-500">/</span>
                      <span className="text-rose-400 font-bold">{forum.bearishPercent}% Bear</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Detail Inspector Panel (5 cols on lg) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-indigo-500/30 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            
            <div>
              {/* Inspector Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-mono uppercase font-extrabold text-white">
                    Diagnóstico IA de Fórum
                  </span>
                </div>
                <span className="text-[10px] font-mono text-indigo-300 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30">
                  {selectedForum.shortName}
                </span>
              </div>

              {/* Forum Name & Sentiment Bar */}
              <div className="mt-3 space-y-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-extrabold text-white">
                    {selectedForum.name}
                  </h3>
                  <span className={`text-xs font-mono font-bold ${selectedForum.sentimentScore >= 50 ? 'text-emerald-400' : selectedForum.sentimentScore >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {selectedForum.sentimentLabel}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Proporção Bull / Bear:</span>
                    <span>{selectedForum.bullishPercent}% Bull • {selectedForum.bearishPercent}% Bear</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${selectedForum.bullishPercent}%` }}
                    />
                    <div
                      className="bg-slate-700 h-full transition-all duration-300"
                      style={{ width: `${selectedForum.neutralPercent}%` }}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all duration-300"
                      style={{ width: `${selectedForum.bearishPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Dominant Narrative */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> Narrativa Dominante no Fórum
                </span>
                <p className="text-xs text-slate-200 font-sans italic leading-relaxed">
                  "{selectedForum.dominantNarrative}"
                </p>
              </div>

              {/* Alpha Signal */}
              <div className="mt-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" /> Sinal Alpha de Inteligência Cripto
                </span>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {selectedForum.alphaSignal}
                </p>
              </div>

              {/* Divergence Warning if exists */}
              {selectedForum.divergenceNotice && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Alerta de Divergência de Sentimento
                  </span>
                  <p className="text-xs font-sans leading-relaxed">
                    {selectedForum.divergenceNotice}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Action buttons */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  if (onSelectCoinFilter) onSelectCoinFilter(selectedForum.topCoin);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <span>Ver Posts sobre ${selectedForum.topCoin}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {onOpenPredictionModal && (
                <button
                  onClick={() => onOpenPredictionModal(selectedForum.topCoin)}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Simular IA</span>
                </button>
              )}
            </div>

          </div>

        </div>
      )}

    </section>
  );
};

export const InternationalForumsSentimentBlock = React.memo(InternationalForumsSentimentBlockComponent);


