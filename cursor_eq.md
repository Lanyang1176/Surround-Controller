# EQ 模块重构计划
_Exported on 2026/1/21 at GMT+8 10:42:59 from Cursor (2.4.7)_

---

**User**

在outputedit界面的左下角有一个eq部件，我现在想重构这个eq模块。这是我整理的需求。一、 核心视觉风格 (Visual Aesthetics)
我们要打造的是一个**“工业级、精密、具有科技纵深感”**的专业音频工具，对标 FabFilter Pro-Q 3 或 Trinnov 的质感。

全局氛围与网格 (Atmosphere & Grid)

背景： 摒弃纯死黑。使用深邃的径向渐变（深灰到极黑），模拟高档屏幕的背光感。

对数坐标网格 (Logarithmic Grid)： 必须严格遵循音频工程标准。

X轴： 标准倍频程刻度 (20, 50, 100, 200, 500, 1k, 2k, 5k, 10k, 20k Hz)。

子网格 (Sub-grid)： 主刻度之间必须有极淡的次级辅助线，提供精密的参考基准。

标签： 频率数值直接印在网格内部底部，使用等宽数字字体，低透明度，不抢视觉。

FFT 频谱分析器 (The "Phantom" Spectrum)

质感： 它是背景中的“幽灵”。绝对不能是浅灰色实块。

样式： 采用深色半透明渐变（例如深青灰或深紫灰），顶部有一条极细的高亮描边。

动态： 必须有平滑处理 (Smoothing, e.g., 0.8)，模拟液体的流动感，起伏要优雅，不能像噪音一样疯狂闪烁。

EQ 曲线渲染 (The "Organic" Curve)

能量填充 (Integral Fill)： 曲线不仅仅是一条线。必须在曲线下方（锚定 0dB 线）渲染半透明的渐变填充。

光叠加 (Additive Blending)： 当多个频段提升叠加时，重叠区域的填充颜色应变亮/变热，直观展示能量的聚集。

物理正确性： 高通 (HP) 和低通 (LP) 滤镜的曲线必须在截止频率外垂直下坠至负无穷，绝不能在底部变平（那是搁架滤镜的特征）。

二、 交互与操作逻辑 (Interaction & Workflow)
遵循**“鼠标优先，参数为辅”**的设计原则。操作应具有物理直觉和流畅的动效。

画布直接操作 (Direct Manipulation)

幽灵节点 (Ghost Node)： 鼠标在空白处悬停时，显示半透明的预览点和预览曲线。双击即可在当前位置创建频点。

智能滚轮 (Scroll to Q)： 鼠标悬停在任意频点上滚动滚轮，直接调整 Q 值 (带宽)。此时节点图标应有形变反馈（如括号张开/收缩）。

聚光灯效应 (Spotlight Focus)： 当用户拖拽某个频点时，背景网格和其他未选中的频段应瞬间变暗，让用户的注意力完全聚焦在当前调节的频段上。

智能数值输入 (Smart Input)

原地编辑： 双击底部的数值文本，直接变为输入框，不弹窗。

智能解析： 支持输入 2.5k 自动识别为 2500；支持输入超出范围的数值自动修正到极值。

旋钮交互 (Knob Behavior)

垂直拖拽 (Vertical Drag)： 放弃画圈操作。鼠标在旋钮区域按住上下拖动来改变数值，这是专业 DAW 的标准交互，更精准。

三、 DSP 信号处理逻辑 (Signal Logic)
滤波器类型逻辑

高通/低通 (HP/LP)： * 这两个类型的滤镜没有增益 (Gain) 概念。

当选中 HP/LP 类型时，底部的 Gain 旋钮必须禁用、隐藏或变灰。

曲线绘制时，Gain 强制为 0dB，只由 Freq 和 Q 决定形态。

钟形 (Bell) / 搁架 (Shelf)： 拥有完整的 Freq, Gain, Q 控制。

频段管理

支持 12 个独立频段。

每个频段分配一种独特的色相 (Hue)，其对应的曲线填充、节点颜色、底部控件高亮色均保持统一，方便视觉区分。

四、 底部控制栏布局 (Bottom Toolbar Layout)
极简与压缩 (Compact & Dense)

高度限制： 整个控制栏高度控制在 80px 以内，做成扁平的“条状”而非厚重的“盒子”。

废料清理： 彻底删除所有“双击添加节点...”之类的操作提示文案；删除所有重复显示的文本数据块。

