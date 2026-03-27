import { useDeviceStore } from '../stores/deviceStore';

export const useVolume = () => useDeviceStore(s => s.volume);
export const useMute = () => useDeviceStore(s => s.mute);
export const useDim = () => useDeviceStore(s => s.dim);
export const useSources = () => useDeviceStore(s => s.sources);
export const useActiveSourceIds = () => useDeviceStore(s => s.activeSourceIds);
export const useOutputs = () => useDeviceStore(s => s.outputs);
export const useActiveOutputId = () => useDeviceStore(s => s.activeOutputId);
export const useConnectionState = () => useDeviceStore(s => s.connectionState);
export const useLoudnessStandard = () => useDeviceStore(s => s.loudnessStandard);
export const useRefPresets = () => useDeviceStore(s => s.refPresets);
export const useMeterMonitorMode = () => useDeviceStore(s => s.meterMonitorMode);
export const useDeviceInfo = () => useDeviceStore(s => ({
  sampleRate: s.sampleRate,
  clockSource: s.clockSource,
  deviceName: s.deviceName,
}));

export const useDeviceActions = () => useDeviceStore(s => ({
  setVolume: s.setVolume,
  setMute: s.setMute,
  setDim: s.setDim,
  selectSource: s.selectSource,
  deselectSource: s.deselectSource,
  toggleSourceLock: s.toggleSourceLock,
  selectOutput: s.selectOutput,
  updateSource: s.updateSource,
  updateOutput: s.updateOutput,
  setMeterMonitorMode: s.setMeterMonitorMode,
  setLoudnessStandard: s.setLoudnessStandard,
  setRefPreset: s.setRefPreset,
}));
