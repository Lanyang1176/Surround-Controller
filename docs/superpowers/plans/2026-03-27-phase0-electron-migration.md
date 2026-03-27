# Phase 0: Electron 架构改造 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Vite Web 原型改造成 Electron 桌面应用，加入 DeviceService 抽象层，让硬件工程师可以直接实现 `HIDDeviceService` 对接。

**Architecture:** Electron main process 托管 DeviceService（Mock 或 HID），通过 IPC 桥接到 renderer 的 Zustand store。Meter 数据走 useRef + rAF 避免重渲染。当前所有 UI 行为在 Mock 模式下完全保留。

**Tech Stack:** Electron 35+, electron-vite (alex8088), electron-builder, Zustand, node-hid (interface only), TypeScript

**Spec 文档:** [SPEC.md](../../../SPEC.md) → `docs/plans/hid-spec/`

---

## ⚠️ 评审修复指南（执行前必读）

计划经过专家评审，以下问题已识别。执行者在对应 Task 中需注意：

| # | 严重度 | 涉及 Task | 问题 | 修复方式 |
|---|--------|-----------|------|----------|
| 1 | **CRITICAL** | Task 0 (新增) | 当前源码是平铺结构（无 `src/` 目录），但计划假设 `src/` 存在 | **新增 Task 0**：把 App.tsx/index.tsx/types.ts/components/lib/ 移入 `src/`，更新所有内部 import 路径 |
| 2 | **CRITICAL** | Task 1 Step 7 | `index.html` 移到 `src/` 后 script src 需更新 | `<script src="/index.tsx">` → `<script src="./index.tsx">`，同时移除 importmap 和 CDN tailwind script |
| 3 | **HIGH** | Task 1 Step 7 | `index.html` 内联 `<style>` 中的 CSS 变量+动画需提取 | 创建 `src/index.css`，内容: `@import "tailwindcss";` + 从 `<style>` 移入的 CSS 变量和动画，`index.html` 改为 `<link rel="stylesheet" href="./index.css">` |
| 4 | **HIGH** | Task 1 | Google Fonts 从 CDN 加载，Electron 离线不可用 | Phase 0 可接受（开发环境有网），生产打包时需本地化字体。加 TODO 注释 |
| 5 | **HIGH** | Task 1 Step 2 | Tailwind CDN 是 v3，`@tailwindcss/vite` 是 v4，有 breaking changes | **改用 Tailwind v3**：`npm install -D tailwindcss postcss autoprefixer`，用 PostCSS 插件而非 Vite 插件。CSS 入口用 `@tailwind base; @tailwind components; @tailwind utilities;` |
| 6 | **HIGH** | Task 1 | 旧 `vite.config.ts` 需删除/重命名，否则与 `electron.vite.config.ts` 冲突 | 在 Step 6 后加步骤：`rm vite.config.ts` |
| 7 | **HIGH** | Task 1 | `tsconfig.json` 的 `paths` 需更新 | 加步骤：`"@/*": ["./src/*"]`，`include` 加 `"src"` 和 `"electron"` |
| 8 | **HIGH** | Task 3, 4, 9 | `electron/device/` 中 import `../../src/types` 跨越 electron-vite 构建边界 | 创建 `shared/types.ts` 导出业务类型，`electron/` 和 `src/` 都从 `shared/` import。或把 `FORMAT_CHANNELS` / `CHANNELS_16` 在 MockDeviceService 中内联（避免跨边界 import 常量） |
| 9 | **MEDIUM** | Task 5 | `sourceLocks` 用 `Record<string, boolean>` 但代码用 `Source.locked` 属性 | `applyFullState` 中合并：`sources: state.sources.map(s => ({...s, locked: state.sourceLocks?.[s.id] ?? s.locked}))` |
| 10 | **MEDIUM** | Task 7 | `mainVolume` 当前是 0-100，store 用 dB（-96~+12） | Knob 组件已有 `min`/`max` props，迁移时 Knob 直接传 dB 值。删除 `(mainVolume / 100) * 80 - 80` 转换，直接用 `volume`。Ref preset 匹配也简化为 `Math.abs(volume - ref.level) < 0.5` |
| 11 | **MEDIUM** | Task 7 Step 2 | `handleSourceSelect` / `handleOutputSelect` 还设了 `selectionContext` | 替换为包装函数：`(id) => { actions.selectSource(id); setSelectionContext('SOURCE'); }` |
| 12 | **MEDIUM** | Task 7 | App.tsx 引用 `MOCK_OUTPUTS.find(...)` 但 MOCK_OUTPUTS 已移走 | 替换为 `outputs.find(o => o.id === activeOutput)`（从 store 读） |
| 13 | **MEDIUM** | Task 8 Step 2 | meter snapshot 缺少 LUFS 数据 | snapshot 需包含 lufs：`{ levels, peaks, lufs: meterRef.current.lufs }` |
| 14 | **LOW** | Task 7 | `getActiveChannelIds()` 函数留在 App.tsx 还是移走 | 保留在 App.tsx 作为 derived state（纯计算，不是设备状态） |

---

## Task 0: 目录结构迁移（前置步骤）

