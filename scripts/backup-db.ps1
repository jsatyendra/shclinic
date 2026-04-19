# This script creates a timestamped backup of the database before starting the application
# It helps prevent data loss by ensuring a backup is made before any database operations

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dbFolder = Join-Path $PSScriptRoot "src" "db"
$dbPath = Join-Path $dbFolder "clinic.db"
$backupFolder = Join-Path $dbFolder "backup"
$backupPath = Join-Path $backupFolder "clinic_$timestamp.db"

# Create backup folder if it doesn't exist
if (-not (Test-Path $backupFolder)) {
    Write-Host "Creating backup folder..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
}

# Check if database exists before backing up
if (Test-Path $dbPath) {
    # Create backup of main database file
    Write-Host "Creating database backup..." -ForegroundColor Cyan
    Copy-Item -Path $dbPath -Destination $backupPath -Force
    
    # Backup WAL files if they exist
    $walPath = "$dbPath-wal"
    $shmPath = "$dbPath-shm"
    
    if (Test-Path $walPath) {
        Copy-Item -Path $walPath -Destination "$backupPath-wal" -Force
    }
    
    if (Test-Path $shmPath) {
        Copy-Item -Path $shmPath -Destination "$backupPath-shm" -Force
    }
    
    Write-Host "Database backup created at: $backupPath" -ForegroundColor Green
} else {
    Write-Host "No database found to backup" -ForegroundColor Yellow
}

# Keep only the 5 most recent backups to save space
$allBackups = Get-ChildItem -Path $backupFolder -Filter "clinic_*.db" | Sort-Object LastWriteTime -Descending
if ($allBackups.Count -gt 5) {
    Write-Host "Cleaning up old backups..." -ForegroundColor Cyan
    $backupsToRemove = $allBackups | Select-Object -Skip 5
    foreach ($backup in $backupsToRemove) {
        $baseName = $backup.BaseName
        # Remove the main backup file
        Remove-Item -Path $backup.FullName -Force
        
        # Remove associated WAL files if they exist
        if (Test-Path "$($backup.FullName)-wal") {
            Remove-Item -Path "$($backup.FullName)-wal" -Force
        }
        
        # Remove associated SHM files if they exist
        if (Test-Path "$($backup.FullName)-shm") {
            Remove-Item -Path "$($backup.FullName)-shm" -Force
        }
    }
    Write-Host "Removed $($backupsToRemove.Count) old backups" -ForegroundColor Yellow
}
