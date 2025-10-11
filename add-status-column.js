const Database = require('better-sqlite3');
const db = new Database('./src/db/clinic.db');

try {
    // Check if status column exists
    const columns = db.pragma('table_info(clients)');
    const statusExists = columns.some(col => col.name === 'status');

    if (!statusExists) {
        console.log('Adding status column to clients table...');
        db.exec('ALTER TABLE clients ADD COLUMN status TEXT DEFAULT "Open"');
        console.log('Status column added successfully');
    } else {
        console.log('Status column already exists');
    }

    db.close();
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}
