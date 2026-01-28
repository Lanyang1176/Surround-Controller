import React, { useState, useCallback } from 'react';
import { OutputChannel, delayConvert } from '../../types';
import { ChevronDown, RotateCcw } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

interface ChannelRoutingProps {
  channels: OutputChannel[];
  selectedSpeakers: string[];
  onChannelUpdate: (channelId: number, updates: Partial<OutputChannel>) => void;
  onSpeakerSelect: (speakerId: string, isCtrlPressed: boolean) => void;
  onDeselect?: () => void;
  themeColor: string;
  name: string;
  onNameChange: (name: string) => void;
}

// Mock output ports
const MOCK_OUTPUT_PORTS = Array.from({ length: 32 }, (_, i) => `Analog Out ${i + 1}`);

// 扬声器颜色分组
const getSpeakerColorClass = (speaker: string): string => {
  if (['L', 'R', 'C'].includes(speaker)) return 'text-rose-300 border-rose-400/40 bg-rose-500/15 shadow-[0_0_10px_rgba(251,113,133,0.3)]';
  if (speaker === 'LFE') return 'text-purple-300 border-purple-400/40 bg-purple-500/15 shadow-[0_0_10px_rgba(192,132,252,0.3)]';
  if (['Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'].includes(speaker)) return 'text-sky-300 border-sky-400/40 bg-sky-500/15 shadow-[0_0_10px_rgba(56,189,248,0.3)] border-dashed';
  return 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15 shadow-[0_0_10px_rgba(52,211,153,0.3)]';
};

const getChannelBorderColor = (speaker: string): string => {
  if (['L', 'R', 'C'].includes(speaker)) return 'border-l-rose-400';
  if (speaker === 'LFE') return 'border-l-purple-400';
  if (['Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'].includes(speaker)) return 'border-l-sky-400';
  return 'border-l-emerald-400';
};

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

