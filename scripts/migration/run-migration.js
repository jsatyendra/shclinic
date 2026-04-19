const Database = require('better-sqlite3');
const path = require('path');

function runMigration() {
    const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
    const db = new Database(dbPath);

    try {
        console.log('Starting database migration...');

        // Check if required columns exist
        const tableInfo = db.prepare("PRAGMA table_info(clients)").all();
        const hasAge = tableInfo.some(col => col.name === 'age');
        const hasDateOfBirth = tableInfo.some(col => col.name === 'dateOfBirth');

        // Begin transaction
        db.prepare('BEGIN TRANSACTION').run();

        // Migrate dateOfBirth to age
        if (!hasAge && hasDateOfBirth) {
            console.log('Migrating dateOfBirth to age...');

            // Add age column
            db.prepare('ALTER TABLE clients ADD COLUMN age TEXT').run();

            // Get all clients with dateOfBirth
            const clients = db.prepare('SELECT id, dateOfBirth FROM clients WHERE dateOfBirth IS NOT NULL').all();

            const updateAgeStmt = db.prepare('UPDATE clients SET age = ? WHERE id = ?');

            clients.forEach(client => {
                try {
                    // Calculate age from dateOfBirth
                    const birthDate = new Date(client.dateOfBirth);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();

                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }

                    updateAgeStmt.run(age.toString(), client.id);
                    console.log(`Updated client ${client.id}: age ${age}`);
                } catch (error) {
                    console.warn(`Could not calculate age for client ${client.id}, setting to empty string`);
                    updateAgeStmt.run('', client.id);
                }
            });

            console.log(`Updated age for ${clients.length} clients`);
        } else {
            console.log('Age column already exists or no dateOfBirth column found');
        }

        // Commit the transaction
        db.prepare('COMMIT').run();
        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
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

runMigration();
