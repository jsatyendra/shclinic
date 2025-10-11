// list-clients.js
const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
    const db = new Database(dbPath);

    console.log('\n=== SH CLINIC CLIENT LIST ===\n');

    // Get client count
    const countResult = db.prepare('SELECT COUNT(*) as count FROM clients').get();
    console.log(`Total clients in database: ${countResult.count}\n`);

    if (countResult.count > 0) {
        // Fetch clients with formatted output
        const clients = db.prepare(`
      SELECT 
        client_number as "Client ID",
        name as "Name",
        gender as "Gender",
        phoneNumber as "Phone",
        CASE WHEN isAcute = 1 THEN 'Acute' ELSE 'Regular' END as "Case Type"
      FROM clients
      ORDER BY client_number
    `).all();

        // Display as a table
        console.log('ID\t\tName\t\t\tGender\tPhone\t\tType');
        console.log('----------------------------------------------------------');

        clients.forEach(client => {
            // Pad name field for better alignment
            const name = client['Name'].padEnd(20).substring(0, 20);
            console.log(`${client['Client ID']}\t${name}\t${client['Gender']}\t${client['Phone']}\t${client['Case Type']}`);
        });
    }

    db.close();
} catch (error) {
    console.error('Error listing clients:', error.message);
}
