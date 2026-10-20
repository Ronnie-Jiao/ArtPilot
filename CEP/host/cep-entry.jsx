#target illustrator
#targetengine "AI_MERGED_TOOLBOX"

(function () {
    try {
        $.global["LINGHUI_CEP_MODE"] = true;
        $.global["LINGHUI_CEP_BOOT_ERROR"] = "";
        // CEP does not reliably set $.fileName for its first loaded JSX file.
        // The HTML panel supplies its absolute extension path before loading us.
        var extensionRoot = String($.global["LINGHUI_CEP_ROOT"] || "");
        if (!extensionRoot) {
            // Illustrator can retain the old manifest's ScriptPath until the
            // application exits. That preload has no HTML-supplied path yet.
            // Support our per-user installation without relying on $.fileName.
            var installedRoot = new Folder(Folder.userData.fsName + "/Adobe/CEP/extensions/com.ronniejiao.linghui");
            if (!installedRoot.exists) throw new Error("Linghui extension path was not supplied.");
            extensionRoot = installedRoot.fsName.replace(/\\/g, "/");
            $.global["LINGHUI_CEP_ROOT"] = extensionRoot;
        }
        var backendFile = new File(extensionRoot + "/host/linghui.jsx");
        if (!backendFile.exists) throw new Error("Cannot find Linghui host script: " + backendFile.fsName);

        $.global["LINGHUI_CEP_API"] = null;
        $.evalFile(backendFile);
        var api = $.global["LINGHUI_CEP_API"];
        if (!api || api.version !== "1.1.21") throw new Error("Linghui host API did not initialize.");
        return "OK";
    } catch (error) {
        var message = String(error && error.message ? error.message : error);
        try { $.global["LINGHUI_CEP_BOOT_ERROR"] = message; } catch (storeError) {}
        return "ERR|" + message;
    }
}());
