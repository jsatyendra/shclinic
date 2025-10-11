// dbverify.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use this to print to console (some terminal outputs are getting truncated)
function logToFile(message) {
    fs.appendFileSync('dblog.txt', message + '\n');
    console.log(message);
}

try {
    logToFile('\n--- DATABASE VERIFICATION [' + new Date().toISOString() + '] ---');
    logToFile('Verifying database structure...');
    const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
    logToFile(`Database path: ${dbPath}`);

    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
        logToFile('ERROR: Database file does not exist!');
        process.exit(1);
    }

    // Open database connection
    const db = new Database(dbPath);
    logToFile('Database opened successfully!');

    // Check table structure
    logToFile('\nChecking clients table structure:');
    const tableInfo = db.prepare("PRAGMA table_info(clients)").all();
    tableInfo.forEach(column => {
        logToFile(`  - Column: ${column.name}, Type: ${column.type}`);
    });

    // Check for existing clients
    const clientCount = db.prepare("SELECT COUNT(*) as count FROM clients").get();
    logToFile(`\nDatabase contains ${clientCount.count} client records.`);

    if (clientCount.count > 0) {
        // Get sample client
        const sampleClient = db.prepare("SELECT id, client_number, name, bloodPressure, bloodGlucose FROM clients LIMIT 1").get();
        logToFile('\nSample client record:');
        logToFile(JSON.stringify(sampleClient, null, 2));
    }

    // Close the database
    db.close();
    logToFile('\nDatabase verification completed.');
    logToFile('----------------------------------------------');
} catch (error) {
    logToFile('Error verifying database: ' + error.message);
}
