[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Assert-ChildPath([string]$Root, [string]$Child) {
    $rootPath = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    $childPath = [IO.Path]::GetFullPath($Child)
    if (-not $childPath.StartsWith($rootPath, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is outside its installation root: $childPath"
    }
}

function Copy-ChangedFile([string]$SourceFile, [string]$TargetFile) {
    if (Test-Path -LiteralPath $TargetFile -PathType Leaf) {
        $sourceHash = (Get-FileHash -LiteralPath $SourceFile -Algorithm SHA256).Hash
        $targetHash = (Get-FileHash -LiteralPath $TargetFile -Algorithm SHA256).Hash
        if ($sourceHash -eq $targetHash) { return }
    }
    Copy-Item -LiteralPath $SourceFile -Destination $TargetFile -Force
}

$source = Join-Path $PSScriptRoot 'CEP'
$sourceManifest = Join-Path $source 'CSXS\manifest.xml'
[xml]$manifest = Get-Content -LiteralPath $sourceManifest -Raw
$bundleId = [string]$manifest.ExtensionManifest.ExtensionBundleId
$version = [string]$manifest.ExtensionManifest.ExtensionBundleVersion
$panelId = [string]$manifest.ExtensionManifest.ExtensionList.Extension.Id
if ($bundleId -ne 'com.ronniejiao.linghui' -or $panelId -ne 'com.ronniejiao.linghui.panel') {
    throw 'The source package is not the Linghui CEP panel.'
}

$requiredFiles = @(
    'index.html', 'css\panel.css', 'lib\CSInterface.js',
    'js\startup.js', 'js\panel.js', 'js\native-picker.js',
    'host\cep-entry.jsx', 'host\linghui.jsx',
    'native\BatchSourcePicker-1.0.4.exe', 'CSXS\manifest.xml'
)
foreach ($relative in $requiredFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $relative) -PathType Leaf)) {
        throw "The source package is incomplete: $relative"
    }
}

$cepRoot = Join-Path $env:APPDATA 'Adobe\CEP'
$extensionsRoot = Join-Path $cepRoot 'extensions'
$destination = Join-Path $extensionsRoot $bundleId
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$backupsRoot = Join-Path $cepRoot 'extensions-backups'
$backup = Join-Path $backupsRoot "$bundleId-$stamp-before-$version"
Assert-ChildPath $extensionsRoot $destination
Assert-ChildPath $backupsRoot $backup
New-Item -ItemType Directory -Path $extensionsRoot -Force | Out-Null

$hadInstallation = Test-Path -LiteralPath $destination -PathType Container
if ($hadInstallation) {
    if ((Get-Item -LiteralPath $destination).Attributes -band [IO.FileAttributes]::ReparsePoint) {
        throw 'The existing extension is a link; refusing to overwrite its target.'
    }
    New-Item -ItemType Directory -Path $backupsRoot -Force | Out-Null
    Copy-Item -LiteralPath $destination -Destination $backup -Recurse
}

