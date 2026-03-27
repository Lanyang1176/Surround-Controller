# Topping Surround Controller — 硬件对接规格书

> 版本: 0.3 | 日期: 2026-03-27 | 作者: PGS 产品组
>
> 目标：把当前的前端原型改造成硬件工程师可以直接对接的状态。
> 硬件工程师只需实现一个 `HIDDeviceService.ts` 文件就能让整个系统跑起来。

---

## 文档结构

| # | 子文档 | 内容 | 主要读者 |
|---|--------|------|----------|
| 00 | [现状、目标与技术决策](hid-spec/00-overview.md) | 当前问题、目标架构、所有技术选型 | 全员 |
| 01 | [DeviceService 接口定义](hid-spec/01-device-service.md) | 抽象类、数据类型、事件、实现边界 | 硬件工程师 |
| 02 | [状态分层](hid-spec/02-state-management.md) | 设备状态 vs UI 状态拆分、常量提取 | 前端 |
| 03 | [Meter 数据流](hid-spec/03-meter-architecture.md) | 3 处模拟统一、useRef + rAF 架构 | 前端 |
| 04 | [Electron 架构](hid-spec/04-electron-setup.md) | 文件结构、IPC 接口、连接生命周期 | 前端 + 硬件 |
| 05 | [实现分阶段](hid-spec/05-implementation-phases.md) | Phase 0-5 路线图 | 全员 |
| 06 | [完整参数清单](hid-spec/06-parameter-reference.md) | 所有参数的类型、范围、读写方向 | 硬件工程师 |

---

## 快速导航

**硬件工程师从这里开始**：先读 [00](hid-spec/00-overview.md) 了解全貌 → 再读 [01](hid-spec/01-device-service.md) 看接口定义 → 查 [06](hid-spec/06-parameter-reference.md) 速查参数

**前端开发从这里开始**：先读 [00](hid-spec/00-overview.md) → 按 [05](hid-spec/05-implementation-phases.md) 的 Phase 0 顺序执行 → 参考 [02](hid-spec/02-state-management.md) [03](hid-spec/03-meter-architecture.md) [04](hid-spec/04-electron-setup.md)

---

## 一句话总结

当前是纯 Web 原型（Vite + React），需要改造为 Electron 桌面应用，加入 DeviceService 抽象层。
改造完成后，硬件工程师实现 `HIDDeviceService extends DeviceService`，前端自动跑起来。