**Files:**
- Move: `App.tsx` → `src/App.tsx`
- Move: `index.tsx` → `src/index.tsx`
- Move: `types.ts` → `src/types.ts`
- Move: `components/` → `src/components/`
- Move: `lib/` → `src/lib/`
- Create: `shared/types.ts`

- [ ] **Step 1: 创建 src/ 目录并移动源码**

```bash
mkdir -p src
mv App.tsx index.tsx types.ts src/
mv components/ src/components/
mv lib/ src/lib/
```

- [ ] **Step 2: 创建 shared/types.ts（跨进程共享类型）**

从 `src/types.ts` 中提取 `electron/` 需要的类型到 `shared/types.ts`（Source, Output, OutputChannel, EQBand, BassManagementConfig, Speaker 等），`src/types.ts` 改为 re-export：

```typescript
// shared/types.ts
export interface Source { /* 完整定义 */ }
export interface Output { /* 完整定义 */ }
// ... 其他业务类型

// src/types.ts
export * from '../shared/types';
// ... 保留 src 特有的类型和工具函数（delayConvert 等）
```

- [ ] **Step 3: 更新所有内部 import 路径**

由于文件层级没变（组件间相对路径不变），大部分 import 无需改动。但 `App.tsx` 中对 `./lib/utils` 和 `./components/*` 的引用路径不变，无需修改。

- [ ] **Step 4: 验证**

```bash
npx vite build
```

Expected: 编译成功（还在用旧 vite.config.ts，移入 src/ 后需确认入口路径）

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move source files into src/ for electron-vite structure"
```

---

## 文件结构

完成后的新增/修改文件：

```
新增：
  electron/main.ts                         # Electron 主进程
  electron/preload.ts                      # contextBridge IPC 桥
  electron/device/DeviceService.ts         # 抽象类定义
  electron/device/MockDeviceService.ts     # Mock 实现
  electron/device/HIDDeviceService.ts      # 骨架（硬件工程师填充）
  src/constants/audio.ts                   # 从 App.tsx 提取的常量
  src/stores/deviceStore.ts                # Zustand store
  src/hooks/useDevice.ts                   # 设备状态 hook
  src/hooks/useMeterData.ts               # Meter ref hook
  src/types/electron.d.ts                  # window.electronAPI 类型
  electron.vite.config.ts                  # electron-vite 配置
  electron-builder.yml                     # 打包配置

修改：
  package.json                             # 加依赖 + scripts
  tsconfig.json                            # 调整 paths
  index.html                               # 移到 src/，移除 CDN tailwind
  src/index.tsx                            # 加 DeviceService provider
  src/App.tsx                              # 状态迁移到 store
  src/components/SourceStrip.tsx           # 移除独立 meter 模拟
  src/components/OutputStrip.tsx           # 移除独立 meter 模拟
  src/components/SourceConfigEditor.tsx    # 移除独立 meter 模拟
  src/components/Meter.tsx                 # 改为从 ref 读数据
```

---

## Task 1: 搭 Electron 壳

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron.vite.config.ts`
- Create: `electron-builder.yml`
- Create: `src/types/electron.d.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Move: `index.html` → `src/index.html`（electron-vite 约定）

- [ ] **Step 1: 安装依赖**

```bash
npm install --save-dev electron electron-vite @electron-toolkit/preload @electron-toolkit/utils electron-builder
npm install --save-dev @types/node
```

- [ ] **Step 2: 安装 Tailwind 本地构建依赖**

当前用 CDN `<script src="https://cdn.tailwindcss.com">`，Electron 离线运行需要本地构建。

```bash
npm install --save-dev tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: 创建 electron/main.ts**

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

- [ ] **Step 4: 创建 electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Phase 0: 最小 IPC — 只暴露 meter 和连接状态
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

  // 命令
  sendCommand: (command: string, ...args: any[]) => {
    ipcRenderer.send('device:cmd', command, ...args);
  },

  requestFullState: () => ipcRenderer.invoke('device:request-state'),
});
```

- [ ] **Step 5: 创建 src/types/electron.d.ts**

```typescript
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
```

- [ ] **Step 6: 创建 electron.vite.config.ts**

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: 'electron/main.ts',
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: 'electron/preload.ts',
      },
    },
  },
  renderer: {
    plugins: [react(), tailwindcss()],
    root: 'src',
    build: {
      rollupOptions: {
        input: 'src/index.html',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  },
});
```

- [ ] **Step 7: 移动 index.html 到 src/ 并清理**

将 `index.html` 移到 `src/index.html`。移除 CDN tailwind script、importmap（Vite 处理模块）。保留 CSS 变量和动画样式。在 CSS 入口文件顶部加 `@import "tailwindcss";`。

- [ ] **Step 8: 更新 package.json scripts**

在 `package.json` 中添加：

```json
{
  "main": "out/main/main.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  }
}
```

- [ ] **Step 9: 创建 electron-builder.yml**

```yaml
appId: com.topping.surround-controller
productName: Topping Surround Controller
directories:
  output: release
  buildResources: resources
mac:
  target: dmg
  category: public.app-category.music
win:
  target: nsis
files:
  - out/**/*
  - "!node_modules/**/*"
```

- [ ] **Step 10: 验证 Electron 启动**

```bash
npm run dev
```

