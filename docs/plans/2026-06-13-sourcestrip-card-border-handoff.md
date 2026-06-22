# SourceStrip Card Border Handoff

日期: 2026-06-13

用途: 复用左侧输入卡片的暗色玻璃边框、主题色高亮、选中态发光效果。

## 结论

SourceStrip 卡片的质感来自四层组合:

1. 暗色半透明底: `bg-[#06070a]/85`
2. 低对比边框: `border-[#252830]/70`
3. 内侧高光 + 外侧黑色投影
4. 选中态主题色边框、主题色外发光、轻微放大

截图里的 `7.1.4 Source B TRIM FX` 是 Source B 的 idle 态。Source B 选中后使用蓝色主题 `#3baaff`。

## 源码位置

关键文件:

- `src/components/SourceStrip.tsx`

关键范围:

- 主题 token: `THEMES`
- 卡片外壳: `SourceStrip` 返回的第一层 `<div>`
- 左侧状态色条: `Persistent Color Indicator`

## Source B 蓝色主题

```ts
const blueTheme = {
  indicatorInactive: 'bg-[#0a1a3d]/15 shadow-none',
  indicatorActive: 'bg-[#3baaff] shadow-[0_0_14px_rgba(59,170,255,0.8)]',

  btnInactive:
    'bg-gradient-to-b from-[#16171a] to-[#0e0f12] border-[#222326] text-[#404048] shadow-[0_1px_3px_rgba(0,0,0,0.6)]',
  btnActive:
    'bg-[#3baaff] border-[#2585cc] text-[#001433] shadow-[inset_0_1px_4px_rgba(255,255,255,0.3),0_0_14px_rgba(59,170,255,0.6)]',

  meterFill: 'bg-[#3baaff]',
  containerActive:
    'border-[#3baaff]/60 shadow-[0_0_24px_rgba(59,170,255,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#3baaff]/[0.02]',
};
```

## 色值表

| 用途 | 色值 |
|---|---|
| 卡片 idle 背景 | `#06070a` at 85% |
| 卡片 idle 边框 | `#252830` at 70% |
| 卡片 hover 边框 | `#353840` at 80% |
| 卡片 hover 背景 | `#08090c` at 90% |
| 卡片内侧高光 | `rgba(255,255,255,0.03)` |
| 外侧主投影 | `rgba(0,0,0,0.7)` |
| 外侧辅助投影 | `rgba(0,0,0,0.4)` |
| Source B 主题蓝 | `#3baaff` |
| Source B 深蓝 idle 色条 | `#0a1a3d` at 15% |
| Source B 按钮边框 | `#2585cc` |
| Source B 按钮文字 | `#001433` |

## 卡片基础壳

```tsx
const cardBase =
  'relative w-full rounded-xl p-1.5 mb-2 transition-all duration-300 ease-out select-none group transform-gpu border backdrop-blur-md cursor-pointer';
```

对应 CSS:

```css
.source-card {
  position: relative;
  width: 100%;
  border-radius: 12px;
  padding: 6px;
  margin-bottom: 8px;
  border-width: 1px;
  backdrop-filter: blur(12px);
  transition:
    background-color 300ms ease-out,
    border-color 300ms ease-out,
    box-shadow 300ms ease-out,
    transform 300ms ease-out;
  transform: translateZ(0);
  user-select: none;
}
```

## Idle 态

Tailwind:

```tsx
const cardIdle =
  'bg-[#06070a]/85 border-[#252830]/70 hover:border-[#353840]/80 hover:bg-[#08090c]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_8px_rgba(0,0,0,0.4)]';
```

CSS:

```css
.source-card[data-state='idle'] {
  background: rgba(6, 7, 10, 0.85);
  border-color: rgba(37, 40, 48, 0.7);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 8px 24px -4px rgba(0, 0, 0, 0.7),
    0 2px 8px rgba(0, 0, 0, 0.4);
}

.source-card[data-state='idle']:hover {
  background: rgba(8, 9, 12, 0.9);
  border-color: rgba(53, 56, 64, 0.8);
}
```

## Source B 选中态

Tailwind:

```tsx
const cardSelectedBlue =
  'border-[#3baaff]/60 shadow-[0_0_24px_rgba(59,170,255,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#3baaff]/[0.02] scale-[1.01] shadow-xl';
```

CSS:

```css
.source-card[data-state='selected'][data-theme='blue'] {
  background: rgba(59, 170, 255, 0.02);
  border-color: rgba(59, 170, 255, 0.6);
  transform: scale(1.01);
  box-shadow:
    0 0 24px rgba(59, 170, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
}
```

## Source A 选中态

Source A 使用 amber 主题。选中态由 `THEMES.amber.containerActive` 加上 `scale-[1.01] shadow-xl` 组成。

Tailwind:

```tsx
const cardSelectedAmber =
  'border-[#ffaa00]/60 shadow-[0_0_24px_rgba(255,170,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#ffaa00]/[0.02] scale-[1.01] shadow-xl';
```

CSS:

```css
.source-card[data-state='selected'][data-theme='amber'] {
  background: rgba(255, 170, 0, 0.02);
  border: 1px solid rgba(255, 170, 0, 0.6);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  transform: scale(1.01);
  box-shadow:
    0 0 24px rgba(255, 170, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 8px 10px -6px rgba(0, 0, 0, 0.1);
}
```

这里的内侧效果是顶部 1px 高光:

