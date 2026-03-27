# 02 — 状态分层

> 子文档 of [主文档](../2026-03-27-hid-interface-spec.md)

---

## 设备状态 → Zustand Store

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

## UI 状态 → 留在组件 useState

纯界面交互状态，与硬件无关：

| 状态 | 说明 |
|------|------|
| `editingSourceId` / `editingOutputId` | 哪个编辑面板打开 |
| `selectionContext` | 可视化显示 Source 还是 Output |
| `isLoudnessMenuOpen` / `isMeterMenuOpen` | 下拉菜单展开 |
| `controlDeckHeight` / `meterBridgeRatio` | 布局尺寸 |
| `leftSidebarPercent` / `rightSidebarPercent` | 侧栏宽度 |
| 所有 `isDragging*` ref | 拖拽交互 |

## 静态常量 → 抽出到 constants/

当前内联在 App.tsx 的常量数据移到独立文件：

| 常量 | 当前位置 | 目标文件 |
|------|----------|----------|
| `SPEAKERS_916` | App.tsx:59-91 | `constants/audio.ts` |
| `CHANNELS_16` | App.tsx:97-114 | `constants/audio.ts` |
| `FORMAT_CHANNELS` | App.tsx:116-121 | `constants/audio.ts` |
| `LOUDNESS_STANDARDS` | App.tsx:31-49 | `constants/audio.ts` |
| `INITIAL_SOURCES` / `MOCK_OUTPUTS` | App.tsx:15-28 | `services/MockDeviceService.ts` |
