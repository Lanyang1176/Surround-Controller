# Audio Interface SPA Tech Stack Handoff

日期: 2026-06-11

用途: 为新的单页面声卡界面确定技术栈和项目模板方向。

## 结论

新项目建议沿用当前仓库的前端基线:

- React 19
- TypeScript 5
- Vite 6
- Tailwind CSS 3
- Zustand
- lucide-react
- clsx + tailwind-merge

这套栈适合做单页面声卡界面。它在控制面板、参数编辑、实时状态展示、快速原型验证上效率高，当前项目已经有可运行的结构和业务类型可参考。

## 当前项目事实

当前仓库名为 `topping-surround-controller`，活跃应用是 Vite + React Web 原型。

关键文件:

- `package.json`: 运行脚本和依赖来源
- `vite.web.config.ts`: Web 构建配置，入口目录为 `src`
- `tailwind.config.js`: Tailwind 扫描范围
- `src/types.ts`: 声道、输出、EQ、低频管理等业务类型
- `src/stores/deviceStore.ts`: Zustand 设备状态中心
- `src/dev/mockDevice.ts`: 本地 mock 设备状态和 meter 数据
- `src/hooks/useDevice.ts`: UI 读取设备状态的 hook
- `src/components/`: 控制界面组件

当前运行命令:

```bash
npm run dev
npm run build
npm run preview
```

当前本地开发地址:

```text
http://127.0.0.1:5173/
```

生产构建输出:

```text
out/web/
```

## 可复用价值

当前项目对新声卡单页界面有三类参考价值。

第一类是工程底座。React + TypeScript + Vite 已经覆盖单页应用开发、类型建模、本地构建和浏览器调试。

第二类是音频业务模型。`Source`、`Output`、`OutputChannel`、`EQBand`、`BassManagementConfig`、meter 数据结构可以作为新声卡项目的初始模型。

第三类是控制面板经验。当前项目已经包含音量、mute、dim、source/output 选择、speaker layout、graphic EQ、parametric EQ、bass management、meter visualizer 等模块。

## 新项目推荐模板

建议把新项目抽象成 `audio-control-spa-template`，按以下结构组织:

```text
src/
  app/
    App.tsx
    bootstrap.tsx
  components/
    controls/
    meters/
    panels/
    layout/
  device/
    DeviceAdapter.ts
    MockDeviceAdapter.ts
  features/
    monitor/
    mixer/
    eq/
    routing/
    presets/
    settings/
  hooks/
    useDevice.ts
    useMeters.ts
  stores/
    deviceStore.ts
    uiStore.ts
  types/
    audio.ts
    device.ts
    presets.ts
  product/
    productConfig.ts
    capabilities.ts
  lib/
    utils.ts
```

## 技术选型建议

| 层级 | 推荐 | 作用 |
|---|---|---|
| UI 框架 | React | 单页面复杂状态 UI |
| 语言 | TypeScript | 参数、协议、状态建模 |
| 构建 | Vite | 本地开发和静态构建 |
| 样式 | Tailwind CSS | 快速构建密集控制界面 |
| 状态 | Zustand | 设备状态和 UI 状态 |
| 图标 | lucide-react | 工具栏、按钮、状态图标 |
| 动效 | @react-spring/web | 旋钮、meter、切换反馈 |
| 类名工具 | clsx + tailwind-merge | 条件样式和 Tailwind 合并 |

## 模板核心抽象

新项目最重要的抽象是设备适配层。UI 只消费统一接口，mock、WebHID、Electron IPC、Native bridge 都可以落到同一层。

```ts
export interface DeviceAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  requestFullState(): Promise<FullDeviceState>;
  setVolume(db: number): Promise<void>;
  setMute(enabled: boolean): Promise<void>;
  setDim(enabled: boolean): Promise<void>;
  updateChannel(outputId: string, channelId: string, patch: Partial<OutputChannel>): Promise<void>;
  updateEQ(outputId: string, channelId: string, bands: EQBand[]): Promise<void>;
  onMeterData(callback: (snapshot: MeterSnapshot) => void): () => void;
  onStateChanged(callback: (state: FullDeviceState) => void): () => void;
}
```

产品能力放到配置层:

```ts
export const productConfig = {
  name: 'TOPPING Audio Interface',
  channelCount: 16,
  inputCount: 8,
  outputCount: 8,
  sampleRates: [44100, 48000, 96000, 192000],
  capabilities: {
    monitor: true,
    mixer: true,
    routing: true,
    parametricEQ: true,
    graphicEQ: false,
    presets: true,
    meters: true,
  },
};
```

## 单页面声卡界面建议模块

新声卡界面建议先按一个页面内的 6 个工作区组织:

1. 顶部状态栏: 设备名、连接状态、采样率、时钟源、固件版本
2. Monitor: 主音量、mute、dim、ref level、输出选择
3. Mixer: 输入电平、输出电平、通道 mute/solo/link
4. Routing: 输入到输出的路由矩阵或简化路由卡片
5. EQ/Processing: 每个输出或监听通道的 EQ、滤波、增益、延迟
6. Presets/Settings: 预设保存、加载、设备设置

这个结构适合先做单页 MVP，后续可以拆成 tabs 或左侧导航。

## 从当前项目迁移的优先级

优先迁移:

- `src/types.ts` 中的音频业务类型
- `src/stores/deviceStore.ts` 的 Zustand store 思路
- `src/dev/mockDevice.ts` 的 mock 数据生成方式
- `src/hooks/useDevice.ts` 的 selector hook 方式
- `src/components/Meter.tsx` 和 `src/hooks/useMeterData.ts` 的 meter 组织方式
- EQ 相关组件的交互模式

延后迁移:

- Surround 专属的 speaker layout
- Bass management 细节
- 多输出 Alt 结构
- 历史 Electron/HID 文档里的实现细节

## 新项目落地步骤

1. 创建新 Vite React TS 项目，安装当前基线依赖。
2. 建立 `types/`、`stores/`、`device/`、`features/`、`product/` 目录。
3. 先实现 `MockDeviceAdapter`，确保单页 UI 可以脱离硬件完整运行。
4. 用 `productConfig` 驱动页面显示模块。
5. 把真实设备通信接入 `DeviceAdapter`，保持 UI 层调用稳定。
6. 建立最小验证: `npm run build`、本地页面打开、mock meter 动起来、状态操作能反映到 store。

## 风险和边界

当前仓库可以证明前端控制界面的工程路线可行。真实声卡项目还需要补齐设备通信层、协议确认、错误恢复、连接生命周期、固件版本兼容、最终运行容器。

如果目标是浏览器原型，当前栈可以直接用。

如果目标是桌面控制软件，建议先保留当前 Web 栈，再选择 Electron、Tauri 或厂内 native shell 承载设备通信和打包发布。

## 推荐决策

新单页面声卡界面采用 React + TypeScript + Vite + Tailwind + Zustand 作为前端基础模板。第一阶段以 Web SPA + MockDeviceAdapter 完成产品和交互验证，第二阶段接入真实设备适配层。
