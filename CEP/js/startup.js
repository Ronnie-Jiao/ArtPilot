(function () {
    "use strict";

    var status = document.getElementById("connection-status");
    var message = document.getElementById("connection-message");
    var retry = document.getElementById("connection-retry");
    var retryHandler = null;
    var watchdog = null;

    function clearWatchdog() {
        if (watchdog !== null) window.clearTimeout(watchdog);
        watchdog = null;
    }

    function show(text, allowRetry) {
        status.hidden = false;
        message.textContent = text;
        retry.hidden = !allowRetry;
    }

    function fail(text) {
        clearWatchdog();
        show(text || "灵绘加载失败，请重试。", true);
    }

    function connecting() {
        clearWatchdog();
        show("正在连接 Illustrator…", false);
        watchdog = window.setTimeout(function () {
            fail("连接 Illustrator 超时，请重试。");
        }, 15000);
    }

    retry.addEventListener("click", function () {
        if (typeof retryHandler === "function") retryHandler();
        else window.location.reload();
    });

    // Install this before the panel scripts so a resource or startup error is
    // visible on every tab, including the default size page.
    window.addEventListener("error", function (event) {
        if (event.target && event.target.tagName === "SCRIPT") {
            fail("灵绘文件加载失败，请重新加载。");
        } else if (event.error || event.message) {
            fail("灵绘运行出错，请重试。");
        }
    }, true);
    window.addEventListener("unhandledrejection", function () {
        fail("灵绘运行出错，请重试。");
    });

    window.LinghuiPanelStartup = {
        connecting: connecting,
        fail: fail,
        ready: function () {
            clearWatchdog();
            status.hidden = true;
        },
        onRetry: function (handler) { retryHandler = handler; }
    };

    connecting();
}());
