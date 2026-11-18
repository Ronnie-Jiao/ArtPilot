# 灵绘（ArtPilot）— Adobe Illustrator 扩展

[简体中文](#简体中文) · [English](#english)

## 简体中文

**灵绘**是面向 Adobe Illustrator 的 Windows CEP 面板和 ExtendScript 工具，帮助设计师统一对象尺寸、修复或替换图片链接、互换图片对象，并优化 AI 文档保存。

### 功能

| 功能 | 说明 |
| --- | --- |
| **统一尺寸** | 将选中对象设置为统一高度、宽度或高宽；支持多种单位、锁定比例和缩放描边。 |
| **缺图修复** | 在选中的图片或文件夹中按文件名查找替代资源，可选择搜索子目录；文件名不同时也可手动指定图片。 |
| **互换链接** | 互换两个选中的图片对象，支持链接图与嵌入图混用；如果 Illustrator 不允许直接跨组移动，会用保留图片类型的副本完成换位。部分断链图片也可参与互换，但不会恢复丢失的源文件。 |
| **替换图片** | 按版面顺序，用多张新图片逐个替换选中对象，不要求文件名相同。多出的来源图片会被忽略；来源不足时，未配对的目标保持不变。 |
| **AI 文档优化** | 扫描当前文档、优化另存，或确认后覆盖当前文件。可设置 PDF 兼容数据、链接图片处理和 ICC 色彩配置。 |
| **检查更新** | 通过 HTTPS 检查 CEP 面板新版本；经用户确认后打开下载，不会自动安装。 |

Illustrator 文档编辑和图片文件操作均在本机执行。检查更新时会连接配置的 HTTPS 更新服务。项目使用 Adobe CEP 和 ExtendScript，不依赖 Electron 或远程网页应用。

### 系统要求

- Windows
- Adobe Illustrator 29.5 或更高版本（Illustrator 2025 或更新版本）
- Adobe CEP 12 运行时

### 安装 CEP 面板

1. 从 GitHub 下载并解压本仓库，或克隆仓库：

   ```powershell
   git clone https://github.com/Ronnie-Jiao/ArtPilot.git
   ```

2. 保存打开的 Illustrator 文档，并完全退出 Illustrator。
3. 在仓库根目录运行 `安装灵绘CEP.cmd`。也可以运行：

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-CEP-Panel.ps1
   ```

4. 启动 Illustrator，在 **窗口 → 扩展（旧版）→ ArtPilot 灵绘** 中打开面板。

安装程序会将面板复制到当前用户的 CEP 扩展目录，备份已有安装，并用 SHA-256 校验复制文件。它不会关闭 Illustrator。安装或更新后请重启 Illustrator，让宿主脚本载入新版本。

这是未签名的 CEP 扩展。安装程序会为当前 Windows 用户启用 CEP 12 的 `PlayerDebugMode`，以便 Illustrator 加载扩展。请只安装信任来源的代码。详情见[安装与更新](wiki/Installation.md)。

### 运行独立 JSX 工具

在 Illustrator 中选择 **文件 → 脚本 → 其他脚本…**，再选择仓库里的 `灵绘.jsx`。这会打开独立的 ScriptUI 工具，与可停靠的 CEP 面板是两种独立入口。`安装灵绘自动启动.cmd` 配置独立脚本的启动入口，不会安装或更新 CEP 面板。

### 项目结构

- `CEP/`：CEP 面板、宿主脚本、样式和 Windows 原生选择器。
- `wiki/`：项目文档源文件。
- `tests/`：定向检查脚本；部分脚本需要 Illustrator。
- `灵绘.jsx`：独立 ExtendScript 工具。
- `Install-CEP-Panel.ps1`、`安装灵绘CEP.cmd`：CEP 面板安装入口。
- `安装灵绘自动启动.ps1`、`安装灵绘自动启动.cmd`：独立脚本启动入口安装程序。
- `Build-Native-Picker.ps1`：Windows 原生选择器构建脚本。

### 文档

- [项目 Wiki](wiki/Home.md)
- [功能说明](wiki/Features.md)
- [安装与更新](wiki/Installation.md)
- [故障排查](wiki/Troubleshooting.md)
- [开发指南](wiki/Development.md)
- [更新记录](CEP/CHANGELOG.md)
- [第三方声明](CEP/THIRD-PARTY-NOTICES.md)

`wiki/` 随项目源码维护，不会自动发布到 GitHub 独立 Wiki 标签页。

### 反馈问题

请附上 Windows 和 Illustrator 版本、灵绘版本、复现步骤及截图。图片链接问题请说明图片是嵌入图、正常链接还是缺失链接。

### 许可证

仓库目前没有根目录 `LICENSE` 文件，因此尚未声明代码复用和再分发许可。Adobe CEP SDK 相关说明见[第三方声明](CEP/THIRD-PARTY-NOTICES.md)。

## English

**Linghui** is a Windows CEP panel and ExtendScript toolkit for Adobe Illustrator. It helps designers standardize object dimensions, repair and replace linked images, swap image objects, and optimize AI document saves.

### Features

| Feature | What it does |
| --- | --- |
| **Unified sizing** | Set selected objects to a common width, height, or width and height. Supports multiple units, proportional scaling, and stroke scaling. |
| **Missing-link repair** | Find replacement assets by filename in selected images or folders. Optionally search subfolders. You can also choose an image manually when the filename differs. |
| **Swap images** | Swap two selected image objects, including linked and embedded images. A broken link can participate in supported cases; swapping does not restore the missing source file. |
| **Replace images** | Replace selected image objects with a batch of new images, paired by layout order rather than matching filenames. Extra source images are ignored; targets without a matching source remain unchanged. |
| **AI save optimization** | Scan the current document, save an optimized copy, or overwrite the current file after confirmation. Options include PDF compatibility, linked-image handling, and ICC color profiles. |
| **Update check** | Check for a newer CEP panel version over HTTPS. A download opens only after confirmation; installation is not automatic. |

Illustrator document edits and image-file operations run locally. The update check connects to the configured HTTPS update service. The project uses Adobe CEP and ExtendScript, without Electron or a remote web application.

### Requirements

- Windows
- Adobe Illustrator 29.5 or later (Illustrator 2025 or later)
- Adobe CEP 12 runtime

### Install the CEP panel

1. Download and extract this repository, or clone it:

   ```powershell
   git clone https://github.com/Ronnie-Jiao/ArtPilot.git
   ```

2. Save open Illustrator documents and fully exit Illustrator.
3. Run `安装灵绘CEP.cmd` from the repository root. Alternatively, run:

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-CEP-Panel.ps1
   ```

4. Start Illustrator and open **Window → Extensions (Legacy) → ArtPilot 灵绘**.

The installer copies the panel to the current user's CEP extensions folder, backs up an existing installation, and verifies copied files with SHA-256. It does not close Illustrator. Restart Illustrator after installation or an update so the host scripts load the new version.

This is an unsigned CEP extension. The installer enables CEP 12 `PlayerDebugMode` for the current Windows user so Illustrator can load it. Install only from source you trust. See [Installation and updates](wiki/Installation.md) for details.

### Run the standalone JSX tool

In Illustrator, choose **File → Scripts → Other Script…** and select `灵绘.jsx` from the repository. This opens the standalone ScriptUI version; it is separate from the dockable CEP panel. `安装灵绘自动启动.cmd` configures the standalone script's startup entry and does not install or update the CEP panel.

### Repository layout

```text
.
├── CEP/                       # CEP panel, host scripts, styles, and native Windows picker
├── wiki/                      # Project documentation source
├── tests/                     # Targeted checks; some require Illustrator
├── 灵绘.jsx                   # Standalone ExtendScript tool
├── 灵绘自动启动.jsx           # Standalone startup entry
├── Install-CEP-Panel.ps1      # CEP installation and file verification
├── 安装灵绘CEP.cmd            # CEP installer shortcut
├── 安装灵绘自动启动.ps1       # Standalone startup installer
└── Build-Native-Picker.ps1    # Native Windows picker build script
```

### Documentation

- [Project wiki](wiki/Home.md)
- [Features](wiki/Features.md)
- [Installation and updates](wiki/Installation.md)
- [Troubleshooting](wiki/Troubleshooting.md)
- [Development guide](wiki/Development.md)
- [Changelog](CEP/CHANGELOG.md)
- [Third-party notices](CEP/THIRD-PARTY-NOTICES.md)

The `wiki/` directory is maintained with the source repository. It is not automatically published to GitHub's separate Wiki tab.

### Report an issue

Include your Windows and Illustrator versions, the Linghui version, steps to reproduce the issue, and a screenshot. For image-link problems, say whether each image is embedded, linked, or missing.

### License

This repository does not currently include a root `LICENSE` file, so no license for reuse or redistribution has been declared. Adobe CEP SDK notices are in [THIRD-PARTY-NOTICES.md](CEP/THIRD-PARTY-NOTICES.md).

---

Created by [Ronnie Jiao](https://github.com/Ronnie-Jiao).
