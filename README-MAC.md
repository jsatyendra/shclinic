# SH Clinic - Mac Setup Guide

This is a healthcare clinic management system built with Next.js, TypeScript, and SQLite. This guide provides Mac-specific setup instructions.

## Prerequisites

Before you begin, ensure you have the following installed on your Mac:

1. **Node.js** (version 18 or higher)

   ```bash
   # Check if Node.js is installed
   node --version

   # If not installed, download from https://nodejs.org/
   # Or install using Homebrew:
   brew install node
   ```

2. **Git**

   ```bash
   # Check if Git is installed
   git --version

   # If not installed:
   brew install git
   ```

3. **Homebrew** (package manager for Mac)
   ```bash
   # Install Homebrew if not already installed
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

## Clone and Setup

1. **Clone the repository**

   ```bash
   git clone <your-repository-url>
   cd shclinic
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Initialize the database**

   ```bash
   # Make the shell scripts executable
   chmod +x setup-mac.sh
   chmod +x migrate-mac.sh
   chmod +x backup-mac.sh
   chmod +x reset-mac.sh

   # Run the database initialization
   ./setup-mac.sh
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Mac-Specific Scripts

The following shell scripts are available for Mac users:

- `setup-mac.sh` - Initialize the database and run migrations
- `migrate-mac.sh` - Run database migrations
- `backup-mac.sh` - Backup the database
- `reset-mac.sh` - Reset the database
- `start-mac.sh` - Start the development server

## Database

This application uses SQLite as the database, which works perfectly on Mac. The database file is stored at `src/db/clinic.db`.

### Database Features

- Client management with personal information
- Health information tracking
- Medication prescriptions
- Lab investigations
- PDF document attachments
- Case status tracking
- Follow-up date management

## Development

### File Structure

```
shclinic/
├── src/
│   ├── app/           # Next.js app directory
│   ├── components/    # React components
│   ├── db/           # Database configuration
│   ├── lib/          # Utility libraries
│   ├── models/       # Data models
│   └── types/        # TypeScript type definitions
├── public/           # Static assets
├── uploads/          # PDF document uploads
└── scripts-mac/      # Mac-specific shell scripts
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database (Mac)
./setup-mac.sh       # Initialize database
./migrate-mac.sh     # Run migrations
./backup-mac.sh      # Backup database
./reset-mac.sh       # Reset database
```

## Troubleshooting

### Common Issues on Mac

1. **Permission denied when running scripts**

   ```bash
   chmod +x *.sh
   ```

2. **Node.js version issues**

   ```bash
   # Use Node Version Manager (nvm)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

3. **SQLite compilation issues**

   ```bash
   # Install build tools
   xcode-select --install

   # Reinstall better-sqlite3
   npm rebuild better-sqlite3
   ```

4. **Port already in use**
   ```bash
   # Find and kill process using port 3000
   lsof -ti:3000 | xargs kill -9
   ```

## Features

- **Client Management**: Add, edit, and manage client records
- **Health Tracking**: Comprehensive health information storage
- **Medications**: Prescription management
- **Lab Results**: Laboratory investigation tracking
- **PDF Documents**: Upload and view PDF documents
- **Case Status**: Track case status (Open/Closed/Discontinued)
- **Follow-up**: Schedule and manage follow-up dates
- **Export**: PDF export functionality

## Authentication

The application uses NextAuth.js for authentication. Configure your authentication providers in `src/lib/auth.ts`.

## Database Schema

The application uses the following main tables:

- `clients` - Client personal and health information
- `medications` - Prescribed medications
- `lab_investigations` - Laboratory test results
- `documents` - PDF document attachments

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.
