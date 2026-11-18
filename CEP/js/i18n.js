(function () {
    "use strict";

    var translations = {
        panelTitle: { zh: "ArtPilot 灵绘", en: "ArtPilot Linghui" },
        connecting: { zh: "正在连接 Illustrator…", en: "Connecting to Illustrator…" },
        retry: { zh: "重试", en: "Retry" },
        features: { zh: "灵绘功能", en: "Linghui tools" },
        sizeTab: { zh: "尺寸与链接", en: "Size & Links" },
        compressTab: { zh: "无损压缩", en: "Lossless Compression" },
        uniformSize: { zh: "统一尺寸", en: "Resize" },
        width: { zh: "宽度", en: "Width" },
        height: { zh: "高度", en: "Height" },
        unit: { zh: "尺寸单位", en: "Size unit" },
        chooseFolder: { zh: "选择文件夹", en: "Select folder" },
        chooseFile: { zh: "选择文件", en: "Select file" },
        allFiles: { zh: "所有文件", en: "All files" },
        select: { zh: "选择", en: "Select" },
        keepRatio: { zh: "锁定比例", en: "Keep aspect ratio" },
        scaleStroke: { zh: "缩放描边", en: "Scale strokes" },
        sizeHeight: { zh: "高度", en: "Height" },
        sizeWidth: { zh: "宽度", en: "Width" },
        sizeBoth: { zh: "高宽", en: "Width & Height" },
        quickActions: { zh: "快捷操作", en: "Quick Actions" },
        batchRepair: { zh: "缺图修复", en: "Repair Missing Links" },
        swapLinks: { zh: "互换链接", en: "Swap Links" },
        replaceImages: { zh: "替换图片", en: "Replace Images" },
        checkUpdates: { zh: "检查更新", en: "Check for Updates" },
        searchSubfolders: { zh: "搜索子目录", en: "Search Subfolders" },
        toggleLanguage: { zh: "切换语言", en: "Switch Language" },
        saveActions: { zh: "保存操作", en: "Save" },
        optimizeSave: { zh: "优化另存", en: "Save Optimized Copy" },
        overwriteSave: { zh: "覆盖保存", en: "Optimize & Overwrite" },
        optimizationSettings: { zh: "优化设置", en: "Optimization Settings" },
        preservePdf: { zh: "保留 PDF 兼容数据", en: "Preserve PDF Compatibility" },
        keepLinked: { zh: "保持图片为链接", en: "Keep Images Linked" },
        fileCompression: { zh: "开启 Illustrator 文件数据压缩", en: "Compress Illustrator File Data" },
        embedIcc: { zh: "嵌入 ICC 色彩配置", en: "Embed ICC Profile" },
        fileScan: { zh: "文件扫描", en: "File Scan" },
        notScanned: { zh: "未扫描", en: "Not scanned" },
        scanFile: { zh: "扫描文件", en: "Scan File" },
        author: { zh: "作者：Ronnie Jiao", en: "Author: Ronnie Jiao" },
        githubTitle: { zh: "GitHub 项目主页", en: "ArtPilot on GitHub" },
        githubAria: { zh: "打开 ArtPilot 的 GitHub 项目主页", en: "Open the ArtPilot GitHub project page" },
        updateFailed: { zh: "连接更新服务失败，请检查网络或稍后重试。", en: "Could not reach the update service. Check your connection and try again." },
        updateCurrent: { zh: "灵绘已是最新版本（{version}）。", en: "Linghui is up to date ({version})." },
        updateAhead: { zh: "当前版本（{current}）高于更新服务器所列版本（{latest}）。", en: "The installed version ({current}) is newer than the version listed by the update server ({latest})." },
        updatePrompt: { zh: "发现灵绘新版本 {version}。\n下载后解压并运行安装脚本即可更新。\n\n现在打开下载包？", en: "Linghui {version} is available.\nExtract the download and run the installer script to update.\n\nOpen the download now?" },
        connectingFailed: { zh: "连接 Illustrator 失败，请重试。", en: "Could not connect to Illustrator. Try again." },
        loadingFailed: { zh: "灵绘功能加载失败，请重试。", en: "Linghui could not load. Try again." },
        swapComplete: { zh: "互换完成：{first} ⇄ {second}；可按 Ctrl+Z 撤回。", en: "Swapped: {first} ⇄ {second}. Press Ctrl+Z to undo." },
        swapMissingComplete: { zh: "互换完成（含缺图）：{first} ⇄ {second}；正常图片已移至缺图位置，缺失链接仍需修复；可按 Ctrl+Z 撤回。", en: "Swapped, including the missing link: {first} ⇄ {second}. The available image moved to the missing image's position; relink the missing file separately. Press Ctrl+Z to undo." },
        checking: { zh: "检查中…", en: "Checking…" },
        swapping: { zh: "正在互换…", en: "Swapping…" }
    };

    var messagePairs = [
        ["Illustrator 宿主未返回操作结果，请重新打开灵绘面板后重试。", "Illustrator returned no result. Reopen the Linghui panel and try again."],
        ["无法取得 Illustrator 操作结果，请重新打开灵绘面板。", "Could not get a result from Illustrator. Reopen the Linghui panel and try again."],
        ["Illustrator 功能尚未连接，请重新打开灵绘面板后重试。", "Illustrator is not connected. Reopen the Linghui panel and try again."],
        ["Illustrator 通信失败，请重新打开灵绘面板后重试。", "Communication with Illustrator failed. Reopen the Linghui panel and try again."],
        ["没有取得图片互换的完成结果，请重新打开灵绘面板后重试。", "No swap result was returned. Reopen the Linghui panel and try again."],
        ["Illustrator 未返回修复详情。", "Illustrator returned no repair details."],
        ["无法连接 Illustrator，请重新加载。", "Could not connect to Illustrator. Reload the panel."],
        ["Illustrator 尚未就绪，请重试。", "Illustrator is not ready. Try again."],
        ["Illustrator 未响应，请重试。", "Illustrator did not respond. Try again."],
        ["连接 Illustrator 失败，请重试。", "Could not connect to Illustrator. Try again."],
        ["灵绘连接失败，请重试。", "Linghui connection failed. Try again."],
        ["灵绘功能加载失败，请重试。", "Linghui could not load. Try again."],
        ["灵绘加载失败，请重试。", "Linghui failed to load. Try again."],
        ["灵绘文件加载失败，请重新加载。", "Linghui files failed to load. Reload the panel."],
        ["灵绘运行出错，请重试。", "Linghui encountered an error. Try again."],
        ["连接 Illustrator 超时，请重试。", "The connection to Illustrator timed out. Try again."],
        ["正在打开 Windows 选择窗口…", "Opening the Windows file picker…"],
        ["正在执行…", "Working…"],
        ["正在互换…", "Swapping…"],
        ["检查更新", "Check for Updates"],
        ["检查中…", "Checking…"],
        ["关闭灵绘面板。", "Close the Linghui panel."],
        ["把选中对象调整为统一宽度，可按比例缩放。", "Set the selected objects to one width, optionally preserving their proportions."],
        ["把选中对象调整为统一高度，可按比例缩放。", "Set the selected objects to one height, optionally preserving their proportions."],
        ["按填写的宽度和高度调整所有选中对象。", "Set all selected objects to the entered width and height."],
        ["选择图片或文件夹，替换选中图片并按文件名修复文档中的缺失图片。", "Choose images or a folder to replace selected images and repair missing links by filename."],
        ["互换链接或嵌入图片；缺失链接也可参与互换。", "Swap linked or embedded images. Missing links can also be swapped."],
        ["将选中的已有链接重新链接到新选图片，按画面顺序逐张替换，保留中心、高度和旋转。", "Relink the selected images to new files in canvas order while preserving their centers, heights, and rotation."],
        ["查询灵绘更新服务器上的最新版本。", "Check the update server for the latest Linghui version."],
        ["扫描当前 AI 文件大小、画板及链接资源。", "Scan the current AI file size, artboards, and linked assets."],
        ["按当前设置优化并另存为新 AI 文件。", "Optimize the current document settings and save to a new AI file."],
        ["按当前设置优化并覆盖保存当前 AI 文件。", "Optimize the current document settings and overwrite the current AI file."],
        ["无法取得当前文件位置。", "Could not get the current file location."],
        ["没有取得当前文件位置。", "No current file location was returned."],
        ["读取当前文件位置失败。", "Could not read the current file location."],
        ["无损优化完成：", "Lossless optimization complete: "],
        ["缺图修复结束，部分操作未完成。", "Missing-link repair finished with incomplete operations."],
        ["缺图修复完成。", "Missing-link repair complete."],
        ["缺图修复失败：", "Missing-link repair failed: "],
        ["缺图修复没有完成：", "Missing-link repair did not complete: "],
        ["缺图修复：所选替换 ", "Missing-link repair: replaced "],
        ["；自动修复 ", "; automatically relinked "],
        [" 张；仍缺失 ", "; still missing "],
        [" 张。", " images."],
        ["所选图片替换：", "Selected image replacements: "],
        ["自动修复：", "Automatically relinked: "],
        ["仍缺失：", "Still missing: "],
        ["搜索子目录：", "Search subfolders: "],
        ["无法访问的来源：", "Inaccessible sources:"],
        ["无法访问的目录：", "Inaccessible folders:"],
        ["【未找到同名文件】", "[No matching file found]"],
        ["【同名冲突，已跳过】", "[Duplicate names; skipped]"],
        ["【无法识别原文件名，已跳过】", "[Original filename could not be identified; skipped]"],
        ["【重新链接错误】", "[Relink errors]"],
        ["【所选图片替换失败】", "[Selected image replacement failed]"],
        ["本次按原文件名修复缺失链接。", "This run searched for missing links by their original filenames."],
        ["图片若在下级文件夹，请勾选“搜索子目录”后重新运行缺图修复。", "If images are in nested folders, enable Search Subfolders and run repair again."],
        ["这些链接无法读取原路径，历史记录可能已过期。请手动保存文档后重试，或用“替换图片”指定新文件。", "The original paths for these links could not be read; their history may have expired. Save the document and try again, or use Replace Images to choose new files."],
        ["历史记录无法与当前图片确认对应；可用“替换图片”指定新文件。", "The history could not be matched to the current images. Use Replace Images to choose new files."],
        ["没有完成所选图片的替换。", "The selected image was not replaced."],
        ["所选图片中有锁定、隐藏或不可编辑的对象。", "The selection contains locked, hidden, or non-editable objects."],
        ["图片互换失败（", "Image swap failed ("],
        ["直接移动失败（", "Direct move failed ("],
        ["）；保留原嵌入/链接状态的图片副本也无法放入目标位置（", "); a copy preserving its linked or embedded state also could not be placed at the target ("],
        ["互换图片准备失败：", "Could not prepare the image swap: "],
        ["互换图片提交失败：", "Could not apply the image swap: "],
        ["无法读取其中一张图片的链接路径。", "Could not read the link path for one of the images."],
        ["其中一张图片的原链接文件已经丢失。", "The original linked file for one of the images is missing."],
        ["无法读取两张图片的当前高度。", "Could not read the current height of both images."],
        ["无法读取其中一张原图片的自然宽高比。", "Could not read the original aspect ratio of one of the images."],
        ["没有可用于替换的来源图片。", "No source images are available for replacement."],
        ["已收到 ", "Received "],
        [" 个来源，但当前只选择了 ", " source(s), but only "],
        [" 张图片。", " image(s) are selected."],
        ["文件夹或文件中没有找到支持的图片。", "No supported images were found in the folder or files."],
        ["未知优化操作。", "Unknown optimization operation."],
        ["无法取得当前文件位置：", "Could not get the current file location: "],
        ["无法取得保存位置：", "Could not get the save location: "],
        ["打开选择窗口失败。", "Could not open the file picker."],
        ["当前文档没有缺失链接。", "There are no missing links in the current document."],
        ["当前存在缺失链接，建议先到“链接”页签恢复。", "Missing links were found. Repair them from the Size & Links tab first."],
        ["检测到嵌入位图；本功能不会擅自删除或转链接。", "Embedded raster images were found. Optimization will not remove or convert them to links."],
        ["当前模式：保留 PDF 兼容数据（体积可能仍较大）", "Current mode: Preserve PDF Compatibility (the file may remain larger)."],
        ["当前模式：最大无损瘦身（关闭 PDF 兼容数据）", "Current mode: Maximum lossless reduction (PDF compatibility is off)."],
        ["AI 文件大小：", "AI file size: "],
        ["画板：", "Artboards: "],
        ["链接图片：", "Linked images: "],
        ["缺失链接：", "Missing links: "],
        ["嵌入位图：", "Embedded raster images: "],
        ["可读取的链接源文件总大小：", "Total size of readable linked source files: "],
        ["优化完成。", "Optimization complete."],
        ["优化前：", "Before: "],
        ["优化后：", "After: "],
        ["减少：", "Reduced by: "],
        ["缩减：", "Reduction: "],
        ["保存到：", "Saved to:"],
        ["脚本执行失败：", "Script failed:"],
        ["尺寸操作失败。", "Resize operation failed."],
        ["统一替换链接失败。", "Batch relinking failed."],
        ["无损优化执行失败。", "Lossless optimization failed."],
        ["脚本执行失败：\n", "Script failed:\n"],
        ["正在处理尺寸…", "Resizing…"],
        ["已取消替换图片。", "Image replacement canceled."],
        ["已取消缺图修复。", "Missing-link repair canceled."],
        ["所选文件夹或文件中没有找到支持的图片。", "No supported images were found in the selected folder or files."],
        ["选择来源失败：", "Could not choose a source: "],
        ["读取来源失败：", "Could not read the source: "],
        ["打开选择窗口失败：", "Could not open the file picker: "],
        ["Windows 选择窗口执行失败。", "The Windows file picker failed."],
        ["Windows 选择窗口尚未加载，请重新打开灵绘面板。", "The Windows file picker is not loaded. Reopen the Linghui panel."],
        ["Windows 选择窗口没有返回有效结果。", "The Windows file picker returned no valid result."],
        ["Windows 选择窗口已退出，但没有取得选择结果。", "The Windows file picker closed without returning a selection."],
        ["选择窗口请求不完整。", "The file picker request is incomplete."],
        ["没有取得已确认的图片，请重新选择。", "No confirmed images were selected. Please select again."],
        ["Windows 选择窗口接口未连接，请重新打开灵绘面板。", "The Windows file picker is unavailable. Reopen the Linghui panel."],
        ["系统选择窗口接口未连接，请重新打开灵绘面板。", "The system file picker is unavailable. Reopen the Linghui panel."],
        ["系统选择窗口不可用，请重新打开灵绘面板。", "The system file picker is unavailable. Reopen the Linghui panel."],
        ["无法打开系统选择窗口（", "Could not open the system file picker ("],
        ["无法打开 Windows 选择窗口（", "Could not open the Windows file picker ("],
        ["系统选择窗口未返回有效路径。", "The system file picker returned no valid path."],
        ["无法创建选择窗口的结果目录。", "Could not create the file picker result folder."],
        ["选择窗口的结果目录不可用。", "The file picker result folder is unavailable."],
        ["Illustrator 操作失败。", "Illustrator operation failed."],
        ["Illustrator 没有返回操作结果，请重试。", "Illustrator returned no operation result. Try again."],
        ["Illustrator 请求发送失败，请重试。", "Could not send the request to Illustrator. Try again."],
        ["请等待当前操作完成。", "Wait for the current operation to finish."],
        ["请先打开 Illustrator 文档。", "Open an Illustrator document first."],
        ["请先打开需要修复链接的 Illustrator 文档。", "Open the Illustrator document whose links you want to repair."],
        ["请先打开需要优化的 Illustrator 文档。", "Open the Illustrator document you want to optimize."],
        ["请先打开需要覆盖保存的 Illustrator 文档。", "Open the Illustrator document you want to overwrite."],
        ["请先选择一个或多个对象。", "Select one or more objects first."],
        ["请先选择两张图片，可以是链接图片或嵌入图片。", "Select two images first. They can be linked or embedded."],
        ["请先选择一个或多个链接图片。", "Select one or more linked images first."],
        ["请先在 Illustrator 中选中要替换的图片。", "Select the images to replace in Illustrator first."],
        ["请先选择要替换的链接图片；缺失链接也可以选择。", "Select the linked images to replace first. Missing links can also be selected."],
        ["没有可处理的对象。", "No eligible objects were found."],
        ["没有对象被处理。", "No objects were processed."],
        ["至少需要两个可处理对象。", "At least two eligible objects are required."],
        ["当前文档没有外部链接；嵌入图片不需要修复链接。", "The current document has no external links. Embedded images do not need relinking."],
        ["当前选择中没有可替换的链接图片。", "The current selection has no replaceable linked images."],
        ["当前选择中没有成功替换的链接图片。", "No selected linked images were replaced."],
        ["所选替换文件不存在。", "The selected replacement file does not exist."],
        ["无法读取所选新图片的原始宽高比。", "Could not read the original aspect ratio of the selected image."],
        ["原选区已失效，请重新选择要替换的图片。", "The original selection is no longer available. Select the images again."],
        ["原文档已关闭，请重新选择要替换的图片。", "The original document is closed. Select the images again."],
        ["原选区已失效，请重新选择图片。", "The original selection is no longer available. Select the images again."],
        ["原文档已关闭，请重新选择图片。", "The original document is closed. Select the images again."],
        ["请先选择要替换的图片。", "Select the images to replace first."],
        ["没有取得可用的文件夹或图片，请重新选择。", "No usable folder or images were selected. Choose them again."],
        ["搜索路径不存在或无法访问：", "The search path does not exist or is inaccessible: "],
        ["当前文档尚未保存，请使用“优化另存”。", "The current document has not been saved. Use Save Optimized Copy."],
        ["当前文档尚未保存，请先保存文档后再使用“覆盖保存”。", "Save the current document before using Optimize & Overwrite."],
        ["当前文档已变化，已取消覆盖保存，请重新点击“覆盖保存”。", "The document changed, so overwrite was canceled. Click Optimize & Overwrite again."],
        ["没有指定保存路径。", "No save path was specified."],
        ["保存位置必须是 .ai 文件。", "The save location must be an .ai file."],
        ["Illustrator 未生成保存文件，请检查保存位置。", "Illustrator did not create the saved file. Check the save location."],
        ["为了保护原稿，不能直接覆盖当前 AI 文件。请使用不同文件名，例如：_优化后.ai", "To protect the original, the current AI file cannot be overwritten directly. Save with a different name, such as _optimized.ai."],
        ["当前 AI 文件不存在，无法覆盖保存。", "The current AI file does not exist and cannot be overwritten."],
        ["当前文档不是 AI 文件，请使用“优化另存”。", "The current document is not an AI file. Use Save Optimized Copy."],
        ["已取消覆盖保存。", "Overwrite canceled."],
        ["已确认覆盖保存，正在开始无损优化…", "Overwrite confirmed. Starting lossless optimization…"],
        ["已选择保存位置，正在开始无损优化…", "Save location selected. Starting lossless optimization…"],
        ["正在读取当前文件位置…", "Reading the current file location…"],
        ["正在打开另存为窗口…", "Opening the Save As dialog…"],
        ["打开另存为窗口失败。", "Could not open the Save As dialog."],
        ["没有选择保存位置。", "No save location was selected."],
        ["已切换为 Adobe 兼容优先：会保留 PDF 兼容数据，文件可能明显更大。", "Switched to Adobe compatibility: PDF compatibility data will be kept, which may increase file size."],
        ["已切换为最大无损瘦身：关闭 PDF 兼容数据。", "Switched to maximum lossless reduction: PDF compatibility data is off."],
        ["正在处理…", "Working…"],
        ["完成：", "Completed: "],
        ["未知尺寸操作。", "Unknown resize operation."],
        ["操作结果更新失败：", "Could not update the operation result: "],
        ["宿主脚本不存在：", "Host script not found: "],
        ["宿主接口未注册", "Host API is not registered"],
        ["宿主返回了非文本状态", "The host returned a non-text status"],
        ["宿主返回了无效状态", "The host returned an invalid status"],
        ["面板与后台版本不一致", "The panel and host versions do not match"],
        ["未知设置项", "Unknown setting"],
        ["操作不可用", "Operation is unavailable"],
        ["操作入口未注册", "Operation handler is not registered"]
    ];

    var locale = "zh";
    try {
        if (window.localStorage.getItem("artpilot-linghui-language") === "en") locale = "en";
    } catch (storageError) {}

    function t(key) {
        var item = translations[key];
        return item ? (item[locale] || item.zh) : key;
    }

    function format(key, values) {
        return t(key).replace(/\{([a-zA-Z0-9_]+)\}/g, function (match, name) {
            return values && values[name] !== undefined ? String(values[name]) : match;
        });
    }

    function apply(root) {
        root = root || document;
        document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
        document.title = t("panelTitle");
        Array.prototype.forEach.call(root.querySelectorAll("[data-i18n]"), function (element) {
            element.textContent = t(element.getAttribute("data-i18n"));
        });
        [
            ["data-i18n-aria-label", "aria-label"],
            ["data-i18n-title", "title"],
            ["data-i18n-placeholder", "placeholder"]
        ].forEach(function (pair) {
            Array.prototype.forEach.call(root.querySelectorAll("[" + pair[0] + "]"), function (element) {
                element.setAttribute(pair[1], t(element.getAttribute(pair[0])));
            });
        });
    }

    function translateMessage(value) {
        var output = String(value === undefined || value === null ? "" : value);
        if (locale !== "en") return output;

        var missingRepair = output.match(/^缺图修复：所选替换\s*([0-9]+) 张；自动修复\s*([0-9]+) 张；仍缺失\s*([0-9]+) 张。$/);
        if (missingRepair) {
            function imageCount(count) { return count + " " + (count === "1" ? "image" : "images"); }
            return "Missing-link repair: replaced " + imageCount(missingRepair[1]) +
                "; automatically relinked " + imageCount(missingRepair[2]) +
                "; still missing " + imageCount(missingRepair[3]) + ".";
        }

        var optimized = output.match(/^无损优化完成：(.+?) → (.+)$/);
        if (optimized) return "Lossless optimization complete: " + optimized[1] + " → " + optimized[2];

        var completed = output.match(/^完成：([0-9]+) 个对象(?:；跳过 ([0-9]+) 个)?$/);
        if (completed) {
            return "Completed: " + completed[1] + " object(s)" + (completed[2] ? "; skipped " + completed[2] : "");
        }

        var countLabels = {
            "所选图片替换": "Selected image replacements",
            "自动修复": "Automatically relinked",
            "仍缺失": "Still missing"
        };
        output = output.replace(/(所选图片替换|自动修复|仍缺失)：\s*([0-9]+) 张/g, function (match, label, count) {
            return countLabels[label] + ": " + count + " " + (count === "1" ? "image" : "images");
        });
        output = output.replace(/搜索子目录：是/g, "Search subfolders: Yes")
            .replace(/搜索子目录：否/g, "Search subfolders: No");

        var exact = {
            "未扫描": "Not scanned",
            "扫描完成。": "Scan complete.",
            "就绪。": "Ready.",
            "未找到支持的图片。": "No supported images found.",
            "没有找到支持的图片。": "No supported images found.",
            "所选文件夹或文件中没有找到支持的图片。": "No supported images were found in the selected folder or files."
        };
        if (exact[output]) return exact[output];

        messagePairs.forEach(function (pair) {
            if (output.indexOf(pair[0]) !== -1) output = output.split(pair[0]).join(pair[1]);
        });

        output = output.replace(/\n{3,}/g, "\n\n");
        return output;
    }

    function setLanguage(nextLocale) {
        locale = nextLocale === "en" ? "en" : "zh";
        try { window.localStorage.setItem("artpilot-linghui-language", locale); } catch (storageError) {}
        apply(document);
        try { window.dispatchEvent(new Event("linghui-language-change")); } catch (eventError) {}
    }

    window.ArtPilotI18n = {
        t: t,
        format: format,
        apply: apply,
        translateMessage: translateMessage,
        getLanguage: function () { return locale; },
        setLanguage: setLanguage,
        toggleLanguage: function () { setLanguage(locale === "en" ? "zh" : "en"); }
    };

    apply(document);
}());
