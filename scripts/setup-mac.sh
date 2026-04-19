#!/bin/bash
# setup-mac.sh
# This script sets up the homeopathic clinic management application on Mac
# It initializes the database and ensures all required directories exist

echo "🏥 Setting up SH Clinic Management System for Mac..."

# Colors for output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}📋 Checking prerequisites...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    echo "You can install it via:"
    echo "  - Download from https://nodejs.org/"
    echo "  - Or use Homebrew: brew install node"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not available${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"

# Create necessary directories
echo -e "${CYAN}📁 Creating directories...${NC}"
mkdir -p src/db/backup
mkdir -p uploads
mkdir -p scripts-mac

# Make sure uploads directory has proper permissions
chmod 755 uploads

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}📦 Installing dependencies...${NC}"
    npm install
fi

# Initialize the database
echo -e "${CYAN}🗄️  Initializing database...${NC}"
if [ -f "server-init.js" ]; then
    node server-init.js
else
    echo -e "${YELLOW}⚠️  server-init.js not found. Skipping database initialization.${NC}"
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo -e "${CYAN}⚙️  Creating environment file...${NC}"
    cat > .env.local << EOF
# Environment variables for SH Clinic
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Database (SQLite - no additional config needed)
DATABASE_URL=sqlite:./src/db/clinic.db

# Add other environment variables as needed
EOF
    echo -e "${YELLOW}⚠️  Please edit .env.local with your actual configuration${NC}"
fi

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "🚀 To start the application:"
echo "   ./start-mac.sh"
echo ""
echo "📚 Other available commands:"
echo "   ./migrate-mac.sh  - Run database migrations"
echo "   ./backup-mac.sh   - Backup database"
echo "   ./reset-mac.sh    - Reset database"