组件排布

采用 Flex Row 布局，从左到右依次为：

[频段选择器] (1, 2, 3...)

[开关与类型] (Bypass 按钮, Filter Type 下拉)

[核心参数] (三个紧凑的矢量圆环旋钮：Freq, Gain, Q)

[删除] (最右侧的垃圾桶图标)

旋钮样式

使用 Headless 逻辑实现的矢量组件。

样式： 极简线条风格，无 3D 阴影。上方是小号标签 (FREQ)，中间是圆环，下方是等宽数字 (100 Hz)。

---

**Cursor**

我来帮你分析现有的 EQ 模块代码，以便更好地理解重构的起点。让我先探索项目结构和相关代码。

让我再看一下 `types.ts` 中的相关类型定义，以便更全面地了解数据结构。

现在我已经全面分析了你的现有代码。让我为你详细总结 **现状 vs 需求** 的差距分析，并提供重构建议。

---

## 📊 现有代码分析

### 现有 `ParametricEQ.tsx` 已实现的功能

| 功能 | 状态 | 备注 |
|------|------|------|
| 对数坐标转换 | ✅ 已实现 | `freqToX`, `xToFreq` |
| 12色频段颜色 | ✅ 已实现 | `BAND_COLORS` 数组 |
| 基本EQ曲线计算 | ✅ 已实现 | `calculateBandResponse` |
| 积分填充 (Integral Fill) | ✅ 基本实现 | 有 `areaPath` 但渐变不完善 |
| 叠加混合模式 | ✅ 已实现 | `mixBlendMode: 'screen'` |
| 幽灵节点 (Ghost Node) | ✅ 已实现 | 虚线圆圈预览 |
| 滚轮调Q | ✅ 已实现 | `handleWheel` |
| 垂直拖拽旋钮 | ✅ 已实现 | `EQKnob` 组件 |
| 曲线动画过渡 | ✅ 已实现 | `useAnimatedBands` Hook |

---

## 🔴 需要重构/新增的内容

### 一、核心视觉风格

#### 1. 背景渐变 (目前缺失)

现有代码：

```676:676:components/OutputConfigEditor/ParametricEQ.tsx
<rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} fill="#1e2227" />
```

**需要改为**：使用 `<radialGradient>` 从中心深灰向四周极黑渐变

#### 2. 子网格系统 (目前缺失)

现有网格只有主刻度线，缺少次级辅助线：

```679:688:components/OutputConfigEditor/ParametricEQ.tsx
{freqGridLines.map(freq => {
  const x = padding.left + freqToX(freq, plotWidth);
  const isMajor = majorFreqs.includes(freq);
  return (
    <g key={freq}>
      <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotHeight} stroke={isMajor ? '#52525b' : '#27272a'} strokeWidth={isMajor ? 1 : 0.5} opacity={0.5} />
      <text x={x} y={height - 6} fill={isMajor ? '#71717a' : '#52525b'} fontSize="8" textAnchor="middle" fontFamily="monospace">{formatFreq(freq)}</text>
    </g>
  );
})}
```

**需要添加**：在主刻度之间插入更细、更淡的次级网格线

#### 3. FFT 频谱分析器 (完全缺失 🚨)

这是一个**全新功能**，需要：
- 实时音频数据源 (Web Audio API `AnalyserNode`)
- 半透明深色渐变填充
- 平滑处理 (smoothing factor ~0.8)
- 顶部高亮描边

#### 4. HP/LP 滤波器曲线物理正确性 (需修正)

现有实现用 `Math.max(MIN_GAIN, ...)` 限制了最低值：

```151:163:components/OutputConfigEditor/ParametricEQ.tsx
case 'highPass': {
  if (freq >= f0) return 0;
  const octaves = Math.log2(freq / f0);
  const slope = 12 * Q;  // dB/octave
  return Math.max(MIN_GAIN, octaves * slope);
}

case 'lowPass': {
  if (freq <= f0) return 0;
  const octaves = Math.log2(freq / f0);
  const slope = 12 * Q;
  return Math.max(MIN_GAIN, -octaves * slope);
}
```

**需要改为**：渲染时让曲线真正延伸到画布底部 (视觉上的负无穷)，而不是在 -12dB 处变平

---

### 二、交互与操作逻辑

#### 1. 聚光灯效应 (Spotlight Focus) - 部分实现

现有代码只降低了其他曲线的透明度：