Expected: Electron 窗口打开，显示当前 UI（此时还是原始状态，但已在 Electron 壳内运行）。

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add Electron shell with electron-vite"
```

---

## Task 2: 提取常量到 constants/audio.ts

**Files:**
- Create: `src/constants/audio.ts`
- Modify: `src/App.tsx:15-121`

- [ ] **Step 1: 创建 src/constants/audio.ts**

从 `App.tsx` 提取以下常量（原样复制，只加 export）：
- `LOUDNESS_STANDARDS` (lines 31-49)
- `SPEAKERS_916` (lines 59-91)
- `CHANNELS_16` (lines 97-114)
- `FORMAT_CHANNELS` (lines 116-121)
- `getTargetLufs` 函数 (lines 52-55)

```typescript
import { Speaker } from '../types';

export const LOUDNESS_STANDARDS: { name: string; target: number }[] = [
  // ... 完整列表从 App.tsx:31-49 复制
];

export const getTargetLufs = (standardName: string): number => {
  const std = LOUDNESS_STANDARDS.find(s => s.name === standardName);
  return std?.target ?? -23;
};

export const SPEAKERS_916: Speaker[] = [
  // ... 完整列表从 App.tsx:59-91 复制
];

export const CHANNELS_16 = [
  // ... 完整列表从 App.tsx:97-114 复制
];

export const FORMAT_CHANNELS: Record<string, string[]> = {
  // ... 从 App.tsx:116-121 复制
};
```

- [ ] **Step 2: 更新 App.tsx 的 import**

删除 App.tsx 中这些常量的内联定义，改为：

```typescript
import {
  LOUDNESS_STANDARDS, getTargetLufs,
  SPEAKERS_916, CHANNELS_16, FORMAT_CHANNELS
} from './constants/audio';
```

- [ ] **Step 3: 验证编译通过**

```bash
npm run dev
```

Expected: 无编译错误，UI 行为不变。

- [ ] **Step 4: Commit**

```bash
git add src/constants/audio.ts src/App.tsx
git commit -m "refactor: extract audio constants from App.tsx"
```

---

## Task 3: 定义 DeviceService 抽象类

**Files:**
- Create: `electron/device/DeviceService.ts`

- [ ] **Step 1: 创建 electron/device/DeviceService.ts**

直接从 spec 文档 [01-device-service.md](../../plans/hid-spec/01-device-service.md) 复制完整的抽象类定义。包含：
- `MeterData` interface
- `DeviceInfo` interface
- `ConnectionState` type
- `FullDeviceState` interface
- `DeviceService` abstract class（extends EventEmitter）

需要在文件顶部 import 业务类型：

```typescript
import { EventEmitter } from 'events';
import type { Source, Output, OutputChannel, EQBand, BassManagementConfig } from '../../shared/types';
```

> **注意**：import 路径指向 `shared/types.ts`（Task 0 创建），不要从 `src/` 跨边界 import。

- [ ] **Step 2: Commit**

```bash
git add electron/device/DeviceService.ts
git commit -m "feat: define DeviceService abstract class"
```

---

## Task 4: 实现 MockDeviceService

**Files:**
- Create: `electron/device/MockDeviceService.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: 创建 MockDeviceService**

将 `App.tsx:15-28` 的 `INITIAL_SOURCES` 和 `MOCK_OUTPUTS` 移入此文件作为默认数据。

将 `App.tsx:303-346` 的 meter 模拟逻辑迁入 `startMeterSimulation()` 方法。

