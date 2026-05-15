import { useEffect, useRef } from 'react';
import { createMockMeterSnapshot } from '../dev/mockDevice';
import { useDeviceStore } from '../stores/deviceStore';

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
    if (!window.electronAPI) {
      let frame = 0;
      const intervalId = window.setInterval(() => {
        const state = useDeviceStore.getState();
        ref.current = createMockMeterSnapshot({
          activeSourceIds: state.activeSourceIds,
          sources: state.sources,
          outputs: state.outputs,
          meterSource: state.meterMonitorMode,
          mute: state.mute,
          frame: frame++,
        });
      }, 50);

      return () => window.clearInterval(intervalId);
    }

    const cleanup = window.electronAPI.onMeterData((data: MeterSnapshot) => {
      ref.current = data;
    });
    return () => { cleanup?.(); };
  }, []);

  return ref;
}
