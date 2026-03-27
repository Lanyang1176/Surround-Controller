export interface ElectronAPI {
  onMeterData: (cb: (data: any) => void) => () => void;
  onConnectionState: (cb: (state: string) => void) => () => void;
  onFullState: (cb: (state: any) => void) => () => void;
  sendCommand: (command: string, ...args: any[]) => void;
  requestFullState: () => Promise<any>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
