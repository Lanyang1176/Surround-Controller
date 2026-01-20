import React, { useState, useRef, useEffect } from 'react';

interface KnobProps {
  value: number; // 0 to 100
  onChange?: (val: number) => void;
  size?: number;
  label?: string;
  color?: string;
  min?: number;
  max?: number;
}

export const Knob: React.FC<KnobProps> = ({
  value,
  onChange,
  size = 64,
  label,
  color = '#22d3ee', // cyan-400
  min = -96,
  max = 12
}) => {
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
        {/* Background Ring */}
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible">
          {/* Track */}
          <path
            d="M 20,80 A 42,42 0 1 1 80,80"
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active Value Arc */}
          <path
            d="M 20,80 A 42,42 0 1 1 80,80"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${pathLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            className="transition-all duration-75"
            strokeLinecap="round"
            filter="url(#glow)"
          />
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* The Knob Cap */}
        <div
          className="absolute inset-2 rounded-full hardware-surface border border-zinc-700 flex items-center justify-center shadow-xl"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          {/* Indicator Dot */}
          <div className="absolute top-1 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_white]"></div>
        </div>
      </div>

      {label && <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">{label}</span>}
    </div>
  );
};
