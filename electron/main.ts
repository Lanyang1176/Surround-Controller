import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { MockDeviceService } from './device/MockDeviceService';

let mainWindow: BrowserWindow | null = null;
let deviceService: MockDeviceService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0f1014',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

function initDevice() {
  deviceService = new MockDeviceService();

  deviceService.on('meter-data', (data) => {
    mainWindow?.webContents.send('device:meters', data);
  });
  deviceService.on('connection', (state) => {
    mainWindow?.webContents.send('device:connection', state);
  });
  deviceService.on('state-changed', (state) => {
    mainWindow?.webContents.send('device:full-state', state);
  });

  ipcMain.on('device:cmd', (_event, command, ...args) => {
    if (typeof (deviceService as any)[command] === 'function') {
      (deviceService as any)[command](...args);
    }
  });

  ipcMain.handle('device:request-state', async () => {
    return deviceService.requestFullState();
  });

  deviceService.connect();
}

app.whenReady().then(() => {
  createWindow();
  initDevice();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

export { mainWindow };
