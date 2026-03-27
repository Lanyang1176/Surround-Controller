# 01 — DeviceService 接口定义

> 子文档 of [主文档](../2026-03-27-hid-interface-spec.md)
>
> 这是整份规格的核心。硬件工程师实现这个抽象类。

---

## 数据类型

```typescript
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
```

## 完整设备状态（用于全量同步）

```typescript
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
```

> Source / Output / OutputChannel / EQBand / BassManagementConfig 等业务类型复用现有 `src/types.ts` 定义。

## 抽象类

```typescript
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
}
```

## 事件（设备 → 上位机）

| 事件名 | 回调签名 | 频率 |
|--------|----------|------|
| `connection` | `(state: ConnectionState) => void` | 状态变更时 |
| `meter-data` | `(data: MeterData) => void` | 20-50ms |
| `state-changed` | `(state: FullDeviceState) => void` | 设备端参数变更时 |
| `device-info` | `(info: DeviceInfo) => void` | 连接后一次 |
| `error` | `(error: Error) => void` | 出错时 |

## 实现边界

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
