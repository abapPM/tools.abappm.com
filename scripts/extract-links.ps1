<#
.SYNOPSIS
  Scans the repository for http/https URLs and writes them to a JSON file (URL + source files).
#>
[CmdletBinding()]
param(
    [string]$RepoRoot = '',
    [string]$OutputFile = '',
    [string[]]$ExcludeDirNames = @('.git', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build', '.next', 'bin', 'obj', 'mcps'),
    [string[]]$ExcludeFileNames = @('package-lock.json', 'extract-links.ps1', 'check-links.ps1', 'links-check-report.json', 'links-check-report.md', 'links-extracted.json', 'links-extracted.md')
)

$ErrorActionPreference = 'Stop'

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { [System.IO.Path]::GetDirectoryName($MyInvocation.MyCommand.Path) }
if (-not $RepoRoot) {
    $RepoRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
}
if (-not $OutputFile) {
    $OutputFile = Join-Path $scriptDir 'links-extracted.json'
}

$urlPattern = '(?i)\bhttps?://[^\s<>"''`\)\]\}]+'
$urlRx = [regex]::new($urlPattern)

function Get-TrimmedUrl([string]$raw) {
    $u = $raw.TrimEnd('.,;:!?')
    while ($u.Length -gt 0 -and $u[-1] -match '[\.,;:!?\)\]\}]') {
        $u = $u.Substring(0, $u.Length - 1)
    }
    return $u
}

function Get-LineNumberFromIndex([string]$text, [int]$index) {
    if ([string]::IsNullOrEmpty($text) -or $index -le 0) { return 1 }
    $len = [math]::Min($index, $text.Length)
    $slice = $text.Substring(0, $len)
    return ([regex]::Matches($slice, "`n").Count) + 1
}

function Test-ValidHttpUrl([string]$Url) {
    if ([string]::IsNullOrWhiteSpace($Url)) { return $false }
    $uri = $null
    if (-not [System.Uri]::TryCreate($Url, [System.UriKind]::Absolute, [ref]$uri)) {
        return $false
    }
    if ($uri.Scheme -ne 'http' -and $uri.Scheme -ne 'https') {
        return $false
    }
    if ([string]::IsNullOrWhiteSpace($uri.Host)) {
        return $false
    }
    return $true
}

# Skip display-truncated URLs (e.g. from tables) and doc placeholders like https://host/...
# Keep real three-dot ref ranges: .../compare/ref1...ref2
function Test-UrlIsTruncatedOrPlaceholder([string]$Url) {
    if ($Url -notmatch '\.\.\.') { return $false }
    if ($Url -match '/compare/[^/\s?]+\.\.\.[^/\s?]+') { return $false }
    return $true
}

function Test-ExcludedPath([string]$fullPath) {
    $rel = $fullPath.Substring($RepoRoot.Length).TrimStart('\', '/')
    $parts = $rel -split '[\\/]'
    foreach ($name in $ExcludeDirNames) {
        if ($parts -contains $name) { return $true }
    }
    return $false
}

# XML/SVG often embed xmlns and schema URLs that are namespaces, not navigable links
function Test-SkipXmlOrSvgSource([string]$fullPath) {
    $ext = [System.IO.Path]::GetExtension($fullPath)
    if ([string]::IsNullOrEmpty($ext)) { return $false }
    switch ($ext.ToLowerInvariant()) {
        '.xml' { return $true }
        '.svg' { return $true }
        default { return $false }
    }
}

# Skip test/spec fixtures and anything under a path segment matching test* (e.g. test, tests, __tests__)
function Test-SkipTestRelatedSource([string]$fullPath) {
    $name = [System.IO.Path]::GetFileName($fullPath)
    if ($name -match '\.(test|spec)\.') { return $true }
    $rel = $fullPath.Substring($RepoRoot.Length).TrimStart('\', '/')
    $parts = $rel -split '[\\/]'
    if ($parts.Length -lt 2) { return $false }
    $dirParts = $parts[0..($parts.Length - 2)]
    foreach ($seg in $dirParts) {
        if ($seg -like 'test*') { return $true }
    }
    return $false
}

$byUrl = [ordered]@{}
$srcKeySep = [char]0x1F
$files = Get-ChildItem -LiteralPath $RepoRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        -not (Test-ExcludedPath $_.FullName) -and
        -not (Test-SkipXmlOrSvgSource $_.FullName) -and
        -not (Test-SkipTestRelatedSource $_.FullName) -and
        ($ExcludeFileNames.Count -eq 0 -or ($_.Name -notin $ExcludeFileNames))
    }

foreach ($file in $files) {
    $text = $null
    try {
        $text = [System.IO.File]::ReadAllText($file.FullName)
    } catch {
        Write-Host "ERROR: $($file.FullName) - $($_.Exception.Message)" -ForegroundColor Red
        continue
    }
    foreach ($m in $urlRx.Matches($text)) {
        $lineNum = Get-LineNumberFromIndex $text $m.Index
        $url = Get-TrimmedUrl $m.Value
        if ($url.Length -lt 10) { continue }
        if ($url -match '\$') { continue }
        if (-not (Test-ValidHttpUrl $url)) {
            Write-Host "ERROR: $($file.FullName):$lineNum - invalid URL: $url" -ForegroundColor Red
            continue
        }
        if (Test-UrlIsTruncatedOrPlaceholder $url) { continue }
        if (-not $byUrl.Contains($url)) {
            $byUrl[$url] = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        }
        $rel = $file.FullName.Substring($RepoRoot.Length).TrimStart('\', '/')
        $srcKey = "$rel$srcKeySep$lineNum"
        [void]$byUrl[$url].Add($srcKey)
    }
}

$sortedUrls = $byUrl.Keys | Sort-Object
$generated = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')

$linkItems = foreach ($u in $sortedUrls) {
    $srcObjs = foreach ($k in ($byUrl[$u] | Sort-Object)) {
        $parts = $k.Split(@($srcKeySep), 2, [System.StringSplitOptions]::None)
        $relPath = $parts[0]
        $lineNum = if ($parts.Length -gt 1) { [int]$parts[1] } else { $null }
        [pscustomobject]@{ path = $relPath; line = $lineNum }
    }
    [pscustomobject]@{
        url     = $u
        sources = @($srcObjs)
    }
}

$payload = [pscustomobject]@{
    repository = $RepoRoot
    generated  = $generated
    linkCount  = $byUrl.Count
    links      = @($linkItems)
}

$json = $payload | ConvertTo-Json -Depth 6
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
try {
    [System.IO.File]::WriteAllText($OutputFile, $json, $utf8NoBom)
} catch {
    $outErr = $OutputFile
    try { $outErr = (Resolve-Path -LiteralPath $OutputFile -ErrorAction Stop).Path } catch { }
    Write-Host "ERROR: $outErr - $($_.Exception.Message)" -ForegroundColor Red
    throw
}

Write-Host "Wrote $($byUrl.Count) unique URL(s) to $OutputFile"
