import React, { useState, useCallback, useRef } from 'react';
import { EQ_FREQUENCIES } from '../../types';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

interface GraphicEQProps {
  eq: number[];
  hpf: number;
  lpf: number;
  isMixed: boolean;
  onEQChange: (bandIndex: number, value: number) => void;
  onHPFChange: (value: number) => void;
  onLPFChange: (value: number) => void;
  themeColor: string;
  selectedCount: number;
}

// Format frequency for display
const formatFreq = (freq: number): string => {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(freq >= 10000 ? 0 : 1)}k`;
  }
  return String(freq);
};

// ═══════════════════════════════════════════════════════════════════════
// EQ Slider Component
// ═══════════════════════════════════════════════════════════════════════

interface EQSliderProps {
  value: number;
  frequency: number;
  onChange: (value: number) => void;
  themeColor: string;
  isMixed?: boolean;
}

const EQSlider: React.FC<EQSliderProps> = ({ value, frequency, onChange, themeColor, isMixed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const updateValue = (clientY: number) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = 1 - (clientY - rect.top) / rect.height;
      const newValue = Math.round((percentage * 24 - 12) * 10) / 10; // -12 to +12
      onChange(Math.max(-12, Math.min(12, newValue)));
    };

    updateValue(e.clientY);

    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onChange]);

  // Double-click to reset
  const handleDoubleClick = useCallback(() => {
    onChange(0);
  }, [onChange]);

  // Calculate thumb position
  const thumbPosition = ((value + 12) / 24) * 100;

  return (
    <div className="flex flex-col items-center gap-1 group">
      {/* Slider track */}
      <div
        ref={sliderRef}
        className="relative w-6 h-32 bg-zinc-900 rounded-lg cursor-pointer overflow-hidden border border-zinc-800"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => !isDragging && setShowTooltip(false)}
      >
        {/* Center line (0 dB) */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-zinc-600"></div>

        {/* Fill */}
        <div
          className="absolute left-1 right-1 rounded transition-all duration-75"
          style={{
            backgroundColor: isMixed ? '#6b7280' : themeColor,
            opacity: isMixed ? 0.5 : 0.6,
            bottom: value >= 0 ? '50%' : `${(1 - (value + 12) / 24) * 100}%`,
            top: value >= 0 ? `${(1 - (value + 12) / 24) * 100}%` : '50%',
          }}
        />

        {/* Thumb */}
        <div
          className="absolute left-0.5 right-0.5 h-2 rounded transition-all duration-75"
          style={{
            bottom: `calc(${thumbPosition}% - 4px)`,
            backgroundColor: isDragging ? '#fff' : themeColor,
            boxShadow: isDragging 
              ? `0 0 10px ${themeColor}, 0 0 20px ${themeColor}50`
              : `0 0 6px ${themeColor}80`,
          }}
        />

        {/* Tooltip */}
        {(showTooltip || isDragging) && (
          <div 
            className="absolute -right-12 w-10 text-center bg-zinc-800 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg z-10 pointer-events-none"
            style={{ bottom: `calc(${thumbPosition}% - 10px)` }}
          >
            {value > 0 ? '+' : ''}{value.toFixed(1)}
          </div>
        )}
      </div>

      {/* Frequency label */}
      <span className="text-[8px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">
        {formatFreq(frequency)}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Filter Slider Component (HPF/LPF)
// ═══════════════════════════════════════════════════════════════════════

interface FilterSliderProps {
  value: number;
  type: 'HPF' | 'LPF';
  onChange: (value: number) => void;
  themeColor: string;
}

const FilterSlider: React.FC<FilterSliderProps> = ({ value, type, onChange, themeColor }) => {
  const isEnabled = value > 0;
  const minFreq = type === 'HPF' ? 20 : 1000;
  const maxFreq = type === 'HPF' ? 500 : 20000;

  // Convert value to log scale for display
  const freqToPosition = (freq: number) => {
    if (freq <= 0) return 0;
    const minLog = Math.log10(minFreq);
    const maxLog = Math.log10(maxFreq);
    return ((Math.log10(freq) - minLog) / (maxLog - minLog)) * 100;
  };

  const positionToFreq = (pos: number) => {
    const minLog = Math.log10(minFreq);
    const maxLog = Math.log10(maxFreq);
    return Math.pow(10, minLog + (pos / 100) * (maxLog - minLog));
  };

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = Number(e.target.value);
    if (pos <= 2) {
      onChange(0); // OFF
    } else {
      onChange(Math.round(positionToFreq(pos)));
    }
  }, [onChange]);

  const toggleFilter = useCallback(() => {
    if (isEnabled) {
      onChange(0);
    } else {
      onChange(type === 'HPF' ? 80 : 8000);
    }
  }, [isEnabled, type, onChange]);

  return (
    <div className="flex flex-col items-center gap-2 w-14">
      {/* Label */}
      <button
        onClick={toggleFilter}
        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all ${
          isEnabled 
            ? 'text-white' 
            : 'text-zinc-600 hover:text-zinc-400'
        }`}
        style={{
          backgroundColor: isEnabled ? `${themeColor}40` : 'transparent',
          color: isEnabled ? themeColor : undefined,
        }}
      >
        {type}
      </button>

      {/* Vertical slider container */}
      <div className="relative h-32 w-8 flex items-center justify-center">
        {/* Track background */}
        <div className={`absolute w-2 h-full rounded-full ${isEnabled ? 'bg-zinc-800' : 'bg-zinc-900'}`}>
          {isEnabled && (
            <div
              className="absolute bottom-0 w-full rounded-full transition-all"
              style={{
                height: `${freqToPosition(value)}%`,
                backgroundColor: `${themeColor}60`,
              }}
            />
          )}
        </div>

        {/* Slider input */}
        <input
          type="range"
          min={0}
          max={100}
          value={isEnabled ? freqToPosition(value) : 0}
          onChange={handleSliderChange}
          className="absolute h-full w-8 opacity-0 cursor-pointer"
          style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
        />

        {/* Thumb indicator */}
        {isEnabled && (
          <div
            className="absolute w-4 h-2 rounded-sm pointer-events-none transition-all"
            style={{
              bottom: `calc(${freqToPosition(value)}% - 4px)`,
              backgroundColor: themeColor,
              boxShadow: `0 0 8px ${themeColor}80`,
            }}
          />
        )}
      </div>

      {/* Value display */}
      <span className={`text-[9px] font-mono ${isEnabled ? 'text-zinc-300' : 'text-zinc-600'}`}>
        {isEnabled ? formatFreq(value) : 'OFF'}
      </span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// Main GraphicEQ Component