```typescript
import { DeviceService, MeterData, FullDeviceState, ConnectionState, DeviceInfo } from './DeviceService';
import type { Source, Output } from '../../shared/types';

// 注意：FORMAT_CHANNELS / CHANNELS_16 在此文件内联定义（避免跨 electron-vite 构建边界 import）
// 与 src/constants/audio.ts 中的定义保持一致
const FORMAT_CHANNELS: Record<string, string[]> = {
  '9.1.6': ['L','R','C','LFE','Ls','Rs','Lrs','Rrs','Lw','Rw','Ltf','Rtf','Ltm','Rtm','Ltr','Rtr'],
  '7.1.4': ['L','R','C','LFE','Ls','Rs','Lrs','Rrs','Ltf','Rtf','Ltr','Rtr'],
  '5.1': ['L','R','C','LFE','Ls','Rs'],
  'Stereo': ['L','R'],
};

const CHANNELS_16 = [
  {id:'L'},{id:'R'},{id:'C'},{id:'LFE'},{id:'Ls'},{id:'Rs'},{id:'Lrs'},{id:'Rrs'},
  {id:'Lw'},{id:'Rw'},{id:'Ltf'},{id:'Rtf'},{id:'Ltm'},{id:'Rtm'},{id:'Ltr'},{id:'Rtr'},
];

const INITIAL_SOURCES: Source[] = [
  // ... 从 App.tsx:15-21 复制
];

const MOCK_OUTPUTS: Output[] = [
  // ... 从 App.tsx:23-28 复制
];

export class MockDeviceService extends DeviceService {
  private state: FullDeviceState;
  private meterInterval: ReturnType<typeof setInterval> | null = null;
  private meterValues: { level: number; peak: number }[] = Array(16).fill({ level: 0, peak: 0 });
  private connectionState: ConnectionState = 'disconnected';

  constructor() {
    super();
    this.state = {
      info: { name: 'TOPPING 16 Mon (Mock)', firmwareVersion: '0.1.0', sampleRate: 48000, clockSource: 'Internal' },
      volume: -20,
      dim: false,
      dimAmount: -20,
      mute: false,
      sources: INITIAL_SOURCES,
      activeSourceIds: ['s1'],
      sourceLocks: {},
      outputs: MOCK_OUTPUTS,
      activeOutputId: 'o1',
      refPresets: [
        { id: 'ref1', name: 'Ref 1', level: -20 },
        { id: 'ref2', name: 'Ref 2', level: -14 },
        { id: 'ref3', name: 'Ref 3', level: -10 },
      ],
      meterSource: { type: 'FOLLOW_INPUT' },
    };
  }

  async connect(): Promise<void> {
    this.connectionState = 'connected';
    this.emit('connection', 'connected');
    this.emit('device-info', this.state.info);
    this.startMeterSimulation();
  }

  async disconnect(): Promise<void> {
    this.connectionState = 'disconnected';
    if (this.meterInterval) clearInterval(this.meterInterval);
    this.emit('connection', 'disconnected');
  }

  getConnectionState(): ConnectionState { return this.connectionState; }

  async requestFullState(): Promise<FullDeviceState> { return this.state; }

  // ── 命令实现（直接更新内存状态 + emit）──

  setVolume(db: number) {
    this.state.volume = db;
    this.notifyStateChanged();
  }

  setMute(enabled: boolean) {
    this.state.mute = enabled;
    this.notifyStateChanged();
  }

  setDim(enabled: boolean) {
    this.state.dim = enabled;
    this.notifyStateChanged();
  }

  selectSource(sourceId: string) {
    if (!this.state.activeSourceIds.includes(sourceId)) {
      const lockedIds = this.state.activeSourceIds.filter(id =>
        this.state.sourceLocks[id]
      );
      this.state.activeSourceIds = [...lockedIds, sourceId];
    }
    this.notifyStateChanged();
  }

  deselectSource(sourceId: string) {
    this.state.activeSourceIds = this.state.activeSourceIds.filter(id => id !== sourceId);
    this.notifyStateChanged();
  }

  setSourceLock(sourceId: string, locked: boolean) {
    this.state.sourceLocks[sourceId] = locked;
    this.notifyStateChanged();
  }

  updateSource(source: Source) {
    this.state.sources = this.state.sources.map(s => s.id === source.id ? source : s);
    this.notifyStateChanged();
  }

  selectOutput(outputId: string) {
    this.state.activeOutputId = outputId;
    this.notifyStateChanged();
  }

  updateOutput(output: Output) {
    this.state.outputs = this.state.outputs.map(o => o.id === output.id ? output : o);
    this.notifyStateChanged();
  }

  setChannelParam() { /* Phase 3 */ }
  setParametricEQ() { /* Phase 4 */ }
  setGraphicEQ() { /* Phase 4 */ }
  setBassManagement() { /* Phase 4 */ }

  setMeterSource(mode: { type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC'; id?: string }) {
    this.state.meterSource = mode;
    this.notifyStateChanged();
  }

  setPinkNoise() { /* Phase 5 */ }
  setChannelPinkNoise() { /* Phase 5 */ }

  setRefPreset(id: string, name: string, level: number) {
    this.state.refPresets = this.state.refPresets.map(r =>
      r.id === id ? { ...r, name, level } : r
    );
    this.notifyStateChanged();
  }

  // ── 内部 ──

  private notifyStateChanged() {
    this.emit('state-changed', { ...this.state });
  }

  private startMeterSimulation() {
    // 逻辑复制自 App.tsx:303-346
    this.meterInterval = setInterval(() => {
      const activeIds = new Set<string>();
      this.state.activeSourceIds.forEach(id => {
        const src = this.state.sources.find(s => s.id === id);
        if (src) {
          const chans = FORMAT_CHANNELS[src.format] || [];
          chans.forEach(c => activeIds.add(c));
        }
      });

      if (this.state.mute) {
        const data: MeterData = {
          levels: Array(16).fill(-Infinity),
          peaks: Array(16).fill(-Infinity),
          lufs: { m: -Infinity, s: -Infinity, i: -Infinity, tp: -Infinity },
        };
        this.emit('meter-data', data);
        return;
      }

      const levels: number[] = [];
      const peaks: number[] = [];

      for (let i = 0; i < 16; i++) {
        const chId = CHANNELS_16[i].id;
        if (!activeIds.has(chId)) {
          this.meterValues[i] = { level: 0, peak: 0 };
          levels.push(0);
          peaks.push(0);
          continue;
        }
        const booster = this.state.activeSourceIds.length > 1 ? 1.2 : 1.0;
        const target = (Math.random() * 60 + 10) * booster;
        const prev = this.meterValues[i];
        const newLevel = prev.level * 0.6 + target * 0.4;
        let newPeak = prev.peak;
        if (newLevel > newPeak) newPeak = newLevel;
        else newPeak = Math.max(0, newPeak - 0.5);
        this.meterValues[i] = { level: Math.min(100, newLevel), peak: Math.min(100, newPeak) };
        levels.push(this.meterValues[i].level);
        peaks.push(this.meterValues[i].peak);
      }

      // LUFS 模拟
      const hasActive = activeIds.size > 0;
      const lufs = {
        m: hasActive ? -(45 + Math.random() * 10) : -Infinity,
        s: hasActive ? -(47 + Math.random() * 10) : -Infinity,
        i: hasActive ? -(50 + Math.random() * 5) : -Infinity,
        tp: hasActive ? -(40 + Math.random() * 10) : -Infinity,
      };

      this.emit('meter-data', { levels, peaks, lufs });
    }, 50);
  }
}
```

