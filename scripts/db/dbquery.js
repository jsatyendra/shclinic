// dbquery.js
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Function to display records in a more readable format
function displayRecords(records) {
    if (records.length === 0) {
        console.log('No records found.');
        return;
    }

    // Format each record
    records.forEach((record, index) => {
        console.log(`\n--- Record ${index + 1} ---`);
        for (const [key, value] of Object.entries(record)) {
            console.log(`${key}: ${value}`);
        }
    });
    console.log(`\nTotal records: ${records.length}`);
}

// Helper function to print health info for a client
function displayHealthInfo(clientId, db) {
    console.log('\n--- Health Information ---');
    const healthInfo = db.prepare('SELECT key, value FROM health_info WHERE client_id = ?').all(clientId);
    if (healthInfo.length === 0) {
        console.log('No health information found for this client.');
        return;
    }
    healthInfo.forEach(info => {
        console.log(`${info.key}: ${info.value}`);
    });
}

// Helper function to print medications for a client
function displayMedications(clientId, db) {
    console.log('\n--- Medications ---');
    const medications = db.prepare('SELECT * FROM medications WHERE client_id = ?').all(clientId);
    if (medications.length === 0) {
        console.log('No medications found for this client.');
        return;
    }
    displayRecords(medications);
}

async function main() {
    try {
        console.log('Connecting to database...');
        const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
        const db = new Database(dbPath);
        console.log('Database connected successfully.');

        // List all tables
        console.log('\n--- Tables in database ---');
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        tables.forEach(table => console.log(table.name));

        // Initialize readline interface
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // Menu loop
        function showMenu() {
            console.log('\n--- Database Query Tool ---');
            console.log('1. View all clients');
            console.log('2. Search clients by name');
            console.log('3. Search client by ID');
            console.log('4. View client details (including health info and medications)');
            console.log('5. Exit');
            rl.question('\nEnter your choice (1-5): ', (choice) => {
                switch (choice) {
                    case '1':
                        // View all clients
                        console.log('\n--- All Clients ---');
                        const clients = db.prepare('SELECT id, client_number, name, gender, phoneNumber FROM clients').all();
                        displayRecords(clients);
                        showMenu();
                        break;
                    case '2':
                        // Search by name
                        rl.question('Enter client name to search: ', (name) => {
                            const searchPattern = `%${name}%`;
                            const results = db.prepare('SELECT id, client_number, name, gender, phoneNumber FROM clients WHERE name LIKE ?').all(searchPattern);
                            console.log('\n--- Search Results ---');
                            displayRecords(results);
                            showMenu();
                        });
                        break;
                    case '3':
                        // Search by ID
                        rl.question('Enter client ID (SHC-XXXX): ', (clientId) => {
                            const results = db.prepare('SELECT id, client_number, name, gender, phoneNumber FROM clients WHERE client_number = ?').all(clientId);
                            console.log('\n--- Search Results ---');
                            displayRecords(results);
                            showMenu();
                        });
                        break;
                    case '4':
                        // View client details
                        rl.question('Enter client internal ID: ', (clientId) => {
                            const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
                            if (client) {
                                console.log('\n--- Client Details ---');
                                for (const [key, value] of Object.entries(client)) {
                                    console.log(`${key}: ${value}`);
                                }
                                displayHealthInfo(clientId, db);
                                displayMedications(clientId, db);
                            } else {
                                console.log('Client not found with ID:', clientId);
                            }
                            showMenu();
                        });
                        break;
                    case '5':
                        // Exit
                        console.log('Closing database connection...');
                        db.close();
                        console.log('Goodbye!');
                        rl.close();
                        break;
                    default:
                        console.log('Invalid choice. Please enter a number between 1 and 5.');
                        showMenu();
                }
            });
        }

        // Start with the menu
        showMenu();

    } catch (error) {
        console.error('Error querying database:', error.message);
    }
}

// Run the main function
main();