export const ChannelRouting: React.FC<ChannelRoutingProps> = ({
  channels,
  selectedSpeakers,
  onChannelUpdate,
  onSpeakerSelect,
  onDeselect,
  themeColor,
  name,
  onNameChange,
}) => {
  const [globalDelayUnit, setGlobalDelayUnit] = useState<'ms' | 'm' | 'cm'>('ms');

  // Drag-to-toggle State
  const [dragState, setDragState] = useState<{
    active: boolean;
    type: 'SOLO' | 'MUTE' | null;
    value: boolean; // The target value to apply (e.g. true for turning ON, false for turning OFF)
  }>({ active: false, type: null, value: false });

  // Clear drag state on global mouse up
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      setDragState({ active: false, type: null, value: false });
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Format delay value for display
  const formatDelay = useCallback((ms: number, unit: 'ms' | 'm' | 'cm'): string => {
    switch (unit) {
      case 'm':
        return delayConvert.msToM(ms).toFixed(2);
      case 'cm':
        return delayConvert.msToCm(ms).toFixed(1);
      default:
        return ms.toFixed(1);
    }
  }, []);

  // Parse delay input
  const parseDelay = useCallback((value: string, unit: 'ms' | 'm' | 'cm'): number => {
    const num = parseFloat(value) || 0;
    switch (unit) {
      case 'm':
        return delayConvert.mToMs(num);
      case 'cm':
        return delayConvert.cmToMs(num);
      default:
        return num;
    }
  }, []);

  // Handle start of drag toggle
  const handleToggleStart = (type: 'SOLO' | 'MUTE', channelId: number, currentValue: boolean) => {
    const newValue = !currentValue;
    setDragState({ active: true, type, value: newValue });

    // Apply immediate change to the starting channel
    onChannelUpdate(channelId, { [type === 'SOLO' ? 'solo' : 'muted']: newValue });

    // If turning ON solo/mute, we might need to handle mutual exclusivity logic
    if (newValue) {
      if (type === 'SOLO') onChannelUpdate(channelId, { solo: true, muted: false });
      if (type === 'MUTE') onChannelUpdate(channelId, { muted: true, solo: false });
    }
  };

  // Handle drag enter (painting)
  const handleToggleEnter = (type: 'SOLO' | 'MUTE', channelId: number) => {
    if (dragState.active && dragState.type === type) {
      // Apply the target value
      if (dragState.value) {
        // Turning ON
        if (type === 'SOLO') onChannelUpdate(channelId, { solo: true, muted: false });
        if (type === 'MUTE') onChannelUpdate(channelId, { muted: true, solo: false });
      } else {
        // Turning OFF
        onChannelUpdate(channelId, { [type === 'SOLO' ? 'solo' : 'muted']: false });
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Sub-Header / Toolbar */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/20 flex items-center justify-between shrink-0">
        {/* Output Name Input */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Output Name</label>
          <input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="bg-zinc-900/60 border border-zinc-700/50 rounded-lg px-4 py-2 text-base font-bold text-white focus:border-opacity-70 focus:ring-2 focus:ring-opacity-20 outline-none w-48 shadow-inner transition-all placeholder-zinc-600"
            style={{
              borderColor: `${themeColor}50`,
              // @ts-ignore
              '--tw-ring-color': `${themeColor}30`
            }}
            placeholder="Enter output name..."
          />
        </div>

        {/* Delay Unit Selector */}
        <div className="flex items-center gap-2">
          <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Delay Unit</label>
          <div className="flex bg-zinc-900/60 rounded-lg border border-zinc-700/50 p-0.5">
            {(['ms', 'm', 'cm'] as const).map(unit => (
              <button
                key={unit}
                onClick={() => setGlobalDelayUnit(unit)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${globalDelayUnit === unit
                  ? 'text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                style={{
                  backgroundColor: globalDelayUnit === unit ? themeColor : 'transparent'
                }}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Table Header */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[36px_50px_1fr_70px_80px_32px_32px_56px] gap-1 px-4 py-2.5 bg-zinc-900/80 text-[9px] font-semibold text-zinc-400 uppercase tracking-[0.12em] border-b border-zinc-700/50 shrink-0">
        <div className="text-center">#</div>
        <div className="text-center">Spkr</div>
        <div>Output</div>
        <div className="text-center">Trim</div>
        <div className="text-center">Delay</div>
        <div className="text-center">⌀</div>
        <div className="text-center">PN</div>
        <div className="text-center">S / M</div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Channel Rows */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto custom-scrollbar"
        onClick={(e) => {
          if (e.target === e.currentTarget && onDeselect) {
            onDeselect();
          }
        }}
      >
        {channels.map((ch, idx) => {
          const isSelected = selectedSpeakers.includes(ch.speaker);
          const isEven = idx % 2 === 0;
          const speakerColorClass = getSpeakerColorClass(ch.speaker);

          return (
            <div
              key={ch.id}
              className={`
                grid grid-cols-[36px_50px_1fr_70px_80px_32px_32px_56px] gap-1 px-4 py-2 
                border-b border-zinc-800/40 items-center 
                transition-all duration-150 group cursor-pointer
                ${isSelected ? `bg-white/5 border-l-2 ${getChannelBorderColor(ch.speaker)} pl-[14px]` : 'hover:bg-white/[0.03]'}
                ${!isSelected && isEven ? 'bg-zinc-900/20' : ''}
              `}
              onClick={(e) => onSpeakerSelect(ch.speaker, e.ctrlKey || e.metaKey)}
            >
              {/* Index */}
              <div className="text-center text-zinc-500 font-mono text-[11px] font-medium">
                {idx + 1}
              </div>

              {/* Speaker Label */}
              <div className="flex justify-center">
                <div className={`
                  w-10 h-5 flex items-center justify-center rounded border
                  text-[10px] font-bold tracking-wide transition-all
                  ${speakerColorClass}
                  ${isSelected ? 'scale-105 shadow-lg brightness-110' : ''}
                `}>
                  {ch.speaker}
                </div>
              </div>

              {/* Output Port Selector */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <select
                  value={ch.outputPort}
                  onChange={(e) => onChannelUpdate(ch.id, { outputPort: e.target.value })}
                  className="w-full bg-zinc-900/60 border border-zinc-700/50 rounded-md px-2 py-1.5 text-[11px] text-zinc-300 focus:border-zinc-500 outline-none appearance-none cursor-pointer hover:border-zinc-600 transition-all truncate pr-6"
                >
                  {MOCK_OUTPUT_PORTS.map(port => (
                    <option key={port} value={port}>{port}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              </div>

              {/* Trim */}
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  value={ch.trim}
                  onChange={(e) => onChannelUpdate(ch.id, { trim: parseFloat(e.target.value) || 0 })}
                  step={0.1}
                  className="w-14 bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1 text-[11px] text-center font-mono text-zinc-300 focus:border-zinc-500 outline-none"
                />
              </div>

              {/* Delay */}
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number"
                  value={formatDelay(ch.delay, globalDelayUnit)}
                  onChange={(e) => onChannelUpdate(ch.id, { delay: parseDelay(e.target.value, globalDelayUnit) })}
                  step={globalDelayUnit === 'ms' ? 0.1 : globalDelayUnit === 'm' ? 0.01 : 1}
                  className="w-16 bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1 text-[11px] text-center font-mono text-zinc-300 focus:border-zinc-500 outline-none"
                />
              </div>

              {/* Phase Invert */}
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onChannelUpdate(ch.id, { phase: !ch.phase })}
                  className={`
                    w-6 h-6 rounded flex items-center justify-center font-serif text-[13px] font-bold transition-all border
                    ${ch.phase
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.25)]'
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/30'}
                  `}
                  title="Phase Invert"
                >
                  Ø
                </button>
              </div>

              {/* Pink Noise Send */}
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onChannelUpdate(ch.id, { pinkNoise: !ch.pinkNoise })}
                  className={`
                    w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all border
                    ${ch.pinkNoise
                      ? 'bg-pink-500/20 border-pink-500/50 text-pink-300 shadow-[0_0_8px_rgba(236,72,153,0.25)]'
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/30'}
                  `}
                  title="Pink Noise Send"
                >
                  ♪
                </button>
              </div>

              {/* Solo / Mute */}
              <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent text selection
                    handleToggleStart('SOLO', ch.id, ch.solo);
                  }}
                  onMouseEnter={() => handleToggleEnter('SOLO', ch.id)}
                  className={`
                    w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all border
                    ${ch.solo
                      ? 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.25)]'
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10 hover:border-yellow-400/30'}
                  `}
                >
                  S
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleToggleStart('MUTE', ch.id, ch.muted);
                  }}
                  onMouseEnter={() => handleToggleEnter('MUTE', ch.id)}
                  className={`
                    w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all border
                    ${ch.muted
                      ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.25)]'
                      : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30'}
                  `}
                >
                  M
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChannelRouting;
