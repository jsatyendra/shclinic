#!/bin/bash
# convert-to-mac.sh
# This script converts a Windows-based SH Clinic setup to Mac

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔄 Converting SH Clinic from Windows to Mac...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found. Are you in the project directory?${NC}"
    exit 1
fi

echo -e "${CYAN}📋 Step 1: Making shell scripts executable...${NC}"
chmod +x *.sh

echo -e "${CYAN}📋 Step 2: Using Mac-optimized configuration files...${NC}"

# Backup original files
echo -e "${CYAN}💾 Creating backups of original files...${NC}"
[ -f "package.json" ] && cp "package.json" "package-windows-backup.json"
[ -f ".gitignore" ] && cp ".gitignore" ".gitignore-windows-backup"

# Use Mac-optimized files
echo -e "${CYAN}🔧 Applying Mac configurations...${NC}"
if [ -f "package-mac.json" ]; then
    cp "package-mac.json" "package.json"
    echo -e "${GREEN}✅ Updated package.json for Mac${NC}"
fi

if [ -f ".gitignore-mac" ]; then
    cp ".gitignore-mac" ".gitignore"
    echo -e "${GREEN}✅ Updated .gitignore for Mac${NC}"
fi

if [ -f ".env.example" ] && [ ! -f ".env.local" ]; then
    cp ".env.example" ".env.local"
    echo -e "${GREEN}✅ Created .env.local from template${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env.local with your configuration${NC}"
fi

echo -e "${CYAN}📋 Step 3: Creating necessary directories...${NC}"
mkdir -p src/db/backup
mkdir -p uploads
mkdir -p scripts-mac

echo -e "${CYAN}📋 Step 4: Setting proper permissions...${NC}"
chmod 755 uploads
chmod 755 src/db
[ -f "src/db/clinic.db" ] && chmod 644 "src/db/clinic.db"

echo -e "${CYAN}📋 Step 5: Installing/updating dependencies...${NC}"
if command -v npm &> /dev/null; then
    # Clean install to ensure Mac compatibility
    rm -rf node_modules package-lock.json
    npm install
    
    # Rebuild native modules for Mac
    if npm list better-sqlite3 &> /dev/null; then
        echo -e "${CYAN}🔧 Rebuilding better-sqlite3 for Mac...${NC}"
        npm rebuild better-sqlite3
    fi
    
    echo -e "${GREEN}✅ Dependencies installed and rebuilt for Mac${NC}"
else
    echo -e "${RED}❌ npm not found. Please install Node.js first${NC}"
    exit 1
fi

echo -e "${CYAN}📋 Step 6: Verifying setup...${NC}"

# Check Node.js version
node_version=$(node --version 2>/dev/null | sed 's/v//')
if [ -n "$node_version" ]; then
    echo -e "${GREEN}✅ Node.js version: $node_version${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
fi

# Check if database exists
if [ -f "src/db/clinic.db" ]; then
    echo -e "${GREEN}✅ Database file found${NC}"
else
    echo -e "${YELLOW}⚠️  Database file not found (will be created on first run)${NC}"
fi

# Check if uploads directory exists and is writable
if [ -w "uploads" ]; then
    echo -e "${GREEN}✅ Uploads directory is writable${NC}"
else
    echo -e "${RED}❌ Uploads directory is not writable${NC}"
fi

echo -e "${GREEN}🎉 Conversion completed successfully!${NC}"
echo ""
echo -e "${CYAN}📋 Next steps:${NC}"
echo "1. Edit .env.local with your configuration"
echo "2. Run: ./setup-mac.sh (if needed)"
echo "3. Start the application: ./start-mac.sh"
echo ""
echo -e "${CYAN}💡 Available Mac commands:${NC}"
echo "   ./setup-mac.sh    - Initial setup"
echo "   ./start-mac.sh    - Start application"
echo "   ./backup-mac.sh   - Backup database"
echo "   ./migrate-mac.sh  - Run migrations"
echo "   ./reset-mac.sh    - Reset database"
echo ""
echo -e "${YELLOW}📚 For detailed instructions, see:${NC}"
echo "   - README-MAC.md"
echo "   - MAC-MIGRATION-GUIDE.md"
