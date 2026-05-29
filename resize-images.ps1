<#
.SYNOPSIS
    Resiza alla JPG-bilder i en mapp (inklusive undermappar) och spara till en ny mapp.
.DESCRIPTION
    Behåller mappstrukturen. Standardstorlek: 1920px bredd (höjd anpassas).
.PARAMETER Source
    Sökväg till källmappen (t.ex. C:\Users\pavpl553\Desktop\fåglar)
.PARAMETER Destination
    Sökväg till målmappen (t.ex. C:\Users\pavpl553\Desktop\fåglar-resized)
.PARAMETER MaxWidth
    Max bredd i pixlar (standard: 1920)
.PARAMETER MaxHeight
    Max höjd i pixlar (standard: 1080)
.PARAMETER Quality
    JPEG-kvalitet 1-100 (standard: 85)
.EXAMPLE
    .\resize-images.ps1 -Source "C:\Users\pavpl553\Desktop\gallery" -Destination "C:\Users\pavpl553\Desktop\gallery-resized"
    .\resize-images.ps1 -Source "C:\Users\pavpl553\Desktop\gallery" -Destination "C:\Users\pavpl553\Desktop\gallery-resized" -MaxWidth 2560 -MaxHeight 1440 -Quality 90
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Source,

    [Parameter(Mandatory = $true)]
    [string]$Destination,

    [int]$MaxWidth = 1920,
    [int]$MaxHeight = 1080,
    [int]$Quality = 85
)

# Ladda .NET Drawing-biblioteket
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $Source)) {
    Write-Error "Källmappen finns inte: $Source"
    exit 1
}

$extensions = @('*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp')
$files = Get-ChildItem -LiteralPath $Source -Recurse -File | Where-Object {
    $ext = $_.Extension.ToLower()
    $ext -in @('.jpg', '.jpeg', '.png', '.gif', '.webp')
}

$total = $files.Count
$count = 0
$errors = 0

Write-Host "Hittade $total bilder. Startar resizing..." -ForegroundColor Cyan

foreach ($file in $files) {
    $relative = $file.FullName.Substring($Source.Length).TrimStart('\')
    $targetFile = Join-Path -Path $Destination -ChildPath $relative
    $targetDir = Split-Path -Parent $targetFile

    if (-not (Test-Path -LiteralPath $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }

    $targetPath = Join-Path -Path $targetDir -ChildPath ([System.IO.Path]::ChangeExtension($file.Name, '.jpg'))

    # Hoppa över om filen redan finns
    if (Test-Path -LiteralPath $targetPath) {
        Write-Host "  [HOPPAR] $relative — finns redan" -ForegroundColor DarkGray
        continue
    }

    $count++
    $percent = [math]::Round(($count / $total) * 100)
    Write-Progress -Activity "Resizar bilder" -Status "$count / $total ($percent%)" -CurrentOperation $relative -PercentComplete $percent

    try {
        $img = [System.Drawing.Image]::FromFile($file.FullName)

        if ($img.Width -le $MaxWidth -and $img.Height -le $MaxHeight) {
            # Bilden är redan tillräckligt liten - kopiera bara
            $img.Dispose()
            Copy-Item -LiteralPath $file.FullName -Destination $targetPath -Force
            Write-Host "  [KOPIA] $relative" -ForegroundColor Gray
            continue
        }

        # Beräkna proportioner
        $ratio = [math]::Min($MaxWidth / $img.Width, $MaxHeight / $img.Height)
        $newWidth = [math]::Round($img.Width * $ratio)
        $newHeight = [math]::Round($img.Height * $ratio)

        $resized = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
        $graphics = [System.Drawing.Graphics]::FromImage($resized)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

        $graphics.DrawImage($img, 0, 0, $newWidth, $newHeight)

        # Spara som JPEG
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, $Quality
        )
        $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object {
            $_.FormatDescription -eq 'JPEG'
        }

        $resized.Save($targetPath, $jpegCodec, $encoderParams)

        $graphics.Dispose()
        $resized.Dispose()
        $img.Dispose()

        Write-Host "  [OK] $relative → $($newWidth)x$($newHeight)" -ForegroundColor Green
    } catch {
        $errors++
        Write-Host "  [FEL] $relative : $_" -ForegroundColor Red
    }
}

Write-Progress -Activity "Resizar bilder" -Completed
Write-Host "`nKlart! $count bilder bearbetade, $errors fel." -ForegroundColor Cyan
Write-Host "Målmapp: $Destination" -ForegroundColor Cyan
