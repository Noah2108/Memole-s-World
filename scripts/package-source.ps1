param([ValidateSet('', 'macos-arm64')][string]$Variant = '')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $projectRoot 'deliverables'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
$version = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
$suffix = if ($Variant) { '-' + $Variant } else { '' }
$zipPath = Join-Path $outputDir ('Memoles-World-V' + $version + $suffix + '-sorgenti.zip')
$items = @('src','src-tauri','assets','public','docs','e2e','scripts','supabase','.github','package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','index.html','.gitignore','.env.example','README.md','AVVIO-WINDOWS.md',"Avvia Memole's World.cmd")
$packagingRoot = Join-Path $outputDir ('.packaging-' + [guid]::NewGuid().ToString('N'))
$stage = Join-Path $packagingRoot ('Memoles-World-V' + $version)
New-Item -ItemType Directory -Path $stage -Force | Out-Null
foreach ($item in $items) {
  $source = Join-Path $projectRoot $item
  if (!(Test-Path -LiteralPath $source)) { throw "File richiesto mancante: $item" }
  if ($item -eq 'src-tauri') {
    $target = Join-Path $stage $item
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Get-ChildItem -LiteralPath $source -Force | Where-Object { $_.Name -notin @('target','gen') } | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force }
  } else { Copy-Item -LiteralPath $source -Destination $stage -Recurse -Force }
}
Compress-Archive -LiteralPath $stage -DestinationPath $zipPath -Force
Get-Item -LiteralPath $zipPath | Select-Object FullName, Length
