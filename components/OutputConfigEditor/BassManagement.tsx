import React, { useCallback } from 'react';
import { BassManagementConfig, ChannelBassConfig, SubOutput } from '../../types';
import { ArrowLeft, Save, ChevronDown } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

interface BassManagementProps {
  config: BassManagementConfig;
  onChange: (config: BassManagementConfig) => void;
  onBack: () => void;
  themeColor: string;
  format: string;
}

// Mock output ports for subs
const MOCK_SUB_PORTS = Array.from({ length: 8 }, (_, i) => `Analog Out ${17 + i}`);

// Speaker colors
const getSpeakerColorClass = (speaker: string): string => {
  if (['L', 'R', 'C'].includes(speaker)) return 'text-rose-300 bg-rose-500/15 border-rose-400/30';
  if (speaker === 'LFE') return 'text-purple-300 bg-purple-500/15 border-purple-400/30';
  if (['Ltf', 'Rtf', 'Ltm', 'Rtm', 'Ltr', 'Rtr'].includes(speaker)) return 'text-sky-300 bg-sky-500/15 border-sky-400/30';
  return 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30';
};

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

export const BassManagement: React.FC<BassManagementProps> = ({
  config,
  onChange,
  onBack,
  themeColor,
  format,
}) => {
  // Update global settings
  const updateGlobal = useCallback((updates: Partial<BassManagementConfig>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  // Update channel settings
  const updateChannel = useCallback((speakerId: string, updates: Partial<ChannelBassConfig>) => {
    onChange({
      ...config,
      channels: config.channels.map(ch =>
        ch.speakerId === speakerId ? { ...ch, ...updates } : ch
      ),
    });
  }, [config, onChange]);

  // Update sub send for a channel
  const updateSubSend = useCallback((
    speakerId: string,
    subId: string,
    updates: { level?: number; enabled?: boolean }
  ) => {
    onChange({
      ...config,
      channels: config.channels.map(ch => {
        if (ch.speakerId !== speakerId) return ch;
        return {
          ...ch,
          sendToSubs: ch.sendToSubs.map(send =>
            send.subId === subId ? { ...send, ...updates } : send
          ),
        };
      }),
    });
  }, [config, onChange]);

  // Update sub output settings
  const updateSub = useCallback((subId: string, updates: Partial<SubOutput>) => {
    onChange({
      ...config,
      subs: config.subs.map(sub =>
        sub.id === subId ? { ...sub, ...updates } : sub
      ),
    });
  }, [config, onChange]);

  return (
    <div
      className="absolute inset-0 bg-gradient-to-br from-[#0a0a0c] via-[#0c0c0e] to-[#0a0a10] z-50 flex flex-col animate-in slide-in-from-right duration-300"
      style={{
        // @ts-ignore
        '--editor-color': themeColor,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="h-16 border-b border-zinc-800/50 bg-gradient-to-r from-zinc-950/90 via-zinc-900/90 to-zinc-950/90 flex items-center px-6 justify-between shrink-0 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
          >
            <ArrowLeft size={16} />
            <span className="text-[11px] font-bold uppercase tracking-wider">Back</span>
          </button>

          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-bold text-white tracking-wide">BASS MANAGEMENT</h2>
            <div className="text-[10px] text-zinc-500 font-mono">
              Crossover & Subwoofer Routing • {format}
            </div>
          </div>
        </div>

        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg font-bold text-sm transition-all active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
            boxShadow: `0 0 25px ${themeColor}40`,
          }}
        >
          <Save size={16} />
          <span>APPLY</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Global Settings */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="mb-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-4">Global Settings</h3>
          
          <div className="grid grid-cols-4 gap-6">
            {/* Crossover Frequency */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Crossover</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.crossoverFreq}
                  onChange={(e) => updateGlobal({ crossoverFreq: Number(e.target.value) })}
                  min={40}
                  max={200}
                  className="w-20 bg-zinc-800/50 border border-zinc-700/50 rounded px-3 py-2 text-sm font-mono text-white focus:border-zinc-500 outline-none"
                />
                <span className="text-[10px] text-zinc-500">Hz</span>
              </div>
            </div>

            {/* HP Slope */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">HP Slope</label>
              <select
                value={config.hpSlope}
                onChange={(e) => updateGlobal({ hpSlope: e.target.value as any })}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none appearance-none cursor-pointer"
              >
                <option value="6dB/Oct">6 dB/Oct</option>
                <option value="12dB/Oct">12 dB/Oct</option>
                <option value="24dB/Oct">24 dB/Oct</option>
              </select>
            </div>

            {/* LP Slope */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">LP Slope</label>
              <select
                value={config.lpSlope}
                onChange={(e) => updateGlobal({ lpSlope: e.target.value as any })}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none appearance-none cursor-pointer"
              >
                <option value="6dB/Oct">6 dB/Oct</option>
                <option value="12dB/Oct">12 dB/Oct</option>
                <option value="24dB/Oct">24 dB/Oct</option>
              </select>
            </div>

            {/* LFE Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">LFE Filter</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateGlobal({ lfeFilterEnabled: !config.lfeFilterEnabled })}
                  className={`w-10 h-5 rounded-full transition-all ${config.lfeFilterEnabled ? '' : 'bg-zinc-700'}`}
                  style={{ backgroundColor: config.lfeFilterEnabled ? themeColor : undefined }}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${config.lfeFilterEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <input
                  type="number"
                  value={config.lfeFilterFreq}
                  onChange={(e) => updateGlobal({ lfeFilterFreq: Number(e.target.value) })}
                  disabled={!config.lfeFilterEnabled}
                  min={80}
                  max={200}
                  className="w-16 bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1 text-sm font-mono text-white focus:border-zinc-500 outline-none disabled:opacity-50"
                />
                <span className="text-[10px] text-zinc-500">Hz</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Channel Matrix */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="mb-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-4">Channel → Sub Routing</h3>
          
          {/* Table Header */}
          <div className="grid grid-cols-[60px_80px_1fr_1fr_1fr_1fr] gap-2 px-2 py-2 bg-zinc-800/30 rounded-t-lg text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">
            <div>Spkr</div>
            <div>Size</div>
            <div className="text-center">Sub A</div>
            <div className="text-center">Sub B</div>
            <div className="text-center">Sub C</div>
            <div className="text-center">Sub D</div>
          </div>

          {/* Channel Rows */}
          <div className="divide-y divide-zinc-800/50">
            {config.channels.map((ch, idx) => {
              const isLFE = ch.speakerId === 'LFE';
              
              return (
                <div
                  key={ch.speakerId}
                  className={`grid grid-cols-[60px_80px_1fr_1fr_1fr_1fr] gap-2 px-2 py-2.5 items-center ${
                    idx % 2 === 0 ? 'bg-zinc-900/20' : ''
                  }`}
                >
                  {/* Speaker */}
                  <div className={`w-10 h-6 flex items-center justify-center rounded border text-[10px] font-bold ${getSpeakerColorClass(ch.speakerId)}`}>
                    {ch.speakerId}
                  </div>

                  {/* Size */}
                  <select
                    value={ch.size}
                    onChange={(e) => updateChannel(ch.speakerId, { size: e.target.value as any })}
                    disabled={isLFE}
                    className="bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1 text-[11px] text-white focus:border-zinc-500 outline-none appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="Large">Large</option>
                    <option value="Small">Small</option>
                  </select>

                  {/* Sub Sends */}
                  {['A', 'B', 'C', 'D'].map(subId => {
                    const send = ch.sendToSubs.find(s => s.subId === subId);
                    if (!send) return <div key={subId} />;

                    return (
                      <div key={subId} className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => updateSubSend(ch.speakerId, subId, { enabled: !send.enabled })}
                          className={`w-5 h-5 rounded-full border-2 transition-all ${
                            send.enabled 
                              ? 'border-emerald-400 bg-emerald-400/20' 
                              : 'border-zinc-600 bg-zinc-800/50 hover:border-zinc-500'
                          }`}
                        >
                          {send.enabled && (
                            <div className="w-2 h-2 mx-auto rounded-full bg-emerald-400"></div>
                          )}
                        </button>
                        
                        {send.enabled && !isLFE && (
                          <input
                            type="number"
                            value={send.level}
                            onChange={(e) => updateSubSend(ch.speakerId, subId, { level: Number(e.target.value) })}
                            step={0.5}
                            className="w-12 bg-zinc-800/50 border border-zinc-700/50 rounded px-1 py-0.5 text-[10px] font-mono text-center text-white focus:border-zinc-500 outline-none"
                          />
                        )}
                        
                        {!send.enabled && (
                          <span className="text-[10px] text-zinc-600 w-12 text-center">---</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* Sub Outputs */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-4">Subwoofer Outputs</h3>
          
          <div className="grid grid-cols-4 gap-4">
            {config.subs.map(sub => (
              <div
                key={sub.id}
                className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/30"
              >
                {/* Sub Header */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-white">{sub.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateSub(sub.id, { solo: !sub.solo, muted: sub.solo ? sub.muted : false })}
                      className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                        sub.solo 
                          ? 'bg-yellow-400 text-black' 
                          : 'bg-zinc-700/50 text-zinc-500 hover:text-yellow-400'
                      }`}
                    >
                      S
                    </button>
                    <button
                      onClick={() => updateSub(sub.id, { muted: !sub.muted, solo: sub.muted ? sub.solo : false })}
                      className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                        sub.muted 
                          ? 'bg-red-500 text-white' 
                          : 'bg-zinc-700/50 text-zinc-500 hover:text-red-400'
                      }`}
                    >
                      M
                    </button>
                  </div>
                </div>

                {/* Output Port */}
                <div className="mb-3">
                  <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Output</label>
                  <select
                    value={sub.outputPort}
                    onChange={(e) => updateSub(sub.id, { outputPort: e.target.value })}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1.5 text-[11px] text-white focus:border-zinc-500 outline-none appearance-none cursor-pointer"
                  >
                    {MOCK_SUB_PORTS.map(port => (
                      <option key={port} value={port}>{port}</option>
                    ))}
                  </select>
                </div>

                {/* Delay */}
                <div>
                  <label className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Delay</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={sub.delay}
                      onChange={(e) => updateSub(sub.id, { delay: Number(e.target.value) })}
                      step={0.1}
                      min={0}
                      className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1.5 text-[11px] font-mono text-white focus:border-zinc-500 outline-none"
                    />
                    <span className="text-[10px] text-zinc-500">ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BassManagement;
