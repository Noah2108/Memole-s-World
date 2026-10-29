param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA "Memole's World")
)
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$iconSource = Join-Path $projectDirectory 'src-tauri\icons\icon.ico'
$applicationPath = Join-Path $InstallDirectory 'memoles-world.exe'
if (!(Test-Path -LiteralPath $applicationPath -PathType Leaf)) { throw 'App installata non trovata.' }
if (!(Test-Path -LiteralPath $iconSource -PathType Leaf)) { throw 'Icona del progetto non trovata.' }
$projectVersion = (Get-Content -LiteralPath (Join-Path $projectDirectory 'package.json') -Raw | ConvertFrom-Json).version
$installedVersion = (Get-Item -LiteralPath $applicationPath).VersionInfo.ProductVersion
if ($installedVersion -ne $projectVersion) { throw "Versioni diverse: app $installedVersion, progetto $projectVersion. Aggiorna prima l'app." }
$iconDigest = (Get-FileHash -LiteralPath $iconSource -Algorithm SHA256).Hash.ToLowerInvariant().Substring(0,12)
$explicitIcon = Join-Path $InstallDirectory ('memoles-world-icon-' + $projectVersion + '-' + $iconDigest + '.ico')
$shortcutCandidates = @(
  (Join-Path ([Environment]::GetFolderPath('Desktop')) "Memole's World.lnk"),
  (Join-Path ([Environment]::GetFolderPath('Programs')) "Memole's World.lnk")
)
$shortcutShell = New-Object -ComObject WScript.Shell
$ownedShortcuts = @()
foreach ($candidatePath in $shortcutCandidates) {
  if (!(Test-Path -LiteralPath $candidatePath -PathType Leaf)) { continue }
  $candidate = $shortcutShell.CreateShortcut($candidatePath)
  if (![string]::Equals([IO.Path]::GetFullPath($candidate.TargetPath), [IO.Path]::GetFullPath($applicationPath), [StringComparison]::OrdinalIgnoreCase)) {
    throw "Il collegamento punta a un'altra app: $candidatePath"
  }
  $ownedShortcuts += [pscustomobject]@{ Path=$candidatePath; OldIcon=$candidate.IconLocation; Target=$candidate.TargetPath }
}
if (!$ownedShortcuts.Count) { throw 'Nessun collegamento esistente da aggiornare.' }
# Preserve the existing shortcut files before changing their icon metadata.
$backupDirectory = Join-Path $projectDirectory ('.local\icon-check\shortcut-backup-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
$backupIndex = 0
foreach ($owned in $ownedShortcuts) {
  Copy-Item -LiteralPath $owned.Path -Destination (Join-Path $backupDirectory ("shortcut-$backupIndex.lnk"))
  $backupIndex++
}
$ownedShortcuts | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $backupDirectory 'originals.json') -Encoding utf8
Copy-Item -LiteralPath $iconSource -Destination $explicitIcon -Force
if (-not ('MemoleShortcutRefresh' -as [type])) {
  Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class MemoleShortcutRefresh {
  [DllImport("shell32.dll", CharSet=CharSet.Unicode)]
  public static extern void SHChangeNotify(uint change, uint flags, string path, IntPtr second);
}
'@
}
foreach ($owned in $ownedShortcuts) {
  $shortcut = $shortcutShell.CreateShortcut($owned.Path)
  $shortcut.IconLocation = $explicitIcon + ',0'
  $shortcut.Save()
  $verified = $shortcutShell.CreateShortcut($owned.Path)
  if ($verified.IconLocation -ne ($explicitIcon + ',0') -or $verified.TargetPath -ne $owned.Target) {
    throw "Verifica del collegamento fallita: $($owned.Path)"
  }
  # Refresh only this saved shortcut, without clearing the global icon cache.
  [MemoleShortcutRefresh]::SHChangeNotify(0x2000, 0x1005, $owned.Path, [IntPtr]::Zero)
  [pscustomobject]@{ Shortcut=$owned.Path; Icon=$verified.IconLocation; Target=$verified.TargetPath; Version=$installedVersion } | ConvertTo-Json -Compress
}
