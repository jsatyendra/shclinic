// check-lab-table.js
const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
    const db = new Database(dbPath);

    console.log('\n=== SH CLINIC DATABASE STRUCTURE ===\n');

    // List all tables
    console.log('Tables in database:');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    tables.forEach(table => console.log(`- ${table.name}`));

    // Check if lab_investigations table exists
    try {
        const labTableInfo = db.prepare("PRAGMA table_info(lab_investigations)").all();

        if (labTableInfo.length > 0) {
            console.log('\nLab Investigations table structure:');
            labTableInfo.forEach(column => {
                console.log(`  - Column: ${column.name}, Type: ${column.type}`);
            });
        } else {
            console.log('\nLab Investigations table exists but has no columns');
        }
    } catch (err) {
        console.error('\nError checking lab_investigations table:', err.message);
    }

    db.close();
} catch (error) {
    console.error('Error:', error.message);
}
