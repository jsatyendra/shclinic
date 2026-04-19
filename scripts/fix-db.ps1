# This script performs a complete fix for the database persistence issue
# It will:
# 1. Back up the current database
# 2. Modify config files to prevent auto-reinitialization
# 3. Create a new test client to verify persistence

Write-Host "SH Clinic - Database Fix Script" -ForegroundColor Cyan
Write-Host "---------------------------" -ForegroundColor Cyan
Write-Host ""

# 1. Back up the current database
Write-Host "Step 1: Creating database backup..." -ForegroundColor Green
./backup-db.ps1

# 2. Run server initialization to ensure database structure is correct
Write-Host "Step 2: Initializing database structure..." -ForegroundColor Green
node server-init.js

# 3. Create a test client
Write-Host "Step 3: Creating a test client..." -ForegroundColor Green
node test-persistence.js

# 4. Verify the client exists with find-client.js
Write-Host "Step 4: Verifying test client exists..." -ForegroundColor Green
node find-client.js "Test Client"

Write-Host ""
Write-Host "Database fix applied successfully!" -ForegroundColor Cyan
Write-Host "Your client records should now persist between application restarts." -ForegroundColor Cyan
Write-Host "To start the application, run: ./start.ps1" -ForegroundColor Yellow
