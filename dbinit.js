// dbinit.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

try {
    console.log('Initializing database...');
    const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
    console.log(`Database path: ${dbPath}`);

    // Open database connection
    const db = new Database(dbPath);
    console.log('Database opened successfully!');

    // Run initialization
    console.log('Creating tables if they do not exist...');

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
        console.log('Initialized client counter with value 1');
    }

    // Create or update clients table
    db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      client_number TEXT UNIQUE,
      name TEXT NOT NULL,
      dateOfBirth TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
      height TEXT,
      weight TEXT,
      bloodPressure TEXT,
      bloodGlucose TEXT,
      address TEXT,
      phoneNumber INTEGER,
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
  `);    // Create medications table
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

    // Check for missing columns in clients table
    const tableInfo = db.prepare("PRAGMA table_info(clients)").all();
    const columnNames = tableInfo.map(col => col.name);

    // Ensure client_number column exists
    if (!columnNames.includes('client_number')) {
        console.log('Adding client_number column to clients table...');
        db.exec('ALTER TABLE clients ADD COLUMN client_number TEXT UNIQUE');
    }

    // Ensure bloodPressure column exists
    if (!columnNames.includes('bloodPressure')) {
        console.log('Adding bloodPressure column to clients table...');
        db.exec('ALTER TABLE clients ADD COLUMN bloodPressure TEXT');
    }

    // Ensure bloodGlucose column exists
    if (!columnNames.includes('bloodGlucose')) {
        console.log('Adding bloodGlucose column to clients table...');
        db.exec('ALTER TABLE clients ADD COLUMN bloodGlucose TEXT');
    }

    // Create a unique index on client_number if it doesn't exist
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_client_number ON clients(client_number)');

    // Ensure all clients have a client_number
    const clientsWithoutNumber = db.prepare('SELECT id FROM clients WHERE client_number IS NULL').all();
    if (clientsWithoutNumber.length > 0) {
        console.log(`Found ${clientsWithoutNumber.length} clients without a client_number. Assigning numbers...`);

        // Get current counter value
        const counterRow = db.prepare('SELECT value FROM counters WHERE name = ?').get('client_id');
        let counter = counterRow.value;

        // Update each client with a new client_number
        const updateClientStmt = db.prepare('UPDATE clients SET client_number = ? WHERE id = ?');

        clientsWithoutNumber.forEach(client => {
            const clientNumber = `SHC-${counter.toString().padStart(4, '0')}`;
            updateClientStmt.run(clientNumber, client.id);
            counter++;
        });

        // Update the counter value
        db.prepare('UPDATE counters SET value = ? WHERE name = ?').run(counter, 'client_id');
        console.log(`Updated ${clientsWithoutNumber.length} clients with client numbers.`);
    }

    // Close the database
    db.close();
    console.log('Database initialization completed successfully!');
} catch (error) {
    console.error('Error initializing database:', error.message);
}
