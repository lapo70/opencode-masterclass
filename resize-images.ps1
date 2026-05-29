<#
.SYNOPSIS
    Resiza alla bilder i en mapp och spara till en ny mapp.
.DESCRIPTION
    Behåller mappstrukturen. Långsidan = angivet värde.
    T.ex. 800 = liggande 800x600, staende 600x800.
.PARAMETER Source
    Sökvag till källmappen
.PARAMETER Destination
    Sökvag till målmappen
.PARAMETER MaxLongSide
    Langsidans max i pixlar (standard: 1920)
.PARAMETER Quality
    JPEG-kvalitet 1-100 (standard: 85)
.EXAMPLE
    .\resize-images.ps1 -Source "C:\Pictures" -Destination "C:\Resized" -MaxLongSide 800
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Source,
    [Parameter(Mandatory = $true)]
    [string]$Destination,
    [int]$MaxLongSide = 1920,
    [int]$Quality = 85
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $Source)) {
    Write-Error "Källmappen finns inte: $Source"
    exit 1
}

$files = Get-ChildItem -LiteralPath $Source -Recurse -File | Where-Object {
    $_.Extension -match '\.(jpg|jpeg|png|gif|webp)$'
}

$total = $files.Count
$count = 0
$errors = 0

Write-Host "Hittade $total bilder. Startar resizing..." -ForegroundColor Cyan

foreach ($file in $files) {
    $relative = $file.FullName.Substring($Source.Length).TrimStart('\')
    $targetDir = Split-Path -Path (Join-Path -Path $Destination -ChildPath $relative) -Parent

    if (-not (Test-Path -LiteralPath $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    $outputPath = Join-Path -Path $targetDir -ChildPath "$([System.IO.Path]::GetFileNameWithoutExtension($file.Name)).jpg"

    if (Test-Path -LiteralPath $outputPath) {
        Write-Host "  [HOPPAR] $relative - finns redan" -ForegroundColor DarkGray
        continue
    }

    $count++
    $pct = [math]::Round(($count / $total) * 100)
    Write-Progress -Activity "Resizar bilder" -Status "$count / $total ($pct procent)" -CurrentOperation $relative -PercentComplete $pct

    try {
        $img = [System.Drawing.Image]::FromFile($file.FullName)

        $longSide = [math]::Max($img.Width, $img.Height)
        if ($longSide -le $MaxLongSide) {
            $img.Dispose()
            Copy-Item -LiteralPath $file.FullName -Destination $outputPath -Force
            Write-Host "  [KOPIA] $relative" -ForegroundColor Gray
            continue
        }

        $ratio = $MaxLongSide / $longSide
        $newW = [math]::Round($img.Width * $ratio)
        $newH = [math]::Round($img.Height * $ratio)

        $resized = New-Object System.Drawing.Bitmap($newW, $newH)
        $gfx = [System.Drawing.Graphics]::FromImage($resized)
        $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gfx.DrawImage($img, 0, 0, $newW, $newH)

        $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)
        $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.FormatDescription -eq 'JPEG' }

        $resized.Save($outputPath, $jpegCodec, $encParams)

        $gfx.Dispose()
        $resized.Dispose()
        $img.Dispose()

        Write-Host "  [OK] $relative - ${newW}x${newH}" -ForegroundColor Green
    } catch {
        $errors++
        Write-Host "  [FEL] $relative : $_" -ForegroundColor Red
    }
}

Write-Progress -Activity "Resizar bilder" -Completed
Write-Host "`nKlart! $count bilder bearbetade, $errors fel." -ForegroundColor Cyan
Write-Host "Målmapp: $Destination" -ForegroundColor Cyan
