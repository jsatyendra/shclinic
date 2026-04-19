#!/bin/bash
# migrate-mac.sh
# This script runs database migrations on Mac
# It checks for migration files and applies them in order

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔄 Running database migrations...${NC}"

# Backup database before migration
echo -e "${CYAN}💾 Creating backup before migration...${NC}"
./backup-mac.sh

# Check if migrate.js or similar exists
migration_files=(
    "migrate.js"
    "run-migration.js"
    "add-followup-column.js"
    "add-status-column.js"
    "add-documents-table.js"
)

migration_found=false

for file in "${migration_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${CYAN}📄 Running migration: $file${NC}"
        if node "$file"; then
            echo -e "${GREEN}✅ Migration completed: $file${NC}"
        else
            echo -e "${RED}❌ Migration failed: $file${NC}"
            exit 1
        fi
        migration_found=true
    fi
done

if [ "$migration_found" = false ]; then
    echo -e "${YELLOW}⚠️  No migration files found${NC}"
    echo -e "${YELLOW}   Available files to run manually:${NC}"
    for file in "${migration_files[@]}"; do
        if [ -f "$file" ]; then
            echo -e "${YELLOW}   - $file${NC}"
        fi
    done
fi

# Verify database integrity
echo -e "${CYAN}🔍 Verifying database integrity...${NC}"
if [ -f "dbverify.js" ]; then
    if node dbverify.js; then
        echo -e "${GREEN}✅ Database integrity check passed${NC}"
    else
        echo -e "${RED}❌ Database integrity check failed${NC}"
    fi
fi

echo -e "${GREEN}✅ Migration process completed${NC}"
