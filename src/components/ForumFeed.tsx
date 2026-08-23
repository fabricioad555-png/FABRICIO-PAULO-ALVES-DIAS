import React, { useState } from 'react';
import { ForumPost } from '../types';
import { ForumPostCard } from './ForumPostCard';
import { MessageSquareText, SearchX } from 'lucide-react';

interface ForumFeedProps {
  posts: ForumPost[];
  onSelectCoinForPrediction: (symbol: string) => void;
  onAnalyzePostWithAI: (postText: string) => void;
  selectedCoinFilter: string;
  onSelectCoinFilter: (coin: string) => void;
  searchQuery: string;
  onClearSearchQuery?: () => void;
}

export const ForumFeed: React.FC<ForumFeedProps> = ({
  posts,
  onSelectCoinForPrediction,
  onAnalyzePostWithAI,
  selectedCoinFilter,
  onSelectCoinFilter,
  searchQuery,
  onClearSearchQuery,
}) => {
  const [selectedSource] = useState<string>('all');
  const [selectedSentiment] = useState<string>('all');

  const handleResetFilters = () => {
    onSelectCoinFilter('all');
    if (onClearSearchQuery) {
      onClearSearchQuery();
    }
  };

  // Filter posts based on controls
  const filteredPosts = posts.filter((p) => {
    if (selectedSource !== 'all' && p.sourceId !== selectedSource) {
      return false;
    }

    if (selectedCoinFilter !== 'all') {
      const coin = selectedCoinFilter.toUpperCase();
      const mentionsInList = p.coinsMentioned.some((c) => c.toUpperCase() === coin);
      const mentionsInText = p.title.toUpperCase().includes(coin) || p.content.toUpperCase().includes(coin);
      if (!mentionsInList && !mentionsInText) {
        return false;
      }
    }

    if (selectedSentiment !== 'all' && p.sentiment !== selectedSentiment) {
      return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const queryWords = q.split(/\s+/).filter((w) => w.length > 0);

      const titleLower = p.title.toLowerCase();
      const contentLower = p.content.toLowerCase();
      const authorLower = p.author.toLowerCase();
      const coinsLower = p.coinsMentioned.map((c) => c.toLowerCase());

      const matchExact = titleLower.includes(q) || contentLower.includes(q) || authorLower.includes(q) || coinsLower.some((c) => c.includes(q));
      const matchWords = queryWords.length > 0 && queryWords.some((w) => titleLower.includes(w) || contentLower.includes(w) || authorLower.includes(w) || coinsLower.some((c) => c.includes(w)));

      if (!matchExact && !matchWords) {
        return false;
      }
    }

    return true;
  });

  return (
    <section className="space-y-6">
      
      {/* Feed List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-indigo-400" />
            <h2 className="text-xl font-serif italic text-white">
              Discussões Ativas em Fóruns
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Exibindo {filteredPosts.length} de {posts.length} tópicos
          </span>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="bg-[#12141a] border border-slate-800/60 rounded-xl p-10 text-center space-y-3">
            <SearchX className="h-10 w-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-serif italic text-slate-200">
              Nenhuma discussão encontrada
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Tente alterar os termos de busca ou o filtro de moeda selecionada.
            </p>
            <button
              onClick={handleResetFilters}
              className="text-xs font-mono font-bold uppercase px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors cursor-pointer"
            >
              Resetar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPosts.map((post) => (
              <ForumPostCard
                key={post.id}
                post={post}
                onSelectCoinForPrediction={onSelectCoinForPrediction}
                onAnalyzePostWithAI={onAnalyzePostWithAI}
              />
            ))}
          </div>
        )}
      </div>

    </section>
  );
};

