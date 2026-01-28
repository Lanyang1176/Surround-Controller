---
name: output-config-editor-dev
description: 开发专业音频输出配置界面（OutputConfigEditor），包含参量均衡器、通道路由、扬声器布局、低音管理。采用 Sonarworks 现代有机风格，通透感与精密感并重，深色 SaaS 风格。
---

# Output Config Editor 开发文档

## 概述

OutputConfigEditor 是 Topping Surround Controller 的核心组件，用于管理物理输出设备的配置。采用 **Sonarworks 主导 + 精密感辅助** 的现代 SaaS 风格：

- **现代有机感**：柔和渐变、呼吸感、圆润过渡
- **通透感**：低饱和度填充、精致微发光、层次分明
- **精密但不冷硬**：保留专业工具的精确感，但更温和有机

## 文件结构

```
components/OutputConfigEditor/
├── index.tsx              # 主编辑器框架
├── ParametricEQ.tsx       # ★ 参量均衡器（核心组件）
├── ChannelRouting.tsx     # 通道路由列表
├── SpeakerLayoutSelector.tsx  # 扬声器布局选择器
├── BassManagement.tsx     # 低音管理页面
└── GraphicEQ.tsx          # [弃用] 16段图示均衡器
```

---

## ★ ParametricEQ 参量均衡器

### 设计原则

| 原则 | 实现 |
|------|------|
| **现代有机** | Sonarworks 风格，柔和渐变，呼吸感 |
| **通透感** | 低饱和度色块为主，曲线线条淡化 |
| **精密可靠** | 严格对数坐标 (10Hz-30kHz)、每3dB增益网格 |
| **交互质感** | 拨弦式网格交互（缓动+光晕）、幽灵节点 |

### 字体系统

```html
<!-- index.html -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

| 用途 | 字体 | 示例 |
|------|------|------|
| 数值显示 | JetBrains Mono | 频率值、增益值、Q值、刻度 |
| 标签文字 | Inter | FREQ、GAIN、Q 等标签 |

### 10色柔和有机色板

```typescript
// Sonarworks 现代风格：饱和度适中、色相间隔均匀、视觉舒适
const BAND_COLORS = [
  '#5EEAD4', // 1. 青绿 (Teal) - 柔和
  '#7DD3FC', // 2. 天蓝 (Sky) - 明亮但不刺眼
  '#A5B4FC', // 3. 靛蓝 (Indigo) - 柔和紫蓝
  '#C4B5FD', // 4. 薰衣草 (Violet)
  '#F0ABFC', // 5. 粉紫 (Fuchsia)
  '#FDA4AF', // 6. 玫瑰 (Rose)
  '#FDBA74', // 7. 橙 (Orange) - 柔和
  '#FCD34D', // 8. 琥珀 (Amber)
  '#BEF264', // 9. 青柠 (Lime)
  '#6EE7B7', // 10. 翠绿 (Emerald)
];
```

### 背景系统

```tsx
{/* 径向渐变背景（中间亮侧面暗）*/}
<radialGradient id="bgGradient" cx="50%" cy="50%" r="70%">
  <stop offset="0%" stopColor="#18181b" />   // zinc-900
  <stop offset="100%" stopColor="#09090b" /> // zinc-950
</radialGradient>
```

### SVG 滤镜系统（精致柔和版）

```tsx
{/* 曲线发光滤镜 - 更聚焦 */}
<filter id={`glow-${band.id}`}>
  <feGaussianBlur stdDeviation="0.8" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>

{/* 总曲线发光滤镜 - 琥珀色光晕增强 */}
<filter id="glow-total">
  <feGaussianBlur stdDeviation="2" result="blur" />
  ...
</filter>

{/* 节点发光滤镜 - 精致 */}
<filter id="glow-node">
  <feGaussianBlur stdDeviation="0.6" result="blur" />
  ...
</filter>

{/* 填充渐变 - 极通透 */}
<linearGradient id={`bandGradient-${band.id}`}>
  <stop offset="0%" stopColor={color} stopOpacity={0.20} />
  <stop offset="60%" stopColor={color} stopOpacity={0.08} />
  <stop offset="100%" stopColor={color} stopOpacity={0.01} />
</linearGradient>
```

**发光强度对照表**：

| 元素 | stdDeviation | 说明 |
|------|--------------|------|
| 频段曲线发光 | 0.8 | 聚焦 |
| 强发光 | 1.5 | hover/active |
| 总曲线 | 2.0 | 琥珀色增强 |
| 节点 | 0.6 | 精致 |
| 呼吸环 | 2.0 | 选中状态 |

### 曲线层级系统

**总曲线**（最重要）：
```tsx
<path
  stroke="#FEF3C7"      // 琥珀白色
  strokeWidth="2"
  filter="url(#glow-total)"
  opacity={0.95}
