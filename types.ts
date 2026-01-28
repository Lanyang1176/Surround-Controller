export interface Source {
  id: string;
  name: string;
  format: string; // e.g., "7.1.4", "Stereo"
  active: boolean;
  color: string; // hex or tailwind class hint
  assigned: boolean; // New: determines if this slot has a valid input routed
  locked: boolean; // Support for latching/multi-selection
}

// ═══════════════════════════════════════════════════════════════════════
// Output Configuration Types
// ═══════════════════════════════════════════════════════════════════════

export interface OutputChannel {
  id: number;
  speaker: string;           // L, R, C, LFE, Ls, Rs, etc.
  outputPort: string;        // 物理输出端口名称
  trim: number;              // 增益调整 (dB)
  delay: number;             // 延迟 (内部统一用 ms 存储)
  delayUnit: 'ms' | 'm' | 'cm';  // 显示单位
  phase: boolean;            // 反相开关
  pinkNoise: boolean;        // 粉噪发送开关
  muted: boolean;
  solo: boolean;
  eq: number[];              // 16段EQ值 (-12 to +12 dB) - 保留兼容
  hpf: number;               // 高通滤波器频率 Hz (20-500, 0=OFF)
  lpf: number;               // 低通滤波器频率 Hz (1000-20000, 0=OFF)
  parametricEQ?: EQBand[];   // 参量EQ频段 (最多8个)
}

export interface SubOutput {
  id: string;                // 'A' | 'B' | 'C' | 'D'
  name: string;              // 显示名称
  outputPort: string;        // 物理输出端口
  delay: number;             // 延迟 (ms)
  muted: boolean;
  solo: boolean;
}

export interface ChannelBassConfig {
  speakerId: string;
  size: 'Large' | 'Small';
  sendToSubs: {
    subId: string;
    level: number;           // 发送电平 (dB)
    enabled: boolean;
  }[];
}

export interface BassManagementConfig {
  crossoverFreq: number;     // 分频点 Hz (40-200)
  hpSlope: '6dB/Oct' | '12dB/Oct' | '24dB/Oct';
  lpSlope: '6dB/Oct' | '12dB/Oct' | '24dB/Oct';
  lfeFilterEnabled: boolean;
  lfeFilterFreq: number;     // LFE 低通频率 Hz
  lfeFilterSlope: '12dB/Oct' | '24dB/Oct';
  channels: ChannelBassConfig[];
  subs: SubOutput[];
}

export interface PinkNoiseConfig {
  enabled: boolean;
  level: number;             // 输出电平 (dB)
}

export interface Output {
  id: string;
  name: string;
  format: string;
  active: boolean;
  color: string;
  channels?: OutputChannel[];
  bassManagement?: BassManagementConfig;
  pinkNoise?: PinkNoiseConfig;
}

// ═══════════════════════════════════════════════════════════════════════
// Speaker Types
// ═══════════════════════════════════════════════════════════════════════

export interface Speaker {
  id: string;
  label: string;
  x: number; // -1 to 1
  y: number; // -1 to 1 (depth)
  z: number; // 0 to 1 (height)
  index?: number; // Channel number (1-16)
}

// ═══════════════════════════════════════════════════════════════════════
// Delay Unit Conversion Helpers
// ═══════════════════════════════════════════════════════════════════════

export const SOUND_SPEED = 343; // m/s at 20°C

export const delayConvert = {
  msToM: (ms: number) => (ms / 1000) * SOUND_SPEED,
  msToCm: (ms: number) => (ms / 1000) * SOUND_SPEED * 100,
  mToMs: (m: number) => (m / SOUND_SPEED) * 1000,
  cmToMs: (cm: number) => (cm / 100 / SOUND_SPEED) * 1000,
};

// ═══════════════════════════════════════════════════════════════════════
// EQ Frequency Bands (16-band Graphic EQ)
// ═══════════════════════════════════════════════════════════════════════

export const EQ_FREQUENCIES = [
  25, 40, 63, 100, 160, 250, 400, 630, 
  1000, 1600, 2500, 4000, 6300, 10000, 16000, 20000
] as const;

export type EQFrequency = typeof EQ_FREQUENCIES[number];

// ═══════════════════════════════════════════════════════════════════════
// Parametric EQ Types
// ═══════════════════════════════════════════════════════════════════════

export interface EQBand {
  id: string;
  enabled: boolean;
  type: 'peak' | 'lowShelf' | 'highShelf' | 'lowPass' | 'highPass';
  frequency: number;  // 20 - 20000 Hz
  gain: number;       // -12 to +12 dB
  q: number;          // 0.1 to 10
}