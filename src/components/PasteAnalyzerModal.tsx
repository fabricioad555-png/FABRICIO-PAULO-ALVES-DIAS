import React, { useState } from 'react';
import { FORUM_SOURCES } from '../data/mockForumsData';
import { 
  X, 
  MessageSquareCode, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Loader2
} from 'lucide-react';

interface PasteAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  onAnalysisSuccess?: (analyzedResult: any) => void;
}

export const PasteAnalyzerModal: React.FC<PasteAnalyzerModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  onAnalysisSuccess,
}) => {
  const [inputText, setInputText] = useState<string>(initialText);
  const [sourceName, setSourceName] = useState<string>('Binance Square');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setInputText(initialText || '');
      setErrorMsg(null);
      setAnalysisResult(null);
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setErrorMsg('Por favor, cole ou digite o texto do fórum para analisar.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze-forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          sourceName,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao analisar texto do fórum.');
      }

      setAnalysisResult(data.analysis);
      if (onAnalysisSuccess) {
        onAnalysisSuccess(data.analysis);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao conectar ao servidor Gemini IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const sampleTemplates = [
    {
      title: 'Post Binance Square (Solana Breakout)',
      source: 'Binance Square',
      text: 'Solana acabou de romper os $210 com volume de compras forte no order book da Binance! Vários canais de sinal no Telegram confirmaram entrada em longo prazo. Alvo inicial em $235 com stop ajustado em $202.',
    },
    {
      title: 'Discussão Reddit (FUD sobre Ethereum)',
      source: 'Reddit r/CryptoCurrency',
      text: 'O gás nas Layer 2s do Ethereum está barato mas a liquidez continua fragmentada. No Reddit muitos traders estão reclamando que o ETH perdeu tração para a Solana e SUI. Pode haver correção para $3.200 antes de qualquer recuperação.',
    },
    {
      title: 'TradingView Idea (Bitcoin & $100k)',
      source: 'TradingView Ideas',
      text: 'Bitcoin acumulando há 5 dias logo abaixo da resistência crítica de $98.000. As baleias continuam absorvendo todas as vendas de mineradores no livro da Coinbase e Binance. Liquidação massiva de posições vendidas iminente.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0a0a0b] border border-slate-800/80 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
            <MessageSquareCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-serif italic text-white">
              Analisador de Texto de Fórum & Chat
            </h3>
            <p className="text-xs font-mono text-slate-400">
              Cole qualquer comentário, artigo ou post de corretora para diagnóstico de sentimento via Gemini AI
            </p>
          </div>
        </div>

        {/* Quick Sample Templates */}
        <div className="mb-4">
          <span className="text-[10px] font-mono uppercase text-slate-400 mb-1.5 block">
            Exemplos Prontos para Testar:
          </span>
          <div className="flex flex-wrap gap-2">
            {sampleTemplates.map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputText(tmpl.text);
                  setSourceName(tmpl.source);
                }}
                className="text-xs font-mono bg-[#12141a] hover:bg-slate-900 text-indigo-300 px-2.5 py-1 rounded border border-slate-800 transition-colors text-left cursor-pointer"
              >
                ⚡ {tmpl.title}
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4 font-mono text-xs">
          <div>
            <label className="text-[10px] uppercase text-slate-300 mb-1 block">
              Origem do Fórum / Canal:
            </label>
            <select
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="w-full bg-[#12141a] text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-800 focus:border-indigo-500 outline-none"
            >
              {FORUM_SOURCES.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.category})
                </option>
              ))}
              <option value="Outro Fórum / Chat Telegram">Outro Fórum / Chat Telegram</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase text-slate-300 mb-1 block">
              Conteúdo do Fórum para Analisar:
            </label>
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cole aqui a postagem do fórum da corretora, tweet ou análise do trader..."
              className="w-full bg-[#12141a] text-slate-100 text-xs font-mono rounded-xl p-3 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-600"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isLoading || !inputText.trim()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando Sentimento com Gemini IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Analisar Sentimento e Prever Movimento</span>
              </>
            )}
          </button>
        </div>

        {/* Result Card */}
        {analysisResult && (
          <div className="mt-6 bg-[#12141a] border border-indigo-500/30 rounded-xl p-5 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h4 className="text-base font-serif italic text-white">
                  Resultado do Diagnóstico IA
                </h4>
              </div>
              <span className="text-xs font-mono font-bold uppercase px-2.5 py-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {analysisResult.sentimentLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-[#0a0a0b] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Criptos Identificadas</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysisResult.mentionedCoins?.map((coin: string) => (
                    <span key={coin} className="font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                      ${coin}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-[#0a0a0b] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-0.5">Pontuação de Sentimento</span>
                <span className={`text-base font-black ${analysisResult.sentimentScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {analysisResult.sentimentScore > 0 ? `+${analysisResult.sentimentScore}` : analysisResult.sentimentScore} / 100
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-mono uppercase text-slate-400 block mb-1">Resumo Executivo</span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-[#0a0a0b] p-3 rounded-lg border border-slate-800">
                {analysisResult.summary}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-[#0a0a0b] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1 font-semibold">Impacto Preditivo</span>
                <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800 inline-block">
                  {analysisResult.predictedImpact}
                </span>
              </div>

              <div className="bg-[#0a0a0b] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 block mb-1 font-semibold">Nível de Psicologia</span>
                <span className="font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800 inline-block">
                  {analysisResult.fomoFudRating}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-mono uppercase text-slate-400 block mb-1">Argumentos Chave no Fórum</span>
              <ul className="space-y-1 text-xs text-slate-300">
                {analysisResult.keyArguments?.map((arg: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-indigo-400">•</span>
                    <span>{arg}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-xs font-mono text-indigo-200">
              <strong className="block font-serif italic text-indigo-300 mb-0.5">💡 Ação Tática Recomendada:</strong>
              <span>{analysisResult.suggestedAction}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

