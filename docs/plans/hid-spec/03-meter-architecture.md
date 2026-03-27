# 03 — Meter 数据流

> 子文档 of [主文档](../2026-03-27-hid-interface-spec.md)

---

## 当前问题

存在 **3 处独立的 meter 模拟**，数据互不关联：

| 位置 | 内容 | 刷新 |
|------|------|------|
| `App.tsx:303-346` | 16 通道 + LUFS 主 meter | 50ms setInterval |
| `SourceStrip.tsx` | 每个 Source 条的 mini meter | 独立 setInterval |
| `OutputStrip.tsx` | 每个 Output 条的 mini meter | 独立 setInterval |

问题：数据不一致，无法统一切换到真实设备数据。

## 目标架构

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

## 关键设计点

1. **meter 数据写入 `useRef`**，不走 `useState` — 消灭 30fps 重渲染
2. **所有 meter 组件从同一个 ref 读取** — 数据一致性
3. **`requestAnimationFrame` 驱动绘制** — 与显示器刷新率同步
4. **LUFS 数据（更新慢，~100ms）可以用 useState** — 单值，影响小
5. **SourceStrip / OutputStrip 的 mini meter 不再自行模拟** — 读共享 ref 的对应切片
