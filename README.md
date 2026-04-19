# SH Clinic Management System

A homeopathic clinic management application built with Next.js, React, and SQLite.

## Features

- **Client Management** — Add, edit, search, and manage patient records with auto-generated client numbers (SHC-0001, SHC-0002, …)
- **Case Taking** — Structured health information capture using configurable templates for both regular and acute cases
- **Medications & Lab Investigations** — Track prescriptions and lab results per client
- **Document Management** — Upload and manage PDF documents per client (10MB limit)
- **Follow-up Tracking** — Schedule and monitor follow-up dates with dashboard alerts
- **Case Status** — Open / Closed / Discontinued workflow per client
- **PDF Export** — Generate printable patient summary PDFs
- **Authentication** — NextAuth.js with JWT strategy and bcrypt password hashing

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript 5
- **Database**: SQLite via better-sqlite3 (file-based, zero-config)
- **Auth**: NextAuth.js 4 with credentials provider
- **Styling**: Tailwind CSS v4
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install --legacy-peer-deps
```

### Environment Setup

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable             | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`    | Random string for JWT signing (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL`       | App URL, e.g. `http://localhost:3000`                                   |
| `AUTH_USERNAME`      | Login username                                                          |
| `AUTH_PASSWORD_HASH` | bcrypt hash of the password (escape `$` as `\$`)                        |
| `AUTH_USER_NAME`     | Display name shown in the UI                                            |

> **Note**: bcrypt hashes contain `$` characters. In `.env.local`, escape each `$` with `\$` to prevent dotenv-expand from treating them as variable references.

### Running

```bash
npm run dev      # Development server at http://localhost:3000
npm run build    # Production build
npm start        # Start production server
```

The SQLite database is created automatically on first run at `src/db/clinic.db`.

## Project Structure

```
src/
  app/              # Next.js App Router pages and API routes
    api/clients/    # REST API for client CRUD + documents
    clients/        # Client add/edit pages
    dashboard/      # Main dashboard with search & follow-up management
    login/          # Authentication page
  components/       # Reusable React components
  db/               # Database connection, schema, and migrations
  lib/              # Shared utilities (auth, validation, client API, DB helpers)
  types/            # TypeScript type definitions
scripts/            # Utility scripts (DB, migration, testing)
uploads/            # Uploaded document storage (gitignored)
```

## API Endpoints

All `/api/clients` endpoints require authentication (JWT via middleware).

| Method | Path                                  | Description                     |
| ------ | ------------------------------------- | ------------------------------- |
| GET    | `/api/clients`                        | List all clients                |
| GET    | `/api/clients?check=true`             | Health check (no auth required) |
| POST   | `/api/clients`                        | Create a new client             |
| GET    | `/api/clients/[id]`                   | Get client by ID                |
| PUT    | `/api/clients/[id]`                   | Update client                   |
| DELETE | `/api/clients/[id]`                   | Delete client                   |
| POST   | `/api/clients/[id]/documents`         | Upload document                 |
| GET    | `/api/clients/[id]/documents/[docId]` | Download document               |
| DELETE | `/api/clients/[id]/documents/[docId]` | Delete document                 |
