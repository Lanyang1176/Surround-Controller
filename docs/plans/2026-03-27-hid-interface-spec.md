# Topping Surround Controller — 硬件对接规格书

> 版本: 0.2 | 日期: 2026-03-27 | 作者: PGS 产品组
>
> 本文档的目标：把当前的前端原型改造成硬件工程师可以直接对接的状态。
> 读完这份文档，硬件工程师只需要实现一个 TypeScript 类就能让整个系统跑起来。

---

## 1. 现状与问题

### 1.1 当前架构

```
┌──────────────────────────────┐
│       Vite Web App           │
│  React 19 + Tailwind + TS   │
│                              │
│  · 所有状态在 App.tsx useState│
│  · Meter 用 Math.random()    │
│  · 无设备通信层              │
│  · 无 Electron 壳            │
└──────────────────────────────┘
```

### 1.2 不能直接交接的原因

| 问题 | 说明 |
|------|------|
| **没有 Electron** | node-hid 需要 Node.js 环境，纯 Web 应用无法访问 USB |
| **没有设备抽象层** | 15+ 个 `useState` 散落在 App.tsx，硬件工程师不知道往哪接 |
| **Mock 数据内联** | 3 处独立的 `Math.random()` meter 模拟（App.tsx + SourceStrip + OutputStrip），无法统一替换 |
| **没有 IPC** | Electron 的 Main Process ↔ Renderer Process 通信桥梁不存在 |
| **没有连接管理** | 无设备发现、断连检测、重连逻辑 |

### 1.3 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│ Electron App                                                     │
│                                                                   │
│  ┌─────────────────────┐    IPC     ┌──────────────────────┐    │
│  │  Renderer Process   │ ◄════════► │   Main Process       │    │
│  │                     │  contextBridge │                   │    │
│  │  React UI           │            │  DeviceService       │    │
│  │  Zustand Store      │            │   ├─ MockDevice      │    │
│  │  Canvas Meters      │            │   └─ HIDDevice ──► USB HID│
│  └─────────────────────┘            └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**硬件工程师的交付物**：一个文件 `HIDDeviceService.ts`，实现 `DeviceService` 抽象类。
不碰 React、不碰 UI、不碰 IPC。

---

## 2. 技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 运行环境 | Electron | node-hid 需要 Node.js |
| Vite 集成 | electron-vite (alex8088) | 分离 main/preload/renderer 配置，支持 native 模块 |
| 打包工具 | electron-builder | 成熟的 .dmg / .exe 安装包输出 |
| IPC 方式 | 标准 ipcMain/ipcRenderer | meter 数据量小（~140 bytes/帧 × 30fps），无需 SharedArrayBuffer |
| 设备抽象 | Abstract Class + EventEmitter | 硬件工程师熟悉的模式，零框架依赖 |
| 状态管理 | Zustand (selector subscriptions) | 防止 30fps meter 数据触发全局重渲染 |
| Meter 渲染 | useRef + requestAnimationFrame | meter 数据不走 React state，直写 ref，rAF 读取绘制 |
| 安全模型 | contextBridge + preload | nodeIntegration=false, contextIsolation=true |

---

## 3. DeviceService 接口定义

这是整份文档的核心。硬件工程师实现这个抽象类。

