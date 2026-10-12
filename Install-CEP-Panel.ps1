[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$source = Join-Path $PSScriptRoot "CEP"
$extensionId = "com.ronniejiao.linghui"
$destination = Join-Path $env:APPDATA ("Adobe\CEP\extensions\" + $extensionId)
$stamp = Get-Date -Format "yyyyMMdd-HHmmss-fff"
$staging = $destination + ".staging-" + $stamp
$backup = $destination + ".backup-" + $stamp
$requiredFiles = @(
    "CSXS\manifest.xml",
    "index.html",
    "css\panel.css",
    "js\panel.js",
    "lib\CSInterface.js",
    "host\cep-entry.jsx",
    "host\linghui.jsx"
)

foreach ($relativePath in $requiredFiles) {
    $candidate = Join-Path $source $relativePath
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw "Missing extension file: $candidate"
    }
}

if (Get-Process -Name Illustrator -ErrorAction SilentlyContinue) {
    throw "Close Illustrator before installing the CEP extension. The installer will not close it for you."
}

Write-Host "This installs the unsigned Linghui CEP panel for the current Windows user."
Write-Host "Install location: $destination"
$confirmation = Read-Host "Continue? Type Y to install"
if ($confirmation -notmatch "^(y|yes)$") {
    Write-Host "Installation cancelled."
    exit 0
}

$parent = Split-Path -Parent $destination
New-Item -ItemType Directory -Force -Path $parent | Out-Null
New-Item -ItemType Directory -Path $staging | Out-Null

try {
    foreach ($relativePath in $requiredFiles) {
        $sourceFile = Join-Path $source $relativePath
        $targetFile = Join-Path $staging $relativePath
        $targetDirectory = Split-Path -Parent $targetFile
        New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
        Copy-Item -LiteralPath $sourceFile -Destination $targetFile
    }

    if (Test-Path -LiteralPath $destination) {
        Move-Item -LiteralPath $destination -Destination $backup
    }

    try {
        Move-Item -LiteralPath $staging -Destination $destination
    } catch {
        if ((Test-Path -LiteralPath $backup) -and -not (Test-Path -LiteralPath $destination)) {
            Move-Item -LiteralPath $backup -Destination $destination
        }
        throw
    }
} catch {
    Write-Error "Installation failed. The previous install, if any, was preserved. Staging files: $staging"
    throw
}

if (Test-Path -LiteralPath $backup) {
    Write-Host "Previous extension backed up to: $backup"
}
Write-Host "Files installed. Enable CEP developer mode if Illustrator does not list the panel."
Write-Host "Start Illustrator, then open the panel from the Window > Extensions (Legacy) menu."
