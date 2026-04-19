const Database = require('better-sqlite3');
const path = require('path');

function recreateClientsTable() {
    const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
    const db = new Database(dbPath);

    try {
        console.log('Starting database table recreation...');

        // Begin transaction
        db.prepare('BEGIN TRANSACTION').run();

        // Drop the existing clients table
        console.log('Dropping existing clients table...');
        db.prepare('DROP TABLE IF EXISTS clients').run();

        // Create the new clients table with correct schema
        console.log('Creating new clients table with age column...');
        db.prepare(`
      CREATE TABLE clients (
        id TEXT PRIMARY KEY,
        client_number TEXT UNIQUE,
        name TEXT NOT NULL,
        age TEXT,
        gender TEXT NOT NULL,
        height TEXT,
        weight TEXT,
        bloodPressure TEXT,
        bloodGlucose TEXT,
        address TEXT,
        phoneNumber INTEGER,
        isAcute INTEGER DEFAULT 0,
        healthInfo TEXT,
        medications TEXT,
        labInvestigations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

        // Create index for client_number
        console.log('Creating index for client_number...');
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_client_number ON clients(client_number)').run();

        // Create or update the counters table for client numbering
        console.log('Setting up counters table...');
        db.prepare(`
      CREATE TABLE IF NOT EXISTS counters (
        name TEXT PRIMARY KEY,
        value INTEGER NOT NULL
      )
    `).run();

        // Initialize client counter
        db.prepare('INSERT OR REPLACE INTO counters (name, value) VALUES (?, ?)').run('client_id', 1);

        // Commit the transaction
        db.prepare('COMMIT').run();
        console.log('Table recreation completed successfully.');

        // Show the new table structure
        console.log('\nNew table structure:');
        const tableInfo = db.prepare("PRAGMA table_info(clients)").all();
        console.table(tableInfo);

    } catch (error) {
        console.error('Table recreation failed:', error);
        // Rollback on error
        try {
            db.prepare('ROLLBACK').run();
        } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
        }
    } finally {
        db.close();
    }
}

recreateClientsTable();