/>
```

**频段曲线**（极淡化，仅作辅助）：
```tsx
strokeWidth: 0.5                    // 非激活
strokeWidth: 0.8                    // 激活
opacity: 0.12 (非激活) / 0.45 (激活)
```

**色块填充**（主要视觉表达）：
```tsx
fillOpacity: 0.28 (非激活) / 0.50 (激活)
mixBlendMode: 'screen'
```

### 网格系统 v7（精密拨弦感）

```typescript
// X轴：对数频率 (10Hz - 30kHz 视觉范围，20Hz - 20k 标签)
const FREQ_GRID_LINES = [10, 20, 50, ..., 20k, 30k];
const LABEL_FREQS = [20, 50, 100, ..., 10k, 20k];

// Y轴：增益刻度 (+/- 24dB 操作范围，+/- 30dB 视觉范围)
const GAIN_GRID_LINES = [-24, -21, ..., 0, ..., 21, 24]; // 3dB 步进
const LABEL_GAIN = [0, +/-6, +/-12, +/-18, +/-24];       // 6dB 标签

// 交互视觉：拨弦效果
transition: 'all 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' // 慢速阻尼
hover: 亮度提升 + 周边3条线递减光晕
style: 主要网格 0.45px (Zinc-500), 次要 0.3px (Zinc-700)
```

### XY轴刻度系统（嵌入式+四边遮罩）

```tsx
// Padding - 极小，让网格填满
const padding = { top: 4, right: 4, bottom: 4, left: 4 };

// 嵌入式刻度
X轴: y = plotHeight - 6 (内部底边)
Y轴: x = +8 (内部左侧)

// 四边渐隐遮罩 (矩形淡化)
Left/Right: 80px
Bottom: 60px
Top: 40px
// 作用：让网格线在边缘淡出，保证刻度文字可读性
```

### 节点设计（极简圆点）

```tsx
// 默认状态
<circle r={4} fill={color} opacity={0.75} />

// 悬停/选中状态
<circle r={5} fill={color} stroke="rgba(255,255,255,0.4)" strokeWidth={1} />

// 选中呼吸环
<circle r={12} fill="none" stroke={color} strokeWidth={0.6} 
        opacity={0.35} filter="url(#glow-ring)" className="animate-pulse" />

// 编号仅悬停/选中时显示（在节点上方）
{isActive && <text y={-10}>{idx + 1}</text>}
```

---

## 底部控制栏

**高度**: `h-[88px]`，舒适的控制区域

### 两种模式

#### 1. 选中频点时 - 详细编辑模式

```
┌──────────────────────────────────────────────────────────────────────┐
│ [▼9] | [●] [PK▼] |    ◐       ◐       ◐    |                 [×]    │
│ 频段   开关 类型    1.10kHz  +2.1dB   1.00                    删除   │
│ 选择器            FREQ     GAIN      Q                             │
└──────────────────────────────────────────────────────────────────────┘
```

#### 2. 未选中频点时 - 多频点概览模式

```
┌──────────────────────────────────────────────────────────────────────┐
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ...  (9个以内压缩) │
│ │1 PK │ │2 LS │ │3 PK │ │4 HP │ │5 PK │ │6 HS │      (超过9个滚动) │
│ │2.4k │ │135  │ │482  │ │ 46  │ │2.5k │ │14.3k│                    │
│ │+1.8 │ │-3.3 │ │-1.9 │ │     │ │-6.9 │ │-2.2 │                    │
│ │Q1.8 │ │Q1.8 │ │Q1.8 │ │     │ │Q1.8 │ │Q1.8 │                    │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                    │
└──────────────────────────────────────────────────────────────────────┘
```

### VectorKnob 旋钮（垂直居中布局）

```tsx
// 布局：旋钮 → 数值 → 标签（垂直居中）
<div className="flex flex-col items-center">
  {/* 旋钮 */}
  <svg>
    {/* 背景轨道渐变 */}
    <circle stroke="url(#knob-track)" strokeWidth={3} />
    {/* 值弧线 + 发光 */}
    <circle stroke={color} strokeWidth={3} filter="url(#knob-glow)" />
    {/* 中心指示圆点 */}
    <circle r={2} fill={color} />
  </svg>
  
  {/* 数值 - 居中，带颜色 */}
  <span style={{ color }}>{formattedValue}</span>
  
  {/* 标签 - 居中 */}
  <span className="text-zinc-500">{label}</span>
