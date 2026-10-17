$ErrorActionPreference = 'Stop'
$artPilotCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$artPilotSource = Join-Path $PSScriptRoot 'CEP\native\BatchSourcePicker.cs'
$artPilotManifest = Join-Path $PSScriptRoot 'CEP\native\BatchSourcePicker.manifest'
$artPilotOutput = Join-Path $PSScriptRoot 'CEP\native\BatchSourcePicker-1.0.4.exe'
if (-not (Test-Path -LiteralPath $artPilotCompiler)) { throw 'Windows .NET Framework compiler is unavailable.' }
& $artPilotCompiler /nologo /target:winexe /platform:anycpu /optimize+ "/win32manifest:$artPilotManifest" "/out:$artPilotOutput" $artPilotSource
if ($LASTEXITCODE -ne 0) { throw 'Native picker compilation failed.' }
Get-Item -LiteralPath $artPilotOutput | Select-Object FullName, Length
