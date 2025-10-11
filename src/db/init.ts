import { initializeDatabase } from '../db/connection';
import { migrateClients } from '../db/migrate';

// Export a function to initialize the database and run migrations
// But don't automatically call it on import - this gives us more control
export function initDatabaseWithMigrations() {
  // Initialize the database schema
  initializeDatabase();
  
  // Run migrations
  migrateClients();
  
  console.log('[Database] Initialized with migrations');
}
