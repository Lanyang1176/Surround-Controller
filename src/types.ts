export * from '../shared/types';

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
