// test-persistence.js
// This script tests database persistence by adding a test client
// and then reading it back from the database

const Database = require('better-sqlite3');
const path = require('path');
const { randomBytes } = require('crypto');

function generateId() {
    return randomBytes(4).toString('hex');
}

try {
    console.log('Testing database persistence...');
    const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');

    // Open database connection
    const db = new Database(dbPath);
    console.log('Database opened successfully!');

    // Create a test client with a unique name and current timestamp
    const testId = generateId();
    const timestamp = new Date().toISOString();
    const testName = `Test Client ${timestamp}`;

    // Get next client number
    const counterRow = db.prepare('SELECT value FROM counters WHERE name = ?').get('client_id');
    if (!counterRow) {
        throw new Error('Client counter not found in database');
    }

    const nextNumber = counterRow.value;
    const clientNumber = `SHC-${nextNumber.toString().padStart(4, '0')}`;

    // Update the counter
    db.prepare('UPDATE counters SET value = value + 1 WHERE name = ?').run('client_id');

    console.log(`Creating test client "${testName}" with ID ${clientNumber}...`);

    // Insert test client
    db.prepare(`
        INSERT INTO clients (
            id, client_number, name, dateOfBirth, gender, 
            height, weight, bloodPressure, bloodGlucose, 
            address, phoneNumber, isAcute
        ) VALUES (
            ?, ?, ?, ?, ?, 
            ?, ?, ?, ?, 
            ?, ?, ?
        )
    `).run(
        testId,
        clientNumber,
        testName,
        '2000-01-01',
        'Male',
        '170 cm',
        '70 kg',
        '120/80',
        '100 mg/dL',
        '123 Test Street',
        1234567890,
        0
    );

    console.log('Test client created successfully');

    // Query to verify client was saved
    const clients = db.prepare('SELECT * FROM clients ORDER BY created_at DESC LIMIT 5').all();

    console.log('\nLast 5 clients in database:');
    clients.forEach((client, index) => {
        console.log(`[${index + 1}] ${client.client_number}: ${client.name} (Created: ${client.created_at})`);
    });

    // Close the database
    db.close();
    console.log('\nDatabase test completed successfully!');
    console.log('If you restart the application, this test client should still be present.');

} catch (error) {
    console.error('Error testing database:', error.message);
}
