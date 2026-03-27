# Topping Surround Controller — HID 接口需求规格

> 版本: 0.1 | 日期: 2026-03-27 | 作者: PGS 产品组
>
> 本文档定义上位机（Electron 桌面应用）需要从硬件设备读取和写入的全部参数。
> HID 报文格式、字节布局、端点分配由硬件工程师根据本文档需求自行设计。

---

## 1. 架构概述

```
┌──────────────────┐        USB HID        ┌──────────────────┐
│  Electron App    │ ◄════════════════════► │  硬件设备          │
│                  │                        │                    │
│  职责：           │                        │  职责：             │
│  · 参数显示与编辑  │    参数读写 (双向)      │  · 全部音频 DSP     │
│  · 实时 Meter 显示│    Meter 数据 (设备→App) │  · Meter 计算       │
│  · 用户交互       │                        │  · 状态管理          │
└──────────────────┘                        └──────────────────┘
```

**关键原则**：
- 所有音频处理（EQ、路由、Bass Management、电平控制）在设备端 DSP 完成
- 上位机是纯控制面板——发参数、收状态、显示 Meter
- Meter 数据建议设备主动推送（行业惯例），刷新间隔 20-50ms

---

## 2. 通道格式定义

设备支持 4 种通道格式，最高 9.1.6（16 通道）：

| 格式 | 通道数 | 通道列表 |
|------|--------|----------|
| **9.1.6** | 16 | L, R, C, LFE, Ls, Rs, Lrs, Rrs, Lw, Rw, Ltf, Rtf, Ltm, Rtm, Ltr, Rtr |
| **7.1.4** | 12 | L, R, C, LFE, Ls, Rs, Lrs, Rrs, Ltf, Rtf, Ltr, Rtr |
| **5.1** | 6 | L, R, C, LFE, Ls, Rs |
| **Stereo** | 2 | L, R |

**通道编号固定映射**（无论当前格式，编号不变）：

| 编号 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|------|---|---|---|---|---|---|---|---|---|----|----|----|----|----|----|-----|
| 声道 | L | R | C | LFE | Ls | Rs | Lrs | Rrs | Lw | Rw | Ltf | Rtf | Ltm | Rtm | Ltr | Rtr |
| 分组 | LCR | LCR | LCR | LFE | Surr | Surr | Surr | Surr | Surr | Surr | Height | Height | Height | Height | Height | Height |

---

## 3. 功能域参数清单

### 3.1 系统信息（只读）

| 参数 | 类型 | 范围/枚举 | 方向 | 说明 |
|------|------|-----------|------|------|
| 设备名称 | string | max 32 char | R | 固定标识，如 "TOPPING 16 Mon" |
| 固件版本 | string | "x.y.z" | R | |
| 采样率 | uint32 | 44100 / 48000 / 96000 / 192000 | R | 当前运行采样率 |
| 时钟源 | enum | Internal / USB / External | R | 当前时钟锁定状态 |
| 连接状态 | — | — | R | 上位机通过 USB 连接事件检测 |

### 3.2 全局控制

| 参数 | 类型 | 范围 | 步进 | 方向 | 说明 |
|------|------|------|------|------|------|
| 主音量 | float | -96.0 ~ +12.0 dB | 0.1 dB | R/W | 主旋钮控制 |
| DIM 开关 | bool | on / off | — | R/W | 快速衰减 |
| DIM 衰减量 | float | -30.0 ~ -6.0 dB | 0.1 dB | R/W | DIM 时的衰减幅度 |
| MUTE 开关 | bool | on / off | — | R/W | 全局静音 |

### 3.3 Source 输入管理（5 路）

每个 Source 槽位的参数：

| 参数 | 类型 | 范围 | 方向 | 说明 |
|------|------|------|------|------|
| 名称 | string | max 16 char | R/W | 用户自定义，如 "Source A" |
| 格式 | enum | 9.1.6 / 7.1.4 / 5.1 / Stereo | R/W | 决定活跃通道数 |
| 分配状态 | bool | assigned / unassigned | R | 此槽位是否有有效物理输入 |
| 输入映射 | uint8[16] | 物理输入端口号 1-32 | R/W | 每个声道映射到哪个物理输入端口 |

全局 Source 选择状态：

| 参数 | 类型 | 范围 | 方向 | 说明 |
|------|------|------|------|------|
| 当前选中 Source | uint8[] | 1-5，支持多选 | R/W | 哪些 Source 被激活 |
| Source 锁定 | bool × 5 | per source | R/W | 多选锁定标记（锁定的 source 切换时保留） |

### 3.4 Output 输出管理（4 套）

每套 Output 配置的参数：

| 参数 | 类型 | 范围 | 方向 | 说明 |
|------|------|------|------|------|
| 名称 | string | max 16 char | R/W | 如 "Main"、"Alt 1" |
| 格式 | enum | 9.1.6 / 7.1.4 / 5.1 / Stereo | R/W | 输出通道格式 |
| 当前选中 Output | uint8 | 1-4 | R/W | 全局只有一套 Output 激活 |