```typescript
// src/main/device/DeviceService.ts

import { EventEmitter } from 'events';

// ════════════════════════════════════════════
// 数据类型
// ════════════════════════════════════════════

export interface MeterData {
  levels: number[];    // 16 通道电平, dBFS
  peaks: number[];     // 16 通道 peak hold, dBFS
  lufs: {
    m: number;         // Momentary, LUFS
    s: number;         // Short-term, LUFS
    i: number;         // Integrated, LUFS
    tp: number;        // True Peak, dBTP
  };
}

export interface DeviceInfo {
  name: string;              // 如 "TOPPING 16 Mon"
  firmwareVersion: string;
  sampleRate: number;        // 44100 / 48000 / 96000 / 192000
  clockSource: string;       // "Internal" / "USB" / "External"
}

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

// Source / Output / Channel 等业务类型复用现有 types.ts 定义

// ════════════════════════════════════════════
// 完整设备状态（用于全量同步）
// ════════════════════════════════════════════

export interface FullDeviceState {
  info: DeviceInfo;
  volume: number;            // dB
  dim: boolean;
  dimAmount: number;         // dB
  mute: boolean;
  sources: Source[];
  activeSourceIds: string[];
  sourceLocks: Record<string, boolean>;
  outputs: Output[];
  activeOutputId: string;
  refPresets: { id: string; name: string; level: number }[];
  meterSource: {
    type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC';
    id?: string;
  };
}

// ════════════════════════════════════════════
// 抽象类
// ════════════════════════════════════════════

export abstract class DeviceService extends EventEmitter {

  // ── 生命周期 ──
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getConnectionState(): ConnectionState;

  // ── 全量状态同步（上电/重连后调用）──
  abstract requestFullState(): Promise<FullDeviceState>;

  // ── 全局控制 ──
  abstract setVolume(db: number): void;
  abstract setMute(enabled: boolean): void;
  abstract setDim(enabled: boolean): void;

  // ── Source 管理 ──
  abstract selectSource(sourceId: string): void;
  abstract deselectSource(sourceId: string): void;
  abstract setSourceLock(sourceId: string, locked: boolean): void;
  abstract updateSource(source: Source): void;

  // ── Output 管理 ──
  abstract selectOutput(outputId: string): void;
  abstract updateOutput(output: Output): void;

  // ── 通道参数（寻址: outputId + channelIndex）──
  abstract setChannelParam(
    outputId: string,
    channelIndex: number,
    param: Partial<OutputChannel>
  ): void;

  // ── EQ ──
  abstract setParametricEQ(
    outputId: string,
    channelIndex: number,
    bands: EQBand[]
  ): void;

  abstract setGraphicEQ(
    outputId: string,
    channelIndex: number,
    values: number[]  // 16 个值
  ): void;

  // ── Bass Management ──
  abstract setBassManagement(
    outputId: string,
    config: BassManagementConfig
  ): void;

  // ── Meter 控制 ──
  abstract setMeterSource(mode: {
    type: 'FOLLOW_INPUT' | 'FOLLOW_OUTPUT' | 'SPECIFIC';
    id?: string;
  }): void;

  // ── Pink Noise ──
  abstract setPinkNoise(enabled: boolean, level?: number): void;
  abstract setChannelPinkNoise(channelIndex: number, enabled: boolean): void;

  // ── Ref 预设 ──
  abstract setRefPreset(id: string, name: string, level: number): void;

  // ════════════════════════════════════════
  // 事件（设备 → 上位机）
  // ════════════════════════════════════════
  //
  // 'connection'    → (state: ConnectionState)
  // 'meter-data'    → (data: MeterData)          // 20-50ms 间隔
  // 'state-changed' → (state: FullDeviceState)   // 设备端参数变更
  // 'device-info'   → (info: DeviceInfo)
  // 'error'         → (error: Error)
}
```

### 3.1 硬件工程师的实现边界

```
硬件工程师负责：
  ✅ HIDDeviceService extends DeviceService
  ✅ HID 报文编码/解码
  ✅ USB 设备枚举 (node-hid)
  ✅ Meter 数据解析并 emit('meter-data', data)
  ✅ 设备端参数变更时 emit('state-changed', state)

硬件工程师不碰：
  ❌ React / JSX / Tailwind
  ❌ Electron IPC / preload
  ❌ Zustand store
  ❌ UI 布局和样式
```

---

## 4. 状态分层

### 4.1 设备状态 → Zustand Store

从 App.tsx 的 `useState` 中提取，通过 DeviceService 读写：

| 状态 | 当前位置 | 说明 |
|------|----------|------|
| `sources` | App.tsx:124 | 5 路输入配置 |
| `activeSourceIds` | App.tsx:127 | 当前选中的 Source |
| `outputs` | App.tsx:130 | 4 套输出配置 |
| `activeOutput` | App.tsx:132 | 当前选中的 Output |
| `mainVolume` | App.tsx:134 | 主音量 |
| `isDim` | App.tsx:135 | DIM 开关 |
| `isMute` | App.tsx:136 | MUTE 开关 |
| `meterValues` | App.tsx:175 | 16 通道电平 |
| `lufsMeter` | App.tsx:178 | LUFS 数据 |
| `meterMonitorMode` | App.tsx:153 | Meter 监听源 |
| `loudnessStandard` | App.tsx:139 | 响度标准选择 |
| `refPresets` | App.tsx:145 | 参考电平预设 |

### 4.2 UI 状态 → 留在组件 useState

纯界面交互状态，与硬件无关：

| 状态 | 说明 |
|------|------|
| `editingSourceId` / `editingOutputId` | 哪个编辑面板打开 |
| `selectionContext` | 可视化显示 Source 还是 Output |
| `isLoudnessMenuOpen` / `isMeterMenuOpen` | 下拉菜单展开 |
| `controlDeckHeight` / `meterBridgeRatio` | 布局尺寸 |
| `leftSidebarPercent` / `rightSidebarPercent` | 侧栏宽度 |
| 所有 `isDragging*` ref | 拖拽交互 |

