<div align="center">

<img src="Code_Generated_Image.png" alt="MoYu Reader" width="120" />

# MoYu Reader · 摸鱼阅读器

**极简隐蔽的桌面文档阅读器 —— 工作间隙，安静摸鱼**

基于 Tauri 2 + React 构建的轻量原生桌面应用，专注 TXT 小说与 PDF 文档阅读。
默认透明无边框，一键隐身于任何工作界面之上。

[![Release](https://img.shields.io/github/v/release/veerxy/MoYu_Reader?style=flat-square&label=%E5%8F%91%E5%B8%83%E7%89%88%E6%9C%AC)](https://github.com/veerxy/MoYu_Reader/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)](https://github.com/veerxy/MoYu_Reader/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)

---

## 🧾 Project Facts

**MoYu Reader** is a lightweight, open-source Windows desktop reader for TXT and PDF documents.

- **License:** Apache-2.0
- **Source code:** https://github.com/veerxy/MoYu_Reader
- **Build system:** GitHub Actions
- **Automated tests:** 53 unit tests
- **Releases:** Public GitHub Releases with portable and installer artifacts
- **Code signing:** Not currently signed; Windows may show a SmartScreen warning on first run

The project is publicly maintained and uses automated CI/CD. Commercial code signing may be added once the project has broader adoption or a suitable signing service is selected.

</div>

---

## ✨ 特性

### 🫥 隐蔽摸鱼模式
- **透明无边框窗口** —— 阅读模式默认窗口透明、无标题栏、无边框；TXT 文字直接悬浮在屏幕上，PDF 则呈现悬浮的纸面页面
- **Tab 一键隐藏边框** —— 按 `Tab` 隐藏/显示工具栏与边框，让文字与桌面文字融为一体
- **窗口快速隐藏** —— 点击窗口外的区域会自动将点击区域置顶，隐藏TXT文字，完美隐身

### 📖 阅读体验
- **TXT / PDF 双格式** —— 支持点击浏览与拖拽导入
- **编码自动识别** —— GBK / UTF-8 / GB18030 等中文编码自动检测，告别乱码
- **阅读进度记忆** —— TXT 记录滚动位置，PDF 记录页码，上次读到哪里一目了然
- **历史书库** —— 最近阅读与历史记录管理，一键续读

### 🎨 排版自定义
- 字号（12–36px）、行间距、字体、对齐方式自由调节
- 字体颜色自定义
- 四种背景模式（**透明 / 深色 / 纯白 / 仿书纸**，TXT 完整支持；PDF 为纸面渲染，深色模式下自动反色）

### ⚡ 轻量快速
- Tauri 2 原生内核，安装包小、内存占用低、启动秒开
- 绿色便携版单文件运行，免安装、不写注册表

## 📥 下载安装

前往 [Releases](https://github.com/veerxy/MoYu_Reader/releases) 页面下载最新版本：

| 文件 | 说明 |
|------|------|
| `moyu-reader-portable.exe` | **绿色便携版**，单文件双击即用 |
| `moyu-reader_x64-setup.exe` | NSIS 安装包 |
| `moyu-reader_x64_en-US.msi` | MSI 安装包 |

> 适用于 Windows 10 / 11（x64）

### ⚠️ Windows SmartScreen 安全提示

当前发布包尚未进行商业代码签名。首次运行时，Windows 可能显示 **“Windows 已保护你的电脑”**。

这是 Windows 对未签名程序的常规提醒，并不代表检测到病毒。如果你确认文件来自本仓库的 [Releases](https://github.com/veerxy/MoYu_Reader/releases) 页面，可以按以下步骤继续：

1. 在提示窗口点击 **“更多信息”**
2. 点击 **“仍要运行”**

> 请只对确认来源可信的程序使用此方式。如果你从其他渠道下载了安装包，建议先核对文件来源或校验发布信息。

## 🎮 使用指南

### 快捷键

| 按键 | 功能 |
|------|------|
| `Tab` | 显示 / 隐藏工具栏与边框（摸鱼核心键） |
| `Esc` | 关闭设置弹窗 / 退出阅读模式 |
| `←` `PageUp` | 上滑 |
| `→` `PageDown` `空格` | 下滑 |

### 摸鱼姿势

1. **打开文档** —— 首页点击或拖入 TXT / PDF 文件
2. **进入阅读** —— 窗口自动变为透明无边框小窗，拖到屏幕一隅
3. **隐身模式** —— 按 `Tab` 隐藏所有边框与工具栏，只剩文字悬浮
4. **唤回控制** —— 鼠标移到窗口顶部悬停区，或再按 `Tab`
5. **调整大小** —— 鼠标拖拽窗口边缘（显示边框时）

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Tauri 2](https://tauri.app/) | Rust 原生桌面框架（窗口、文件系统、系统集成） |
| React 19 + TypeScript | 前端界面 |
| Tailwind CSS 4 | 样式 |
| pdfjs-dist | PDF 渲染 |
| Vite 6 | 构建工具 |

## 💻 本地开发

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run tauri:dev

# 打包生产版本
npm run tauri:build

# 类型检查
npm run lint
```

> 需要本地具备 Rust 工具链与 Node.js 20+。

## 📦 CI / CD

推送 `v*` 标签自动触发 [GitHub Actions](.github/workflows/release.yml) 构建，产出便携版 exe 与安装包，并自动发布到 Releases：

```bash
git tag v1.0.2
git push origin v1.0.2
```

## 🗺️ 项目结构

```
├── src/                    # React 前端
│   ├── components/         # UI 组件（阅读器、设置、侧栏、标题栏…）
│   ├── utils/              # 桌面 API 封装、存储、拖拽
│   └── App.tsx             # 应用入口与窗口状态管理
├── src-tauri/              # Tauri / Rust 后端
│   ├── src/lib.rs          # 窗口控制命令
│   └── tauri.conf.json     # 窗口与应用配置
├── scripts/                # 图标生成等辅助脚本
└── .github/workflows/      # CI 自动打包发布
```

---

<div align="center">

**摸鱼有风险，阅读需谨慎 🐟**

如果觉得好用，欢迎 Star ⭐

</div>
