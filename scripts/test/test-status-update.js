const Database = require('better-sqlite3');
const db = new Database('./src/db/clinic.db');

try {
    console.log('Testing status update functionality...');

    // Get a sample client
    const client = db.prepare('SELECT id, name, status FROM clients LIMIT 1').get();

    if (client) {
        console.log(`Current client: ${client.name}, Status: ${client.status}`);

        // Test updating status to Closed
        const updateStmt = db.prepare('UPDATE clients SET status = ? WHERE id = ?');
        updateStmt.run('Closed', client.id);

        // Verify the update
        const updatedClient = db.prepare('SELECT id, name, status FROM clients WHERE id = ?').get(client.id);
        console.log(`After update: ${updatedClient.name}, Status: ${updatedClient.status}`);

        // Reset back to Open
        updateStmt.run('Open', client.id);
        const resetClient = db.prepare('SELECT id, name, status FROM clients WHERE id = ?').get(client.id);
        console.log(`After reset: ${resetClient.name}, Status: ${resetClient.status}`);

        console.log('✅ Status update test completed successfully!');
    } else {
        console.log('No clients found to test with');
    }

    db.close();
} catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
}
