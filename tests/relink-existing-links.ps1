[CmdletBinding()]
param([switch]$ProbeNativeRelink)

$ErrorActionPreference = 'Stop'
$app = [Runtime.InteropServices.Marshal]::GetActiveObject('Illustrator.Application.29')
$root = Join-Path ([IO.Path]::GetTempPath()) ('Linghui-Relink-Verification-' + [guid]::NewGuid().ToString('N'))
$source = Join-Path $PSScriptRoot '..\CEP\host\linghui.jsx'
$backend = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $source))
$workerStart = $backend.IndexOf('    function batchReplaceLinksWorker(')
$workerEnd = $backend.IndexOf('    function sendBatchReplaceLinks(', $workerStart)
if ($workerStart -lt 0 -or $workerEnd -le $workerStart) { throw 'Replacement worker was not found.' }
$worker = $backend.Substring($workerStart, $workerEnd - $workerStart).Trim()
$template = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'relink-existing-links.jsx'))
$template = $template.Replace('/* LINGHUI_RELINK_WORKER */ null', '(' + $worker + ')')
$escapedRoot = $root.Replace('\', '\\').Replace('"', '\"')
$engine = '#targetengine "LINGHUI_RELINK_VERIFICATION"' + "`n"
$script = $engine + '$.global["__LINGHUI_RELINK_TEST_ROOT__"]="' + $escapedRoot + '";' + "`n" + $template
$testLoaded = $false
$beforeCount = $app.Documents.Count
$originalName = if ($beforeCount) { $app.ActiveDocument.Name } else { $null }
$originalSaved = if ($beforeCount) { $app.ActiveDocument.Saved } else { $null }

function Invoke-Verification([string]$Phase) {
    $code = $engine + '$.global["__LINGHUI_RELINK_TEST__"].' + $Phase + '();'
    $result = [string]$app.DoJavaScript($code)
    if (-not $result.StartsWith('OK|')) { throw "Verification phase failed: $Phase : $result" }
    Write-Output $result
}

try {
    New-Item -ItemType Directory -Path $root | Out-Null
    Add-Type -AssemblyName System.Drawing
    foreach ($spec in @(
        @{ Name = 'old.bmp'; Width = 180; Height = 120; Color = [Drawing.Color]::DarkBlue },
        @{ Name = 'new-01.bmp'; Width = 60; Height = 180; Color = [Drawing.Color]::OrangeRed },
        @{ Name = 'new-02.bmp'; Width = 200; Height = 80; Color = [Drawing.Color]::ForestGreen }
    )) {
        $bitmap = New-Object Drawing.Bitmap($spec.Width, $spec.Height)
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        try {
            $graphics.Clear($spec.Color)
            $graphics.FillRectangle([Drawing.Brushes]::White, 0, 0, 15, 20)
            $bitmap.Save((Join-Path $root $spec.Name), [Drawing.Imaging.ImageFormat]::Bmp)
        } finally {
            $graphics.Dispose()
            $bitmap.Dispose()
        }
    }
    $loaded = [string]$app.DoJavaScript($script)
    if ($loaded -ne 'OK|loaded') { throw "Verification did not initialize: $loaded" }
    $testLoaded = $true
    Invoke-Verification 'setup'
    Invoke-Verification 'checkUndo'
    if ($ProbeNativeRelink) {
        Invoke-Verification 'describe'
        Invoke-Verification 'nativeRelink'
        Invoke-Verification 'describe'
        Invoke-Verification 'undo'
        Invoke-Verification 'describe'
        Invoke-Verification 'checkUndo'
        return
    }
    Invoke-Verification 'replace'
    Invoke-Verification 'check'
    Invoke-Verification 'undo'
    Invoke-Verification 'checkUndo'
    Invoke-Verification 'shortage'
    Invoke-Verification 'checkShortage'
    Invoke-Verification 'undo'
    Invoke-Verification 'checkUndo'
    Invoke-Verification 'staleSelection'
} finally {
    if ($testLoaded) {
        Invoke-Verification 'cleanup'
    }
    if ($app.Documents.Count -ne $beforeCount) { throw 'The original document count was not restored.' }
    if ($beforeCount -and ($app.ActiveDocument.Name -ne $originalName -or $app.ActiveDocument.Saved -ne $originalSaved)) {
        throw 'The original active document state changed.'
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($app)
    Write-Output "Verification fixtures: $root"
}