```712:717:components/OutputConfigEditor/ParametricEQ.tsx
const isHovered = hoveredBandId === id || dragging === id || selectedBandId === id;
const isAnyHovered = hoveredBandId !== null || dragging !== null;
// Dim if something else is hovered
const opacity = isHovered ? 1 : (isAnyHovered ? 0.2 : 0.6);
```

**需要增强**：拖拽时背景网格也应变暗

#### 2. Q值调节形变反馈 (缺失)

现有 Q 宽度指示器是静态的：

```782:787:components/OutputConfigEditor/ParametricEQ.tsx
{(isSelected || isHovered) && (band.type === 'peak' || band.type.includes('Shelf')) && (
  <>
    <path d="M -8 -4 L -8 4" stroke={color} strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M 8 -4 L 8 4" stroke={color} strokeWidth="2" fill="none" opacity="0.6" />
  </>
)}
```

**需要改为**：括号间距应根据 Q 值动态变化 (Q高→收紧，Q低→张开)

#### 3. 智能数值输入 (完全缺失 🚨)

需要实现：
- 双击数值文本直接变为 `<input>`
- 支持 `2.5k` → `2500` 解析
- 超范围自动修正

---

### 三、DSP 逻辑

#### HP/LP 时禁用 Gain 旋钮 (未实现 🚨)

现有代码只隐藏了 Q 旋钮对于某些类型：

```908:920:components/OutputConfigEditor/ParametricEQ.tsx
{(selectedBand.type === 'peak' || selectedBand.type === 'lowShelf' || selectedBand.type === 'highShelf') && (
  <EQKnob
    value={selectedBand.q}
    ...
  />
)}
```

**需要添加**：当 `type === 'highPass' || type === 'lowPass'` 时，Gain 旋钮也应禁用/隐藏

---

### 四、底部控制栏

#### 旋钮样式需要重构

现有 `EQKnob` 有 3D 渐变效果：

```357:366:components/OutputConfigEditor/ParametricEQ.tsx
<div
  className="absolute inset-1.5 rounded-full bg-gradient-to-b from-zinc-500 to-zinc-700"
  style={{ transform: `rotate(${rotation}deg)` }}
>
  <div
    className="absolute top-1 left-1/2 w-0.5 -translate-x-1/2 rounded-full"
    style={{ backgroundColor: color, height: `${indicatorHeight * 4}px` }}
  />
</div>
```

**需要改为**：纯矢量 SVG 圆环，极简线条风格，无 3D 阴影

---

## 🏗️ 建议的重构架构

```
components/ParametricEQ/
├── index.tsx                    # 主容器组件
├── EQCanvas.tsx                 # SVG 画布 (网格、曲线、节点)
├── EQToolbar.tsx                # 底部控制栏
├── components/
│   ├── FrequencyGrid.tsx        # 对数网格 + 子网格
│   ├── FFTSpectrum.tsx          # FFT 频谱分析器 (新)
│   ├── BandCurve.tsx            # 单个频段曲线
│   ├── TotalCurve.tsx           # 总响应曲线
│   ├── BandNode.tsx             # 可交互节点
│   ├── GhostNode.tsx            # 幽灵预览节点
│   └── VectorKnob.tsx           # 矢量旋钮 (重构)
├── hooks/
│   ├── useEQCurve.ts            # 曲线计算逻辑
│   ├── useFFTAnalyzer.ts        # FFT 分析 (新)
│   ├── useDragInteraction.ts    # 拖拽交互
│   └── useAnimatedBands.ts      # 动画插值 (现有)
├── utils/
│   ├── coordinates.ts           # 坐标转换函数
│   ├── dsp.ts                   # DSP 滤波器计算
│   └── formatters.ts            # 数值格式化
└── types.ts                     # 类型定义
```

---

## 📋 重构优先级建议

| 优先级 | 任务 | 复杂度 | 影响 |
|--------|------|--------|------|
| **P0** | HP/LP 禁用 Gain | 低 | 功能正确性 |
| **P0** | HP/LP 曲线延伸到底部 | 中 | 物理正确性 |
| **P1** | 背景径向渐变 | 低 | 视觉质感 |
| **P1** | 子网格系统 | 低 | 专业感 |
| **P1** | 聚光灯效应完善 | 中 | 交互体验 |
| **P2** | 矢量旋钮重构 | 中 | 统一风格 |
| **P2** | Q值形变反馈 | 低 | 交互细节 |
| **P2** | 智能数值输入 | 中 | 便捷性 |
| **P3** | FFT 频谱分析器 | 高 | 新功能 |

