# SH Clinic - Complete Mac Migration Guide

## 🚀 Quick Start (For Mac Users)

### Prerequisites Installation

1. **Install Homebrew** (if not already installed)

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js**

   ```bash
   brew install node
   ```

3. **Install Git** (if not already installed)

   ```bash
   brew install git
   ```

4. **Verify installations**
   ```bash
   node --version  # Should be 18.0.0 or higher
   npm --version   # Should be 8.0.0 or higher
   git --version   # Any recent version
   ```

### Clone and Setup

1. **Clone the repository**

   ```bash
   git clone <your-repository-url>
   cd shclinic
   ```

2. **Make scripts executable**

   ```bash
   chmod +x *.sh
   ```

3. **Run the setup script**

   ```bash
   ./setup-mac.sh
   ```

4. **Start the application**
   ```bash
   ./start-mac.sh
   ```

That's it! The application should now be running at http://localhost:3000

## 📋 Detailed Migration Steps

### Step 1: Environment Setup

1. **Copy the Mac-optimized files**

   ```bash
   # Use the Mac-specific package.json
   cp package-mac.json package.json

   # Use the Mac-optimized .gitignore
   cp .gitignore-mac .gitignore

   # Create environment file
   cp .env.example .env.local
   ```

2. **Edit environment variables**
   ```bash
   nano .env.local
   # or use your preferred editor
   ```

### Step 2: Database Migration

The database (SQLite) works the same on Mac as on Windows, but the shell scripts are different:

1. **Windows → Mac Script Mapping**

   - `start.ps1` → `start-mac.sh`
   - `backup-db.ps1` → `backup-mac.sh`
   - `migrate.ps1` → `migrate-mac.sh`
   - `reset-db.ps1` → `reset-mac.sh`

2. **Run database setup**
   ```bash
   ./setup-mac.sh
   ```

### Step 3: File Permissions

Ensure proper permissions for uploaded files:

```bash
mkdir -p uploads
chmod 755 uploads
mkdir -p src/db/backup
chmod 755 src/db/backup
```

### Step 4: Dependencies Installation

The Node.js dependencies are cross-platform, but some native modules might need recompilation:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# If better-sqlite3 has issues
npm rebuild better-sqlite3
```

## 🔧 Troubleshooting Common Mac Issues

### Issue 1: Permission Denied on Scripts

```bash
# Solution
chmod +x *.sh
```

### Issue 2: better-sqlite3 Compilation Errors

```bash
# Install Xcode command line tools
xcode-select --install

# Reinstall the problematic package
npm rebuild better-sqlite3
```

### Issue 3: Port 3000 Already in Use

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Issue 4: Node Version Compatibility

```bash
# Install Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 18
nvm install 18
nvm use 18
```

### Issue 5: Database Permission Issues

```bash
# Ensure proper ownership
sudo chown -R $(whoami) src/db/
chmod 644 src/db/clinic.db
```

## 📁 Mac-Specific File Structure

```
shclinic/
├── setup-mac.sh           # 🆕 Mac setup script
├── start-mac.sh           # 🆕 Mac start script
├── backup-mac.sh          # 🆕 Mac backup script
├── migrate-mac.sh         # 🆕 Mac migration script
├── reset-mac.sh           # 🆕 Mac reset script
├── package-mac.json       # 🆕 Mac-optimized package.json
├── .gitignore-mac         # 🆕 Mac-optimized .gitignore
├── .env.example           # 🆕 Environment template
├── README-MAC.md          # 🆕 Mac-specific README
└── [rest of the project files...]
```

## 🔄 Development Workflow on Mac

### Daily Development

```bash
# Start development
./start-mac.sh

# Make changes to code...

# Backup database before major changes
./backup-mac.sh

# Run migrations if database schema changes
./migrate-mac.sh
```

### Database Management

```bash
# View database contents
npm run db:query

# Verify database integrity
npm run db:verify

# Full database reset (⚠️ loses all data)
./reset-mac.sh
```

### Available npm Scripts (Mac-specific)

```bash
npm run setup:mac    # Run setup script
npm run start:mac    # Start with backup
npm run backup:mac   # Backup database
npm run migrate:mac  # Run migrations
npm run reset:mac    # Reset database
```

## 🔒 Security Considerations on Mac

1. **File Permissions**

   ```bash
   # Secure database files
   chmod 600 src/db/clinic.db*

   # Secure environment file
   chmod 600 .env.local
   ```

2. **Firewall Configuration**

   - macOS Firewall should allow Node.js to accept incoming connections
   - Go to System Preferences → Security & Privacy → Firewall → Options
   - Allow "Node" if prompted

3. **Gatekeeper**
   - If you download the repository as a ZIP, macOS might quarantine the files
   - Remove quarantine: `xattr -rd com.apple.quarantine .`

## 🚀 Production Deployment on Mac

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Build the application
npm run build

# Start with PM2
pm2 start npm --name "shclinic" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Docker (Alternative)

```bash
# Create Dockerfile for Mac
docker build -t shclinic .
docker run -p 3000:3000 shclinic
```

## 📊 Performance Optimization on Mac

### SQLite Performance

```bash
# Optimize SQLite for Mac
sqlite3 src/db/clinic.db "PRAGMA optimize;"
```

### Memory Management

```bash
# Increase Node.js memory limit if needed
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

## 🆘 Getting Help

If you encounter issues during migration:

1. **Check the logs**

   ```bash
   tail -f ~/.npm/_logs/*.log
   ```

2. **Verify Node.js compatibility**

   ```bash
   node --version
   npm doctor
   ```

3. **Common commands for debugging**

   ```bash
   # Check port usage
   lsof -i :3000

   # Check file permissions
   ls -la src/db/

   # Check environment variables
   printenv | grep -i next
   ```

4. **Reset and start fresh**
   ```bash
   ./reset-mac.sh
   ./setup-mac.sh
   ./start-mac.sh
   ```

## 📝 Notes

- All PowerShell scripts (`.ps1`) are Windows-only and won't work on Mac
- The shell scripts (`.sh`) are the Mac/Linux equivalents
- Database files are compatible between platforms
- Uploaded files (PDFs) are also cross-platform compatible
- Environment variables might need adjustment for Mac paths
