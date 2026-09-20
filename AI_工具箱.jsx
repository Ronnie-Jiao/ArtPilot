#target illustrator
#targetengine "AI_MERGED_TOOLBOX"

/*
    AI 工具箱
    合并自：
    1) 自动恢复缺失链接 v5
    2) AI 统一尺寸面板（含统一替换链接）
    3) AI 统一尺寸面板 V2
    4) AI 文件无损压缩 / 瘦身

    功能：
    - 常驻 ScriptUI 浮动面板
    - W / H / W+H 统一尺寸
    - 锁定比例 / 缩放描边
    - 读取首个对象 W/H、交换 W/H
    - 匹配首个对象 W / H / W+H
    - 9 点缩放基准
    - 多选链接图片统一替换为同一文件
    - 两张链接图片互换链接：保持各自原高度，宽度按新图片比例自动变化
    - 基于 AI XMP Manifest 自动恢复缺失链接
    - Windows 使用现代资源管理器式文件/文件夹选择器
    - 记住上次缺失链接搜索目录与“搜索子文件夹”设置
    - 扫描 AI 文件大小、链接、缺失链接与嵌入位图
    - 无损另存：关闭 PDF 兼容 / 不嵌入链接 / 开启数据压缩 / 可嵌入 ICC
*/

(function () {
    var KEY = "__AI_MERGED_TOOLBOX__";

    // 每次重新运行脚本时都重建面板。
    // 这样以后只需要用同名 AI_工具箱.jsx 覆盖旧文件，再运行一次即可刷新。
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
    var win = new Window("palette", "AI 工具箱", undefined, {
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
    tabs.preferredSize = [410, 590];

    // =========================================================
    // TAB 1：尺寸
    // =========================================================
    var sizeTab = tabs.add("tab", undefined, "尺寸");
    sizeTab.orientation = "column";
    sizeTab.alignChildren = ["fill", "top"];
    sizeTab.spacing = 8;
    sizeTab.margins = 10;

    var sizePanel = sizeTab.add("panel", undefined, "尺寸");
    sizePanel.orientation = "column";
    sizePanel.alignChildren = ["fill", "top"];
    sizePanel.margins = 10;
    sizePanel.spacing = 7;

    var sizeRow = sizePanel.add("group");
    sizeRow.orientation = "row";
    sizeRow.alignChildren = ["center", "center"];

    sizeRow.add("statictext", undefined, "W");
    var wInput = sizeRow.add("edittext", undefined, "30");
    wInput.characters = 8;

    sizeRow.add("statictext", undefined, "H");
    var hInput = sizeRow.add("edittext", undefined, "30");
    hInput.characters = 8;

    var unitDropdown = sizeRow.add("dropdownlist", undefined, ["mm", "cm", "px", "pt", "in"]);
    unitDropdown.selection = 0;

    var optionRow = sizePanel.add("group");
    optionRow.orientation = "row";

    var keepRatio = optionRow.add("checkbox", undefined, "锁定比例");
    keepRatio.value = true;
    keepRatio.helpTip = "统一 W 或 H 时保持对象原比例。";

    var scaleStroke = optionRow.add("checkbox", undefined, "缩放描边");
    scaleStroke.value = false;
    scaleStroke.helpTip = "开启后，描边粗细会随对象一起缩放。";

    var readRow = sizePanel.add("group");
    readRow.orientation = "row";

    var readBtn = readRow.add("button", undefined, "读取首个 W/H");
    var swapBtn = readRow.add("button", undefined, "交换 W/H");
    readBtn.preferredSize.width = 135;
    swapBtn.preferredSize.width = 105;

    var applyPanel = sizeTab.add("panel", undefined, "应用到每个对象");
    applyPanel.orientation = "column";
    applyPanel.alignChildren = ["fill", "top"];
    applyPanel.margins = 10;
    applyPanel.spacing = 7;

    var applyRow = applyPanel.add("group");
    applyRow.orientation = "row";

    var setWBtn = applyRow.add("button", undefined, "统一 W");
    var setHBtn = applyRow.add("button", undefined, "统一 H");
    var setWHBtn = applyRow.add("button", undefined, "统一 W+H");
    setWBtn.preferredSize.width = 92;
    setHBtn.preferredSize.width = 92;
    setWHBtn.preferredSize.width = 100;

    var matchPanel = sizeTab.add("panel", undefined, "匹配首个对象");
    matchPanel.orientation = "column";
    matchPanel.alignChildren = ["fill", "top"];
    matchPanel.margins = 10;
    matchPanel.spacing = 7;

    var matchRow = matchPanel.add("group");
    matchRow.orientation = "row";

    var matchWBtn = matchRow.add("button", undefined, "匹配 W");
    var matchHBtn = matchRow.add("button", undefined, "匹配 H");
    var matchWHBtn = matchRow.add("button", undefined, "匹配 W+H");
    matchWBtn.preferredSize.width = 92;
    matchHBtn.preferredSize.width = 92;
    matchWHBtn.preferredSize.width = 100;

    var anchorPanel = sizeTab.add("panel", undefined, "缩放基准");
    anchorPanel.orientation = "row";
    anchorPanel.alignChildren = ["left", "center"];
    anchorPanel.margins = 10;

    anchorPanel.add("statictext", undefined, "基准：");
    var anchorDropdown = anchorPanel.add("dropdownlist", undefined, [
        "左上", "上", "右上",
        "左", "中心", "右",
        "左下", "下", "右下"
    ]);
    anchorDropdown.selection = 4;

    // =========================================================
    // TAB 2：链接
    // =========================================================
    var linkTab = tabs.add("tab", undefined, "链接");
    linkTab.orientation = "column";
    linkTab.alignChildren = ["fill", "top"];
    linkTab.spacing = 8;
    linkTab.margins = 10;

    var replacePanel = linkTab.add("panel", undefined, "统一替换链接");
    replacePanel.orientation = "column";
    replacePanel.alignChildren = ["fill", "top"];
    replacePanel.margins = 10;
    replacePanel.spacing = 7;

    var replaceBtn = replacePanel.add("button", undefined, "选择文件并统一替换");
    replaceBtn.preferredSize.height = 28;

    var batchReplacePanel = linkTab.add("panel", undefined, "批量替换链接");
    batchReplacePanel.orientation = "column";
    batchReplacePanel.alignChildren = ["fill", "top"];
    batchReplacePanel.margins = 10;
    batchReplacePanel.spacing = 7;

    var batchReplaceBtn = batchReplacePanel.add("button", undefined, "批量替换链接");
    batchReplaceBtn.preferredSize.height = 30;

    var swapLinkPanel = linkTab.add("panel", undefined, "互换两张图片");
    swapLinkPanel.orientation = "column";
    swapLinkPanel.alignChildren = ["fill", "top"];
    swapLinkPanel.margins = 10;
    swapLinkPanel.spacing = 7;

    var swapLinksBtn = swapLinkPanel.add("button", undefined, "互换两张图片链接");
    swapLinksBtn.preferredSize.height = 30;
    swapLinksBtn.helpTip = "两张链接图片交换源文件；各自高度保持不变，宽度按交换后的图片比例等比变化。";

    var relinkPanel = linkTab.add("panel", undefined, "自动恢复缺失链接");
    relinkPanel.orientation = "column";
    relinkPanel.alignChildren = ["fill", "top"];
    relinkPanel.margins = 10;
    relinkPanel.spacing = 7;

    var pathRow = relinkPanel.add("group");
    pathRow.orientation = "row";
    pathRow.alignChildren = ["fill", "center"];

    var pathInput = pathRow.add("edittext", undefined, cfg.lastFolder || "");
    pathInput.characters = 42;
    pathInput.alignment = ["fill", "center"];

    var clearPathBtn = pathRow.add("button", undefined, "清空");

    var browseRow = relinkPanel.add("group");
    browseRow.orientation = "row";

    var chooseFolderBtn = browseRow.add("button", undefined, "选择文件夹...");
    var chooseFileBtn = browseRow.add("button", undefined, "选择文件...");
    chooseFolderBtn.preferredSize.width = 125;
    chooseFileBtn.preferredSize.width = 125;

    var recursiveCb = relinkPanel.add("checkbox", undefined, "同时搜索所有子文件夹");
    recursiveCb.value = (cfg.recursive === "1");

    var autoRelinkBtn = relinkPanel.add("button", undefined, "扫描并自动恢复缺失链接");
    autoRelinkBtn.preferredSize.height = 30;

    var reportPanel = linkTab.add("panel", undefined, "结果");
    reportPanel.orientation = "column";
    reportPanel.alignChildren = ["fill", "fill"];
    reportPanel.margins = 8;

    var reportBox = reportPanel.add(
        "edittext",
        undefined,
        "尚未执行。",
        { multiline: true, scrolling: true, readonly: true }
    );
    reportBox.preferredSize = [340, 120];
    reportBox.alignment = ["fill", "fill"];
    reportPanel.alignment = ["fill", "fill"];

    // =========================================================
    // TAB 3：无损压缩
    // =========================================================
    var optimizeTab = tabs.add("tab", undefined, "无损压缩");
    optimizeTab.orientation = "column";
    optimizeTab.alignChildren = ["fill", "top"];
    optimizeTab.spacing = 8;
    optimizeTab.margins = 10;

    var scanPanel = optimizeTab.add("panel", undefined, "当前文件");
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
    optimizeInfo.preferredSize = [340, 115];
    optimizeInfo.alignment = ["fill", "fill"];

    var scanOptimizeBtn = scanPanel.add("button", undefined, "扫描当前文件");
    scanOptimizeBtn.preferredSize.height = 28;

    var optimizePanel = optimizeTab.add("panel", undefined, "无损优化设置");
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
    pdfCompatCb.helpTip = "关闭时通常能大幅减小包含大量高清链接图的 AI 文件。";

    var keepLinksCb = optimizePanel.add(
        "checkbox",
        undefined,
        "保持图片为链接"
    );
    keepLinksCb.value = true;
    keepLinksCb.enabled = false;

    var compressDataCb = optimizePanel.add(
        "checkbox",
        undefined,
        "开启 Illustrator 文件数据压缩"
    );
    compressDataCb.value = true;
    compressDataCb.enabled = false;

    var iccCb = optimizePanel.add(
        "checkbox",
        undefined,
        "嵌入 ICC 色彩配置"
    );
    iccCb.value = true;
    iccCb.helpTip = "用于尽量保持文档颜色管理信息。";

    var optimizeActionPanel = optimizeTab.add("panel", undefined, "保存");
    optimizeActionPanel.orientation = "column";
    optimizeActionPanel.alignChildren = ["fill", "top"];
    optimizeActionPanel.margins = 10;
    optimizeActionPanel.spacing = 7;

    var optimizeSaveBtn = optimizeActionPanel.add("button", undefined, "无损优化并另存为...");
    optimizeSaveBtn.preferredSize.height = 32;

    // =========================================================
    // 全局状态栏
    // =========================================================
    var statusPanel = win.add("panel", undefined, "状态");
    statusPanel.orientation = "column";
    statusPanel.alignChildren = ["fill", "top"];
    statusPanel.margins = 8;
    statusPanel.alignment = ["fill", "bottom"];

    var statusText = statusPanel.add(
        "statictext",
        undefined,
        "就绪。",
        { multiline: true }
    );
    statusText.preferredSize = [370, 36];
    statusText.alignment = ["fill", "top"];

    tabs.selection = 0;

    // ---------------------------------------------------------
    // 窗口缩放
    // ---------------------------------------------------------
    win.minimumSize = [350, 400];

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

    function anchorKey() {
        var keys = [
            "TOPLEFT", "TOP", "TOPRIGHT",
            "LEFT", "CENTER", "RIGHT",
            "BOTTOMLEFT", "BOTTOM", "BOTTOMRIGHT"
        ];
        return keys[anchorDropdown.selection ? anchorDropdown.selection.index : 4];
    }

    // ---------------------------------------------------------
    // 通用：忙碌状态
    // ---------------------------------------------------------
    var actionButtons = [
        readBtn, swapBtn,
        setWBtn, setHBtn, setWHBtn,
        matchWBtn, matchHBtn, matchWHBtn,
        replaceBtn, batchReplaceBtn, swapLinksBtn,
        chooseFolderBtn, chooseFileBtn, clearPathBtn, autoRelinkBtn,
        scanOptimizeBtn, optimizeSaveBtn
    ];

    function setBusy(v, text) {
        for (var i = 0; i < actionButtons.length; i++) {
            actionButtons[i].enabled = !v;
        }

        if (v) {
            statusText.text = text || "正在处理…";
        }
    }

    // ---------------------------------------------------------
    // BridgeTalk：尺寸 Worker
    // ---------------------------------------------------------
    function sizeWorker(action, targetW, targetH, preserveRatio, scaleStrokes, aKey) {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开 Illustrator 文档。";
            }

            var sel = app.activeDocument.selection;
            if (!sel || sel.length < 1) {
                return "ERR|请先选择一个或多个对象。";
            }

            function getAnchor(k) {
                switch (k) {
                    case "TOPLEFT": return Transformation.TOPLEFT;
                    case "TOP": return Transformation.TOP;
                    case "TOPRIGHT": return Transformation.TOPRIGHT;
                    case "LEFT": return Transformation.LEFT;
                    case "RIGHT": return Transformation.RIGHT;
                    case "BOTTOMLEFT": return Transformation.BOTTOMLEFT;
                    case "BOTTOM": return Transformation.BOTTOM;
                    case "BOTTOMRIGHT": return Transformation.BOTTOMRIGHT;
                    default: return Transformation.CENTER;
                }
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
                    getAnchor(aKey)
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

            if (action === "read") {
                return "VAL|" + refW + "|" + refH + "|" + sel.length;
            }

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

        var bt = new BridgeTalk();
        bt.target = "illustrator";

        bt.body =
            "(" + sizeWorker.toString() + ")" +
            "(\"" + action + "\"," +
            String(w || 0) + "," +
            String(h || 0) + "," +
            (keepRatio.value ? "true" : "false") + "," +
            (scaleStroke.value ? "true" : "false") + "," +
            "\"" + anchorKey() + "\"" +
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

        if (p[0] === "VAL") {
            var u = unitDropdown.selection ? unitDropdown.selection.text : "mm";
            wInput.text = cleanNumber(fromPt(parseFloat(p[1]), u));
            hInput.text = cleanNumber(fromPt(parseFloat(p[2]), u));
            statusText.text =
                "已读取：" + wInput.text + " × " + hInput.text + " " + u;
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

                var currentAngle = getRotationAngle(item);

                if (Math.abs(currentAngle) > 0.0001) {
                    item.rotate(
                        -currentAngle,
                        true,
                        true,
                        true,
                        true,
                        Transformation.CENTER
                    );
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
                    item.rotate(
                        originalAngle,
                        true,
                        true,
                        true,
                        true,
                        Transformation.CENTER
                    );
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

        var bt = new BridgeTalk();
        bt.target = "illustrator";
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
                    "替换完成：" + p[1] + " 个链接图片" +
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
    function batchReplaceLinksWorker(sourcePaths) {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开 Illustrator 文档。";
            }

            if (!sourcePaths || sourcePaths.length < 1) {
                return "ERR|没有可用于替换的来源图片。";
            }

            var doc = app.activeDocument;
            var sel = doc.selection;

            if (!sel || sel.length < 1) {
                return "ERR|请先选择需要批量替换的链接图片。";
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

                var currentAngle = getRotationAngle(item);

                if (Math.abs(currentAngle) > 0.0001) {
                    item.rotate(
                        -currentAngle,
                        true,
                        true,
                        true,
                        true,
                        Transformation.CENTER
                    );
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
                    item.rotate(
                        originalAngle,
                        true,
                        true,
                        true,
                        true,
                        Transformation.CENTER
                    );
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

                    var replacement = buildReplacement(
                        item,
                        fileObj,
                        oldHeight,
                        oldCenter,
                        naturalRatio,
                        oldAngle
                    );

                    commitReplacement(item, replacement);
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

    function sendBatchReplaceLinks(paths) {
        if (!paths || paths.length < 1) {
            alert("没有选择可用于替换的图片。");
            return;
        }

        setBusy(true, "正在批量替换链接…");

        var jsPaths = [];

        for (var i = 0; i < paths.length; i++) {
            jsPaths.push(jsQuote(paths[i]));
        }

        var bt = new BridgeTalk();
        bt.target = "illustrator";
        bt.body =
            "(" + batchReplaceLinksWorker.toString() + ")" +
            "([" + jsPaths.join(",") + "]);";

        bt.onResult = function (res) {
            setBusy(false);

            var result = String(res.body || "");
            var p = result.split("|");

            if (p[0] === "ERR") {
                var msg = p.slice(1).join("|");
                statusText.text = msg;
                alert(msg);
                return;
            }

            if (p[0] !== "BATCH") {
                statusText.text = result;
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
                "批量替换完成：已替换 " +
                replaced + " / " + selectedCount + " 张。";

            if (invalidSources > 0 && replaced > 0) {
                alert(
                    "批量替换已执行。\n\n" +
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
                    "图片数量不足。\n\n" +
                    "选中了 " + selectedCount + " 张图片，" +
                    "来源只有 " + sourceCount + " 张。\n\n" +
                    "实际替换了 " + replaced + " 张，" +
                    "还有 " + shortage + " 张没有替换。" +
                    (failed > 0
                        ? "\n另外有 " + failed + " 张替换失败。"
                        : "") +
                    (errorText ? "\n\n" + errorText : "")
                );
                return;
            }

            if (failed > 0) {
                alert(
                    "批量替换完成，但有部分图片替换失败。\n\n" +
                    "成功：" + replaced + " 张\n" +
                    "失败：" + failed + " 张" +
                    (errorText ? "\n\n" + errorText : "")
                );
                return;
            }

            if (unused > 0) {
                statusText.text =
                    "批量替换完成：已替换 " +
                    replaced + " 张；有 " +
                    unused + " 张来源图片未使用。";
            }
        };

        bt.onError = function (err) {
            setBusy(false);
            statusText.text = "批量替换链接失败。";
            alert(
                "批量替换链接失败：\n" +
                String(err.body || err)
            );
        };

        bt.send();
    }


    // ---------------------------------------------------------
    // BridgeTalk：两张链接图片互换 Worker
    // ---------------------------------------------------------
    function swapTwoLinksWorker() {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开 Illustrator 文档。";
            }

            var doc = app.activeDocument;
            var sel = doc.selection;

            if (!sel || sel.length < 1) {
                return "ERR|请先选择两张链接图片。";
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
                        for (var g = 0; g < item.pageItems.length; g++) {
                            collectPlaced(item.pageItems[g]);
                        }
                    }
                } catch (e) {}
            }

            for (var s = 0; s < sel.length; s++) {
                collectPlaced(sel[s]);
            }

            if (placed.length !== 2) {
                return "ERR|当前选择中检测到 " + placed.length +
                    " 张链接图片。请只选择恰好两张链接图片后再执行。";
            }

            var a = placed[0];
            var b = placed[1];

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

            if (!fileA || !fileB) {
                return "ERR|无法读取其中一张图片的链接路径。";
            }

            if (!fileA.exists || !fileB.exists) {
                return "ERR|其中一张图片的原链接文件已经丢失。";
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

                var currentAngle = getRotationAngle(item);

                if (Math.abs(currentAngle) > 0.0001) {
                    item.rotate(
                        -currentAngle,
                        true,
                        true,
                        true,
                        true,
                        Transformation.CENTER
                    );
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
                    item.rotate(
                        originalAngle,
                        true,
                        true,
                        true,
                        true,
                        Transformation.CENTER
                    );
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

    function sendSwapTwoLinks() {
        setBusy(true, "正在互换两张图片链接…");

        var bt = new BridgeTalk();
        bt.target = "illustrator";
        bt.body = "(" + swapTwoLinksWorker.toString() + ")();";

        bt.onResult = function (res) {
            setBusy(false);

            var result = String(res.body || "");
            var p = result.split("|");

            if (p[0] === "SWAPPED") {
                statusText.text =
                    "互换完成：" + p[1] + " ⇄ " + p[2] +
                    "；可按 Ctrl+Z 撤回。";
                return;
            }

            if (p[0] === "WARN") {
                statusText.text =
                    "链接已互换：" + p[1] + " ⇄ " + p[2] +
                    "；但尺寸处理有警告。";

                alert(
                    "链接已经互换，但尺寸处理有警告：\\n\\n" +
                    p.slice(3).join("|")
                );
                return;
            }

            if (p[0] === "ERR") {
                var msg = p.slice(1).join("|");
                statusText.text = msg;
                alert(msg);
                return;
            }

            statusText.text = result;
        };

        bt.onError = function (err) {
            setBusy(false);
            statusText.text = "互换图片链接失败。";

            alert(
                "互换图片链接失败：\\n" +
                String(err.body || err)
            );
        };

        bt.send();
    }

    // ---------------------------------------------------------
    // BridgeTalk：自动恢复缺失链接 Worker
    // ---------------------------------------------------------
    function autoRelinkWorker(rawPath, recursive, saveIfNeeded) {
        try {
            if (app.documents.length < 1) {
                return "ERR|请先打开需要修复链接的 Illustrator 文档。";
            }

            var doc = app.activeDocument;

            if (doc.placedItems.length === 0) {
                return "ERR|当前文档没有链接的置入对象。";
            }

            if (!doc.saved) {
                if (!saveIfNeeded) {
                    return "NEEDSAVE|当前文档有尚未保存的修改。";
                }

                try {
                    doc.save();
                } catch (saveErr) {
                    return "ERR|保存失败：" + saveErr.message;
                }
            }

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

            function safeDecode(s) {
                try {
                    return decodeURI(String(s));
                } catch (e) {
                    return String(s).replace(/%20/g, " ");
                }
            }

            function normalizeName(s) {
                return trimString(safeDecode(String(s))).toLowerCase();
            }

            function resolveSearchFolder(pathText) {
                var s = cleanOuterQuotes(trimString(String(pathText || "")));
                if (!s) return null;

                try {
                    var folder = new Folder(s);
                    if (folder.exists) return folder;
                } catch (e0) {}

                try {
                    var file = new File(s);
                    if (file.exists && file.parent && file.parent.exists) return file.parent;
                } catch (e1) {}

                return null;
            }

            function filenameFromManifestPath(pathText) {
                if (!pathText) return "";

                var s = String(pathText);

                try {
                    var f = new File(s);
                    if (f.name) return safeDecode(f.name);
                } catch (e0) {}

                try {
                    s = safeDecode(s);
                    s = s.replace(/\\/g, "/");
                    s = s.replace(/[?#].*$/, "");

                    while (s.length > 1 && s.charAt(s.length - 1) === "/") {
                        s = s.substring(0, s.length - 1);
                    }

                    var p = s.lastIndexOf("/");
                    return p >= 0 ? s.substring(p + 1) : s;
                } catch (e1) {
                    return "";
                }
            }

            function getManifestPaths(documentObj) {
                if (ExternalObject.AdobeXMPScript === undefined) {
                    ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
                }

                var xmp = new XMPMeta(documentObj.XMPString);
                var count = xmp.countArrayItems(XMPConst.NS_XMP_MM, "Manifest");
                var paths = [];

                for (var n = 1; n <= count; n++) {
                    var xpath = "xmpMM:Manifest[" + n + "]/stMfs:reference/stRef:filePath";
                    var prop = xmp.getProperty(XMPConst.NS_XMP_MM, xpath);

                    if (prop && prop.value !== undefined && prop.value !== null) {
                        paths.push(String(prop.value));
                    } else {
                        paths.push("");
                    }
                }

                return paths;
            }

            function limitList(arr, maxItems) {
                var out = [];
                var n = Math.min(arr.length, maxItems);

                for (var x = 0; x < n; x++) {
                    out.push("• " + arr[x]);
                }

                if (arr.length > maxItems) {
                    out.push("……另外还有 " + (arr.length - maxItems) + " 项");
                }

                return out.join("\n");
            }

            var root = resolveSearchFolder(rawPath);

            if (!root || !root.exists) {
                return "ERR|路径不存在，或者无法识别：" + rawPath;
            }

            var fileIndex = {};
            var scannedFiles = 0;

            function scanFolder(folder, deep) {
                var entries;

                try {
                    entries = folder.getFiles();
                } catch (e) {
                    return;
                }

                for (var j = 0; j < entries.length; j++) {
                    var entry = entries[j];

                    if (entry instanceof Folder) {
                        if (deep) scanFolder(entry, true);
                        continue;
                    }

                    if (!(entry instanceof File)) continue;

                    scannedFiles++;

                    var fn = "";
                    try {
                        fn = safeDecode(entry.name);
                    } catch (e2) {
                        continue;
                    }

                    var k = normalizeName(fn);
                    if (!fileIndex[k]) fileIndex[k] = [];
                    fileIndex[k].push(entry);
                }
            }

            scanFolder(root, recursive);

            var manifestPaths;
            try {
                manifestPaths = getManifestPaths(doc);
            } catch (xmpErr) {
                return "ERR|读取 AI 文档的 XMP Manifest 失败：" + xmpErr.message;
            }

            var items = doc.placedItems;

            if (manifestPaths.length !== items.length) {
                return "ERR|为避免把图片链接到错误的位置，脚本已停止。\n" +
                    "PlacedItem 数量：" + items.length + "\n" +
                    "XMP Manifest 数量：" + manifestPaths.length + "\n" +
                    "两者数量不一致，不能安全地按顺序自动对应。";
            }

            var missingCount = 0;
            var relinkedCount = 0;
            var alreadyOK = 0;
            var noManifestName = [];
            var notFound = [];
            var ambiguous = [];
            var errors = [];

            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var isMissing = false;

                try {
                    var currentFile = item.file;
                    if (!currentFile || !currentFile.exists) isMissing = true;
                } catch (e3) {
                    isMissing = true;
                }

                if (!isMissing) {
                    alreadyOK++;
                    continue;
                }

                missingCount++;

                var oldName = filenameFromManifestPath(manifestPaths[i]);

                if (!oldName) {
                    noManifestName.push("第 " + (i + 1) + " 个链接");
                    continue;
                }

                var matches = fileIndex[normalizeName(oldName)];

                if (!matches || matches.length === 0) {
                    notFound.push(oldName);
                    continue;
                }

                if (matches.length > 1) {
                    ambiguous.push(oldName + "（找到 " + matches.length + " 个同名文件）");
                    continue;
                }

                try {
                    item.file = matches[0];
                    relinkedCount++;
                } catch (e4) {
                    try {
                        item.relink(matches[0]);
                        relinkedCount++;
                    } catch (e5) {
                        errors.push(oldName + " → " + e5.message);
                    }
                }
            }

            app.redraw();

            var report = [];
            report.push("搜索目录：");
            report.push(root.fsName);
            report.push("");
            report.push("扫描文件数：" + scannedFiles);
            report.push("检测到缺失链接：" + missingCount);
            report.push("成功重新链接：" + relinkedCount);
            report.push("原本正常：" + alreadyOK);
            report.push("未找到同名文件：" + notFound.length);
            report.push("同名冲突：" + ambiguous.length);
            report.push("XMP 无文件名：" + noManifestName.length);
            report.push("错误：" + errors.length);

            if (notFound.length) {
                report.push("\n【未找到同名文件】\n" + limitList(notFound, 40));
            }

            if (ambiguous.length) {
                report.push("\n【同名冲突，已跳过】\n" + limitList(ambiguous, 30));
            }

            if (noManifestName.length) {
                report.push("\n【无法从 XMP 取得文件名】\n" + limitList(noManifestName, 20));
            }

            if (errors.length) {
                report.push("\n【重新链接错误】\n" + limitList(errors, 20));
            }

            return "REPORT|" +
                root.fsName + "|" +
                scannedFiles + "|" +
                missingCount + "|" +
                relinkedCount + "|" +
                alreadyOK + "|" +
                notFound.length + "|" +
                ambiguous.length + "|" +
                noManifestName.length + "|" +
                errors.length + "|" +
                report.join("\n");

        } catch (err) {
            return "ERR|" + err.message;
        }
    }

    function sendAutoRelink(rawPath, recursive, saveIfNeeded) {
        setBusy(true, "正在扫描并恢复缺失链接…");
        reportBox.text = "正在处理，请稍候…";

        var bt = new BridgeTalk();
        bt.target = "illustrator";

        bt.body =
            "(" + autoRelinkWorker.toString() + ")(" +
            jsQuote(rawPath) + "," +
            (recursive ? "true" : "false") + "," +
            (saveIfNeeded ? "true" : "false") +
            ");";

        bt.onResult = function (res) {
            setBusy(false);

            var result = String(res.body);
            var p = result.split("|");

            if (p[0] === "NEEDSAVE") {
                reportBox.text = "文档尚未保存。";

                var ok = confirm(
                    "当前文档有尚未保存的修改。\n\n" +
                    "自动恢复缺失链接需要读取 AI 文档中的 XMP Manifest，保存后最可靠。\n\n" +
                    "建议先备份 AI 文件。\n\n" +
                    "现在保存当前文档并继续吗？"
                );

                if (ok) {
                    sendAutoRelink(rawPath, recursive, true);
                } else {
                    statusText.text = "已取消自动恢复缺失链接。";
                }

                return;
            }

            if (p[0] === "ERR") {
                var errText = p.slice(1).join("|");
                statusText.text = errText;
                reportBox.text = errText;
                return;
            }

            if (p[0] === "REPORT") {
                // 固定字段占 10 段，后面是完整报告
                var reportText = p.slice(10).join("|");
                reportBox.text = reportText;

                statusText.text =
                    "恢复完成：缺失 " + p[3] +
                    " 个；成功恢复 " + p[4] +
                    " 个；未找到 " + p[6] +
                    " 个；同名冲突 " + p[7] + " 个。";

                // Worker 已把“选择文件”的情况解析到真实父目录
                if (p[1]) {
                    pathInput.text = p[1];
                    cfg.lastFolder = p[1];
                } else {
                    cfg.lastFolder = rawPath;
                }

                cfg.recursive = recursive ? "1" : "0";
                saveConfig(cfg);
                return;
            }

            statusText.text = result;
            reportBox.text = result;
        };

        bt.onError = function (err) {
            setBusy(false);
            statusText.text = "自动恢复缺失链接失败。";
            reportBox.text = "脚本执行失败：\n" + err.body;
        };

        bt.send();
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
                    if (d.saved && d.fullName) {
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

            if (action !== "optimize") {
                return "ERR|未知优化操作。";
            }

            if (!destPath) {
                return "ERR|没有指定保存路径。";
            }

            var dest = new File(destPath);

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
            app.redraw();

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

        var bt = new BridgeTalk();
        bt.target = "illustrator";

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
            if (doc.saved && doc.fullName) {
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
                if (doc.saved && doc.fullName) {
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

    function requestOptimizeDestination(callback) {
        statusText.text = "正在打开另存为窗口…";
        try { win.update(); } catch (e0) {}

        var bt = new BridgeTalk();
        bt.target = "illustrator";
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

    function collectBatchFolderPaths(folder, outPaths) {
        var entries = [];

        try {
            entries = folder.getFiles();
        } catch (e0) {
            return;
        }

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
                collectBatchFolderPaths(entry, outPaths);
                continue;
            }

            var p = getPathStringFromPicked(entry);

            if (p && isBatchSupportedPath(p)) {
                outPaths.push(p);
            }
        }
    }

    function pickBatchSourcePathsDirect(mode) {
        var paths = [];

        if (mode === "folder") {
            var folder = Folder.selectDialog("选择包含替换图片的文件夹");

            if (!folder) {
                return null;
            }

            collectBatchFolderPaths(folder, paths);

            if (paths.length < 1) {
                alert("所选文件夹及其子文件夹中没有找到支持的图片文件。");
                return [];
            }

            try {
                cfg.lastFolder = folder.fsName;
                saveConfig(cfg);
            } catch (saveFolderErr) {}

        } else if (mode === "files") {
            var filter = null;

            if ($.os.toLowerCase().indexOf("windows") >= 0) {
                filter =
                    "图片及可置入文件:" +
                    "*.jpg;*.jpeg;*.png;*.tif;*.tiff;*.psd;*.bmp;*.gif;*.webp;*.pdf;*.ai;*.eps," +
                    "所有文件:*.*";
            } else {
                filter = function (f) {
                    try {
                        if (f instanceof Folder) return true;
                    } catch (e0) {}

                    return isBatchSupportedPath(
                        getPathStringFromPicked(f)
                    );
                };
            }

            var picked = File.openDialog(
                "选择用于批量替换的图片（可多选）",
                filter,
                true
            );

            if (!picked) {
                return null;
            }

            var list = [];
            var hasIndexZero = false;

            try {
                hasIndexZero = typeof picked[0] !== "undefined";
            } catch (e1) {}

            if (hasIndexZero) {
                try {
                    for (var p = 0; p < picked.length; p++) {
                        list.push(picked[p]);
                    }
                } catch (e2) {}
            } else {
                list.push(picked);
            }

            // 关键：这里不再 new File()、不检查 instanceof File、
            // 不检查 exists，只取得 Windows 文件窗口已经确认过的路径。
            for (var i = 0; i < list.length; i++) {
                var onePath = getPathStringFromPicked(list[i]);

                if (onePath && isBatchSupportedPath(onePath)) {
                    paths.push(onePath);
                }
            }

            if (paths.length < 1) {
                alert(
                    "文件窗口已经返回选择结果，但没有取得有效路径。\n\n" +
                    "请选择 JPG / PNG / TIFF / PSD 等图片后再试。"
                );
                return [];
            }

            try {
                var firstFile = new File(paths[0]);
                if (firstFile.parent) {
                    cfg.lastFolder = firstFile.parent.fsName;
                    saveConfig(cfg);
                }
            } catch (saveFileErr) {}
        }

        paths.sort(naturalComparePathStrings);
        return paths;
    }


    // ---------------------------------------------------------
    // 批量替换：来源方式
    // ---------------------------------------------------------
    function chooseBatchSourceMode() {
        var d = new Window("dialog", "批量替换链接");
        d.orientation = "column";
        d.alignChildren = ["fill", "top"];
        d.spacing = 10;
        d.margins = 14;

        var folderBtn = d.add("button", undefined, "选择文件夹（含子文件夹）");
        var filesBtn = d.add("button", undefined, "选择多张图片");
        var cancelBtn = d.add("button", undefined, "取消", { name: "cancel" });

        folderBtn.preferredSize.height = 32;
        filesBtn.preferredSize.height = 32;

        var result = "";

        folderBtn.onClick = function () {
            result = "folder";
            d.close(1);
        };

        filesBtn.onClick = function () {
            result = "files";
            d.close(1);
        };

        cancelBtn.onClick = function () {
            result = "";
            d.close(0);
        };

        d.center();
        d.show();

        return result;
    }

    // ---------------------------------------------------------
    // 批量替换：选择文件夹，或选择一张/多张图片
    // Windows 使用字符串过滤器，避免出现 FUNCTION(F) 文件类型。
    // ---------------------------------------------------------
    function batchSourcePickerWorker(mode, initialFolderPath) {
        try {
            function isFileObj(obj) {
                if (!obj) return false;

                try {
                    if (obj instanceof File) return true;
                } catch (e0) {}

                try {
                    return String(obj.typename || "") === "File";
                } catch (e1) {}

                return false;
            }

            function isFolderObj(obj) {
                if (!obj) return false;

                try {
                    if (obj instanceof Folder) return true;
                } catch (e0) {}

                try {
                    return String(obj.typename || "") === "Folder";
                } catch (e1) {}

                return false;
            }

            function isSupportedName(name) {
                return /\.(jpg|jpeg|png|tif|tiff|psd|bmp|gif|webp|pdf|ai|eps)$/i.test(
                    String(name || "")
                );
            }

            function naturalCompareText(a, b) {
                a = String(a || "").toLowerCase();
                b = String(b || "").toLowerCase();

                var ax = a.match(/(\d+|\D+)/g) || [a];
                var bx = b.match(/(\d+|\D+)/g) || [b];
                var n = Math.min(ax.length, bx.length);

                for (var i = 0; i < n; i++) {
                    var as = ax[i];
                    var bs = bx[i];

                    if (as === bs) continue;

                    var an = /^\d+$/.test(as) ? parseInt(as, 10) : NaN;
                    var bn = /^\d+$/.test(bs) ? parseInt(bs, 10) : NaN;

                    if (!isNaN(an) && !isNaN(bn) && an !== bn) {
                        return an < bn ? -1 : 1;
                    }

                    return as < bs ? -1 : 1;
                }

                if (ax.length === bx.length) return 0;
                return ax.length < bx.length ? -1 : 1;
            }

            function naturalCompareFiles(a, b) {
                var aa = "";
                var bb = "";

                // 递归文件夹模式下按完整路径自然排序，
                // 这样子文件夹顺序 + 文件名顺序都稳定。
                try { aa = decodeURI(a.fsName); }
                catch (e0) {
                    try { aa = decodeURI(a.name); }
                    catch (e1) { aa = String(a.name || ""); }
                }

                try { bb = decodeURI(b.fsName); }
                catch (e2) {
                    try { bb = decodeURI(b.name); }
                    catch (e3) { bb = String(b.name || ""); }
                }

                return naturalCompareText(aa, bb);
            }

            function enc(s) {
                try {
                    return encodeURIComponent(String(s || ""));
                } catch (e) {
                    return String(s || "");
                }
            }

            // 递归扫描：当前文件夹 + 所有子文件夹
            function scanFolderRecursive(folder, outFiles) {
                var entries = [];

                try {
                    entries = folder.getFiles();
                } catch (e0) {
                    return;
                }

                // 先对子项进行自然排序，保证扫描顺序稳定。
                entries.sort(function (a, b) {
                    var an = "";
                    var bn = "";

                    try { an = decodeURI(a.name); } catch (e1) { an = String(a.name || ""); }
                    try { bn = decodeURI(b.name); } catch (e2) { bn = String(b.name || ""); }

                    return naturalCompareText(an, bn);
                });

                for (var i = 0; i < entries.length; i++) {
                    var entry = entries[i];

                    if (isFolderObj(entry)) {
                        scanFolderRecursive(entry, outFiles);
                        continue;
                    }

                    if (
                        isFileObj(entry) &&
                        isSupportedName(entry.name)
                    ) {
                        outFiles.push(entry);
                    }
                }
            }

            if (initialFolderPath) {
                try {
                    var initial = new Folder(initialFolderPath);
                    if (initial.exists) Folder.current = initial;
                } catch (e4) {}
            }

            var files = [];
            var sourceFolder = "";

            if (mode === "folder") {
                var folder = Folder.selectDialog("选择包含替换图片的文件夹");

                if (!folder) {
                    return "CANCEL|已取消选择。";
                }

                sourceFolder = folder.fsName;

                // 关键修复：递归读取所选文件夹及所有子文件夹。
                scanFolderRecursive(folder, files);

            } else if (mode === "files") {
                var fileFilter = null;

                if ($.os.toLowerCase().indexOf("windows") >= 0) {
                    fileFilter =
                        "图片及可置入文件:" +
                        "*.jpg;*.jpeg;*.png;*.tif;*.tiff;*.psd;*.bmp;*.gif;*.webp;*.pdf;*.ai;*.eps," +
                        "所有文件:*.*";
                } else {
                    fileFilter = function (f) {
                        if (isFolderObj(f)) return true;
                        return isSupportedName(f.name);
                    };
                }

                var picked = File.openDialog(
                    "选择用于批量替换的图片（可多选）",
                    fileFilter,
                    true
                );

                if (!picked) {
                    return "CANCEL|已取消选择。";
                }

                // Illustrator 的 File.openDialog(..., true) 在部分版本中
                // 返回的多选项目无法稳定通过 instanceof File / typename 判断。
                // 因此这里不再判断对象类型，而是直接读取路径，再重新构造成 File。
                function normalizePickedFile(obj) {
                    if (!obj) return null;

                    var rawPath = "";

                    try {
                        if (obj.fsName) rawPath = String(obj.fsName);
                    } catch (e0) {}

                    if (!rawPath) {
                        try {
                            if (obj.fullName) rawPath = String(obj.fullName);
                        } catch (e1) {}
                    }

                    if (!rawPath) {
                        try {
                            rawPath = String(obj);
                        } catch (e2) {}
                    }

                    if (!rawPath) return null;

                    try {
                        var f = new File(rawPath);

                        if (
                            f.exists &&
                            isSupportedName(f.name)
                        ) {
                            return f;
                        }
                    } catch (e3) {}

                    return null;
                }

                var pickedList = [];

                // 多选通常返回 Array。
                // 不使用 picked.length 直接判断，因为 File 自身也可能有 length（文件大小）。
                var looksLikeArray = false;

                try {
                    looksLikeArray =
                        (picked instanceof Array) ||
                        (typeof picked[0] !== "undefined");
                } catch (arrayErr) {}

                if (looksLikeArray) {
                    try {
                        for (var p = 0; p < picked.length; p++) {
                            pickedList.push(picked[p]);
                        }
                    } catch (multiErr) {}
                } else {
                    pickedList.push(picked);
                }

                for (var q = 0; q < pickedList.length; q++) {
                    var normalizedFile = normalizePickedFile(pickedList[q]);

                    if (normalizedFile) {
                        files.push(normalizedFile);
                    }
                }

                if (files.length > 0) {
                    try {
                        sourceFolder = files[0].parent.fsName;
                    } catch (e5) {}
                }

            } else {
                return "ERR|未知来源选择方式。";
            }

            if (files.length < 1) {
                if (mode === "folder") {
                    return "ERR|所选文件夹及其所有子文件夹中都没有找到支持的图片文件。";
                }

                var rawPickedCount = 0;
                try {
                    rawPickedCount = pickedList ? pickedList.length : 0;
                } catch (countErr) {}

                return "ERR|文件窗口返回了 " + rawPickedCount +
                    " 个选择项，但脚本没有成功转换成可用图片文件。";
            }

            files.sort(naturalCompareFiles);

            var parts = ["FILES", enc(sourceFolder), String(files.length)];

            for (var x = 0; x < files.length; x++) {
                parts.push(enc(files[x].fsName));
            }

            return parts.join("|");

        } catch (err) {
            return "ERR|" + err.message;
        }
    }

    function requestBatchSourcePicker(mode, initialFolderPath, callback) {
        statusText.text =
            mode === "folder"
                ? "正在选择图片文件夹…"
                : "正在选择图片…";

        try { win.update(); } catch (e0) {}

        var bt = new BridgeTalk();
        bt.target = "illustrator";

        bt.body =
            "(" + batchSourcePickerWorker.toString() + ")(" +
            jsQuote(mode) + "," +
            jsQuote(initialFolderPath || "") +
            ");";

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

            if (p[0] !== "FILES" || p.length < 4) {
                statusText.text = "没有取得可替换的图片。";
                alert("没有取得可替换的图片。");
                return;
            }

            function dec(s) {
                try {
                    return decodeURIComponent(String(s || ""));
                } catch (e) {
                    return String(s || "");
                }
            }

            var sourceFolder = dec(p[1]);
            var detectedCount = Number(p[2] || 0);
            var paths = [];

            for (var i = 3; i < p.length; i++) {
                var one = dec(p[i]);
                if (one) paths.push(one);
            }

            if (sourceFolder) {
                cfg.lastFolder = sourceFolder;
                saveConfig(cfg);
            }

            statusText.text = "已找到 " + detectedCount + " 个可用图片文件。";

            callback(paths);
        };

        bt.onError = function (err) {
            statusText.text = "选择批量替换来源失败。";
            alert(
                "选择批量替换来源失败：\n" +
                String(err.body || err)
            );
        };

        bt.send();
    }


    // ---------------------------------------------------------
    // 文件 / 文件夹选择：Illustrator 主环境执行
    // 用于“链接”页，避免 system.callSystem 不存在时同样报错。
    // ---------------------------------------------------------
    function pathPickerWorker(modeFolder, initialFolderPath, dialogTitle) {
        try {
            if (initialFolderPath) {
                try {
                    var initial = new Folder(initialFolderPath);
                    if (initial.exists) {
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
        statusText.text = modeFolder ? "正在打开文件夹选择窗口…" : "正在打开文件选择窗口…";
        try { win.update(); } catch (e0) {}

        var bt = new BridgeTalk();
        bt.target = "illustrator";

        bt.body =
            "(" + pathPickerWorker.toString() + ")(" +
            (modeFolder ? "true" : "false") + "," +
            jsQuote(initialFolderPath || "") + "," +
            jsQuote(dialogTitle || "") +
            ");";

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
                alert("打开选择窗口失败：\n" + msg);
                return;
            }

            if (p[0] !== "PICK") {
                statusText.text = "无法取得选择结果。";
                alert("无法取得选择结果：\n" + result);
                return;
            }

            callback(p.slice(1).join("|"));
        };

        bt.onError = function (err) {
            statusText.text = "打开选择窗口失败。";
            alert(
                "打开选择窗口失败：\n" +
                String(err.body || err)
            );
        };

        bt.send();
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

    function resolveInitialFolder(pathText) {
        var s = cleanOuterQuotes(trimString(String(pathText || "")));
        if (!s) return null;

        try {
            var d = new Folder(s);
            if (d.exists) return d;
        } catch (e0) {}

        try {
            var f = new File(s);
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
    readBtn.onClick = function () {
        sendSize("read", 0, 0);
    };

    swapBtn.onClick = function () {
        var t = wInput.text;
        wInput.text = hInput.text;
        hInput.text = t;
        statusText.text = "已交换 W / H。";
    };

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

    matchWBtn.onClick = function () {
        sendSize("matchW", 0, 0);
    };

    matchHBtn.onClick = function () {
        sendSize("matchH", 0, 0);
    };

    matchWHBtn.onClick = function () {
        sendSize("matchWH", 0, 0);
    };

    wInput.onEnterKey = function () {
        setWBtn.notify("onClick");
    };

    hInput.onEnterKey = function () {
        setHBtn.notify("onClick");
    };

    // ---------------------------------------------------------
    // 链接事件：统一替换
    // ---------------------------------------------------------
    replaceBtn.onClick = function () {
        var initial = resolveInitialFolder(pathInput.text);

        requestPathPicker(
            false,
            initial ? initial.fsName : "",
            "选择用于统一替换的图片",
            function (picked) {
                if (!picked) return;

                if (!/\.(jpg|jpeg|png|tif|tiff|psd|bmp|gif|webp|pdf|ai|eps)$/i.test(picked)) {
                    alert(
                        "请选择常见图片或可置入文件：\n" +
                        "JPG / PNG / TIFF / PSD / BMP / GIF / WEBP / PDF / AI / EPS"
                    );
                    return;
                }

                var f = new File(picked);

                if (!f.exists) {
                    alert("所选文件不存在。");
                    return;
                }

                sendReplaceLinks(f.fsName);
            }
        );
    };

    // ---------------------------------------------------------
    // 链接事件：批量替换链接
    // ---------------------------------------------------------
    batchReplaceBtn.onClick = function () {
        var mode = chooseBatchSourceMode();

        if (!mode) {
            statusText.text = "已取消批量替换。";
            return;
        }

        statusText.text =
            mode === "folder"
                ? "正在读取文件夹图片…"
                : "正在选择图片…";

        try { win.update(); } catch (e0) {}

        var paths = null;

        try {
            paths = pickBatchSourcePathsDirect(mode);
        } catch (pickErr) {
            statusText.text = "选择来源失败。";
            alert("选择来源失败：\n" + pickErr.message);
            return;
        }

        if (paths === null) {
            statusText.text = "已取消批量替换。";
            return;
        }

        if (!paths || paths.length < 1) {
            statusText.text = "没有可用于替换的图片。";
            return;
        }

        statusText.text =
            "已读取 " + paths.length + " 张来源图片，正在替换…";

        try { win.update(); } catch (e1) {}

        sendBatchReplaceLinks(paths);
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
    clearPathBtn.onClick = function () {
        pathInput.text = "";
        pathInput.active = true;
    };

    chooseFolderBtn.onClick = function () {
        var initial = resolveInitialFolder(pathInput.text);

        requestPathPicker(
            true,
            initial ? initial.fsName : "",
            "选择包含原图片的文件夹",
            function (result) {
                if (!result) return;

                pathInput.text = result;
                cfg.lastFolder = result;
                cfg.recursive = recursiveCb.value ? "1" : "0";
                saveConfig(cfg);
                statusText.text = "已选择搜索文件夹。";
            }
        );
    };

    chooseFileBtn.onClick = function () {
        var initial = resolveInitialFolder(pathInput.text);

        requestPathPicker(
            false,
            initial ? initial.fsName : "",
            "选择目标文件夹中的任意一个文件",
            function (result) {
                if (!result) return;

                var f = new File(result);

                if (f.exists && f.parent && f.parent.exists) {
                    pathInput.text = f.parent.fsName;
                    cfg.lastFolder = f.parent.fsName;
                    cfg.recursive = recursiveCb.value ? "1" : "0";
                    saveConfig(cfg);
                    statusText.text = "已使用该文件所在文件夹。";
                } else {
                    pathInput.text = result;
                }
            }
        );
    };

    recursiveCb.onClick = function () {
        cfg.recursive = recursiveCb.value ? "1" : "0";
        cfg.lastFolder = pathInput.text;
        saveConfig(cfg);
    };

    autoRelinkBtn.onClick = function () {
        var rawPath = cleanOuterQuotes(trimString(pathInput.text));

        if (!rawPath) {
            alert("请先输入或选择一个搜索文件夹。");
            return;
        }

        sendAutoRelink(rawPath, recursiveCb.value, false);
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

    // ---------------------------------------------------------
    // 关闭窗口
    // ---------------------------------------------------------
    win.onClose = function () {
        try {
            cfg.lastFolder = pathInput.text;
            cfg.recursive = recursiveCb.value ? "1" : "0";
            saveConfig(cfg);
        } catch (e0) {}

        try {
            $.global[KEY] = null;
        } catch (e1) {}
    };

    win.center();
    win.show();

})();
