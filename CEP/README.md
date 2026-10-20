# 灵绘 CEP 面板 1.1.21

## 安装

1. 双击仓库根目录的 `安装灵绘CEP.cmd`，或运行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-CEP-Panel.ps1`。不需要管理员权限。
2. 安装程序将完整面板写入当前用户的 `%APPDATA%\Adobe\CEP\extensions\com.ronniejiao.linghui`，启用当前用户的 CEP 12 开发者加载模式，并保留旧版备份。未运行的灵绘面板只归档生成的网页、代码和 GPU 缓存，保留设置和本地存储。
3. 保存文档后退出并重新启动 Illustrator，在“窗口 > 扩展（旧版）> 灵绘 1.1.21”打开面板。支持 Illustrator 2025 29.5 及更新版本。

安装程序只复制和校验文件，不关闭 Illustrator、不执行文档操作。安装记录保存在 `%APPDATA%\Adobe\CEP\installations\com.ronniejiao.linghui.json`。

开发者模式只针对当前 Windows 用户。确认来源可信后再启用；停用时删除 `HKEY_CURRENT_USER\Software\Adobe\CSXS.12` 下的 `PlayerDebugMode` 字符串值。

## 独立脚本

仓库根目录的 `灵绘.jsx` 已同步 1.1.18 的尺寸、缺图修复、互换链接、替换图片及无损压缩功能。在 Illustrator 的“文件 > 脚本 > 其他脚本”选择此文件即可打开 `灵绘 1.1.18`；再次运行会重建脚本窗口，无需重启 Illustrator。现有自动启动入口也加载此文件。

原生图片选择窗口优先从脚本同目录的 `CEP/native/BatchSourcePicker-1.0.4.exe` 加载；脚本被复制到其他位置时，也可使用当前用户已安装灵绘插件内的选择器。本次同步只核对脚本语法、共享业务代码与依赖文件；实际功能由使用者测试。

## 结构

- `index.html`、`css/panel.css`、`js/panel.js`：CEP 主界面及交互。
- `js/startup.js`：显示启动状态、加载错误与重试入口。
- `lib/CSInterface.js`：Adobe CEP SDK 随附的本地通信库。
- `host/cep-entry.jsx`：界面显示后，由 `panel.js` 传入绝对安装路径再加载后台。新清单不预加载 JSX；旧会话仍按旧清单预加载时，入口从当前用户的插件安装目录定位后台，不依赖首次 JSX 的 `$.fileName`。
- `host/linghui.jsx`：现有 ExtendScript/BridgeTalk 业务逻辑及 CEP 调用适配器（保留中文界面与功能）。
- `CSXS/manifest.xml`：Illustrator 面板、运行时及最小窗口尺寸声明。
- `THIRD-PARTY-NOTICES.md`：Adobe CEP SDK 来源与许可提示。

面板中的尺寸、替换、互换、缺图修复和保存操作均路由至 Illustrator ExtendScript。无需 CDN、Electron 或独立网页服务。

“互换链接”支持两张链接图片、链接与嵌入图片混选、两张嵌入图片，以及一个链接正常、另一个链接文件缺失的情况。任一链接文件缺失时，直接交换文档内的两个图片对象及其位置：正常图片移动到缺图位置，缺失链接对象移动到另一位置；缺失文件本身不会因此恢复，之后可用“缺图修复”重新链接。各位置的中心、外接框高度、旋转、镜像方向、所在组和叠放位置保留，宽度随图片比例调整；剪切路径留在原组。直接交换失败时尝试恢复原对象的位置与变换。

CEP 面板直接调用互换接口，返回实际完成或错误结果，并对缺图互换显示单独结果。尺寸和链接快捷操作合并在“尺寸与链接”页签中。版本号显示在面板顶部标签“灵绘”后面，重新打开后应显示 `灵绘 1.1.21`。最近一次互换状态保存在 Illustrator 用户数据目录的 `AI_Merged_Toolbox/last-swap.txt`。

“缺图修复”统一承接原来的链接扫描修复和缺图替换。点击后可选择一张图片、多张图片或文件夹：单张图片配合一个选中的链接图片会替换该位置，并按文件名修复同目录的其他缺图；选文件夹或多张图片会按名称扫描并修复。勾选“搜索子目录”会同时遍历下级目录。正常链接保持原状，同名冲突、未找到和无法识别原文件名时会列出原因；结果显示手动替换、自动修复和剩余缺图数量。原路径不可读时，用当前可读链接与用户确认的图片核对历史记录，不能确认的对应关系会跳过。独立的“链接修复”卡片、路径输入和扫描按钮已移除，最近一次操作记录保存在 `AI_Merged_Toolbox/last-missing-repair.txt`。

## 目录判定

判定“是不是文件夹”统一要求该路径能被枚举出子项（`Folder.getFiles()` 返回数组）；只能取到文件时，一律改用它的父目录。

原因是 ExtendScript 在 Windows 上对已存在的文件路径也会让 `Folder.exists` 返回 true（`Folder` 的 `exists` 在 ExtendScript 里只表示“该路径存在”，并不保证它是目录）。早期版本只用 `exists` 判断，于是把一张 `D:\...\Links\照片.jpg` 当成搜索目录：扫描文件数为 0、同目录自动修复与扫描修复一张都不恢复、`所选图片替换` 分支被跳过，界面上就表现为“点了按钮没反应”，并把图片路径写进 `AI_Merged_Toolbox/config_v1.txt` 的 `lastFolder`。

选择窗口支持浏览和多选文件夹、图片。“打开”确认选中的图片或输入的文件名；选中文件夹时进入该目录。“选择”接受当前选中的文件夹或图片，未选中项目时接受当前目录。Windows 确认结果通过 [IFileOpenDialog.GetResults](https://learn.microsoft.com/windows/win32/api/shobjidl_core/nf-shobjidl_core-ifileopendialog-getresults) 读取。

“替换图片”先记住 Illustrator 当前选中的链接图片、缺失链接图片和嵌入图片，再打开同一个 Windows 原生选择窗口。已有链接会换成新选文件，保留所在组、剪切关系和叠放位置。新图片准备完成后才移除旧图片，避免 Illustrator 29.5 原生重连的撤销只恢复文件、不恢复缩放的问题。目标按画面从上到下、从左到右排列，来源按文件名自然排序，逐张替换且不要求名称相同，沿用原位置、高度、旋转和镜像方向。链接图片按新文件原始比例等比缩放。来源多出的部分忽略；不足时只替换前面的图片，提示“照片选少了”，末尾原图保持不变。

`native/BatchSourcePicker-1.0.4.exe` 是随扩展安装的本地选择器；窗口由 Windows 绘制，并通过内嵌清单启用 PerMonitorV2 高分屏适配，避免窗口和缩略图被整体拉伸。其源码为 `native/BatchSourcePicker.cs`，清单为 `native/BatchSourcePicker.manifest`，可在仓库根目录运行 `Build-Native-Picker.ps1` 重新编译，使用 Windows 自带的 .NET Framework 编译器。

三页浏览器静态渲染截图位于仓库的 `artifacts/phase-1-ui/`。

## 验收范围

1.1.9 移除可选缩放基准并统一从中心缩放；尺寸页只保留锁定比例、缩放描边和尺寸设置。按使用者要求，Illustrator 实际缩放由使用者验收。

1.1.8 将“链接修复”移入“缺图修复”，并移除独立面板；文件、文件夹选择和递归搜索由同一操作承接。静态语法、动作映射和安装包核验完成后，Illustrator 内实际选图、重链接和覆盖保存由使用者验收。

1.1.7 修复目录判定（图片文件不再被当成文件夹），并把宿主派发改为 `createHostRequest()`（CEP 模式在同一引擎内 `eval`，不再发 BridgeTalk）。已完成：脚本语法校验、插件与独立脚本一致性核对、安装后逐文件哈希核对，以及在 Illustrator 2025 29.5.0 上经 COM `DoJavaScript` 的启动预检（引导 OK / `getState()` 版本 1.1.7 / `api.invoke("size-read")` 派发往返正常 / 全程不修改文档）。替换与扫描修复的界面操作由使用者验收。

1.1.6 仅完成原生选择器编译、脚本语法、共享业务代码一致性和安装文件核对；“打开”确认后替换及同目录修复的实际文档操作由使用者测试。

1.1.5 的文件夹选择仅完成语法、脚本与插件业务代码一致性及安装文件核对；窗口显示、选择、取消等实际操作由使用者测试。

1.1.4 的扫描修复仅完成语法、脚本与插件代码一致性、部署文件核对；没有执行 Illustrator 功能测试，完整操作由使用者验收。

1.1.3 的图片替换后台已在 Illustrator 2025 29.5.0 的独立临时文档中验证：已有链接配对替换、比例、旋转、镜像、剪切组、中心、高度、未选中图片及来源不足处理通过；一次 Illustrator 撤销可恢复旧链接和完整变换。复现命令：`powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\relink-existing-links.ps1`，需要 Illustrator 2025 已运行。测试结束会关闭自己的临时文档并恢复原活动文档。

面板内点击、Windows 原生选择窗口的完整操作，以及其他页面和保存功能仍待界面验收。
