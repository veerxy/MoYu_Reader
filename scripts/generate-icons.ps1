# Generate all Tauri app icons from Code_Generated_Image.png
# Depends only on Windows built-in System.Drawing (no Node/Rust needed)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/generate-icons.ps1
#
# NOTE: keep this file ASCII-only. PowerShell 5.1 mis-parses UTF-8 files
# without BOM when they contain non-ASCII characters under a GBK system locale.
#
# Implementation notes (avoid PowerShell 5.1 binary-writing pitfalls):
# - Never pass scalars to BinaryWriter.Write: PS overload resolution may pick
#   the wrong overload (e.g. uint32 truncated into Write(byte)).
# - Never return bare byte[] from functions: the pipeline unrolls arrays.
#   Use the comma operator (return , $arr) to keep them intact.
# - Build the ICO with List[byte] + BitConverter.GetBytes only.

param(
    [string]$SourcePath = (Join-Path $PSScriptRoot '..\Code_Generated_Image.png'),
    [string]$IconsDir = (Join-Path $PSScriptRoot '..\src-tauri\icons'),
    [string]$PublicDir = (Join-Path $PSScriptRoot '..\public')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# High-quality downscale (bicubic)
function Resize-Image([System.Drawing.Bitmap]$src, [int]$size) {
    $bmp = New-Object System.Drawing.Bitmap -ArgumentList $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()
    return $bmp
}

function Get-PngBytes([System.Drawing.Bitmap]$bmp) {
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    return , $ms.ToArray()
}

# Build a 32bpp BMP (DIB) entry for ICO: BGRA pixels bottom-up + zero AND mask
function Get-DibBytes([System.Drawing.Bitmap]$bmp) {
    $w = $bmp.Width; $h = $bmp.Height
    $rect = New-Object System.Drawing.Rectangle -ArgumentList 0, 0, $w, $h
    $bmpData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $rowBytes = $w * 4
    $pixels = New-Object byte[] -ArgumentList ($rowBytes * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $pixels, 0, $pixels.Length)
    $bmp.UnlockBits($bmpData)

    # AND mask rows are padded to 32-bit boundary
    $maskRow = [int][Math]::Ceiling($w / 32.0) * 4
    $maskSize = $maskRow * $h

    $out = New-Object System.IO.MemoryStream
    # BITMAPINFOHEADER (40 bytes)
    $out.Write([BitConverter]::GetBytes([uint32]40), 0, 4)                       # biSize
    $out.Write([BitConverter]::GetBytes([int32]$w), 0, 4)                        # biWidth
    $out.Write([BitConverter]::GetBytes([int32]($h * 2)), 0, 4)                  # biHeight doubled (XOR + AND)
    $out.Write([BitConverter]::GetBytes([uint16]1), 0, 2)                        # biPlanes
    $out.Write([BitConverter]::GetBytes([uint16]32), 0, 2)                       # biBitCount
    $out.Write([BitConverter]::GetBytes([uint32]0), 0, 4)                        # biCompression BI_RGB
    $out.Write([BitConverter]::GetBytes([uint32]($rowBytes * $h + $maskSize)), 0, 4) # biSizeImage
    $out.Write([BitConverter]::GetBytes([int32]0), 0, 4)                         # biXPelsPerMeter
    $out.Write([BitConverter]::GetBytes([int32]0), 0, 4)                         # biYPelsPerMeter
    $out.Write([BitConverter]::GetBytes([uint32]0), 0, 4)                        # biClrUsed
    $out.Write([BitConverter]::GetBytes([uint32]0), 0, 4)                        # biClrImportant
    # Pixel rows bottom-up (LockBits returns top-down rows)
    for ($y = $h - 1; $y -ge 0; $y--) {
        $out.Write($pixels, ($y * $rowBytes), $rowBytes)
    }
    # AND mask all zero: the alpha channel drives transparency
    $zeros = New-Object byte[] -ArgumentList $maskSize
    $out.Write($zeros, 0, $maskSize)
    return , $out.ToArray()
}

$srcPath = [System.IO.Path]::GetFullPath($SourcePath)
$iconsPath = [System.IO.Path]::GetFullPath($IconsDir)
$publicPath = [System.IO.Path]::GetFullPath($PublicDir)

if (-not (Test-Path $srcPath)) { throw "Source image not found: $srcPath" }
New-Item -ItemType Directory -Force -Path $iconsPath | Out-Null
New-Item -ItemType Directory -Force -Path $publicPath | Out-Null

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
if ($src.Width -ne $src.Height) { throw "Source image must be square, got $($src.Width)x$($src.Height)" }
Write-Host "Source: $srcPath ($($src.Width)x$($src.Height))"

# 1. PNG icons required by tauri.conf.json bundle.icon
$pngTargets = [ordered]@{
    '32x32.png'      = 32
    '128x128.png'    = 128
    '128x128@2x.png' = 256
    'icon.png'       = 512
}
foreach ($name in $pngTargets.Keys) {
    $bmp = Resize-Image $src $pngTargets[$name]
    $dest = Join-Path $iconsPath $name
    $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "OK $dest ($($pngTargets[$name])px)"
}

# 2. public/app_icon.png (in-app logo + favicon, 256px)
$pubBmp = Resize-Image $src 256
$pubDest = Join-Path $publicPath 'app_icon.png'
$pubBmp.Save($pubDest, [System.Drawing.Imaging.ImageFormat]::Png)
$pubBmp.Dispose()
Write-Host "OK $pubDest (256px)"

# 3. Multi-size icon.ico: <=64px as BMP(DIB) entries (best compatibility), >=128px as PNG entries
$icoSizes = @(16, 24, 32, 48, 64, 128, 256)
$entries = @()
foreach ($s in $icoSizes) {
    $bmp = Resize-Image $src $s
    $data = if ($s -le 64) { Get-DibBytes $bmp } else { Get-PngBytes $bmp }
    $entries += [pscustomobject]@{ Size = $s; Data = $data }
    $bmp.Dispose()
}

$list = New-Object System.Collections.Generic.List[byte]
# ICONDIR
$list.AddRange([BitConverter]::GetBytes([uint16]0))       # reserved
$list.AddRange([BitConverter]::GetBytes([uint16]1))       # type = icon
$list.AddRange([BitConverter]::GetBytes([uint16]$entries.Count))
# ICONDIRENTRY x N
$offset = 6 + 16 * $entries.Count
foreach ($e in $entries) {
    $dim = if ($e.Size -ge 256) { [byte]0 } else { [byte]$e.Size }  # 256 encoded as 0
    [void]$list.Add($dim)                                 # width
    [void]$list.Add($dim)                                 # height
    [void]$list.Add([byte]0)                              # colorCount
    [void]$list.Add([byte]0)                              # reserved
    $list.AddRange([BitConverter]::GetBytes([uint16]1))   # planes
    $list.AddRange([BitConverter]::GetBytes([uint16]32))  # bitCount
    $list.AddRange([BitConverter]::GetBytes([uint32]$e.Data.Length))
    $list.AddRange([BitConverter]::GetBytes([uint32]$offset))
    $offset += $e.Data.Length
}
# Image data blobs
foreach ($e in $entries) {
    $list.AddRange([byte[]]$e.Data)
}
$icoDest = Join-Path $iconsPath 'icon.ico'
[System.IO.File]::WriteAllBytes($icoDest, $list.ToArray())
Write-Host "OK $icoDest (sizes: $($icoSizes -join ', '), $($list.Count) bytes)"

$src.Dispose()

# ---- Verification ----
# The Windows GDI+ Icon loader must accept the file
$probe = New-Object System.Drawing.Icon($icoDest)
$probe.Dispose()

# Structural checks: contiguous offsets, valid data signatures, exact file length
# NOTE: -shl keeps the left operand's type in PS 5.1, so bytes MUST be cast to
# [int] before shifting or the value silently truncates back to a byte.
$bytes = [System.IO.File]::ReadAllBytes($icoDest)
$count = [int]$bytes[4] + ([int]$bytes[5] -shl 8)
$expectedOffset = 6 + 16 * $count
for ($i = 0; $i -lt $count; $i++) {
    $base = 6 + 16 * $i
    $size = [uint32]([int]$bytes[$base + 8] + ([int]$bytes[$base + 9] -shl 8) + ([int]$bytes[$base + 10] -shl 16) + ([int]$bytes[$base + 11] -shl 24))
    $off  = [uint32]([int]$bytes[$base + 12] + ([int]$bytes[$base + 13] -shl 8) + ([int]$bytes[$base + 14] -shl 16) + ([int]$bytes[$base + 15] -shl 24))
    if ($off -ne $expectedOffset) { throw "ICO entry $i offset mismatch: $off != $expectedOffset" }
    $b0 = $bytes[$off]; $b1 = $bytes[$off + 1]
    $isPng = ($b0 -eq 0x89 -and $b1 -eq 0x50)
    $isDib = ($b0 -eq 40 -and $b1 -eq 0)
    if (-not ($isPng -or $isDib)) { throw "ICO entry $i data signature invalid (b0=$b0 b1=$b1)" }
    $expectedOffset += $size
}
if ($expectedOffset -ne $bytes.Length) { throw "ICO file length mismatch: expected $expectedOffset, got $($bytes.Length)" }
Write-Host "ICO structure verified: $count entries, $($bytes.Length) bytes"

# All generated PNGs must load
foreach ($p in @('32x32.png', '128x128.png', '128x128@2x.png', 'icon.png')) {
    $img = [System.Drawing.Image]::FromFile((Join-Path $iconsPath $p))
    $img.Dispose()
}
$img = [System.Drawing.Image]::FromFile($pubDest)
$img.Dispose()
Write-Host "All PNG icons verified."
Write-Host "Done."
