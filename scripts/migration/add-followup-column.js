const Database = require('better-sqlite3');
const path = require('path');

function addFollowUpDateColumn() {
    const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
    const db = new Database(dbPath);

    try {
        console.log('Adding follow-up date column to clients table...');

        // Check if followUpDate column already exists
        const tableInfo = db.prepare("PRAGMA table_info(clients)").all();
        const hasFollowUpDate = tableInfo.some(col => col.name === 'followUpDate');

        if (!hasFollowUpDate) {
            // Begin transaction
            db.prepare('BEGIN TRANSACTION').run();

            // Add followUpDate column
            db.prepare('ALTER TABLE clients ADD COLUMN followUpDate TEXT').run();

            // Commit the transaction
            db.prepare('COMMIT').run();
            console.log('Follow-up date column added successfully.');
        } else {
            console.log('Follow-up date column already exists.');
        }

        // Show the updated table structure
        console.log('\nUpdated table structure:');
        const updatedTableInfo = db.prepare("PRAGMA table_info(clients)").all();
        console.table(updatedTableInfo);

    } catch (error) {
        console.error('Failed to add follow-up date column:', error);
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

addFollowUpDateColumn();
