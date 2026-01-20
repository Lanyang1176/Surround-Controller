export interface Source {
  id: string;
  name: string;
  format: string; // e.g., "7.1.4", "Stereo"
  active: boolean;
  color: string; // hex or tailwind class hint
  assigned: boolean; // New: determines if this slot has a valid input routed
  locked: boolean; // Support for latching/multi-selection
}

export interface Output {
  id: string;
  name: string;
  format: string;
  active: boolean;
  color: string;
}

export interface Speaker {
  id: string;
  label: string;
  x: number; // -1 to 1
  y: number; // -1 to 1 (depth)
  z: number; // 0 to 1 (height)
  index?: number; // Channel number (1-16)
}