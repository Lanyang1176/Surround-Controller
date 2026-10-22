# TOPPING 环绕声控制器

面向 TOPPING 音频设备的专业环绕声控制器 UI 原型。应用基于 Vite + React 构建，开发阶段使用本地模拟设备数据。

## 运行

```bash
npm install
npm run dev
```

本地开发服务器：

```text
http://127.0.0.1:5173/
```

## 构建

```bash
npm run build
```

生产构建输出到 `out/web/`。

## 项目结构

```text
src/                         应用源码
docs/                        设计与实现说明
skills/                      开发期间使用的本地工作流技能
artifacts/screenshots/eq/    EQ 截图与视觉参考
dev/                         实验、导出的模块、临时工具和笔记
out/                         生成的构建与报告输出
```

`package.json` 包含当前可用的运行命令。Electron 专用运行时文件已从应用主路径中移除。
