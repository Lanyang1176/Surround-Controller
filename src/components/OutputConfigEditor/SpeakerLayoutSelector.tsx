import React, { useState, useCallback, useMemo } from 'react';
import { OutputChannel } from '../../types';
import { Copy, Check } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

interface SpeakerLayoutSelectorProps {
  channels: OutputChannel[];
  selectedSpeakers: string[];
  onSpeakerSelect: (speakerId: string, isCtrlPressed: boolean) => void;
  onDeselect?: () => void;
  onCopyEQ: (sourceId: string, targetIds: string[]) => void;
  multiSelectMode: boolean;
  onMultiSelectModeChange: (enabled: boolean) => void;
  themeColor: string;
  format: string;
}

// Speaker positions (normalized -1 to 1)
const SPEAKER_POSITIONS: Record<string, { x: number; y: number; z: number; label: string }> = {
  // Front Row
  'L': { x: -0.45, y: -0.7, z: 0, label: 'L' },
  'R': { x: 0.45, y: -0.7, z: 0, label: 'R' },
  'C': { x: 0, y: -0.75, z: 0, label: 'C' },
  // LFE
  'LFE': { x: 0, y: -0.4, z: 0, label: 'LFE' },
  // Wides
  'Lw': { x: -0.85, y: -0.25, z: 0, label: 'Lw' },
  'Rw': { x: 0.85, y: -0.25, z: 0, label: 'Rw' },
  // Side Surrounds
  'Ls': { x: -0.9, y: 0.1, z: 0, label: 'Ls' },
  'Rs': { x: 0.9, y: 0.1, z: 0, label: 'Rs' },
  // Rear Surrounds
  'Lrs': { x: -0.6, y: 0.65, z: 0, label: 'Lrs' },
  'Rrs': { x: 0.6, y: 0.65, z: 0, label: 'Rrs' },
  // Top Fronts
  'Ltf': { x: -0.25, y: -0.35, z: 1, label: 'Ltf' },
  'Rtf': { x: 0.25, y: -0.35, z: 1, label: 'Rtf' },
  // Top Mids
  'Ltm': { x: -0.25, y: 0.1, z: 1, label: 'Ltm' },
  'Rtm': { x: 0.25, y: 0.1, z: 1, label: 'Rtm' },
  // Top Rears
  'Ltr': { x: -0.25, y: 0.5, z: 1, label: 'Ltr' },
  'Rtr': { x: 0.25, y: 0.5, z: 1, label: 'Rtr' },
};

// Speaker color groups
const getSpeakerColors = (speaker: string) => {
  if (['L', 'R', 'C'].includes(speaker)) {
    return {
      bg: 'bg-rose-500/20',
      border: 'border-rose-400/50',
      text: 'text-rose-300',
      glow: 'rgba(251, 113, 133, 0.4)',
    };
  }
  if (speaker === 'LFE') {
    return {
      bg: 'bg-purple-500/20',
      border: 'border-purple-400/50',
      text: 'text-purple-300',
      glow: 'rgba(192, 132, 252, 0.4)',
    };
  }
  if (['Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'].includes(speaker)) {
    return {
      bg: 'bg-sky-500/20',
      border: 'border-sky-400/50',
      text: 'text-sky-300',
      glow: 'rgba(56, 189, 248, 0.4)',
    };
  }
  return {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-400/50',
    text: 'text-emerald-300',
    glow: 'rgba(52, 211, 153, 0.4)',
  };
};

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