- [ ] **Step 2: 更新 electron/main.ts 接入 MockDeviceService**

在 `createWindow()` 后初始化 MockDeviceService，转发事件到 renderer：

```typescript
import { MockDeviceService } from './device/MockDeviceService';

let deviceService: MockDeviceService;

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

  // IPC 命令处理
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
```

- [ ] **Step 3: 验证 Mock 运行**

```bash
npm run dev
```

Expected: Electron 启动，控制台无错误。（UI 还没接 store，此时 meter 数据在 main process 生成但 renderer 还没消费。）

- [ ] **Step 4: Commit**

```bash
git add electron/device/MockDeviceService.ts electron/main.ts
git commit -m "feat: implement MockDeviceService with meter simulation"
```

---

## Task 5: 建 Zustand Store + useDevice hook

**Files:**
- Create: `src/stores/deviceStore.ts`
- Create: `src/hooks/useDevice.ts`
- Create: `src/hooks/useMeterData.ts`
- Modify: `package.json`

- [ ] **Step 1: 安装 Zustand**

```bash
npm install zustand
```

- [ ] **Step 2: 创建 src/stores/deviceStore.ts**

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Source, Output } from '../types';

export interface MeterMonitorMode {
  type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC';
  id?: string;
}

export interface RefPreset {
  id: string;
  name: string;
  level: number;
}

interface DeviceState {
  // 连接
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  deviceMode: 'mock' | 'hardware';

  // 设备参数
  volume: number;
  mute: boolean;
  dim: boolean;
  sources: Source[];
  activeSourceIds: string[];
  outputs: Output[];
  activeOutputId: string;
  meterMonitorMode: MeterMonitorMode;
  loudnessStandard: string;
  refPresets: RefPreset[];

  // 系统信息
  sampleRate: number;
  clockSource: string;
  deviceName: string;
  firmwareVersion: string;
}

interface DeviceActions {
  // 从 IPC 接收的状态更新
  applyFullState: (state: any) => void;
  setConnectionState: (state: DeviceState['connectionState']) => void;

  // UI 发起的命令（发送到 main process）
  setVolume: (db: number) => void;
  setMute: (muted: boolean) => void;
  setDim: (dimmed: boolean) => void;
  selectSource: (id: string) => void;
  deselectSource: (id: string) => void;
  toggleSourceLock: (id: string) => void;
  selectOutput: (id: string) => void;
  updateSource: (source: Source) => void;
  updateOutput: (output: Output) => void;
  setMeterMonitorMode: (mode: MeterMonitorMode) => void;
  setLoudnessStandard: (name: string) => void;
  setRefPreset: (id: string, name: string, level: number) => void;
}

// 发送命令到 main process（有 electronAPI 时走 IPC，没有时 noop）
const sendCmd = (command: string, ...args: any[]) => {
  window.electronAPI?.sendCommand(command, ...args);
};

export const useDeviceStore = create<DeviceState & DeviceActions>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    connectionState: 'disconnected',
    deviceMode: 'mock',
    volume: -20,
    mute: false,
    dim: false,
    sources: [],
    activeSourceIds: [],
    outputs: [],
    activeOutputId: '',
    meterMonitorMode: { type: 'FOLLOW_INPUT' as const },
    loudnessStandard: 'Netflix',
    refPresets: [],
    sampleRate: 48000,
    clockSource: 'Internal',
    deviceName: '',
    firmwareVersion: '',

    // 从 IPC 接收全量状态
    applyFullState: (state) => set({
      volume: state.volume,
      mute: state.mute,
      dim: state.dim,
      sources: state.sources,
      activeSourceIds: state.activeSourceIds,
      outputs: state.outputs,
      activeOutputId: state.activeOutputId,
      refPresets: state.refPresets,
      meterMonitorMode: state.meterSource,
      sampleRate: state.info?.sampleRate ?? 48000,
      clockSource: state.info?.clockSource ?? 'Internal',
      deviceName: state.info?.name ?? '',
      firmwareVersion: state.info?.firmwareVersion ?? '',
    }),

    setConnectionState: (cs) => set({ connectionState: cs }),

    // 命令（乐观更新 + 发 IPC）
    setVolume: (db) => { set({ volume: db }); sendCmd('setVolume', db); },
    setMute: (m) => { set({ mute: m }); sendCmd('setMute', m); },
    setDim: (d) => { set({ dim: d }); sendCmd('setDim', d); },

    selectSource: (id) => {
      const { activeSourceIds, sources } = get();
      if (activeSourceIds.includes(id)) return;
      // 保留锁定的 source
      const locked = activeSourceIds.filter(sid => {
        const s = sources.find(src => src.id === sid);
        return s?.locked;
      });
      set({ activeSourceIds: [...locked, id] });
      sendCmd('selectSource', id);
    },

    deselectSource: (id) => {
      set(s => ({ activeSourceIds: s.activeSourceIds.filter(sid => sid !== id) }));
      sendCmd('deselectSource', id);
    },

    toggleSourceLock: (id) => {
      set(s => ({
        sources: s.sources.map(src =>
          src.id === id ? { ...src, locked: !src.locked } : src
        ),
      }));
      const source = get().sources.find(s => s.id === id);
      sendCmd('setSourceLock', id, source?.locked ?? false);
    },

    selectOutput: (id) => { set({ activeOutputId: id }); sendCmd('selectOutput', id); },
    updateSource: (source) => {
      set(s => ({ sources: s.sources.map(src => src.id === source.id ? source : src) }));
      sendCmd('updateSource', source);
    },
    updateOutput: (output) => {
      set(s => ({ outputs: s.outputs.map(o => o.id === output.id ? output : o) }));
      sendCmd('updateOutput', output);
    },
    setMeterMonitorMode: (mode) => { set({ meterMonitorMode: mode }); sendCmd('setMeterSource', mode); },
    setLoudnessStandard: (name) => set({ loudnessStandard: name }),
    setRefPreset: (id, name, level) => {
      set(s => ({
        refPresets: s.refPresets.map(r => r.id === id ? { ...r, name, level } : r),
      }));
      sendCmd('setRefPreset', id, name, level);
    },
  }))
);
```

- [ ] **Step 3: 创建 src/hooks/useDevice.ts**

```typescript
import { useDeviceStore } from '../stores/deviceStore';

