# 安裝 / 更新 NoteBloom，並註冊成開機自動啟動的排程工作。
#
# 用法（以「系統管理員身分」開啟 PowerShell）：
#   cd <專案資料夾>\backend
#   .\gradlew.bat bootJar
#   cd ..
#   powershell -ExecutionPolicy Bypass -File deploy\windows\install.ps1
#
# 之後每次更新程式，重複上面三個步驟即可。

param(
    [string]$InstallDir = 'C:\notebloom'
)

$ErrorActionPreference = 'Stop'
$TaskName = 'NoteBloom'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    throw '請用「以系統管理員身分執行」開啟 PowerShell 後再執行此腳本。'
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$jar = Get-ChildItem (Join-Path $repoRoot 'backend\build\libs\notebloom-backend-*.jar') -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notlike '*-plain.jar' } |
    Select-Object -First 1
if (-not $jar) {
    throw '找不到 jar，請先在 backend 資料夾執行 .\gradlew.bat bootJar'
}

$java = (Get-Command java -ErrorAction SilentlyContinue).Source
if (-not $java) {
    throw '找不到 java，請先安裝 JDK 25 並確認 java 在 PATH 中。'
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$props = Join-Path $InstallDir 'application.properties'
if (-not (Test-Path $props)) {
    Copy-Item (Join-Path $PSScriptRoot 'application.properties.example') $props
    Write-Host "已建立 $props" -ForegroundColor Yellow
    Write-Host '請用記事本打開它，填入資料庫密碼後，再執行一次這個腳本。' -ForegroundColor Yellow
    exit 1
}

# 停掉舊版本才能覆蓋 jar
if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $TaskName
    Start-Sleep -Seconds 3
}

Copy-Item $jar.FullName (Join-Path $InstallDir 'notebloom.jar') -Force

$action = New-ScheduledTaskAction -Execute $java -Argument '-jar notebloom.jar' -WorkingDirectory $InstallDir
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host ''
Write-Host "NoteBloom 已安裝到 $InstallDir，並設定為開機自動啟動。" -ForegroundColor Green
Write-Host '約 15 秒後打開 http://localhost:8080 確認。'
Write-Host "Log 檔：$InstallDir\logs\notebloom.log"