```css
inset 0 1px 0 rgba(255, 255, 255, 0.03)
```

## 左侧主题色条

Tailwind:

```tsx
const indicatorBase =
  'absolute left-[-1px] top-4 bottom-4 w-1.5 rounded-r-md transition-all duration-300 z-10';

const indicatorBlueIdle = 'bg-[#0a1a3d]/15 shadow-none';

const indicatorBlueSelected =
  'bg-[#3baaff] shadow-[0_0_14px_rgba(59,170,255,0.8)]';
```

CSS:

```css
.source-card__indicator {
  position: absolute;
  left: -1px;
  top: 16px;
  bottom: 16px;
  width: 6px;
  border-radius: 0 6px 6px 0;
  transition:
    background-color 300ms ease-out,
    box-shadow 300ms ease-out;
  z-index: 10;
}

.source-card[data-state='idle'][data-theme='blue'] .source-card__indicator {
  background: rgba(10, 26, 61, 0.15);
  box-shadow: none;
}

.source-card[data-state='selected'][data-theme='blue'] .source-card__indicator {
  background: #3baaff;
  box-shadow: 0 0 14px rgba(59, 170, 255, 0.8);
}
```

## 字体规格

全局字体定义在 `src/index.css`:

```css
body {
  font-family: Inter, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

卡片内三类文字:

```css
.source-card-format {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: #a1a1aa;
}

.source-card-name {
  font-family: Inter, system-ui, sans-serif;
  font-size: 12px;
  line-height: 16px;
  font-weight: 700;
  letter-spacing: normal;
  color: #e4e4e7;
}

.source-card-label {
  font-family: Inter, system-ui, sans-serif;
  font-size: 8px;
  line-height: 12px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #52525b;
}
```

Tailwind:

```tsx
<span className="text-xs font-bold font-mono tracking-wide text-[#a1a1aa]">
  9.1.6
</span>

<span className="text-xs font-bold truncate text-[#e4e4e7]">
  Source A
</span>

<span className="text-[8px] font-bold tracking-wider text-[#52525b]">
  TRIM
</span>
```

## React 复用片段

```tsx
type CardState = 'idle' | 'selected';

const cardBase =
  'relative w-full rounded-xl p-1.5 mb-2 transition-all duration-300 ease-out select-none group transform-gpu border backdrop-blur-md cursor-pointer';

const cardIdle =
  'bg-[#06070a]/85 border-[#252830]/70 hover:border-[#353840]/80 hover:bg-[#08090c]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_8px_24px_-4px_rgba(0,0,0,0.7),0_2px_8px_rgba(0,0,0,0.4)]';

const cardSelectedBlue =
  'border-[#3baaff]/60 shadow-[0_0_24px_rgba(59,170,255,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#3baaff]/[0.02] scale-[1.01] shadow-xl';

const cardSelectedAmber =
  'border-[#ffaa00]/60 shadow-[0_0_24px_rgba(255,170,0,0.3),inset_0_1px_0_rgba(255,255,255,0.03)] bg-[#ffaa00]/[0.02] scale-[1.01] shadow-xl';

const indicatorBase =
  'absolute left-[-1px] top-4 bottom-4 w-1.5 rounded-r-md transition-all duration-300 z-10';

const indicatorBlueIdle = 'bg-[#0a1a3d]/15 shadow-none';
const indicatorBlueSelected =
  'bg-[#3baaff] shadow-[0_0_14px_rgba(59,170,255,0.8)]';

export function SourceCardShell({
  state,
  theme = 'blue',
  children,
}: {
  state: CardState;
  theme?: 'blue' | 'amber';
  children: React.ReactNode;
}) {
  const selected = state === 'selected';
  const selectedClass = theme === 'amber' ? cardSelectedAmber : cardSelectedBlue;

  return (
    <div className={[cardBase, selected ? selectedClass : cardIdle].join(' ')}>
      <div
        className={[
          indicatorBase,
          selected ? indicatorBlueSelected : indicatorBlueIdle,
        ].join(' ')}
      />
      {children}
    </div>
  );
}
```

## 迁移建议

1. 先迁移 `cardBase`，保证尺寸、圆角、blur、transition 与当前项目一致。
2. 再迁移 `cardIdle`，让暗色层次和静态边框成立。
3. 然后接入 `cardSelectedBlue`，用主题色控制选中态。
4. 最后加左侧 `indicator`，它负责让卡片在列表里可扫描。
5. 主题色抽成变量后，可以扩展 amber、green、purple、red。

## 可参数化 token

```ts
const sourceCardTokens = {
  radius: '12px',
  padding: '6px',
  idleBackground: 'rgba(6, 7, 10, 0.85)',
  idleBorder: 'rgba(37, 40, 48, 0.7)',
  idleHoverBackground: 'rgba(8, 9, 12, 0.9)',
  idleHoverBorder: 'rgba(53, 56, 64, 0.8)',
  innerHighlight: 'rgba(255, 255, 255, 0.03)',
  idleShadowMain: 'rgba(0, 0, 0, 0.7)',
  idleShadowSecondary: 'rgba(0, 0, 0, 0.4)',
  blue: '#3baaff',
  blueDeep: '#0a1a3d',
  amber: '#ffaa00',
  amberDeep: '#3d2a0a',
};
```

推荐在另一个项目里先用这组 token 复刻外层卡片，再把按钮、meter、文字层级接入同一套主题色。