### 4.3 静态常量 → 抽出到 constants/

当前内联在 App.tsx 的常量数据移到独立文件：

| 常量 | 当前位置 | 目标文件 |
|------|----------|----------|
| `SPEAKERS_916` | App.tsx:59-91 | `constants/audio.ts` |
| `CHANNELS_16` | App.tsx:97-114 | `constants/audio.ts` |
| `FORMAT_CHANNELS` | App.tsx:116-121 | `constants/audio.ts` |
| `LOUDNESS_STANDARDS` | App.tsx:31-49 | `constants/audio.ts` |
| `INITIAL_SOURCES` / `MOCK_OUTPUTS` | App.tsx:15-28 | `services/MockDeviceService.ts` |

---

## 5. Meter 数据流

### 5.1 当前问题

存在 **3 处独立的 meter 模拟**：
- `App.tsx:303-346` — 16 通道 + LUFS 主 meter
- `SourceStrip.tsx` — 每个 Source 条的 mini meter（独立 setInterval）
- `OutputStrip.tsx` — 每个 Output 条的 mini meter（独立 setInterval）

这导致数据不一致，且无法统一切换到真实设备数据。

### 5.2 目标架构

```
DeviceService.emit('meter-data', data)
        │
        ▼
  Electron IPC → Renderer
        │
        ▼
  useRef<MeterData>          ← 不触发 React re-render
        │
    ┌───┼───────────┐
    ▼   ▼           ▼
  主Meter桥    SourceStrip   OutputStrip
 (rAF绘制)    (读同一ref)   (读同一ref)
```

- meter 数据写入 `useRef`，不走 `useState`
- 所有 meter 组件从同一个 ref 读取，通过 `requestAnimationFrame` 驱动绘制
- React 不参与 meter 的渲染循环，杜绝 30fps 时的重渲染风暴

---

## 6. Electron 架构

### 6.1 目标文件结构

```
topping-surround-controller/
├── electron/
│   ├── main.ts                    # Electron 主进程入口
│   ├── preload.ts                 # contextBridge 暴露 API
│   └── device/
│       ├── DeviceService.ts       # 抽象类定义
│       ├── MockDeviceService.ts   # Mock 实现（现有模拟逻辑迁入）
│       └── HIDDeviceService.ts    # 🔧 硬件工程师实现
│
├── src/                           # Renderer（现有前端代码）
│   ├── App.tsx                    # 瘦化后的主组件
│   ├── index.tsx
│   ├── types.ts
│   ├── constants/
│   │   └── audio.ts               # 通道/格式/响度标准常量
│   ├── stores/
│   │   └── deviceStore.ts         # Zustand device state
│   ├── hooks/
│   │   ├── useDevice.ts           # 设备状态 hook
│   │   └── useMeterData.ts        # Meter ref hook
│   ├── components/                # 现有组件（改为从 store 读状态）
│   └── lib/
│       └── utils.ts
│
├── electron-builder.yml
├── electron.vite.config.ts
└── package.json
```

### 6.2 IPC 接口（preload.ts）

```typescript
// electron/preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  // 命令（Renderer → Main → Device）
  setVolume:       (db: number)     => ipcRenderer.send('device:cmd', 'setVolume', db),
  setMute:         (v: boolean)     => ipcRenderer.send('device:cmd', 'setMute', v),
  setDim:          (v: boolean)     => ipcRenderer.send('device:cmd', 'setDim', v),
  selectSource:    (id: string)     => ipcRenderer.send('device:cmd', 'selectSource', id),
  selectOutput:    (id: string)     => ipcRenderer.send('device:cmd', 'selectOutput', id),
  setChannelParam: (outputId, ch, p)=> ipcRenderer.send('device:cmd', 'setChannelParam', outputId, ch, p),
  // ... 其余命令同理

  // 事件（Main → Renderer）
  onMeterData:       (cb) => ipcRenderer.on('device:meters', (_, d) => cb(d)),
  onConnectionState: (cb) => ipcRenderer.on('device:connection', (_, s) => cb(s)),
  onFullState:       (cb) => ipcRenderer.on('device:full-state', (_, s) => cb(s)),
  onDeviceInfo:      (cb) => ipcRenderer.on('device:info', (_, i) => cb(i)),

  // 请求
  requestFullState: () => ipcRenderer.invoke('device:request-state'),
});
```

### 6.3 连接生命周期

