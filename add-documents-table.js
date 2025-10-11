const Database = require('better-sqlite3');
const db = new Database('./src/db/clinic.db');

try {
    console.log('Adding documents table...');

    // Check if documents table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'").get();

    if (!tables) {
        console.log('Creating documents table...');

        // Create documents table
        db.exec(`
      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        fileName TEXT NOT NULL,
        originalName TEXT NOT NULL,
        fileType TEXT NOT NULL,
        fileSize INTEGER NOT NULL,
        uploadDate TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'Other',
        FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE
      )
    `);

        console.log('Documents table created successfully');
    } else {
        console.log('Documents table already exists');
    }

    // Create uploads directory if it doesn't exist
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, 'uploads');

    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Created uploads directory');
    }

    db.close();
    console.log('✅ Documents setup completed successfully!');
} catch (error) {
    console.error('❌ Documents setup failed:', error);
    process.exit(1);
}
