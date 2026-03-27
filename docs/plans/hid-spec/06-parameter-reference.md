# 06 — 完整参数清单

> 子文档 of [主文档](../2026-03-27-hid-interface-spec.md)
>
> 硬件工程师的参数速查表。所有前端需要读写的参数。

---

## A.1 系统信息（只读）

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 设备名称 | string | max 32 char | R |
| 固件版本 | string | "x.y.z" | R |
| 采样率 | uint32 | 44100/48000/96000/192000 | R |
| 时钟源 | enum | Internal/USB/External | R |

## A.2 全局控制

| 参数 | 类型 | 范围 | 步进 | 方向 |
|------|------|------|------|------|
| 主音量 | float | -96.0 ~ +12.0 dB | 0.1 dB | R/W |
| DIM 开关 | bool | on/off | — | R/W |
| DIM 衰减量 | float | -30.0 ~ -6.0 dB | 0.1 dB | R/W |
| MUTE 开关 | bool | on/off | — | R/W |

## A.3 Source 输入（5 路）

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 名称 | string | max 16 char | R/W |
| 格式 | enum | 9.1.6/7.1.4/5.1/Stereo | R/W |
| 分配状态 | bool | assigned/unassigned | R |
| 输入映射 | uint8[16] | 物理端口 1-32 | R/W |
| 当前选中 | uint8[] | 1-5, 支持多选 | R/W |
| 锁定 | bool × 5 | per source | R/W |

## A.4 Output 输出（4 套）

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 名称 | string | max 16 char | R/W |
| 格式 | enum | 9.1.6/7.1.4/5.1/Stereo | R/W |
| 当前选中 | uint8 | 1-4 | R/W |

## A.5 通道参数（16ch × 4 Output）

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

## A.6 参量 EQ（8 段/通道）

| 参数 | 类型 | 范围 | 步进 | 方向 |
|------|------|------|------|------|
| Enabled | bool | on/off | — | R/W |
| Type | enum | peak/lowShelf/highShelf/lowPass/highPass | — | R/W |
| Frequency | float | 20-20000 Hz | 1 Hz | R/W |
| Gain | float | -12.0 ~ +12.0 dB | 0.1 dB | R/W |
| Q | float | 0.10 ~ 10.00 | 0.01 | R/W |

## A.7 图示 EQ（16 段/通道）

| 参数 | 类型 | 范围 | 步进 | 方向 |
|------|------|------|------|------|
| Band 1-16 | float[16] | -12.0 ~ +12.0 dB | 0.1 dB | R/W |

频点：25, 40, 63, 100, 160, 250, 400, 630, 1k, 1.6k, 2.5k, 4k, 6.3k, 10k, 16k, 20k Hz

## A.8 Bass Management（每 Output 一个）

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

## A.9 Meter 数据（设备推送，只读）

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

## A.10 Pink Noise

| 参数 | 类型 | 范围 | 方向 |
|------|------|------|------|
| 全局开关 | bool | on/off | R/W |
| 输出电平 | float | -60.0 ~ 0.0 dB | R/W |
| 每通道发送 | bool × 16 | — | R/W |

## A.11 参考电平预设（3 个）

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