### 3.5 通道参数（每通道，最多 16ch × 4 套 Output）

寻址方式：**Output 编号（1-4）+ 通道编号（1-16）**

| 参数 | 类型 | 范围 | 步进 | 方向 | 说明 |
|------|------|------|------|------|------|
| 输出端口映射 | uint8 | 物理端口号 1-32 | — | R/W | 此声道从哪个物理端口输出 |
| Trim | float | -12.0 ~ +12.0 dB | 0.1 dB | R/W | 电平微调 |
| Delay | float | 0 ~ 500.00 ms | 0.01 ms | R/W | 延迟补偿（UI 可显示为 m 或 cm，换算在上位机） |
| Phase 反相 | bool | on / off | — | R/W | 180° 极性翻转 |
| Mute | bool | on / off | — | R/W | 单通道静音 |
| Solo | bool | on / off | — | R/W | 单通道独奏（设备端需实现 solo 互斥逻辑） |
| HPF 频率 | uint16 | 0 = OFF, 20-500 Hz | 1 Hz | R/W | 高通滤波 |
| LPF 频率 | uint16 | 0 = OFF, 1000-20000 Hz | 1 Hz | R/W | 低通滤波 |

### 3.6 参量 EQ（每通道最多 8 段）

寻址方式：**Output 编号 + 通道编号 + EQ Band 编号（1-8）**

| 参数 | 类型 | 范围 | 步进 | 方向 |
|------|------|------|------|------|
| Enabled | bool | on / off | — | R/W |
| Type | enum | peak / lowShelf / highShelf / lowPass / highPass | — | R/W |
| Frequency | float | 20.0 ~ 20000.0 Hz | 1 Hz | R/W |
| Gain | float | -12.0 ~ +12.0 dB | 0.1 dB | R/W |
| Q | float | 0.10 ~ 10.00 | 0.01 | R/W |

### 3.7 图示 EQ（每通道 16 段固定频点）

寻址方式：**Output 编号 + 通道编号**（一次传 16 个值）

| 参数 | 类型 | 范围 | 步进 | 方向 |
|------|------|------|------|------|
| Band 1-16 增益 | float[16] | -12.0 ~ +12.0 dB | 0.1 dB | R/W |

固定频点（Hz）：`25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000, 20000`

### 3.8 Bass Management（每套 Output 一个）

寻址方式：**Output 编号**

**全局参数**：

| 参数 | 类型 | 范围 | 步进 | 方向 | 说明 |
|------|------|------|------|------|------|
| 分频点 | uint16 | 40-200 Hz | 1 Hz | R/W | 主分频频率 |
| HP 斜率 | enum | 6 / 12 / 24 dB/Oct | — | R/W | 高通滤波器斜率 |
| LP 斜率 | enum | 6 / 12 / 24 dB/Oct | — | R/W | 低通滤波器斜率 |
| LFE 滤波开关 | bool | on / off | — | R/W | LFE 通道独立低通 |
| LFE 滤波频率 | uint16 | 40-200 Hz | 1 Hz | R/W | LFE 低通截止频率 |
| LFE 滤波斜率 | enum | 12 / 24 dB/Oct | — | R/W | |

**每通道 Bass 设置**（16 通道）：

| 参数 | 类型 | 范围 | 方向 | 说明 |
|------|------|------|------|------|
| Speaker Size | enum | Large / Small | R/W | Large = 全频不分频，Small = 低频发送到 Sub |
| Sub 发送 1-4 开关 | bool × 4 | per sub | R/W | 是否发送低频到对应 Sub |
| Sub 发送 1-4 电平 | float × 4 | -inf ~ +12.0 dB | R/W | 发送电平 |

**Sub 输出配置**（最多 4 个 Sub）：

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| Sub 名称 | string | max 8 char | R/W |
| Sub 输出端口 | uint8 | 物理端口号 1-32 | R/W |
| Sub Mute | bool | on / off | R/W |
| Sub Solo | bool | on / off | R/W |
| Sub Delay | float | 0 ~ 500 ms | R/W |

### 3.9 实时 Meter 数据（只读，设备推送）

**通道电平**（建议 20-50ms 推送间隔）：

| 数据 | 类型 | 单位 | 说明 |
|------|------|------|------|
| 16 通道 Level | float[16] | dBFS | 当前 RMS 或 peak 电平 |
| 16 通道 Peak Hold | float[16] | dBFS | Peak hold 值（设备端维护衰减） |

**LUFS 数据**（建议 100ms 推送间隔）：

| 数据 | 类型 | 单位 | 说明 |
|------|------|------|------|
| Momentary (M) | float | LUFS | 400ms 窗口 |
| Short-term (S) | float | LUFS | 3s 窗口 |
| Integrated (I) | float | LUFS | 从启动/重置起累计 |
| True Peak (TP) | float | dBTP | 采样间峰值 |

**Meter 监听源选择**（上位机需要切换 meter 看哪里）：

