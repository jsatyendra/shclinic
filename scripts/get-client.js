// get-client.js
const Database = require('better-sqlite3');
const path = require('path');

// Get the client ID or number from command line arguments
const clientParam = process.argv[2];
if (!clientParam) {
    console.error('Please provide a client ID or client number as a command line argument');
    process.exit(1);
}

// Connect to the database
const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
const db = new Database(dbPath);

// Check if the parameter looks like a client number (e.g., SHC-0001)
const isClientNumber = clientParam.startsWith('SHC-');

// Query the client
let client;
if (isClientNumber) {
    client = db.prepare('SELECT * FROM clients WHERE client_number = ?').get(clientParam);
} else {
    client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientParam);
}

if (!client) {
    console.log(`No client found with ${isClientNumber ? 'number' : 'ID'}: ${clientParam}`);

    // List all clients to help diagnose
    console.log('\nAvailable clients:');
    const clients = db.prepare('SELECT id, client_number, name FROM clients').all();
    clients.forEach(c => {
        console.log(`ID: ${c.id}, Number: ${c.client_number}, Name: ${c.name}`);
    });
} else {
    console.log('Client found:');
    console.log(client);

    // Get health info
    const healthInfoRows = db.prepare('SELECT key, value FROM health_info WHERE client_id = ?').all(client.id);
    console.log('\nHealth info:');
    console.log(healthInfoRows);

    // Get medications
    const medications = db.prepare('SELECT * FROM medications WHERE client_id = ?').all(client.id);
    console.log('\nMedications:');
    console.log(medications);

    // Try to get lab investigations
    try {
        const labInvestigations = db.prepare('SELECT * FROM lab_investigations WHERE client_id = ?').all(client.id);
        console.log('\nLab Investigations:');
        console.log(labInvestigations);
    } catch (err) {
        console.error('\nError fetching lab investigations:', err.message);
    }
}

// Close the database connection
db.close();
