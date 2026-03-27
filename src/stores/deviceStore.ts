import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Source, Output } from '../../shared/types';

export interface MeterMonitorMode {
  type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC';
  id?: string;
}

export interface RefPreset {
  id: string;
  name: string;
  level: number;
}

interface DeviceState {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  volume: number;       // dB (-96 to +12)
  mute: boolean;
  dim: boolean;
  sources: Source[];
  activeSourceIds: string[];
  outputs: Output[];
  activeOutputId: string;
  meterMonitorMode: MeterMonitorMode;
  loudnessStandard: string;
  refPresets: RefPreset[];
  sampleRate: number;
  clockSource: string;
  deviceName: string;
  firmwareVersion: string;
}

interface DeviceActions {
  applyFullState: (state: any) => void;
  setConnectionState: (state: DeviceState['connectionState']) => void;
  setVolume: (db: number) => void;
  setMute: (muted: boolean) => void;
  setDim: (dimmed: boolean) => void;
  selectSource: (id: string) => void;
  deselectSource: (id: string) => void;
  toggleSourceLock: (id: string) => void;
  selectOutput: (id: string) => void;
  updateSource: (source: Source) => void;
  updateOutput: (output: Output) => void;
  setMeterMonitorMode: (mode: MeterMonitorMode) => void;
  setLoudnessStandard: (name: string) => void;
  setRefPreset: (id: string, name: string, level: number) => void;
}

const sendCmd = (command: string, ...args: any[]) => {
  window.electronAPI?.sendCommand(command, ...args);
};

export const useDeviceStore = create<DeviceState & DeviceActions>()(
  subscribeWithSelector((set, get) => ({
    connectionState: 'disconnected',
    volume: -20,
    mute: false,
    dim: false,
    sources: [],
    activeSourceIds: [],
    outputs: [],
    activeOutputId: '',
    meterMonitorMode: { type: 'FOLLOW_INPUT' as const },
    loudnessStandard: 'Netflix',
    refPresets: [],
    sampleRate: 48000,
    clockSource: 'Internal',
    deviceName: '',
    firmwareVersion: '',

    applyFullState: (state) => set({
      volume: state.volume ?? -20,
      mute: state.mute ?? false,
      dim: state.dim ?? false,
      // Merge sourceLocks into Source.locked
      sources: (state.sources ?? []).map((s: Source) => ({
        ...s,
        locked: state.sourceLocks?.[s.id] ?? s.locked ?? false,
      })),
      activeSourceIds: state.activeSourceIds ?? [],
      outputs: state.outputs ?? [],
      activeOutputId: state.activeOutputId ?? '',
      refPresets: state.refPresets ?? [],
      meterMonitorMode: state.meterSource ?? { type: 'FOLLOW_INPUT' },
      sampleRate: state.info?.sampleRate ?? 48000,
      clockSource: state.info?.clockSource ?? 'Internal',
      deviceName: state.info?.name ?? '',
      firmwareVersion: state.info?.firmwareVersion ?? '',
    }),

    setConnectionState: (cs) => set({ connectionState: cs }),

    setVolume: (db) => { set({ volume: db }); sendCmd('setVolume', db); },
    setMute: (m) => { set({ mute: m }); sendCmd('setMute', m); },
    setDim: (d) => { set({ dim: d }); sendCmd('setDim', d); },

    selectSource: (id) => {
      const { activeSourceIds, sources } = get();
      if (activeSourceIds.includes(id)) {
        // Already active -- deselect
        set({ activeSourceIds: activeSourceIds.filter(sid => sid !== id) });
        sendCmd('deselectSource', id);
        return;
      }
      const locked = activeSourceIds.filter(sid => {
        const s = sources.find(src => src.id === sid);
        return s?.locked;
      });
      set({ activeSourceIds: [...locked, id] });
      sendCmd('selectSource', id);
    },

    deselectSource: (id) => {
      set(s => ({ activeSourceIds: s.activeSourceIds.filter(sid => sid !== id) }));
      sendCmd('deselectSource', id);
    },

    toggleSourceLock: (id) => {
      set(s => ({
        sources: s.sources.map(src =>
          src.id === id ? { ...src, locked: !src.locked } : src
        ),
      }));
      const source = get().sources.find(s => s.id === id);
      sendCmd('setSourceLock', id, source?.locked ?? false);
    },

    selectOutput: (id) => { set({ activeOutputId: id }); sendCmd('selectOutput', id); },

    updateSource: (source) => {
      set(s => ({ sources: s.sources.map(src => src.id === source.id ? source : src) }));
      sendCmd('updateSource', source);
    },

    updateOutput: (output) => {
      set(s => ({ outputs: s.outputs.map(o => o.id === output.id ? output : o) }));
      sendCmd('updateOutput', output);
    },

    setMeterMonitorMode: (mode) => { set({ meterMonitorMode: mode }); sendCmd('setMeterSource', mode); },
    setLoudnessStandard: (name) => set({ loudnessStandard: name }),

    setRefPreset: (id, name, level) => {
      set(s => ({
        refPresets: s.refPresets.map(r => r.id === id ? { ...r, name, level } : r),
      }));
      sendCmd('setRefPreset', id, name, level);
    },
  }))
);
