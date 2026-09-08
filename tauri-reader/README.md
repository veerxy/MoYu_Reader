# 极简隐蔽桌面文档阅读器 (Tauri v2 原生桌面端)

基于 **Tauri v2 + Rust + React 19 + TypeScript + Tailwind CSS 4** 构建的高性能、超低资源占用的极简桌面文档阅读器。

与传统 Electron 版本相比，Tauri 版本具有以下显著优势：
- 🚀 **超轻量体积**：打包安装包仅约 10MB~15MB（Electron 通常需 150MB+）；
- ⚡ **超低内存占用**：运行时仅需约 30MB~50MB 内存（Electron 通常 200MB~400MB）；
- 🛡️ **原生系统集成**：借助 Rust 底层直接调用操作系统窗口 API（穿透点击、全局拖拽、置顶控制）。

---

## 🌟 核心功能一览

1. **多格式文档解析**
   - **TXT 文档**：智能编码识别、空行智能压缩、章节正则表达式解析与大纲快速跳转、阅读进度精确定位与恢复。
   - **PDF 文档**：内置 `pdfjs-dist` 现代内核，多级目录解析、平滑翻页、缩放与自适应视图。

2. **隐蔽/透明阅读模式**
   - **透明背景**：支持完全透明背景，文字直接悬浮于桌面或工作软件之上。
   - **鼠标事件穿透控制**：
     - *不允许穿透（默认）*：鼠标点击、拖选文本与滚动严格留在当前阅读器内，绝不误触下层窗口。
     - *允许穿透*：开启后隐藏工具栏即可使鼠标事件直接穿透至下层桌面/软件，实现彻底的“神仙悬浮”。
     - 随时按键盘 **Tab** 键立即重新唤出顶栏恢复完整控制。

3. **原生无边框窗口与手势操作**
   - 顶部工具栏与内容空白区域支持**原生按住左键拖拽窗口**（Rust 命令与 `data-tauri-drag-region` 双重保障）。
   - 双击顶栏最大化/向下还原。
   - 窗口右上角包含 Windows 标准三键（最小化、最大化/还原、直接退出关闭）。
   - 窗口边框与圆角自适应：有色模式保留柔和圆角与边框，透明模式自动去除边框融入桌面。

4. **高级排版与人性化体验**
   - 4 款精选阅读主题：透明背景、纸张白、护眼羊皮纸、夜间暗黑。
   - 字体大小（12~36px）、行高（1.4~2.6）、文字颜色快速切换与 Hex 拾色器。
   - 设置面板具备上下呼吸留白与内部独立平滑滚动，绝不顶死屏幕边缘。
   - 本地持久化：IndexedDB 数据库存储文档内容、阅读进度及个性化设置。

---

## 🛠️ 本地环境准备

在本地编译运行前，请确保安装了以下基础开发环境：

1. **Node.js**：版本 `>= 18.0.0`
2. **Rust 工具链**：
   - 访问 [https://rustup.rs/](https://rustup.rs/) 安装 `rustup` 及最新的 stable 工具链。
3. **各操作系统平台依赖**：
   - **Windows**：Windows 10/11 预装 WebView2；已安装 C++ 生成工具（Visual Studio Build Tools）。
   - **macOS**：预装 Xcode 命令行工具 (`xcode-select --install`)。
   - **Linux (Ubuntu/Debian)**：
     ```bash
     sudo apt update
     sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
     ```

---

## 🚀 运行与构建

### 1. 安装前端依赖
```bash
cd tauri-reader
npm install
```

### 2. 开发调试 (Dev)
启动前端 Vite 服务并同时启动 Tauri 原生窗口：
```bash
npm run tauri:dev
```
> 首次运行会自动拉取并编译 Rust 依赖库，请保持网络畅通。

### 3. 正式打包构建 (Build)
生成独立桌面安装包与可执行文件：
```bash
npm run tauri:build
```
打包输出路径位于：
- `src-tauri/target/release/bundle/`
  - Windows: `.msi` 安装包或 `.exe` 绿色免安装版
  - macOS: `.dmg` 或 `.app`
  - Linux: `.deb` 或 `.AppImage`

---

## 📁 目录结构

```
tauri-reader/
├── src-tauri/                 # Tauri Rust 原生底层
│   ├── Cargo.toml             # Rust 依赖与包配置
│   ├── tauri.conf.json        # Tauri 窗口与安全配置 (透明度、尺寸、权限等)
│   ├── capabilities/          # Tauri v2 权限能力配置
│   │   └── default.json
│   ├── src/
│   │   ├── main.rs            # 窗口启动入口
│   │   └── lib.rs             # IPC 核心命令 (穿透、拖拽、最小化、关闭等)
│   └── build.rs
├── src/                       # React 19 前端业务逻辑
│   ├── components/            # UI 组件 (阅读器、目录、设置面板等)
│   ├── utils/                 # 工具函数 (desktop.ts 跨平台适配器、IndexedDB 存储等)
│   ├── types.ts               # TypeScript 类型定义
│   ├── App.tsx                # 主页面容器
│   └── main.tsx
├── package.json
└── vite.config.ts
```
