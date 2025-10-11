#!/bin/bash
# start-mac.sh
# This script starts the homeopathic clinic management application on Mac
# It first backs up the database and then ensures it's properly initialized

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🏥 Starting SH Clinic Management System...${NC}"

# Backup the database first
echo -e "${CYAN}💾 Creating database backup...${NC}"
./backup-mac.sh

# Initialize the database (if needed)
echo -e "${CYAN}🗄️  Checking database initialization...${NC}"
if [ -f "server-init.js" ]; then
    node server-init.js
fi

# Start the Next.js application
echo -e "${CYAN}🚀 Starting application...${NC}"
echo ""
echo "Opening http://localhost:3000 in your browser..."
echo "Press Ctrl+C to stop the server"
echo ""

# Open browser (optional - user can comment out if not desired)
if command -v open &> /dev/null; then
    sleep 3 && open http://localhost:3000 &
fi

npm run dev
