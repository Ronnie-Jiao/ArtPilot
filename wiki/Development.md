# 开发指南

## 代码结构

| 路径 | 说明 |
| --- | --- |
| `CEP/index.html` | CEP 面板结构与功能入口 |
| `CEP/css/panel.css` | 面板布局和 Illustrator 深色配色 |
| `CEP/js/panel.js` | 页面交互、状态同步和 CEP 通信 |
| `CEP/js/startup.js` | 面板连接状态与启动错误提示 |
| `CEP/js/native-picker.js` | 调用本地文件选择器 |
| `CEP/host/cep-entry.jsx` | CEP 宿主脚本引导入口 |
| `CEP/host/linghui.jsx` | Illustrator ExtendScript 业务逻辑和 CEP 接口 |
| `CEP/CSXS/manifest.xml` | 扩展版本、宿主版本范围和面板声明 |
| `CEP/native/BatchSourcePicker.cs` | Windows 原生图片选择窗口源码 |
| `灵绘.jsx` | 可独立运行的脚本入口及共享业务逻辑 |
| `Install-CEP-Panel.ps1` | 安装、备份和文件校验 |

CEP 面板不使用 CDN、Electron 或远程 API。Adobe CEP 通信库位于 `CEP/lib/CSInterface.js`，其许可证说明见 `CEP/THIRD-PARTY-NOTICES.md`。

## 本地修改与安装

修改 CEP 面板或宿主代码后，先保存文件，再退出 Illustrator 并运行 `安装灵绘CEP.cmd`。安装脚本会从源码目录完整复制 `CEP` 内容，以 `CSXS/manifest.xml` 中的版本号写入安装记录，并核对每个复制文件的 SHA-256。

若只修改独立脚本，可在 Illustrator 中重新运行 `灵绘.jsx`。自动启动入口由 `安装灵绘自动启动.cmd` 单独维护。

## 构建 Windows 图片选择器

`CEP/native/BatchSourcePicker-1.0.4.exe` 是随面板使用的本地选择器。源码和高 DPI 清单分别位于 `CEP/native/BatchSourcePicker.cs` 与 `CEP/native/BatchSourcePicker.manifest`。在 Windows 仓库根目录运行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Build-Native-Picker.ps1
```

构建环境需要脚本使用的 Windows .NET Framework C# 编译器。构建后确认安装脚本要求的 `CEP/native/BatchSourcePicker-1.0.4.exe` 仍存在，并检查文件版本与仓库清单相符。

## 验证

仓库包含定向 PowerShell/ExtendScript 验证脚本，部分验证需要 Illustrator 已运行，并会操作临时文档。运行前请先阅读对应脚本，使用可恢复的测试文档，并确认当前 Illustrator 文档已保存。

静态语法检查或安装文件哈希一致，只能说明源码可解析或文件复制一致；它们不代表 CEP 面板已在 Illustrator 中完成视觉和功能验收。更新记录会标注已完成的检查及尚待实际操作验证的部分。

## 修改流程建议

1. 保持 CEP 面板 HTML/CSS/JS 与宿主 API 的动作名称及状态字段一致。
2. 影响 CEP 与独立脚本共享逻辑时，同时核对 `CEP/host/linghui.jsx` 和根目录 `灵绘.jsx`。
3. 更新功能说明或验收范围时同步维护 `CEP/CHANGELOG.md` 和相关 Wiki 页面。
4. 提交前检查 `git diff --check`、暂存文件列表和差异内容；不要提交用户目录、安装缓存或过期生成包。
