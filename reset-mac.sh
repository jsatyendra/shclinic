#!/bin/bash
# reset-mac.sh
# This script resets the database on Mac by removing it and reinitializing
# WARNING: This will delete all data!

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  WARNING: This will delete ALL data in the database!${NC}"
echo -e "${YELLOW}📋 This action cannot be undone.${NC}"
echo ""
read -p "Are you sure you want to reset the database? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${CYAN}🚫 Database reset cancelled${NC}"
    exit 0
fi

echo -e "${CYAN}🗄️  Resetting database...${NC}"

# Create a final backup before reset
echo -e "${CYAN}💾 Creating final backup before reset...${NC}"
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_folder="src/db/backup"
mkdir -p "$backup_folder"

if [ -f "src/db/clinic.db" ]; then
    cp "src/db/clinic.db" "$backup_folder/clinic_before_reset_$timestamp.db"
    echo -e "${GREEN}✅ Final backup created: clinic_before_reset_$timestamp.db${NC}"
fi

# Remove database files
db_files=(
    "src/db/clinic.db"
    "src/db/clinic.db-wal"
    "src/db/clinic.db-shm"
)

for file in "${db_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${CYAN}🗑️  Removing $file${NC}"
        rm "$file"
    fi
done

# Remove uploads (optional - ask user)
echo ""
read -p "Do you also want to remove uploaded files? (y/N): " remove_uploads

if [[ "$remove_uploads" =~ ^[Yy]$ ]]; then
    if [ -d "uploads" ]; then
        echo -e "${CYAN}🗑️  Removing uploaded files...${NC}"
        rm -rf uploads/*
        echo -e "${GREEN}✅ Uploaded files removed${NC}"
    fi
fi

# Reinitialize database
echo -e "${CYAN}🔄 Reinitializing database...${NC}"
if [ -f "server-init.js" ]; then
    if node server-init.js; then
        echo -e "${GREEN}✅ Database reinitialized successfully${NC}"
    else
        echo -e "${RED}❌ Failed to reinitialize database${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  server-init.js not found. You may need to run migrations manually.${NC}"
fi

# Run any necessary migrations
echo -e "${CYAN}🔄 Running migrations...${NC}"
./migrate-mac.sh

echo -e "${GREEN}✅ Database reset completed successfully${NC}"
echo ""
echo -e "${CYAN}💡 Next steps:${NC}"
echo "   1. Start the application: ./start-mac.sh"
echo "   2. Create new user accounts"
echo "   3. Import any backed-up data if needed"
