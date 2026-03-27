# 00 — 现状、目标与技术决策

> 子文档 of [主文档](../2026-03-27-hid-interface-spec.md)

---

## 现状

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

## 不能直接交接的原因

| 问题 | 说明 |
|------|------|
| **没有 Electron** | node-hid 需要 Node.js 环境，纯 Web 应用无法访问 USB |
| **没有设备抽象层** | 15+ 个 `useState` 散落在 App.tsx，硬件工程师不知道往哪接 |
| **Mock 数据内联** | 3 处独立的 `Math.random()` meter 模拟（App.tsx + SourceStrip + OutputStrip），无法统一替换 |
| **没有 IPC** | Electron 的 Main Process ↔ Renderer Process 通信桥梁不存在 |
| **没有连接管理** | 无设备发现、断连检测、重连逻辑 |

## 目标架构

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

## 技术决策

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
