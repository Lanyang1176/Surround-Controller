import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Output, OutputChannel, BassManagementConfig, EQ_FREQUENCIES, EQBand } from '../../types';
import { ChevronDown, Save, Volume2, ArrowLeft, Settings } from 'lucide-react';
import { ChannelRouting } from './ChannelRouting';
import { SpeakerLayoutSelector } from './SpeakerLayoutSelector';
import { ParametricEQ } from './ParametricEQ';
import { BassManagement } from './BassManagement';

// ═══════════════════════════════════════════════════════════════════════
// Types & Constants
// ═══════════════════════════════════════════════════════════════════════

interface OutputConfigEditorProps {
  output: Output;
  onClose: () => void;
  onSave: (updatedOutput: Output) => void;
  onColorChange?: (outputId: string, color: string) => void;
}

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

// 颜色预设
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

// 获取初始颜色
const getInitialThemeColor = (colorValue: string | undefined): string => {
  if (!colorValue) return '#06b6d4';
  if (colorValue.startsWith('#')) return colorValue;
  return THEME_TO_HEX[colorValue] || '#06b6d4';
};

// 根据格式生成初始通道配置
const getInitialChannels = (format: string): OutputChannel[] => {
  const speakerMap: Record<string, string[]> = {
    '9.1.6': ['L', 'R', 'C', 'LFE', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Lw', 'Rw', 'Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'],
    '7.1.4': ['L', 'R', 'C', 'LFE', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Ltf', 'Rtf', 'Ltr', 'Rtr'],
    '5.1': ['L', 'R', 'C', 'LFE', 'Ls', 'Rs'],
    'Stereo': ['L', 'R'],
  };

  const speakers = speakerMap[format] || speakerMap['9.1.6'];

  return speakers.map((spk, i) => ({
    id: i,
    speaker: spk,
    outputPort: `Analog Out ${i + 1}`,
    trim: 0.0,
    delay: 0,
    delayUnit: 'ms' as const,
    phase: false,
    pinkNoise: false,
    muted: false,
    solo: false,
    eq: new Array(16).fill(0),
    hpf: 0,
    lpf: 0,
    parametricEQ: [],
  }));
};

// 生成初始 Bass Management 配置
const getInitialBassManagement = (format: string): BassManagementConfig => {
  const speakerMap: Record<string, string[]> = {
    '9.1.6': ['L', 'R', 'C', 'LFE', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Lw', 'Rw', 'Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'],
    '7.1.4': ['L', 'R', 'C', 'LFE', 'Ls', 'Rs', 'Lrs', 'Rrs', 'Ltf', 'Rtf', 'Ltr', 'Rtr'],
    '5.1': ['L', 'R', 'C', 'LFE', 'Ls', 'Rs'],
    'Stereo': ['L', 'R'],
  };

  const speakers = speakerMap[format] || speakerMap['9.1.6'];

  return {
    crossoverFreq: 80,
    hpSlope: '12dB/Oct',
    lpSlope: '12dB/Oct',
    lfeFilterEnabled: true,
    lfeFilterFreq: 120,
    lfeFilterSlope: '24dB/Oct',
    channels: speakers.map(spk => ({
      speakerId: spk,
      size: spk === 'LFE' ? 'Large' : 'Small',
      sendToSubs: [
        { subId: 'A', level: 0, enabled: spk !== 'LFE' },
        { subId: 'B', level: 0, enabled: false },
        { subId: 'C', level: 0, enabled: false },
        { subId: 'D', level: 0, enabled: false },
      ],
    })),
    subs: [
      { id: 'A', name: 'Sub A', outputPort: 'Analog Out 17', delay: 0, muted: false, solo: false },
      { id: 'B', name: 'Sub B', outputPort: 'Analog Out 18', delay: 0, muted: false, solo: false },
      { id: 'C', name: 'Sub C', outputPort: 'Analog Out 19', delay: 0, muted: false, solo: false },
      { id: 'D', name: 'Sub D', outputPort: 'Analog Out 20', delay: 0, muted: false, solo: false },
    ],
  };
};

// ═══════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════

export const OutputConfigEditor: React.FC<OutputConfigEditorProps> = ({
  output,
  onClose,
  onSave,
  onColorChange,
}) => {
  // ─────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────
  const [name, setName] = useState(output.name);
  const [format, setFormat] = useState(output.format);
  const [themeColor, setThemeColor] = useState(() => getInitialThemeColor(output.color));
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [currentView, setCurrentView] = useState<'main' | 'bassManagement'>('main');
  const [channels, setChannels] = useState<OutputChannel[]>(() =>
    output.channels || getInitialChannels(output.format)
  );
  const [bassManagement, setBassManagement] = useState<BassManagementConfig>(() =>
    output.bassManagement || getInitialBassManagement(output.format)
  );

  // Speaker selection state
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([channels[0]?.speaker || 'L']);
  const [multiSelectMode, setMultiSelectMode] = useState(false);

  // Pink noise state
  const [pinkNoiseEnabled, setPinkNoiseEnabled] = useState(output.pinkNoise?.enabled || false);
  const [pinkNoiseLevel, setPinkNoiseLevel] = useState(output.pinkNoise?.level || -20);
  const [showPinkNoisePopup, setShowPinkNoisePopup] = useState(false);

  // ─────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────
  const handleColorChange = useCallback((newColor: string) => {
    setThemeColor(newColor);
    if (onColorChange) {
      onColorChange(output.id, newColor);
    }
  }, [onColorChange, output.id]);

  const handleSpeakerSelect = useCallback((speakerId: string, isCtrlPressed: boolean) => {
    if (multiSelectMode || isCtrlPressed) {
      // Multi-select mode
      setSelectedSpeakers(prev => {
        if (prev.includes(speakerId)) {
          return prev.length > 1 ? prev.filter(id => id !== speakerId) : prev;
        }
        return [...prev, speakerId];
      });
    } else {
      // Single select mode
      setSelectedSpeakers([speakerId]);
    }
  }, [multiSelectMode]);

  const handleChannelUpdate = useCallback((channelId: number, updates: Partial<OutputChannel>) => {
    setChannels(prev => prev.map(ch =>
      ch.id === channelId ? { ...ch, ...updates } : ch
    ));
  }, []);

  // Parametric EQ handlers
  const handleParametricEQChange = useCallback((newBands: EQBand[]) => {
    // Apply parametric EQ change to all selected speakers
    setChannels(prev => prev.map(ch => {
      if (selectedSpeakers.includes(ch.speaker)) {
        return { ...ch, parametricEQ: newBands };
      }
      return ch;
    }));
  }, [selectedSpeakers]);

  const handleCopyEQ = useCallback((sourceId: string, targetIds: string[]) => {
    const sourceChannel = channels.find(ch => ch.speaker === sourceId);
    if (!sourceChannel) return;

    setChannels(prev => prev.map(ch => {
      if (targetIds.includes(ch.speaker)) {
        return {
          ...ch,
          parametricEQ: sourceChannel.parametricEQ ? [...sourceChannel.parametricEQ] : [],
        };
      }
      return ch;
    }));
  }, [channels]);

  const handleSave = useCallback(() => {
    onSave({
      ...output,
      name,
      format,
      color: themeColor,
      channels,
      bassManagement,
      pinkNoise: {
        enabled: pinkNoiseEnabled,
        level: pinkNoiseLevel,
      },
    });
    onClose();
  }, [output, name, format, themeColor, channels, bassManagement, pinkNoiseEnabled, pinkNoiseLevel, onSave, onClose]);

  // ─────────────────────────────────────────────────────────────────────
  // Computed values
  // ─────────────────────────────────────────────────────────────────────
  const selectedChannelsParametricEQ = useMemo(() => {
    const selected = channels.filter(ch => selectedSpeakers.includes(ch.speaker));
    if (selected.length === 0) return { bands: [], isMixed: false };
    if (selected.length === 1) return { bands: selected[0].parametricEQ || [], isMixed: false };

    // Check if all selected have same EQ (simplified check)
    const firstEQ = selected[0].parametricEQ || [];
    const isMixed = selected.some(ch => {
      const eq = ch.parametricEQ || [];
      return eq.length !== firstEQ.length;
    });

    return { bands: firstEQ, isMixed };
  }, [channels, selectedSpeakers]);

  // ─────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────

  // Bass Management View
  if (currentView === 'bassManagement') {
    return (
      <BassManagement
        config={bassManagement}
        onChange={setBassManagement}
        onBack={() => setCurrentView('main')}
        themeColor={themeColor}
        format={format}
      />
    );
  }

  // Main View
  return (
    <div
      className="absolute inset-0 bg-gradient-to-br from-[#0a0a0c] via-[#0c0c0e] to-[#0a0a10] backdrop-blur-md z-50 flex flex-col animate-in fade-in duration-300 editor-right-border"
      style={{
        // @ts-ignore - CSS 变量
        '--editor-color': themeColor,
        '--editor-color-soft': `${themeColor}80`,
        '--editor-color-alpha': `${themeColor}25`,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER BAR */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="h-16 border-b border-zinc-800/50 bg-gradient-to-r from-zinc-950/90 via-zinc-900/90 to-zinc-950/90 flex items-center px-6 justify-between shrink-0 shadow-xl relative z-20 backdrop-blur-xl">

        {/* Left: Title & Status */}
        <div className="flex items-center gap-5">
          {/* Theme Color Indicator */}
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-2 h-10 rounded-full transition-all hover:scale-110 cursor-pointer"
            style={{
              backgroundColor: themeColor,
              boxShadow: showColorPicker ? 'none' : `0 0 20px ${themeColor}80`
            }}
            title="Click to change theme color"
          />

          {/* Color Picker Popup */}
          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setShowColorPicker(false)}
              />
              <div className="fixed left-[28px] top-[80px] p-4 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[9999]">
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
              OUTPUT CONFIGURATION
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
              <span>ID: {output.id.toUpperCase()}</span>
              <span className="text-zinc-700">•</span>
              <span style={{ color: `${themeColor}cc` }}>EDIT MODE</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Pink Noise Button */}
          <div className="relative">
            <button
              onClick={() => setShowPinkNoisePopup(!showPinkNoisePopup)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${pinkNoiseEnabled
                ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                : 'bg-zinc-900/80 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'
                }`}
            >
              <Volume2 size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Pink Noise</span>
              {pinkNoiseEnabled && <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse"></span>}
            </button>

            {/* Pink Noise Popup */}
            {showPinkNoisePopup && (
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setShowPinkNoisePopup(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 p-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-[9999]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-zinc-300">Pink Noise Generator</span>
                    <button
                      onClick={() => setPinkNoiseEnabled(!pinkNoiseEnabled)}
                      className={`w-10 h-5 rounded-full transition-all ${pinkNoiseEnabled ? 'bg-pink-500' : 'bg-zinc-700'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${pinkNoiseEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>Level</span>
                      <span className="font-mono">{pinkNoiseLevel} dB</span>
                    </div>
                    <input
                      type="range"
                      min={-60}
                      max={0}
                      value={pinkNoiseLevel}
                      onChange={(e) => setPinkNoiseLevel(Number(e.target.value))}
                      className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${((pinkNoiseLevel + 60) / 60) * 100}%, #3f3f46 ${((pinkNoiseLevel + 60) / 60) * 100}%, #3f3f46 100%)`
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Format Selector */}
          <div className="flex items-center gap-2 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2 hover:border-zinc-600 transition-colors group">
            <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wider">Format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer appearance-none pr-4"
              style={{ color: themeColor }}
            >
              <option value="9.1.6">9.1.6 ATMOS</option>
              <option value="7.1.4">7.1.4</option>
              <option value="5.1">5.1</option>
              <option value="Stereo">STEREO</option>
            </select>
            <ChevronDown size={14} className="text-zinc-500 -ml-3 group-hover:text-zinc-400 transition-colors" />
          </div>

          {/* Bass Management Button */}
          <button
            onClick={() => setCurrentView('bassManagement')}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/80 border border-zinc-700/50 hover:border-zinc-600 text-zinc-300 hover:text-white rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all"
          >
            <Settings size={14} />
            Bass Mgmt
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg font-bold text-sm transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
              boxShadow: `0 0 25px ${themeColor}40`
            }}
          >
            <Save size={16} />
            <span>SAVE & CLOSE</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT - MIRRORED LAYOUT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* LEFT PANEL: Speaker Layout + EQ (MIRRORED - was right) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="w-[49%] flex flex-col bg-gradient-to-br from-[#050508] via-[#08080a] to-[#050508]">

          {/* Speaker Layout Selector (40%) */}
          <div className="h-[40%] border-b border-zinc-800/50 p-4">
            <SpeakerLayoutSelector
              channels={channels}
              selectedSpeakers={selectedSpeakers}
              onSpeakerSelect={handleSpeakerSelect}
              onDeselect={() => setSelectedSpeakers([])}
              onCopyEQ={handleCopyEQ}
              multiSelectMode={multiSelectMode}
              onMultiSelectModeChange={setMultiSelectMode}
              themeColor={themeColor}
              format={format}
            />
          </div>

          {/* Parametric EQ (60%) */}
          <div className="h-[60%] p-4">
            <ParametricEQ
              bands={selectedChannelsParametricEQ.bands}
              onBandsChange={handleParametricEQChange}
              themeColor={themeColor}
              selectedCount={selectedSpeakers.length}
              selectedSpeakers={selectedSpeakers}
            />
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* RIGHT PANEL: Channel Routing (MIRRORED - was left) */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="w-[51%] flex flex-col border-l border-zinc-800/50 bg-gradient-to-b from-[#0a0a0c] to-[#080809]">
          <ChannelRouting
            channels={channels}
            selectedSpeakers={selectedSpeakers}
            onChannelUpdate={handleChannelUpdate}
            onSpeakerSelect={handleSpeakerSelect}
            onDeselect={() => setSelectedSpeakers([])}
            themeColor={themeColor}
            name={name}
            onNameChange={setName}
          />
        </div>
      </div>
    </div>
  );
};

export default OutputConfigEditor;