```
启动 → 尝试连接 HIDDeviceService
         │
         ├── 成功 → emit('connected') → requestFullState() → 正常运行
         │
         └── 3s 无设备 → 自动切换 MockDeviceService → UI 底栏显示 "MOCK"
                │
                └── 后台持续轮询 HID.devices()（指数退避，上限 5s）
                         │
                         └── 检测到设备 → 切换回 HIDDeviceService → 全量同步
```

断连时：
- UI 显示 "未连接" 状态
- 设备端保持最后工作状态（音频不中断）
- 自动重连，重连后全量同步

---

## 7. 实现分阶段

### Phase 0 — 架构改造（前端团队，无需硬件）

```
0.1  搭 Electron 壳 (electron-vite + electron-builder)
0.2  定义 DeviceService 抽象类
0.3  实现 MockDeviceService（迁入现有模拟逻辑）
0.4  建 Zustand store，App.tsx 状态迁移
0.5  统一 meter 数据源（消灭 3 处独立模拟）
0.6  Meter 渲染改 useRef + rAF
0.7  加 IPC 层（preload + contextBridge）
0.8  验证：Mock 模式下 UI 行为与当前一致
```

**Phase 0 完成标志**：应用作为 Electron 桌面端运行，Mock 模式下行为与现有 Web 版一致。硬件工程师可以开始接入。

### Phase 1 — 通路验证（硬件工程师介入）

```
1.1  实现 HIDDeviceService 基础框架
1.2  设备枚举 + 连接/断连
1.3  主音量 读/写
1.4  DIM / MUTE 读/写
1.5  16 通道 Meter 推送
1.6  系统信息读取（采样率、版本）
```

### Phase 2 — Source / Output 切换

```
2.1  Source 选择 / 多选 / 锁定
2.2  Source 格式 + 名称 + 输入映射
2.3  Output 选择 / 格式 + 名称
```

### Phase 3 — 通道参数

```
3.1  输出端口映射
3.2  Trim / Delay / Phase
3.3  通道 Mute / Solo
3.4  HPF / LPF
```

### Phase 4 — DSP 参数

```
4.1  参量 EQ（8 段 × 16 通道）
4.2  图示 EQ（16 段 × 16 通道）
4.3  Bass Management
```

### Phase 5 — 高级功能

```
5.1  LUFS 实时数据
5.2  Meter 监听源切换
5.3  Pink Noise 发生器
5.4  参考电平预设
5.5  全量状态 Dump / Restore
```

---

## 附录 A：完整参数清单

### A.1 系统信息（只读）

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 设备名称 | string | max 32 char | R |
| 固件版本 | string | "x.y.z" | R |
| 采样率 | uint32 | 44100/48000/96000/192000 | R |
| 时钟源 | enum | Internal/USB/External | R |

### A.2 全局控制

| 参数 | 类型 | 范围 | 步进 | 方向 |
|------|------|------|------|------|
| 主音量 | float | -96.0 ~ +12.0 dB | 0.1 dB | R/W |
| DIM 开关 | bool | on/off | — | R/W |
| DIM 衰减量 | float | -30.0 ~ -6.0 dB | 0.1 dB | R/W |
| MUTE 开关 | bool | on/off | — | R/W |

### A.3 Source 输入（5 路）

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 名称 | string | max 16 char | R/W |
| 格式 | enum | 9.1.6/7.1.4/5.1/Stereo | R/W |
| 分配状态 | bool | assigned/unassigned | R |
| 输入映射 | uint8[16] | 物理端口 1-32 | R/W |
| 当前选中 | uint8[] | 1-5, 支持多选 | R/W |
| 锁定 | bool × 5 | per source | R/W |

### A.4 Output 输出（4 套）

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 名称 | string | max 16 char | R/W |
| 格式 | enum | 9.1.6/7.1.4/5.1/Stereo | R/W |
| 当前选中 | uint8 | 1-4 | R/W |

### A.5 通道参数（16ch × 4 Output）

寻址：Output 编号 + 通道编号

| 参数 | 类型 | 范围 | 步进 | 方向 |
|------|------|------|------|------|
| 输出端口映射 | uint8 | 1-32 | — | R/W |
| Trim | float | -12.0 ~ +12.0 dB | 0.1 dB | R/W |
| Delay | float | 0 ~ 500.00 ms | 0.01 ms | R/W |
| Phase 反相 | bool | on/off | — | R/W |
| Mute | bool | on/off | — | R/W |
| Solo | bool | on/off | — | R/W |
| HPF | uint16 | 0=OFF, 20-500 Hz | 1 Hz | R/W |
| LPF | uint16 | 0=OFF, 1000-20000 Hz | 1 Hz | R/W |

