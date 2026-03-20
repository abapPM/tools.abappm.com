<#
.SYNOPSIS
  Reads links-extracted.json (or legacy Markdown), extracts http/https URLs, and checks HTTP status.

  By default, HTTP 200 (OK) rows are omitted from console, Markdown, and JSON results; use -IncludeOk to list all.
#>
[CmdletBinding()]
param(
    [Alias('MarkdownFile')]
    [string]$InputFile = '',
    [int]$TimeoutSec = 30,
    [string]$ReportFile = '',
    [string]$JsonFile = '',
    [int]$MaxDisplayUrlLength = 64,
    [switch]$IncludeOk
)

$ErrorActionPreference = 'Continue'

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { [System.IO.Path]::GetDirectoryName($MyInvocation.MyCommand.Path) }
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
if (-not $InputFile) {
    $InputFile = Join-Path $scriptDir 'links-extracted.json'
}

if (-not (Test-Path -LiteralPath $InputFile)) {
    Write-Error "Input file not found: $InputFile"
    exit 1
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

function Get-DisplayUrl([string]$Uri) {
    if ([string]::IsNullOrEmpty($Uri)) { return '' }
    $max = $MaxDisplayUrlLength
    if ($max -lt 12) { $max = 12 }
    if ($Uri.Length -le $max) { return $Uri }
    $ellipsis = '...'
    $budget = $max - $ellipsis.Length
    $left = [math]::Floor($budget / 2)
    $right = $budget - $left
    return $Uri.Substring(0, $left) + $ellipsis + $Uri.Substring($Uri.Length - $right)
}

function Get-StatusFromException($ex) {
    if (-not $ex) { return $null }
    $resp = $ex.Response
    if ($resp -and $resp.StatusCode) {
        return [int]$resp.StatusCode.value__
    }
    return $null
}

function Test-IsHostOnlyHttpUrl([string]$UriString) {
    if ([string]::IsNullOrWhiteSpace($UriString)) { return $false }
    try {
        $u = [System.Uri]$UriString
        if ($u.Scheme -notin 'http', 'https') { return $false }
        $p = $u.AbsolutePath
        return ($p -eq '' -or $p -eq '/')
    } catch {
        return $false
    }
}

function Test-DnsNameResolves([string]$Name) {
    if ([string]::IsNullOrWhiteSpace($Name)) { return $false }
    try {
        $null = [System.Net.Dns]::GetHostEntry($Name)
        return $true
    } catch {
        return $false
    }
}

# Many sites block default clients or return 404 on HEAD; browser-like headers reduce false negatives.
$script:LinkCheckHeaders = @{
    'User-Agent'      = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    'Accept'          = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    'Accept-Language' = 'en-US,en;q=0.9'
}

function Normalize-SourceEntry($s) {
    if ($null -eq $s) { return $null }
    if ($s -is [string]) {
        if (-not $s) { return $null }
        return [pscustomobject]@{ path = [string]$s; line = $null }
    }
    $p = [string]$s.path
    if ([string]::IsNullOrWhiteSpace($p)) { return $null }
    $ln = $null
    if ($null -ne $s.PSObject.Properties['line'] -and $null -ne $s.line -and $s.line -ne '') {
        try { $ln = [int]$s.line } catch { $ln = $null }
    }
    return [pscustomobject]@{ path = $p; line = $ln }
}

function Get-SourceDedupeKey($obj) {
    $p = [string]$obj.path
    $l = if ($null -ne $obj.line) { [string]$obj.line } else { '' }
    return "$p$([char]0x1F)$l"
}

function Merge-SourceLists([object[]]$a, [object[]]$b) {
    $keys = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $out = [System.Collections.Generic.List[object]]::new()
    foreach ($x in @($a) + @($b)) {
        $n = Normalize-SourceEntry $x
        if ($null -eq $n) { continue }
        $key = Get-SourceDedupeKey $n
        if ($keys.Add($key)) { [void]$out.Add($n) }
    }
    return @($out)
}

function Invoke-LinkCheck {
    param([string]$Uri, [string]$Method)
    try {
        $r = Invoke-WebRequest -Uri $Uri -Method $Method -Headers $script:LinkCheckHeaders -TimeoutSec $TimeoutSec -MaximumRedirection 5 -UseBasicParsing -ErrorAction Stop
        return @{ Status = [int]$r.StatusCode; Note = '' }
    } catch {
        $code = Get-StatusFromException $_.Exception
        if ($null -ne $code) {
            return @{ Status = $code; Note = "$Method returned error response" }
        }
        return @{ Status = $null; Note = $_.Exception.Message }
    }
}

$seen = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$urls = [System.Collections.Generic.List[string]]::new()
$urlToSources = @{}

if ($InputFile -match '\.json\s*$') {
    $payload = [System.IO.File]::ReadAllText($InputFile) | ConvertFrom-Json
    foreach ($item in $payload.links) {
        $u = [string]$item.url
        if ($u.Length -lt 10) { continue }
        $srcList = @()
        if ($null -ne $item.sources) {
            foreach ($s in $item.sources) {
                $n = Normalize-SourceEntry $s
                if ($null -ne $n) { $srcList += $n }
            }
        }
        if ($seen.Add($u)) {
            $urls.Add($u)
            $urlToSources[$u] = $srcList
        } else {
            $urlToSources[$u] = Merge-SourceLists $urlToSources[$u] $srcList
        }
    }
} else {
    $content = [System.IO.File]::ReadAllText($InputFile)
    foreach ($m in $urlRx.Matches($content)) {
        $u = Get-TrimmedUrl $m.Value
        if ($u.Length -lt 10) { continue }
        if ($seen.Add($u)) { $urls.Add($u) }
    }
}

Write-Host "Checking $($urls.Count) unique URL(s)..."
Write-Host ""
Write-Host ("{0,-8} {1,-5} {2}" -f 'Status', 'HTTP', 'URL')
Write-Host ("{0,-8} {1,-5} {2}" -f '------', '----', '---')
$results = [System.Collections.Generic.List[object]]::new()

foreach ($uri in $urls) {
    $note = ''
    $head = Invoke-LinkCheck -Uri $uri -Method 'Head'
    $status = $head.Status
    $note = $head.Note

    # HEAD 404 is common for SPAs/CDNs that only implement GET; retry with GET.
    $tryGet = ($null -eq $status) -or ($status -eq 404) -or ($status -eq 405) -or ($status -eq 501)
    if ($tryGet) {
        $get = Invoke-LinkCheck -Uri $uri -Method 'Get'
        if ($null -ne $get.Status) {
            $status = $get.Status
        }
        if ($get.Note) {
            $note = if ($note) { "HEAD: $note; GET: $($get.Note)" } else { $get.Note }
        } elseif ($tryGet -and $head.Status) {
            $note = 'GET (HEAD not supported or failed)'
        }
    }

    if ($null -eq $status) { $status = 0 }

    $ok = ($status -eq 200)
    if (-not $ok -and $status -eq 404 -and (Test-IsHostOnlyHttpUrl $uri)) {
        try {
            $hostOnly = ([System.Uri]$uri).Host
            if (Test-DnsNameResolves $hostOnly) {
                $ok = $true
                $dnsNote = '404 on host-only URL; DNS resolves (treated as OK)'
                $note = if ($note) { "$note; $dnsNote" } else { $dnsNote }
            }
        } catch {
            # ignore URI parse errors; leave ok false
        }
    }
    # LinkedIn and some hosts return 999 (non-standard) to automated clients; DNS still proves the host exists.
    if (-not $ok -and $status -eq 999) {
        try {
            $h999 = ([System.Uri]$uri).Host
            if (Test-DnsNameResolves $h999) {
                $ok = $true
                $n999 = 'HTTP 999 (request denied, often bot protection); DNS resolves (treated as OK)'
                $note = if ($note) { "$note; $n999" } else { $n999 }
            }
        } catch {
        }
    }
    $src = @()
    if ($urlToSources.ContainsKey($uri)) { $src = @($urlToSources[$uri]) }
    $results.Add([pscustomobject]@{
        Url     = $uri
        Status  = $status
        Ok      = $ok
        Note    = $note
        Sources = $src
    })

    if ($IncludeOk -or -not $ok) {
        $label = if ($ok) { 'OK' } else { 'FAIL' }
        $urlDisp = Get-DisplayUrl $uri
        Write-Host ("{0,-8} {1,-5} {2}" -f "[$label]", $status, $urlDisp)
    }
}

$okCount = @($results | Where-Object { $_.Ok }).Count
$failCount = $results.Count - $okCount
Write-Host ""
Write-Host "Summary: $okCount ok, $failCount failed (of $($results.Count))"

$md = [System.Text.StringBuilder]::new()
[void]$md.AppendLine('# Link check report')
[void]$md.AppendLine('')
[void]$md.AppendLine("Source: ``$InputFile``")
[void]$md.AppendLine("Checked: $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))")
[void]$md.AppendLine('')
[void]$md.AppendLine("**Summary:** $okCount ok, $failCount failed (of $($results.Count))")
[void]$md.AppendLine('')
[void]$md.AppendLine("**URL column:** Long URLs are shown with middle ellipsis (max $MaxDisplayUrlLength chars). Checks use the full URL.")
if (-not $IncludeOk) {
    [void]$md.AppendLine('')
    [void]$md.AppendLine('*HTTP 200 (OK) rows omitted; pass `-IncludeOk` to list them.*')
}
[void]$md.AppendLine('')
[void]$md.AppendLine('| Status | HTTP | URL | Note |')
[void]$md.AppendLine('|--------|------|-----|------|')
$mdRows = if ($IncludeOk) { $results } else { @($results | Where-Object { -not $_.Ok }) }
foreach ($r in ($mdRows | Sort-Object { -not $_.Ok }, Url)) {
    $st = if ($r.Ok) { 'OK' } else { 'FAIL' }
    $n = if ($r.Note) { ($r.Note -replace '\|', '\|') } else { '' }
    $uDisp = Get-DisplayUrl $r.Url
    $u = ($uDisp -replace '\|', '\|')
    [void]$md.AppendLine("| $st | $($r.Status) | $u | $n |")
}

$failedWithSources = @($results | Where-Object { -not $_.Ok -and $_.Sources -and $_.Sources.Count -gt 0 })
if ($failedWithSources.Count -gt 0) {
    [void]$md.AppendLine('')
    [void]$md.AppendLine('## Failed links - source files')
    [void]$md.AppendLine('')
    foreach ($r in ($failedWithSources | Sort-Object Url)) {
        [void]$md.AppendLine("- **$($r.Url)**")
        foreach ($p in ($r.Sources | Sort-Object path, { if ($null -eq $_.line) { 0 } else { $_.line } })) {
            $loc = if ($null -ne $p.line) { "$($p.path):$($p.line)" } else { $p.path }
            [void]$md.AppendLine("  - ``$($loc -replace '`', '``')``")
        }
        [void]$md.AppendLine('')
    }
}

$outPath = if ($ReportFile) { $ReportFile } else { (Join-Path (Split-Path -Parent $InputFile) 'links-check-report.md') }
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($outPath, $md.ToString(), $utf8NoBom)
Write-Host "Report written to $outPath"

$jsonPath = if ($JsonFile) { $JsonFile } else { (Join-Path (Split-Path -Parent $InputFile) 'links-check-report.json') }
$jsonResultSet = if ($IncludeOk) { $results } else { @($results | Where-Object { -not $_.Ok }) }
$sortedResults = @($jsonResultSet | Sort-Object { -not $_.Ok }, Url)
$jsonObj = [pscustomobject]@{
    source    = $InputFile
    checkedAt = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
    includeOk = [bool]$IncludeOk
    summary   = [pscustomobject]@{
        ok     = $okCount
        failed = $failCount
        total  = $results.Count
    }
    results = @(
        foreach ($r in $sortedResults) {
            $row = [ordered]@{
                url    = $r.Url
                status = $r.Status
                ok     = $r.Ok
                note   = $r.Note
            }
            if (-not $r.Ok -and $r.Sources -and $r.Sources.Count -gt 0) {
                $srcArr = [System.Collections.Generic.List[object]]::new()
                foreach ($s in ($r.Sources | Sort-Object path, { if ($null -eq $_.line) { 0 } else { $_.line } })) {
                    $srcRow = [ordered]@{ path = $s.path }
                    if ($null -ne $s.line) { $srcRow['line'] = $s.line }
                    [void]$srcArr.Add([pscustomobject]$srcRow)
                }
                $row['sources'] = @($srcArr)
            }
            [pscustomobject]$row
        }
    )
}
$jsonText = $jsonObj | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($jsonPath, $jsonText, $utf8NoBom)
Write-Host "JSON report written to $jsonPath"

if ($failCount -gt 0) { exit 2 }
exit 0