// ═══════════════════════════════════════════════════════════════════════

export const GraphicEQ: React.FC<GraphicEQProps> = ({
  eq,
  hpf,
  lpf,
  isMixed,
  onEQChange,
  onHPFChange,
  onLPFChange,
  themeColor,
  selectedCount,
}) => {
  // Reset all bands
  const handleResetAll = useCallback(() => {
    eq.forEach((_, idx) => onEQChange(idx, 0));
    onHPFChange(0);
    onLPFChange(0);
  }, [eq, onEQChange, onHPFChange, onLPFChange]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">16-Band Graphic EQ</h3>
          {selectedCount > 1 && (
            <span className="text-[10px] text-zinc-500 font-mono">
              ({selectedCount} channels{isMixed ? ' - mixed values' : ''})
            </span>
          )}
        </div>
        
        <button
          onClick={handleResetAll}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:text-zinc-300 hover:border-zinc-600 transition-all"
        >
          Flat
        </button>
      </div>

      {/* EQ Visualization */}
      <div className="flex-1 bg-zinc-900/30 rounded-xl border border-zinc-800/50 p-4 relative overflow-hidden">
        {/* dB Scale (left) */}
        <div className="absolute left-2 top-4 bottom-12 flex flex-col justify-between text-[8px] font-mono text-zinc-600">
          <span>+12</span>
          <span>+6</span>
          <span className="text-zinc-500">0</span>
          <span>-6</span>
          <span>-12</span>
        </div>

        {/* Horizontal grid lines */}
        <div className="absolute left-10 right-10 top-4 bottom-12 pointer-events-none">
          {[0, 25, 50, 75, 100].map((pct) => (
            <div
              key={pct}
              className={`absolute left-0 right-0 h-px ${pct === 50 ? 'bg-zinc-600' : 'bg-zinc-800'}`}
              style={{ top: `${pct}%` }}
            />
          ))}
        </div>

        {/* EQ Sliders Container */}
        <div className="h-full flex items-end justify-center gap-1 pl-8 pr-2 pb-2">
          {/* HPF */}
          <FilterSlider
            value={hpf}
            type="HPF"
            onChange={onHPFChange}
            themeColor={themeColor}
          />

          {/* Separator */}
          <div className="w-px h-36 bg-zinc-700/50 mx-1"></div>

          {/* 16 EQ Bands */}
          {EQ_FREQUENCIES.map((freq, idx) => (
            <EQSlider
              key={freq}
              value={eq[idx] || 0}
              frequency={freq}
              onChange={(value) => onEQChange(idx, value)}
              themeColor={themeColor}
              isMixed={isMixed}
            />
          ))}

          {/* Separator */}
          <div className="w-px h-36 bg-zinc-700/50 mx-1"></div>

          {/* LPF */}
          <FilterSlider
            value={lpf}
            type="LPF"
            onChange={onLPFChange}
            themeColor={themeColor}
          />
        </div>

        {/* Mixed indicator overlay */}
        {isMixed && (
          <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-400 text-[9px] font-bold px-2 py-1 rounded border border-yellow-500/30">
            Mixed Values
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-2 text-[9px] text-zinc-600 text-center">
        Drag sliders to adjust • Double-click to reset • HPF/LPF click label to toggle
      </div>
    </div>
  );
};

export default GraphicEQ;