---

如果你想让我开始实现这些重构，请切换到 **Agent 模式**。我可以按优先级逐步实现，或者你可以指定先从哪个部分开始。

---

**User**

fft本身不需要实现，另外整个配色，请使用uiuxpromax这个skill作为指导。

---

**Cursor**

让我先读取 `uiuxpromax` skill 来了解配色指南。

好的，我已经阅读了 `ui-ux-pro-max` skill。现在我可以制定重构计划了。

由于 FFT 不需要实现，工作量大大简化。我将使用 `ui-ux-pro-max` 的设计系统生成功能来指导配色方案。

---

**User**

还有一个需求是，频点选择栏中，需要加入相应频点形状的图标，来表示不同频点。

---

**Cursor**

明白了，这是一个很好的 UX 改进。让我更新计划，添加频段类型图标的需求。

已更新计划，添加了频段选择器图标的需求：

**新增内容 (5.1 频段选择器图标)**：

- **High Pass**: 左侧水平，右上斜坡上升曲线
- **Low Pass**: 左上斜坡下降，右侧水平曲线
- **Bell (Peak)**: 钟形曲线
- **Low Shelf**: 左高右低的台阶曲线
- **High Shelf**: 左低右高的台阶曲线

每个图标使用纯 SVG 绘制，尺寸 16x12，颜色继承按钮状态。选中时图标与编号同色高亮。

---

现在的完整任务列表：

1. 运行 ui-ux-pro-max 脚本生成设计系统配色方案
2. 实现背景径向渐变和子网格系统
3. 修复 HP/LP 曲线物理正确性，优化渐变填充
4. 实现聚光灯效应（拖拽时背景变暗）
5. 实现 Q 值调节的括号形变反馈
6. 实现智能数值输入组件（支持 2.5k 解析）
7. HP/LP 类型时禁用 Gain 旋钮
8. **为频段选择器添加滤波器类型 SVG 图标** ← 新增
9. 重构 EQKnob 为极简矢量风格
10. 优化底部控制栏布局，控制高度在 64px 内

---

如果没有其他需要补充的，可以开始执行计划。

---

**User**

开始执行

---

**Cursor**

好的，开始执行计划。首先运行 ui-ux-pro-max 脚本生成设计系统配色方案。

遇到编码问题，设置 UTF-8 后重试：

设计系统生成了，但让我补充搜索一下 dark mode 专业仪表板的配色：

好的，设计系统信息已获取。结合用户需求（对标 FabFilter Pro-Q 3 风格）和搜索结果，我确定以下配色方案：

- **背景**: 径向渐变 `#0a0a0c` → `#1a1d21`
- **网格主线**: `#3f3f46`, **次线**: `#27272a` (30% 透明度)
- **0dB 参考线**: `#FFD700` (40% 透明度)
- **总曲线**: `#FFC107` (amber)
- **字体**: Fira Code (等宽数字), Fira Sans (标签)

现在开始重构 `ParametricEQ.tsx`：

现在开始进行完整重构。我将对整个文件进行大规模修改，实现所有计划中的功能：

没有 linter 错误。让我更新所有任务状态：

所有重构任务已完成。以下是实现的全部功能：

---

## 重构完成总结

### 1. 视觉层
- **背景径向渐变**: 从中心 `#1a1d21` 向四周 `#0a0a0c` 渐变，模拟高档屏幕背光感
- **子网格系统**: 在主刻度之间添加了次级辅助线 (`SUB_GRID_FREQS`)，更精密的参考基准
- **HP/LP 曲线物理正确性**: 使用 `VISUAL_MIN_GAIN = -48` 扩展范围，让滤波器曲线延伸到画布底部

### 2. 交互层
- **聚光灯效应**: 拖拽时背景网格透明度降至 15%，未选中频段变暗
- **Q 值形变反馈**: 括号间距动态计算 `bracketSpread = 18 / band.q`，Q 高收紧，Q 低张开
- **智能数值输入**: `EditableValue` 组件支持双击编辑，解析 `2.5k` → `2500`

### 3. DSP 逻辑
- **HP/LP 禁用 Gain**: 当选中 HP/LP 类型时，Gain 旋钮自动禁用 (`disabled={isSelectedHpLp}`)
- 切换到 HP/LP 类型时自动重置 `gain = 0`

