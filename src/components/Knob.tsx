import React, { useState, useRef, useEffect } from 'react';

interface KnobProps {
  value: number; // 0 to 100
  onChange?: (val: number) => void;
  size?: number;
  label?: string;
  color?: string;
  min?: number;
  max?: number;
  inactive?: boolean; // 非激活状态：暗色、无发光
}

export const Knob: React.FC<KnobProps> = ({
  value,
  onChange,
  size = 64,
  label,
  color = '#22d3ee', // cyan-400
  min = -96,
  max = 12,
  inactive = false
}) => {
  // 非激活状态使用暗色
  const displayColor = inactive ? '#3f3f46' : color;
  // Visual calculation
  const percentage = Math.min(100, Math.max(0, value));

  // Angle for Knob Cap (CSS Rotation where 0 is Top)
  // Start at Bottom Left (approx 225deg) -> End at Bottom Right (approx 135deg / 495deg)
  const startAngle = 225;
  const endAngle = 495;
  const angle = startAngle + (percentage / 100) * (endAngle - startAngle);

  // Interaction handling (simplified vertical drag)
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [startVal, setStartVal] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartY(e.clientY);
    setStartVal(value);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !onChange) return;
      const deltaY = dragStartY - e.clientY;
      const sensitivity = 0.5;
      const newValue = Math.min(100, Math.max(0, startVal + deltaY * sensitivity));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isDragging) {
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto'; // Ensure cleanup if component unmounts while dragging
    };
  }, [isDragging, dragStartY, startVal, onChange]);

  // SVG Maths
  const radius = 42; // Matched to Path A 42,42
  const circumference = 2 * Math.PI * radius;
  // Arc is 270 degrees (3/4 of circle)
  const pathLength = circumference * 0.75;
  const dashOffset = pathLength * (1 - percentage / 100);

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <div
        ref={knobRef}
        className="relative cursor-ns-resize group"
        style={{ width: size, height: size }}
        onMouseDown={handleMouseDown}
      >
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible absolute inset-0 mix-blend-screen pointer-events-none">
          {/* Base Track */}
          <path
            d="M 20,80 A 42,42 0 1 1 80,80"
            fill="none"
            stroke="#111216"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Inner Track Edge */}
          <path
            d="M 20,80 A 42,42 0 1 1 80,80"
            fill="none"
            stroke="#09090b"
            strokeWidth="2"
            strokeLinecap="round"
            className="translate-y-[1px]"
          />

          {/* Active Value Arc Base */}
          <path
            d="M 20,80 A 42,42 0 1 1 80,80"
            fill="none"
            stroke={displayColor}
            strokeWidth="5"
            strokeDasharray={`${pathLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            className="transition-all duration-75"
            strokeLinecap="round"
            filter={inactive ? undefined : "url(#glow)"}
            opacity={inactive ? 0.3 : 1}
          />

          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* The Knob Cap Structure - Natural & Clean */}
        <div
          className="absolute inset-[12%] rounded-full shadow-[0_12px_24px_-6px_rgba(0,0,0,0.8),0_4px_8px_-2px_rgba(0,0,0,0.5)] bg-gradient-to-b from-[#1f2025] to-[#0a0b0e] p-[1px]"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {/* Main Cap Surface */}
          <div className="absolute inset-[1px] rounded-full bg-[#0f1014] shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">

            {/* Center Indentation */}
            <div className="absolute inset-[22%] rounded-full bg-gradient-to-b from-[#08090c] to-[#111216] shadow-[inset_0_3px_6px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.03)] border border-black/40"></div>

            {/* Indicator Dot */}
            <div
              className="absolute top-[6%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: inactive ? '#3f3f46' : '#ffffff',
                boxShadow: inactive
                  ? 'inset 0 1px 2px rgba(0,0,0,0.8)'
                  : `0 0 10px ${displayColor}, 0 0 3px #ffffff`
              }}
            ></div>
          </div>
        </div>
      </div>

      {label && <span className="text-[10px] uppercase font-bold text-[#52525b] tracking-wider mt-2">{label}</span>}
    </div>
  );
};
