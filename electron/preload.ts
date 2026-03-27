import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onMeterData: (cb: (data: any) => void) => {
    const handler = (_: any, data: any) => cb(data);
    ipcRenderer.on('device:meters', handler);
    return () => ipcRenderer.removeListener('device:meters', handler);
  },
  onConnectionState: (cb: (state: string) => void) => {
    const handler = (_: any, state: string) => cb(state);
    ipcRenderer.on('device:connection', handler);
    return () => ipcRenderer.removeListener('device:connection', handler);
  },
  onFullState: (cb: (state: any) => void) => {
    const handler = (_: any, state: any) => cb(state);
    ipcRenderer.on('device:full-state', handler);
    return () => ipcRenderer.removeListener('device:full-state', handler);
  },
  sendCommand: (command: string, ...args: any[]) => {
    ipcRenderer.send('device:cmd', command, ...args);
  },
  requestFullState: () => ipcRenderer.invoke('device:request-state'),
});
