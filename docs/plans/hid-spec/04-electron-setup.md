# 04 — Electron 架构

> 子文档 of [主文档](../2026-03-27-hid-interface-spec.md)

---

## 目标文件结构

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

## IPC 接口（preload.ts）

```typescript
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

## 连接生命周期

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
