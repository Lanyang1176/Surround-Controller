import React, { useState, useEffect } from 'react';
import { Output } from '../types';
import { Settings, ChevronDown, Speaker, Power } from 'lucide-react';

interface OutputStripProps {
  output: Output;
  selected: boolean;
  onSelect: (id: string) => void;
  isMuted?: boolean;
}

const getChannelCount = (format: string) => {
  switch (format) {
    case '9.1.6': return 16;
    case '7.1.4': return 12;
    case '5.1': return 6;
    case 'Stereo': return 2;
    case 'Mono': return 1;
    default: return 0;
  }
}

// Output Themes - 玻璃态增强版本
const THEMES: Record<string, any> = {
  cyan: {
    indicatorInactive: 'bg-[#0a2a30]/30 shadow-[0_0_6px_rgba(46,184,204,0.04)]',
    indicatorActive: 'bg-[#2eb8cc] shadow-[0_0_10px_rgba(46,184,204,0.6)]',
    btnInactive: 'bg-gradient-to-b from-[#1f2024] to-[#151619] border-[#2a2b30] text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
    btnActive: 'bg-[#2eb8cc] border-[#1a8a9c] text-[#001a1f] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_12px_rgba(46,184,204,0.4)]',
    meterFill: 'bg-[#2eb8cc]',
    containerActive: 'border-[#2eb8cc] shadow-[0_0_20px_rgba(46,184,204,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-b from-[#2eb8cc]/15 to-[#2eb8cc]/5 backdrop-blur-sm',
  },
  yellow: {
    indicatorInactive: 'bg-[#2a2a0a]/30 shadow-[0_0_6px_rgba(212,180,21,0.04)]',
    indicatorActive: 'bg-[#d4b415] shadow-[0_0_10px_rgba(212,180,21,0.6)]',
    btnInactive: 'bg-gradient-to-b from-[#1f2024] to-[#151619] border-[#2a2b30] text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
    btnActive: 'bg-[#d4b415] border-[#a68f10] text-[#1a1a00] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_12px_rgba(212,180,21,0.4)]',
    meterFill: 'bg-[#d4b415]',
    containerActive: 'border-[#d4b415] shadow-[0_0_20px_rgba(212,180,21,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-b from-[#d4b415]/15 to-[#d4b415]/5 backdrop-blur-sm',
  },
  orange: {
    indicatorInactive: 'bg-[#2a1a0a]/30 shadow-[0_0_6px_rgba(212,120,50,0.04)]',
    indicatorActive: 'bg-[#d47832] shadow-[0_0_10px_rgba(212,120,50,0.6)]',
    btnInactive: 'bg-gradient-to-b from-[#1f2024] to-[#151619] border-[#2a2b30] text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
    btnActive: 'bg-[#d47832] border-[#a65e28] text-[#1a0f00] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_12px_rgba(212,120,50,0.4)]',
    meterFill: 'bg-[#d47832]',
    containerActive: 'border-[#d47832] shadow-[0_0_20px_rgba(212,120,50,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-b from-[#d47832]/15 to-[#d47832]/5 backdrop-blur-sm',
  },
  lime: {
    indicatorInactive: 'bg-[#1a2a0a]/30 shadow-[0_0_6px_rgba(140,195,45,0.04)]',
    indicatorActive: 'bg-[#8cc32d] shadow-[0_0_10px_rgba(140,195,45,0.6)]',
    btnInactive: 'bg-gradient-to-b from-[#1f2024] to-[#151619] border-[#2a2b30] text-[#52525b] shadow-[0_1px_2px_rgba(0,0,0,0.4)]',
    btnActive: 'bg-[#8cc32d] border-[#6d9823] text-[#0f1a00] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_12px_rgba(140,195,45,0.4)]',
    meterFill: 'bg-[#8cc32d]',
    containerActive: 'border-[#8cc32d] shadow-[0_0_20px_rgba(140,195,45,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] bg-gradient-to-b from-[#8cc32d]/15 to-[#8cc32d]/5 backdrop-blur-sm',
  },
};

