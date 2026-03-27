import { DeviceService, ConnectionState, FullDeviceState } from './DeviceService';
import type { Source, Output, OutputChannel, EQBand, BassManagementConfig } from '../../shared/types';

/**
 * Hardware HID Device Service — for hardware engineer to implement
 *
 * Dependency: npm install node-hid
 *
 * Implementation guide: docs/plans/hid-spec/05-implementation-phases.md (Phase 1-5)
 * Parameter reference: docs/plans/hid-spec/06-parameter-reference.md
 */
export class HIDDeviceService extends DeviceService {
  async connect(): Promise<void> { throw new Error('Not implemented — Phase 1'); }
  async disconnect(): Promise<void> { throw new Error('Not implemented'); }
  getConnectionState(): ConnectionState { return 'disconnected'; }
  async requestFullState(): Promise<FullDeviceState> { throw new Error('Not implemented'); }

  setVolume(_db: number) { throw new Error('Not implemented — Phase 1'); }
  setMute(_enabled: boolean) { throw new Error('Not implemented — Phase 1'); }
  setDim(_enabled: boolean) { throw new Error('Not implemented — Phase 1'); }
  selectSource(_id: string) { throw new Error('Not implemented — Phase 2'); }
  deselectSource(_id: string) { throw new Error('Not implemented — Phase 2'); }
  setSourceLock(_id: string, _locked: boolean) { throw new Error('Not implemented — Phase 2'); }
  updateSource(_source: Source) { throw new Error('Not implemented — Phase 2'); }
  selectOutput(_id: string) { throw new Error('Not implemented — Phase 2'); }
  updateOutput(_output: Output) { throw new Error('Not implemented — Phase 2'); }
  setChannelParam(_oid: string, _ch: number, _p: Partial<OutputChannel>) { throw new Error('Not implemented — Phase 3'); }
  setParametricEQ(_oid: string, _ch: number, _bands: EQBand[]) { throw new Error('Not implemented — Phase 4'); }
  setGraphicEQ(_oid: string, _ch: number, _values: number[]) { throw new Error('Not implemented — Phase 4'); }
  setBassManagement(_oid: string, _config: BassManagementConfig) { throw new Error('Not implemented — Phase 4'); }
  setMeterSource(_mode: { type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC'; id?: string }) { throw new Error('Not implemented — Phase 5'); }
  setPinkNoise(_enabled: boolean, _level?: number) { throw new Error('Not implemented — Phase 5'); }
  setChannelPinkNoise(_ch: number, _enabled: boolean) { throw new Error('Not implemented — Phase 5'); }
  setRefPreset(_id: string, _name: string, _level: number) { throw new Error('Not implemented — Phase 5'); }
}
