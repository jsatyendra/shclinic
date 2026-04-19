import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// For Next.js edge runtime compatibility
// Ensure this code only runs on server side
let db: Database.Database | null = null;

// Check if we're in a browser environment
const isServer = typeof window === 'undefined';

// This function gets the database connection, creating it if needed
function getDbConnection(): Database.Database {
  // Only proceed if we're on the server
  if (!isServer) {
    throw new Error('Database connection can only be created on the server side');
  }

  if (!db) {
    console.log('[Database] Creating new database connection');
    
    // Ensure the db directory exists
    const dbDir = path.join(process.cwd(), 'src', 'db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Path to the SQLite database file
    const dbPath = path.join(dbDir, 'clinic.db');
    
    // Create database connection
    db = new Database(dbPath);
    
    // Set pragmas for better performance and safety
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  
  return db;
}// Initialize database tables
function initializeDatabase(): void {
  if (!isServer) {
    console.warn('[Database] Initialization skipped - client side detected');
    return;
  }

  console.log('[Database] Running initialization');
  const db = getDbConnection();
  
  // Create counter table for client IDs
  db.exec(`
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    )
  `);
  
  // Initialize client counter if it doesn't exist
  const counterExists = db.prepare('SELECT 1 FROM counters WHERE name = ?').get('client_id');
  if (!counterExists) {
    db.prepare('INSERT INTO counters (name, value) VALUES (?, ?)').run('client_id', 1);
  }
  
  // Create clients table
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      client_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      age TEXT,
      gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
      height TEXT,
      weight TEXT,
      bloodPressure TEXT,
      bloodGlucose TEXT,
      address TEXT,
      phoneNumber TEXT,
      followUpDate TEXT,
      status TEXT DEFAULT 'Open',
      isAcute INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create health_info table (one-to-many relationship with clients)
  db.exec(`
    CREATE TABLE IF NOT EXISTS health_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);
    // Create medications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      duration TEXT,
      prescribedDate TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);
  
  // Create lab_investigations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lab_investigations (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      testName TEXT NOT NULL,
      testDate TEXT NOT NULL,
      results TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  // Create documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      fileName TEXT NOT NULL,
      originalName TEXT NOT NULL,
      fileType TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      uploadDate TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Other',
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);
    
  console.log('Database initialized successfully');
}

// This function will be imported in the migrate.ts file, so we need to export it
export { getDbConnection, initializeDatabase };