export const SpeakerLayoutSelector: React.FC<SpeakerLayoutSelectorProps> = ({
  channels,
  selectedSpeakers,
  onSpeakerSelect,
  onDeselect,
  onCopyEQ,
  multiSelectMode,
  onMultiSelectModeChange,
  themeColor,
  format,
}) => {
  // Drag state for EQ copy
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Get speakers for current format
  const visibleSpeakers = useMemo(() => {
    return channels.map(ch => ch.speaker);
  }, [channels]);

  const isAnySolo = useMemo(() => channels.some(ch => ch.solo), [channels]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, speakerId: string) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', speakerId);
    setDragSource(speakerId);
    setIsDragging(true);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent, speakerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (speakerId !== dragSource) {
      setDragOverTarget(speakerId);
    }
  }, [dragSource]);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverTarget(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');

    if (!sourceId || sourceId === targetId) {
      setDragSource(null);
      setIsDragging(false);
      setDragOverTarget(null);
      return;
    }

    // Determine targets
    let targets: string[];
    if (selectedSpeakers.includes(targetId) && selectedSpeakers.length > 1) {
      // Copy to all selected (except source)
      targets = selectedSpeakers.filter(id => id !== sourceId);
    } else {
      // Copy to single target
      targets = [targetId];
    }

    onCopyEQ(sourceId, targets);

    // Show success feedback
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 1500);

    setDragSource(null);
    setIsDragging(false);
    setDragOverTarget(null);
  }, [selectedSpeakers, onCopyEQ]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragSource(null);
    setIsDragging(false);
    setDragOverTarget(null);
  }, []);

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Speaker Layout</h3>
          <span className="text-[10px] text-zinc-600 font-mono">{format}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Multi-select toggle */}
          <button
            onClick={() => onMultiSelectModeChange(!multiSelectMode)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${multiSelectMode
              ? 'text-white border-opacity-50'
              : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:text-zinc-300'
              }`}
            style={{
              backgroundColor: multiSelectMode ? `${themeColor}30` : undefined,
              borderColor: multiSelectMode ? themeColor : undefined,
              color: multiSelectMode ? themeColor : undefined,
            }}
          >
            Multi {multiSelectMode ? '◉' : '○'}
          </button>

          {/* Selection count */}
          <div className="text-[10px] text-zinc-500 font-mono">
            {selectedSpeakers.length} selected
          </div>
        </div>
      </div>

      {/* Drag hint */}
      {isDragging && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 bg-zinc-900/95 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
          <div className="flex items-center gap-2 text-[10px] text-zinc-300">
            <Copy size={12} />
            <span>Drop on speaker to copy EQ</span>
            {selectedSpeakers.length > 1 && (
              <span className="text-zinc-500">• Drop on selected to copy to all</span>
            )}
          </div>
        </div>
      )}

      {/* Copy success feedback */}
      {showCopySuccess && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 bg-emerald-500/90 text-white rounded-lg px-4 py-2 shadow-xl flex items-center gap-2 animate-in fade-in zoom-in duration-200">
          <Check size={14} />
          <span className="text-[11px] font-bold">EQ Copied!</span>
        </div>
      )}

      {/* Speaker Layout Visualization */}
      <div
        className="flex-1 relative bg-zinc-900/30 rounded-xl border border-zinc-800/50 overflow-hidden cursor-default"
        onClick={(e) => {
          if (onDeselect) {
            onDeselect();
          }
        }}
      >
        {/* Grid background */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-zinc-700" />
              </pattern>
              {/* Mute Pattern - Red Diagonal Lines */}
              <pattern id="mute-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#ef4444" strokeWidth="2" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Listening position indicator */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-zinc-600/50 bg-zinc-800/50 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
        </div>

        {/* Front indicator */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
          Front
        </div>

        {/* Rear indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
          Rear
        </div>

        {/* Speakers */}
        {visibleSpeakers.map(speakerId => {
          const pos = SPEAKER_POSITIONS[speakerId];
          if (!pos) return null;

          const isSelected = selectedSpeakers.includes(speakerId);
          const isSource = dragSource === speakerId;
          const isDropTarget = dragOverTarget === speakerId && !isSource;
          const channel = channels.find(ch => ch.speaker === speakerId);
          const hasActiveEQ = channel?.parametricEQ?.some(band => band.enabled) || false;
          const isMuted = channel?.muted || false;
          const isSolo = channel?.solo || false;
          const isDimmed = isAnySolo && !isSolo;
          const isHeight = pos.z > 0;

          // Calculate position (with some padding)
          const left = `${50 + pos.x * 42}%`;
          const top = `${50 + pos.y * 42}%`;

          let colors = getSpeakerColors(speakerId);

          // Style Overrides for State
          if (isSolo) {
            // "Visualizer Style" Active State - Tonemap: Reduced intensity
            if (['L', 'R', 'C'].includes(speakerId)) {
              colors = { bg: 'bg-rose-500/30', border: 'border-rose-400/80', text: 'text-white font-bold', glow: 'rgba(251, 113, 133, 0.5)' };
            } else if (speakerId === 'LFE') {
              colors = { bg: 'bg-purple-500/30', border: 'border-purple-400/80', text: 'text-white font-bold', glow: 'rgba(192, 132, 252, 0.5)' };
            } else if (['Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'].includes(speakerId)) {
              colors = { bg: 'bg-sky-500/30', border: 'border-sky-400/80', text: 'text-white font-bold', glow: 'rgba(56, 189, 248, 0.5)' };
            } else {
              colors = { bg: 'bg-emerald-500/30', border: 'border-emerald-400/80', text: 'text-white font-bold', glow: 'rgba(52, 211, 153, 0.5)' };
            }
          } else if (isMuted) {
            // Mute keeps mostly base colors but adds the overlay
            colors = {
              bg: 'bg-zinc-900/50',
              border: 'border-red-500/30',
              text: 'text-red-400/50',
              glow: 'rgba(239, 68, 68, 0)',
            };
          } else if (isDimmed) {
            // Dimmed State: Grayed out but visible
            colors = {
              bg: 'bg-zinc-800/20',
              border: 'border-zinc-600/30',
              text: 'text-zinc-500 font-medium',
              glow: 'rgba(0,0,0,0)'
            };
          }

          return (
            <button
              key={speakerId}
              draggable
              onDragStart={(e) => handleDragStart(e, speakerId)}
              onDragOver={(e) => handleDragOver(e, speakerId)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, speakerId)}
              onDragEnd={handleDragEnd}
              onClick={(e) => {
                e.stopPropagation();
                onSpeakerSelect(speakerId, e.ctrlKey || e.metaKey);
              }}
              className={`
                absolute transform -translate-x-1/2 -translate-y-1/2
                w-10 h-10 rounded-lg border-2
                flex items-center justify-center
                text-[10px] font-bold tracking-wide
                transition-all duration-300 cursor-pointer
                ${colors.bg} ${colors.border} ${colors.text}
                ${isHeight ? 'border-dashed' : ''}
                ${isSelected ? 'scale-110 z-20' : isSolo ? 'scale-110 z-20' : 'hover:scale-105'}
                ${isSource ? 'opacity-50 scale-95' : ''}
                ${isDropTarget ? 'scale-115 ring-2 ring-white/50' : ''}
                ${isDimmed ? 'opacity-50 saturate-0 scale-95' : ''}
              `}
              style={{
                left,
                top,
                boxShadow: isSelected
                  ? `0 0 25px ${themeColor}, inset 0 0 15px ${themeColor}40, 0 0 5px ${themeColor}`
                  : isSolo
                    ? `0 0 15px ${colors.glow}, inset 0 0 10px ${colors.glow}`
                    : isDropTarget
                      ? `0 0 20px rgba(255,255,255,0.3)`
                      : `0 0 10px ${colors.glow}`,
                borderColor: isSelected ? themeColor : isSolo ? colors.glow : undefined,
              }}
              title={`${speakerId}${isHeight ? ' (Height)' : ''} - Drag to copy EQ`}
            >
              {/* Muted Pattern Overlay */}
              {isMuted && (
                <div
                  className="absolute inset-0 rounded-lg opacity-80 pointer-events-none"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(239,68,68,0.3) 0px, rgba(239,68,68,0.3) 2px, transparent 2px, transparent 6px)'
                  }}
                />
              )}

              {/* Text Layer (ensure it's above pattern) */}
              <span className="relative z-10">{pos.label}</span>

              {/* Active EQ Indicator - Small dot at top right */}
              {hasActiveEQ && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_5px_rgba(250,204,21,0.8)] animate-pulse"></span>
              )}

              {null}

              {/* Selection indicator */}
              {isSelected && (
                <span
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: themeColor }}
                />
              )}
            </button>
          );
        })}

        {/* Height layer indicator */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 text-[9px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border border-zinc-600 border-solid"></span>
            Floor
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded border border-sky-400/50 border-dashed"></span>
            Height
          </span>
        </div>
      </div>

      {/* Instructions */}

    </div>
  );
};

export default SpeakerLayoutSelector;
