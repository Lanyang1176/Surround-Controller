import type {
  BassManagementConfig,
  EQBand,
  Output,
  OutputChannel,
  Source,
} from '../types';
import { CHANNELS_16, FORMAT_CHANNELS } from '../constants/audio';
import type { MeterSnapshot } from '../hooks/useMeterData';

type MeterSource = { type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC'; id?: string };

export interface MockFullDeviceState {
  info: {
    name: string;
    firmwareVersion: string;
    sampleRate: number;
    clockSource: string;
  };
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
  meterSource: MeterSource;
}

const INITIAL_SOURCES: Source[] = [
  { id: 's1', name: 'Source A', format: '9.1.6', active: true, color: 'amber', assigned: true, locked: false },
  { id: 's2', name: 'Source B', format: '7.1.4', active: false, color: 'blue', assigned: true, locked: false },
  { id: 's3', name: 'Source C', format: 'Stereo', active: false, color: 'green', assigned: false, locked: false },
  { id: 's4', name: 'Source D', format: '5.1', active: false, color: 'purple', assigned: true, locked: false },
  { id: 's5', name: 'Source E', format: 'Stereo', active: false, color: 'red', assigned: true, locked: false },
];

const OUTPUT_SPEAKERS: Record<string, string[]> = {
  ...FORMAT_CHANNELS,
};

const createParametricEQ = (channelIndex: number): EQBand[] => [
  {
    id: `eq-${channelIndex}-low`,
    enabled: true,
    type: 'lowShelf',
    frequency: 85,
    gain: channelIndex % 3 === 0 ? 1.5 : 0.8,
    q: 0.7,
  },
  {
    id: `eq-${channelIndex}-presence`,
    enabled: channelIndex % 4 !== 0,
    type: 'peak',
    frequency: 3200,
    gain: channelIndex % 2 === 0 ? -1.2 : 1.0,
    q: 1.4,
  },
];

const createOutputChannels = (format: string): OutputChannel[] => {
  const speakers = OUTPUT_SPEAKERS[format] ?? OUTPUT_SPEAKERS['9.1.6'];

  return speakers.map((speaker, index) => ({
    id: index,
    speaker,
    outputPort: `Analog Out ${index + 1}`,
    trim: index % 4 === 0 ? -1.5 : index % 3 === 0 ? 0.8 : 0,
    delay: index % 2 === 0 ? index * 0.12 : index * 0.08,
    delayUnit: 'ms',
    phase: false,
    pinkNoise: index === 0 || index === 1,
    muted: false,
    solo: false,
    eq: Array.from({ length: 16 }, (_, band) => {
      if (band === 2) return index % 2 === 0 ? 1.5 : -1;
      if (band === 8) return index % 3 === 0 ? -2 : 0.5;
      return 0;
    }),
    hpf: speaker === 'LFE' ? 0 : 40,
    lpf: speaker === 'LFE' ? 120 : 0,
    parametricEQ: createParametricEQ(index),
  }));
};

const createBassManagement = (format: string): BassManagementConfig => {
  const speakers = OUTPUT_SPEAKERS[format] ?? OUTPUT_SPEAKERS['9.1.6'];

  return {
    crossoverFreq: 80,
    hpSlope: '12dB/Oct',
    lpSlope: '24dB/Oct',
    lfeFilterEnabled: true,
    lfeFilterFreq: 120,
    lfeFilterSlope: '24dB/Oct',
    channels: speakers.map((speaker) => ({
      speakerId: speaker,
      size: speaker === 'LFE' ? 'Large' : 'Small',
      sendToSubs: [
        { subId: 'A', level: speaker === 'LFE' ? 0 : -3, enabled: speaker !== 'LFE' },
        { subId: 'B', level: -6, enabled: ['L', 'R', 'Ls', 'Rs'].includes(speaker) },
        { subId: 'C', level: -9, enabled: false },
        { subId: 'D', level: -9, enabled: false },
      ],
    })),
    subs: [
      { id: 'A', name: 'Sub A', outputPort: 'Analog Out 17', delay: 0.4, muted: false, solo: false },
      { id: 'B', name: 'Sub B', outputPort: 'Analog Out 18', delay: 0.7, muted: false, solo: false },
      { id: 'C', name: 'Sub C', outputPort: 'Analog Out 19', delay: 0, muted: false, solo: false },
      { id: 'D', name: 'Sub D', outputPort: 'Analog Out 20', delay: 0, muted: false, solo: false },
    ],
  };
};

const createOutput = (
  id: string,
  name: string,
  format: string,
  active: boolean,
  color: string,
): Output => ({
  id,
  name,
  format,
  active,
  color,
  channels: createOutputChannels(format),
  bassManagement: createBassManagement(format),
  pinkNoise: {
    enabled: active,
    level: -20,
  },
});

const INITIAL_OUTPUTS: Output[] = [
  createOutput('o1', 'Main', '9.1.6', true, 'cyan'),
  createOutput('o2', 'Alt 1', 'Stereo', false, 'yellow'),
  createOutput('o3', 'Alt 2', '5.1', false, 'orange'),
  createOutput('o4', 'Alt 3', 'Stereo', false, 'lime'),
];

export function createMockFullDeviceState(): MockFullDeviceState {
  return {
    info: {
      name: 'TOPPING 16 Mon',
      firmwareVersion: '1.0.0-browser-mock',
      sampleRate: 48000,
      clockSource: 'Internal',
    },
    volume: 75,
    dim: false,
    dimAmount: -20,
    mute: false,
    sources: structuredClone(INITIAL_SOURCES),
    activeSourceIds: ['s1'],
    sourceLocks: {},
    outputs: structuredClone(INITIAL_OUTPUTS),
    activeOutputId: 'o1',
    refPresets: [
      { id: 'ref1', name: 'Ref 1', level: -20 },
      { id: 'ref2', name: 'Ref 2', level: -14 },
      { id: 'ref3', name: 'Ref 3', level: -10 },
    ],
    meterSource: { type: 'FOLLOW_INPUT' },
  };
}

export function createMockMeterSnapshot(options: {
  activeSourceIds: string[];
  sources: Source[];
  outputs: Output[];
  meterSource: MeterSource;
  mute: boolean;
  frame: number;
}): MeterSnapshot {
  const { activeSourceIds, sources, outputs, meterSource, mute, frame } = options;
  const activeChannelIds = new Set<string>();

  for (const sourceId of activeSourceIds) {
    const source = sources.find((item) => item.id === sourceId);
    const channelIds = source ? FORMAT_CHANNELS[source.format] ?? [] : [];
    channelIds.forEach((channelId) => activeChannelIds.add(channelId));
  }

  const isOutputMonitoring =
    meterSource.type === 'FOLLOW_OUTPUT' ||
    (meterSource.type === 'SPECIFIC' &&
      Boolean(meterSource.id) &&
      outputs.some((output) => output.id === meterSource.id));
  const isSilent = activeSourceIds.length === 0 || (mute && isOutputMonitoring);

  const levels = CHANNELS_16.map((channel, index) => {
    if (isSilent || !activeChannelIds.has(channel.id)) return 0;

    const wave = Math.sin(frame * 0.19 + index * 0.73);
    const flutter = Math.sin(frame * 0.047 + index * 1.41);
    const base = 46 + wave * 18 + flutter * 7;
    const frontBias = index < 4 ? 13 : index > 9 ? -4 : 4;

    return Math.max(8, Math.min(96, base + frontBias));
  });

  const peaks = levels.map((level, index) =>
    Math.min(100, level + 5 + ((frame + index * 3) % 11)),
  );
  const lufsBase = isSilent ? -Infinity : -24 + Math.sin(frame * 0.035) * 2.5;

  return {
    levels,
    peaks,
    lufs: isSilent
      ? { m: -Infinity, s: -Infinity, i: -Infinity, tp: -Infinity }
      : {
          m: lufsBase + 2.1,
          s: lufsBase + 1.2,
          i: lufsBase,
          tp: lufsBase + 5.4,
        },
  };
}
