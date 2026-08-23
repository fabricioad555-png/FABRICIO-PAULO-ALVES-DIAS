import React, { useEffect, useState, useRef } from 'react';
import { 
  Bot, 
  Zap, 
  Globe, 
  LineChart, 
  Database, 
  Grid, 
  ShieldCheck,
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  Compass, 
  ArrowUp, 
  Check 
} from 'lucide-react';

export interface TopicItem {
  id: string;
  label: string;
  shortLabel: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  borderActiveColor: string;
  bgActiveColor: string;
  description: string;
}

export const TOPIC_SECTIONS: TopicItem[] = [
  {
    id: 'section-system-audit',
    label: 'Auditoria do Sistema (24h)',
    shortLabel: 'Auditoria 24h',
    badge: 'Auto-Cura',
    icon: ShieldCheck,
    accentColor: 'text-indigo-400',
    borderActiveColor: 'border-indigo-500/70',
    bgActiveColor: 'bg-indigo-500/15 text-indigo-200',
    description: 'Auditoria de integridade lógica, veracidade e otimização autônoma de performance'
  },
  {
    id: 'section-trading-bot',
    label: 'Bot de Execução & HFT',
    shortLabel: 'Bot HFT',
    badge: 'Scalper +10¢',
    icon: Bot,
    accentColor: 'text-cyan-400',
    borderActiveColor: 'border-cyan-500/70',
    bgActiveColor: 'bg-cyan-500/15 text-cyan-200',
    description: 'Gestão de ordens, trailing stop dinâmico e posições abertas'
  },
  {
    id: 'section-ai-confluence',
    label: 'Confluência de IA & Sinais',
    shortLabel: 'Confluência IA',
    badge: 'Dual-Layer',
    icon: Zap,
    accentColor: 'text-emerald-400',
    borderActiveColor: 'border-emerald-500/70',
    bgActiveColor: 'bg-emerald-500/15 text-emerald-200',
    description: 'Matriz multi-fator de IA, microestrutura e gatilhos de confluência'
  },
  {
    id: 'section-forums-sentiment',
    label: 'Radar de Fóruns & Sentimento',
    shortLabel: 'Fóruns Globais',
    badge: '428 Fontes',
    icon: Globe,
    accentColor: 'text-indigo-400',
    borderActiveColor: 'border-indigo-500/70',
    bgActiveColor: 'bg-indigo-500/15 text-indigo-200',
    description: 'Sentimento Binance Square, Reddit, X (Twitter), 4chan e Telegram'
  },
  {
    id: 'section-technical-analysis',
    label: 'Análise Técnica & Book',
    shortLabel: 'Book Individual',
    badge: 'Microestrutura',
    icon: LineChart,
    accentColor: 'text-amber-400',
    borderActiveColor: 'border-amber-500/70',
    bgActiveColor: 'bg-amber-500/15 text-amber-200',
    description: 'Livro de ofertas, fluxo de ordens e Times & Trades por cripto'
  },
  {
    id: 'section-onchain-audit',
    label: 'Auditoria On-Chain (12m)',
    shortLabel: 'On-Chain 12m',
    badge: 'Baleias',
    icon: Database,
    accentColor: 'text-purple-400',
    borderActiveColor: 'border-purple-500/70',
    bgActiveColor: 'bg-purple-500/15 text-purple-200',
    description: 'Histórico de rede, fluxo de grandes carteiras e auditoria de risco'
  },
  {
    id: 'section-sentiment-heatmap',
    label: 'Mapa de Calor (Heatmap)',
    shortLabel: 'Heatmap',
    badge: 'Visão Geral',
    icon: Grid,
    accentColor: 'text-rose-400',
    borderActiveColor: 'border-rose-500/70',
    bgActiveColor: 'bg-rose-500/15 text-rose-200',
    description: 'Matriz visual consolidada de volume, variação e sentimento'
  }
];

interface TopicNavigationAnchorBarProps {
  activeTopicId?: string;
}

