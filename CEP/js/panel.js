(function () {
    "use strict";

    var tabs = Array.prototype.slice.call(document.querySelectorAll("[role='tab'][data-page]"));
    var pages = Array.prototype.slice.call(document.querySelectorAll("[role='tabpanel']"));
    var cs = null;
    var hostReady = false;
    var connectionFailures = 0;
    var nextHostPollAt = 0;
    var polling = false;
    var invoking = false;
    var hostVersion = "1.1.33";
    var updateChecking = false;
    var updateManifestUrl = "https://api.spotcue.cekoro.cn/linghui-updates/latest.json";
    var startup = window.LinghuiPanelStartup;
    var i18n = window.ArtPilotI18n;
    var lastHostState = null;
    var lastBridgeError = "";
    var awaitingMissingReport = false;
    var fieldControls = {
        width: document.getElementById("width-input"),
        height: document.getElementById("height-input"),
        unit: document.getElementById("unit-select"),
        keepRatio: document.getElementById("keep-ratio"),
        scaleStroke: document.getElementById("scale-stroke"),
        recursive: document.getElementById("recursive-check"),
        pdfCompat: document.getElementById("pdf-compat"),
        icc: document.getElementById("embed-icc")
    };

    function localizedText(element, source) {
        if (!element) return;
        source = String(source === undefined || source === null ? "" : source);
        element.setAttribute("data-linghui-source", source);
        element.textContent = i18n ? i18n.translateMessage(source) : source;
    }

    function translated(key) {
        return i18n ? i18n.t(key) : key;
    }

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

    var authorGithubLink = document.getElementById("author-github-link");
    if (authorGithubLink) {
        authorGithubLink.addEventListener("click", function (event) {
            if (typeof CSInterface === "undefined" || !window.__adobe_cep__) return;
            event.preventDefault();
            try {
                (cs || new CSInterface()).openURLInDefaultBrowser(authorGithubLink.href);
            } catch (error) {
                window.open(authorGithubLink.href, "_blank", "noopener");
            }
        });
    }

    function extendScriptString(value) {
        return "\"" + String(value)
            .replace(/\\/g, "\\\\")
            .replace(/\"/g, "\\\"")
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n") + "\"";
    }

    function evalHost(expression, callback, timeoutMs) {
        if (!cs) {
            if (typeof callback === "function") callback("CEP_NOT_READY");
            return;
        }

        var completed = false;
        var timeoutId = null;
        if (timeoutMs === undefined) timeoutMs = 10000;
        function complete(result) {
            if (completed) return;
            completed = true;
            if (timeoutId !== null) window.clearTimeout(timeoutId);
            if (typeof callback === "function") callback(result);
        }
        if (typeof callback === "function" && timeoutMs > 0) {
            timeoutId = window.setTimeout(function () { complete("CEP_TIMEOUT"); }, timeoutMs);
        }

        // Keep the preprocessor directive on its own line. Bridge exceptions
        // must complete the request too, otherwise polling stays locked forever.
        try {
            var language = i18n ? i18n.getLanguage() : "zh";
            cs.evalScript(
                '#targetengine "AI_MERGED_TOOLBOX"\n' +
                '$.global["LINGHUI_CEP_LANGUAGE"]=' + extendScriptString(language) + ';\n' +
                expression,
                complete
            );
        } catch (error) {
            complete("CEP_BRIDGE_ERROR|" + String(error));
        }
    }

    function hostStateExpression() {
        var extensionPath = cs.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, "/");
        var entryPath = extensionPath + "/host/cep-entry.jsx";
        return '(function(){try{' +
            'var api=$.global["LINGHUI_CEP_API"];' +
            'if(!api||typeof api.getState!=="function"||api.version!==' + extendScriptString(hostVersion) + '){' +
            '$.global["LINGHUI_CEP_MODE"]=true;' +
            '$.global["LINGHUI_CEP_ROOT"]=' + extendScriptString(extensionPath) + ';' +
            'var entry=new File(' + extendScriptString(entryPath) + ');' +
            'if(!entry.exists)return "BOOTSTRAP_ERROR|宿主脚本不存在："+entry.fsName;' +
            'var bootResult=$.evalFile(entry);' +
            'api=$.global["LINGHUI_CEP_API"];' +
            'if(!api||typeof api.getState!=="function"||api.version!==' + extendScriptString(hostVersion) + ')return "BOOTSTRAP_ERROR|"+String($.global["LINGHUI_CEP_BOOT_ERROR"]||bootResult||"宿主接口未注册");' +
            '}' +
            'return api.getState();' +
            '}catch(e){return "BOOTSTRAP_ERROR|"+String(e);}}())';
    }

    function showActionFeedback(action, message) {
        var resultId = String(action).indexOf("compress-") === 0 ? "compress-result" : null;
        var result = resultId ? document.getElementById(resultId) : null;
        var announcement = document.getElementById("sr-status");
        if (result) {
            result.hidden = false;
            localizedText(result, message);
        }
        localizedText(announcement, message);
    }

    function setHostField(name, value) {
        if (!hostReady) return;
        evalHost('$.global["LINGHUI_CEP_API"].setField(' + extendScriptString(name) + ',' +
            extendScriptString(value) + ')');
    }

    function withCurrentFields(expression) {
        var settings = Object.keys(fieldControls).map(function (name) {
            var control = fieldControls[name];
            var value = control.type === "checkbox" ? (control.checked ? "1" : "0") : control.value;
            return 'api.setField(' + extendScriptString(name) + ',' + extendScriptString(value) + ');';
        }).join("");
        return '(function(){var api=$.global["LINGHUI_CEP_API"];' + settings + 'return ' + expression + ';}())';
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

    function setActionControlsBusy(busy) {
        document.querySelectorAll("[data-action]").forEach(function (button) {
            if (button.dataset.action !== "close" && button.dataset.action !== "check-updates" &&
                    button.dataset.action !== "toggle-language") {
                button.disabled = !!busy;
            }
        });
    }

    function updateFromHost(state) {
        if (!state) return;
        lastHostState = state;
        setControlValue(fieldControls.width, state.width);
        setControlValue(fieldControls.height, state.height);
        setControlValue(fieldControls.unit, state.unit);
        setControlValue(fieldControls.keepRatio, state.keepRatio);
        setControlValue(fieldControls.scaleStroke, state.scaleStroke);
        setControlValue(fieldControls.recursive, state.recursive);
        setControlValue(fieldControls.pdfCompat, state.pdfCompat);
        setControlValue(fieldControls.icc, state.icc);

        var compressResult = document.getElementById("compress-result");
        var announcement = document.getElementById("sr-status");
        if (compressResult && state.optimizeInfo) localizedText(compressResult, state.optimizeInfo);
        if (announcement && state.status) localizedText(announcement, state.status);

        if (awaitingMissingReport && !state.busy) {
            awaitingMissingReport = false;
            showActionFeedback("link-batch", state.report || state.status || "Illustrator 未返回修复详情。");
        }

        setActionControlsBusy(invoking || state.busy);
    }

    function connectionFailed(key, message) {
        hostReady = false;
        connectionFailures++;
        nextHostPollAt = Date.now() + Math.min(1000 * Math.pow(2, connectionFailures - 1), 8000);
        setActionControlsBusy(true);
        startup.fail(message);
        if (lastBridgeError !== key) {
            lastBridgeError = key;
            showActionFeedback("link-swap", message);
        }
    }

    function pollHostState() {
        if (!cs || polling || invoking || connectionFailures >= 3 || Date.now() < nextHostPollAt) return;
        polling = true;
        if (!hostReady) startup.connecting();
        var expression;
        try {
            expression = hostStateExpression();
        } catch (error) {
            polling = false;
            connectionFailed(String(error), "无法连接 Illustrator，请重试。");
            return;
        }
        evalHost(expression, function (rawResult) {
            polling = false;
            var result = typeof rawResult === "string"
                ? rawResult.replace(/^\s+|\s+$/g, "")
                : rawResult;
            if (typeof result === "string" && result.indexOf("BOOTSTRAP_ERROR|") === 0) {
                connectionFailed(result, "灵绘功能加载失败，请重试。");
                return;
            }
            if (result === "NOT_READY") {
                connectionFailed(result, "Illustrator 尚未就绪，请重试。");
                return;
            }
            if (result === "EvalScript error." || result === "CEP_TIMEOUT" || result === "CEP_NOT_READY" ||
                    (typeof result === "string" && result.indexOf("CEP_BRIDGE_ERROR|") === 0)) {
                connectionFailed(result, "连接 Illustrator 失败，请重试。");
                return;
            }
            if (result === undefined || result === null || result === "" || result === "undefined") {
                connectionFailed("NO_HOST_RESULT", "Illustrator 未响应，请重试。");
                return;
            }
            try {
                if (typeof result !== "string") throw new Error("宿主返回了非文本状态");
                var state = JSON.parse(result);
                if (!state || typeof state !== "object" || typeof state.busy !== "boolean") {
                    throw new Error("宿主返回了无效状态");
                }
                if (state.version !== hostVersion) throw new Error("面板与后台版本不一致");
                hostReady = true;
                connectionFailures = 0;
                nextHostPollAt = 0;
                lastBridgeError = "";
                updateFromHost(state);
                startup.ready();
            } catch (error) {
                connectionFailed(String(error), "灵绘连接失败，请重试。");
            }
        });
    }

    function invokeNativeBatchPicker(action) {
        if (invoking) return;
        var replacingPictures = action === "link-pictures";
        var recursive = !!fieldControls.recursive.checked;
        invoking = true;
        setActionControlsBusy(true);
        var announcement = document.getElementById("sr-status");
        localizedText(announcement, "正在打开 Windows 选择窗口…");

        function finishInvocation(result) {
            invoking = false;
            setActionControlsBusy(lastHostState && lastHostState.busy);
            if (!replacingPictures && result === "OK") awaitingMissingReport = true;
            if (typeof result === "string" && result.indexOf("ERR|") === 0) {
                showActionFeedback(action, result.substring(4));
            } else if (result !== "OK") {
                showActionFeedback(action, "无法取得 Illustrator 操作结果，请重新打开灵绘面板。");
            }
            pollHostState();
        }

        function acceptSelection(selection) {
            var items = "null";
            var error = "";
            if (selection.status === "ok") {
                items = "[" + selection.items.map(extendScriptString).join(",") + "]";
            } else if (selection.status === "error") {
                error = selection.message || "Windows 选择窗口执行失败。";
            }
            evalHost('$.global["LINGHUI_CEP_API"].finishBatchSourceSelection(' + items + ',' +
                extendScriptString(error) + ',' + (replacingPictures ? 'true' : 'false') + ',' +
                (recursive ? 'true' : 'false') + ')', finishInvocation, 0);
        }

        var beginMethod = replacingPictures ? "beginPictureSourceSelection" : "beginBatchSourceSelection";
        evalHost('$.global["LINGHUI_CEP_API"].' + beginMethod + '()', function (result) {
            if (result !== "OK") {
                finishInvocation(result);
                return;
            }
            try {
                if (typeof window.LinghuiNativeBatchPicker !== "function") {
                    throw new Error("Windows 选择窗口尚未加载，请重新打开灵绘面板。");
                }
                var initial = lastHostState && lastHostState.batchSourceFolder;
                window.LinghuiNativeBatchPicker(cs, initial || "", acceptSelection);
            } catch (error) {
                acceptSelection({ status: "error", message: error.message });
            }
        });
    }

    function invoke(action) {
        if (!hostReady) {
            showActionFeedback(action, "Illustrator 功能尚未连接，请重新打开灵绘面板后重试。 ");
            return;
        }
        if (action === "link-batch" || action === "link-pictures") {
            invokeNativeBatchPicker(action);
            return;
        }
        if (invoking) return;
        invoking = true;
        setActionControlsBusy(true);
        showActionFeedback(action, "正在执行…");
        var swapping = action === "link-swap";
        var swapLabel = swapping ? document.querySelector('[data-action="link-swap"] span') : null;
        if (swapLabel) swapLabel.textContent = translated("swapping");
        var expression = withCurrentFields(swapping
            ? 'api.swapPictures()'
            : 'api.invoke(' + extendScriptString(action) + ')');
        evalHost(expression, function (result) {
            invoking = false;
            if (swapLabel) swapLabel.textContent = translated("swapLinks");
            setActionControlsBusy(lastHostState && lastHostState.busy);
            if (result === "EvalScript error." || result === "CEP_TIMEOUT" || result === "CEP_NOT_READY" ||
                    (typeof result === "string" && result.indexOf("CEP_BRIDGE_ERROR|") === 0)) {
                showActionFeedback(action, "Illustrator 通信失败，请重新打开灵绘面板后重试。 ");
                return;
            }
            if (result === undefined || result === null || result === "" || result === "undefined") {
                showActionFeedback(action, "Illustrator 宿主未返回操作结果，请重新打开灵绘面板后重试。 ");
                return;
            }
            if (typeof result === "string" && result.indexOf("ERR|") === 0) {
                showActionFeedback(action, result.substring(4));
                return;
            }
            if (swapping) {
                if (typeof result === "string" && result.indexOf("SWAPPED_MISSING|") === 0) {
                    var missingNames = result.split("|");
                    showActionFeedback(action, i18n ? i18n.format("swapMissingComplete", {
                        first: missingNames[1], second: missingNames[2]
                    }) : "互换完成（含缺图）：" + missingNames[1] + " ⇄ " + missingNames[2] +
                        "；正常图片已移至缺图位置，缺失链接仍需修复；可按 Ctrl+Z 撤回。");
                } else if (typeof result === "string" && result.indexOf("SWAPPED|") === 0) {
                    var names = result.split("|");
                    showActionFeedback(action, i18n ? i18n.format("swapComplete", {
                        first: names[1], second: names[2]
                    }) : "互换完成：" + names[1] + " ⇄ " + names[2] + "；可按 Ctrl+Z 撤回。");
                } else {
                    showActionFeedback(action, "没有取得图片互换的完成结果，请重新打开灵绘面板后重试。");
                    return;
                }
            }
            window.setTimeout(pollHostState, 80);
        }, 0);
    }

    function compareVersions(left, right) {
        var leftParts = String(left).split(".");
        var rightParts = String(right).split(".");
        for (var i = 0; i < 3; i++) {
            var leftNumber = Number(leftParts[i]);
            var rightNumber = Number(rightParts[i]);
            if (leftNumber > rightNumber) return 1;
            if (leftNumber < rightNumber) return -1;
        }
        return 0;
    }

    function checkForUpdates(button) {
        if (updateChecking) return;
        updateChecking = true;
        var label = button.querySelector("span");
        button.disabled = true;
        if (label) label.textContent = translated("checking");

        function finish() {
            updateChecking = false;
            button.disabled = false;
            if (label) label.textContent = translated("checkUpdates");
        }

        function showFailure() {
            window.alert(translated("updateFailed"));
        }

        var request = new XMLHttpRequest();
        request.timeout = 15000;
        request.open("GET", updateManifestUrl + "?t=" + new Date().getTime(), true);
        request.setRequestHeader("Accept", "application/json");
        request.onload = function () {
            try {
                if (request.status < 200 || request.status >= 300) throw new Error("HTTP " + request.status);
                var release = JSON.parse(request.responseText);
                if (!release || release.product !== "com.ronniejiao.linghui" ||
                        typeof release.latestVersion !== "string" ||
                        !/^\d+\.\d+\.\d+$/.test(release.latestVersion) ||
                        typeof release.downloadUrl !== "string" ||
                        release.downloadUrl !== "https://api.spotcue.cekoro.cn/linghui-updates/Linghui-CEP-" +
                            release.latestVersion + ".zip" ||
                        typeof release.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(release.sha256)) {
                    throw new Error("Invalid update manifest");
                }

                var comparison = compareVersions(release.latestVersion, hostVersion);
                if (comparison === 0) {
                    window.alert(i18n ? i18n.format("updateCurrent", { version: hostVersion }) : "灵绘已是最新版本（" + hostVersion + "）。");
                } else if (comparison < 0) {
                    window.alert(i18n ? i18n.format("updateAhead", {
                        current: hostVersion, latest: release.latestVersion
                    }) : "当前版本（" + hostVersion + "）高于更新服务器所列版本（" + release.latestVersion + "）。");
                } else if (window.confirm(i18n ? i18n.format("updatePrompt", { version: release.latestVersion }) : "发现灵绘新版本 " + release.latestVersion + "。\n下载后解压并运行安装脚本即可更新。\n\n现在打开下载包？")) {
                    if (!cs || typeof cs.openURLInDefaultBrowser !== "function") {
                        throw new Error("Default browser bridge unavailable");
                    }
                    cs.openURLInDefaultBrowser(release.downloadUrl);
                }
            } catch (error) {
                showFailure();
            }
            finish();
        };
        request.onerror = function () { finish(); showFailure(); };
        request.ontimeout = function () { finish(); showFailure(); };
        request.onabort = function () { finish(); showFailure(); };
        try {
            request.send(null);
        } catch (error) {
            finish();
            showFailure();
        }
    }

    var tooltips = {
        close: "关闭灵绘面板。",
        "size-width": "把选中对象调整为统一宽度，可按比例缩放。",
        "size-height": "把选中对象调整为统一高度，可按比例缩放。",
        "size-both": "按填写的宽度和高度调整所有选中对象。",
        "link-batch": "选择图片或文件夹，替换选中图片并按文件名修复文档中的缺失图片。",
        "link-swap": "互换链接或嵌入图片；缺失链接也可参与互换。",
        "link-pictures": "将选中的已有链接重新链接到新选图片，按画面顺序逐张替换，保留中心、高度和旋转。",
        "check-updates": "查询灵绘更新服务器上的最新版本。",
        "compress-scan": "扫描当前 AI 文件大小、画板及链接资源。",
        "compress-save": "按当前设置优化并另存为新 AI 文件。",
        "compress-overwrite": "按当前设置优化并覆盖保存当前 AI 文件。"
    };

    function updateTooltips() {
        document.querySelectorAll("button[data-action]").forEach(function (button) {
            if (tooltips[button.dataset.action]) {
                button.title = i18n ? i18n.translateMessage(tooltips[button.dataset.action]) : tooltips[button.dataset.action];
            }
        });
    }

    document.querySelectorAll("button[data-action]").forEach(function (button) {
        button.addEventListener("click", function () {
            var action = button.dataset.action;
            if (action === "check-updates") {
                checkForUpdates(button);
                return;
            }
            if (action === "toggle-language") {
                if (i18n) i18n.toggleLanguage();
                return;
            }
            invoke(action);
        });
    });

    updateTooltips();
    window.addEventListener("linghui-language-change", function () {
        document.querySelectorAll("[data-linghui-source]").forEach(function (element) {
            element.textContent = i18n ? i18n.translateMessage(element.getAttribute("data-linghui-source"))
                : element.getAttribute("data-linghui-source");
        });
        updateTooltips();
        evalHost("void 0;", null, 0);
    });

    activateTab(tabs[0], false);

    function connectHost() {
        if (polling || invoking) return;
        hostReady = false;
        connectionFailures = 0;
        nextHostPollAt = 0;
        lastBridgeError = "";
        setActionControlsBusy(true);
        startup.connecting();
        try {
            if (typeof CSInterface === "undefined" || !window.__adobe_cep__) {
                throw new Error("CEP bridge unavailable");
            }
            cs = new CSInterface();
        } catch (error) {
            cs = null;
            connectionFailed(String(error), "无法连接 Illustrator，请重新加载。");
            return;
        }
        // Let the HTML paint before evaluating the host's ExtendScript, which
        // executes on Illustrator's main thread.
        window.setTimeout(pollHostState, 100);
    }

    startup.onRetry(function () {
        if (!cs) window.location.reload();
        else connectHost();
    });
    window.setInterval(pollHostState, 650);
    connectHost();
}());
