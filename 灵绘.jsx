#target illustrator
#targetengine "AI_MERGED_TOOLBOX"

/*
    灵绘 独立脚本 1.1.18
    合并自：
    1) 自动恢复缺失链接 v5
    2) AI 统一尺寸面板
    3) AI 统一尺寸面板 V2
    4) AI 文件无损压缩 / 瘦身

    功能：
    - 常驻 ScriptUI 浮动面板
    - W / H / W+H 统一尺寸
    - 锁定比例 / 缩放描边
    - 读取首个对象 W/H
    - 固定从中心缩放
    - 缺图修复 / 互换链接 / 替换图片
    - 按画面顺序替换已有链接、缺失链接与嵌入图片，保留位置、比例、旋转与剪切组
    - 两张链接或嵌入图片互换：保持各位置原高度、旋转和所在组
    - 按当前图片路径和 XMP 历史记录自动恢复缺失链接
    - Windows 使用现代资源管理器式文件/文件夹选择器
    - 记住上次图片来源目录与“搜索子文件夹”设置
    - 扫描 AI 文件大小、链接、缺失链接与嵌入位图
    - 无损另存 / 覆盖保存：关闭 PDF 兼容 / 不嵌入链接 / 开启数据压缩 / 可嵌入 ICC
*/

(function () {
    var KEY = "__AI_MERGED_TOOLBOX__";
    var AUTO_START_CLOSED_KEY = "__AI_MERGED_TOOLBOX_AUTOSTART_CLOSED__";
    var CEP_MODE = false;
    var nativeBatchPickerFile = new File(new File($.fileName).parent.fsName + "/CEP/native/BatchSourcePicker-1.0.4.exe");
    if (!nativeBatchPickerFile.exists) {
        nativeBatchPickerFile = new File(Folder.userData.fsName +
            "/Adobe/CEP/extensions/com.ronniejiao.linghui/native/BatchSourcePicker-1.0.4.exe");
    }

    // 每次重新运行脚本时都重建面板。
    // 这样以后只需要用同名 灵绘.jsx 覆盖旧文件，再运行一次即可刷新。
    try {
        if ($.global[KEY]) {
            try { $.global[KEY].close(); } catch (e0) {}
            $.global[KEY] = null;
        }
    } catch (e1) {}

    // ---------------------------------------------------------
    // 配置
    // ---------------------------------------------------------
    var cfgFolder = new Folder(Folder.userData.fsName + "/AI_Merged_Toolbox");
    var cfgFile = new File(cfgFolder.fsName + "/config_v1.txt");
    var cfg = loadConfig();

    // ---------------------------------------------------------
    // 主窗口
    // ---------------------------------------------------------
    var win = new Window("palette", "灵绘 1.1.18", undefined, {
        resizeable: true,
        closeButton: true
    });
    $.global[KEY] = win;

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 10;

    var tabs = win.add("tabbedpanel");
    tabs.alignChildren = ["fill", "fill"];
    tabs.alignment = ["fill", "fill"];
    tabs.preferredSize = [390, 330];

    // =========================================================
    // TAB 1：尺寸
    // =========================================================
    var sizeTab = tabs.add("tab", undefined, "尺寸");
    sizeTab.helpTip = "设置选中对象的宽度和高度，固定从中心缩放。";
    sizeTab.orientation = "column";
    sizeTab.alignChildren = ["fill", "top"];
    sizeTab.spacing = 8;
    sizeTab.margins = 10;

    var sizePanel = sizeTab.add("panel", undefined, "统一尺寸");
    sizePanel.helpTip = "填写目标宽度、高度和单位。";
    sizePanel.orientation = "column";
    sizePanel.alignChildren = ["fill", "top"];
    sizePanel.margins = 10;
    sizePanel.spacing = 7;

    var sizeRow = sizePanel.add("group");
    sizeRow.orientation = "row";
    sizeRow.alignChildren = ["center", "center"];

    var wLabel = sizeRow.add("statictext", undefined, "W");
    wLabel.helpTip = "目标宽度。";
    var wInput = sizeRow.add("edittext", undefined, "30");
    wInput.characters = 8;
    wInput.helpTip = "输入目标宽度；单位使用右侧菜单。";

    var hLabel = sizeRow.add("statictext", undefined, "H");
    hLabel.helpTip = "目标高度。";
    var hInput = sizeRow.add("edittext", undefined, "30");
    hInput.characters = 8;
    hInput.helpTip = "输入目标高度；单位使用右侧菜单。";

    var unitDropdown = sizeRow.add("dropdownlist", undefined, ["mm", "cm", "px", "pt", "in"]);
    unitDropdown.selection = 0;
    unitDropdown.preferredSize.width = 74;
    unitDropdown.helpTip = "选择宽度和高度使用的单位。";

    var optionRow = sizePanel.add("group");
    optionRow.orientation = "row";

    var keepRatio = optionRow.add("checkbox", undefined, "锁定比例");
    keepRatio.value = true;
    keepRatio.helpTip = "统一宽度或高度时保持对象原比例。";

    var scaleStroke = optionRow.add("checkbox", undefined, "缩放描边");
    scaleStroke.value = false;
    scaleStroke.helpTip = "缩放对象时同步缩放描边粗细。";

    var applyRow = sizePanel.add("group");
    applyRow.orientation = "row";

    var setHBtn = applyRow.add("button", undefined, "高度");
    var setWBtn = applyRow.add("button", undefined, "宽度");
    var setWHBtn = applyRow.add("button", undefined, "高宽");
    setWBtn.preferredSize.width = 98;
    setHBtn.preferredSize.width = 98;
    setWHBtn.preferredSize.width = 98;
    setWBtn.helpTip = "统一选中对象的宽度；勾选锁定比例时会等比缩放。";
    setHBtn.helpTip = "统一选中对象的高度；勾选锁定比例时会等比缩放。";
    setWHBtn.helpTip = "分别按输入的宽度和高度调整选中对象。";

    // =========================================================
    // TAB 2：链接
    // =========================================================
    var linkTab = tabs.add("tab", undefined, "链接");
    linkTab.helpTip = "替换、互换或恢复文档中的链接图片。";
    linkTab.orientation = "column";
    linkTab.alignChildren = ["fill", "top"];
    linkTab.spacing = 8;
    linkTab.margins = 10;

    var linkActionPanel = linkTab.add("panel", undefined, "快捷操作");
    linkActionPanel.helpTip = "替换、批量处理或互换选中的链接图片。";
    linkActionPanel.orientation = "column";
    linkActionPanel.alignChildren = ["fill", "top"];
    linkActionPanel.margins = 10;
    linkActionPanel.spacing = 7;

    var linkActionGrid = linkActionPanel.add("group");
    linkActionGrid.orientation = "row";
    linkActionGrid.alignChildren = ["fill", "top"];
    linkActionGrid.spacing = 8;

    var linkActionLeft = linkActionGrid.add("group");
    linkActionLeft.orientation = "column";
    linkActionLeft.alignChildren = ["fill", "top"];
    linkActionLeft.spacing = 7;

    var linkActionRight = linkActionGrid.add("group");
    linkActionRight.orientation = "column";
    linkActionRight.alignChildren = ["fill", "top"];
    linkActionRight.spacing = 7;

    var swapLinksBtn = linkActionLeft.add("button", undefined, "互换链接");
    var batchReplaceBtn = linkActionRight.add("button", undefined, "缺图修复");
    var pictureReplaceBtn = linkActionLeft.add("button", undefined, "替换图片");
    swapLinksBtn.preferredSize.height = 30;
    batchReplaceBtn.preferredSize.height = 30;
    pictureReplaceBtn.preferredSize.height = 30;
    batchReplaceBtn.helpTip = "选择图片或文件夹，替换选中图片并按文件名修复文档中的缺失图片。";
    swapLinksBtn.helpTip = "互换两张链接或嵌入图片，保留各位置的高度、旋转和所在组。";
    pictureReplaceBtn.helpTip = "按画面顺序替换选中的图片，不要求文件名相同。";

    var recursiveCb = linkActionPanel.add("checkbox", undefined, "搜索子目录");
    recursiveCb.value = (cfg.recursive === "1");
    recursiveCb.helpTip = "勾选后，同时搜索选择的文件夹及其子文件夹中的缺失图片。";

    var reportPanel = linkTab.add("panel", undefined, "执行结果");
    reportPanel.helpTip = "查看缺图修复及图片替换操作的结果详情。";
    reportPanel.orientation = "column";
    reportPanel.alignChildren = ["fill", "fill"];
    reportPanel.margins = 8;

    var reportBox = reportPanel.add(
        "edittext",
        undefined,
        "尚未执行。",
        { multiline: true, scrolling: true, readonly: true }
    );
    reportBox.preferredSize = [320, 72];
    reportBox.alignment = ["fill", "fill"];
    reportBox.helpTip = "显示缺图修复和替换操作的详细结果。";
    reportPanel.alignment = ["fill", "fill"];

    // =========================================================
    // TAB 3：无损压缩
    // =========================================================
    var optimizeTab = tabs.add("tab", undefined, "无损压缩");
    optimizeTab.helpTip = "扫描并无损优化当前 Illustrator 文件。";
    optimizeTab.orientation = "column";
    optimizeTab.alignChildren = ["fill", "top"];
    optimizeTab.spacing = 8;
    optimizeTab.margins = 10;

    var optimizeActionPanel = optimizeTab.add("panel", undefined, "保存操作");
    optimizeActionPanel.helpTip = "选择另存为新文件，或覆盖当前文件。";
    optimizeActionPanel.orientation = "column";
    optimizeActionPanel.alignChildren = ["fill", "top"];
    optimizeActionPanel.margins = 10;
    optimizeActionPanel.spacing = 7;

    var optimizeSaveBtn = optimizeActionPanel.add("button", undefined, "优化另存");
    optimizeSaveBtn.preferredSize.height = 32;
    optimizeSaveBtn.helpTip = "按当前优化设置处理文档，并另存为一个新文件。";

    var optimizeOverwriteBtn = optimizeActionPanel.add("button", undefined, "覆盖保存");
    optimizeOverwriteBtn.preferredSize.height = 32;
    optimizeOverwriteBtn.helpTip = "按当前优化设置处理文档，并覆盖保存当前 AI 文件。";

    // =========================================================
    var optimizePanel = optimizeTab.add("panel", undefined, "优化设置");
    optimizePanel.helpTip = "选择保存优化文件时使用的兼容和色彩设置。";
    optimizePanel.orientation = "column";
    optimizePanel.alignChildren = ["fill", "top"];
    optimizePanel.margins = 10;
    optimizePanel.spacing = 6;

    var pdfCompatCb = optimizePanel.add(
        "checkbox",
        undefined,
        "保留 PDF 兼容数据"
    );
    pdfCompatCb.value = false;
    pdfCompatCb.helpTip = "勾选可保留 PDF 兼容内容；取消通常能减小文件体积。";

    var keepLinksCb = optimizePanel.add(
        "checkbox",
        undefined,
        "保持图片为链接"
    );
    keepLinksCb.value = true;
    keepLinksCb.enabled = false;
    keepLinksCb.helpTip = "优化保存时保持置入图片为外部链接。";

    var compressDataCb = optimizePanel.add(
        "checkbox",
        undefined,
        "开启 Illustrator 文件数据压缩"
    );
    compressDataCb.value = true;
    compressDataCb.enabled = false;
    compressDataCb.helpTip = "保存时压缩 Illustrator 文档数据。";

    var iccCb = optimizePanel.add(
        "checkbox",
        undefined,
        "嵌入 ICC 色彩配置"
    );
    iccCb.value = true;
    iccCb.helpTip = "嵌入 ICC 色彩配置，帮助保持文档的颜色管理信息。";

    var scanPanel = optimizeTab.add("panel", undefined, "文件扫描");
    scanPanel.helpTip = "扫描当前文件大小、链接和嵌入资源信息。";
    scanPanel.orientation = "column";
    scanPanel.alignChildren = ["fill", "top"];
    scanPanel.margins = 10;
    scanPanel.spacing = 7;

    var optimizeInfo = scanPanel.add(
        "edittext",
        undefined,
        "未扫描",
        { multiline: true, scrolling: true, readonly: true }
    );
    optimizeInfo.preferredSize = [320, 66];
    optimizeInfo.alignment = ["fill", "fill"];
    optimizeInfo.helpTip = "显示当前文件大小及链接、嵌入资源的扫描信息。";

    var scanOptimizeBtn = scanPanel.add("button", undefined, "扫描文件");
    scanOptimizeBtn.preferredSize.height = 28;
    scanOptimizeBtn.helpTip = "读取当前文档大小、链接状态和嵌入位图信息。";

    // 内部状态文本：保留回调兼容，但不再显示底部状态框。
    // =========================================================
    var statusText = { text: "就绪。" };

    // 尽量沿用 Illustrator 的原生控件，只给窗口、分组卡片、输入区和主操作增加统一色阶。
    // ScriptUI 在不同 Illustrator 版本中的绘制支持略有差异；单项失败不影响面板功能。
    function tintControl(control, background, foreground) {
        try {
            var graphics = control.graphics;
            graphics.backgroundColor = graphics.newBrush(
                graphics.BrushType.SOLID_COLOR,
                background
            );
            if (foreground) {
                graphics.foregroundColor = graphics.newPen(
                    graphics.PenType.SOLID_COLOR,
                    foreground,
                    1
                );
            }
        } catch (e) {}
    }

    tintControl(win, [0.12, 0.15, 0.19]);

    var cardPanels = [
        sizePanel,
        linkActionPanel, reportPanel,
        scanPanel, optimizePanel, optimizeActionPanel
    ];
    for (var cardIndex = 0; cardIndex < cardPanels.length; cardIndex++) {
        tintControl(cardPanels[cardIndex], [0.17, 0.20, 0.24]);
    }

    var inputControls = [wInput, hInput, reportBox, optimizeInfo];
    for (var inputIndex = 0; inputIndex < inputControls.length; inputIndex++) {
        tintControl(inputControls[inputIndex], [0.10, 0.13, 0.17], [0.90, 0.93, 0.97]);
    }

    var primaryButtons = [setWHBtn, scanOptimizeBtn, optimizeOverwriteBtn];
    for (var buttonIndex = 0; buttonIndex < primaryButtons.length; buttonIndex++) {
        tintControl(primaryButtons[buttonIndex], [0.10, 0.34, 0.62], [0.96, 0.98, 1.00]);
    }

    tabs.selection = 0;

    function fitWindowToActiveTab() {
        var targetHeight = tabs.selection === linkTab ? 455 :
            (tabs.selection === optimizeTab ? 450 : 330);
        var currentHeight = Number(tabs.preferredSize[1]);

        if (!(currentHeight > 0) || currentHeight === targetHeight) return;

        var bounds = win.bounds;
        var delta = targetHeight - currentHeight;
        tabs.preferredSize = [390, targetHeight];

        try {
            win.bounds = [
                bounds[0],
                bounds[1] - delta / 2,
                bounds[2],
                bounds[3] + delta / 2
            ];
            win.layout.layout(true);
            win.layout.resize();
        } catch (e) {}
    }

    tabs.onChange = fitWindowToActiveTab;

    // ---------------------------------------------------------
    // 窗口缩放
    // ---------------------------------------------------------
    win.minimumSize = [360, 380];

    win.onResizing = win.onResize = function () {
        try {
            this.layout.resize();
        } catch (e) {}
    };

    // ---------------------------------------------------------
    // 通用：单位
    // ---------------------------------------------------------
    function toPt(v, u) {
        switch (u) {
            case "mm": return v * 72 / 25.4;
            case "cm": return v * 72 / 2.54;
            case "in": return v * 72;
            case "px":
            case "pt":
            default: return v;
        }
    }

    function fromPt(v, u) {
        switch (u) {
            case "mm": return v * 25.4 / 72;
            case "cm": return v * 2.54 / 72;
            case "in": return v / 72;
            case "px":
            case "pt":
            default: return v;
        }
    }

    function cleanNumber(v) {
        return v.toFixed(3).replace(/\.?0+$/, "");
    }

    function parseVal(input, label) {
        var n = parseFloat(String(input.text).replace(",", "."));

        if (isNaN(n) || n <= 0) {
            alert(label + " 请输入大于 0 的有效尺寸。");
            return null;
        }

        var u = unitDropdown.selection ? unitDropdown.selection.text : "mm";
        var pt = toPt(n, u);

        // Illustrator PageItem 尺寸上限附近
        if (pt > 16348) {
            alert(label + " 尺寸过大。");
            return null;
        }

        return pt;
    }

    // ---------------------------------------------------------
    // 通用：忙碌状态
    // ---------------------------------------------------------
    var actionButtons = [
        setWBtn, setHBtn, setWHBtn,
        batchReplaceBtn, swapLinksBtn, pictureReplaceBtn,
        scanOptimizeBtn, optimizeSaveBtn, optimizeOverwriteBtn
    ];

    var cepBusy = false;

    function setBusy(v, text) {
        cepBusy = !!v;
        for (var i = 0; i < actionButtons.length; i++) {
            actionButtons[i].enabled = !v;
        }

        if (v) {
            statusText.text = text || "正在处理…";
        }
    }

    var pendingHostRequests = {};
    var hostRequestSequence = 0;
    var lastHostRequestError = "";

    function recordHostRequest(message) {
        try {
            if (!cfgFolder.exists && !cfgFolder.create()) return;
            var log = new File(cfgFolder.fsName + "/last-host-request.txt");
            log.encoding = "UTF-8";
            if (log.open("w")) {
                log.writeln(new Date().toString() + " | 1.1.18 | " + (CEP_MODE ? "CEP" : "ScriptUI") + " | " + message);
                log.close();
            }
        } catch (logError) {}
    }

    function createHostRequest() {
        var request = { target: "", body: "", onResult: null, onError: null };
        request.send = function () {
            var id = "request_" + (++hostRequestSequence);
            var completed = false;
            lastHostRequestError = "";

            function reportFailure(message) {
                if (completed) return;
                completed = true;
                delete pendingHostRequests[id];
                lastHostRequestError = String(message || "Illustrator 操作失败。");
                setBusy(false);
                statusText.text = lastHostRequestError;
                reportBox.text = lastHostRequestError;
                optimizeInfo.text = lastHostRequestError;
                recordHostRequest("ERR|" + lastHostRequestError);
                if (typeof request.onError === "function") {
                    try { request.onError({ body: lastHostRequestError }); } catch (callbackError) {}
                }
            }

            function reportResult(value) {
                if (completed) return;
                if (value === undefined || value === null) {
                    reportFailure("Illustrator 没有返回操作结果，请重试。");
                    return;
                }
                completed = true;
                delete pendingHostRequests[id];
                var result = String(value);
                if (result.indexOf("ERR|") === 0) lastHostRequestError = result.substring(4);
                var previousReport = reportBox.text;
                try {
                    if (typeof request.onResult === "function") request.onResult({ body: result });
                    if (reportBox.text === previousReport && statusText.text) reportBox.text = statusText.text;
                    recordHostRequest(result);
                } catch (callbackError) {
                    setBusy(false);
                    lastHostRequestError = "操作结果更新失败：" + (callbackError.message || String(callbackError));
                    statusText.text = lastHostRequestError;
                    reportBox.text = lastHostRequestError;
                    optimizeInfo.text = lastHostRequestError;
                    recordHostRequest("ERR|" + lastHostRequestError);
                }
            }

            if (CEP_MODE) {
                // CEP evalScript is already in Illustrator. The worker body
                // is built by this script; no application launch is required.
                try {
                    var source = String(request.body || "").replace(/^\s*#(?:target|targetengine)\b[^\r\n]*$/gm, "");
                    var result = eval(source);
                    reportResult(result);
                } catch (error) {
                    reportFailure(error.message || String(error));
                }
            } else {
                try {
                    var target = String(BridgeTalk.appSpecifier || "");
                    if (target.indexOf("illustrator") !== 0) throw new Error("无法定位当前 Illustrator 会话。");
                    var nativeRequest = new BridgeTalk();
                    nativeRequest.target = target;
                    nativeRequest.body = request.body;
                    nativeRequest.onResult = function (res) { reportResult(res.body); };
                    nativeRequest.onError = function (error) { reportFailure(error.body || String(error)); };
                    pendingHostRequests[id] = nativeRequest;
                    if (!nativeRequest.send()) reportFailure("Illustrator 请求发送失败，请重试。");
                } catch (error) {
                    reportFailure(error.message || String(error));
                }
            }
            // Failure has already been delivered through onError. Callers must
            // not deliver a second completion for the same native send failure.
            return true;
        };
        return request;
    }

    // ---------------------------------------------------------
    // BridgeTalk：尺寸 Worker
    // ---------------------------------------------------------
    function sizeWorker(action, targetW, targetH, preserveRatio, scaleStrokes) {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开 Illustrator 文档。";
            }

            var sel = app.activeDocument.selection;
            if (!sel || sel.length < 1) {
                return "ERR|请先选择一个或多个对象。";
            }

            function usable(item) {
                if (!item || typeof item.resize !== "function") return false;

                try {
                    if (item.locked || item.hidden || item.editable === false) return false;
                } catch (e) {}

                var ww = Number(item.width);
                var hh = Number(item.height);
                return (ww > 0 && hh > 0);
            }

            function lineScale(sx, sy) {
                if (!scaleStrokes) return 100;
                var n = Math.sqrt(Math.abs(sx * sy));
                return n > 0 ? n : 100;
            }

            function resizeOne(item, sx, sy) {
                item.resize(
                    sx,
                    sy,
                    true,
                    true,
                    true,
                    true,
                    lineScale(sx, sy),
                    Transformation.CENTER
                );
            }

            var ref = null;
            var refIndex = -1;

            for (var r = 0; r < sel.length; r++) {
                if (usable(sel[r])) {
                    ref = sel[r];
                    refIndex = r;
                    break;
                }
            }

            if (!ref) return "ERR|没有可处理的对象。";

            var refW = Number(ref.width);
            var refH = Number(ref.height);

            if (action === "matchW") targetW = refW;
            if (action === "matchH") targetH = refH;
            if (action === "matchWH") {
                targetW = refW;
                targetH = refH;
            }

            var changed = 0;
            var skipped = 0;

            for (var i = 0; i < sel.length; i++) {
                var item = sel[i];

                try {
                    if (!usable(item)) {
                        skipped++;
                        continue;
                    }

                    if (
                        (action === "matchW" || action === "matchH" || action === "matchWH") &&
                        i === refIndex
                    ) {
                        continue;
                    }

                    var cw = Number(item.width);
                    var ch = Number(item.height);
                    var sx = 100;
                    var sy = 100;

                    if (action === "setW" || action === "matchW") {
                        sx = targetW / cw * 100;
                        sy = preserveRatio ? sx : 100;
                    } else if (action === "setH" || action === "matchH") {
                        sy = targetH / ch * 100;
                        sx = preserveRatio ? sy : 100;
                    } else if (action === "setWH" || action === "matchWH") {
                        sx = targetW / cw * 100;
                        sy = targetH / ch * 100;
                    } else {
                        return "ERR|未知尺寸操作。";
                    }

                    if (!(sx > 0) || !(sy > 0)) {
                        skipped++;
                        continue;
                    }

                    resizeOne(item, sx, sy);
                    changed++;
                } catch (itemErr) {
                    skipped++;
                }
            }

            app.redraw();

            if (changed < 1) {
                if (action.indexOf("match") === 0) {
                    return "ERR|至少需要两个可处理对象。";
                }
                return "ERR|没有对象被处理。";
            }

            return "OK|" + changed + "|" + skipped;

        } catch (err) {
            return "ERR|" + err.message;
        }
    }

    function sendSize(action, w, h) {
        setBusy(true, "正在处理尺寸…");

        var bt = createHostRequest();

        bt.body =
            "(" + sizeWorker.toString() + ")" +
            "(\"" + action + "\"," +
            String(w || 0) + "," +
            String(h || 0) + "," +
            (keepRatio.value ? "true" : "false") + "," +
            (scaleStroke.value ? "true" : "false") +
            ");";

        bt.onResult = function (res) {
            setBusy(false);
            handleSizeResult(String(res.body));
        };

        bt.onError = function (err) {
            setBusy(false);
            statusText.text = "尺寸操作失败。";
            alert("脚本执行失败：\n" + err.body);
        };

        bt.send();
    }

    function handleSizeResult(result) {
        var p = result.split("|");

        if (p[0] === "ERR") {
            statusText.text = p.slice(1).join("|");
            return;
        }

        if (p[0] === "OK") {
            statusText.text =
                "完成：" + p[1] + " 个对象" +
                (Number(p[2]) > 0 ? "；跳过 " + p[2] + " 个" : "");
            return;
        }

        statusText.text = result;
    }

    // ---------------------------------------------------------
    // BridgeTalk：统一替换链接 Worker
    // ---------------------------------------------------------
    function replaceLinksWorker(filePath) {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开 Illustrator 文档。";
            }

            var replacementFile = new File(filePath);

            if (!replacementFile.exists) {
                return "ERR|所选替换文件不存在。";
            }

            var doc = app.activeDocument;
            var sel = doc.selection;

            if (!sel || sel.length < 1) {
                return "ERR|请先选择一个或多个链接图片。";
            }

            var placed = [];

            function alreadyAdded(item) {
                for (var i = 0; i < placed.length; i++) {
                    if (placed[i] === item) return true;
                }
                return false;
            }

            function collectPlaced(item) {
                if (!item) return;

                try {
                    if (item.typename === "PlacedItem") {
                        if (!alreadyAdded(item)) placed.push(item);
                        return;
                    }

                    if (item.typename === "GroupItem") {
                        // 先收集，再统一修改，避免替换过程中改变 pageItems 索引。
                        for (var g = 0; g < item.pageItems.length; g++) {
                            collectPlaced(item.pageItems[g]);
                        }
                    }
                } catch (e) {}
            }

            for (var s = 0; s < sel.length; s++) {
                collectPlaced(sel[s]);
            }

            if (placed.length < 1) {
                return "ERR|当前选择中没有可替换的链接图片。";
            }


            function getCenter(item) {
                try {
                    var b = item.geometricBounds;
                    return [
                        (Number(b[0]) + Number(b[2])) / 2,
                        (Number(b[1]) + Number(b[3])) / 2
                    ];
                } catch (e) {
                    return null;
                }
            }

            function getRotationAngle(item) {
                try {
                    var m = item.matrix;
                    var a = Number(m.mValueA);
                    var b = Number(m.mValueB);

                    if (!isNaN(a) && !isNaN(b)) {
                        return Math.atan2(b, a) * 180 / Math.PI;
                    }
                } catch (e) {}

                return 0;
            }

            function getNaturalAspectRatio(fileObj) {
                var temp = null;

                try {
                    temp = doc.placedItems.add();
                    temp.file = fileObj;

                    var w = Number(temp.width);
                    var h = Number(temp.height);

                    if (w > 0 && h > 0) {
                        return w / h;
                    }
                } catch (e) {
                } finally {
                    try {
                        if (temp) temp.remove();
                    } catch (removeErr) {}
                }

                return 0;
            }

            function fitToNaturalRatioKeepHeightAndCenter(
                item,
                targetBBoxHeight,
                oldCenter,
                naturalRatio,
                originalAngle
            ) {
                if (!(targetBBoxHeight > 0)) {
                    throw new Error("原图片高度无效");
                }

                if (!(naturalRatio > 0)) {
                    throw new Error("无法读取新图片原始比例");
                }

                // relink 后不要分别设置 width / height。
                // 对带旋转或复合变换的置入图，这两个属性是外接框尺寸，
                // 分别写入会把旋转后的外接框误当成本地尺寸，造成非等比变形。
                var currentBBoxHeight = Number(item.height);
                if (!(currentBBoxHeight > 0)) {
                    throw new Error("无法读取替换图片的当前高度");
                }

                var uniformScale = targetBBoxHeight / currentBBoxHeight * 100;
                if (!(uniformScale > 0)) {
                    throw new Error("计算替换图片等比缩放比例失败");
                }

                item.resize(
                    uniformScale,
                    uniformScale,
                    true,
                    true,
                    true,
                    true,
                    uniformScale,
                    Transformation.CENTER
                );

                if (oldCenter) {
                    var newCenter = getCenter(item);

                    if (newCenter) {
                        var dx = oldCenter[0] - newCenter[0];
                        var dy = oldCenter[1] - newCenter[1];

                        if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
                            item.translate(dx, dy);
                        }
                    }
                }
            }

            function relinkItem(item, fileObj) {
                if (typeof item.relink === "function") {
                    item.relink(fileObj);
                } else {
                    item.file = fileObj;
                }
            }

            function duplicateAdjacent(item) {
                var copy = null;

                try {
                    copy = item.duplicate(
                        item,
                        ElementPlacement.PLACEBEFORE
                    );
                } catch (e0) {
                    try {
                        copy = item.duplicate();
                    } catch (e1) {
                        throw new Error("无法复制原图片对象");
                    }
                }

                if (!copy) {
                    throw new Error("无法复制原图片对象");
                }

                return copy;
            }

            function buildReplacement(
                originalItem,
                newFile,
                targetHeight,
                oldCenter,
                naturalRatio,
                oldAngle
            ) {
                var copy = null;

                try {
                    copy = duplicateAdjacent(originalItem);

                    // 只给“副本”换链接。
                    // 原对象一直保留到所有处理都成功后才删除，
                    // 因此失败时不会破坏原图片。
                    relinkItem(copy, newFile);

                    fitToNaturalRatioKeepHeightAndCenter(
                        copy,
                        targetHeight,
                        oldCenter,
                        naturalRatio,
                        oldAngle
                    );

                    return copy;

                } catch (err) {
                    try {
                        if (copy) copy.remove();
                    } catch (cleanupErr) {}

                    throw err;
                }
            }

            function commitReplacement(originalItem, replacementItem) {
                try {
                    originalItem.remove();
                } catch (removeErr) {
                    try {
                        replacementItem.remove();
                    } catch (cleanupErr) {}

                    throw new Error(
                        "新图片已准备完成，但删除原图片失败：" +
                        removeErr.message
                    );
                }

                try {
                    replacementItem.selected = true;
                } catch (selectErr) {}
            }

            var naturalRatio = getNaturalAspectRatio(replacementFile);

            if (!(naturalRatio > 0)) {
                return "ERR|无法读取所选新图片的原始宽高比。";
            }

            var replaced = 0;
            var skipped = 0;
            var errors = [];

            for (var i = 0; i < placed.length; i++) {
                var item = placed[i];

                try {
                    try {
                        if (
                            item.locked ||
                            item.hidden ||
                            item.editable === false
                        ) {
                            skipped++;
                            continue;
                        }
                    } catch (stateErr) {}

                    var oldHeight = Number(item.height);
                    var oldCenter = getCenter(item);
                    var oldAngle = getRotationAngle(item);

                    if (!(oldHeight > 0)) {
                        skipped++;
                        continue;
                    }

                    var replacement = buildReplacement(
                        item,
                        replacementFile,
                        oldHeight,
                        oldCenter,
                        naturalRatio,
                        oldAngle
                    );

                    commitReplacement(item, replacement);
                    replaced++;

                } catch (replaceErr) {
                    skipped++;
                    errors.push(
                        "第 " + (i + 1) + " 张：" +
                        (replaceErr.message || String(replaceErr))
                    );
                }
            }

            // 不调用 app.redraw()。
            // Illustrator 通常会在本次脚本调用结束后自行刷新；
            // 避免 redraw 把一次操作切成多个 Undo 记录。

            if (replaced < 1) {
                return "ERR|当前选择中没有成功替换的链接图片。";
            }

            return "REPLACE|" +
                replaced + "|" +
                skipped + "|" +
                (errors.length ? errors.join("；") : "");

        } catch (err) {
            return "ERR|" + err.message;
        }
    }

    function sendReplaceLinks(filePath) {
        setBusy(true, "正在统一替换链接…");

        var bt = createHostRequest();
        bt.body =
            "(" + replaceLinksWorker.toString() + ")(" +
            jsQuote(filePath) +
            ");";

        bt.onResult = function (res) {
            setBusy(false);

            var result = String(res.body);
            var p = result.split("|");

            if (p[0] === "REPLACE") {
                statusText.text =
                    "已用同一图片替换 " + p[1] + " 个链接" +
                    (Number(p[2]) > 0 ? "；跳过 " + p[2] + " 个" : "") +
                    "；可按 Ctrl+Z 撤回。";
            } else if (p[0] === "ERR") {
                statusText.text = p.slice(1).join("|");
            } else {
                statusText.text = result;
            }
        };

        bt.onError = function (err) {
            setBusy(false);
            statusText.text = "统一替换链接失败。";
            alert("脚本执行失败：\n" + err.body);
        };

        bt.send();
    }

    // ---------------------------------------------------------
    // BridgeTalk：批量替换链接 Worker
    // ---------------------------------------------------------
    function batchReplaceLinksWorker(sourcePaths, selectionKey) {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开 Illustrator 文档。";
            }

            if (!sourcePaths || sourcePaths.length < 1) {
                return "ERR|没有可用于替换的来源图片。";
            }

            var snapshot = selectionKey ? $.global[selectionKey] : null;
            if (selectionKey) {
                try { delete $.global[selectionKey]; } catch (releaseErr) {}
                if (!snapshot) return "ERR|原选区已失效，请重新选择要替换的图片。";
            }
            var doc = snapshot ? snapshot.document : app.activeDocument;
            if (snapshot) {
                var documentOpen = false;
                for (var d = 0; d < app.documents.length; d++) {
                    if (app.documents[d] === doc) { documentOpen = true; break; }
                }
                if (!documentOpen) return "ERR|原文档已关闭，请重新选择要替换的图片。";
                doc.activate();
            }
            var sel = snapshot ? snapshot.items : doc.selection;

            if (!sel || sel.length < 1) {
                return "ERR|请先选择要替换的链接图片；缺失链接也可以选择。";
            }

            var placed = [];

            function alreadyAdded(item) {
                for (var i = 0; i < placed.length; i++) {
                    if (placed[i] === item) return true;
                }
                return false;
            }

            function collectPlaced(item) {
                if (!item) return;

                try {
                    if (item.typename === "PlacedItem" ||
                        (selectionKey && item.typename === "RasterItem")) {
                        if (!alreadyAdded(item)) placed.push(item);
                        return;
                    }

                    if (item.typename === "GroupItem") {
                        for (var g = 0; g < item.pageItems.length; g++) {
                            collectPlaced(item.pageItems[g]);
                        }
                    }
                } catch (e) {}
            }

            for (var s = 0; s < sel.length; s++) {
                collectPlaced(sel[s]);
            }

            // 按画面从上到下、从左到右配对来源图片，避免 Illustrator 的
            // selection 数组顺序与用户看到的图片顺序不一致。
            var orderedTargets = [];

            for (var o = 0; o < placed.length; o++) {
                var bounds = null;
                var centerX = 0;
                var centerY = 0;

                try {
                    bounds = placed[o].geometricBounds;
                    centerX = (Number(bounds[0]) + Number(bounds[2])) / 2;
                    centerY = (Number(bounds[1]) + Number(bounds[3])) / 2;
                } catch (boundsErr) {}

                orderedTargets.push({
                    item: placed[o],
                    index: o,
                    x: centerX,
                    y: centerY
                });
            }

            orderedTargets.sort(function (a, b) {
                if (a.y !== b.y) return b.y - a.y;
                if (a.x !== b.x) return a.x - b.x;
                return a.index - b.index;
            });

            placed = [];
            for (var ot = 0; ot < orderedTargets.length; ot++) {
                placed.push(orderedTargets[ot].item);
            }

            if (placed.length < 1) {
                return selectionKey
                    ? "ERR|原选区中没有可替换的图片。"
                    : "ERR|当前选择中没有可替换的链接图片。";
            }

            var usableFiles = [];
            var invalidSourcePaths = [];

            function resolveSourceFile(pathText) {
                var s = String(pathText || "");

                if (!s) return null;

                if (
                    s.length >= 2 &&
                    (
                        (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
                        (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")
                    )
                ) {
                    s = s.substring(1, s.length - 1);
                }

                var candidates = [s];

                try {
                    var decoded = decodeURI(s);
                    if (decoded !== s) candidates.push(decoded);
                } catch (e0) {}

                try {
                    var decodedComponent = decodeURIComponent(s);
                    if (decodedComponent !== s) candidates.push(decodedComponent);
                } catch (e1) {}

                for (var i = 0; i < candidates.length; i++) {
                    try {
                        var candidateFile = new File(candidates[i]);

                        if (candidateFile.exists) {
                            return candidateFile;
                        }
                    } catch (e2) {}
                }

                return null;
            }

            for (var f = 0; f < sourcePaths.length; f++) {
                var sourceFile = resolveSourceFile(sourcePaths[f]);

                if (sourceFile) {
                    usableFiles.push(sourceFile);
                } else {
                    invalidSourcePaths.push(String(sourcePaths[f] || ""));
                }
            }

            if (usableFiles.length < 1) {
                return "ERR|已收到 " + sourcePaths.length +
                    " 个来源路径，但 Illustrator 无法访问这些文件。";
            }

            var selectedCount = placed.length;
            var sourceCount = usableFiles.length;
            var targetCount = Math.min(selectedCount, sourceCount);

            var replaced = 0;
            var failed = 0;
            var errors = [];


            function getCenter(item) {
                try {
                    var b = item.geometricBounds;
                    return [
                        (Number(b[0]) + Number(b[2])) / 2,
                        (Number(b[1]) + Number(b[3])) / 2
                    ];
                } catch (e) {
                    return null;
                }
            }

            function getRotationAngle(item) {
                try {
                    var m = item.matrix;
                    var a = Number(m.mValueA);
                    var b = Number(m.mValueB);

                    if (!isNaN(a) && !isNaN(b)) {
                        return Math.atan2(b, a) * 180 / Math.PI;
                    }
                } catch (e) {}

                return 0;
            }

            function getNaturalAspectRatio(fileObj) {
                var temp = null;

                try {
                    temp = doc.placedItems.add();
                    temp.file = fileObj;

                    var w = Number(temp.width);
                    var h = Number(temp.height);

                    if (w > 0 && h > 0) {
                        return w / h;
                    }
                } catch (e) {
                } finally {
                    try {
                        if (temp) temp.remove();
                    } catch (removeErr) {}
                }

                return 0;
            }

            function copyMatrix(matrix) {
                var copy = app.getIdentityMatrix();
                copy.mValueA = Number(matrix.mValueA);
                copy.mValueB = Number(matrix.mValueB);
                copy.mValueC = Number(matrix.mValueC);
                copy.mValueD = Number(matrix.mValueD);
                copy.mValueTX = Number(matrix.mValueTX);
                copy.mValueTY = Number(matrix.mValueTY);
                return copy;
            }

            function fitToNaturalRatioKeepHeightAndCenter(
                item,
                targetBBoxHeight,
                oldCenter,
                naturalRatio,
                originalAngle,
                originalMatrix
            ) {
                if (!(targetBBoxHeight > 0)) {
                    throw new Error("原图片高度无效");
                }

                if (!(naturalRatio > 0)) {
                    throw new Error("无法读取新图片原始比例");
                }

                if (originalMatrix) {
                    // A relink keeps the old object's independent X/Y scales.
                    // Normalize them before fitting the new image uniformly;
                    // retain the original rotation, mirror and skew directions.
                    var matrix = copyMatrix(originalMatrix);
                    var xScale = Math.sqrt(matrix.mValueA * matrix.mValueA + matrix.mValueB * matrix.mValueB);
                    var yScale = Math.sqrt(matrix.mValueC * matrix.mValueC + matrix.mValueD * matrix.mValueD);
                    var determinant = matrix.mValueA * matrix.mValueD - matrix.mValueB * matrix.mValueC;
                    if (!(xScale > 0) || !(yScale > 0) || !isFinite(xScale) || !isFinite(yScale) ||
                        !isFinite(determinant) || Math.abs(determinant / xScale / yScale) < 0.000001) {
                        throw new Error("原图片变换无效，无法重新链接");
                    }
                    matrix.mValueA /= xScale;
                    matrix.mValueB /= xScale;
                    matrix.mValueC /= yScale;
                    matrix.mValueD /= yScale;
                    item.matrix = matrix;

                    var currentHeight = Number(item.height);
                    var scale = targetBBoxHeight / currentHeight * 100;
                    if (!(currentHeight > 0) || !(scale > 0) || !isFinite(scale)) {
                        throw new Error("无法计算重新链接后的图片尺寸");
                    }
                    item.resize(scale, scale, true, true, true, true, scale, Transformation.CENTER);
                } else {
                    var currentAngle = getRotationAngle(item);

                    if (Math.abs(currentAngle) > 0.0001) {
                        item.rotate(-currentAngle, true, true, true, true, Transformation.CENTER);
                    }

                    var rad = originalAngle * Math.PI / 180;
                    var sinA = Math.abs(Math.sin(rad));
                    var cosA = Math.abs(Math.cos(rad));
                    var denom = naturalRatio * sinA + cosA;
                    if (!(denom > 0)) denom = 1;
                    var localH = targetBBoxHeight / denom;
                    var localW = localH * naturalRatio;
                    if (!(localW > 0) || !(localH > 0)) {
                        throw new Error("计算新图片尺寸失败");
                    }
                    item.width = localW;
                    item.height = localH;

                    if (Math.abs(originalAngle) > 0.0001) {
                        item.rotate(originalAngle, true, true, true, true, Transformation.CENTER);
                    }
                }

                if (oldCenter) {
                    var newCenter = getCenter(item);

                    if (newCenter) {
                        var dx = oldCenter[0] - newCenter[0];
                        var dy = oldCenter[1] - newCenter[1];

                        if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
                            item.translate(dx, dy);
                        }
                    }
                }
            }

            function relinkItem(item, fileObj) {
                if (typeof item.relink === "function") {
                    item.relink(fileObj);
                } else {
                    item.file = fileObj;
                }
            }

            function isMissingPlacedItem(item) {
                try {
                    if (
                        typeof LinkStatus !== "undefined" &&
                        item.status === LinkStatus.LINKMISSING
                    ) {
                        return true;
                    }
                } catch (statusEnumErr) {}

                try {
                    var linkedFile = item.file;
                    if (linkedFile && typeof linkedFile.exists === "boolean") {
                        return !linkedFile.exists;
                    }
                } catch (fileErr) { return true; }

                try {
                    return String(item.status || "").toLowerCase().indexOf("missing") >= 0;
                } catch (statusErr) {}

                return false;
            }

            function duplicateAdjacent(item) {
                var copy = null;

                try {
                    copy = item.duplicate(
                        item,
                        ElementPlacement.PLACEBEFORE
                    );
                } catch (e0) {
                    try {
                        copy = item.duplicate();
                    } catch (e1) {
                        throw new Error("无法复制原图片对象");
                    }
                }

                if (!copy) {
                    throw new Error("无法复制原图片对象");
                }

                return copy;
            }

            function buildReplacement(
                originalItem,
                newFile,
                targetHeight,
                oldCenter,
                naturalRatio,
                oldAngle
            ) {
                var copy = null;
                var originalMatrix = selectionKey && originalItem.typename === "PlacedItem"
                    ? copyMatrix(originalItem.matrix) : null;

                try {
                    if (selectionKey &&
                        (originalItem.typename === "RasterItem" || isMissingPlacedItem(originalItem))) {
                        // Embedded/missing images may not be duplicable. Keep
                        // the original until a placed replacement is complete.
                        copy = doc.placedItems.add();
                        copy.file = newFile;
                        copy.move(originalItem, ElementPlacement.PLACEBEFORE);
                        copy.opacity = originalItem.opacity;
                        copy.blendingMode = originalItem.blendingMode;
                        copy.name = originalItem.name;
                        copy.note = originalItem.note;
                    } else {
                        copy = duplicateAdjacent(originalItem);
                        // Keep the original until the replacement is ready.
                        relinkItem(copy, newFile);
                    }

                    fitToNaturalRatioKeepHeightAndCenter(
                        copy,
                        targetHeight,
                        oldCenter,
                        naturalRatio,
                        oldAngle,
                        originalMatrix
                    );

                    return copy;

                } catch (err) {
                    try {
                        if (copy) copy.remove();
                    } catch (cleanupErr) {}

                    throw err;
                }
            }

            function commitReplacement(originalItem, replacementItem) {
                try {
                    originalItem.remove();
                } catch (removeErr) {
                    try {
                        replacementItem.remove();
                    } catch (cleanupErr) {}

                    throw new Error(
                        "新图片已准备完成，但删除原图片失败：" +
                        removeErr.message
                    );
                }

                try {
                    replacementItem.selected = true;
                } catch (selectErr) {}
            }

            for (var i = 0; i < targetCount; i++) {
                var item = placed[i];
                var fileObj = usableFiles[i];

                try {
                    try {
                        if (
                            item.locked ||
                            item.hidden ||
                            item.editable === false
                        ) {
                            failed++;
                            errors.push("第 " + (i + 1) + " 张：对象不可编辑");
                            continue;
                        }
                    } catch (stateErr) {}

                    var oldHeight = Number(item.height);
                    var oldCenter = getCenter(item);
                    var oldAngle = getRotationAngle(item);
                    var naturalRatio = getNaturalAspectRatio(fileObj);

                    if (!(oldHeight > 0)) {
                        failed++;
                        errors.push("第 " + (i + 1) + " 张：无法读取原高度");
                        continue;
                    }

                    if (!(naturalRatio > 0)) {
                        failed++;
                        errors.push("第 " + (i + 1) + " 张：无法读取新图片原始比例");
                        continue;
                    }

                    if (!selectionKey && isMissingPlacedItem(item)) {
                        // The existing missing-link action reconnects its slot.
                        // Picture replacement stages a new object instead:
                        // Illustrator 29.5 does not fully undo a direct relink.
                        var previousFile = null;
                        try { previousFile = item.file; } catch (previousFileErr) {}
                        var previousMatrix = copyMatrix(item.matrix);

                        try {
                            relinkItem(item, fileObj);
                            fitToNaturalRatioKeepHeightAndCenter(
                                item,
                                oldHeight,
                                oldCenter,
                                naturalRatio,
                                oldAngle
                            );
                        } catch (relinkErr) {
                            var restoreErrors = [];
                            try {
                                if (previousFile) relinkItem(item, previousFile);
                            } catch (restoreFileErr) { restoreErrors.push("原链接恢复失败"); }
                            try {
                                item.matrix = previousMatrix;
                            } catch (restoreMatrixErr) { restoreErrors.push("原变换恢复失败"); }
                            if (restoreErrors.length) {
                                throw new Error((relinkErr.message || String(relinkErr)) + "；" + restoreErrors.join("；"));
                            }
                            throw relinkErr;
                        }
                        try { item.selected = true; } catch (selectionErr) {}
                    } else {
                        var replacement = buildReplacement(
                            item,
                            fileObj,
                            oldHeight,
                            oldCenter,
                            naturalRatio,
                            oldAngle
                        );

                        commitReplacement(item, replacement);
                    }

                    replaced++;

                } catch (replaceErr) {
                    failed++;
                    errors.push(
                        "第 " + (i + 1) + " 张：" +
                        (replaceErr.message || String(replaceErr))
                    );
                }
            }

            // 整个批量替换期间不调用 app.redraw()，
            // 尽量让 Illustrator 把这一整次脚本执行保留为一个 Undo 步骤。

            var shortage =
                selectedCount > sourceCount
                    ? selectedCount - sourceCount
                    : 0;

            var unused =
                sourceCount > selectedCount
                    ? sourceCount - selectedCount
                    : 0;

            var errorText = "";

            if (errors.length > 0) {
                var maxErrors = Math.min(errors.length, 10);
                var errorLines = [];

                for (var e = 0; e < maxErrors; e++) {
                    errorLines.push(errors[e]);
                }

                if (errors.length > maxErrors) {
                    errorLines.push(
                        "……另外还有 " +
                        (errors.length - maxErrors) +
                        " 个错误"
                    );
                }

                errorText = errorLines.join("\n");
            }

            return "BATCH|" +
                selectedCount + "|" +
                sourceCount + "|" +
                replaced + "|" +
                failed + "|" +
                shortage + "|" +
                unused + "|" +
                invalidSourcePaths.length + "|" +
                errorText;

        } catch (err) {
            return "ERR|" + err.message;
        }
    }

    function sendBatchReplaceLinks(paths, selectionKey) {
        var replacingPictures = !!selectionKey;
        var actionName = replacingPictures ? "替换图片" : "批量替换";
        if (!paths || paths.length < 1) {
            if (selectionKey) {
                try { delete $.global[selectionKey]; } catch (releaseErr) {}
            }
            setBusy(false);
            alert("没有选择可用于替换的图片。");
            return;
        }

        setBusy(true, replacingPictures ? "正在替换图片…" : "正在批量替换链接…");
        reportBox.text = statusText.text;

        var jsPaths = [];

        for (var i = 0; i < paths.length; i++) {
            jsPaths.push(jsQuote(paths[i]));
        }

        var bt = createHostRequest();
        bt.body =
            (selectionKey ? '#targetengine "AI_MERGED_TOOLBOX"\n' : "") +
            "(" + batchReplaceLinksWorker.toString() + ")" +
            "([" + jsPaths.join(",") + "]," + jsQuote(selectionKey || "") + ");";

        bt.onResult = function (res) {
            if (selectionKey) {
                try { delete $.global[selectionKey]; } catch (releaseErr) {}
            }
            setBusy(false);

            var result = String(res.body || "");
            var p = result.split("|");

            if (p[0] === "ERR") {
                var msg = p.slice(1).join("|");
                statusText.text = msg;
                reportBox.text = msg;
                alert(msg);
                return;
            }

            if (p[0] !== "BATCH") {
                statusText.text = result;
                reportBox.text = result;
                return;
            }

            var selectedCount = Number(p[1] || 0);
            var sourceCount = Number(p[2] || 0);
            var replaced = Number(p[3] || 0);
            var failed = Number(p[4] || 0);
            var shortage = Number(p[5] || 0);
            var unused = Number(p[6] || 0);
            var invalidSources = Number(p[7] || 0);
            var errorText = p.slice(8).join("|");

            statusText.text =
                actionName + "完成：已替换 " +
                replaced + " / " + selectedCount + " 张。";
            reportBox.text = statusText.text +
                "\n来源图片：" + sourceCount + " 张" +
                (failed > 0 ? "\n失败：" + failed + " 张" : "") +
                (shortage > 0 ? "\n照片选少了，末尾 " + shortage + " 张保持不变。" : "") +
                (unused > 0 ? "\n未使用来源：" + unused + " 张" : "") +
                (errorText ? "\n" + errorText : "");

            if (invalidSources > 0 && replaced > 0) {
                alert(
                    actionName + "已执行。\n\n" +
                    "成功替换：" + replaced + " 张\n" +
                    "有 " + invalidSources + " 个来源路径无法访问。" +
                    (failed > 0 ? "\n另外有 " + failed + " 张替换失败。" : "") +
                    (errorText ? "\n\n" + errorText : "")
                );

                if (shortage <= 0 && failed <= 0) {
                    return;
                }
            }

            if (shortage > 0) {
                alert(
                    "照片选少了，图片数量不足。\n\n" +
                    "选中了 " + selectedCount + " 张图片，" +
                    "来源只有 " + sourceCount + " 张。\n\n" +
                    "实际替换了 " + replaced + " 张，" +
                    "末尾 " + shortage + " 张保持不变。" +
                    (failed > 0
                        ? "\n另外有 " + failed + " 张替换失败。"
                        : "") +
                    (errorText ? "\n\n" + errorText : "")
                );
                return;
            }

            if (failed > 0) {
                alert(
                    actionName + "完成，但有部分图片替换失败。\n\n" +
                    "成功：" + replaced + " 张\n" +
                    "失败：" + failed + " 张" +
                    (errorText ? "\n\n" + errorText : "")
                );
                return;
            }

            if (unused > 0) {
                statusText.text =
                    actionName + "完成：已替换 " +
                    replaced + " 张；有 " +
                    unused + " 张来源图片未使用。";
            }
        };

        bt.onError = function (err) {
            if (selectionKey) {
                try { delete $.global[selectionKey]; } catch (releaseErr) {}
            }
            setBusy(false);
            statusText.text = actionName + "失败。";
            reportBox.text = statusText.text + "\n" + String(err.body || err);
            alert(
                actionName + "失败：\n" +
                String(err.body || err)
            );
        };

        if (!bt.send()) {
            if (selectionKey) {
                try { delete $.global[selectionKey]; } catch (releaseErr) {}
            }
            setBusy(false);
            statusText.text = actionName + "请求发送失败，请重试。";
            reportBox.text = statusText.text;
        }
    }


    // ---------------------------------------------------------
    // BridgeTalk：两张图片互换 Worker（链接 / 嵌入）
    // ---------------------------------------------------------
    function swapTwoLinksWorker() {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开 Illustrator 文档。";
            }

            var doc = app.activeDocument;
            var sel = doc.selection;

            if (!sel || sel.length < 1) {
                return "ERR|请先选择两张图片，可以是链接图片或嵌入图片。";
            }

            var pictures = [];

            function alreadyAdded(item) {
                for (var i = 0; i < pictures.length; i++) {
                    if (pictures[i] === item) return true;
                }
                return false;
            }

            function collectPictures(item) {
                if (!item) return;

                try {
                    if (item.typename === "PlacedItem" || item.typename === "RasterItem") {
                        if (!alreadyAdded(item)) pictures.push(item);
                        return;
                    }

                    if (item.typename === "GroupItem") {
                        for (var g = 0; g < item.pageItems.length; g++) {
                            collectPictures(item.pageItems[g]);
                        }
                    }
                } catch (e) {}
            }

            for (var s = 0; s < sel.length; s++) {
                collectPictures(sel[s]);
            }

            if (pictures.length !== 2) {
                return "ERR|当前选择中检测到 " + pictures.length +
                    " 张图片。请只选择恰好两张链接或嵌入图片后再执行。";
            }

            var a = pictures[0];
            var b = pictures[1];

            try {
                if (
                    a.locked || a.hidden || a.editable === false ||
                    b.locked || b.hidden || b.editable === false
                ) {
                    return "ERR|所选图片中有锁定、隐藏或不可编辑的对象。";
                }
            } catch (stateErr) {}

            var fileA = null;
            var fileB = null;

            try { fileA = a.file; } catch (eA) {}
            try { fileB = b.file; } catch (eB) {}

            function isMissingLinkedSource(item, file) {
                if (item.typename !== "PlacedItem") return false;
                if (!file) return true;
                try { return !file.exists; } catch (fileError) { return true; }
            }

            function getCenter(item) {
                try {
                    var b = item.geometricBounds;
                    return [
                        (Number(b[0]) + Number(b[2])) / 2,
                        (Number(b[1]) + Number(b[3])) / 2
                    ];
                } catch (e) {
                    return null;
                }
            }

            function getRotationAngle(item) {
                try {
                    var m = item.matrix;
                    var a = Number(m.mValueA);
                    var b = Number(m.mValueB);

                    if (!isNaN(a) && !isNaN(b)) {
                        return Math.atan2(b, a) * 180 / Math.PI;
                    }
                } catch (e) {}

                return 0;
            }

            function getNaturalAspectRatio(fileObj) {
                var temp = null;

                try {
                    temp = doc.placedItems.add();
                    temp.file = fileObj;

                    var w = Number(temp.width);
                    var h = Number(temp.height);

                    if (w > 0 && h > 0) {
                        return w / h;
                    }
                } catch (e) {
                } finally {
                    try {
                        if (temp) temp.remove();
                    } catch (removeErr) {}
                }

                return 0;
            }

            // 互换专用：保持新链接等比缩放，避免旋转对象被拉伸。
            function fitToNaturalRatioKeepHeightAndCenter(
                item,
                targetBBoxHeight,
                oldCenter,
                naturalRatio,
                originalAngle
            ) {
                if (!(targetBBoxHeight > 0)) {
                    throw new Error("原图片高度无效");
                }

                if (!(naturalRatio > 0)) {
                    throw new Error("无法读取新图片原始比例");
                }

                // relink 后不要分别设置 width / height。
                // 对带旋转或复合变换的置入图，这两个属性是外接框尺寸，
                // 分别写入会把旋转后的外接框误当成本地尺寸，造成非等比变形。
                // 只用同一个缩放值缩放 X/Y，保留新链接的原始比例和原有旋转。
                var currentBBoxHeight = Number(item.height);
                if (!(currentBBoxHeight > 0)) {
                    throw new Error("无法读取替换图片的当前高度");
                }

                var uniformScale = targetBBoxHeight / currentBBoxHeight * 100;
                if (!(uniformScale > 0)) {
                    throw new Error("计算替换图片等比缩放比例失败");
                }

                item.resize(
                    uniformScale,
                    uniformScale,
                    true,
                    true,
                    true,
                    true,
                    uniformScale,
                    Transformation.CENTER
                );

                if (oldCenter) {
                    var newCenter = getCenter(item);

                    if (newCenter) {
                        var dx = oldCenter[0] - newCenter[0];
                        var dy = oldCenter[1] - newCenter[1];

                        if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
                            item.translate(dx, dy);
                        }
                    }
                }
            }

            function relinkItem(item, fileObj) {
                if (typeof item.relink === "function") {
                    item.relink(fileObj);
                } else {
                    item.file = fileObj;
                }
            }

            function duplicateAdjacent(item) {
                var copy = null;

                try {
                    copy = item.duplicate(
                        item,
                        ElementPlacement.PLACEBEFORE
                    );
                } catch (e0) {
                    try {
                        copy = item.duplicate();
                    } catch (e1) {
                        throw new Error("无法复制原图片对象");
                    }
                }

                if (!copy) {
                    throw new Error("无法复制原图片对象");
                }

                return copy;
            }

            function buildReplacement(
                originalItem,
                newFile,
                targetHeight,
                oldCenter,
                naturalRatio,
                oldAngle
            ) {
                var copy = null;

                try {
                    copy = duplicateAdjacent(originalItem);

                    // 只给“副本”换链接。
                    // 原对象一直保留到所有处理都成功后才删除，
                    // 因此失败时不会破坏原图片。
                    relinkItem(copy, newFile);

                    fitToNaturalRatioKeepHeightAndCenter(
                        copy,
                        targetHeight,
                        oldCenter,
                        naturalRatio,
                        oldAngle
                    );

                    return copy;

                } catch (err) {
                    try {
                        if (copy) copy.remove();
                    } catch (cleanupErr) {}

                    throw err;
                }
            }

            function commitReplacement(originalItem, replacementItem) {
                try {
                    originalItem.remove();
                } catch (removeErr) {
                    try {
                        replacementItem.remove();
                    } catch (cleanupErr) {}

                    throw new Error(
                        "新图片已准备完成，但删除原图片失败：" +
                        removeErr.message
                    );
                }

                try {
                    replacementItem.selected = true;
                } catch (selectErr) {}
            }

            function copyMatrix(matrix) {
                var copy = app.getIdentityMatrix();
                copy.mValueA = Number(matrix.mValueA);
                copy.mValueB = Number(matrix.mValueB);
                copy.mValueC = Number(matrix.mValueC);
                copy.mValueD = Number(matrix.mValueD);
                copy.mValueTX = Number(matrix.mValueTX);
                copy.mValueTY = Number(matrix.mValueTY);
                return copy;
            }

            function setImageMatrix(item, target) {
                var current = copyMatrix(item.matrix);
                var determinant = current.mValueA * current.mValueD - current.mValueB * current.mValueC;
                if (!isFinite(determinant) || Math.abs(determinant) < 0.000000000001) {
                    throw new Error("图片变换不可逆，无法互换");
                }
                // Native transform edits participate in Illustrator's undo
                // history. Reset then apply the target so concatenation order
                // does not depend on whether the object is raster or placed.
                item.transform(app.invertMatrix(current), true, true, true, true, 100, Transformation.DOCUMENTORIGIN);
                item.transform(target, true, true, true, true, 100, Transformation.DOCUMENTORIGIN);
            }

            function imageState(item) {
                var box = item.boundingBox;
                var dx = Number(box[2]) - Number(box[0]);
                var dy = Number(box[3]) - Number(box[1]);
                var matrix = copyMatrix(item.matrix);
                var rightX = matrix.mValueA * dx;
                var rightY = matrix.mValueB * dx;
                var downX = matrix.mValueC * dy;
                var downY = matrix.mValueD * dy;
                var rightLength = Math.sqrt(rightX * rightX + rightY * rightY);
                var downLength = Math.sqrt(downX * downX + downY * downY);
                var height = Number(item.height);
                var center = getCenter(item);
                if (!isFinite(dx) || !isFinite(dy) || Math.abs(dx) < 0.000001 || Math.abs(dy) < 0.000001 ||
                    !(rightLength > 0) || !(downLength > 0) || !(height > 0) ||
                    !isFinite(rightLength) || !isFinite(downLength) || !isFinite(height) || !center ||
                    !isFinite(center[0]) || !isFinite(center[1]) ||
                    !isFinite(matrix.mValueTX) || !isFinite(matrix.mValueTY)) {
                    throw new Error("无法读取图片的原始尺寸或变换");
                }
                var right = [rightX / rightLength, rightY / rightLength];
                var down = [downX / downLength, downY / downLength];
                if (Math.abs(right[0] * down[1] - right[1] * down[0]) < 0.000001) {
                    throw new Error("图片变换已经退化，无法互换");
                }
                return {
                    matrix: matrix,
                    xSign: dx < 0 ? -1 : 1,
                    ySign: dy < 0 ? -1 : 1,
                    right: right,
                    down: down,
                    height: height,
                    center: center,
                    parent: item.parent,
                    opacity: item.opacity,
                    blendingMode: item.blendingMode,
                    name: item.name,
                    note: item.note
                };
            }

            function applySlotAppearance(item, slot) {
                item.opacity = slot.opacity;
                item.blendingMode = slot.blendingMode;
                item.name = slot.name;
                item.note = slot.note;
            }

            function markImageSlot(item) {
                var marker = item.parent.groupItems.add();
                try {
                    marker.move(item, ElementPlacement.PLACEBEFORE);
                    marker.name = "__LINGHUI_SWAP_SLOT__";
                    return marker;
                } catch (error) {
                    try { if (marker.pageItems.length === 0) marker.remove(); } catch (cleanupError) {}
                    throw error;
                }
            }

            function fitImageToSlot(item, source, slot) {
                var matrix = app.getIdentityMatrix();
                // Raster and placed images can use opposite local Y directions.
                // Map their visible right/down axes, not the raw matrices, so
                // crossing image types does not introduce a vertical flip.
                matrix.mValueA = slot.right[0] * source.xSign;
                matrix.mValueB = slot.right[1] * source.xSign;
                matrix.mValueC = slot.down[0] * source.ySign;
                matrix.mValueD = slot.down[1] * source.ySign;
                setImageMatrix(item, matrix);

                var currentHeight = Number(item.height);
                if (!(currentHeight > 0)) throw new Error("互换后的图片高度无效");
                var scale = slot.height / currentHeight * 100;
                if (!(scale > 0) || !isFinite(scale)) throw new Error("无法计算图片缩放比例");
                item.resize(scale, scale, true, true, true, true, scale, Transformation.CENTER);
                var center = getCenter(item);
                if (!center) throw new Error("无法定位互换后的图片");
                item.translate(slot.center[0] - center[0], slot.center[1] - center[1]);
                applySlotAppearance(item, slot);
            }

            function verifyImageSlot(item, slot) {
                var current = imageState(item);
                if (current.parent !== slot.parent ||
                    Math.abs(current.center[0] - slot.center[0]) > 0.02 ||
                    Math.abs(current.center[1] - slot.center[1]) > 0.02 ||
                    Math.abs(current.height - slot.height) > 0.02 ||
                    Math.abs(current.right[0] - slot.right[0]) > 0.0001 ||
                    Math.abs(current.right[1] - slot.right[1]) > 0.0001 ||
                    Math.abs(current.down[0] - slot.down[0]) > 0.0001 ||
                    Math.abs(current.down[1] - slot.down[1]) > 0.0001) {
                    throw new Error("图片没有到达互换后的目标位置");
                }
            }

            function pictureLabel(item, file, index) {
                var label = item.typename === "RasterItem"
                    ? String(item.name || ("嵌入图片" + index))
                    : String((file && file.name) || item.name || ("图片" + index));
                try { label = decodeURI(label); } catch (decodeError) {}
                return label.replace(/[|\r\n]/g, " ");
            }

            function swapImageObjects(missingLinkedSource) {
                var stateA = imageState(a);
                var stateB = imageState(b);
                var labelA = pictureLabel(a, fileA, 1);
                var labelB = pictureLabel(b, fileB, 2);
                var markerA = null;
                var markerB = null;
                var started = false;
                try {
                    markerA = markImageSlot(a);
                    markerB = markImageSlot(b);
                    started = true;
                    // Move the native objects. Embedded pixel data stays in the
                    // document; linked images retain their original file links.
                    // Empty markers keep each parent's clipping path and exact
                    // stacking position available for both commit and rollback.
                    a.move(markerB, ElementPlacement.PLACEBEFORE);
                    b.move(markerA, ElementPlacement.PLACEBEFORE);
                    fitImageToSlot(a, stateA, stateB);
                    fitImageToSlot(b, stateB, stateA);
                    verifyImageSlot(a, stateB);
                    verifyImageSlot(b, stateA);
                    try { a.selected = true; } catch (selectAError) {}
                    try { b.selected = true; } catch (selectBError) {}
                    return (missingLinkedSource ? "SWAPPED_MISSING|" : "SWAPPED|") + labelA + "|" + labelB;
                } catch (error) {
                    var rollbackErrors = [];
                    if (started) {
                        try {
                            a.move(markerA, ElementPlacement.PLACEBEFORE);
                            setImageMatrix(a, stateA.matrix);
                            applySlotAppearance(a, stateA);
                            verifyImageSlot(a, stateA);
                        } catch (restoreAError) { rollbackErrors.push(String(restoreAError)); }
                        try {
                            b.move(markerB, ElementPlacement.PLACEBEFORE);
                            setImageMatrix(b, stateB.matrix);
                            applySlotAppearance(b, stateB);
                            verifyImageSlot(b, stateB);
                        } catch (restoreBError) { rollbackErrors.push(String(restoreBError)); }
                    }
                    return "ERR|图片互换失败：" + (error.message || String(error)) +
                        (rollbackErrors.length ? "。恢复未完成，请按 Ctrl+Z 撤回本次操作。" : "。原图片已保留。");
                } finally {
                    // Never delete a marker if it unexpectedly contains art.
                    try { if (markerA && markerA.pageItems.length === 0) markerA.remove(); } catch (cleanupAError) {}
                    try { if (markerB && markerB.pageItems.length === 0) markerB.remove(); } catch (cleanupBError) {}
                }
            }

            var hasMissingLinkedSource = isMissingLinkedSource(a, fileA) ||
                isMissingLinkedSource(b, fileB);
            if (a.typename === "RasterItem" || b.typename === "RasterItem" || hasMissingLinkedSource) {
                return swapImageObjects(hasMissingLinkedSource);
            }

            if (!fileA || !fileB) {
                return "ERR|无法读取其中一张图片的链接路径。";
            }
            if (!fileA.exists || !fileB.exists) {
                return "ERR|其中一张图片的原链接文件已经丢失。";
            }

            var oldHeightA = Number(a.height);
            var oldHeightB = Number(b.height);
            var oldCenterA = getCenter(a);
            var oldCenterB = getCenter(b);
            var oldAngleA = getRotationAngle(a);
            var oldAngleB = getRotationAngle(b);

            if (!(oldHeightA > 0) || !(oldHeightB > 0)) {
                return "ERR|无法读取两张图片的当前高度。";
            }

            var ratioA = getNaturalAspectRatio(fileA);
            var ratioB = getNaturalAspectRatio(fileB);

            if (!(ratioA > 0) || !(ratioB > 0)) {
                return "ERR|无法读取其中一张原图片的自然宽高比。";
            }

            var replacementA = null;
            var replacementB = null;

            try {
                // A 使用 B 的文件；B 使用 A 的文件。
                // 两个新对象都准备成功后，才删除两个原对象。
                replacementA = buildReplacement(
                    a,
                    fileB,
                    oldHeightA,
                    oldCenterA,
                    ratioB,
                    oldAngleA
                );

                replacementB = buildReplacement(
                    b,
                    fileA,
                    oldHeightB,
                    oldCenterB,
                    ratioA,
                    oldAngleB
                );

            } catch (prepareErr) {
                try {
                    if (replacementA) replacementA.remove();
                } catch (cleanupA) {}

                try {
                    if (replacementB) replacementB.remove();
                } catch (cleanupB) {}

                return "ERR|互换图片准备失败：" +
                    (prepareErr.message || String(prepareErr));
            }

            try {
                a.remove();
                b.remove();
            } catch (removeErr) {
                // 如果删除原对象阶段出错，尽量移除新对象。
                try {
                    if (replacementA) replacementA.remove();
                } catch (cleanupA2) {}

                try {
                    if (replacementB) replacementB.remove();
                } catch (cleanupB2) {}

                return "ERR|互换图片提交失败：" +
                    (removeErr.message || String(removeErr));
            }

            try { replacementA.selected = true; } catch (s1) {}
            try { replacementB.selected = true; } catch (s2) {}

            var nameA = "";
            var nameB = "";

            try {
                nameA = decodeURI(fileA.name);
            } catch (n1) {
                nameA = String(fileA.name || "图片1");
            }

            try {
                nameB = decodeURI(fileB.name);
            } catch (n2) {
                nameB = String(fileB.name || "图片2");
            }

            // 不调用 app.redraw()，保持本次脚本操作尽量处于同一个 Undo 记录。
            return "SWAPPED|" + nameA + "|" + nameB;

        } catch (err) {
            return "ERR|" + err.message;
        }
    }

    function recordSwapStatus(message) {
        try {
            if (!cfgFolder.exists && !cfgFolder.create()) return;
            var log = new File(cfgFolder.fsName + "/last-swap.txt");
            log.encoding = "UTF-8";
            if (log.open("w")) {
                log.writeln(new Date().toString() + " | 1.1.18 | " + String(message));
                log.close();
            }
        } catch (logError) {}
    }

    function finishSwapTwoLinks(rawResult, showAlert) {
        setBusy(false);
        var result = String(rawResult || "ERR|Illustrator 未返回图片互换结果，请重试。");
        var parts = result.split("|");
        if (parts[0] === "SWAPPED_MISSING") {
            statusText.text = "互换完成（含缺图）：" + parts[1] + " ⇄ " + parts[2] +
                "；正常图片已移至缺图位置，缺失链接仍需修复；可按 Ctrl+Z 撤回。";
        } else if (parts[0] === "SWAPPED") {
            statusText.text = "互换完成：" + parts[1] + " ⇄ " + parts[2] + "；可按 Ctrl+Z 撤回。";
        } else if (parts[0] === "ERR") {
            statusText.text = parts.slice(1).join("|");
        } else {
            result = "ERR|图片互换没有完成：" + result;
            statusText.text = result.substring(4);
        }
        reportBox.text = statusText.text;
        recordSwapStatus(result);
        if (showAlert && result.indexOf("ERR|") === 0) alert(statusText.text);
        return result;
    }

    function executeSwapTwoLinks() {
        if (cepBusy) return "ERR|请等待当前操作完成。";
        setBusy(true, "正在互换两张图片…");
        reportBox.text = statusText.text;
        recordSwapStatus("RUNNING|CEP");
        try {
            // CSInterface.evalScript already runs in Illustrator. Calling the
            // worker here avoids a hidden ScriptUI event and a second message
            // round trip before we can return the actual operation result.
            return finishSwapTwoLinks(swapTwoLinksWorker(), false);
        } catch (error) {
            return finishSwapTwoLinks("ERR|图片互换失败：" + (error.message || String(error)), false);
        }
    }

    var pendingSwapTalk = null;

    function sendSwapTwoLinks() {
        if (cepBusy) return;
        setBusy(true, "正在互换两张图片…");
        reportBox.text = statusText.text;
        recordSwapStatus("RUNNING|ScriptUI");
        var bt = createHostRequest();
        bt.body = "(" + swapTwoLinksWorker.toString() + ")();";
        // Retain the standalone palette's asynchronous message until it returns.
        pendingSwapTalk = bt;
        bt.onResult = function (res) {
            pendingSwapTalk = null;
            finishSwapTwoLinks(res.body, true);
        };
        bt.onError = function (error) {
            pendingSwapTalk = null;
            finishSwapTwoLinks("ERR|图片互换失败：" + String(error.body || error), true);
        };
        try {
            if (!bt.send()) {
                pendingSwapTalk = null;
                finishSwapTwoLinks("ERR|图片互换请求发送失败，请重试。", true);
            }
        } catch (error) {
            pendingSwapTalk = null;
            finishSwapTwoLinks("ERR|图片互换请求发送失败：" + (error.message || String(error)), true);
        }
    }

    // ---------------------------------------------------------
    // BridgeTalk：自动恢复缺失链接 Worker
    // ---------------------------------------------------------
    function autoRelinkWorker(rawPath, recursive, options) {
        try {
            options = options || {};
            if (app.documents.length < 1) {
                return "ERR|请先打开需要修复链接的 Illustrator 文档。";
            }
            var doc = app.activeDocument;
            if (doc.placedItems.length === 0) {
                return "ERR|当前文档没有外部链接；嵌入图片不需要修复链接。";
            }
            var windows = $.os.toLowerCase().indexOf("windows") >= 0;

            function trimString(value) {
                return String(value || "").replace(/^\s+|\s+$/g, "");
            }
            function cleanOuterQuotes(value) {
                if (value.length > 1 && ((value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
                        (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'"))) {
                    return value.substring(1, value.length - 1);
                }
                return value;
            }
            function safeDecode(value) {
                try { return decodeURI(String(value)); }
                catch (decodeError) { return String(value).replace(/%20/g, " "); }
            }
            function normalizeName(value) {
                var name = safeDecode(value);
                return windows ? name.toLowerCase() : name;
            }
            function normalizePath(value) {
                var text = String(value || "");
                try { text = new File(text).fsName; } catch (pathError) {}
                text = safeDecode(text).replace(/\\/g, "/").replace(/\/+$/, "");
                return windows ? text.toLowerCase() : text;
            }
            function filenameFromPath(value) {
                if (!value) return "";
                try { return safeDecode(new File(String(value)).name); }
                catch (fileError) {
                    var text = safeDecode(value).replace(/\\/g, "/");
                    return text.substring(text.lastIndexOf("/") + 1);
                }
            }
            function looksLikePickupFileName(pathText) {
                return /\.(jpg|jpeg|png|tif|tiff|psd|bmp|gif|webp|pdf|ai|eps|indd|svg|heic|heif|txt|lnk)$/i
                    .test(String(pathText || ""));
            }

            function isRealDirectoryPath(pathText) {
                var folder = null;

                try {
                    folder = new Folder(pathText);
                } catch (folderError) {
                    return false;
                }

                try {
                    if (!folder.exists) return false;
                } catch (existsError) {
                    return false;
                }

                var entries = null;

                try {
                    entries = folder.getFiles();
                } catch (readError) {
                    entries = null;
                }

                if (entries instanceof Array) {
                    if (entries.length === 0 && looksLikePickupFileName(pathText)) return false;
                    return true;
                }

                return !looksLikePickupFileName(pathText);
            }

            function resolveSearchFolder(value) {
                var text = cleanOuterQuotes(trimString(value));
                var candidates = [text, safeDecode(text)];
                for (var c = 0; c < candidates.length; c++) {
                    if (!candidates[c]) continue;
                    try {
                        // Windows 上 Folder.exists 对“已存在的文件路径”也会返回 true，
                        // 必须确认它能被枚举成目录，否则文件会被当成文件夹，
                        // 扫描结果为空 → 替换/修复“点了没反应”。
                        if (isRealDirectoryPath(candidates[c])) {
                            return new Folder(candidates[c]);
                        }
                        var file = new File(candidates[c]);
                        if (file.exists && file.parent.exists) return file.parent;
                    } catch (folderError) {}
                }
                return null;
            }
            function getManifestPaths() {
                if (ExternalObject.AdobeXMPScript === undefined) {
                    ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
                }
                var xmp = new XMPMeta(doc.XMPString);
                var count = xmp.countArrayItems(XMPConst.NS_XMP_MM, "Manifest");
                var paths = [];
                for (var x = 1; x <= count; x++) {
                    var prop = xmp.getProperty(XMPConst.NS_XMP_MM,
                        "xmpMM:Manifest[" + x + "]/stMfs:reference/stRef:filePath");
                    paths.push(prop && prop.value !== undefined && prop.value !== null ? String(prop.value) : "");
                }
                return paths;
            }
            function limitList(values, maxItems) {
                var lines = [];
                for (var l = 0; l < Math.min(values.length, maxItems); l++) lines.push("• " + values[l]);
                if (values.length > maxItems) lines.push("……另外还有 " + (values.length - maxItems) + " 项");
                return lines.join("\n");
            }

            var root = resolveSearchFolder(rawPath);
            if (!root) return "ERR|搜索路径不存在或无法访问：" + rawPath;

            // Snapshot native references before any relink can reorder the collection.
            var records = [];
            var missingCount = 0;
            var alreadyOK = 0;
            var needsManifest = false;
            for (var i = 0; i < doc.placedItems.length; i++) {
                var record = { item: doc.placedItems[i], path: "", name: "", missing: true,
                    skip: doc.placedItems[i] === options.skipItem };
                try {
                    var current = record.item.file;
                    if (current) {
                        record.path = String(current.fsName || current.fullName || "");
                        record.name = filenameFromPath(record.path);
                        record.missing = !current.exists;
                    }
                } catch (missingFileError) {}
                if (record.missing) {
                    if (!record.skip) missingCount++;
                    if (!record.name) needsManifest = true;
                } else if (!record.skip) {
                    alreadyOK++;
                }
                records.push(record);
            }

            var fileIndex = {};
            var scannedFiles = 0;
            var visited = {};
            var folders = [root];
            var unreadableFolders = [];
            while (folders.length) {
                var scanRoot = folders.pop();
                try {
                    if (scanRoot.alias) scanRoot = scanRoot.resolve();
                    if (!scanRoot || !scanRoot.exists) continue;
                    var folderKey = "$" + normalizePath(scanRoot.fsName);
                    if (visited[folderKey]) continue;
                    visited[folderKey] = true;
                    var entries = scanRoot.getFiles();
                    if (!entries) throw new Error("无法列出文件");
                    for (var e = 0; e < entries.length; e++) {
                        var entry = entries[e];
                        if (entry instanceof Folder) {
                            if (recursive) folders.push(entry);
                        } else if (entry instanceof File) {
                            scannedFiles++;
                            var key = "$" + normalizeName(entry.name);
                            if (!fileIndex[key]) fileIndex[key] = [];
                            fileIndex[key].push(entry);
                        }
                    }
                } catch (scanError) {
                    unreadableFolders.push((scanRoot ? scanRoot.fsName : "未知目录") + "：" +
                        (scanError.message || String(scanError)));
                }
            }

            var manifestPaths = [];
            var manifestNote = "";
            if (needsManifest) {
                try { manifestPaths = getManifestPaths(); }
                catch (xmpError) { manifestNote = "历史链接记录读取失败：" + (xmpError.message || String(xmpError)); }
            }

            // Retain the legacy positional fallback only for a saved document
            // with matching counts and no conflict with any readable live path.
            // Live file paths always take priority; stale metadata never blocks them.
            var manifestCurrent = doc.saved === true;
            var positionalManifest = manifestCurrent && manifestPaths.length === records.length;
            if (positionalManifest) {
                for (var p = 0; p < records.length; p++) {
                    if (records[p].path && normalizePath(records[p].path) !== normalizePath(manifestPaths[p])) {
                        positionalManifest = false;
                        break;
                    }
                }
            }
            // A user-confirmed missing image provides an additional filename
            // anchor before any link changes make the document dirty. Validate
            // readable live paths too, and accept only an unambiguous order.
            if (options.allowAnchoredMetadata && manifestPaths.length === records.length) {
                positionalManifest = false;
                manifestCurrent = false;
                var forward = true;
                var backward = true;
                var evidence = 0;
                var anchorName = options.anchorPath ? normalizeName(filenameFromPath(options.anchorPath)) : "";
                for (var a = 0; a < records.length; a++) {
                    if (records[a].path) {
                        evidence++;
                        if (normalizePath(records[a].path) !== normalizePath(manifestPaths[a])) forward = false;
                        if (normalizePath(records[a].path) !== normalizePath(manifestPaths[records.length - 1 - a])) backward = false;
                    } else if (records[a].item === options.anchorItem && anchorName) {
                        var forwardName = normalizeName(filenameFromPath(manifestPaths[a]));
                        var backwardName = normalizeName(filenameFromPath(manifestPaths[records.length - 1 - a]));
                        if (anchorName === forwardName || anchorName === backwardName) {
                            evidence++;
                            if (anchorName !== forwardName) forward = false;
                            if (anchorName !== backwardName) backward = false;
                        }
                    }
                }
                if (evidence > 0 && forward !== backward) {
                    if (backward) manifestPaths.reverse();
                    manifestCurrent = true;
                    positionalManifest = true;
                } else if (evidence > 0 && forward && backward) {
                    for (var same = 0; same < records.length; same++) {
                        if (!records[same].name && normalizeName(filenameFromPath(manifestPaths[same])) ===
                                normalizeName(filenameFromPath(manifestPaths[records.length - 1 - same]))) {
                            records[same].name = filenameFromPath(manifestPaths[same]);
                        }
                    }
                }
            }
            var manifestNames = {};
            var knownNames = {};
            for (var m = 0; m < manifestPaths.length; m++) {
                var manifestName = filenameFromPath(manifestPaths[m]);
                if (manifestName) manifestNames["$" + normalizeName(manifestName)] = manifestName;
            }
            for (var k = 0; k < records.length; k++) {
                if (records[k].name) knownNames["$" + normalizeName(records[k].name)] = true;
            }
            var remainingNames = [];
            for (var candidate in manifestNames) {
                if (manifestNames.hasOwnProperty(candidate) && !knownNames[candidate]) {
                    remainingNames.push(manifestNames[candidate]);
                }
            }

            var relinkedCount = 0;
            var unidentified = [];
            var notFound = [];
            var ambiguous = [];
            var errors = [];
            for (var r = 0; r < records.length; r++) {
                var target = records[r];
                if (!target.missing || target.skip) continue;
                var oldName = target.name;
                if (!oldName) {
                    // An explicit filename on the item can identify it without
                    // assigning unrelated manifest entries by array position.
                    try {
                        var itemName = trimString(target.item.name);
                        if (/\.(jpg|jpeg|png|tif|tiff|psd|bmp|gif|webp|pdf|ai|eps)$/i.test(itemName) &&
                                itemName.indexOf("/") < 0 && itemName.indexOf("\\") < 0) {
                            oldName = itemName;
                        }
                    } catch (nameError) {}
                    if (!oldName && positionalManifest) oldName = filenameFromPath(manifestPaths[r]);
                    if (!oldName && manifestCurrent && manifestPaths.length === records.length &&
                            remainingNames.length === 1) oldName = remainingNames[0];
                }
                if (!oldName) {
                    unidentified.push("第 " + (r + 1) + " 个链接");
                    continue;
                }
                var matches = fileIndex["$" + normalizeName(oldName)];
                if (!matches || !matches.length) {
                    notFound.push(oldName);
                    continue;
                }
                if (matches.length !== 1) {
                    ambiguous.push(oldName + "（找到 " + matches.length + " 个同名文件）");
                    continue;
                }
                try {
                    if (typeof target.item.relink === "function") target.item.relink(matches[0]);
                    else target.item.file = matches[0];
                    var linked = target.item.file;
                    if (!linked || !linked.exists || normalizePath(linked.fsName) !== normalizePath(matches[0].fsName)) {
                        throw new Error("Illustrator 未确认新链接");
                    }
                    relinkedCount++;
                } catch (relinkError) {
                    errors.push(oldName + " → " + (relinkError.message || String(relinkError)));
                }
            }
            if (relinkedCount) {
                try { app.redraw(); } catch (redrawError) {}
            }

            var report = ["缺图修复扫描完成", "搜索目录：" + root.fsName,
                "搜索子目录：" + (recursive ? "是" : "否"), "",
                "扫描文件数：" + scannedFiles, "检测到缺失链接：" + missingCount,
                "成功重新链接：" + relinkedCount, "原本正常：" + alreadyOK,
                "未找到同名文件：" + notFound.length, "同名冲突：" + ambiguous.length,
                "无法识别原文件名：" + unidentified.length, "错误：" + errors.length];
            if (!missingCount) report.push("\n当前文档没有缺失链接。");
            if (!recursive && (notFound.length || !scannedFiles)) {
                report.push("\n图片若在下级文件夹，请勾选“搜索子目录”后重新运行缺图修复。");
            }
            if (notFound.length) report.push("\n【未找到同名文件】\n" + limitList(notFound, 40));
            if (ambiguous.length) report.push("\n【同名冲突，已跳过】\n" + limitList(ambiguous, 30));
            if (unidentified.length) {
                report.push("\n【无法识别原文件名，已跳过】\n" + limitList(unidentified, 20));
                if (doc.saved !== true) {
                    report.push("这些链接无法读取原路径，历史记录可能已过期。请手动保存文档后重试，或用“替换图片”指定新文件。");
                } else {
                    report.push("历史记录无法与当前图片确认对应；可用“替换图片”指定新文件。");
                }
            }
            if (manifestNote) report.push("\n" + manifestNote);
            if (errors.length) report.push("\n【重新链接错误】\n" + limitList(errors, 20));
            if (unreadableFolders.length) {
                report.push("\n【无法访问的目录】\n" + limitList(unreadableFolders, 20));
            }
            return "REPORT|" + root.fsName + "|" + scannedFiles + "|" + missingCount + "|" +
                relinkedCount + "|" + alreadyOK + "|" + notFound.length + "|" + ambiguous.length + "|" +
                unidentified.length + "|" + errors.length + "|" + report.join("\n");
        } catch (error) {
            return "ERR|缺图修复失败：" + (error.message || String(error));
        }
    }

    function recordMissingRepairStatus(message) {
        try {
            if (!cfgFolder.exists && !cfgFolder.create()) return;
            var log = new File(cfgFolder.fsName + "/last-missing-repair.txt");
            log.encoding = "UTF-8";
            if (log.open("w")) {
                log.writeln(new Date().toString() + " | 1.1.18 | " + String(message));
                log.close();
            }
        } catch (logError) {}
    }

    // ---------------------------------------------------------
    // BridgeTalk：AI 文件无损扫描 / 优化
    // ---------------------------------------------------------
    function optimizeWorker(action, destPath, pdfCompatible, embedICCProfile) {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开 Illustrator 文档。";
            }

            var doc = app.activeDocument;

            function fmtBytes(n) {
                n = Number(n || 0);
                if (!(n >= 0)) return "未知";
                var units = ["B", "KB", "MB", "GB", "TB"];
                var i = 0;
                while (n >= 1024 && i < units.length - 1) {
                    n /= 1024;
                    i++;
                }
                var d = (i >= 3) ? 2 : (i === 2 ? 1 : 0);
                return n.toFixed(d) + " " + units[i];
            }

            function fileSizeOfDocument(d) {
                try {
                    if (d.fullName) {
                        var f = new File(d.fullName);
                        if (f.exists) return Number(f.length);
                    }
                } catch (e) {}
                return -1;
            }

            function scanDocument(d) {
                var linked = 0;
                var missing = 0;
                var embeddedRaster = 0;
                var linkedBytes = 0;
                var linkedBytesKnown = 0;

                try {
                    linked = d.placedItems.length;
                } catch (e0) {}

                for (var i = 0; i < linked; i++) {
                    try {
                        var f = d.placedItems[i].file;
                        if (!f || !f.exists) {
                            missing++;
                        } else {
                            try {
                                linkedBytes += Number(f.length || 0);
                                linkedBytesKnown++;
                            } catch (e1) {}
                        }
                    } catch (e2) {
                        missing++;
                    }
                }

                try {
                    embeddedRaster = d.rasterItems.length;
                } catch (e3) {}

                var artboards = 0;
                try {
                    artboards = d.artboards.length;
                } catch (e4) {}

                return {
                    fileBytes: fileSizeOfDocument(d),
                    linked: linked,
                    missing: missing,
                    embeddedRaster: embeddedRaster,
                    linkedBytes: linkedBytes,
                    linkedBytesKnown: linkedBytesKnown,
                    artboards: artboards
                };
            }

            function safeCompatibility() {
                // Illustrator 的脚本文档长期只列到 ILLUSTRATOR19，
                // 但部分新版可能暴露更高常量。优先选择当前环境可用的最高版本。
                for (var n = 40; n >= 19; n--) {
                    try {
                        var c = eval("Compatibility.ILLUSTRATOR" + n);
                        if (c !== undefined && c !== null) return c;
                    } catch (e) {}
                }

                try {
                    return Compatibility.ILLUSTRATOR19;
                } catch (e2) {
                    return null;
                }
            }

            var scan = scanDocument(doc);

            if (action === "scan") {
                return "SCAN|" +
                    scan.fileBytes + "|" +
                    scan.linked + "|" +
                    scan.missing + "|" +
                    scan.embeddedRaster + "|" +
                    scan.linkedBytes + "|" +
                    scan.linkedBytesKnown + "|" +
                    scan.artboards;
            }

            if (action !== "optimize" && action !== "overwrite") {
                return "ERR|未知优化操作。";
            }

            if (!destPath) {
                return "ERR|没有指定保存路径。";
            }

            var dest = new File(destPath);
            if (!/\.ai$/i.test(dest.fsName)) return "ERR|保存位置必须是 .ai 文件。";
            if (action === "overwrite") {
                var original;
                try { original = new File(doc.fullName); }
                catch (sourceError) { return "ERR|当前文档尚未保存，请使用“优化另存”。"; }
                if (!original.exists || original.fsName.toLowerCase() !== dest.fsName.toLowerCase()) {
                    return "ERR|当前文档已变化，已取消覆盖保存，请重新点击“覆盖保存”。";
                }
            }

            // 保存 AI 文件，只改变保存结构，不处理图像像素或页面对象。
            var opt = new IllustratorSaveOptions();

            var compat = safeCompatibility();
            if (compat !== null) {
                try { opt.compatibility = compat; } catch (compatErr) {}
            }

            opt.pdfCompatible = !!pdfCompatible;
            opt.embedLinkedFiles = false;
            opt.compressed = true;
            opt.embedICCProfile = !!embedICCProfile;

            // 使用当前格式兼容性时不会触发旧版透明度拼合；
            // 明确保留外观作为额外保护。
            try {
                opt.flattenOutput = OutputFlattening.PRESERVEAPPEARANCE;
            } catch (flatErr) {}

            doc.saveAs(dest, opt);
            try { app.redraw(); } catch (redrawError) {}
            dest = new File(dest.fsName);
            if (!dest.exists) return "ERR|Illustrator 未生成保存文件，请检查保存位置。";

            var afterBytes = -1;
            try {
                if (dest.exists) afterBytes = Number(dest.length);
            } catch (sizeErr) {}

            return "OPTIMIZED|" +
                scan.fileBytes + "|" +
                afterBytes + "|" +
                scan.linked + "|" +
                scan.missing + "|" +
                scan.embeddedRaster + "|" +
                dest.fsName;

        } catch (err) {
            return "ERR|" + err.message;
        }
    }

    function sendOptimize(action, destPath) {
        setBusy(true, action === "scan" ? "正在扫描当前 AI 文件…" : "正在无损优化并保存…");

        var bt = createHostRequest();

        bt.body =
            "(" + optimizeWorker.toString() + ")(" +
            jsQuote(action) + "," +
            jsQuote(destPath || "") + "," +
            (pdfCompatCb.value ? "true" : "false") + "," +
            (iccCb.value ? "true" : "false") +
            ");";

        bt.onResult = function (res) {
            setBusy(false);

            var result = String(res.body);
            var p = result.split("|");

            if (p[0] === "ERR") {
                var msg = p.slice(1).join("|");
                statusText.text = msg;
                optimizeInfo.text = msg;
                return;
            }

            if (p[0] === "SCAN") {
                var beforeBytes = Number(p[1]);
                var linked = Number(p[2]);
                var missing = Number(p[3]);
                var embedded = Number(p[4]);
                var linkedBytes = Number(p[5]);
                var known = Number(p[6]);
                var artboards = Number(p[7]);

                var lines = [];
                lines.push("AI 文件大小：" + formatBytesUI(beforeBytes));
                lines.push("画板：" + artboards);
                lines.push("链接图片：" + linked);
                lines.push("缺失链接：" + missing);
                lines.push("嵌入位图：" + embedded);

                if (known > 0) {
                    lines.push("可读取的链接源文件总大小：" + formatBytesUI(linkedBytes));
                }

                if (missing > 0) {
                    lines.push("");
                    lines.push("⚠ 当前存在缺失链接，建议先到“链接”页签恢复。");
                }

                if (embedded > 0) {
                    lines.push("⚠ 检测到嵌入位图；本功能不会擅自删除或转链接。");
                }

                lines.push("");
                lines.push(
                    pdfCompatCb.value ?
                    "当前模式：保留 PDF 兼容数据（体积可能仍较大）" :
                    "当前模式：最大无损瘦身（关闭 PDF 兼容数据）"
                );

                optimizeInfo.text = lines.join("\n");
                statusText.text = "扫描完成。";
                return;
            }

            if (p[0] === "OPTIMIZED") {
                var before = Number(p[1]);
                var after = Number(p[2]);
                var outPath = p.slice(6).join("|");
                var reduced = (before >= 0 && after >= 0) ? before - after : -1;
                var percent = (before > 0 && after >= 0)
                    ? ((before - after) / before * 100)
                    : NaN;

                var lines2 = [];
                lines2.push("优化完成。");
                lines2.push("");
                lines2.push("优化前：" + formatBytesUI(before));
                lines2.push("优化后：" + formatBytesUI(after));

                if (reduced >= 0) {
                    lines2.push("减少：" + formatBytesUI(reduced));
                }

                if (!isNaN(percent)) {
                    lines2.push("缩减：" + percent.toFixed(1) + "%");
                }

                lines2.push("");
                lines2.push("链接图片：" + p[3]);
                lines2.push("缺失链接：" + p[4]);
                lines2.push("嵌入位图：" + p[5]);
                lines2.push("");
                lines2.push("保存到：");
                lines2.push(outPath);

                optimizeInfo.text = lines2.join("\n");
                statusText.text = "无损优化完成：" + formatBytesUI(before) + " → " + formatBytesUI(after);
                return;
            }

            statusText.text = result;
            optimizeInfo.text = result;
        };

        bt.onError = function (err) {
            setBusy(false);
            statusText.text = "无损优化执行失败。";
            optimizeInfo.text = "脚本执行失败：\n" + err.body;
        };

        bt.send();
    }

    function formatBytesUI(n) {
        n = Number(n);
        if (!(n >= 0)) return "未知 / 文档尚未保存";

        var units = ["B", "KB", "MB", "GB", "TB"];
        var i = 0;

        while (n >= 1024 && i < units.length - 1) {
            n /= 1024;
            i++;
        }

        var d = (i >= 3) ? 2 : (i === 2 ? 1 : 0);
        return n.toFixed(d) + " " + units[i];
    }

    function defaultOptimizedPath() {
        if (app.documents.length < 1) return "";

        var doc = app.activeDocument;
        var baseName = "Optimized.ai";
        var folder = Folder.desktop;

        try {
            if (doc.fullName) {
                var f = new File(doc.fullName);
                folder = f.parent;

                var name = f.name;
                try { name = decodeURI(name); } catch (e0) {}

                name = name.replace(/\.[^\.]+$/, "");
                baseName = name + "_Optimized.ai";
            } else {
                var dn = doc.name || "Untitled";
                dn = dn.replace(/\.[^\.]+$/, "");
                baseName = dn + "_Optimized.ai";
            }
        } catch (e1) {}

        return new File(folder.fsName + "/" + baseName).fsName;
    }


    // ---------------------------------------------------------
    // 无损优化：由 Illustrator 主脚本环境弹出“另存为”窗口
    // 不依赖 system.callSystem / PowerShell。
    // ---------------------------------------------------------
    function optimizeDestinationWorker() {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开需要优化的 Illustrator 文档。";
            }

            var doc = app.activeDocument;
            var originalPath = "";
            var defaultPath = "";

            try {
                if (doc.fullName) {
                    var originalFile = new File(doc.fullName);
                    originalPath = originalFile.fsName;

                    var baseName = originalFile.name;
                    try { baseName = decodeURI(baseName); } catch (e0) {}
                    baseName = baseName.replace(/\.[^\.]+$/, "");

                    defaultPath = new File(
                        originalFile.parent.fsName + "/" +
                        baseName + "_Optimized.ai"
                    ).fsName;
                } else {
                    var docName = doc.name || "Untitled";
                    docName = docName.replace(/\.[^\.]+$/, "");

                    defaultPath = new File(
                        Folder.desktop.fsName + "/" +
                        docName + "_Optimized.ai"
                    ).fsName;
                }
            } catch (pathErr) {
                defaultPath = new File(
                    Folder.desktop.fsName + "/Optimized.ai"
                ).fsName;
            }

            var defaultFile = new File(defaultPath);
            var dest = null;

            try {
                dest = defaultFile.saveDlg(
                    "无损优化另存为",
                    "Adobe Illustrator:*.ai"
                );
            } catch (dlgErr) {
                return "ERR|打开 Illustrator 另存为窗口失败：" + dlgErr.message;
            }

            if (!dest) {
                return "CANCEL|已取消无损优化保存。";
            }

            var destPath = dest.fsName;

            if (!/\.ai$/i.test(destPath)) {
                destPath += ".ai";
                dest = new File(destPath);
            }

            // 为保护原稿，禁止把优化结果直接保存到当前原文件。
            if (originalPath) {
                try {
                    var a = new File(originalPath).fsName.toLowerCase();
                    var b = new File(destPath).fsName.toLowerCase();

                    if (a === b) {
                        return "ERR|为了保护原稿，不能直接覆盖当前 AI 文件。请使用不同文件名，例如：_Optimized.ai";
                    }
                } catch (cmpErr) {}
            }

            return "DEST|" + dest.fsName;

        } catch (err) {
            return "ERR|" + err.message;
        }
    }

    function currentDocumentPathWorker() {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开需要覆盖保存的 Illustrator 文档。";
            }

            var doc = app.activeDocument;
            var currentFile;

            try {
                currentFile = new File(doc.fullName);
            } catch (pathErr) {
                return "ERR|当前文档尚未保存，请先保存文档后再使用“覆盖保存”。";
            }

            if (!currentFile.exists) {
                return "ERR|当前 AI 文件不存在，无法覆盖保存。";
            }

            if (!/\.ai$/i.test(currentFile.fsName)) {
                return "ERR|当前文档不是 AI 文件，请使用“优化另存”。";
            }

            return "DEST|" + currentFile.fsName;
        } catch (err) {
            return "ERR|" + err.message;
        }
    }

    function requestOverwriteDestination(callback) {
        statusText.text = "正在读取当前文件位置…";
        try { win.update(); } catch (e0) {}

        var bt = createHostRequest();
        bt.body = "(" + currentDocumentPathWorker.toString() + ")();";

        bt.onResult = function (res) {
            var result = String(res.body || "");
            var p = result.split("|");

            if (p[0] === "ERR") {
                var msg = p.slice(1).join("|");
                statusText.text = msg;
                alert(msg);
                return;
            }

            if (p[0] !== "DEST") {
                statusText.text = "无法取得当前文件位置。";
                alert("无法取得当前文件位置：\n" + result);
                return;
            }

            var destPath = p.slice(1).join("|");
            if (!destPath) {
                statusText.text = "没有取得当前文件位置。";
                return;
            }

            callback(destPath);
        };

        bt.onError = function (err) {
            statusText.text = "读取当前文件位置失败。";
            alert(
                "读取当前文件位置失败：\n" +
                String(err.body || err)
            );
        };

        bt.send();
    }

    function requestOptimizeDestination(callback) {
        statusText.text = "正在打开另存为窗口…";
        try { win.update(); } catch (e0) {}

        var bt = createHostRequest();
        bt.body = "(" + optimizeDestinationWorker.toString() + ")();";

        bt.onResult = function (res) {
            var result = String(res.body || "");
            var p = result.split("|");

            if (p[0] === "CANCEL") {
                statusText.text = p.slice(1).join("|");
                return;
            }

            if (p[0] === "ERR") {
                var msg = p.slice(1).join("|");
                statusText.text = msg;
                alert(msg);
                return;
            }

            if (p[0] !== "DEST") {
                statusText.text = "无法取得保存位置。";
                alert("无法取得保存位置：\n" + result);
                return;
            }

            var destPath = p.slice(1).join("|");

            if (!destPath) {
                statusText.text = "没有选择保存位置。";
                return;
            }

            callback(destPath);
        };

        bt.onError = function (err) {
            statusText.text = "打开另存为窗口失败。";
            alert(
                "打开 Illustrator 另存为窗口失败：\n" +
                String(err.body || err)
            );
        };

        bt.send();
    }


    // ---------------------------------------------------------
    // 批量替换：直接在当前 ScriptUI 引擎中选择来源
    // 只把“纯路径字符串”交给 BridgeTalk，避免 File 对象跨环境失效。
    // ---------------------------------------------------------
    function getPathStringFromPicked(obj) {
        if (!obj) return "";

        var s = "";

        try {
            if (obj.fsName) s = String(obj.fsName);
        } catch (e0) {}

        if (!s) {
            try {
                if (obj.fullName) s = String(obj.fullName);
            } catch (e1) {}
        }

        if (!s) {
            try {
                s = String(obj);
            } catch (e2) {}
        }

        // 去掉部分环境可能带上的外层引号
        if (
            s.length >= 2 &&
            (
                (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
                (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")
            )
        ) {
            s = s.substring(1, s.length - 1);
        }

        return s;
    }

    function isBatchSupportedPath(pathText) {
        return /\.(jpg|jpeg|png|tif|tiff|psd|bmp|gif|webp|pdf|ai|eps)$/i.test(
            String(pathText || "")
        );
    }

    function naturalComparePathStrings(a, b) {
        function chunks(s) {
            return String(s || "").toLowerCase().match(/(\d+|\D+)/g) || [String(s || "")];
        }

        var ax = chunks(a);
        var bx = chunks(b);
        var n = Math.min(ax.length, bx.length);

        for (var i = 0; i < n; i++) {
            if (ax[i] === bx[i]) continue;

            var an = /^\d+$/.test(ax[i]) ? parseInt(ax[i], 10) : NaN;
            var bn = /^\d+$/.test(bx[i]) ? parseInt(bx[i], 10) : NaN;

            if (!isNaN(an) && !isNaN(bn) && an !== bn) {
                return an < bn ? -1 : 1;
            }

            return ax[i] < bx[i] ? -1 : 1;
        }

        if (ax.length === bx.length) return 0;
        return ax.length < bx.length ? -1 : 1;
    }

    function collectBatchFolderPaths(folder, outPaths, visited) {
        visited = visited || {};
        try { if (folder.alias) folder = folder.resolve() || folder; } catch (aliasErr) {}
        var folderKey = "$" + folder.fsName;
        if ($.os.toLowerCase().indexOf("windows") >= 0) folderKey = folderKey.toLowerCase();
        if (visited[folderKey]) return;
        visited[folderKey] = true;
        var entries = [];

        try {
            entries = folder.getFiles();
        } catch (e0) {
            return;
        }

        if (!entries) return;

        entries.sort(function (a, b) {
            var aa = "";
            var bb = "";

            try { aa = decodeURI(a.name); } catch (e1) { aa = String(a.name || ""); }
            try { bb = decodeURI(b.name); } catch (e2) { bb = String(b.name || ""); }

            return naturalComparePathStrings(aa, bb);
        });

        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var isFolder = false;

            try {
                isFolder = (entry instanceof Folder);
            } catch (e3) {}

            if (!isFolder) {
                try {
                    isFolder = String(entry.typename || "") === "Folder";
                } catch (e4) {}
            }

            if (isFolder) {
                collectBatchFolderPaths(entry, outPaths, visited);
                continue;
            }

            var p = getPathStringFromPicked(entry);

            if (p && isBatchSupportedPath(p)) {
                outPaths.push(p);
            }
        }
    }

    // Use the Windows Common Item Dialog; this script only exchanges paths.
    function chooseBatchSourceItems(initialFolder) {
        if ($.os.toLowerCase().indexOf("windows") < 0) {
            var selected = File.openDialog(
                "选择用于批量替换的图片",
                function (entry) {
                    return entry instanceof Folder || isBatchSupportedPath(getPathStringFromPicked(entry));
                },
                true
            );
            if (!selected) return null;
            var selectedPaths = [];
            for (var i = 0; i < selected.length; i++) selectedPaths.push(getPathStringFromPicked(selected[i]));
            return selectedPaths;
        }

        if (!nativeBatchPickerFile.exists) {
            throw new Error("找不到图片选择窗口，请保留脚本同目录的 CEP/native 文件夹，或安装灵绘扩展。");
        }

        var token = "ArtPilot_BatchPicker_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000000);
        var launcher = new File(Folder.temp.fsName + "/" + token + ".exe");
        var request = new File(launcher.fsName + ".request.txt");
        var output = new File(Folder.temp.fsName + "/" + token + ".result.txt");
        try {
            // File.execute() has no argument parameter. A unique executable
            // copy reads its own request, so parallel sessions cannot mix paths.
            if (!nativeBatchPickerFile.copy(launcher.fsName)) {
                throw new Error("无法准备 Windows 选择窗口。");
            }
            request.encoding = "UTF-8";
            if (!request.open("w")) throw new Error("无法创建选择窗口请求。");
            request.write(output.fsName + "\n" + initialFolder.fsName + "\n");
            request.close();
            if (!launcher.execute()) throw new Error("无法打开 Windows 选择窗口。");

            var started = new Date().getTime();
            while (!output.exists) {
                if (new Date().getTime() - started > 30 * 60 * 1000) {
                    throw new Error("Windows 选择窗口未返回结果。");
                }
                $.sleep(100);
            }
            output.encoding = "UTF-8";
            if (!output.open("r")) throw new Error("无法读取选择结果。");
            var lines = output.read().replace(/^\uFEFF/, "").split(/\r?\n/);
            output.close();
            var state = lines.shift();
            if (state === "cancel") return null;
            if (state !== "ok") throw new Error(lines.join("\n") || "Windows 选择窗口执行失败。");
            var items = [];
            for (var p = 0; p < lines.length; p++) {
                if (lines[p]) items.push(lines[p]);
            }
            return items;
        } finally {
            try { if (request.opened) request.close(); request.remove(); } catch (requestErr) {}
            try { if (output.opened) output.close(); output.remove(); } catch (outputErr) {}
            try { launcher.remove(); } catch (launcherErr) {}
        }
    }
    function collectBatchSourcePaths(items) {
        var paths = [];
        var visitedFolders = {};
        for (var i = 0; i < items.length; i++) {
            var rawPath = getPathStringFromPicked(items[i]);
            if (!rawPath) continue;
            if (isRealDirectoryPath(rawPath)) {
                collectBatchFolderPaths(new Folder(rawPath), paths, visitedFolders);
            } else if (isBatchSupportedPath(rawPath)) {
                var file = new File(rawPath);
                if (file.exists) paths.push(file.fsName);
            }
        }

        var uniquePaths = [];
        var seen = {};
        var windows = $.os.toLowerCase().indexOf("windows") >= 0;
        for (var p = 0; p < paths.length; p++) {
            var key = "$" + (windows ? paths[p].toLowerCase() : paths[p]);
            if (!seen[key]) {
                seen[key] = true;
                uniquePaths.push(paths[p]);
            }
        }
        uniquePaths.sort(naturalComparePathStrings);
        return uniquePaths;
    }

    function pickBatchSourcePathsDirect() {
        var initial = resolveInitialFolder(cfg.lastFolder) || Folder.desktop;
        var items = chooseBatchSourceItems(initial);
        if (items === null) return null;
        return prepareBatchSourceItems(items);
    }

    function prepareBatchSourceItems(items) {
        var paths = collectBatchSourcePaths(items);
        if (paths.length > 0) {
            try {
                // 只能记真正的目录；否则会把图片文件路径写进配置，
                // 下次打开缺图修复选择窗口都会用到错误路径。
                var firstPath = getPathStringFromPicked(items[0]);
                if (isRealDirectoryPath(firstPath)) {
                    cfg.lastFolder = new Folder(firstPath).fsName;
                    saveConfig(cfg);
                } else {
                    var firstFile = new File(firstPath);
                    if (firstFile.exists && firstFile.parent && firstFile.parent.exists) {
                        cfg.lastFolder = firstFile.parent.fsName;
                        saveConfig(cfg);
                    }
                }
            } catch (saveFolderErr) {}
        }
        return paths;
    }
    function pathPickerWorker(modeFolder, initialFolderPath, dialogTitle) {
        try {
            if (initialFolderPath) {
                try {
                    // 初始路径可能是图片文件，先解析成真正的目录，否则窗口会开错位置
                    var initial = resolveInitialFolder(initialFolderPath);
                    if (initial) {
                        Folder.current = initial;
                    }
                } catch (e0) {}
            }

            if (modeFolder) {
                var folder = Folder.selectDialog(dialogTitle || "选择文件夹");

                if (!folder) {
                    return "CANCEL|已取消选择。";
                }

                return "PICK|" + folder.fsName;
            }

            var fileFilter = null;

            if ($.os.toLowerCase().indexOf("windows") >= 0) {
                fileFilter =
                    "图片及可置入文件:" +
                    "*.jpg;*.jpeg;*.png;*.tif;*.tiff;*.psd;*.bmp;*.gif;*.webp;*.pdf;*.ai;*.eps," +
                    "所有文件:*.*";
            } else {
                fileFilter = function (f) {
                    if (f instanceof Folder) return true;
                    return /\.(jpg|jpeg|png|tif|tiff|psd|bmp|gif|webp|pdf|ai|eps)$/i.test(f.name);
                };
            }

            var file = File.openDialog(
                dialogTitle || "选择文件",
                fileFilter,
                false
            );

            if (!file) {
                return "CANCEL|已取消选择。";
            }

            return "PICK|" + file.fsName;

        } catch (err) {
            return "ERR|" + err.message;
        }
    }

    function requestPathPicker(modeFolder, initialFolderPath, dialogTitle, callback) {
        if (cepBusy) return;
        setBusy(true, modeFolder ? "正在打开文件夹选择窗口…" : "正在打开文件选择窗口…");
        reportBox.text = statusText.text;
        try { win.update(); } catch (updateError) {}

        try {
            // A native path dialog needs no application launch or document
            // access. Run it in this already-running Illustrator session.
            var result = String(pathPickerWorker(modeFolder, initialFolderPath || "", dialogTitle || ""));
            setBusy(false);
            var parts = result.split("|");
            if (parts[0] === "PICK") {
                callback(parts.slice(1).join("|"));
            } else if (parts[0] === "CANCEL") {
                statusText.text = parts.slice(1).join("|");
                reportBox.text = statusText.text;
            } else {
                statusText.text = "打开选择窗口失败：" +
                    (parts[0] === "ERR" ? parts.slice(1).join("|") : result);
                reportBox.text = statusText.text;
            }
        } catch (error) {
            setBusy(false);
            statusText.text = "打开选择窗口失败：" + (error.message || String(error));
            reportBox.text = statusText.text;
        }
    }

    // ---------------------------------------------------------
    // 现代 Windows 选择器
    // ---------------------------------------------------------
    function pickPath(modeFolder, initialFolderPath) {
        var isWindows = $.os.toLowerCase().indexOf("windows") >= 0;

        if (isWindows) {
            return modernWindowsPicker(modeFolder, initialFolderPath);
        }

        // 非 Windows：降级为系统标准选择器
        if (modeFolder) {
            var folder = Folder.selectDialog("选择文件夹");
            return folder ? folder.fsName : "";
        }

        var file = File.openDialog("选择文件");
        return file ? file.fsName : "";
    }

    function modernWindowsPicker(modeFolder, initialFolderPath) {
        var psFile = new File(Folder.temp.fsName + "/AI_MergedToolbox_ModernPicker.ps1");

        var ps = [];
        ps.push("$ErrorActionPreference = 'Stop'");
        ps.push("$pickFolder = " + (modeFolder ? "$true" : "$false"));
        ps.push("$initialPath = '" + psEscape(initialFolderPath || "") + "'");
        ps.push("");
        ps.push("Add-Type -TypeDefinition @'");
        ps.push("using System;");
        ps.push("using System.Runtime.InteropServices;");
        ps.push("");
        ps.push("public static class NativePicker");
        ps.push("{");
        ps.push("    [ComImport, Guid(\"DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7\")]");
        ps.push("    private class FileOpenDialogRCW { }");
        ps.push("");
        ps.push("    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid(\"42F85136-DB7E-439C-85F1-E4075D135FC8\")]");
        ps.push("    private interface IFileDialog");
        ps.push("    {");
        ps.push("        [PreserveSig] int Show(IntPtr parent);");
        ps.push("        void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);");
        ps.push("        void SetFileTypeIndex(uint iFileType);");
        ps.push("        void GetFileTypeIndex(out uint piFileType);");
        ps.push("        void Advise(IntPtr pfde, out uint pdwCookie);");
        ps.push("        void Unadvise(uint dwCookie);");
        ps.push("        void SetOptions(uint fos);");
        ps.push("        void GetOptions(out uint pfos);");
        ps.push("        void SetDefaultFolder(IShellItem psi);");
        ps.push("        void SetFolder(IShellItem psi);");
        ps.push("        void GetFolder(out IShellItem ppsi);");
        ps.push("        void GetCurrentSelection(out IShellItem ppsi);");
        ps.push("        void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);");
        ps.push("        void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);");
        ps.push("        void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);");
        ps.push("        void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);");
        ps.push("        void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);");
        ps.push("        void GetResult(out IShellItem ppsi);");
        ps.push("        void AddPlace(IShellItem psi, int alignment);");
        ps.push("        void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string pszDefaultExtension);");
        ps.push("        void Close(int hr);");
        ps.push("        void SetClientGuid(ref Guid guid);");
        ps.push("        void ClearClientData();");
        ps.push("        void SetFilter(IntPtr pFilter);");
        ps.push("    }");
        ps.push("");
        ps.push("    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid(\"43826D1E-E718-42EE-BC55-A1E261C37BFE\")]");
        ps.push("    private interface IShellItem");
        ps.push("    {");
        ps.push("        void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);");
        ps.push("        void GetParent(out IShellItem ppsi);");
        ps.push("        void GetDisplayName(uint sigdnName, out IntPtr ppszName);");
        ps.push("        void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);");
        ps.push("        void Compare(IShellItem psi, uint hint, out int piOrder);");
        ps.push("    }");
        ps.push("");
        ps.push("    [DllImport(\"shell32.dll\", CharSet = CharSet.Unicode, PreserveSig = false)]");
        ps.push("    private static extern void SHCreateItemFromParsingName(");
        ps.push("        [MarshalAs(UnmanagedType.LPWStr)] string pszPath,");
        ps.push("        IntPtr pbc,");
        ps.push("        ref Guid riid,");
        ps.push("        [MarshalAs(UnmanagedType.Interface)] out IShellItem ppv);");
        ps.push("");
        ps.push("    private const uint FOS_PICKFOLDERS = 0x00000020;");
        ps.push("    private const uint FOS_FORCEFILESYSTEM = 0x00000040;");
        ps.push("    private const uint FOS_PATHMUSTEXIST = 0x00000800;");
        ps.push("    private const uint FOS_FILEMUSTEXIST = 0x00001000;");
        ps.push("    private const uint SIGDN_FILESYSPATH = 0x80058000;");
        ps.push("");
        ps.push("    public static string Pick(bool folder, string initialPath)");
        ps.push("    {");
        ps.push("        IFileDialog dialog = (IFileDialog)new FileOpenDialogRCW();");
        ps.push("        uint options;");
        ps.push("        dialog.GetOptions(out options);");
        ps.push("        options |= FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST;");
        ps.push("        if (folder) options |= FOS_PICKFOLDERS;");
        ps.push("        else options |= FOS_FILEMUSTEXIST;");
        ps.push("        dialog.SetOptions(options);");
        ps.push("        dialog.SetTitle(folder ? \"选择文件夹\" : \"选择文件\");");
        ps.push("");
        ps.push("        if (!String.IsNullOrWhiteSpace(initialPath))");
        ps.push("        {");
        ps.push("            try");
        ps.push("            {");
        ps.push("                Guid iid = typeof(IShellItem).GUID;");
        ps.push("                IShellItem initialItem;");
        ps.push("                SHCreateItemFromParsingName(initialPath, IntPtr.Zero, ref iid, out initialItem);");
        ps.push("                dialog.SetFolder(initialItem);");
        ps.push("            }");
        ps.push("            catch { }");
        ps.push("        }");
        ps.push("");
        ps.push("        int hr = dialog.Show(IntPtr.Zero);");
        ps.push("        if (hr != 0) return null;");
        ps.push("");
        ps.push("        IShellItem result;");
        ps.push("        dialog.GetResult(out result);");
        ps.push("        IntPtr ptr;");
        ps.push("        result.GetDisplayName(SIGDN_FILESYSPATH, out ptr);");
        ps.push("        try { return Marshal.PtrToStringUni(ptr); }");
        ps.push("        finally { Marshal.FreeCoTaskMem(ptr); }");
        ps.push("    }");
        ps.push("}");
        ps.push("'@");
        ps.push("");
        ps.push("$r = [NativePicker]::Pick($pickFolder, $initialPath)");
        ps.push("if ($null -ne $r) { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Write-Output $r }");

        try {
            psFile.encoding = "UTF-8";

            if (!psFile.open("w")) {
                alert("无法创建临时选择器脚本。");
                return "";
            }

            psFile.write(ps.join("\r\n"));
            psFile.close();

        } catch (writeErr) {
            try {
                if (psFile.opened) psFile.close();
            } catch (ignore1) {}

            alert("创建现代选择器失败：\n" + writeErr.message);
            return "";
        }

        var cmd =
            'powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "' +
            psFile.fsName +
            '"';

        var output = "";

        try {
            output = system.callSystem(cmd);
        } catch (callErr) {
            try { psFile.remove(); } catch (ignore2) {}
            alert("调用 Windows 现代选择器失败：\n" + callErr.message);
            return "";
        }

        try { psFile.remove(); } catch (ignore3) {}

        output = trimString(String(output || ""));
        output = output.replace(/^\uFEFF/, "");
        output = output.replace(/[\r\n]+$/g, "");

        return output;
    }

    function psEscape(s) {
        return String(s || "").replace(/'/g, "''");
    }

    // ---------------------------------------------------------
    // 路径判定
    // ExtendScript 在 Windows 上对“已存在的文件路径”也会让
    // Folder.exists 返回 true，因此不能只凭 exists 判断目录。
    // 否则 D:\...\Links\照片.jpg 会被当成文件夹，扫描取不到文件，
    // 替换与缺图修复就会“点了没反应”。
    // ---------------------------------------------------------
    function looksLikePickupFileName(pathText) {
        return /\.(jpg|jpeg|png|tif|tiff|psd|bmp|gif|webp|pdf|ai|eps|indd|svg|heic|heif|txt|zip|rar|7z|lnk)$/i
            .test(String(pathText || ""));
    }

    function isRealDirectoryPath(pathText) {
        var folder = null;

        try {
            folder = new Folder(pathText);
        } catch (folderError) {
            return false;
        }

        try {
            if (!folder.exists) return false;
        } catch (existsError) {
            return false;
        }

        var entries = null;

        try {
            entries = folder.getFiles();
        } catch (readError) {
            entries = null;
        }

        if (entries instanceof Array) {
            // 能枚举到子项才是目录；空目录但路径像文件名 → 其实是文件
            if (entries.length === 0 && looksLikePickupFileName(pathText)) return false;
            return true;
        }

        // 无法枚举时，只有路径不像文件才按目录处理
        return !looksLikePickupFileName(pathText);
    }

    function resolveInitialFolder(pathText) {
        var text = cleanOuterQuotes(trimString(String(pathText || "")));
        if (!text) return null;

        if (isRealDirectoryPath(text)) return new Folder(text);

        try {
            var f = new File(text);
            if (f.exists && f.parent && f.parent.exists) return f.parent;
        } catch (e1) {}

        return null;
    }

    // ---------------------------------------------------------
    // 通用字符串
    // ---------------------------------------------------------
    function trimString(s) {
        return String(s).replace(/^\s+|\s+$/g, "");
    }

    function cleanOuterQuotes(s) {
        if (!s) return s;

        if (
            (s.charAt(0) === '"' && s.charAt(s.length - 1) === '"') ||
            (s.charAt(0) === "'" && s.charAt(s.length - 1) === "'")
        ) {
            return s.substring(1, s.length - 1);
        }

        return s;
    }

    function jsQuote(s) {
        return '"' +
            String(s || "")
                .replace(/\\/g, "\\\\")
                .replace(/"/g, '\\"')
                .replace(/\r/g, "\\r")
                .replace(/\n/g, "\\n") +
            '"';
    }

    // ---------------------------------------------------------
    // 配置
    // ---------------------------------------------------------
    function loadConfig() {
        var result = {
            lastFolder: "",
            recursive: "0"
        };

        try {
            if (!cfgFile.exists) return result;

            cfgFile.encoding = "UTF-8";
            if (!cfgFile.open("r")) return result;

            var text = cfgFile.read();
            cfgFile.close();

            var lines = text.split(/\r?\n/);

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var pos = line.indexOf("=");

                if (pos < 0) continue;

                var key = line.substring(0, pos);
                var val = line.substring(pos + 1);

                if (key === "lastFolder") result.lastFolder = val;
                else if (key === "recursive") result.recursive = val;
            }

        } catch (e) {
            try {
                if (cfgFile.opened) cfgFile.close();
            } catch (e2) {}
        }

        return result;
    }

    function saveConfig(obj) {
        try {
            if (!cfgFolder.exists) cfgFolder.create();

            cfgFile.encoding = "UTF-8";
            if (!cfgFile.open("w")) return;

            cfgFile.writeln("lastFolder=" + obj.lastFolder);
            cfgFile.writeln("recursive=" + obj.recursive);
            cfgFile.close();

        } catch (e) {
            try {
                if (cfgFile.opened) cfgFile.close();
            } catch (e2) {}
        }
    }

    // ---------------------------------------------------------
    // 尺寸事件
    // ---------------------------------------------------------
    setWBtn.onClick = function () {
        var w = parseVal(wInput, "W");
        if (w !== null) sendSize("setW", w, 0);
    };

    setHBtn.onClick = function () {
        var h = parseVal(hInput, "H");
        if (h !== null) sendSize("setH", 0, h);
    };

    setWHBtn.onClick = function () {
        var w = parseVal(wInput, "W");
        if (w === null) return;

        var h = parseVal(hInput, "H");
        if (h === null) return;

        sendSize("setWH", w, h);
    };

    wInput.onEnterKey = function () {
        setWBtn.notify("onClick");
    };

    hInput.onEnterKey = function () {
        setHBtn.notify("onClick");
    };

    function missingLinksWorker(rawItems, selectionKey, repairWorker, replacementWorker, recursive) {
        try {
            // 与 autoRelinkWorker 保持一致：Windows 上 Folder.exists 对文件也会返回
            // true，必须用“能否枚举子项”确认是真正的目录，否则用户只选一张图片时
            // 会被误判为目录，「所选图片替换」和「同目录自动修复」都会失效。
            function looksLikePickupFileName(pathText) {
                return /\.(jpg|jpeg|png|tif|tiff|psd|bmp|gif|webp|pdf|ai|eps|indd|svg|heic|heif|txt|lnk)$/i
                    .test(String(pathText || ""));
            }

            function isRealDirectoryPath(pathText) {
                var folder = null;

                try {
                    folder = new Folder(pathText);
                } catch (folderError) {
                    return false;
                }

                try {
                    if (!folder.exists) return false;
                } catch (existsError) {
                    return false;
                }

                var entries = null;

                try {
                    entries = folder.getFiles();
                } catch (readError) {
                    entries = null;
                }

                if (entries instanceof Array) {
                    if (entries.length === 0 && looksLikePickupFileName(pathText)) return false;
                    return true;
                }

                return !looksLikePickupFileName(pathText);
            }

            var snapshot = $.global[selectionKey];
            if (!snapshot) return "ERR|原选区已失效，请重新选择图片。";
            var doc = snapshot.document;
            var open = false;
            for (var d = 0; d < app.documents.length; d++) {
                if (app.documents[d] === doc) { open = true; break; }
            }
            if (!open) return "ERR|原文档已关闭，请重新选择图片。";
            doc.activate();
            var windows = $.os.toLowerCase().indexOf("windows") >= 0;
            var roots = [];
            var sourceFiles = [];
            var seenRoots = {};
            var invalid = [];
            var hasFolder = false;
            for (var s = 0; s < rawItems.length; s++) {
                var source = String(rawItems[s] || "");
                var folder = new Folder(source);
                if (isRealDirectoryPath(source)) {
                    hasFolder = true;
                } else {
                    var file = new File(source);
                    if (!file.exists || !/\.(jpg|jpeg|png|tif|tiff|psd|bmp|gif|webp|pdf|ai|eps)$/i.test(file.name)) {
                        invalid.push(source);
                        continue;
                    }
                    sourceFiles.push(file);
                    folder = file.parent;
                }
                var folderKey = "$" + (windows ? folder.fsName.toLowerCase() : folder.fsName);
                if (!seenRoots[folderKey]) {
                    seenRoots[folderKey] = true;
                    roots.push(folder);
                }
            }
            if (!roots.length) return "ERR|没有取得可用的文件夹或图片，请重新选择。";

            var manual = !hasFolder && sourceFiles.length === 1 && snapshot.items.length === 1;
            var automaticCount = 0;
            var manualCount = 0;
            var failures = invalid.length;
            var details = [];
            // Search before manually replacing the chosen slot, so live paths
            // and XMP ordering can still be checked against the original items.
            for (var r = 0; r < roots.length; r++) {
                var result = String(repairWorker(roots[r].fsName, !!recursive, {
                    skipItem: manual ? snapshot.items[0] : null,
                    anchorItem: manual ? snapshot.items[0] : null,
                    anchorPath: manual ? sourceFiles[0].fsName : "",
                    allowAnchoredMetadata: true
                }));
                var parts = result.split("|");
                if (parts[0] === "REPORT" && parts.length >= 11) {
                    automaticCount += Number(parts[4] || 0);
                    failures += Number(parts[9] || 0);
                    details.push(parts.slice(10).join("|"));
                } else {
                    failures++;
                    details.push(result.indexOf("ERR|") === 0 ? result.substring(4) : result);
                }
            }

            if (manual) {
                var replaced = String(replacementWorker([sourceFiles[0].fsName], selectionKey));
                var replacementParts = replaced.split("|");
                if (replacementParts[0] === "BATCH") {
                    manualCount = Number(replacementParts[3] || 0);
                    if (manualCount !== 1 || Number(replacementParts[4] || 0)) {
                        failures++;
                        details.unshift("【所选图片替换失败】\n" +
                            (replacementParts.slice(8).join("|") || "没有完成所选图片的替换。"));
                    }
                } else {
                    failures++;
                    details.unshift("【所选图片替换失败】\n" +
                        (replaced.indexOf("ERR|") === 0 ? replaced.substring(4) : replaced));
                }
            }

            var remaining = 0;
            for (var i = 0; i < doc.placedItems.length; i++) {
                try {
                    var linked = doc.placedItems[i].file;
                    if (!linked || !linked.exists) remaining++;
                } catch (missingError) { remaining++; }
            }
            var report = [failures ? "缺图修复结束，部分操作未完成。" : "缺图修复完成。",
                "所选图片替换：" + manualCount + " 张",
                "自动修复：" + automaticCount + " 张",
                "仍缺失：" + remaining + " 张",
                "搜索子目录：" + (recursive ? "是" : "否"), ""];
            if (!manual) report.push("本次按原文件名修复缺失链接。", "");
            if (invalid.length) report.push("无法访问的来源：\n" + invalid.join("\n"), "");
            report.push(details.join("\n\n"));
            return "MISSING|" + manualCount + "|" + automaticCount + "|" + remaining + "|" + failures +
                "|" + roots[0].fsName + "|" + report.join("\n");
        } catch (error) {
            return "ERR|缺图修复失败：" + (error.message || String(error));
        } finally {
            try { delete $.global[selectionKey]; } catch (releaseError) {}
        }
    }

    var pendingMissingSelectionKey = null;
    var pendingMissingTalk = null;

    function releaseMissingSelection() {
        if (pendingMissingSelectionKey) {
            try { delete $.global[pendingMissingSelectionKey]; } catch (releaseError) {}
            pendingMissingSelectionKey = null;
        }
    }

    function beginMissingSourceSelection() {
        if (cepBusy) return "ERR|请等待当前操作完成。";
        releaseMissingSelection();
        try {
            if (!app.documents.length) throw new Error("请先打开需要修复链接的 Illustrator 文档。");
            var doc = app.activeDocument;
            if (!doc.placedItems.length) throw new Error("当前文档没有外部链接；嵌入图片请使用“替换图片”。");
            var targets = [];
            function collect(item) {
                if (!item) return;
                if (item.typename === "PlacedItem") {
                    for (var p = 0; p < targets.length; p++) if (targets[p] === item) return;
                    targets.push(item);
                } else if (item.typename === "GroupItem") {
                    for (var g = 0; g < item.pageItems.length; g++) collect(item.pageItems[g]);
                }
            }
            var selected = doc.selection;
            if (selected && selected.length) {
                for (var s = 0; s < selected.length; s++) collect(selected[s]);
            }
            pendingMissingSelectionKey = "__LINGHUI_MISSING_SELECTION_" + new Date().getTime() + "_" +
                Math.floor(Math.random() * 1000000);
            $.global[pendingMissingSelectionKey] = { document: doc, items: targets };
            setBusy(true, "正在打开 Windows 选择窗口…");
            reportBox.text = statusText.text;
            recordMissingRepairStatus("RUNNING|缺图修复");
            return "OK";
        } catch (error) {
            releaseMissingSelection();
            setBusy(false);
            statusText.text = error.message || String(error);
            reportBox.text = statusText.text;
            return "ERR|" + statusText.text;
        }
    }

    function finishMissingLinksResult(rawResult) {
        setBusy(false);
        var result = String(rawResult || "ERR|Illustrator 未返回缺图修复结果，请重试。");
        var parts = result.split("|");
        if (parts[0] === "MISSING" && parts.length >= 7) {
            statusText.text = "缺图修复：所选替换 " + parts[1] + " 张；自动修复 " + parts[2] +
                " 张；仍缺失 " + parts[3] + " 张。";
            reportBox.text = parts.slice(6).join("|");
            cfg.lastFolder = parts[5];
            try { saveConfig(cfg); } catch (configError) {}
            recordMissingRepairStatus(result);
            return "OK";
        }
        if (parts[0] !== "ERR") result = "ERR|缺图修复没有完成：" + result;
        statusText.text = result.substring(4);
        reportBox.text = statusText.text;
        recordMissingRepairStatus(result);
        return result;
    }

    function finishMissingSourceSelection(items, errorMessage, asynchronous, recursive) {
        if (errorMessage || items === null) {
            releaseMissingSelection();
            setBusy(false);
            statusText.text = errorMessage || "已取消缺图修复。";
            reportBox.text = statusText.text;
            return errorMessage ? "ERR|" + errorMessage : "OK";
        }
        if (!items || !items.length || !pendingMissingSelectionKey || !$.global[pendingMissingSelectionKey]) {
            releaseMissingSelection();
            return finishMissingLinksResult("ERR|选区或来源已失效，请重新选择图片。");
        }
        var key = pendingMissingSelectionKey;
        pendingMissingSelectionKey = null;
        recursive = !!recursive;
        cfg.recursive = recursive ? "1" : "0";
        try { saveConfig(cfg); } catch (configError) {}
        setBusy(true, "正在替换图片并修复缺失链接…");
        reportBox.text = statusText.text;
        if (!asynchronous) {
            return finishMissingLinksResult(missingLinksWorker(items, key, autoRelinkWorker, batchReplaceLinksWorker, recursive));
        }
        try {
            var target = String(BridgeTalk.appSpecifier || "");
            if (target.indexOf("illustrator") !== 0) throw new Error("无法定位当前 Illustrator 会话。");
            var paths = [];
            for (var i = 0; i < items.length; i++) paths.push(jsQuote(items[i]));
            var bt = createHostRequest();
            bt.target = target;
            bt.body = '#targetengine "AI_MERGED_TOOLBOX"\n(' + missingLinksWorker.toString() + ')([' +
                paths.join(",") + '],' + jsQuote(key) + ',(' + autoRelinkWorker.toString() + '),(' +
                batchReplaceLinksWorker.toString() + '),' + (recursive ? 'true' : 'false') + ');';
            pendingMissingTalk = bt;
            bt.onResult = function (res) {
                pendingMissingTalk = null;
                finishMissingLinksResult(res.body);
            };
            bt.onError = function (error) {
                pendingMissingTalk = null;
                try { delete $.global[key]; } catch (releaseError) {}
                finishMissingLinksResult("ERR|缺图修复失败：" + String(error.body || error));
            };
            if (!bt.send()) throw new Error("缺图修复请求发送失败，请重试。");
            return "OK";
        } catch (error) {
            pendingMissingTalk = null;
            try { delete $.global[key]; } catch (releaseError) {}
            return finishMissingLinksResult("ERR|缺图修复失败：" + (error.message || String(error)));
        }
    }

    var pendingPictureReplacementKey = null;

    function releasePictureReplacementSelection() {
        if (pendingPictureReplacementKey) {
            try { delete $.global[pendingPictureReplacementKey]; } catch (releaseErr) {}
            pendingPictureReplacementKey = null;
        }
    }

    function beginPictureSourceSelection() {
        if (cepBusy) return "ERR|请等待当前操作完成。";
        releasePictureReplacementSelection();
        try {
            if (app.documents.length < 1) throw new Error("请先打开 Illustrator 文档。");
            var doc = app.activeDocument;
            var selected = doc.selection;
            var pictures = [];

            function collectPictures(item) {
                if (!item) return;
                if (item.typename === "PlacedItem" || item.typename === "RasterItem") {
                    for (var p = 0; p < pictures.length; p++) {
                        if (pictures[p] === item) return;
                    }
                    pictures.push(item);
                } else if (item.typename === "GroupItem") {
                    for (var g = 0; g < item.pageItems.length; g++) {
                        collectPictures(item.pageItems[g]);
                    }
                }
            }

            if (selected && selected.length) {
                for (var s = 0; s < selected.length; s++) collectPictures(selected[s]);
            }
            if (!pictures.length) throw new Error("请先在 Illustrator 中选中要替换的图片。");
            pendingPictureReplacementKey = "__LINGHUI_PICTURE_SELECTION_" +
                new Date().getTime() + "_" + Math.floor(Math.random() * 1000000);
            $.global[pendingPictureReplacementKey] = { document: doc, items: pictures };
            setBusy(true, "正在打开 Windows 选择窗口…");
            reportBox.text = statusText.text;
            return "OK";
        } catch (selectionErr) {
            releasePictureReplacementSelection();
            setBusy(false);
            statusText.text = selectionErr.message || String(selectionErr);
            reportBox.text = statusText.text;
            return "ERR|" + statusText.text;
        }
    }

    function finishBatchSourceSelection(items, errorMessage, replacingPictures, recursive) {
        if (!replacingPictures) return finishMissingSourceSelection(items, errorMessage, false, recursive);
        if (errorMessage) {
            if (replacingPictures) releasePictureReplacementSelection();
            setBusy(false);
            statusText.text = errorMessage;
            reportBox.text = statusText.text;
            return "ERR|" + errorMessage;
        }
        if (items === null) {
            if (replacingPictures) releasePictureReplacementSelection();
            setBusy(false);
            statusText.text = replacingPictures ? "已取消替换图片。" : "已取消缺图修复。";
            reportBox.text = statusText.text;
            return "OK";
        }
        try {
            if (replacingPictures &&
                (!pendingPictureReplacementKey || !$.global[pendingPictureReplacementKey])) {
                throw new Error("原选区已失效，请重新选择要替换的图片。");
            }
            var paths = prepareBatchSourceItems(items);
            if (paths.length < 1) {
                if (replacingPictures) releasePictureReplacementSelection();
                setBusy(false);
                statusText.text = "所选文件夹或文件中没有找到支持的图片。";
                reportBox.text = statusText.text;
                return "ERR|" + statusText.text;
            }
            var selectionKey = replacingPictures ? pendingPictureReplacementKey : "";
            sendBatchReplaceLinks(paths, selectionKey);
            if (replacingPictures) pendingPictureReplacementKey = null;
            return "OK";
        } catch (sourceErr) {
            if (replacingPictures) releasePictureReplacementSelection();
            setBusy(false);
            statusText.text = "读取来源失败：" + sourceErr.message;
            reportBox.text = statusText.text;
            return "ERR|" + statusText.text;
        }
    }

    // ---------------------------------------------------------
    // 链接事件：批量替换链接
    // ---------------------------------------------------------
    pictureReplaceBtn.onClick = function () {
        if (beginPictureSourceSelection() !== "OK") return;
        try {
            var initial = resolveInitialFolder(cfg.lastFolder) || Folder.desktop;
            finishBatchSourceSelection(chooseBatchSourceItems(initial), "", true);
        } catch (pickErr) {
            finishBatchSourceSelection(null, "选择来源失败：" + pickErr.message, true);
        }
    };

    batchReplaceBtn.onClick = function () {
        if (beginMissingSourceSelection() !== "OK") return;
        try {
            var initial = resolveInitialFolder(cfg.lastFolder) || Folder.desktop;
            finishMissingSourceSelection(chooseBatchSourceItems(initial), "", true, recursiveCb.value);
        } catch (error) {
            finishMissingSourceSelection(null, "选择来源失败：" + (error.message || String(error)), true, recursiveCb.value);
        }
    };

    // ---------------------------------------------------------
    // 链接事件：互换两张图片链接
    // ---------------------------------------------------------
    swapLinksBtn.onClick = function () {
        sendSwapTwoLinks();
    };

    // ---------------------------------------------------------
    // 链接事件：自动恢复
    // ---------------------------------------------------------
    recursiveCb.onClick = function () {
        cfg.recursive = recursiveCb.value ? "1" : "0";
        saveConfig(cfg);
    };

    // ---------------------------------------------------------
    // 无损压缩事件
    // ---------------------------------------------------------
    scanOptimizeBtn.onClick = function () {
        sendOptimize("scan", "");
    };

    pdfCompatCb.onClick = function () {
        statusText.text = pdfCompatCb.value
            ? "已切换为 Adobe 兼容优先：会保留 PDF 兼容数据，文件可能明显更大。"
            : "已切换为最大无损瘦身：关闭 PDF 兼容数据。";
    };

    optimizeSaveBtn.onClick = function () {
        // 旧版这里直接从 palette 访问 app.activeDocument + File.saveDlg，
        // 在部分 Illustrator 2025/2026 环境会静默中断。
        //  改成：BridgeTalk 取文档信息 -> Windows 原生另存为 -> BridgeTalk 保存。
        requestOptimizeDestination(function (path) {
            statusText.text = "已选择保存位置，正在开始无损优化…";
            try { win.update(); } catch (e0) {}
            sendOptimize("optimize", path);
        });
    };

    optimizeOverwriteBtn.onClick = function () {
        requestOverwriteDestination(function (path) {
            var ok = confirm(
                "将按当前无损优化设置覆盖保存当前 AI 文件：\n\n" +
                path +
                "\n\n覆盖后原文件将被替换，是否继续？"
            );

            if (!ok) {
                statusText.text = "已取消覆盖保存。";
                return;
            }

            statusText.text = "已确认覆盖保存，正在开始无损优化…";
            try { win.update(); } catch (e0) {}
            sendOptimize("overwrite", path);
        });
    };

    // ---------------------------------------------------------
    // 关闭窗口
    // ---------------------------------------------------------
    win.onClose = function () {
        try {
            cfg.recursive = recursiveCb.value ? "1" : "0";
            saveConfig(cfg);
        } catch (e0) {}

        try {
            $.global[KEY] = null;
            $.global[AUTO_START_CLOSED_KEY] = true;
        } catch (e1) {}
    };

    try {
        $.global[AUTO_START_CLOSED_KEY] = false;
    } catch (e2) {}

    win.center();
    win.show();

})();