### A.6 参量 EQ（8 段/通道）

| 参数 | 类型 | 范围 | 步进 | 方向 |
|------|------|------|------|------|
| Enabled | bool | on/off | — | R/W |
| Type | enum | peak/lowShelf/highShelf/lowPass/highPass | — | R/W |
| Frequency | float | 20-20000 Hz | 1 Hz | R/W |
| Gain | float | -12.0 ~ +12.0 dB | 0.1 dB | R/W |
| Q | float | 0.10 ~ 10.00 | 0.01 | R/W |

### A.7 图示 EQ（16 段/通道）

| 参数 | 类型 | 范围 | 步进 | 方向 |
|------|------|------|------|------|
| Band 1-16 | float[16] | -12.0 ~ +12.0 dB | 0.1 dB | R/W |

频点：25, 40, 63, 100, 160, 250, 400, 630, 1k, 1.6k, 2.5k, 4k, 6.3k, 10k, 16k, 20k Hz

### A.8 Bass Management（每 Output 一个）

**全局**：

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 分频点 | uint16 | 40-200 Hz | R/W |
| HP 斜率 | enum | 6/12/24 dB/Oct | R/W |
| LP 斜率 | enum | 6/12/24 dB/Oct | R/W |
| LFE 滤波开关 | bool | on/off | R/W |
| LFE 滤波频率 | uint16 | 40-200 Hz | R/W |
| LFE 滤波斜率 | enum | 12/24 dB/Oct | R/W |

**每通道**：

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| Speaker Size | enum | Large/Small | R/W |
| Sub 发送 1-4 开关 | bool × 4 | — | R/W |
| Sub 发送 1-4 电平 | float × 4 | dB | R/W |

**Sub 输出**（最多 4 个）：

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 名称 | string | max 8 char | R/W |
| 输出端口 | uint8 | 1-32 | R/W |
| Mute / Solo | bool | — | R/W |
| Delay | float | 0-500 ms | R/W |

### A.9 Meter 数据（设备推送，只读）

| 数据 | 类型 | 刷新率 |
|------|------|--------|
| 16 通道 Level | float[16] | 20-50ms |
| 16 通道 Peak Hold | float[16] | 20-50ms |
| LUFS M/S/I/TP | float × 4 | 100ms |

Meter 源选择：

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 监听源 | enum | FOLLOW_INPUT/FOLLOW_OUTPUT/SPECIFIC | R/W |
| 指定 ID | uint8 | Source 1-5 或 Output 1-4 | R/W |

### A.10 Pink Noise

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 全局开关 | bool | on/off | R/W |
| 输出电平 | float | -60.0 ~ 0.0 dB | R/W |
| 每通道发送 | bool × 16 | — | R/W |

### A.11 参考电平预设（3 个）

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 名称 | string × 3 | max 8 char | R/W |
| 电平 | float × 3 | -80.0 ~ 0.0 dB | R/W |

---

## 附录 B：通道编号与格式映射

| 编号 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|---|---|---|---|---|---|---|---|---|----|----|----|----|----|----|-----|
| 声道 | L | R | C | LFE | Ls | Rs | Lrs | Rrs | Lw | Rw | Ltf | Rtf | Ltm | Rtm | Ltr | Rtr |

| 格式 | 使用的通道编号 |
|------|---------------|
| 9.1.6 | 1-16（全部） |
| 7.1.4 | 1-8, 11-12, 15-16 |
| 5.1 | 1-6 |
| Stereo | 1-2 |

## 附录 C：延迟单位换算

设备统一使用毫秒，UI 端换算：

| 显示单位 | 换算 |
|----------|------|
| ms | 直接值 |
| m | ms × 0.343 (声速 343 m/s @ 20°C) |
| cm | ms × 34.3 |

## 附录 D：UI 区域与参数对照

| UI 区域 | 对应参数域 |
|---------|-----------|
| 顶栏 | 系统信息（A.1） |
| 左侧栏 Source Strip | Source 管理（A.3） |
| 右侧栏 Output Strip | Output 管理（A.4） |
| 中央 Monitor Level | 全局控制（A.2）+ Ref 预设（A.11） |
| 中央 Meter Bridge | Meter 数据（A.9） |
| 中央 3D Visualizer | 通道 Mute/Solo 状态映射 |
| Source 编辑面板 | Source 输入映射、格式 |
| Output > Channel Routing | 通道参数（A.5） |
| Output > Parametric EQ | 参量 EQ（A.6） |
| Output > Graphic EQ | 图示 EQ（A.7） |
| Output > Bass Management | Bass Management（A.8） |