// 选择器 hooks — 只订阅需要的切片，避免无关重渲染
export const useVolume = () => useDeviceStore(s => s.volume);
export const useMute = () => useDeviceStore(s => s.mute);
export const useDim = () => useDeviceStore(s => s.dim);
export const useSources = () => useDeviceStore(s => s.sources);
export const useActiveSourceIds = () => useDeviceStore(s => s.activeSourceIds);
export const useOutputs = () => useDeviceStore(s => s.outputs);
export const useActiveOutputId = () => useDeviceStore(s => s.activeOutputId);
export const useConnectionState = () => useDeviceStore(s => s.connectionState);
export const useLoudnessStandard = () => useDeviceStore(s => s.loudnessStandard);
export const useRefPresets = () => useDeviceStore(s => s.refPresets);
export const useMeterMonitorMode = () => useDeviceStore(s => s.meterMonitorMode);
export const useDeviceInfo = () => useDeviceStore(s => ({
  sampleRate: s.sampleRate,
  clockSource: s.clockSource,
  deviceName: s.deviceName,
}));

// Actions（稳定引用，不触发重渲染）
export const useDeviceActions = () => useDeviceStore(s => ({
  setVolume: s.setVolume,
  setMute: s.setMute,
  setDim: s.setDim,
  selectSource: s.selectSource,
  deselectSource: s.deselectSource,
  toggleSourceLock: s.toggleSourceLock,
  selectOutput: s.selectOutput,
  updateSource: s.updateSource,
  updateOutput: s.updateOutput,
  setMeterMonitorMode: s.setMeterMonitorMode,
  setLoudnessStandard: s.setLoudnessStandard,
  setRefPreset: s.setRefPreset,
}));
```

- [ ] **Step 4: 创建 src/hooks/useMeterData.ts**

```typescript
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

/**
 * 返回一个 ref，持续更新 meter 数据，不触发 React re-render。
 * 组件通过 rAF 读取 ref.current 来绘制。
 */
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
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/ src/hooks/ package.json package-lock.json
git commit -m "feat: add Zustand store and device hooks"
```

---

## Task 6: 接入 IPC 监听 + 初始化 Store

**Files:**
- Modify: `src/index.tsx`

- [ ] **Step 1: 在 index.tsx 中初始化 IPC → Store 桥接**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { useDeviceStore } from './stores/deviceStore';

// 启动时连接 IPC 事件到 Zustand Store
function initDeviceBridge() {
  const store = useDeviceStore.getState();

  // 监听全量状态更新
  window.electronAPI?.onFullState((state) => {
    useDeviceStore.getState().applyFullState(state);
  });

  // 监听连接状态
  window.electronAPI?.onConnectionState((state) => {
    useDeviceStore.getState().setConnectionState(state as any);
  });

  // 请求初始状态
  window.electronAPI?.requestFullState().then((state) => {
    if (state) useDeviceStore.getState().applyFullState(state);
  });
}

initDeviceBridge();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/index.tsx
git commit -m "feat: bridge IPC events to Zustand store on init"
```

---

## Task 7: 迁移 App.tsx 状态到 Store

**Files:**
- Modify: `src/App.tsx`

这是最大的改动。逐步替换 `useState` 为 store selectors。

- [ ] **Step 1: 替换设备状态的 useState 为 store hooks**

在 App.tsx 顶部，移除设备相关的 `useState` 声明（lines 124-178 中的 12 个），替换为：