| 参数 | 类型 | 范围 | 方向 | 说明 |
|------|------|------|------|------|
| Meter 源 | enum | FOLLOW_INPUT / FOLLOW_OUTPUT / SPECIFIC | R/W | Meter 跟随逻辑 |
| Meter 指定 ID | uint8 | Source 1-5 或 Output 1-4 | R/W | SPECIFIC 模式下指定监听哪路 |

### 3.10 Pink Noise 发生器

| 参数 | 类型 | 范围 | 步进 | 方向 |
|------|------|------|------|------|
| 全局开关 | bool | on / off | — | R/W |
| 输出电平 | float | -60.0 ~ 0.0 dB | 0.1 dB | R/W |
| 每通道发送开关 | bool × 16 | per channel | — | R/W |

### 3.11 参考电平预设（3 个）

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| Ref 1/2/3 名称 | string × 3 | max 8 char | R/W |
| Ref 1/2/3 电平 | float × 3 | -80.0 ~ 0.0 dB | R/W |

---

## 4. 状态同步需求

### 4.1 上电/连接

上位机连接设备后，需要一次性读取全部当前状态：
- 系统信息（采样率、时钟、版本）
- 全局控制状态（音量、DIM、MUTE）
- 所有 Source 配置（5 路）
- 所有 Output 配置（4 套，含通道参数、EQ、Bass Management）
- 当前选中的 Source 和 Output

> 硬件工程师决定是一条命令"dump all"还是分域逐个读取。

### 4.2 参数变更

- **上位机 → 设备**：用户在 UI 上改参数，立即发送给设备。设备回 ACK 确认。
- **设备 → 上位机**：如果设备端有物理旋钮/按钮改了参数，需要主动通知上位机更新 UI。

### 4.3 断连处理

- 上位机检测到 USB 断开后，UI 进入"未连接"状态，所有控件灰显
- 重新连接后，重新执行 4.1 的全量状态同步
- 设备端应保持最后的工作状态（断连不影响音频处理）

---

## 5. 实现优先级建议

面向硬件工程师的分阶段实现路线：

```
Phase 1 — 通路验证（最小可用原型）
  ├── 设备枚举 + 连接/断连检测
  ├── 系统信息读取（采样率、版本）
  ├── 主音量 读/写
  ├── DIM / MUTE 读/写
  └── 16 通道 Meter 推送

Phase 2 — Source / Output 切换
  ├── Source 选择 / 多选 / 锁定
  ├── Source 格式 + 名称 读/写
  ├── Output 选择
  └── Output 格式 + 名称 读/写

Phase 3 — 通道参数
  ├── 输出端口映射 读/写
  ├── Trim / Delay / Phase 读/写
  ├── 通道 Mute / Solo 读/写
  └── HPF / LPF 读/写

Phase 4 — DSP 处理参数
  ├── 参量 EQ 8 段 读/写
  ├── 图示 EQ 16 段 读/写
  └── Bass Management 全部参数

Phase 5 — 高级功能
  ├── LUFS 实时数据推送
  ├── Meter 监听源切换
  ├── Pink Noise 发生器
  ├── 参考电平预设
  └── 全量状态 Dump / Restore
```

---

## 附录 A：物理 I/O 端口参考

| 端口类型 | 编号范围 | 说明 |
|----------|----------|------|
| 模拟输入 | 1-32 | Source 输入映射可选范围 |
| 模拟输出 | 1-32 | 通道输出 + Sub 输出可选范围 |

> 实际端口数量根据硬件设计确定，上位机通过系统信息读取可用端口数。

## 附录 B：延迟单位换算（上位机完成）

设备端统一存储和传输毫秒值，UI 端负责单位换算显示：

| 单位 | 换算公式 | 说明 |
|------|----------|------|
| ms | 直接值 | 设备传输单位 |
| m | ms × 0.343 | 声速 343 m/s @ 20°C |
| cm | ms × 34.3 | |

## 附录 C：前端 UI 与参数对应关系

供硬件工程师理解每个参数在 UI 上的位置：

| UI 区域 | 涉及参数域 |
|---------|-----------|
| 顶栏 | 系统信息（采样率、时钟、设备名） |
| 左侧栏 Source Strip | Source 管理（选择、锁定、格式、名称） |
| 右侧栏 Output Strip | Output 管理（选择、格式、名称） |
| 中央 Monitor Level | 全局控制（主音量、DIM、MUTE、Ref 预设） |
| 中央 Meter Bridge | Meter 数据（16ch Level + LUFS） |
| 中央 3D Visualizer | 通道参数（Mute/Solo 状态反映在扬声器亮灭） |
| Source 编辑面板 | Source 输入映射、格式、名称 |
| Output 编辑面板 > Channel Routing | 通道参数全部 |
| Output 编辑面板 > Parametric EQ | 参量 EQ |
| Output 编辑面板 > Graphic EQ | 图示 EQ |
| Output 编辑面板 > Bass Management | Bass Management 全部 |
