# Download GeoLite2 Database for AegisX WAF
# This script downloads the free GeoLite2-City database

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   GEOIP DATABASE INSTALLER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create geoip directory if it doesn't exist
$geoipDir = ".\geoip"
if (-not (Test-Path $geoipDir)) {
    Write-Host "[INIT] Creating geoip directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $geoipDir | Out-Null
    Write-Host "[OK] Directory created" -ForegroundColor Green
}

# Check if database already exists
$dbPath = Join-Path $geoipDir "GeoLite2-City.mmdb"
if (Test-Path $dbPath) {
    Write-Host "[INFO] GeoIP database already exists!" -ForegroundColor Green
    Write-Host "       Location: $dbPath" -ForegroundColor Gray
    Write-Host ""
    $overwrite = Read-Host "Do you want to re-download? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "[SKIP] Using existing database" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "[DOWNLOAD] Fetching GeoLite2-City database..." -ForegroundColor Yellow
Write-Host "This may take a minute depending on your connection..." -ForegroundColor Gray
Write-Host ""

# Option 1: Try GitHub mirror (fastest, no account needed)
$githubUrl = "https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb"

try {
    Write-Host "[1/2] Attempting download from GitHub mirror..." -ForegroundColor Cyan
    $ProgressPreference = 'SilentlyContinue'  # Disable progress bar for speed
    Invoke-WebRequest -Uri $githubUrl -OutFile $dbPath -TimeoutSec 60
    $ProgressPreference = 'Continue'
    
    # Verify download
    if (Test-Path $dbPath) {
        $fileSize = (Get-Item $dbPath).Length / 1MB
        if ($fileSize -gt 10) {  # Database should be ~70MB
            Write-Host "[OK] Download successful! ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
            Write-Host ""
            Write-Host "[SUCCESS] GeoIP database installed!" -ForegroundColor Green
            Write-Host "          Location: $dbPath" -ForegroundColor Gray
            Write-Host ""
            Write-Host "You can now run start_waf.bat" -ForegroundColor Cyan
            exit 0
        } else {
            Write-Host "[ERROR] Downloaded file is too small (corrupted)" -ForegroundColor Red
            Remove-Item $dbPath -ErrorAction SilentlyContinue
        }
    }
} catch {
    Write-Host "[FAILED] GitHub mirror unavailable" -ForegroundColor Red
}

# Option 2: Alternative mirror
Write-Host ""
Write-Host "[2/2] Trying alternative source..." -ForegroundColor Cyan
$altUrl = "https://git.io/GeoLite2-City.mmdb"

try {
    Invoke-WebRequest -Uri $altUrl -OutFile $dbPath -TimeoutSec 60
    
    if (Test-Path $dbPath) {
        $fileSize = (Get-Item $dbPath).Length / 1MB
        if ($fileSize -gt 10) {
            Write-Host "[OK] Download successful! ($([math]::Round($fileSize, 2)) MB)" -ForegroundColor Green
            Write-Host ""
            Write-Host "[SUCCESS] GeoIP database installed!" -ForegroundColor Green
            Write-Host "          Location: $dbPath" -ForegroundColor Gray
            exit 0
        }
    }
} catch {
    Write-Host "[FAILED] Alternative source unavailable" -ForegroundColor Red
}

# If all automated downloads failed, provide manual instructions
Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "   AUTOMATIC DOWNLOAD FAILED" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Please download manually:" -ForegroundColor White
Write-Host ""
Write-Host "Option 1 - Direct Download (No Account):" -ForegroundColor Cyan
Write-Host "  1. Visit: https://github.com/P3TERX/GeoLite.mmdb" -ForegroundColor Gray
Write-Host "  2. Click on 'GeoLite2-City.mmdb'" -ForegroundColor Gray
Write-Host "  3. Click 'Download' button" -ForegroundColor Gray
Write-Host "  4. Save to: $geoipDir" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2 - MaxMind Official (Requires Free Account):" -ForegroundColor Cyan
Write-Host "  1. Sign up at: https://www.maxmind.com/en/geolite2/signup" -ForegroundColor Gray
Write-Host "  2. Download: GeoLite2 City (GZIP)" -ForegroundColor Gray
Write-Host "  3. Extract GeoLite2-City.mmdb" -ForegroundColor Gray
Write-Host "  4. Copy to: $geoipDir" -ForegroundColor Gray
Write-Host ""
Write-Host "After downloading, run start_waf.bat again." -ForegroundColor White
Write-Host ""

# Open browser to GitHub mirror
$openBrowser = Read-Host "Open download page in browser? (Y/n)"
if ($openBrowser -ne "n" -and $openBrowser -ne "N") {
    Start-Process "https://github.com/P3TERX/GeoLite.mmdb"
}
