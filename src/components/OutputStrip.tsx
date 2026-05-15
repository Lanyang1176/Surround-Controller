import React from 'react';
import { Output } from '../types';
import { Settings, ChevronDown, Speaker, Power } from 'lucide-react';

interface OutputStripProps {
  output: Output;
  selected: boolean;
  onSelect: (id: string) => void;
  onSettingsClick?: () => void;
  isMuted?: boolean;
  isEditing?: boolean;
  meterLevels?: number[];
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

// Output Themes - 玻璃感版本，高对比度：亮边框 + 暗内填充
const THEMES: Record<string, any> = {
  cyan: {
    indicatorInactive: 'bg-[#0a2a30]/15 shadow-none',
    indicatorActive: 'bg-[#00d4ff] shadow-[0_0_14px_rgba(0,212,255,0.8)]',
    btnInactive: 'bg-gradient-to-b from-[#16171a] to-[#0e0f12] border-[#222326] text-[#404048] shadow-[0_1px_3px_rgba(0,0,0,0.6)]',
    btnActive: 'bg-[#00d4ff] border-[#00a8cc] text-[#001a1f] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_14px_rgba(0,212,255,0.6)]',
    meterFill: 'bg-[#00d4ff]',
    containerActive: 'border-[#00d4ff]/60 shadow-[0_0_24px_rgba(0,212,255,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#00d4ff]/[0.02]',
  },
  yellow: {
    indicatorInactive: 'bg-[#2a2a0a]/15 shadow-none',
    indicatorActive: 'bg-[#ffdc00] shadow-[0_0_14px_rgba(255,220,0,0.8)]',
    btnInactive: 'bg-gradient-to-b from-[#16171a] to-[#0e0f12] border-[#222326] text-[#404048] shadow-[0_1px_3px_rgba(0,0,0,0.6)]',
    btnActive: 'bg-[#ffdc00] border-[#ccb000] text-[#1a1a00] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_14px_rgba(255,220,0,0.6)]',
    meterFill: 'bg-[#ffdc00]',
    containerActive: 'border-[#ffdc00]/60 shadow-[0_0_24px_rgba(255,220,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#ffdc00]/[0.02]',
  },
  orange: {
    indicatorInactive: 'bg-[#2a1a0a]/15 shadow-none',
    indicatorActive: 'bg-[#ff8c32] shadow-[0_0_14px_rgba(255,140,50,0.8)]',
    btnInactive: 'bg-gradient-to-b from-[#16171a] to-[#0e0f12] border-[#222326] text-[#404048] shadow-[0_1px_3px_rgba(0,0,0,0.6)]',
    btnActive: 'bg-[#ff8c32] border-[#cc7028] text-[#1a0f00] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_14px_rgba(255,140,50,0.6)]',
    meterFill: 'bg-[#ff8c32]',
    containerActive: 'border-[#ff8c32]/60 shadow-[0_0_24px_rgba(255,140,50,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#ff8c32]/[0.02]',
  },
  lime: {
    indicatorInactive: 'bg-[#1a2a0a]/15 shadow-none',
    indicatorActive: 'bg-[#b4ff32] shadow-[0_0_14px_rgba(180,255,50,0.8)]',
    btnInactive: 'bg-gradient-to-b from-[#16171a] to-[#0e0f12] border-[#222326] text-[#404048] shadow-[0_1px_3px_rgba(0,0,0,0.6)]',
    btnActive: 'bg-[#b4ff32] border-[#90cc28] text-[#0f1a00] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_14px_rgba(180,255,50,0.6)]',
    meterFill: 'bg-[#b4ff32]',
    containerActive: 'border-[#b4ff32]/60 shadow-[0_0_24px_rgba(180,255,50,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#b4ff32]/[0.02]',
  },
};

export const OutputStrip: React.FC<OutputStripProps> = ({ output, selected, onSelect, onSettingsClick, isMuted, meterLevels: meterLevelsProp }) => {
  const channelCount = getChannelCount(output.format);
  const theme = THEMES[output.color] || THEMES['cyan'];

  const meterLevels = isMuted ? new Array(channelCount).fill(0) : meterLevelsProp ?? new Array(channelCount).fill(0);

  return (
    <div
      className={`
        relative w-full rounded-xl p-1.5 mb-2 transition-all duration-300 ease-out select-none group transform-gpu border backdrop-blur-md
        ${selected
          ? `${theme.containerActive} scale-[1.01] shadow-xl`
          : 'bg-[#06070a]/85 border-[#252830]/70 hover:border-[#353840]/80 hover:bg-[#08090c]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_8px_rgba(0,0,0,0.4)]'}
      `}
      onClick={() => onSelect(output.id)}
    >
      {/* Persistent Color Indicator - MOVED TO RIGHT */}
      <div className={`
        absolute right-[-1px] top-4 bottom-4 w-1.5 rounded-l-md transition-all duration-300 z-10
        ${selected ? theme.indicatorActive : theme.indicatorInactive}
      `}></div>

      {/* --- ROW 1: HEADER (Reversed) --- */}
      <div className="flex items-center justify-between gap-3 mb-2 pr-4 pl-1 pt-2">

        {/* Settings Button (Now First/Left) */}
        <button 
          className="text-[#52525b] hover:text-[#a1a1aa] transition-colors p-1 shrink-0 rounded hover:bg-[#1a1b1f]/50"
          onClick={(e) => {
            e.stopPropagation();
            onSettingsClick?.();
          }}
        >
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

        {/* 4. METER WELL (Now Right) - 玻璃内嵌 */}
        <div className="h-full w-[80px] bg-[#050607]/80 rounded-md border border-[#18191d]/50 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(255,255,255,0.02)] relative overflow-hidden flex items-end px-[2px] pb-[2px] pt-[5px]">
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
