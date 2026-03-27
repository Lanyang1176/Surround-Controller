# 05 — 实现分阶段

> 子文档 of [主文档](../2026-03-27-hid-interface-spec.md)

---

## Phase 0 — 架构改造（前端团队，无需硬件）

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

**完成标志**：应用作为 Electron 桌面端运行，Mock 模式下行为与现有 Web 版一致。硬件工程师可以开始接入。

## Phase 1 — 通路验证（硬件工程师介入）

```
1.1  实现 HIDDeviceService 基础框架
1.2  设备枚举 + 连接/断连
1.3  主音量 读/写
1.4  DIM / MUTE 读/写
1.5  16 通道 Meter 推送
1.6  系统信息读取（采样率、版本）
```

## Phase 2 — Source / Output 切换

```
2.1  Source 选择 / 多选 / 锁定
2.2  Source 格式 + 名称 + 输入映射
2.3  Output 选择 / 格式 + 名称
```

## Phase 3 — 通道参数

```
3.1  输出端口映射
3.2  Trim / Delay / Phase
3.3  通道 Mute / Solo
3.4  HPF / LPF
```

## Phase 4 — DSP 参数

```
4.1  参量 EQ（8 段 × 16 通道）
4.2  图示 EQ（16 段 × 16 通道）
4.3  Bass Management
```

## Phase 5 — 高级功能

```
5.1  LUFS 实时数据
5.2  Meter 监听源切换
5.3  Pink Noise 发生器
5.4  参考电平预设
5.5  全量状态 Dump / Restore
```
