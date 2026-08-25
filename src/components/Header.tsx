import React, { useState, useRef, useEffect } from 'react';
import { 
  BrainCircuit, 
  Search, 
  MessageSquareCode, 
  RefreshCw,
  Flame,
  Bot,
  Zap,
  Activity,
  Smartphone,
  ShieldCheck,
  Menu,
  ChevronDown,
  Check
} from 'lucide-react';
import { TOPIC_SECTIONS } from './TopicNavigationAnchorBar';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenPasteAnalyzer: () => void;
  onOpenPredictionModal: () => void;
  onOpenInstallAndroidModal?: () => void;
  onToggleChat: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  isAutoRefreshActive: boolean;
  onToggleAutoRefresh: () => void;
  lastScanTime: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onOpenPasteAnalyzer,
  onOpenPredictionModal,
  onOpenInstallAndroidModal,
  onToggleChat,
  isRefreshing,
  onRefresh,
  isAutoRefreshActive,
  onToggleAutoRefresh,
  lastScanTime,
}) => {
  const [isTopicsMenuOpen, setIsTopicsMenuOpen] = useState(false);
  const topicsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (topicsMenuRef.current && !topicsMenuRef.current.contains(event.target as Node)) {
        setIsTopicsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      // Offset by header height
      const y = el.getBoundingClientRect().top + window.pageYOffset - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    setIsTopicsMenuOpen(false);
  };

  const scrollToAudit = () => {
    scrollToSection('section-system-audit');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0b]/95 backdrop-blur-md border-b border-slate-800/60 text-white transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-3.5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-4">
          
          {/* Brand Header */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start min-w-0">
            <div className="flex items-baseline gap-2.5 shrink-0">
              <h1 className="text-xl sm:text-2xl font-serif italic text-white tracking-tight flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400 inline shrink-0" />
                <span>Sentinela <span className="text-indigo-400">Cripto</span></span>
              </h1>
              <span className="text-[9.5px] uppercase tracking-[0.18em] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-mono hidden sm:inline-block">
                Alpha Access
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-[10.5px] uppercase tracking-wider font-mono text-slate-400 shrink-0">
              <div className="hidden md:flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <span>428 Fontes</span>
              </div>
              <div className="text-slate-500 text-[10px] hidden sm:block">
                Varredura: <span className="text-slate-300 font-bold">{lastScanTime}</span>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar $BTC, $SOL, Fórum..."
              className="w-full bg-[#12141a] text-slate-200 text-xs rounded-xl pl-8 pr-7 py-2 border border-slate-800/80 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-500 font-sans"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white bg-slate-800 rounded-full px-1.5 py-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Tools & Instant Live Toggle */}
          <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-none justify-start lg:justify-end shrink-0">
            
            {/* Lista Suspensa Nativa para Temas (Acesso Fácil) */}
            <div className="relative shrink-0">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    scrollToSection(e.target.value);
                    e.target.value = ""; // reset back to placeholder
                  }
                }}
                defaultValue=""
                className="appearance-none bg-[#12141a] hover:bg-[#181b24] text-indigo-300 text-[11px] font-bold rounded-xl pl-3 pr-8 py-1.5 border border-indigo-500/30 hover:border-indigo-500/60 focus:border-indigo-400 outline-none transition-all cursor-pointer shadow-sm"
                title="Acesso rápido aos Tópicos (Temas)"
              >
                <option value="" disabled className="text-slate-500">
                  Acesso Rápido (Temas)...
                </option>
                {TOPIC_SECTIONS.map((topic) => (
                  <option key={topic.id} value={topic.id} className="text-slate-200 bg-slate-900">
                    {topic.shortLabel}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 pointer-events-none" />
            </div>

            {/* 24h Audit Shortcut */}
            <button
              type="button"
              onClick={scrollToAudit}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10.5px] font-mono tracking-wide bg-indigo-950/50 hover:bg-indigo-900/60 text-indigo-300 border-indigo-500/40 transition-all cursor-pointer shrink-0"
              title="Ir para Módulo de Auditoria 24h & Auto-Cura"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-bold hidden sm:inline">Auditoria 24h</span>
            </button>

            {/* Live Auto-Update Switch */}
            <button
              onClick={onToggleAutoRefresh}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10.5px] font-mono tracking-wide transition-all cursor-pointer shrink-0 ${
                isAutoRefreshActive
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'bg-[#12141a] text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Alternar Atualização Instantânea Automática (A cada 3 segundos)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAutoRefreshActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
              <span className="font-bold">{isAutoRefreshActive ? 'LIVE 3s' : 'PAUSADO'}</span>
            </button>

            {/* Instant Manual Refresh */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono text-slate-300 bg-[#12141a] hover:bg-slate-800 rounded-xl border border-slate-800 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="Forçar Atualização Instantânea dos Fóruns"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={onOpenPasteAnalyzer}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 bg-[#12141a] hover:bg-slate-800 rounded-xl border border-slate-800 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <MessageSquareCode className="h-3.5 w-3.5 text-indigo-400" />
              <span>Analisar Texto</span>
            </button>

            <button
              onClick={onOpenPredictionModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Previsão IA</span>
            </button>

            {onOpenInstallAndroidModal && (
              <button
                onClick={onOpenInstallAndroidModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                title="Instalar App no celular Android"
              >
                <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                <span>App Android</span>
              </button>
            )}

            <button
              onClick={onToggleChat}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Assistente</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};


