import { useEffect, useRef } from 'react';

export interface MeterSnapshot {
  levels: number[];
  peaks: number[];
  lufs: { m: number; s: number; i: number; tp: number };
}

const EMPTY: MeterSnapshot = {
  levels: Array(16).fill(0),
  peaks: Array(16).fill(0),
  lufs: { m: -Infinity, s: -Infinity, i: -Infinity, tp: -Infinity },
};

export function useMeterData() {
  const ref = useRef<MeterSnapshot>(EMPTY);

  useEffect(() => {
    const cleanup = window.electronAPI?.onMeterData((data: MeterSnapshot) => {
      ref.current = data;
    });
    return () => { cleanup?.(); };
  }, []);

  return ref;
}
