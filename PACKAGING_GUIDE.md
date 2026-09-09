# 极简隐蔽文档阅读器 (Tauri v2 桌面客户端指南)

本项目采用 **Tauri v2 + Rust + React 19 + TypeScript + Tailwind CSS** 极轻量桌面架构（打包后体积仅 10MB 左右，内存占用 30MB~50MB，远低于 Electron 的几百兆）。

---

## 方式一：GitHub Actions 云端自动构建（强烈推荐，免配本地 Rust 环境）

1. 将代码推送到您的 GitHub 仓库；
2. 在仓库的 **Settings** -> **Actions** -> **General** 中，将 **Workflow permissions** 改为 **Read and write permissions** 并保存；
3. 进入 **Actions** 页面，选择 **Release Tauri App**，点击 **Run workflow**；
4. 构建完成后，在 **Releases 页面** 或 Actions 下方的 **Artifacts** 中：
   - **绿色免安装便携版**：直接下载 `moyu-reader-portable.exe`（单文件，双击直接运行，不需要安装，放在 U 盘或任何目录都能用）；
   - **安装版**：`moyu-reader_1.0.0_x64-setup.exe` 或 `.msi`（带桌面快捷方式、开始菜单与卸载程序）。

---

## 方式二：本地运行与打包

### 1. 环境准备
- **Node.js**: 18.x 或 20.x
- **Rust 工具链**: [https://rustup.rs/](https://rustup.rs/)（安装 `rustup-init.exe`）

### 2. 安装依赖
```bash
npm install
```

### 3. 本地启动开发桌面客户端
```bash
npm run tauri:dev
```
> 自动启动后台渲染服务并唤起无边框透明原生桌面窗口。

### 4. 本地打包 exe
```bash
npm run tauri:build
```
> 生成的可执行文件与安装包存放在 `src-tauri/target/release/` 目录中。

---

## 核心特性
1. **原生无边框透明隐蔽**：阅读模式支持纯透明背景与无边框展示，完美融入桌面背景；
2. **全局窗口拖拽**：在顶部栏或窗口空白处长按左键即可自由移动位置；
3. **Tab 键快捷显隐**：随时按键盘 `Tab` 键一键唤出/隐藏顶栏与边框；
4. **智能穿透开关**：透明模式下可在设置中自由切换「允许穿透（点击落入下层窗口）」与「不允许穿透（客户端内部操作）」。