```typescript
import {
  useSources, useActiveSourceIds, useOutputs, useActiveOutputId,
  useVolume, useMute, useDim, useLoudnessStandard, useRefPresets,
  useMeterMonitorMode, useDeviceActions, useDeviceInfo,
} from './hooks/useDevice';
import { useMeterData } from './hooks/useMeterData';

// 在组件内：
const sources = useSources();
const activeSourceIds = useActiveSourceIds();
const outputs = useOutputs();
const activeOutput = useActiveOutputId();
const mainVolume = useVolume();
const isMute = useMute();
const isDim = useDim();
const loudnessStandard = useLoudnessStandard();
const refPresets = useRefPresets();
const meterMonitorMode = useMeterMonitorMode();
const { sampleRate, clockSource, deviceName } = useDeviceInfo();
const meterRef = useMeterData();
const actions = useDeviceActions();
```

- [ ] **Step 2: 替换事件处理函数**

将 `setMainVolume(v)` → `actions.setVolume(v)`，以此类推：

| 旧调用 | 新调用 |
|--------|--------|
| `setMainVolume(v)` | `actions.setVolume(v)` |
| `setIsDim(!isDim)` | `actions.setDim(!isDim)` |
| `setIsMute(!isMute)` | `actions.setMute(!isMute)` |
| `toggleSource(id)` / `handleSourceSelect(id)` | `actions.selectSource(id)` |
| `toggleLock(id)` | `actions.toggleSourceLock(id)` |
| `setActiveOutput(id)` / `handleOutputSelect(id)` | `actions.selectOutput(id)` |
| `setLoudnessStandard(name)` | `actions.setLoudnessStandard(name)` |
| `setSources(prev => ...)` (in onSave/onColorChange) | `actions.updateSource(updated)` |
| `setOutputs(prev => ...)` | `actions.updateOutput(updated)` |

- [ ] **Step 3: 移除 meter 模拟的 useEffect**

删除 `App.tsx:294-346` 整个 meter 模拟 `useEffect`。meter 数据现在从 `meterRef.current` 读取。

- [ ] **Step 4: 保留 UI-only useState**

这些不动：
```typescript
const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
const [editingOutputId, setEditingOutputId] = useState<string | null>(null);
const [selectionContext, setSelectionContext] = useState<'SOURCE' | 'OUTPUT'>('SOURCE');
const [isLoudnessMenuOpen, setIsLoudnessMenuOpen] = useState(false);
const [isMeterMenuOpen, setIsMeterMenuOpen] = useState(false);
// ... 所有布局/拖拽状态
```

- [ ] **Step 5: 验证编译 + UI 行为**

```bash
npm run dev
```

Expected: Electron 启动，UI 正常显示，状态操作（切换 Source、调音量、DIM/MUTE）正常工作。Meter 此时可能还没渲染（下一步处理）。

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: migrate App.tsx device state to Zustand store"
```

---

## Task 8: 统一 Meter 数据源 + rAF 渲染

**Files:**
- Modify: `src/components/Meter.tsx`
- Modify: `src/components/SourceStrip.tsx`
- Modify: `src/components/OutputStrip.tsx`
- Modify: `src/components/SourceConfigEditor.tsx`
- Modify: `src/App.tsx`（meter bridge 区域）

- [ ] **Step 1: 改造 Meter.tsx 支持 ref 驱动**

给 Meter 组件加一个可选的 `valueRef` 模式。当传入 `channelIndex` + 共享 `meterRef` 时，用 rAF 读取；否则用 props（向后兼容）。

```typescript
interface MeterProps {
  level: number;
  peak: number;
  color: string;
  label: string;
}
```

保持原有 props 接口不变。rAF 优化在 Phase 后期或性能调优时再做。当前先让数据流通。

- [ ] **Step 2: App.tsx meter bridge 区域改为读 meterRef**

在 meter bridge 的渲染区域，加一个 `useEffect` + `setInterval`（暂时）来从 `meterRef.current` 读取并驱动 Meter 组件：

```typescript
// 临时方案：用 useState 存储从 ref 读取的快照，驱动渲染
// 后续优化为纯 rAF + canvas
const [meterSnapshot, setMeterSnapshot] = useState({ levels: Array(16).fill(0), peaks: Array(16).fill(0) });

useEffect(() => {
  const id = setInterval(() => {
    const data = meterRef.current;
    setMeterSnapshot({ levels: [...data.levels], peaks: [...data.peaks] });
  }, 50); // 20fps 足够视觉流畅
  return () => clearInterval(id);
}, []);
```

将 meter bridge 中 `meterValues[channel.originalIndex]` 替换为 `meterSnapshot.levels[channel.originalIndex]`。

- [ ] **Step 3: 移除 SourceStrip 的独立 meter 模拟**

`SourceStrip.tsx` 中搜索 `setInterval` + `Math.random()`（约 lines 96-110），删除整个 meter 模拟 useEffect。mini meter 的数据改为从父组件传入或暂时置零。

- [ ] **Step 4: 移除 OutputStrip 的独立 meter 模拟**

`OutputStrip.tsx` 中同理（约 lines 77-91），删除 meter 模拟。

- [ ] **Step 5: 移除 SourceConfigEditor 的独立 meter 模拟**

`SourceConfigEditor.tsx:142-143`，删除 `Math.random()` 模拟。

- [ ] **Step 6: 验证**

```bash
npm run dev
```

Expected: 主 meter bridge 显示来自 MockDeviceService 的模拟数据。SourceStrip / OutputStrip 的 mini meter 暂时静默（可接受，后续 Phase 补充）。无 console 报错。

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/App.tsx
git commit -m "refactor: unify meter data source, remove 4 independent simulations"
```