</div>
```

**交互**：
- 垂直拖拽调整值
- Shift+拖拽微调模式
- 双击数值进入编辑模式

### 频段/类型选择器（统一高度）

```tsx
// 频段选择器
<button className="h-8 px-2.5 rounded bg-zinc-800/40 border border-zinc-700/40">
  <FilterIcon style={{ color }} />
  <span style={{ color }}>{idx + 1}</span>
  <ChevronDown />
</button>

// 类型选择器
<button className="h-6 px-2 rounded bg-zinc-800/40 border border-zinc-700/40">
  <FilterIcon />
  <span>PK</span>
  <ChevronDown />
</button>

// 下拉菜单 - 半透明
<div className="bg-zinc-800/95 backdrop-blur-sm border border-zinc-700/50">
```

---

## 动画系统

### 曲线平滑动画

```typescript
// 优化：更短时长、更轻柔的 easing
const useAnimatedBands = (bands, duration = 120, skipAnimation = false) => {
  // 拖动时跳过动画，直接响应
  if (skipAnimation) return bands;
  
  // ease-out-quad (更轻柔)
  const eased = 1 - Math.pow(1 - progress, 2);
};
```

### 旋钮交互

```typescript
// 直接响应，移除 RAF 节流
const sensitivity = {
  FREQ: { normal: 0.010, shift: 0.002 },  // 对数
  GAIN: { normal: 0.012, shift: 0.003 },
  Q:    { normal: 0.012, shift: 0.003 },
};
```

---

## 类型定义

```typescript
export interface EQBand {
  id: string;
  enabled: boolean;
  type: 'peak' | 'lowShelf' | 'highShelf' | 'lowPass' | 'highPass';
  frequency: number;  // 10 - 30000 Hz (Visual), 20-20k (Safe)
  gain: number;       // -24 to +24 dB (Visual +/- 30dB)
  q: number;          // 0.1 to 10
}

interface ParametricEQProps {
  bands: EQBand[];
  onBandsChange: (bands: EQBand[]) => void;
  themeColor: string;
  selectedCount: number;
  selectedSpeakers?: string[];
}
```

---

## 设计决策记录

| 决策 | 选项 | 最终选择 | 原因 |
|------|------|----------|------|
| 视觉风格 | FabFilter vs Sonarworks | Sonarworks 主导 | 更现代有机 |
| 频点数量 | 8 vs 10 vs 12 | 10 | 色板匹配 |
| 总曲线颜色 | 金色 vs 白色 vs 琥珀白 | 琥珀白 #FEF3C7 | 对比度好，不刺眼 |
| 曲线层级 | 均等 vs 总曲线突出 | 总曲线突出，色块为主 | 视觉清晰 |
| 控制栏高度 | 64px vs 88px | 88px | 不穿模 |
| 概览模式 | 横向 vs 竖向卡片 | 竖向卡片 | 信息完整 |
| 刻度位置 | 绘图区内 vs 外 | 绘图区内 (Embedded) | 配合边缘遮罩，更紧凑 |
| 交互反馈 | 瞬时 vs 阻尼 | 阻尼 (Cubic-Bezier) | 拨弦质感，非线性 |
| 增益范围 | +/- 12 vs 24 | +/- 24dB | 专业需求 + 透气空间 |

---

## 迭代历史

### v1-v4: 基础到 Pro-Q 风格
- 16段图示均衡器 → 参量EQ
- 8色 → 12色频段系统
- Pro-Q 风格视觉

### v5: Sonarworks 现代风格
- 10色柔和有机色板
- 总曲线琥珀白色 + 增强发光
- 频段曲线极淡化，色块为主
- 背景径向渐变（中间亮侧面暗）
- XY轴刻度分离，避免打架
- 刻度与频点互动高亮
- 网格线精致化

### v6: 控制栏优化
- VectorKnob 垂直居中布局
- 选择器统一高度 + 半透明
- 多频点概览模式

### v7: 精密网格与视觉优化（当前）
- **透气空间**：Visual Range 扩展 (10Hz-30kHz, +/- 30dB)
- **嵌入式刻度**：Padding 极小化，配合四边矩形遮罩
- **拨弦网格交互**：800ms 阻尼过渡，临近线光晕扩散
- **精密网格**：3dB 增益步进，线宽锐利化 (0.3/0.45px)