### 4. 底部控制栏
- **频段选择器图标**: 每个按钮显示滤波器类型 SVG 图标 + 编号
- **矢量旋钮**: 纯 SVG 圆弧，无 3D 阴影，极简线条风格
- **高度限制**: `maxHeight: 64px`

### 5. 滤波器图标
```
HP: ╱‾    (左平右上斜坡)
LP: ‾╲    (左平右下斜坡)
PK: ∩     (钟形)
LS: ⌐_    (左高右低台阶)
HS: _⌐    (左低右高台阶)
```

---

你可以运行项目查看效果。如果需要调整任何细节，请告诉我。

---

**User**

这是我们很多个版本之前的效果，在现在的基础上，加上类似图片中的特效

---

**Cursor**

我看到了之前版本的效果，主要特点是曲线和填充都有**霓虹发光 (Glow)** 效果。让我先读取当前代码，然后添加这些特效。

现在我来添加霓虹发光效果。我需要：
1. 为每个频段添加 SVG glow filter
2. 曲线和填充应用发光效果
3. 节点添加光晕

已添加霓虹发光特效。主要改动：

**1. SVG 滤镜系统**
- 每个频段独立的发光滤镜 (`glow-{id}` 和 `glow-strong-{id}`)
- 总曲线发光滤镜 (`glow-total`)
- 节点发光滤镜 (`glow-node`)

**2. 曲线效果**
- 所有曲线默认带发光效果
- 高亮状态使用更强的发光滤镜
- 线宽从 1.5px 增加到 2px

**3. 填充效果**
- 使用三段渐变 (50% → 25% → 5% 透明度)
- 高亮时填充更加饱和 (opacity 0.9)
- 填充也带发光效果

**4. 节点效果**
- 节点内直接显示编号 (类似图片中的样式)
- 外发光圆环 (hover/selected 时显示)
- 主节点带发光滤镜
- Q 值括号也带发光

你可以刷新页面查看效果。如果发光太强或太弱，可以调整 `feGaussianBlur` 的 `stdDeviation` 值。

---

**User**

现在的发光太夸张了，需要尽量克制，就像之前那张图片一样，有一种通透的感觉。
另外现在的xy轴的刻度上的字，有点难以看清，可懂度很差，甚至y轴是没有字的。需要改进，
这个下面的控制面板上的字也很难看清，还有频点选择的这个弹出框，现在是向下的 ，我看不到，被底栏遮挡住了。
还有底边栏也需要加入一些发光的效果，在频点被激活的时候。但是要非常克制的数值，尽量保持整体的通透。

---

**Cursor**

让我先读取当前代码了解现状。

我已经了解了所有问题。现在制定计划来解决它们。

---

**User**

所有的字体也要选择可以自由伸缩的那种，锐利清晰的字体，可以使用uiuxskill选择合适的字体。

---

**Cursor**

让我使用 ui-ux-pro-max skill 搜索适合的字体。

搜索结果显示了几个适合的字体方案。对于专业音频 EQ 界面，我推荐：

- **数值显示**: **JetBrains Mono** - 锐利精确，专为技术界面设计
- **标签文字**: **Inter** - 在各种尺寸下都清晰易读

让我更新计划加入字体配置：

计划已更新，添加了字体配置：

**字体方案**：
- **JetBrains Mono** - 用于数值显示 (频率、增益、Q值、刻度)，锐利精确
- **Inter** - 用于标签文字，清晰可伸缩

**完整任务列表**：
1. 配置 JetBrains Mono 和 Inter 字体
2. 减小发光滤镜强度 (stdDeviation: 3,6,8,12 -> 1.5,2)
3. 添加 Y 轴增益刻度文字 (-12, -6, 0, +6, +12)
4. 优化 X 轴频率刻度文字大小和颜色
5. 提高底部控制栏文字对比度
6. 类型选择弹出框改为向上弹出
7. 底部栏添加微妙发光效果
8. 降低填充透明度保持通透感

确认后即可开始执行。

---

**User**

执行

---

**Cursor**

好的，开始执行计划。

现在更新 ParametricEQ.tsx，一次性完成所有视觉优化：

所有视觉优化已完成：

**字体配置**
- **JetBrains Mono** - 用于数值显示（刻度、频率、增益、Q值）
- **Inter** - 用于标签文字

