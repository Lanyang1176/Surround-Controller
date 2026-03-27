import React, { useState, useEffect } from 'react';
import { Source, Speaker } from '../types';
import { Settings, X, ChevronDown, Activity, Power, Mic2, Save } from 'lucide-react';
import { Knob } from './Knob';
import { Visualizer } from './Visualizer';

interface SourceConfigEditorProps {
    source: Source;
    onClose: () => void;
    onSave: (updatedSource: Source) => void;
    onColorChange?: (sourceId: string, color: string) => void; // Real-time color sync
}

// Mock Input Channels
const MOCK_INPUT_CHANNELS = Array.from({ length: 32 }, (_, i) => `Analog Input ${i + 1} `);

// Speaker Positions for 9.1.6 (Normalized -1 to 1 for x/y, 0-1+ for z)
// Optimized vertical spacing for clearer layout
const SPEAKER_POSITIONS: Record<string, { x: number, y: number, z: number }> = {
    // Front Row
    'L': { x: -0.6, y: -0.85, z: 0 },
    'R': { x: 0.6, y: -0.85, z: 0 },
    'C': { x: 0, y: -0.85, z: 0 },
    // LFE - Off Center front
    'LFE': { x: 0.35, y: -0.85, z: 0 },
    // Wide - Between front and surround
    'Lw': { x: -0.85, y: -0.3, z: 0 },
    'Rw': { x: 0.85, y: -0.3, z: 0 },
    // Surround - Side position
    'Ls': { x: -0.95, y: 0.2, z: 0 },
    'Rs': { x: 0.95, y: 0.2, z: 0 },
    // Rear Surround - Pushed back
    'Lrs': { x: -0.7, y: 0.85, z: 0 },
    'Rrs': { x: 0.7, y: 0.85, z: 0 },
    // Top Front
    'Ltf': { x: -0.4, y: -0.4, z: 1.2 },
    'Rtf': { x: 0.4, y: -0.4, z: 1.2 },
    // Top Middle
    'Ltm': { x: -0.5, y: 0.15, z: 1.2 },
    'Rtm': { x: 0.5, y: 0.15, z: 1.2 },
    // Top Rear
    'Ltr': { x: -0.4, y: 0.7, z: 1.2 },
    'Rtr': { x: 0.4, y: 0.7, z: 1.2 }
};

// 主题名到 HEX 颜色的映射
const THEME_TO_HEX: Record<string, string> = {
    'amber': '#f59e0b',
    'blue': '#3b82f6',
    'green': '#22c55e',
    'purple': '#a855f7',
    'red': '#ef4444',
    'cyan': '#06b6d4',
    'yellow': '#eab308',
    'orange': '#f97316',
    'lime': '#84cc16',
    'teal': '#14b8a6',
    'indigo': '#6366f1',
};

// 获取初始颜色的辅助函数
const getInitialThemeColor = (colorValue: string | undefined): string => {
    if (!colorValue) return '#06b6d4'; // 默认 cyan
    if (colorValue.startsWith('#')) return colorValue; // 已经是 hex
    return THEME_TO_HEX[colorValue] || '#06b6d4'; // 从映射获取
};

// Helper to generate initial channel config if missing
const getInitialChannels = (format: string) => {
    const count = format === '9.1.6' ? 16 : format === '7.1.4' ? 12 : format === '5.1' ? 6 : 2;
    const speakers = [
        'L', 'R', 'C', 'LFE', 'Ls', 'Rs', 'Lrs', 'Rrs',
        'Lw', 'Rw', 'Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'
    ].slice(0, count);

    return speakers.map((spk, i) => ({
        id: i,
        speaker: spk,
        inputChannel: MOCK_INPUT_CHANNELS[i] || 'Unassigned',
        trim: 0.0,
        muted: false,
        solo: false,
    }));
};

