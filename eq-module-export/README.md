# Parametric EQ Module

这是一个独立的 16 段参数均衡器 (Parametric EQ) 前端组件，提取自 Topping Surround Controller 项目。
旨在方便二次开发和集成到其他 React 项目中。

## 📦 目录结构

- `ParametricEQ.tsx`: 核心组件文件（包含所有逻辑、样式和子组件）。
- `ExampleUsage.tsx`: 使用示例。
- `package.json`: 依赖说明。

## 🚀 快速开始

### 1. 安装依赖

确保你的项目中安装了以下依赖：

```bash
npm install react react-dom lucide-react
# 或
pnpm add react react-dom lucide-react
```

该组件使用 **Tailwind CSS** 进行样式编写，请确保你的项目已配置 Tailwind。

### 2. 字体配置 (推荐)

组件使用了 `JetBrains Mono` (用于数值) 和 `Inter` (用于界面文字) 字体以获得最佳视觉效果。
建议在你的 `index.css` 或 `index.html` 中引入：

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 3.组件使用

直接引入 `ParametricEQ` 组件即可使用。组件是受控组件 (Controlled Component)，需要通过 props 传入状态。

```tsx
import { ParametricEQ, EQBand } from './ParametricEQ';

// 定义状态
const [bands, setBands] = useState<EQBand[]>([]);

// 渲染
<ParametricEQ
  bands={bands}                   // EQ 频段数组
  onBandsChange={setBands}        // 状态更新回调
  themeColor="#06b6d4"            // 主题色 (Hex)
  selectedCount={1}               // 当前选中的通道数 (用于显示)
  selectedSpeakers={['L']}        // (可选) 选中的扬声器 ID 列表
/>
```

## 🛠️ 数据结构 (Types)

`ParametricEQ.tsx` 中导出了核心类型 `EQBand`：

```typescript
export interface EQBand {
  id: string;        // 唯一 ID
  enabled: boolean;  // 启用/旁路
  type: 'peak' | 'lowShelf' | 'highShelf' | 'lowPass' | 'highPass'; // 滤波器类型
  frequency: number; // 频率 (Hz)
  gain: number;      // 增益 (dB)
  q: number;         // Q 值 / 斜率因子
}
```

## 🎨 特性

- **可视化交互**: 支持直接在频响曲线上拖拽节点调整频率和增益。
- **滚轮支持**: 鼠标滚轮可调节 Q 值 (悬停在节点上时)。
- **幽灵节点**: 在曲线上双击或点击幽灵节点即可快速添加新频段。
- **高性动画**: 使用 `requestAnimationFrame` 实现丝滑的过渡动画。
- **自适应布局**: 组件会自动适应父容器的大小 (ResizeObserver)。
- **专业风格**: 仿其 FabFilter / Sonarworks 的现代音频软件 UI 风格。

## ⚠️ 注意事项

1. **Icons**: 组件依赖 `lucide-react` 图标库。
2. **Tailwind**: 组件大量使用 Tailwind utility classes，如果样式错乱请检查 Tailwind 配置。
3. **Clip Path**: 曲线绘制依赖 SVG `clip-path` 和 `mask`，请确保容器没有过度裁剪。

## 二次开发指南

整个逻辑都在 `ParametricEQ.tsx` 一个文件中，包含：
- `ParametricEQ` (主组件)
- `BandOverviewCard` (底部频段卡片)
- `VectorKnob` (旋钮组件)
- `calculateBandResponse` (音频物理算法)

你可以根据需要拆分文件或修改 `calculateBandResponse` 算法以适配不同的 DSP 后端。
