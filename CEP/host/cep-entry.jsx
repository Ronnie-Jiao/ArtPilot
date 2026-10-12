#target illustrator
#targetengine "AI_MERGED_TOOLBOX"

(function () {
    try {
        $.global["LINGHUI_CEP_MODE"] = true;
        var entryFile = new File($.fileName);
        var backendFile = new File(entryFile.parent.fsName + "/linghui.jsx");
        if (!backendFile.exists) throw new Error("Cannot find Linghui host script: " + backendFile.fsName);

        $.evalFile(backendFile);
        if (!$.global["LINGHUI_CEP_API"]) throw new Error("Linghui host API did not initialize.");
        return "OK";
    } catch (error) {
        alert("Linghui CEP panel initialization failed:\n" + error.message);
        return "ERR";
    }
}());
