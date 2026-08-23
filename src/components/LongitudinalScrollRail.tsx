import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TOPIC_SECTIONS } from './TopicNavigationAnchorBar';
import { ArrowUp, ArrowDown } from 'lucide-react';

export const LongitudinalScrollRail: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [activeSectionId, setActiveSectionId] = useState<string>(TOPIC_SECTIONS[0].id);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [sectionOffsets, setSectionOffsets] = useState<{ id: string; label: string; pct: number }[]>([]);

  const railRef = useRef<HTMLDivElement>(null);

  // Calculate section positions as percentage of total page height
  const updateSectionPositions = useCallback(() => {
    const totalScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (totalScroll <= 0) return;

    const currentProgress = (window.scrollY / totalScroll) * 100;
    setScrollProgress(Math.min(100, Math.max(0, currentProgress)));

    const headerOffset = 180;
    const scrollPosition = window.scrollY + headerOffset;

    let currentActive = TOPIC_SECTIONS[0].id;
    for (let i = TOPIC_SECTIONS.length - 1; i >= 0; i--) {
      const section = document.getElementById(TOPIC_SECTIONS[i].id);
      if (section && scrollPosition >= section.offsetTop) {
        currentActive = TOPIC_SECTIONS[i].id;
        break;
      }
    }
    setActiveSectionId(currentActive);

    // Compute relative percentage marker for each section
    const offsets = TOPIC_SECTIONS.map((topic) => {
      const el = document.getElementById(topic.id);
      if (el) {
        const top = Math.max(0, el.offsetTop - headerOffset);
        const pct = Math.min(100, Math.max(0, (top / totalScroll) * 100));
        return { id: topic.id, label: topic.shortLabel, pct };
      }
      return { id: topic.id, label: topic.shortLabel, pct: 0 };
    });
    setSectionOffsets(offsets);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', updateSectionPositions, { passive: true });
    window.addEventListener('resize', updateSectionPositions);
    updateSectionPositions();

    const timer = setTimeout(updateSectionPositions, 500);

    return () => {
      window.removeEventListener('scroll', updateSectionPositions);
      window.removeEventListener('resize', updateSectionPositions);
      clearTimeout(timer);
    };
  }, [updateSectionPositions]);

  // Click on rail track to scroll
  const handleRailClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!railRef.current) return;
    const rect = railRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const clickRatio = Math.max(0, Math.min(1, clickY / rect.height));

    const totalScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    window.scrollTo({
      top: clickRatio * totalScroll,
      behavior: 'smooth'
    });
  };

  // Dragging support on the longitudinal bar
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!railRef.current) return;
      const rect = railRef.current.getBoundingClientRect();
      const clientY = moveEvent.clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, clientY / rect.height));
      const totalScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      window.scrollTo({
        top: ratio * totalScroll,
        behavior: 'auto'
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const scrollToSection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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

  const currentTopic = TOPIC_SECTIONS.find(t => t.id === activeSectionId) || TOPIC_SECTIONS[0];
  const CurrentIcon = currentTopic.icon;

  return (
    <aside 
      id="longitudinal-scrollbar-rail"
      aria-label="Barra de Rolagem Longitudinal"
      className={`fixed right-1.5 top-28 bottom-20 z-40 flex items-center select-none transition-all duration-300 ${
        isHovered || isDragging ? 'w-14' : 'w-7'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsHovered(false);
      }}
    >
      {/* Container Track */}
      <div 
        ref={railRef}
        onClick={handleRailClick}
        className={`relative h-full w-full flex flex-col items-center justify-between py-2 rounded-full cursor-pointer transition-all duration-300 ${
          isHovered || isDragging 
            ? 'bg-[#12141a]/95 border-2 border-indigo-500/70 shadow-2xl shadow-indigo-950/80 backdrop-blur-xl' 
            : 'bg-[#0f1117]/85 border border-slate-700/80 shadow-lg shadow-black/60 backdrop-blur-md hover:border-slate-500'
        }`}
      >
        {/* Top Quick Jump Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-indigo-600/50 transition shrink-0 mb-1 z-10"
          title="Rolar para o topo"
        >
          <ArrowUp className="w-3 h-3" />
        </button>

        {/* Central Vertical Track Line */}
        <div className="relative flex-1 w-full flex justify-center items-stretch my-1">
          {/* Background Track Line */}
          <div className="w-1.5 h-full bg-slate-800 rounded-full overflow-hidden relative">
            {/* Filled Progress Gradient along the track */}
            <div 
              className="w-full bg-gradient-to-b from-cyan-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-75 ease-out"
              style={{ height: `${scrollProgress}%` }}
            />
          </div>

          {/* Section Markers / Ticks */}
          {sectionOffsets.map((section) => {
            const isMarkerActive = activeSectionId === section.id;
            return (
              <div
                key={section.id}
                style={{ top: `${section.pct}%` }}
                onClick={(e) => scrollToSection(section.id, e)}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10"
              >
                {/* Marker Pip */}
                <div 
                  className={`transition-all duration-200 rounded-full ${
                    isMarkerActive 
                      ? 'w-3 h-3 bg-cyan-400 border-2 border-slate-900 shadow-md shadow-cyan-400/80 scale-125' 
                      : 'w-2 h-2 bg-slate-600 border border-slate-900 group-hover:bg-indigo-400 group-hover:scale-110'
                  }`} 
                />

                {/* Section Tooltip on Hover */}
                {(isHovered || hoveredSection === section.id) && (
                  <div 
                    className={`absolute right-6 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap pointer-events-none transition-all shadow-xl ${
                      isMarkerActive
                        ? 'bg-indigo-950 text-cyan-200 border border-indigo-500 font-bold'
                        : 'bg-[#181b24] text-slate-300 border border-slate-700 opacity-90'
                    }`}
                  >
                    {section.label}
                  </div>
                )}
              </div>
            );
          })}

          {/* Draggable Active Thumb Handle */}
          <div
            style={{ top: `${scrollProgress}%` }}
            onMouseDown={handleMouseDown}
            className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 cursor-grab active:cursor-grabbing transition-transform ${
              isDragging ? 'scale-125' : 'hover:scale-115'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-400 border-2 border-white shadow-lg shadow-cyan-500/50 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>

            {/* Float Readout Badge Beside Thumb */}
            <div 
              className={`absolute right-7 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0a0c10] text-cyan-300 border border-cyan-500/50 text-[10px] font-mono font-bold shadow-xl whitespace-nowrap transition-opacity ${
                isHovered || isDragging ? 'opacity-100' : 'opacity-0 sm:opacity-75'
              }`}
            >
              <CurrentIcon className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>{Math.round(scrollProgress)}%</span>
            </div>
          </div>
        </div>

        {/* Bottom Quick Jump Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.scrollTo({ 
              top: document.documentElement.scrollHeight, 
              behavior: 'smooth' 
            });
          }}
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-indigo-600/50 transition shrink-0 mt-1 z-10"
          title="Rolar para o final da página"
        >
          <ArrowDown className="w-3 h-3" />
        </button>
      </div>
    </aside>
  );
};
