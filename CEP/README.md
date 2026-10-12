# 灵绘 CEP 面板

## 安装

1. 完全退出 Illustrator。
2. 如果这是未签名的本地开发版，双击仓库根目录的 `Enable-CEP-Developer-Mode.reg`，确认导入当前用户注册表。
3. 在仓库目录打开 PowerShell，运行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-CEP-Panel.ps1`，并按提示输入 `Y`。现有同 ID 插件目录会先保留为带时间戳的备份。
4. 启动 Illustrator，在“窗口 > 扩展（旧版）> 灵绘”打开面板。安装完成后也可将面板停靠、浮动和调整大小。

开发者模式只针对当前 Windows 用户。确认来源可信后再启用；停用时删除 `HKEY_CURRENT_USER\Software\Adobe\CSXS.12` 下的 `PlayerDebugMode` 字符串值。

## 结构

- `index.html`、`css/panel.css`、`js/panel.js`：CEP 主界面及交互。
- `lib/CSInterface.js`：Adobe CEP SDK 随附的本地通信库。
- `host/cep-entry.jsx`：CEP 启动入口。
- `host/linghui.jsx`：现有 ExtendScript/BridgeTalk 业务逻辑及 CEP 调用适配器（保留中文界面与功能）。
- `CSXS/manifest.xml`：Illustrator 面板、运行时及最小窗口尺寸声明。
- `THIRD-PARTY-NOTICES.md`：Adobe CEP SDK 来源与许可提示。

面板中的尺寸、替换、互换、链接修复、扫描和保存操作均路由至 Illustrator ExtendScript。无需 CDN、Electron 或独立网页服务。

三页浏览器静态渲染截图位于仓库的 `artifacts/phase-1-ui/`。

## 验收范围

静态界面可以在普通浏览器预览；CEP/ExtendScript 通信、Illustrator 2026 的 CEP 运行时兼容、实际图像替换、Ctrl+Z 和保存结果必须在 Illustrator 内验证。当前工作区没有对 Illustrator 实机执行这些操作，因此这些项目仍待实机验证，不以浏览器预览代替。
