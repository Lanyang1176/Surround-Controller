import {
  DeviceService,
  ConnectionState,
  FullDeviceState,
  MeterData,
} from './DeviceService';
import type { Source, Output, OutputChannel, EQBand, BassManagementConfig } from '../../shared/types';

// ── Inlined channel data (no cross-boundary imports from src/) ──────────────

const FORMAT_CHANNELS: Record<string, string[]> = {
  '9.1.6': ['L','R','C','LFE','Ls','Rs','Lrs','Rrs','Lw','Rw','Ltf','Rtf','Ltm','Rtm','Ltr','Rtr'],
  '7.1.4': ['L','R','C','LFE','Ls','Rs','Lrs','Rrs','Ltf','Rtf','Ltr','Rtr'],
  '5.1': ['L','R','C','LFE','Ls','Rs'],
  'Stereo': ['L','R'],
};

const CHANNEL_IDS = ['L','R','C','LFE','Ls','Rs','Lrs','Rrs','Lw','Rw','Ltf','Rtf','Ltm','Rtm','Ltr','Rtr'];

// ── Mock data (mirrored from App.tsx) ───────────────────────────────────────

const INITIAL_SOURCES: Source[] = [
  { id: 's1', name: 'Source A', format: '9.1.6', active: true, color: 'amber', assigned: true, locked: false },
  { id: 's2', name: 'Source B', format: '7.1.4', active: false, color: 'blue', assigned: true, locked: false },
  { id: 's3', name: 'Source C', format: 'Stereo', active: false, color: 'green', assigned: false, locked: false },
  { id: 's4', name: 'Source D', format: '5.1', active: false, color: 'purple', assigned: true, locked: false },
  { id: 's5', name: 'Source E', format: 'Stereo', active: false, color: 'red', assigned: true, locked: false },
];

const MOCK_OUTPUTS: Output[] = [
  { id: 'o1', name: 'Main', format: '9.1.6', active: true, color: 'cyan' },
  { id: 'o2', name: 'Alt 1', format: 'Stereo', active: false, color: 'yellow' },
  { id: 'o3', name: 'Alt 2', format: '5.1', active: false, color: 'orange' },
  { id: 'o4', name: 'Alt 3', format: 'Stereo', active: false, color: 'lime' },
];

// ── MockDeviceService ───────────────────────────────────────────────────────

export class MockDeviceService extends DeviceService {
  private connectionState: ConnectionState = 'disconnected';
  private meterInterval: ReturnType<typeof setInterval> | null = null;

  // In-memory state
  private volume = 75;
  private dim = false;
  private dimAmount = -20;
  private mute = false;
  private sources: Source[] = JSON.parse(JSON.stringify(INITIAL_SOURCES));
  private activeSourceIds: string[] = ['s1'];
  private sourceLocks: Record<string, boolean> = {};
  private outputs: Output[] = JSON.parse(JSON.stringify(MOCK_OUTPUTS));
  private activeOutputId = 'o1';
  private refPresets = [
    { id: 'ref1', name: 'Ref 1', level: -20 },
    { id: 'ref2', name: 'Ref 2', level: -14 },
    { id: 'ref3', name: 'Ref 3', level: -10 },
  ];
  private meterSource: { type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC'; id?: string } = { type: 'FOLLOW_INPUT' };

  // Meter simulation state
  private meterLevels: number[] = new Array(16).fill(0);
  private meterPeaks: number[] = new Array(16).fill(0);
  private lufsLevel = 0;

  // ── Connection ──────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    this.connectionState = 'connecting';
    this.emit('connection', this.connectionState);

    // Simulate brief connection handshake
    await new Promise((resolve) => setTimeout(resolve, 200));

    this.connectionState = 'connected';
    this.emit('connection', this.connectionState);
    this.startMeterSimulation();
  }

