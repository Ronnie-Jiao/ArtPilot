[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$app = [Runtime.InteropServices.Marshal]::GetActiveObject('Illustrator.Application.29')
$script = @'
(function () {
    var lines = [];
    lines.push("engine=" + $.engineName);
    lines.push("target=" + BridgeTalk.appSpecifier);
    lines.push("registered=" + BridgeTalk.getTargets().join(","));
    lines.push("api-before=" + ($.global.LINGHUI_CEP_API ? $.global.LINGHUI_CEP_API.version : "missing"));
    var root = Folder.userData.fsName + "/Adobe/CEP/extensions/com.ronniejiao.linghui";
    $.global.LINGHUI_CEP_ROOT = root;
    $.global.LINGHUI_CEP_MODE = true;
    try {
        var result = $.evalFile(new File(root + "/host/cep-entry.jsx"));
        lines.push("bootstrap=" + String(result));
        lines.push("api-after=" + ($.global.LINGHUI_CEP_API ? $.global.LINGHUI_CEP_API.version : "missing"));
        lines.push("boot-error=" + String($.global.LINGHUI_CEP_BOOT_ERROR || ""));
        if ($.global.LINGHUI_CEP_API) lines.push("state=" + $.global.LINGHUI_CEP_API.getState());
    } catch (error) {
        lines.push("exception=" + String(error));
    }
    return lines.join("\n");
}());
'@
try {
    $app.DoJavaScript($script)
} finally {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
}
