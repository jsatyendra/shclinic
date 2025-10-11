# This script gives the option to clear the existing database
# Use with caution as it will delete all client records!

$dbFolder = Join-Path $PSScriptRoot "src" "db"
$dbPath = Join-Path $dbFolder "clinic.db"
$walPath = "$dbPath-wal"
$shmPath = "$dbPath-shm"

Write-Host "⚠️ WARNING: This will clear all data in the clinic database ⚠️" -ForegroundColor Red
Write-Host "All client records, medications, and health information will be deleted." -ForegroundColor Red
Write-Host "Make sure you have a backup before proceeding!" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Type 'yes' to confirm database reset (anything else will cancel)"

if ($confirm -eq "yes") {
    Write-Host "Creating backup before reset..." -ForegroundColor Cyan
    ./backup-db.ps1
    
    Write-Host "Closing any open database connections..." -ForegroundColor Cyan
    # Wait a moment to ensure connections are closed
    Start-Sleep -Seconds 2
    
    # Remove the database files
    if (Test-Path $dbPath) {
        Remove-Item -Path $dbPath -Force
        Write-Host "Removed main database file" -ForegroundColor Yellow
    }
    
    if (Test-Path $walPath) {
        Remove-Item -Path $walPath -Force
        Write-Host "Removed WAL file" -ForegroundColor Yellow
    }
    
    if (Test-Path $shmPath) {
        Remove-Item -Path $shmPath -Force
        Write-Host "Removed SHM file" -ForegroundColor Yellow
    }
    
    Write-Host "Database has been reset." -ForegroundColor Green
    Write-Host "You can now run 'start.ps1' to create a fresh database." -ForegroundColor Green
} else {
    Write-Host "Operation cancelled. Database remains unchanged." -ForegroundColor Green
}
