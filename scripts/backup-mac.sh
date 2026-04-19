#!/bin/bash
# backup-mac.sh
# This script creates a timestamped backup of the database on Mac
# It helps prevent data loss by ensuring a backup is made before any database operations

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

timestamp=$(date +"%Y%m%d_%H%M%S")
db_folder="src/db"
db_path="$db_folder/clinic.db"
backup_folder="$db_folder/backup"
backup_path="$backup_folder/clinic_$timestamp.db"

# Create backup folder if it doesn't exist
if [ ! -d "$backup_folder" ]; then
    echo -e "${CYAN}📁 Creating backup folder...${NC}"
    mkdir -p "$backup_folder"
fi

# Check if database exists before backing up
if [ -f "$db_path" ]; then
    # Create backup of main database file
    echo -e "${CYAN}💾 Creating database backup...${NC}"
    cp "$db_path" "$backup_path"
    
    # Backup WAL files if they exist
    wal_path="$db_path-wal"
    shm_path="$db_path-shm"
    
    if [ -f "$wal_path" ]; then
        cp "$wal_path" "$backup_path-wal"
    fi
    
    if [ -f "$shm_path" ]; then
        cp "$shm_path" "$backup_path-shm"
    fi
    
    echo -e "${GREEN}✅ Database backup created: $backup_path${NC}"
    
    # Show backup file size
    backup_size=$(du -h "$backup_path" | cut -f1)
    echo -e "${CYAN}📊 Backup size: $backup_size${NC}"
    
    # Clean up old backups (keep last 10)
    echo -e "${CYAN}🧹 Cleaning up old backups (keeping last 10)...${NC}"
    cd "$backup_folder"
    ls -t clinic_*.db 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
    
    backup_count=$(ls clinic_*.db 2>/dev/null | wc -l)
    echo -e "${CYAN}📋 Total backups: $backup_count${NC}"
    
else
    echo -e "${YELLOW}⚠️  Database file not found at $db_path${NC}"
    echo -e "${YELLOW}   This is normal for first-time setup.${NC}"
fi

echo -e "${GREEN}✅ Backup process completed${NC}"
