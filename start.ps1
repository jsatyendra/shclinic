# start.ps1
# This script starts the homeopathic clinic management application
# It first backs up the database and then ensures it's properly initialized

Write-Host "Starting SH Clinic Management System..." -ForegroundColor Green

# Backup the database first
Write-Host "Creating database backup..." -ForegroundColor Cyan
./backup-db.ps1

# Initialize the database
Write-Host "Initializing database..." -ForegroundColor Cyan
node server-init.js

# Start the Next.js application
Write-Host "Starting application..." -ForegroundColor Cyan
npm run dev