export const TopicNavigationAnchorBar: React.FC<TopicNavigationAnchorBarProps> = ({
  activeTopicId: externalActiveTopicId
}) => {
  const [activeId, setActiveId] = useState<string>(externalActiveTopicId || TOPIC_SECTIONS[0].id);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Monitor Scroll Progress & Active Section with Intersection / scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (totalScroll > 0) {
        const currentProgress = (window.scrollY / totalScroll) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }

      // Detect active section based on scroll offset
      const headerOffset = 180;
      const scrollPosition = window.scrollY + headerOffset;

      for (let i = TOPIC_SECTIONS.length - 1; i >= 0; i--) {
        const section = document.getElementById(TOPIC_SECTIONS[i].id);
        if (section) {
          const top = section.offsetTop;
          if (scrollPosition >= top) {
            setActiveId(TOPIC_SECTIONS[i].id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const scrollToSection = (id: string) => {
    setActiveId(id);
    setIsDropdownOpen(false);
    const targetElement = document.getElementById(id);
    if (targetElement) {
      const headerOffset = 130;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const activeIndex = TOPIC_SECTIONS.findIndex(t => t.id === activeId);
  const currentTopic = TOPIC_SECTIONS[activeIndex >= 0 ? activeIndex : 0];
  const CurrentIcon = currentTopic.icon;

  const handlePreviousTopic = () => {
    if (activeIndex > 0) {
      scrollToSection(TOPIC_SECTIONS[activeIndex - 1].id);
    }
  };

  const handleNextTopic = () => {
    if (activeIndex < TOPIC_SECTIONS.length - 1) {
      scrollToSection(TOPIC_SECTIONS[activeIndex + 1].id);
    }
  };

  return (
    <div className="sticky top-[61px] sm:top-[69px] z-30 bg-[#0a0a0b]/95 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/40">
      {/* Scroll Progress Bar at the top */}
      <div className="h-0.5 w-full bg-slate-800/60 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          
          {/* Left Label */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-slate-400 shrink-0">
            <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
            <span className="font-bold text-slate-200 hidden md:inline">Navegar por Tópicos:</span>
            <span className="font-bold text-slate-200 md:hidden">Tópico:</span>
          </div>

          {/* Center: Dropdown List Selector (Lista Suspensa) */}
          <div ref={dropdownRef} className="relative flex-1 max-w-xl min-w-0">
            {/* Dropdown Button Trigger */}
            <button
              id="topics-dropdown-trigger"
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border text-xs transition-all duration-200 shadow-sm min-w-0 ${
                isDropdownOpen
                  ? 'bg-[#181b24] border-indigo-500/80 text-white ring-2 ring-indigo-500/20 shadow-indigo-950/40'
                  : 'bg-[#12141a] hover:bg-[#181b24] text-slate-200 border-slate-800 hover:border-slate-700'
              }`}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
            >
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className={`p-1 rounded-lg bg-black/40 shrink-0 ${currentTopic.accentColor}`}>
                  <CurrentIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
                
                <div className="flex flex-col text-left truncate min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-white truncate text-[11.5px] sm:text-xs md:text-sm">
                      {currentTopic.label}
                    </span>
                    {currentTopic.badge && (
                      <span className="hidden sm:inline text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
                        {currentTopic.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[9.5px] text-slate-400 truncate hidden lg:inline">
                    {currentTopic.description}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pl-1.5">
                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                  {activeIndex + 1}/{TOPIC_SECTIONS.length}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-indigo-400' : ''}`} />
              </div>
            </button>

            {/* Dropdown Menu (Lista Suspensa Aberta) */}
            {isDropdownOpen && (
              <div 
                className="absolute left-0 right-0 top-full mt-1.5 z-50 p-2 rounded-2xl bg-[#0f1117]/98 backdrop-blur-2xl border border-slate-700/80 shadow-2xl shadow-black/90 animate-fadeIn space-y-1 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
                role="listbox"
              >
                <div className="px-2 py-1 mb-1 text-[9.5px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800/80 flex items-center justify-between">
                  <span>Selecione o Tópico para Acesso Direto:</span>
                  <span>{TOPIC_SECTIONS.length} Seções</span>
                </div>

                {TOPIC_SECTIONS.map((topic, index) => {
                  const Icon = topic.icon;
                  const isSelected = topic.id === activeId;

                  return (
                    <button
                      key={topic.id}
                      id={`topic-option-${topic.id}`}
                      type="button"
                      onClick={() => scrollToSection(topic.id)}
                      className={`w-full flex items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer min-w-0 ${
                        isSelected 
                          ? `${topic.bgActiveColor} ${topic.borderActiveColor} border font-semibold shadow-md` 
                          : 'hover:bg-slate-800/70 text-slate-300 border border-transparent hover:border-slate-700/50'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`p-1.5 rounded-xl ${isSelected ? 'bg-black/40' : 'bg-slate-900'} ${topic.accentColor} shrink-0`}>
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                            <span className={`text-[11.5px] sm:text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                              {topic.label}
                            </span>
                            {topic.badge && (
                              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                                isSelected 
                                  ? 'bg-black/40 text-white border border-white/20' 
                                  : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                              }`}>
                                {topic.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[9.5px] sm:text-[10px] text-slate-400 truncate mt-0.5">
                            {topic.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pl-1">
                        <span className="text-[9.5px] font-mono text-slate-500">
                          #{index + 1}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stepper Navigation Buttons (Anterior / Próximo) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handlePreviousTopic}
              disabled={activeIndex <= 0}
              className="p-1.5 rounded-lg bg-[#12141a] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 disabled:opacity-30 disabled:pointer-events-none transition shadow-sm"
              title="Tópico anterior"
              aria-label="Tópico anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <button
              type="button"
              onClick={handleNextTopic}
              disabled={activeIndex >= TOPIC_SECTIONS.length - 1}
              className="p-1.5 rounded-lg bg-[#12141a] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 disabled:opacity-30 disabled:pointer-events-none transition shadow-sm"
              title="Próximo tópico"
              aria-label="Próximo tópico"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Quick Top Button */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-950 text-slate-400 hover:text-indigo-300 border border-slate-800 hover:border-indigo-700 text-[10.5px] font-mono transition"
              title="Voltar ao início"
              aria-label="Voltar ao início"
            >
              <ArrowUp className="w-3 h-3" />
              <span>{Math.round(scrollProgress)}%</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
