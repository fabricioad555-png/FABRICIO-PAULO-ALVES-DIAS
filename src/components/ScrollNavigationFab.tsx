import React, { useState, useEffect } from 'react';
import { 
  ArrowUp, 
  ChevronUp, 
  ChevronDown, 
  Layers, 
  Compass,
  X
} from 'lucide-react';
import { TOPIC_SECTIONS } from './TopicNavigationAnchorBar';

export const ScrollNavigationFab: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeTopicIndex, setActiveTopicIndex] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (totalScroll > 0) {
        const progress = (window.scrollY / totalScroll) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
        setIsVisible(window.scrollY > 250);
      }

      // Calculate current topic
      const scrollPosition = window.scrollY + 200;
      let currentIndex = 0;
      for (let i = TOPIC_SECTIONS.length - 1; i >= 0; i--) {
        const section = document.getElementById(TOPIC_SECTIONS[i].id);
        if (section && scrollPosition >= section.offsetTop) {
          currentIndex = i;
          break;
        }
      }
      setActiveTopicIndex(currentIndex);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTopicByIndex = (index: number) => {
    if (index >= 0 && index < TOPIC_SECTIONS.length) {
      const topic = TOPIC_SECTIONS[index];
      const targetElement = document.getElementById(topic.id);
      if (targetElement) {
        const headerOffset = 130;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
    setIsMenuOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    setIsMenuOpen(false);
  };

  if (!isVisible) return null;

  const currentTopic = TOPIC_SECTIONS[activeTopicIndex] || TOPIC_SECTIONS[0];
  const CurrentIcon = currentTopic.icon;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 font-sans select-none print:hidden">
      
      {/* Expanded Quick Topics Menu */}
      {isMenuOpen && (
        <div className="mb-2 p-3 rounded-2xl bg-[#12141a]/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl shadow-black/80 w-72 max-w-[calc(100vw-2rem)] animate-fadeIn">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Navegação por Tópicos</span>
            </div>
            <button 
              onClick={() => setIsMenuOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            {TOPIC_SECTIONS.map((topic, index) => {
              const Icon = topic.icon;
              const isActive = index === activeTopicIndex;
              return (
                <button
                  key={topic.id}
                  onClick={() => scrollToTopicByIndex(index)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all ${
                    isActive 
                      ? `${topic.bgActiveColor} ${topic.borderActiveColor} border font-bold text-white shadow-sm` 
                      : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`p-1 rounded-lg ${isActive ? 'bg-black/40' : 'bg-slate-900'} ${topic.accentColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate">{topic.label}</span>
                  </div>
                  {topic.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0 ml-1">
                      {topic.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Progresso da página:</span>
            <span className="font-bold text-indigo-400">{Math.round(scrollProgress)}%</span>
          </div>
        </div>
      )}

      {/* Floating Control Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0e1017]/90 backdrop-blur-md border border-slate-700/70 shadow-xl shadow-black/60">
        
        {/* Topic Navigator Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
            isMenuOpen 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
              : 'bg-[#181b24] hover:bg-slate-800 text-slate-200 border border-slate-700/60'
          }`}
          title="Ver todos os tópicos e seções"
          aria-label="Ver todos os tópicos"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline font-semibold max-w-[120px] truncate text-slate-200">
            {currentTopic.shortLabel}
          </span>
          <span className="text-[10px] text-indigo-300 font-bold bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-500/30">
            {activeTopicIndex + 1}/{TOPIC_SECTIONS.length}
          </span>
        </button>

        {/* Previous Section Jump */}
        <button
          onClick={() => scrollToTopicByIndex(Math.max(0, activeTopicIndex - 1))}
          disabled={activeTopicIndex === 0}
          className="p-2 rounded-xl bg-[#181b24] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 disabled:opacity-30 disabled:pointer-events-none transition"
          title="Tópico anterior"
          aria-label="Tópico anterior"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        {/* Next Section Jump */}
        <button
          onClick={() => scrollToTopicByIndex(Math.min(TOPIC_SECTIONS.length - 1, activeTopicIndex + 1))}
          disabled={activeTopicIndex === TOPIC_SECTIONS.length - 1}
          className="p-2 rounded-xl bg-[#181b24] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 disabled:opacity-30 disabled:pointer-events-none transition"
          title="Próximo tópico"
          aria-label="Próximo tópico"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Scroll To Top */}
        <button
          onClick={scrollToTop}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-mono text-xs font-bold shadow-md shadow-indigo-900/40 transition"
          title="Rolar para o topo"
          aria-label="Rolar para o topo"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>{Math.round(scrollProgress)}%</span>
        </button>
      </div>

    </div>
  );
};