export const SourceConfigEditor: React.FC<SourceConfigEditorProps> = ({ source, onClose, onSave, onColorChange }) => {
    const [name, setName] = useState(source.name);
    const [format, setFormat] = useState(source.format);
    const [mainTrim, setMainTrim] = useState(0);
    const [themeColor, setThemeColor] = useState(() => getInitialThemeColor(source.color));
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [channelConfig, setChannelConfig] = useState(() => getInitialChannels(source.format));
    const [meterLevels, setMeterLevels] = useState<number[]>(new Array(16).fill(0));
    const [hoveredSpeaker, setHoveredSpeaker] = useState<string | null>(null);

    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

    // Helper for Speaker Colors (Matches Visualizer Logic)
    const getSpeakerColor = (speaker: string) => {
        // BRIGHTENED: Using 300 shades instead of 400 for better visibility
        if (['L', 'R', 'C'].includes(speaker)) return 'text-rose-300 font-bold border-rose-400/40 bg-rose-500/15 shadow-[0_0_10px_rgba(251,113,133,0.3)]';
        if (speaker === 'LFE') return 'text-purple-300 font-bold border-purple-400/40 bg-purple-500/15 shadow-[0_0_10px_rgba(192,132,252,0.3)]';
        // Height speakers check: typically have 't' (Top)
        if (['Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'].includes(speaker)) return 'text-sky-300 font-bold border-sky-400/40 bg-sky-500/15 shadow-[0_0_10px_rgba(56,189,248,0.3)]';
        // Surrounds and Wides
        return 'text-emerald-300 font-bold border-emerald-400/40 bg-emerald-500/15 shadow-[0_0_10px_rgba(52,211,153,0.3)]';
    };

    // 获取通道左侧边框颜色（根据音箱类型）
    const getChannelBorderColor = (speaker: string): string => {
        if (['L', 'R', 'C'].includes(speaker)) return 'border-l-rose-400';
        if (speaker === 'LFE') return 'border-l-purple-400';
        if (['Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'].includes(speaker)) return 'border-l-sky-400';
        // Surrounds and Wides
        return 'border-l-emerald-400';
    };

    // Color Presets
    const COLOR_PRESETS = [
        '#06b6d4', // cyan
        '#3b82f6', // blue
        '#8b5cf6', // violet
        '#ec4899', // pink
        '#f43f5e', // rose
        '#f97316', // orange
        '#eab308', // yellow
        '#22c55e', // green
        '#14b8a6', // teal
        '#6366f1', // indigo
    ];

    // Helper to update color and sync to parent in real-time
    const handleColorChange = (newColor: string) => {
        setThemeColor(newColor);
        if (onColorChange) {
            onColorChange(source.id, newColor);
        }
    };

    // Simulated Metering
    useEffect(() => {
        const interval = setInterval(() => {
            setMeterLevels(prev => prev.map(() => Math.random() * 60 - 60));
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleSpeakerClick = (speakerId: string, mode: 'SOLO' | 'MUTE') => {
        // Interaction Update: Click ONLY selects the channel (Edit Focus)
        // Solo/Mute is handled via Drag Select or List controls
        setSelectedChannelId(prev => prev === speakerId ? null : speakerId);
    };

    const handleCleanAll = () => {
        setChannelConfig(prev => prev.map(ch => ({
            ...ch,
            solo: false,
            muted: false
        })));
    };

    const handleSave = () => {
        onSave({ ...source, name, format, color: themeColor });
        onClose();
    };

    // Compute Speaker Overrides for Visualizer
    const speakerOverrides = React.useMemo(() => {
        const overrides: Record<string, { color?: string; ring?: string; opacity?: number }> = {};

        channelConfig.forEach(ch => {
            if (ch.solo) {
                // Fix: Do not force Yellow color. Let Visualizer use Group Theme.
                overrides[ch.speaker] = {
                    opacity: 1
                };
            } else if (ch.muted) {
                overrides[ch.speaker] = {
                    color: 'bg-red-500',
                    ring: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]',
                    opacity: 1
                };
            } else if (hoveredSpeaker === ch.speaker) {
                overrides[ch.speaker] = {
                    ring: 'border-white shadow-[0_0_10px_white]',
                    opacity: 1
                };
            }
        });
        return overrides;
    }, [channelConfig, hoveredSpeaker]);

    // Construct Speaker Objects for Visualizer
    const currentSpeakers: Speaker[] = React.useMemo(() => {
        return channelConfig.map(ch => ({
            id: ch.speaker,
            x: SPEAKER_POSITIONS[ch.speaker]?.x || 0,
            y: SPEAKER_POSITIONS[ch.speaker]?.y || 0,
            z: SPEAKER_POSITIONS[ch.speaker]?.z || 0,
            label: ch.speaker,

        }));
    }, [channelConfig]);



    return (
        <div
            className="absolute inset-0 bg-gradient-to-br from-[#0a0a0c] via-[#0c0c0e] to-[#0a0a10] backdrop-blur-md z-50 flex flex-col animate-in fade-in duration-300 editor-left-border"
            style={{
                // @ts-ignore - CSS 变量
                '--editor-color-soft': `${themeColor}80`,
                '--editor-color-alpha': `${themeColor}25`,
            }}
        >

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* HEADER BAR - Premium Pro Audio Style */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            <div className="h-16 border-b border-zinc-800/50 bg-gradient-to-r from-zinc-950/90 via-zinc-900/90 to-zinc-950/90 flex items-center px-6 justify-between shrink-0 shadow-xl relative z-20 backdrop-blur-xl">

                {/* Left: Title & Status */}
                <div className="flex items-center gap-5">
                    {/* Theme Color Indicator - Clickable to open picker */}
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-2 h-10 rounded-full transition-all hover:scale-110 cursor-pointer"
                        style={{
                            backgroundColor: themeColor,
                            boxShadow: showColorPicker ? 'none' : `0 0 20px ${themeColor}80`
                        }}
                        title="Click to change theme color"
                    />

                    {/* Color Picker Modal - Positioned closer to trigger */}
                    {showColorPicker && (
                        <>
                            {/* Backdrop - Click to close */}
                            <div
                                className="fixed inset-0 z-[9998]"
                                onClick={() => setShowColorPicker(false)}
                            />
                            {/* Popup Panel - Closer to trigger */}
                            <div
                                className="fixed left-[28px] top-[80px] p-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[9999]"
                            >
                                {/* Arrow pointing to trigger */}
                                <div className="absolute -top-2 left-3 w-4 h-4 bg-zinc-900 border-l border-t border-zinc-700 rotate-45"></div>
                                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Theme Color</div>
                                <div className="grid grid-cols-5 gap-2">
                                    {COLOR_PRESETS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => {
                                                handleColorChange(color);
                                                setShowColorPicker(false);
                                            }}
                                            className={`w-7 h-7 rounded-full transition-all hover:scale-110 hover:shadow-lg ${themeColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : ''}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                {/* Custom Color Input */}
                                <div className="mt-3 pt-3 border-t border-zinc-700/50 flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={themeColor}
                                        onChange={(e) => handleColorChange(e.target.value)}
                                        className="w-7 h-7 rounded cursor-pointer bg-transparent border-0"
                                    />
                                    <span className="text-xs font-mono text-zinc-300 tracking-wide">{themeColor.toUpperCase()}</span>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-3">
                            INPUT CONFIGURATION
                            <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-full border border-zinc-700/50">
                                {format}
                            </span>
                        </h2>
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono tracking-wide">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                LIVE
                            </span>
                            <span className="text-zinc-700">•</span>
                            <span>ID: {source.id.toUpperCase()}</span>
                            <span className="text-zinc-700">•</span>
                            <span className="text-cyan-400/80">EDIT MODE</span>
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* Format Selector - Pill Style */}
                    <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2 hover:border-zinc-600 transition-colors group">
                        <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Format</span>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="bg-transparent text-cyan-400 font-bold text-sm outline-none cursor-pointer appearance-none pr-4"
                            style={{ backgroundImage: 'none' }}
                        >
                            <option value="9.1.6">9.1.6 ATMOS</option>
                            <option value="7.1.4">7.1.4</option>
                            <option value="5.1">5.1</option>
                            <option value="Stereo">STEREO</option>
                        </select>
                        <ChevronDown size={14} className="text-zinc-500 -ml-3 group-hover:text-zinc-400 transition-colors" />
                    </div>

                    {/* Save Button - Gradient with Glow */}
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-bold text-sm transition-all shadow-[0_0_25px_rgba(8,145,178,0.4)] hover:shadow-[0_0_35px_rgba(8,145,178,0.6)] active:scale-95"
                    >
                        <Save size={16} />
                        <span>SAVE & CLOSE</span>
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* MAIN SPLIT LAYOUT */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            <div className="flex-1 flex overflow-hidden">

                {/* ─────────────────────────────────────────────────────────────────── */}
                {/* LEFT PANEL: Channel Matrix */}
                {/* ─────────────────────────────────────────────────────────────────── */}
                <div className="w-[58%] flex flex-col border-r border-zinc-800/50 bg-gradient-to-b from-[#0a0a0c] to-[#080809]">

                    {/* Sub-Header / Toolbar */}
                    <div className="px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/20 flex items-center justify-between shrink-0">

                        {/* Source Name Input - Floating Label Style */}
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Source Name</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-zinc-900/60 border border-zinc-700/50 rounded-lg px-4 py-2 text-base font-bold text-white focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20 outline-none w-56 shadow-inner transition-all placeholder-zinc-600"
                                placeholder="Enter source name..."
                            />
                        </div>

                        {/* Main Trim Control - Professional Knob */}
                        <div className="flex items-center gap-4">
                            <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Main Trim</label>
                            <div className="flex items-center gap-3">
                                <Knob
                                    value={(mainTrim + 60) / 72 * 100}
                                    onChange={(v) => setMainTrim((v / 100 * 72) - 60)}
                                    size={48}
                                    color={themeColor}
                                />
                                <span className="text-cyan-400 font-mono text-xs font-bold tabular-nums bg-zinc-900/60 px-2 py-1 rounded border border-zinc-700/30">
                                    {mainTrim > 0 ? '+' : ''}{mainTrim.toFixed(1)} dB
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Table Header - Enhanced Visual Hierarchy */}
                    <div className="grid grid-cols-[36px_56px_1fr_120px_56px_72px] gap-2 px-4 py-2.5 bg-zinc-900/80 text-[9px] font-semibold text-zinc-400 uppercase tracking-[0.15em] border-b border-zinc-700/50 shrink-0 backdrop-blur-sm">
                        <div className="text-center">#</div>
                        <div className="text-center">Spkr</div>
                        <div>Input Source</div>
                        <div className="text-center">Level</div>
                        <div className="text-center">Trim</div>
                        <div className="text-center">S / M</div>
                    </div>

                    {/* Rows - Scrollable with Enhanced UX */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {channelConfig.map((ch, idx) => {
                            const isEven = idx % 2 === 0;
                            const isSelected = selectedChannelId === ch.speaker;
                            const meterValue = Math.min(100, Math.max(0, (meterLevels[idx] + 60) / 60 * 100));
                            const isHot = meterValue > 85;
                            const speakerColorClass = getSpeakerColor(ch.speaker);

                            return (
                                <div
                                    key={ch.id}
                                    className={`
                                        grid grid-cols-[36px_56px_1fr_120px_56px_72px] gap-2 px-4 py-2 
                                        border-b border-zinc-800/40 items-center 
                                        transition-all duration-150 group cursor-pointer
                                        ${isSelected ? `bg-white/5 border-l-2 ${getChannelBorderColor(ch.speaker)} pl-[14px]` : 'hover:bg-white/5 hover:border-l-2 hover:border-l-white/20 hover:pl-[14px]'}
                                        ${!isSelected && isEven ? 'bg-zinc-900/20' : ''}
                                    `}
                                    onMouseEnter={() => setHoveredSpeaker(ch.speaker)}
                                    onMouseLeave={() => setHoveredSpeaker(null)}
                                    onClick={() => setSelectedChannelId(prev => prev === ch.speaker ? null : ch.speaker)}
                                >
                                    {/* Index - Enhanced Visibility */}
                                    <div className="text-center text-zinc-400 font-mono text-[11px] font-medium group-hover:text-zinc-200 transition-colors">
                                        {idx + 1}
                                    </div>

                                    {/* Speaker Label - COLOR CODED */}
                                    <div className="flex justify-center">
                                        <div className={`
                                            w-10 h-5 flex items-center justify-center rounded border
                                            text-[10px] font-bold tracking-wide transition-all
                                            ${speakerColorClass}
                                            ${isSelected ? 'scale-110 shadow-lg brightness-125' : ''}
                                        `}>
                                            {ch.speaker}
                                        </div>
                                    </div>

                                    {/* Input Channel Selector - Polished */}
                                    <div className="relative">
                                        <select className="w-full bg-zinc-900/60 border border-zinc-700/50 rounded-md px-2.5 py-1.5 text-[11px] text-zinc-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none appearance-none cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/60 transition-all truncate pr-6 shadow-inner">
                                            {MOCK_INPUT_CHANNELS.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none group-hover:text-zinc-400" />
                                    </div>

                                    {/* Meter - Professional Audio Style */}
                                    <div className="flex items-center gap-1.5">
                                        <div className={`flex-1 h-2 bg-zinc-900 rounded overflow-hidden relative border transition-colors ${isHot ? 'border-yellow-500/50' : 'border-zinc-800/50'}`}>
                                            <div
                                                className={`h-full transition-all duration-75 ease-out rounded-sm ${isHot
                                                    ? 'bg-gradient-to-r from-emerald-600 via-yellow-500 to-red-500'
                                                    : 'bg-gradient-to-r from-emerald-800 via-emerald-500 to-cyan-400'
                                                    }`}
                                                style={{ width: `${meterValue}%` }}
                                            />
                                            {isHot && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-red-400/30 animate-pulse" />
                                            )}
                                        </div>
                                    </div>

                                    {/* TRIM Value - Pill Style */}
                                    <div className="flex justify-center">
                                        <span className="text-[10px] font-mono text-zinc-400 tabular-nums bg-zinc-800/50 px-2 py-0.5 rounded group-hover:bg-zinc-700/50 group-hover:text-zinc-300 transition-colors">
                                            {ch.trim.toFixed(1)}
                                        </span>
                                    </div>

                                    {/* State Buttons - Pill Container */}
                                    <div className="flex justify-center">
                                        <div className="flex gap-1 bg-zinc-800/40 rounded-md p-0.5">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Avoid triggering selection
                                                    const newConf = [...channelConfig];
                                                    newConf[idx].solo = !newConf[idx].solo;
                                                    if (newConf[idx].solo) newConf[idx].muted = false;
                                                    setChannelConfig(newConf);
                                                }}
                                                className={`
                                                    w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all
                                                    ${ch.solo
                                                        ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(250,204,21,0.5)]'
                                                        : 'text-zinc-500 hover:text-yellow-400 hover:bg-yellow-400/10'}
                                                `}
                                            >
                                                S
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newConf = [...channelConfig];
                                                    newConf[idx].muted = !newConf[idx].muted;
                                                    if (newConf[idx].muted) newConf[idx].solo = false;
                                                    setChannelConfig(newConf);
                                                }}
                                                className={`
                                                    w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all
                                                    ${ch.muted
                                                        ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                                                        : 'text-zinc-500 hover:text-red-400 hover:bg-red-400/10'}
                                                `}
                                            >
                                                M
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────────── */}
                {/* RIGHT PANEL: 3D Visualizer */}
                {/* ─────────────────────────────────────────────────────────────────── */}
                <div className="w-[42%] relative flex flex-col p-4 bg-gradient-to-br from-[#050508] via-[#08080a] to-[#050508]">

                    {/* Ambient Glow Effects - Dynamic Color (Enhanced) */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div
                            className="absolute -top-48 -right-48 w-96 h-96 rounded-full blur-[100px]"
                            style={{ backgroundColor: `${themeColor}18` }}
                        ></div>
                        <div
                            className="absolute -bottom-48 -left-48 w-96 h-96 rounded-full blur-[100px]"
                            style={{ backgroundColor: `${themeColor}18` }}
                        ></div>
                        {/* Center subtle glow */}
                        <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-[150px]"
                            style={{ backgroundColor: `${themeColor}08` }}
                        ></div>
                    </div>

                    {/* Main Visualizer Container - with hover group */}
                    <div className="flex-1 relative border border-zinc-800/50 rounded-2xl bg-gradient-to-b from-[#0a0a0c] to-[#050506] shadow-2xl overflow-hidden group/viz transition-all duration-300 hover:border-opacity-80"
                        style={{ ['--theme-color' as string]: themeColor }}
                    >

                        {/* Visualizer Component */}
                        <Visualizer
                            speakers={currentSpeakers}
                            active={true}
                            interactionMode="SOLO"
                            speakerOverrides={speakerOverrides}
                            onSpeakerClick={handleSpeakerClick}
                            onCleanAll={handleCleanAll}
                            formatLabel={format}
                            variant="editor"
                            themeColor={themeColor}
                            highlightedId={selectedChannelId}
                            disableInternalSelection={true}
                            activeSpeakerIds={channelConfig.filter(ch => ch.solo).map(ch => ch.speaker)}
                        />

                        {/* Corner Accents - Dynamic Theme Color with Hover Enhancement */}
                        <div className="absolute inset-0 pointer-events-none z-50">
                            <div
                                className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 rounded-tl-2xl pointer-events-none transition-all duration-300 group-hover/viz:w-20 group-hover/viz:h-20 z-50"
                                style={{
                                    borderColor: `${themeColor}50`,
                                    boxShadow: 'none'
                                }}
                            ></div>
                            <div
                                className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 rounded-tr-2xl pointer-events-none transition-all duration-300 group-hover/viz:w-20 group-hover/viz:h-20 z-50"
                                style={{
                                    borderColor: `${themeColor}50`
                                }}
                            ></div>
                            <div
                                className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 rounded-bl-2xl pointer-events-none transition-all duration-300 group-hover/viz:w-20 group-hover/viz:h-20 z-50"
                                style={{
                                    borderColor: `${themeColor}35`
                                }}
                            ></div>
                            <div
                                className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 rounded-br-2xl pointer-events-none transition-all duration-300 group-hover/viz:w-20 group-hover/viz:h-20 z-50"
                                style={{
                                    borderColor: `${themeColor}35`
                                }}
                            ></div>

                            {/* Hover Glow Overlay for corners */}
                            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/viz:opacity-100 transition-opacity duration-300 z-40">
                                <div className="absolute top-0 left-0 w-24 h-24 rounded-tl-2xl" style={{ boxShadow: `inset 20px 20px 40px ${themeColor}15` }}></div>
                                <div className="absolute top-0 right-0 w-24 h-24 rounded-tr-2xl" style={{ boxShadow: `inset -20px 20px 40px ${themeColor}15` }}></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-bl-2xl" style={{ boxShadow: `inset 20px -20px 40px ${themeColor}15` }}></div>
                                <div className="absolute bottom-0 right-0 w-24 h-24 rounded-br-2xl" style={{ boxShadow: `inset -20px -20px 40px ${themeColor}15` }}></div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};