---

## Task 9: 创建 HIDDeviceService 骨架

**Files:**
- Create: `electron/device/HIDDeviceService.ts`

- [ ] **Step 1: 创建骨架文件**

硬件工程师的起点，所有方法抛 "not implemented"：

```typescript
import { DeviceService, ConnectionState, FullDeviceState } from './DeviceService';
import type { Source, Output, OutputChannel, EQBand, BassManagementConfig } from '../../shared/types';

/**
 * 硬件 HID 设备服务 — 硬件工程师在此实现
 *
 * 依赖: npm install node-hid
 *
 * 实现步骤见 spec: docs/plans/hid-spec/05-implementation-phases.md (Phase 1-5)
 * 参数参考: docs/plans/hid-spec/06-parameter-reference.md
 */
export class HIDDeviceService extends DeviceService {
  // TODO: 硬件工程师填充
  // private device: HID.HID | null = null;

  async connect(): Promise<void> {
    throw new Error('HIDDeviceService.connect() not implemented — see Phase 1');
  }

  async disconnect(): Promise<void> {
    throw new Error('Not implemented');
  }

  getConnectionState(): ConnectionState { return 'disconnected'; }

  async requestFullState(): Promise<FullDeviceState> {
    throw new Error('Not implemented');
  }

  setVolume(_db: number) { throw new Error('Not implemented — Phase 1.3'); }
  setMute(_enabled: boolean) { throw new Error('Not implemented — Phase 1.4'); }
  setDim(_enabled: boolean) { throw new Error('Not implemented — Phase 1.4'); }
  selectSource(_id: string) { throw new Error('Not implemented — Phase 2.1'); }
  deselectSource(_id: string) { throw new Error('Not implemented — Phase 2.1'); }
  setSourceLock(_id: string, _locked: boolean) { throw new Error('Not implemented — Phase 2.1'); }
  updateSource(_source: Source) { throw new Error('Not implemented — Phase 2.2'); }
  selectOutput(_id: string) { throw new Error('Not implemented — Phase 2.3'); }
  updateOutput(_output: Output) { throw new Error('Not implemented — Phase 2.3'); }
  setChannelParam(_oid: string, _ch: number, _p: Partial<OutputChannel>) { throw new Error('Not implemented — Phase 3'); }
  setParametricEQ(_oid: string, _ch: number, _bands: EQBand[]) { throw new Error('Not implemented — Phase 4'); }
  setGraphicEQ(_oid: string, _ch: number, _values: number[]) { throw new Error('Not implemented — Phase 4'); }
  setBassManagement(_oid: string, _config: BassManagementConfig) { throw new Error('Not implemented — Phase 4'); }
  setMeterSource(_mode: any) { throw new Error('Not implemented — Phase 5'); }
  setPinkNoise(_enabled: boolean, _level?: number) { throw new Error('Not implemented — Phase 5'); }
  setChannelPinkNoise(_ch: number, _enabled: boolean) { throw new Error('Not implemented — Phase 5'); }
  setRefPreset(_id: string, _name: string, _level: number) { throw new Error('Not implemented — Phase 5'); }
}
```

- [ ] **Step 2: Commit**

```bash
git add electron/device/HIDDeviceService.ts
git commit -m "feat: add HIDDeviceService skeleton for hardware engineer"
```

---

## Task 10: 最终验证 + 状态栏连接指示

**Files:**
- Modify: `src/App.tsx`（footer 区域）

- [ ] **Step 1: 更新底栏状态显示**

将 `App.tsx` 底栏的硬编码 "System Status: OK" 替换为实际连接状态：

```tsx
import { useConnectionState } from './hooks/useDevice';

// 在 footer 中：
const connectionState = useConnectionState();

<footer className="h-8 bg-[#0c0d11] border-t border-[#1a1b1f] flex items-center justify-between px-4 shrink-0 z-50">
  <div className="flex items-center gap-4 text-[9px] text-[#52525b]">
    <span className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${
        connectionState === 'connected' ? 'bg-emerald-500 shadow-[0_0_4px_rgba(52,211,153,0.6)]' :
        connectionState === 'connecting' ? 'bg-amber-500 animate-pulse' :
        'bg-zinc-600'
      }`}></span>
      {connectionState === 'connected' ? 'MOCK' : connectionState.toUpperCase()}
    </span>
  </div>
</footer>
```

- [ ] **Step 2: 全面验证**

```bash
npm run dev
```

验证清单：
1. Electron 窗口正常打开
2. 底栏显示 "MOCK"（绿点）
3. 切换 Source 正常
4. 切换 Output 正常
5. 主音量旋钮正常
6. DIM / MUTE 按钮正常
7. Meter bridge 有模拟数据跳动
8. Source / Output 编辑面板能打开关闭
9. 3D Visualizer 正常显示
10. 无 console 报错

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add connection status indicator in footer"
```

- [ ] **Step 4: 最终打包测试**

```bash
npm run build && npm run pack
```

Expected: `release/` 目录生成可运行的应用。

- [ ] **Step 5: Final commit + tag**

```bash
git add -A
git commit -m "milestone: Phase 0 complete — Electron + DeviceService architecture"
git tag v0.2.0-phase0
```
