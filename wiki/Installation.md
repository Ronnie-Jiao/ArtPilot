# 安装与更新

## 系统要求

- Windows
- Adobe Illustrator 29.5 或更高版本（Illustrator 2025 及更新版本；以 CEP 清单声明为准）
- CEP 12

本仓库的 CEP 安装脚本依赖 Windows PowerShell、用户注册表和 `%APPDATA%`。当前安装流程面向 Windows。

## 安装 CEP 面板

1. 从 GitHub 下载仓库 ZIP 并解压，或克隆仓库到本机。
2. 保存打开的设计文档并退出 Illustrator。
3. 双击仓库根目录的 `安装灵绘CEP.cmd`。也可以在仓库目录运行：

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-CEP-Panel.ps1
   ```

4. 等待安装程序报告完成，然后启动 Illustrator。
5. 从 **窗口 → 扩展（旧版）→ ArtPilot 灵绘** 打开面板。

安装程序会从当前仓库的 `CEP` 目录递归复制文件到当前 Windows 用户的 CEP 扩展目录，读取版本号、备份已有安装并逐文件校验 SHA-256。它不会关闭 Illustrator，也不会操作打开的文档；若安装时 Illustrator 仍开着，请退出并重新启动，使宿主脚本载入新版本。

安装记录：

```text
%APPDATA%\Adobe\CEP\installations\com.ronniejiao.linghui.json
```

备份位于 `%APPDATA%\Adobe\CEP\extensions-backups`。安装脚本可能在安全条件允许时归档该扩展生成的 CEP 页面缓存；不会删除 Illustrator 的用户设置和本地存储。

## CEP 开发者模式

这是本机未签名的 CEP 扩展。安装脚本会设置当前用户的：

```text
HKCU\Software\Adobe\CSXS.12\PlayerDebugMode = "1"
```

此设置影响当前 Windows 用户下的 CEP 12 扩展。仅运行你信任的源码；若手动关闭开发者模式，请先确认其他 CEP 扩展不依赖此设置，再删除该注册表值。

## 更新面板

也可以在面板“快捷操作”中点“检查更新”。发现新版后确认打开下载包，解压后运行包内 `Install-CEP-Panel.ps1`；检查本身不会自动替换本机安装。

1. 保存文档并退出 Illustrator。
2. 更新到新的仓库源码。
3. 重新运行 `安装灵绘CEP.cmd`。
4. 启动 Illustrator 并打开 **窗口 → 扩展（旧版）→ ArtPilot 灵绘**。

不要只关闭并重开面板来载入新宿主代码；Illustrator 可能会在持久脚本引擎中保留旧代码。完整退出再启动是可靠的更新方式。

## 使用独立脚本

在 Illustrator 中选择 **文件 → 脚本 → 其他脚本**，选择仓库根目录的 `灵绘.jsx`。该脚本和 CEP 面板是两种独立入口。

`安装灵绘自动启动.cmd` 配置独立 JSX 脚本的自动启动入口，不会更新 CEP 扩展。要更新自动启动脚本，请确认入口指向的 `灵绘.jsx` 是你期望运行的文件。
