import React, { useState, useEffect, useRef } from 'react';
import { cn } from './lib/utils';
import { Settings, ShieldAlert, ChevronDown, Check, Play, Square, RotateCw, MoreHorizontal } from 'lucide-react';
import { ChassisCard, InsetPanel, EngravedHeader } from './components/HardwareUI';
import { SourceStrip } from './components/SourceStrip';
import { OutputStrip } from './components/OutputStrip';
import { Visualizer } from './components/Visualizer';
import { Knob } from './components/Knob';
import { Meter } from './components/Meter';
import { SourceConfigEditor } from './components/SourceConfigEditor';
import { OutputConfigEditor } from './components/OutputConfigEditor';
import { Source, Output } from './types';
import { LOUDNESS_STANDARDS, getTargetLufs, SPEAKERS_916, CHANNELS_16, FORMAT_CHANNELS } from './constants/audio';
import {
  useSources, useActiveSourceIds, useOutputs, useActiveOutputId,
  useVolume, useMute, useDim, useLoudnessStandard, useRefPresets,
  useMeterMonitorMode, useDeviceActions, useDeviceInfo, useConnectionState,
} from './hooks/useDevice';
import { useMeterData } from './hooks/useMeterData';

const App: React.FC = () => {
  // ─── Device state from Zustand store ───────────────────────────────
  const sources = useSources();
  const activeSourceIds = useActiveSourceIds();
  const outputs = useOutputs();
  const activeOutput = useActiveOutputId();       // string ID
  const mainVolume = useVolume();                  // dB (-96 to +12)
  const isMute = useMute();
  const isDim = useDim();
  const loudnessStandard = useLoudnessStandard();
  const refPresets = useRefPresets();
  const meterMonitorMode = useMeterMonitorMode();
  const { sampleRate, clockSource, deviceName } = useDeviceInfo();
  const connectionState = useConnectionState();
  const meterRef = useMeterData();
  const actions = useDeviceActions();

  // ─── UI-only state ─────────────────────────────────────────────────
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingOutputId, setEditingOutputId] = useState<string | null>(null);
  const [selectionContext, setSelectionContext] = useState<'SOURCE' | 'OUTPUT'>('SOURCE');

  // Loudness menu
  const [isLoudnessMenuOpen, setIsLoudnessMenuOpen] = useState(false);
  const [isLoudnessRunning, setIsLoudnessRunning] = useState(false);
  const loudnessMenuRef = useRef<HTMLDivElement>(null);

  // Ref preset config
  const [configRefId, setConfigRefId] = useState<string | null>(null);

  // Meter menu
  const [isMeterMenuOpen, setIsMeterMenuOpen] = useState(false);
  const meterMenuRef = useRef<HTMLDivElement>(null);

  // Resizing state
  const [controlDeckHeight, setControlDeckHeight] = useState(340);
  const [meterBridgeRatio, setMeterBridgeRatio] = useState(0.60);
  const knobContainerRef = useRef<HTMLDivElement>(null);

  // Sidebar resizing state - PERCENTAGE BASED (Default 14%)
  const [leftSidebarPercent, setLeftSidebarPercent] = useState(14);
  const [rightSidebarPercent, setRightSidebarPercent] = useState(14);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  const isDraggingHeight = useRef(false);
  const isDraggingRatio = useRef(false);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);

  const bottomGridRef = useRef<HTMLDivElement>(null);

  // ─── Meter snapshot (bridge from ref to React rendering) ───────────
  const [meterSnapshot, setMeterSnapshot] = useState<{
    levels: number[];
    peaks: number[];
    lufs: { m: number; s: number; i: number; tp: number };
  }>({
    levels: Array(16).fill(0),
    peaks: Array(16).fill(0),
    lufs: { m: -Infinity, s: -Infinity, i: -Infinity, tp: -Infinity },
  });

  useEffect(() => {
    const id = setInterval(() => {
      const data = meterRef.current;
      setMeterSnapshot({
        levels: [...data.levels],
        peaks: [...data.peaks],
        lufs: { ...data.lufs },
      });
    }, 50);
    return () => clearInterval(id);
  }, []);

  // ─── Click outside handlers ────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (loudnessMenuRef.current && !loudnessMenuRef.current.contains(event.target as Node)) {
        setIsLoudnessMenuOpen(false);
      }
      if (meterMenuRef.current && !meterMenuRef.current.contains(event.target as Node)) {
        setIsMeterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Track viewport width for responsive sidebar rules
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const leftSidebarWidthPx = Math.min(480, Math.max(220, (viewportWidth * leftSidebarPercent) / 100));
  const showTrimKnob = leftSidebarWidthPx >= 250;

  // Drag Event Listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Bottom Deck Height Resize
      if (isDraggingHeight.current) {
        const newHeight = window.innerHeight - e.clientY - 40;
        setControlDeckHeight(Math.max(200, Math.min(newHeight, window.innerHeight * 0.7)));
      }

      // Meter Bridge Ratio Resize
      if (isDraggingRatio.current && bottomGridRef.current) {
        const rect = bottomGridRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left - 16;
        const newRatio = relativeX / (rect.width - 32);
        setMeterBridgeRatio(Math.max(0.3, Math.min(newRatio, 0.75)));
      }

      // Left Sidebar Resize (Percentage)
      if (isDraggingLeft.current) {
        const pct = (e.clientX / window.innerWidth) * 100;
        setLeftSidebarPercent(Math.max(10, Math.min(pct, 40)));
      }

      // Right Sidebar Resize (Percentage)
      if (isDraggingRight.current) {
        const pct = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
        setRightSidebarPercent(Math.max(10, Math.min(pct, 40)));
      }
    };

    const handleMouseUp = () => {
      isDraggingHeight.current = false;
      isDraggingRatio.current = false;
      isDraggingLeft.current = false;
      isDraggingRight.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    // Attach to window to handle dragging outside the element
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }, []);

  const startDragHeight = (e: React.MouseEvent) => {
    isDraggingHeight.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const startDragRatio = (e: React.MouseEvent) => {
    isDraggingRatio.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const startDragLeft = (e: React.MouseEvent) => {
    isDraggingLeft.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const startDragRight = (e: React.MouseEvent) => {
    isDraggingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  // ─── Derived state ─────────────────────────────────────────────────

  // Calculate active channels based on ALL active sources
  const getActiveChannelIds = () => {
    const activeIds = new Set<string>();
    activeSourceIds.forEach(id => {
      const src = sources.find(s => s.id === id);
      if (src) {
        const chans = FORMAT_CHANNELS[src.format] || [];
        chans.forEach(c => activeIds.add(c));
      }
    });
    return activeIds;
  };

  // ─── Event handlers (wrapping store actions + UI context) ──────────

  const handleSourceSelect = (id: string) => {
    actions.selectSource(id);
    setSelectionContext('SOURCE');
  };

  const handleOutputSelect = (id: string) => {
    actions.selectOutput(id);
    setSelectionContext('OUTPUT');
  };

  // Derived state for display
  const activeSourcesList = sources.filter(s => activeSourceIds.includes(s.id));
  const sourceFormat = activeSourcesList.length > 0 ? activeSourcesList[activeSourcesList.length - 1].format : '9.1.6';

  const activeOutputData = outputs.find(o => o.id === activeOutput);
  const outputFormat = activeOutputData ? activeOutputData.format : '9.1.6';

  // Determine which format to show on Visualizer based on context
  const visualizerFormat = selectionContext === 'SOURCE' ? sourceFormat : outputFormat;

  // Determine Meter Format and Label and Color
  let meterTargetFormat = '9.1.6';
  let meterLabel = 'INPUT MONITORING';
  let meterColor = 'cyan';

  if (meterMonitorMode.type === 'FOLLOW_INPUT') {
    const activeSrc = activeSourcesList.length > 0 ? activeSourcesList[activeSourcesList.length - 1] : sources[0];
    meterTargetFormat = activeSrc?.format ?? '9.1.6';
    meterLabel = 'INPUT MONITORING';
    meterColor = activeSrc?.color || 'amber';
  } else if (meterMonitorMode.type === 'FOLLOW_OUTPUT') {
    meterTargetFormat = outputFormat;
    meterLabel = 'OUTPUT MONITORING';
    const activeOut = outputs.find(o => o.id === activeOutput);
    if (activeOut) meterColor = activeOut.color;
  } else if (meterMonitorMode.type === 'SPECIFIC') {
    const src = sources.find(s => s.id === meterMonitorMode.id);
    if (src) {
      meterTargetFormat = src.format;
      meterLabel = `IN: ${src.name}`;
      meterColor = src.color;
    } else {
      const out = outputs.find(o => o.id === meterMonitorMode.id);
      if (out) {
        meterTargetFormat = out.format;
        meterLabel = `OUT: ${out.name}`;
        meterColor = out.color;
      }
    }
  }

  // Resolve Tailwind Color
  const resolveColorClass = (colorName: string) => {
    if (colorName === 'green') return 'emerald';
    return colorName;
  };
  const finalMeterColor = resolveColorClass(meterColor);

  const currentFormatChannels = FORMAT_CHANNELS[meterTargetFormat] || FORMAT_CHANNELS['9.1.6'];

  // Visualizer Channels
  const visualizerChannels = FORMAT_CHANNELS[visualizerFormat] || FORMAT_CHANNELS['9.1.6'];

  const visibleMeters = currentFormatChannels.map((chId) => {
    const index = CHANNELS_16.findIndex(c => c.id === chId);
    if (index === -1) return null;
    return {
      ...CHANNELS_16[index],
      originalIndex: index,
    };
  }).filter((item): item is (typeof CHANNELS_16[0] & { originalIndex: number }) => item !== null);

  // Calculate speakers for Visualizer
  const currentSpeakers = SPEAKERS_916.filter(spk => visualizerChannels.includes(spk.id));

  return (
    <div className="w-full h-screen bg-[#0f1014] text-[#d4d4d8] flex flex-col overflow-hidden">

      {/* Top Bar */}
      <header className="h-12 border-b border-[#1a1b1f] bg-[#0c0d11] flex items-center justify-between px-6 shrink-0 z-20 shadow-md">
        <div className="text-xs font-bold text-[#71717a] tracking-widest flex items-center gap-4 min-w-[200px]">
          <span>CLOCK <span className="text-[#a1a1aa] ml-1">{clockSource || 'TOPPING 16 Mon'}</span></span>
        </div>

        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-bold tracking-[0.1em] text-[#8a8a8f]">TOPPING SURROUND CONTROLLER</h1>
          <div className="flex gap-2 text-[9px] font-bold text-[#52525b] tracking-wider uppercase">
            <span>Design: PGS V0.1</span>
            <span>CodeBy Vertex</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 text-xs font-bold text-[#71717a] min-w-[200px]">
          <span>SAMPLE RATE <span className="text-[#a1a1aa] ml-1">{sampleRate} Hz</span></span>
          <Settings size={16} className="text-[#71717a] cursor-pointer hover:text-[#d4d4d8]" />
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 flex overflow-hidden relative">

        {/* Focus Mode Overlay (Backdrop) */}
        {(editingSourceId || editingOutputId) && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-40 transition-opacity duration-300"></div>
        )}

        {/* Left Column: Sources - Hidden when editing Output */}
        {!editingOutputId && (
          <section
            className={`bg-[#0c0d11] border-r border-white/[0.04] flex flex-col shrink-0 relative group/leftsidebar z-30 shadow-[12px_0_40px_-5px_rgba(0,0,0,0.8)] transition-[border-color,box-shadow,background-color] duration-300 ${editingSourceId ? 'z-50 border-r-0 shadow-[20px_0_50px_rgba(0,0,0,0.5)]' : ''}`}
            style={{ width: `${leftSidebarPercent}%`, minWidth: '220px', maxWidth: '480px' }}
            onClick={() => setSelectionContext('SOURCE')}
          >
            {/* Resize Handle (Left Sidebar) */}
            {!editingSourceId && !editingOutputId && (
              <div
                className="absolute top-0 bottom-0 -right-1 w-2 z-50 cursor-col-resize hover:bg-[#2eb8cc]/40 transition-colors delay-75"
                onMouseDown={startDragLeft}
                onDoubleClick={() => setLeftSidebarPercent(18)}
              ></div>
            )}

            <div className="h-10 flex items-end px-2 border-b border-[#1a1b1f] bg-[#0a0b0e]/50">
              <button className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-colors ${selectionContext === 'SOURCE' ? 'text-[#d4d4d8] border-[#52525b]' : 'text-[#52525b] border-transparent'}`}>INPUT CONFIG</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {sources.map(src => (
                <div key={src.id} className={`transition-opacity duration-300 ${editingSourceId && editingSourceId !== src.id ? 'opacity-20 pointer-events-none blur-[1px]' : ''}`}>
                  <SourceStrip
                    source={src}
                    selected={activeSourceIds.includes(src.id)}
                    isEditing={editingSourceId === src.id}
                    showTrim={showTrimKnob}
                    onSelect={handleSourceSelect}
                    onToggleLock={actions.toggleSourceLock}
                    onSettingsClick={() => setEditingSourceId(src.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Center Area - Editor or Visualizer */}
        {editingSourceId ? (
          <div className="flex-1 relative z-50 animate-slide-in-left editor-panel-shadow">
            <SourceConfigEditor
              source={sources.find(s => s.id === editingSourceId)!}
              onClose={() => setEditingSourceId(null)}
              onSave={(updated) => {
                actions.updateSource(updated);
                setEditingSourceId(null);
              }}
              onColorChange={(sourceId, color) => {
                const source = sources.find(s => s.id === sourceId);
                if (source) actions.updateSource({ ...source, color });
              }}
            />
          </div>
        ) : editingOutputId ? (
          /* Output Config Editor - Slides in from right, positioned left of Output panel */
          <div className="flex-1 relative z-[60] animate-slide-in-right editor-panel-shadow-right">
            <OutputConfigEditor
              output={outputs.find(o => o.id === editingOutputId)!}
              onClose={() => setEditingOutputId(null)}
              onSave={(updated) => {
                actions.updateOutput(updated);
                setEditingOutputId(null);
              }}
              onColorChange={(outputId, color) => {
                const output = outputs.find(o => o.id === outputId);
                if (output) actions.updateOutput({ ...output, color });
              }}
            />
          </div>
        ) : (
          /* Center Column: Monitor & Visualizer (The Embedded Viewport) */
          <section className="flex-1 flex flex-col min-w-[200px] relative bg-[#030304] overflow-hidden border-x border-black/40 shadow-[inset_0_10px_30px_-10px_rgba(0,0,0,1)]">

            {/* Visualizer Area (Flex-1) */}
            <div className="flex-1 relative min-h-0 bg-[#030304]">
              {/* Visualizer gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10 h-32"></div>

              {/* Note: Visualizer component has its own styles, ensuring it looks like a viewport */}
              <Visualizer
                speakers={currentSpeakers}
                active={!isMute && activeSourceIds.length > 0}
                context={selectionContext}
                onContextChange={setSelectionContext}
                formatLabel={visualizerFormat}
              />
            </div>

            {/* Bottom Control Deck (Resizable Height) */}
            <div
              className="bg-gradient-to-b from-[#111216] via-[#0e0f13] to-[#0a0b0e] border-t border-[#1a1b1f] shadow-[0_-6px_24px_rgba(0,0,0,0.7)] z-20 flex flex-col relative"
              style={{ height: controlDeckHeight }}
            >
              {/* Horizontal Resize Handle - Invisible Trigger Area */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5 -mt-0.5 cursor-row-resize z-50 group flex justify-center items-start hover:bg-[#2eb8cc]/25 transition-colors"
                onMouseDown={startDragHeight}
                onDoubleClick={() => setControlDeckHeight(380)}
              >
                {/* Subtle highlight line on hover, no center notch */}
                <div className="w-full h-[1px] bg-transparent group-hover:bg-[#2eb8cc] shadow-[0_0_10px_rgba(46,184,204,0.4)] transition-all"></div>
              </div>

              {/* Bottom Control Deck (The Professional Hardware Chassis) */}
              <ChassisCard className="flex-1 flex overflow-hidden shrink-0 z-40 relative mx-4 mb-4 mt-2">

                {/* Grid Layout: L-Shape Monitor (Left) + Control Tower (Right) */}
                <div className="w-full h-full p-1 grid grid-cols-12 gap-1 bg-[#0a0b0e]/50">

                  {/* Left Wing: L-Integrated Analyzer Hub (Span 8) */}
                  <div className="col-span-8 flex flex-col gap-1 relative">
                    {/* 1. TOP HUD HEADER: Standard Selector + Metrics */}
                    <div className="h-9 flex items-center justify-between px-3 bg-[#0a0b0e]/30 border-b border-white/[0.05]">
                      {/* A. Standard Selector (Left) */}
                      <div className="relative" ref={loudnessMenuRef}>
                        <button
                          className="text-[10px] font-bold font-mono text-[#a1a1aa] hover:text-[#d4d4d8] transition-colors cursor-pointer flex items-center gap-2 py-1 bg-[#0a0b0e]/40 px-2 rounded border border-white/[0.04] hover:border-white/[0.1]"
                          onClick={() => setIsLoudnessMenuOpen(!isLoudnessMenuOpen)}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d4890f] shadow-[0_0_6px_rgba(212,137,15,0.5)] animate-pulse"></span>
                          <span>{loudnessStandard}</span>
                          <ChevronDown size={10} className={`text-zinc-600 transition-transform duration-200 ${isLoudnessMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* HUD Dropdown */}
                        {isLoudnessMenuOpen && (
                          <div className="absolute top-full left-0 mt-1 w-56 bg-[#111216] border border-[#2a2b30] shadow-2xl z-50 rounded-md overflow-hidden max-h-80 overflow-y-auto custom-scrollbar">
                            {LOUDNESS_STANDARDS.map(std => (
                              <button
                                key={std.name}
                                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#1a1b1f] transition-colors group"
                                onClick={() => { actions.setLoudnessStandard(std.name); setIsLoudnessMenuOpen(false); }}
                              >
                                <span className={`text-[10px] font-bold font-mono ${loudnessStandard === std.name ? 'text-[#d4890f]' : 'text-[#71717a]'}`}>{std.name}</span>
                                <span className={`text-[9px] font-mono ${loudnessStandard === std.name ? 'text-[#d4890f]/70' : 'text-[#52525b]'}`}>{std.target} LUFS</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* B. HUD Metrics (Right) */}
                      <div className="flex items-center gap-2">
                        {(() => {
                          const targetLufs = getTargetLufs(loudnessStandard);
                          return [
                            { label: 'M', value: activeSourceIds.length ? meterSnapshot.lufs.m.toFixed(1) : '-inf' },
                            { label: 'S', value: activeSourceIds.length ? meterSnapshot.lufs.s.toFixed(1) : '-inf' },
                            { label: 'I', value: activeSourceIds.length ? meterSnapshot.lufs.i.toFixed(1) : '-inf', isMain: true, targetLufs },
                            { label: 'TP', value: activeSourceIds.length ? meterSnapshot.lufs.tp.toFixed(1) : '-inf' },
                          ].map(m => (
                            <div key={m.label} className={`flex flex-col items-end justify-center h-7 bg-[#0a0b0e] rounded border px-1.5 relative overflow-hidden ${m.isMain ? 'w-16 border-[#d4890f]/30 bg-[#1a1b1f]/80' : 'w-12 border-white/[0.1] bg-[#1a1b1f]/40'
                              }`}>
                              <span className="text-[8px] font-bold text-[#a1a1aa] tracking-wide mb-0.5">{m.label}</span>
                              <span className={`text-[10px] font-bold font-mono leading-none tabular-nums ${m.isMain
                                ? (m.value !== '-inf' && Math.abs(parseFloat(m.value) - m.targetLufs!) <= 1
                                  ? 'text-[#0fa070]'
                                  : m.value !== '-inf' && parseFloat(m.value) > m.targetLufs!
                                    ? 'text-[#d4890f]'
                                    : 'text-[#7db4c9]')
                                : 'text-[#d4890f]'
                                } drop-shadow-[0_0_5px_rgba(212,137,15,0.25)]`}>{m.value}</span>
                              <div className="absolute top-0 right-0 w-full h-[1px] bg-white/[0.08]"></div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* 2. METER BRIDGE BODY */}
                    <InsetPanel className="flex-1 w-full bg-[#0a0b0e] relative flex flex-col">

                      {/* Header: Engraved Hardware Title */}
                      <EngravedHeader label="INPUT MONITORING" color="amber" className="bg-transparent border-b-0 opacity-80" />

                      {/* Meter Area - Horizontal Layout with Scales */}
                      <div className="flex-1 w-full px-2 pb-2 flex relative">

                        {/* LEFT: dBFS Scale Column */}
                        <div className="w-8 shrink-0 flex flex-col relative mr-1">
                          {/* Scale container - aligned with meter track area */}
                          <div className="h-1 shrink-0"></div>{/* Clip LED space */}
                          <div className="flex-1 relative">
                            {[
                              { label: '0', pct: 100 },
                              { label: '-6', pct: 90 },
                              { label: '-12', pct: 80 },
                              { label: '-18', pct: 70 },
                              { label: '-24', pct: 60 },
                              { label: '-36', pct: 40 },
                              { label: '-48', pct: 20 },
                              { label: '-60', pct: 0 },
                            ].map((t) => (
                              <div
                                key={t.label}
                                className="absolute right-0 flex items-center"
                                style={{ bottom: `${t.pct}%`, transform: 'translateY(50%)' }}
                              >
                                <span className="text-[10px] font-mono text-[#71717a] tabular-nums leading-none">{t.label}</span>
                              </div>
                            ))}
                          </div>
                          {/* Label area */}
                          <div className="h-6 shrink-0 flex items-end justify-end">
                            <span className="text-[9px] font-bold text-[#52525b]">dB</span>
                          </div>
                        </div>

                        {/* CENTER: Meters with horizontal grid lines */}
                        <div className="flex-1 flex gap-[2px] relative">
                          {/* Horizontal scale lines (spanning all meters) */}
                          <div className="absolute inset-0 pointer-events-none z-10" style={{ top: '4px', bottom: '28px' }}>
                            {[
                              { pct: 100, major: true },
                              { pct: 90, major: false },
                              { pct: 80, major: false },
                              { pct: 70, major: false },
                              { pct: 60, major: false },
                              { pct: 40, major: false },
                              { pct: 20, major: false },
                              { pct: 0, major: true },
                            ].map((line) => (
                              <div
                                key={line.pct}
                                className={`absolute left-0 right-0 ${line.major ? 'h-px bg-white/15' : 'h-px bg-white/[0.06]'}`}
                                style={{ bottom: `${line.pct}%` }}
                              />
                            ))}
                          </div>

                          {/* Meter bars */}
                          {visibleMeters.map((channel) => {
                            const gapAfterChannelIds = new Set(['LFE', 'Rw']);
                            const isGapAfter = gapAfterChannelIds.has(channel.id);

                            return (
                              <React.Fragment key={channel.id}>
                                <div className="flex-1 h-full min-w-0 relative group">
                                  <Meter
                                    level={meterSnapshot.levels[channel.originalIndex] ?? 0}
                                    peak={meterSnapshot.peaks[channel.originalIndex] ?? 0}
                                    color={channel.color}
                                    label={channel.label}
                                  />
                                </div>
                                {isGapAfter && <div className="w-2 shrink-0"></div>}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* Divider */}
                        <div className="w-3 shrink-0 relative mx-1">
                          <div className="absolute top-2 bottom-6 left-1/2 w-px bg-[#3f3f46]/50"></div>
                        </div>

                        {/* RIGHT: Single LUFS Meter with Scale */}
                        {(() => {
                          const targetLufs = getTargetLufs(loudnessStandard);
                          const lufsToPercent = (lufs: number) => Math.max(0, Math.min(100, ((lufs + 36) / 27) * 85 + 10));
                          const targetPct = lufsToPercent(targetLufs);

                          // Base scale points
                          const baseScalePoints = [-9, -14, -23, -27, -36];
                          // Add target if not in base points
                          const allPoints = baseScalePoints.includes(targetLufs)
                            ? baseScalePoints
                            : [...baseScalePoints, targetLufs].sort((a, b) => b - a);
                          const lufsScalePoints = allPoints.map(v => ({ label: String(v), lufs: v }));

                          // Convert LUFS value to bar percentage
                          const lufsBarPercent = meterSnapshot.lufs.i > -Infinity
                            ? lufsToPercent(meterSnapshot.lufs.i)
                            : 0;

                          // Peak as percentage
                          const lufsPeakPercent = meterSnapshot.lufs.tp > -Infinity
                            ? lufsToPercent(meterSnapshot.lufs.tp)
                            : 0;

                          return (
                            <div className="flex shrink-0">
                              {/* LUFS Meter */}
                              <div className="w-8 h-full flex flex-col">
                                {/* Clip LED */}
                                <div className={`w-full h-1 mb-1 rounded-[1px] transition-colors duration-100 ${meterSnapshot.lufs.tp >= 0 ? 'bg-[#dc2626] shadow-[0_0_6px_#dc2626]' : 'bg-[#1a0a0a]'}`}></div>
                                {/* Meter Track */}
                                <div className="flex-1 w-full bg-[#0a0b0e] relative overflow-hidden rounded-[1px]">
                                  {/* Target indicator */}
                                  <div
                                    className="absolute left-0 right-0 h-0.5 bg-[#d4890f]/60 shadow-[0_0_4px_rgba(212,137,15,0.35)]"
                                    style={{ bottom: `${targetPct}%` }}
                                  />
                                  {/* LUFS Bar */}
                                  <div
                                    className="absolute bottom-0 w-full bg-[#3b82f6] transition-all duration-75 ease-out"
                                    style={{ height: `${Math.min(100, Math.max(0, lufsBarPercent))}%` }}
                                  ></div>
                                  {/* Peak line */}
                                  <div
                                    className="absolute w-full h-[1px] bg-[#e4e4e7] transition-all duration-300 ease-out z-10 shadow-sm mix-blend-screen"
                                    style={{ bottom: `${Math.min(100, Math.max(0, lufsPeakPercent))}%` }}
                                  ></div>
                                </div>
                                {/* Label */}
                                <div className="w-full flex flex-col items-center gap-0.5 mt-1">
                                  <span className="text-[9px] font-bold tracking-tight leading-none uppercase text-[#71717a]">LUFS</span>
                                  <div className="w-full h-1 rounded-sm bg-[#3b82f6] opacity-70"></div>
                                </div>
                              </div>

                              {/* LUFS Scale */}
                              <div className="w-6 h-full flex flex-col ml-0.5">
                                <div className="h-1 mb-1 shrink-0"></div>
                                <div className="flex-1 relative">
                                  {lufsScalePoints.map((t) => {
                                    const pct = lufsToPercent(t.lufs);
                                    const isTarget = t.lufs === targetLufs;
                                    return (
                                      <div
                                        key={t.label}
                                        className="absolute left-0 flex items-center gap-0.5"
                                        style={{ bottom: `${pct}%`, transform: 'translateY(50%)' }}
                                      >
                                        <span className={`w-1 h-px ${isTarget ? 'bg-[#d4890f]' : 'bg-[#52525b]'}`}></span>
                                        <span className={`text-[8px] font-mono tabular-nums leading-none ${isTarget
                                          ? 'text-[#d4890f] font-bold'
                                          : 'text-[#71717a]'
                                          }`}>{t.label}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="h-6 shrink-0"></div>
                              </div>
                            </div>
                          );
                        })()}

                      </div>
                    </InsetPanel>
                  </div>

                  {/* Right Wing: The Offset Control Tower (Span 4) */}
                  <div className="col-span-4 flex flex-col relative pl-1">

                    {/* The Control Tower Panel */}
                    <InsetPanel className="flex-1 w-full bg-[#0a0b0e] relative flex flex-col" >
                      {/* Reference used for scaling calculation if needed */}
                      <div className="absolute inset-0 pointer-events-none" ref={knobContainerRef}></div>

                      <EngravedHeader label="MONITOR LEVEL" color="cyan" className="bg-transparent border-b-0 opacity-80" />

                      {/* Staggered Content Area */}
                      <div className="flex-1 flex flex-col items-center justify-between py-2 px-4 relative z-10">

                        {/* A. Ref Selectors - Segmented Control Style */}
                        <div className="flex w-full p-1 bg-[#050508] rounded-lg border border-white/[0.02] shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] mb-2 relative">
                          {refPresets.map((ref) => {
                            const isActive = Math.abs(mainVolume - ref.level) < 0.5;
                            return (
                              <button
                                key={ref.id}
                                onClick={() => actions.setVolume(ref.level)}
                                className={cn(
                                  "flex-1 py-1.5 text-[9px] font-bold rounded-md transition-all duration-300 relative",
                                  isActive
                                    ? "text-[#2eb8cc] shadow-[0_2px_10px_rgba(46,184,204,0.15)] bg-[#1a1b1f] border border-[#2eb8cc]/20"
                                    : "text-[#71717a] hover:text-[#a1a1aa] border border-transparent hover:bg-white/[0.02]"
                                )}>
                                {/* Active subtle indicator ring */}
                                {isActive && (
                                  <div className="absolute inset-0 rounded-md ring-1 ring-[#2eb8cc]/30 ring-inset pointer-events-none mix-blend-screen"></div>
                                )}
                                {ref.name}
                              </button>
                            );
                          })}
                        </div>

                        {/* B. The Hero Knob */}
                        <div className="relative flex-1 flex items-center justify-center w-full min-h-[140px]">
                          {/* Breathing Glow behind Knob */}
                          {(isMute || isDim) && (
                            <div
                              className={cn(
                                "absolute w-40 h-40 rounded-full blur-[40px] pointer-events-none",
                                isMute ? "bg-[#dc2626]/25" : "bg-[#d4890f]/25"
                              )}
                              style={{ animation: 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                            ></div>
                          )}
                          {/* Decor Rings */}
                          <div className="absolute inset-0 border border-[#2a2b30]/40 rounded-full scale-[0.85] opacity-50"></div>

                          <Knob
                            value={mainVolume}
                            onChange={actions.setVolume}
                            size={140}
                            color={isMute ? '#dc2626' : isDim ? '#d4890f' : '#2eb8cc'}
                            max={12}
                            min={-96}
                          />

                          {/* Center Value Display */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-2">
                            <span className={cn(
                              "text-2xl font-bold font-mono tabular-nums tracking-tighter",
                              isMute ? "text-[#dc2626] drop-shadow-[0_0_10px_rgba(220,38,38,0.4)]" : isDim ? "text-[#d4890f] drop-shadow-[0_0_10px_rgba(212,137,15,0.4)]" : "text-[#2eb8cc] drop-shadow-[0_0_10px_rgba(46,184,204,0.4)]"
                            )}>
                              {mainVolume <= -96 ? '-inf' : mainVolume.toFixed(1)}
                            </span>
                            <span className="text-[9px] text-[#52525b] font-bold tracking-widest -mt-1">dB</span>
                          </div>
                        </div>


                        {/* C. Bottom Action Strip (Tactile Buttons) */}
                        <div className="w-full grid grid-cols-2 gap-3 mt-auto">
                          <button
                            onClick={() => actions.setDim(!isDim)}
                            className={cn(
                              "h-9 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold border transition-all duration-300 shadow-lg relative isolate active:scale-[0.98]",
                              isDim
                                ? "bg-[#d4890f]/10 border-[#d4890f]/50 text-[#d4890f] shadow-[inset_0_0_12px_rgba(212,137,15,0.15),0_0_10px_rgba(212,137,15,0.1)]"
                                : "bg-[#08090c] border-white/[0.04] text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#0c0d11]"
                            )}
                          >
                            {/* Breathing Glow - Always rendered, visibility controlled by opacity */}
                            <div
                              className={cn(
                                "absolute -inset-1 bg-[#d4890f]/20 blur-xl rounded -z-10 transition-all duration-500",
                                isDim ? "opacity-100" : "opacity-0"
                              )}
                              style={{ animation: isDim ? 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' }}
                            ></div>
                            <span className={cn("relative z-10 drop-shadow-md", isDim ? "tracking-wider text-[#d4890f]" : "")}>DIM</span>
                          </button>

                          <button
                            onClick={() => actions.setMute(!isMute)}
                            className={cn(
                              "h-9 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold border transition-all duration-300 shadow-lg relative isolate active:scale-[0.98]",
                              isMute
                                ? "bg-[#dc2626]/10 border-[#dc2626]/50 text-[#dc2626] shadow-[inset_0_0_12px_rgba(220,38,38,0.15),0_0_10px_rgba(220,38,38,0.1)]"
                                : "bg-[#08090c] border-white/[0.04] text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#0c0d11]"
                            )}
                          >
                            {/* Breathing Glow - Always rendered, visibility controlled by opacity */}
                            <div
                              className={cn(
                                "absolute -inset-1 bg-[#dc2626]/20 blur-xl rounded -z-10 transition-all duration-500",
                                isMute ? "opacity-100" : "opacity-0"
                              )}
                              style={{ animation: isMute ? 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none' }}
                            ></div>
                            <span className={cn("relative z-10 drop-shadow-md", isMute ? "tracking-wider text-[#dc2626]" : "")}>MUTE</span>
                          </button>
                        </div>

                      </div>
                    </InsetPanel>
                  </div>

                </div>
              </ChassisCard>


            </div>
          </section>
        )}

        {/* Right Column: Outputs - Always visible, but hidden when editing Source */}
        {!editingSourceId && (
          <section
            className={`bg-[#0c0d11] border-l border-white/[0.04] flex flex-col shrink-0 relative z-30 shadow-[-12px_0_40px_-5px_rgba(0,0,0,0.8)] transition-[border-color,box-shadow,background-color] duration-300 ${editingOutputId ? 'z-50 border-l-0' : ''}`}
            style={{ width: `${rightSidebarPercent}%`, minWidth: '220px', maxWidth: '480px' }}
          >
            {/* Resize Handle (Right Sidebar) */}
            {!editingSourceId && !editingOutputId && (
              <div
                className="absolute top-0 bottom-0 -left-1 w-2 z-50 cursor-col-resize hover:bg-[#2eb8cc]/40 transition-colors delay-75"
                onMouseDown={startDragRight}
                onDoubleClick={() => setRightSidebarPercent(18)}
              ></div>
            )}

            <div className="h-10 flex items-end px-2 border-b border-[#1a1b1f] bg-[#0a0b0e]/50">
              <button className="flex-1 pb-2 text-xs font-bold text-[#d4d4d8] border-b-2 border-[#52525b]">OUTPUTS</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              {outputs.map(out => (
                <div key={out.id} className={`transition-opacity duration-300 ${editingOutputId && editingOutputId !== out.id ? 'opacity-20 pointer-events-none blur-[1px]' : ''}`}>
                  <OutputStrip
                    output={out}
                    selected={activeOutput === out.id}
                    onSelect={handleOutputSelect}
                    onSettingsClick={() => setEditingOutputId(out.id)}
                    isMuted={isMute}
                    isEditing={editingOutputId === out.id}
                  />
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-[#1a1b1f]">
                <div className="relative w-full rounded-lg p-2 mb-3 border bg-[#111216] border-[#2a2b30] hover:border-[#3f3f46] transition-colors">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-[#71717a] uppercase tracking-wider">Downmix A</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-[#52525b] font-mono text-[10px]">STEREO</div>
                    <div className="h-6 w-10 bg-[#08090c] rounded border border-[#1a1b1f] shadow-inner"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

      </main>

      <footer className="h-8 bg-[#0c0d11] border-t border-[#1a1b1f] flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-4 text-[9px] text-[#52525b]">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${
              connectionState === 'connected' ? 'bg-emerald-500 shadow-[0_0_4px_rgba(52,211,153,0.6)]' :
              connectionState === 'connecting' ? 'bg-amber-500 animate-pulse' :
              'bg-zinc-600'
            }`}></span>
            {connectionState === 'connected' ? 'MOCK' : connectionState.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2"></div>
      </footer>
    </div>
  );
};

export default App;