$sourceFiles = @(Get-ChildItem -LiteralPath $source -Recurse -File)
New-Item -ItemType Directory -Path $destination -Force | Out-Null
try {
    # Write the manifest last so an incomplete payload is never advertised as
    # the new version. No Illustrator process is closed by this installer.
    foreach ($file in $sourceFiles) {
        $relative = $file.FullName.Substring($source.Length).TrimStart('\')
        if ($relative -eq 'CSXS\manifest.xml') { continue }
        $target = Join-Path $destination $relative
        Assert-ChildPath $destination $target
        New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
        Copy-ChangedFile $file.FullName $target
    }
    New-Item -ItemType Directory -Path (Join-Path $destination 'CSXS') -Force | Out-Null
    Copy-ChangedFile $sourceManifest (Join-Path $destination 'CSXS\manifest.xml')

    foreach ($file in $sourceFiles) {
        $relative = $file.FullName.Substring($source.Length).TrimStart('\')
        $target = Join-Path $destination $relative
        if ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne
            (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash) {
            throw "Installed file does not match the source: $relative"
        }
    }
} catch {
    if ($hadInstallation) {
        foreach ($savedFile in @(Get-ChildItem -LiteralPath $backup -Recurse -File)) {
            $savedRelative = $savedFile.FullName.Substring($backup.Length).TrimStart('\')
            $restoreTarget = Join-Path $destination $savedRelative
            Assert-ChildPath $destination $restoreTarget
            New-Item -ItemType Directory -Path (Split-Path -Parent $restoreTarget) -Force | Out-Null
            Copy-ChangedFile $savedFile.FullName $restoreTarget
        }
    }
    throw
}

# This local unsigned package uses the current user's CEP 12 development mode.
$registryPath = 'HKCU:\Software\Adobe\CSXS.12'
if (-not (Test-Path -LiteralPath $registryPath)) {
    New-Item -Path $registryPath -Force | Out-Null
}
New-ItemProperty -Path $registryPath -Name 'PlayerDebugMode' -PropertyType String -Value '1' -Force | Out-Null

$cacheBackups = @()
$cacheRefresh = 'skipped: panel process is active or process information is unavailable'
$canRefreshCache = $false
try {
    $panelProcesses = @(Get-CimInstance Win32_Process -Filter "Name='CEPHtmlEngine.exe'" |
        Where-Object { $_.CommandLine -like "*$panelId*" })
    $canRefreshCache = $panelProcesses.Count -eq 0
} catch {
    $canRefreshCache = $false
}
if ($canRefreshCache) {
    $cacheRoot = Join-Path $env:TEMP 'cep_cache'
    $cacheBackupRoot = Join-Path $cepRoot "cache-backups\$bundleId-$stamp"
    $cacheRefresh = 'completed'
    if (Test-Path -LiteralPath $cacheRoot -PathType Container) {
        $panelCaches = @(Get-ChildItem -LiteralPath $cacheRoot -Directory |
            Where-Object { $_.Name -match ('^ILST_[0-9.]+_' + [regex]::Escape($panelId) + '$') })
        foreach ($panelCache in $panelCaches) {
            Assert-ChildPath $cacheRoot $panelCache.FullName
            if ($panelCache.Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
            foreach ($generatedName in @('Cache', 'Code Cache', 'GPUCache')) {
                $generatedPath = Join-Path $panelCache.FullName $generatedName
                if (-not (Test-Path -LiteralPath $generatedPath -PathType Container)) { continue }
                Assert-ChildPath $panelCache.FullName $generatedPath
                if ((Get-Item -LiteralPath $generatedPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { continue }
                $archiveParent = Join-Path $cacheBackupRoot $panelCache.Name
                $archive = Join-Path $archiveParent $generatedName
                Assert-ChildPath $cacheBackupRoot $archive
                New-Item -ItemType Directory -Path $archiveParent -Force | Out-Null
                try {
                    Move-Item -LiteralPath $generatedPath -Destination $archive
                    $cacheBackups += $archive
                } catch {
                    $cacheRefresh = 'partial: a generated cache is still in use'
                }
            }
        }
    }
}

$receipt = [ordered]@{
    extension = $bundleId
    version = $version
    installedAt = (Get-Date).ToString('o')
    source = $source
    destination = $destination
    backup = $(if ($hadInstallation) { $backup } else { $null })
    verifiedFiles = $sourceFiles.Count
    cacheRefresh = $cacheRefresh
    cacheBackups = $cacheBackups
}
$receiptsRoot = Join-Path $cepRoot 'installations'
New-Item -ItemType Directory -Path $receiptsRoot -Force | Out-Null
$receipt | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $receiptsRoot "$bundleId.json") -Encoding UTF8
$receipt | ConvertTo-Json -Depth 4
Write-Host "Installation complete. Save your documents and reopen Illustrator, then use Window > Extensions (Legacy) > Linghui $version."
