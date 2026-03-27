import { EventEmitter } from 'events';
import type { Source, Output, OutputChannel, EQBand, BassManagementConfig } from '../../shared/types';

export interface MeterData {
  levels: number[];    // 16 channels, 0-100 normalized
  peaks: number[];     // 16 channels peak hold
  lufs: { m: number; s: number; i: number; tp: number };
}

export interface DeviceInfo {
  name: string;
  firmwareVersion: string;
  sampleRate: number;
  clockSource: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface FullDeviceState {
  info: DeviceInfo;
  volume: number;
  dim: boolean;
  dimAmount: number;
  mute: boolean;
  sources: Source[];
  activeSourceIds: string[];
  sourceLocks: Record<string, boolean>;
  outputs: Output[];
  activeOutputId: string;
  refPresets: { id: string; name: string; level: number }[];
  meterSource: { type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC'; id?: string };
}

export abstract class DeviceService extends EventEmitter {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getConnectionState(): ConnectionState;
  abstract requestFullState(): Promise<FullDeviceState>;

  abstract setVolume(db: number): void;
  abstract setMute(enabled: boolean): void;
  abstract setDim(enabled: boolean): void;

  abstract selectSource(sourceId: string): void;
  abstract deselectSource(sourceId: string): void;
  abstract setSourceLock(sourceId: string, locked: boolean): void;
  abstract updateSource(source: Source): void;

  abstract selectOutput(outputId: string): void;
  abstract updateOutput(output: Output): void;

  abstract setChannelParam(outputId: string, channelIndex: number, param: Partial<OutputChannel>): void;

  abstract setParametricEQ(outputId: string, channelIndex: number, bands: EQBand[]): void;
  abstract setGraphicEQ(outputId: string, channelIndex: number, values: number[]): void;

  abstract setBassManagement(outputId: string, config: BassManagementConfig): void;

  abstract setMeterSource(mode: { type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC'; id?: string }): void;

  abstract setPinkNoise(enabled: boolean, level?: number): void;
  abstract setChannelPinkNoise(channelIndex: number, enabled: boolean): void;

  abstract setRefPreset(id: string, name: string, level: number): void;
}
