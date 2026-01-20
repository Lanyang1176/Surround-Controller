import React from 'react';

interface MeterProps {
  level: number; // 0 to 100
  peak?: number; // 0 to 100
  label?: string;
  color?: string; // Tailwind bg class or hex
}

export const Meter: React.FC<MeterProps> = ({
  level,
  peak = level,
  label,
  color = 'bg-cyan-400',
}) => {
  const isClipped = peak >= 99;
  const isCritical = peak > 98;

  // Simple scale mapping for demo readability:
  // 0..100%  ->  -60..0 dBFS
  const levelDb = -60 + (Math.min(100, Math.max(0, level)) / 100) * 60;
  const peakDb = -60 + (Math.min(100, Math.max(0, peak)) / 100) * 60;

  // When critical, override the bar color to red and add blinking/shadow
  const barColor = isCritical
    ? 'bg-[#dc2626] shadow-[0_0_12px_rgba(220,38,38,0.5)]'
    : color;

  return (
    <div className="flex flex-col items-center h-full w-full group">
      {/* Clip Indicator (Top LED) */}
      <div className={`w-full h-1 mb-1 rounded-[1px] transition-colors duration-100 ${isClipped ? 'bg-[#dc2626] shadow-[0_0_6px_#dc2626] brightness-150' : 'bg-[#1a0a0a]'}`}></div>

      {/* Meter Track */}
      <div className="flex-1 w-full bg-[#0a0b0e] relative overflow-hidden rounded-[1px]">
        {/* Level Bar */}
        <div
          className={`absolute bottom-0 w-full transition-all duration-75 ease-out ${barColor} ${isCritical ? 'animate-pulse' : ''}`}
          style={{ height: `${Math.min(100, Math.max(0, level))}%` }}
        ></div>

        {/* Peak Line */}
        <div
          className="absolute w-full h-[1px] bg-[#e4e4e7] transition-all duration-300 ease-out z-10 shadow-sm mix-blend-screen"
          style={{ bottom: `${Math.min(100, Math.max(0, peak))}%` }}
        ></div>

        {/* Hover readout */}
        <div className="absolute top-1 left-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
          <div className="w-full px-1 py-0.5 rounded bg-[#0a0b0e]/80 border border-white/[0.08] text-center">
            <span className="text-[9px] font-bold font-mono text-[#d4d4d8] tabular-nums">
              {peakDb > -59.9 ? peakDb.toFixed(0) : '-inf'}
            </span>
            <span className="ml-1 text-[8px] font-bold text-[#71717a]">dBFS</span>
          </div>
        </div>
      </div>

      {/* Label and Color Strip */}
      <div className="w-full flex flex-col items-center gap-0.5 mt-1">
        <span className="text-[9px] font-bold tracking-tight leading-none uppercase text-[#71717a] group-hover:text-[#d4d4d8] transition-colors">
          {label}
        </span>
        {/* Bottom Color Strip */}
        <div className={`w-full h-1 rounded-sm ${color} opacity-70`}></div>
      </div>
    </div>
  );
};