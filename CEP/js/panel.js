(function () {
    "use strict";

    var tabs = Array.prototype.slice.call(document.querySelectorAll("[role='tab'][data-page]"));
    var pages = Array.prototype.slice.call(document.querySelectorAll("[role='tabpanel']"));
    var cs = null;
    var hostReady = false;
    var polling = false;
    var lastHostState = null;
    var fieldControls = {
        width: document.getElementById("width-input"),
        height: document.getElementById("height-input"),
        unit: document.getElementById("unit-select"),
        keepRatio: document.getElementById("keep-ratio"),
        scaleStroke: document.getElementById("scale-stroke"),
        anchor: document.getElementById("anchor-select"),
        path: document.getElementById("path-input"),
        recursive: document.getElementById("recursive-check"),
        pdfCompat: document.getElementById("pdf-compat"),
        icc: document.getElementById("embed-icc")
    };

    function activateTab(tab, moveFocus) {
        var pageName = tab.getAttribute("data-page");
        tabs.forEach(function (item) {
            var active = item === tab;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-selected", active ? "true" : "false");
            item.tabIndex = active ? 0 : -1;
        });
        pages.forEach(function (page) {
            page.hidden = page.id !== "page-" + pageName;
        });
        if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab, index) {
        tab.tabIndex = index === 0 ? 0 : -1;
        tab.addEventListener("click", function () { activateTab(tab, false); });
        tab.addEventListener("keydown", function (event) {
            var nextIndex = index;
            if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
            else if (event.key === "ArrowLeft") nextIndex = (index + tabs.length - 1) % tabs.length;
            else if (event.key === "Home") nextIndex = 0;
            else if (event.key === "End") nextIndex = tabs.length - 1;
            else return;
            event.preventDefault();
            activateTab(tabs[nextIndex], true);
        });
    });

    function extendScriptString(value) {
        return "\"" + String(value)
            .replace(/\\/g, "\\\\")
            .replace(/\"/g, "\\\"")
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n") + "\"";
    }

    function evalHost(expression, callback) {
        if (!cs) return;
        cs.evalScript('#targetengine "AI_MERGED_TOOLBOX"; ' + expression, function (result) {
            if (typeof callback === "function") callback(result);
        });
    }

    function setHostField(name, value) {
        if (!hostReady) return;
        evalHost('$.global["LINGHUI_CEP_API"].setField(' + extendScriptString(name) + ',' +
            extendScriptString(value) + ')');
    }

    Object.keys(fieldControls).forEach(function (name) {
        var control = fieldControls[name];
        control.addEventListener("change", function () {
            var value = control.type === "checkbox" ? (control.checked ? "1" : "0") : control.value;
            setHostField(name, value);
        });
    });

    function setControlValue(control, value) {
        if (!control || document.activeElement === control) return;
        if (control.type === "checkbox") control.checked = !!value;
        else if (value !== undefined && value !== null) control.value = String(value);
    }

    function updateFromHost(state) {
        if (!state) return;
        lastHostState = state;
        setControlValue(fieldControls.width, state.width);
        setControlValue(fieldControls.height, state.height);
        setControlValue(fieldControls.unit, state.unit);
        setControlValue(fieldControls.keepRatio, state.keepRatio);
        setControlValue(fieldControls.scaleStroke, state.scaleStroke);
        setControlValue(fieldControls.anchor, state.anchor);
        setControlValue(fieldControls.path, state.path);
        setControlValue(fieldControls.recursive, state.recursive);
        setControlValue(fieldControls.pdfCompat, state.pdfCompat);
        setControlValue(fieldControls.icc, state.icc);

        var linkResult = document.getElementById("link-result");
        var compressResult = document.getElementById("compress-result");
        var announcement = document.getElementById("sr-status");
        if (linkResult && state.report) linkResult.textContent = state.report;
        if (compressResult && state.optimizeInfo) compressResult.textContent = state.optimizeInfo;
        if (announcement && state.status) announcement.textContent = state.status;

        document.querySelectorAll("[data-action]").forEach(function (button) {
            if (button.dataset.action !== "close") button.disabled = !!state.busy;
        });
    }

    function pollHostState() {
        if (!cs || polling) return;
        polling = true;
        evalHost('$.global["LINGHUI_CEP_API"] ? $.global["LINGHUI_CEP_API"].getState() : "NOT_READY"', function (result) {
            polling = false;
            if (result === "NOT_READY" || result === "EvalScript error.") return;
            try {
                var state = JSON.parse(result);
                hostReady = true;
                updateFromHost(state);
            } catch (error) {
                document.getElementById("sr-status").textContent = "面板连接失败。";
            }
        });
    }

    function invoke(action) {
        if (!hostReady) {
            document.getElementById("sr-status").textContent = "Illustrator 功能尚未连接。";
            return;
        }
        evalHost('$.global["LINGHUI_CEP_API"].invoke(' + extendScriptString(action) + ')', function () {
            window.setTimeout(pollHostState, 80);
        });
    }

    var tooltips = {
        close: "关闭灵绘面板。",
        "size-read": "读取当前选区第一个对象的宽度和高度。",
        "size-width": "把选中对象调整为统一宽度，可按比例缩放。",
        "size-height": "把选中对象调整为统一高度，可按比例缩放。",
        "size-both": "按填写的宽度和高度调整所有选中对象。",
        "link-replace": "选择一个文件，替换选中的链接图片。",
        "link-batch": "选择文件夹或多张图片，按原脚本规则批量替换。",
        "link-swap": "选中两张链接图片后互换源文件。",
        "link-same": "选择一张图片，替换全部选中的链接图片。",
        "path-clear": "清空链接修复搜索路径。",
        "path-folder": "选择搜索缺失链接的文件夹。",
        "path-locate": "选一个文件，并将其所在文件夹设为搜索目录。",
        relink: "按搜索路径扫描并恢复缺失链接。",
        "compress-scan": "扫描当前 AI 文件大小、画板及链接资源。",
        "compress-save": "按当前设置优化并另存为新 AI 文件。",
        "compress-overwrite": "按当前设置优化并覆盖保存当前 AI 文件。"
    };

    document.querySelectorAll("button[data-action]").forEach(function (button) {
        button.addEventListener("click", function () {
            var action = button.dataset.action;
            if (action === "close") {
                if (cs) cs.closeExtension();
                return;
            }
            invoke(action);
        });
        if (tooltips[button.dataset.action]) button.title = tooltips[button.dataset.action];
    });

    activateTab(tabs[0], false);

    if (typeof CSInterface !== "undefined" && window.__adobe_cep__) {
        cs = new CSInterface();
        pollHostState();
        window.setInterval(pollHostState, 650);
    }
}());
