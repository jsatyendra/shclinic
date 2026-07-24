// Migration to add client_number field to existing clients

import { getDbConnection } from './connection';

function migrateClients() {
  const db = getDbConnection();

  try {
    console.log('Starting database migration...');

    // Check if required columns exist
    const tableInfo = db.prepare("PRAGMA table_info(clients)").all() as { name: string }[];
    const hasClientNumber = tableInfo.some(col => col.name === 'client_number');
    const hasBloodPressure = tableInfo.some(col => col.name === 'bloodPressure');
    const hasBloodGlucose = tableInfo.some(col => col.name === 'bloodGlucose');
    const hasStartDate = tableInfo.some(col => col.name === 'startDate');
    const hasAge = tableInfo.some(col => col.name === 'age');
    const hasDateOfBirth = tableInfo.some(col => col.name === 'dateOfBirth');

    // Begin transaction
    db.prepare('BEGIN TRANSACTION').run();

    // Add missing columns
    const needMigration = !hasClientNumber || !hasBloodPressure || !hasBloodGlucose || !hasStartDate || (!hasAge && hasDateOfBirth);
    
    if (!hasBloodPressure) {
      console.log('Adding bloodPressure column to clients table...');
      db.prepare('ALTER TABLE clients ADD COLUMN bloodPressure TEXT').run();
    }

    if (!hasBloodGlucose) {
      console.log('Adding bloodGlucose column to clients table...');
      db.prepare('ALTER TABLE clients ADD COLUMN bloodGlucose TEXT').run();
    }

    if (!hasStartDate) {
      console.log('Adding startDate column to clients table...');
      db.prepare('ALTER TABLE clients ADD COLUMN startDate TEXT').run();
    }

    // Migrate dateOfBirth to age
    if (!hasAge && hasDateOfBirth) {
      console.log('Migrating dateOfBirth to age...');
      
      // Add age column
      db.prepare('ALTER TABLE clients ADD COLUMN age TEXT').run();
      
      // Get all clients with dateOfBirth
      const clients = db.prepare('SELECT id, dateOfBirth FROM clients WHERE dateOfBirth IS NOT NULL').all() as { id: string; dateOfBirth: string }[];
      
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
        } catch (error) {
          console.warn(`Could not calculate age for client ${client.id}, setting to empty string`);
          updateAgeStmt.run('', client.id);
        }
      });
      
      console.log(`Updated age for ${clients.length} clients`);
    }

    if (!hasClientNumber) {
      console.log('Adding client_number column to clients table...');
      db.prepare('ALTER TABLE clients ADD COLUMN client_number TEXT').run();
      
      // Create counter table if it doesn't exist
      db.prepare(`
        CREATE TABLE IF NOT EXISTS counters (
          name TEXT PRIMARY KEY,
          value INTEGER NOT NULL
        )
      `).run();

      // Initialize client counter
      db.prepare('INSERT OR IGNORE INTO counters (name, value) VALUES (?, ?)').run('client_id', 1);
      
      // Get all clients without a client_number
      const clients = db.prepare('SELECT id FROM clients ORDER BY created_at').all() as { id: string }[];
      
      // Get current counter value
      const counterRow = db.prepare('SELECT value FROM counters WHERE name = ?').get('client_id') as { value: number };
      let counter = counterRow.value;
      
      // Update each client with a new client_number
      const updateClientStmt = db.prepare('UPDATE clients SET client_number = ? WHERE id = ?');
      
      clients.forEach(client => {
        const clientNumber = `SHC-${counter.toString().padStart(4, '0')}`;
        updateClientStmt.run(clientNumber, client.id);
        counter++;
      });
      
      // Update the counter value
      db.prepare('UPDATE counters SET value = ? WHERE name = ?').run(counter, 'client_id');
      
      // Add a unique constraint to the client_number column
      db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_client_number ON clients(client_number)').run();
      
      console.log(`Client number migration completed. ${clients.length} clients updated.`);
    }
    
    // Commit the transaction if all migrations are complete
    if (needMigration) {
      db.prepare('COMMIT').run();
      console.log('All migrations completed successfully.');
    } else {
      db.prepare('COMMIT').run();
      console.log('No migrations needed.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    // Rollback on error
    db.prepare('ROLLBACK').run();
  }
}

// Run the migration immediately if this file is executed directly
if (require.main === module) {
  migrateClients();
}

export { migrateClients };
