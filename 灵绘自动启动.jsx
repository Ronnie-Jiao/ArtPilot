#target illustrator
#targetengine "AI_MERGED_TOOLBOX"

(function () {
    var paletteKey = "__AI_MERGED_TOOLBOX__";
    var closedKey = "__AI_MERGED_TOOLBOX_AUTOSTART_CLOSED__";
    var startupLog = new File(Folder.userData.fsName + "/Linhui_Startup.log");

    function logStartup(message) {
        try {
            if (startupLog.open("a")) {
                startupLog.writeln(new Date().toString() + " | " + message);
                startupLog.close();
            }
        } catch (logError) {}
    }

    logStartup("startup entry executed");

    try {
        if ($.global[closedKey] === true) {
            logStartup("skipped because the panel was closed in this session");
            return;
        }

        var existingPalette = $.global[paletteKey];
        if (existingPalette && existingPalette.visible) {
            logStartup("skipped because the panel is already visible");
            return;
        }
    } catch (stateError) {}

    var mainScript = new File("C:/develop/ArtPilot/灵绘.jsx");

    if (!mainScript.exists) {
        logStartup("main script not found: " + mainScript.fsName);
        alert("找不到灵绘脚本：\n" + mainScript.fsName);
        return;
    }

    try {
        $.evalFile(mainScript);
        logStartup("main script evaluated");
    } catch (evalError) {
        logStartup("main script error: " + evalError.toString());
        alert("灵绘启动失败：\n" + evalError.toString());
    }
})();
