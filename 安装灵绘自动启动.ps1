$ErrorActionPreference = 'Stop'

$installationRoot = 'C:\Program Files\Adobe\Adobe Illustrator 2026'
$scriptName = -join @([char]0x7075, [char]0x7ED8, [char]0x81EA, [char]0x52A8, [char]0x542F, [char]0x52A8)
$sourceBootstrap = Join-Path $PSScriptRoot ($scriptName + '.jsx')
$startupDirectories = @(
    (Join-Path $installationRoot 'Startup Scripts'),
    (Join-Path $env:ProgramFiles 'Common Files\Adobe\Startup Scripts CC\Illustrator')
)

if (-not (Test-Path -LiteralPath $installationRoot -PathType Container)) {
    throw "Illustrator 2026 installation folder was not found: $installationRoot"
}

if (-not (Test-Path -LiteralPath $sourceBootstrap -PathType Leaf)) {
    throw "Bootstrap script was not found: $sourceBootstrap"
}

$currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$currentPrincipal = [Security.Principal.WindowsPrincipal]::new($currentIdentity)
$isAdministrator = $currentPrincipal.IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdministrator) {
    $elevatedArguments = '-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $PSCommandPath
    $powerShellPath = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
    Start-Process -FilePath $powerShellPath -Verb RunAs -ArgumentList $elevatedArguments -Wait
    exit
}

$sourceHash = (Get-FileHash -LiteralPath $sourceBootstrap -Algorithm SHA256).Hash
foreach ($startupDirectory in $startupDirectories) {
    New-Item -ItemType Directory -Path $startupDirectory -Force | Out-Null
    $targetBootstrap = Join-Path $startupDirectory ($scriptName + '.jsx')

    if (Test-Path -LiteralPath $targetBootstrap -PathType Leaf) {
        $existingHash = (Get-FileHash -LiteralPath $targetBootstrap -Algorithm SHA256).Hash
        if ($existingHash -ne $sourceHash) {
            $backupSuffix = Get-Date -Format 'yyyyMMdd-HHmmss'
            Copy-Item -LiteralPath $targetBootstrap -Destination ($targetBootstrap + '.backup-' + $backupSuffix)
        }
    }

    Copy-Item -LiteralPath $sourceBootstrap -Destination $targetBootstrap -Force
    $targetHash = (Get-FileHash -LiteralPath $targetBootstrap -Algorithm SHA256).Hash

    if ($sourceHash -ne $targetHash) {
        throw "Bootstrap script verification failed: $targetBootstrap"
    }

    Write-Host "Installed and verified: $targetBootstrap"
}

Write-Host 'Linhui is configured to start with Illustrator 2026.' -ForegroundColor Green
Write-Host 'Restart Illustrator to activate it. You will not need to import the script manually again.'
Read-Host 'Press Enter to close this window'
