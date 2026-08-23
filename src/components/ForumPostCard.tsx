import React from 'react';
import { ForumPost } from '../types';
import { FORUM_SOURCES } from '../data/mockForumsData';
import { 
  ThumbsUp, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

interface ForumPostCardProps {
  post: ForumPost;
  onSelectCoinForPrediction?: (symbol: string) => void;
  onAnalyzePostWithAI?: (postText: string) => void;
}

export const ForumPostCard: React.FC<ForumPostCardProps> = ({
  post,
  onSelectCoinForPrediction,
  onAnalyzePostWithAI,
}) => {
  const source = FORUM_SOURCES.find((s) => s.id === post.sourceId) || FORUM_SOURCES[0];

  const getSentimentBadge = () => {
    switch (post.sentiment) {
      case 'bullish':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="h-3 w-3" />
            Bullish (+{post.sentimentScore})
          </span>
        );
      case 'fomo':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="h-3 w-3" />
            FOMO (+{post.sentimentScore})
          </span>
        );
      case 'bearish':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <TrendingDown className="h-3 w-3" />
            Bearish ({post.sentimentScore})
          </span>
        );
      case 'fud':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="h-3 w-3" />
            FUD ({post.sentimentScore})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            Neutro
          </span>
        );
    }
  };

  return (
    <div className="bg-[#12141a] hover:bg-slate-900/90 border border-slate-800/60 hover:border-indigo-500/40 rounded-xl p-5 transition-all duration-200 shadow-xl flex flex-col justify-between group">
      <div>
        
        {/* Source Badge, Author, Timestamp */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded text-black uppercase"
              style={{ backgroundColor: source.color }}
            >
              {source.name}
            </span>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-slate-200">{post.author}</span>
              {post.authorBadge && (
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                  {post.authorBadge}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="hidden sm:inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/30">
              <CheckCircle2 className="h-3 w-3" />
              {post.authorReliability}% Conf.
            </span>
            <span>{post.timestamp}</span>
          </div>
        </div>

        {/* Title & Post Content */}
        <h4 className="text-base font-serif italic text-white group-hover:text-indigo-300 transition-colors mb-2 leading-snug">
          {post.title}
        </h4>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-3 line-clamp-3">
          "{post.content}"
        </p>

        {/* AI Key Takeaway Box */}
        <div className="bg-[#0a0a0b]/80 border border-indigo-500/20 rounded-lg p-3 mb-3 text-xs text-slate-300 flex items-start gap-2.5">
          <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-indigo-300 font-serif italic block mb-0.5">Diagnóstico IA Gemini:</strong>
            <span>{post.aiSummary}</span>
          </div>
        </div>

        {/* Coins Mentioned & Sentiment Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase text-slate-400">Criptos:</span>
            {post.coinsMentioned.map((coin) => (
              <button
                key={coin}
                onClick={() => onSelectCoinForPrediction && onSelectCoinForPrediction(coin)}
                className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              >
                ${coin}
              </button>
            ))}
          </div>

          <div>{getSentimentBadge()}</div>
        </div>

      </div>

      {/* Engagement Stats & Bottom Trigger */}
      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5 text-slate-500" />
            {post.likes}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
            {post.replies} resp.
          </span>
        </div>

        {onAnalyzePostWithAI && (
          <button
            onClick={() => onAnalyzePostWithAI(post.content)}
            className="flex items-center gap-1 text-xs font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded border border-indigo-500/20 transition-all cursor-pointer"
          >
            <span>Re-analisar</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

    </div>
  );
};

