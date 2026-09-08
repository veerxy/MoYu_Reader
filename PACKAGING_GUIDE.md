# 桌面客户端本地打包指南 (Windows / macOS / Linux)

本项目已经配置好完整的 **Electron + React + Vite + electron-builder** 客户端工程架构。您可直接将代码下载到本地电脑进行打包与运行。

---

## 1. 下载代码到本地

在 AI Studio 页面右上角的菜单设置中，点击 **Export to ZIP**（或推送至 GitHub），将项目完整下载并解压到您的本地目录。

---

## 2. 环境准备

确保您的本地电脑已安装：
- **Node.js**: 推荐版本 18.x 或 20.x
- **npm** (随 Node.js 附带) 或 **pnpm** / **yarn**

打开终端（Windows 使用 PowerShell / CMD，Mac 使用 Terminal），进入项目解压目录：
```bash
cd document-reader
```

---

## 3. 安装依赖

运行以下命令安装所需依赖（包括 electron 和 electron-builder）：

```bash
npm install
```

> **提示（中国大陆网络环境）**：如果安装 Electron 速度较慢，可配置 Electron 国内镜像加速：
> ```bash
> # npm 配置镜像
> npm config set electron_mirror https://npmmirror.com/mirrors/electron/
> npm install
> ```

---

## 4. 本地启动开发客户端

在本地进行实时调试与体验客户端原生效果：

```bash
npm run electron:dev
```
该命令会自动启动 Vite 开发服务器并拉起 Electron 客户端原生悬浮窗口。

---

## 5. 本地打包独立安装包与可执行文件

执行打包命令：

```bash
npm run electron:build
```

- **打包过程说明**：
  1. 自动执行 `vite build` 将 React 前端代码打包到 `dist/` 目录。
  2. 自动调用 `electron-builder` 构筑原生客户端二进制包。
  3. 打包完成后，生成的可执行文件和安装包将保存在项目根目录下的 **`release/`** 文件夹中：
     - **Windows 系统**：`release/文档阅读器 Setup x.x.x.exe` 及无需安装的绿色便携免安装包。
     - **macOS 系统**：`release/文档阅读器-x.x.x.dmg` 和 `文档阅读器.app`。
     - **Linux 系统**：`release/文档阅读器-x.x.x.AppImage`。

---

## 6. 核心原生特性说明

1. **原生无边框悬浮窗**：
   - 启动即进入极简悬浮窗模式，可随处拖拽放置。
2. **8 向边缘与角落自由拉伸**：
   - 鼠标悬停至窗口上下左右 4 条边缘及 4 个拐角，均可即时缩放调整窗口大小。
3. **真实桌面级透明阅读模式**：
   - 阅读模式下默认背景透明、隐藏所有边框与顶部栏；
   - 鼠标点击事件在阅读器窗口内部生效，不会误穿透；
   - 按键盘 **`Tab`** 键可瞬间显隐工具栏与边框。
4. **原生系统文件选择器**：
   - 在客户端内点击“选择本地文件”时，直接调用 Windows / macOS 系统原生文件选择弹窗，支持 TXT / PDF 一键快速导入。
