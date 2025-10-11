// Initialize database once on server startup
const { initializeDatabase, getDbConnection } = require('./src/db/connection');
const { migrateClients } = require('./src/db/migrate');

console.log('Server starting, initializing database...');

// Run database initialization just once on server startup
try {
    // Initialize database schema
    initializeDatabase();

    // Run any pending migrations
    migrateClients();

    // Check if the database is empty and seed sample data if needed
    const db = getDbConnection();
    const count = db.prepare('SELECT COUNT(*) as count FROM clients').get();

    if (count.count === 0) {
        console.log('Database is empty, adding sample data...');

        // Import the db module that contains seedSampleData
        const dbModule = require('./src/lib/db');

        // Call seedSampleData function if it exists
        if (typeof dbModule.seedSampleData === 'function') {
            dbModule.seedSampleData();
            console.log('Sample data added successfully');
        } else {
            console.log('No sample data function available');
        }
    } else {
        console.log(`Database contains ${count.count} clients, skipping sample data`);
    }

    console.log('Database initialization complete');
} catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
}