export const OutputStrip: React.FC<OutputStripProps> = ({ output, selected, onSelect, isMuted }) => {
  const channelCount = getChannelCount(output.format);
  const theme = THEMES[output.color] || THEMES['cyan'];

  // Meter Simulation
  const [meterLevels, setMeterLevels] = useState<number[]>([]);
  useEffect(() => {
    // Only animate meters if selected to save resources, or keep them quiet if not active
    if (!selected) {
      setMeterLevels(new Array(channelCount).fill(0));
      return;
    }

    // Initialize
    setMeterLevels(new Array(channelCount).fill(0));

    const interval = setInterval(() => {
      const hasSignal = selected && !isMuted; // Simulate signal when selected AND not muted
      if (hasSignal) {
        setMeterLevels(prev => Array.from({ length: channelCount }).map((_, i) => {
          // Slightly different logic than source to look distinct
          const base = Math.random() * 40 + 40;
          const boost = (Math.random() > 0.8) ? 20 : 0;
          return Math.min(105, base + boost);
        }));
      } else {
        setMeterLevels(new Array(channelCount).fill(0));
      }
    }, 80);
    return () => clearInterval(interval);
  }, [channelCount, selected, isMuted]);

  return (
    <div
      className={`
        relative w-full rounded-xl p-1.5 mb-2 transition-all duration-300 ease-out select-none group transform-gpu border
        ${selected
          ? `${theme.containerActive} scale-[1.01] shadow-lg`
          : 'bg-gradient-to-b from-[#141418]/90 to-[#0f1014]/95 backdrop-blur-sm border-white/[0.06] hover:border-white/[0.1] hover:from-[#18181c]/90 hover:to-[#111216]/95'}
      `}
      onClick={() => onSelect(output.id)}
    >
      {/* 顶部高光线 - 玻璃态效果 */}
      <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent rounded-full"></div>

      {/* Persistent Color Indicator - MOVED TO RIGHT */}
      <div className={`
        absolute right-[-1px] top-4 bottom-4 w-1.5 rounded-l-md transition-all duration-300 z-10
        ${selected ? theme.indicatorActive : theme.indicatorInactive}
      `}></div>

      {/* --- ROW 1: HEADER (Reversed) --- */}
      <div className="flex items-center justify-between gap-3 mb-2 pr-4 pl-1 pt-2">

        {/* Settings Button (Now First/Left) */}
        <button className="text-[#52525b] hover:text-[#a1a1aa] transition-colors p-1 shrink-0 rounded hover:bg-[#1a1b1f]/50">
          <Settings size={14} />
        </button>

        {/* Output Selector Box - Simplified */}
        <div className="flex-1 flex items-center gap-2 overflow-hidden px-1">
          {/* Icon */}
          <div className={`shrink-0 transition-colors ${selected ? 'text-[#d4d4d8]' : 'text-[#52525b]'}`}>
            <Speaker size={15} strokeWidth={2} />
          </div>

          {/* Name */}
          <span className={`text-xs font-bold truncate flex-1 transition-colors ${selected ? 'text-[#e4e4e7]' : 'text-[#71717a]'}`}>
            {output.name}
          </span>
        </div>

        {/* Format (Now Last/Right) */}
        <span className={`text-xs font-bold font-mono tracking-wide min-w-[32px] text-right transition-colors ${selected ? 'text-[#a1a1aa]' : 'text-[#52525b]'}`}>
          {output.format}
        </span>
      </div>

      {/* --- ROW 2: CONTROLS WELL (Reversed) --- */}
      <div className="flex items-start gap-3 pr-4 pl-2 pb-1 h-[60px]">

        {/* 1. SPACER (Replaces Level Label) */}
        <div className="flex-1"></div>

        {/* 2. BUTTONS (Power Only) */}
        <div className="h-full flex flex-col items-center justify-center py-0.5 mr-1">
          {/* Active/Power Button */}
          <div className={`
                h-8 w-11 rounded-[4px] border flex items-center justify-center transition-all duration-300
                ${selected ? theme.btnActive : theme.btnInactive}
            `}>
            <Power size={14} strokeWidth={selected ? 3 : 2} className={selected ? 'animate-pulse-slow' : 'opacity-80'} />
          </div>
        </div>

        {/* 4. METER WELL (Now Right) */}
        <div className="h-full w-[80px] bg-[#08090c]/90 backdrop-blur-[2px] rounded-md border border-[#1a1b1f] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,0,0,0.3)] relative overflow-hidden flex items-end px-[2px] pb-[2px] pt-[5px]">
          {/* Screen Glass Reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent opacity-40 pointer-events-none z-40"></div>
          {/* 顶部内阴影增强 */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-30"></div>
          {/* Dark Scanline Overlay */}
          <div className="absolute inset-0 z-20 pointer-events-none opacity-20"
            style={{ backgroundImage: 'linear-gradient(0deg, #000 50%, transparent 50%)', backgroundSize: '100% 2px' }}>
          </div>
          {/* Meter Bars */}
          <div className="w-full h-full flex items-end gap-[1px]">
            {meterLevels.map((level, i) => {
              const isClipped = level > 98;
              return (
                <div key={i} className="flex-1 h-full bg-[#151619]/40 rounded-[1px] relative flex flex-col-reverse">
                  <div className={`
                                absolute -top-[4px] left-0 right-0 h-[2px] rounded-full transition-colors duration-100 z-30
                                ${isClipped ? 'bg-[#dc2626] shadow-[0_0_6px_#dc2626]' : 'bg-[#2a2b30]'}
                            `}></div>
                  <div
                    className={`w-full rounded-[1px] transition-all duration-75 ease-out ${selected ? theme.meterFill : 'bg-[#3f3f46]'}`}
                    style={{ height: `${Math.min(100, level)}%`, opacity: selected ? 1 : 0.4 }}
                  ></div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};