// export-clients.js
// Export all client data to a JSON file for backup or analysis

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

try {
    const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
    const db = new Database(dbPath);
    const exportDate = new Date().toISOString().split('T')[0];

    console.log('\n=== EXPORTING CLIENT DATA ===\n');

    // Get all clients
    const clients = db.prepare('SELECT * FROM clients').all();
    console.log(`Found ${clients.length} clients to export`);

    // For each client, get health info and medications
    const fullClientData = clients.map(client => {
        // Get health info
        const healthInfo = db.prepare('SELECT key, value FROM health_info WHERE client_id = ?').all(client.id);

        // Get medications
        const medications = db.prepare('SELECT * FROM medications WHERE client_id = ?').all(client.id);

        // Return complete client object
        return {
            ...client,
            healthInfo: healthInfo.reduce((obj, item) => {
                obj[item.key] = item.value;
                return obj;
            }, {}),
            medications
        };
    });

    // Write to file
    const outputFile = `clients_export_${exportDate}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(fullClientData, null, 2));

    console.log(`Successfully exported ${clients.length} clients to ${outputFile}`);
    console.log(`File location: ${path.resolve(outputFile)}`);

    db.close();
} catch (error) {
    console.error('Error exporting clients:', error.message);
}