  async disconnect(): Promise<void> {
    this.stopMeterSimulation();
    this.connectionState = 'disconnected';
    this.emit('connection', this.connectionState);
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  // ── Full State ──────────────────────────────────────────────────────────

  async requestFullState(): Promise<FullDeviceState> {
    return {
      info: {
        name: 'TOPPING 16 Mon',
        firmwareVersion: '1.0.0-mock',
        sampleRate: 48000,
        clockSource: 'Internal',
      },
      volume: this.volume,
      dim: this.dim,
      dimAmount: this.dimAmount,
      mute: this.mute,
      sources: this.sources,
      activeSourceIds: this.activeSourceIds,
      sourceLocks: this.sourceLocks,
      outputs: this.outputs,
      activeOutputId: this.activeOutputId,
      refPresets: this.refPresets,
      meterSource: this.meterSource,
    };
  }

  // ── Volume / Mute / Dim ─────────────────────────────────────────────────

  setVolume(db: number): void {
    this.volume = db;
    this.emitStateChanged();
  }

  setMute(enabled: boolean): void {
    this.mute = enabled;
    this.emitStateChanged();
  }

  setDim(enabled: boolean): void {
    this.dim = enabled;
    this.emitStateChanged();
  }

  // ── Sources ─────────────────────────────────────────────────────────────

  selectSource(sourceId: string): void {
    if (!this.activeSourceIds.includes(sourceId)) {
      // Keep locked sources, replace unlocked with new selection
      const locked = this.activeSourceIds.filter((id) => this.sourceLocks[id]);
      this.activeSourceIds = [...locked, sourceId];
    }
    this.emitStateChanged();
  }

  deselectSource(sourceId: string): void {
    this.activeSourceIds = this.activeSourceIds.filter((id) => id !== sourceId);
    this.emitStateChanged();
  }

  setSourceLock(sourceId: string, locked: boolean): void {
    this.sourceLocks[sourceId] = locked;
    this.emitStateChanged();
  }

  updateSource(source: Source): void {
    this.sources = this.sources.map((s) => (s.id === source.id ? source : s));
    this.emitStateChanged();
  }

  // ── Outputs ─────────────────────────────────────────────────────────────

  selectOutput(outputId: string): void {
    this.activeOutputId = outputId;
    this.emitStateChanged();
  }

  updateOutput(output: Output): void {
    this.outputs = this.outputs.map((o) => (o.id === output.id ? output : o));
    this.emitStateChanged();
  }

  // ── Channel Params (Phase 3 — stub) ─────────────────────────────────────

  setChannelParam(_outputId: string, _channelIndex: number, _param: Partial<OutputChannel>): void {
    // Phase 3: will apply param to channel in-memory
  }

  // ── EQ (Phase 4 — stub) ─────────────────────────────────────────────────

  setParametricEQ(_outputId: string, _channelIndex: number, _bands: EQBand[]): void {
    // Phase 4
  }

  setGraphicEQ(_outputId: string, _channelIndex: number, _values: number[]): void {
    // Phase 4
  }

  // ── Bass Management (Phase 5 — stub) ────────────────────────────────────

  setBassManagement(_outputId: string, _config: BassManagementConfig): void {
    // Phase 5
  }

  // ── Meter Source ────────────────────────────────────────────────────────

  setMeterSource(mode: { type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC'; id?: string }): void {
    this.meterSource = mode;
    this.emitStateChanged();
  }

  // ── Pink Noise (Phase 3 — stub) ─────────────────────────────────────────

  setPinkNoise(_enabled: boolean, _level?: number): void {
    // Phase 3
  }

  setChannelPinkNoise(_channelIndex: number, _enabled: boolean): void {
    // Phase 3
  }

  // ── Ref Presets ─────────────────────────────────────────────────────────

  setRefPreset(id: string, name: string, level: number): void {
    this.refPresets = this.refPresets.map((p) =>
      p.id === id ? { id, name, level } : p
    );
    this.emitStateChanged();
  }

  // ── Meter Simulation ───────────────────────────────────────────────────

  private startMeterSimulation(): void {
    this.meterInterval = setInterval(() => {
      // Determine active channel IDs from all active sources
      const activeChannelIds = new Set<string>();
      for (const srcId of this.activeSourceIds) {
        const src = this.sources.find((s) => s.id === srcId);
        if (src) {
          const chans = FORMAT_CHANNELS[src.format] || [];
          chans.forEach((c) => activeChannelIds.add(c));
        }
      }

      // Determine output monitoring mute condition
      const isOutputMonitoring =
        this.meterSource.type === 'FOLLOW_OUTPUT' ||
        (this.meterSource.type === 'SPECIFIC' &&
          this.meterSource.id &&
          this.outputs.some((o) => o.id === this.meterSource.id));

      const shouldMuteMeter = this.mute && isOutputMonitoring;

      if (shouldMuteMeter || this.activeSourceIds.length === 0) {
        this.meterLevels.fill(0);
        this.meterPeaks.fill(0);
        this.lufsLevel = 0;
      } else {
        const activityBooster = this.activeSourceIds.length > 1 ? 1.2 : 1.0;

        for (let i = 0; i < 16; i++) {
          const chId = CHANNEL_IDS[i];
          if (!activeChannelIds.has(chId)) {
            this.meterLevels[i] = 0;
            this.meterPeaks[i] = 0;
            continue;
          }

          const target = (Math.random() * 60 + 10) * activityBooster;
          const newLevel = this.meterLevels[i] * 0.6 + target * 0.4;
          this.meterLevels[i] = Math.min(100, newLevel);

          if (newLevel > this.meterPeaks[i]) {
            this.meterPeaks[i] = newLevel;
          } else {
            this.meterPeaks[i] = Math.max(0, this.meterPeaks[i] - 0.5);
          }
        }

        // LUFS simulation
        const lufsTarget = 62 + (Math.random() * 10 - 5);
        this.lufsLevel = this.lufsLevel * 0.95 + lufsTarget * 0.05;
      }

      const meterData: MeterData = {
        levels: [...this.meterLevels],
        peaks: [...this.meterPeaks],
        lufs: {
          m: this.lufsLevel * 0.4 - 45,
          s: this.lufsLevel * 0.42 - 47,
          i: this.lufsLevel * 0.435 - 50,
          tp: this.lufsLevel * 0.35 - 40,
        },
      };

      this.emit('meter-data', meterData);
    }, 50);
  }

  private stopMeterSimulation(): void {
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
  }

  private emitStateChanged(): void {
    this.requestFullState().then((state) => {
      this.emit('state-changed', state);
    });
  }
}
