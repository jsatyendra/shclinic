const Database = require('better-sqlite3');
const db = new Database('./src/db/clinic.db');

try {
    console.log('Testing database schema...');

    // Check if status column exists
    const columns = db.pragma('table_info(clients)');
    console.log('Clients table columns:');
    columns.forEach(col => console.log(`  ${col.name}: ${col.type}`));

    const statusColumn = columns.find(col => col.name === 'status');
    if (statusColumn) {
        console.log('\n✅ Status column exists!');
    } else {
        console.log('\n❌ Status column is missing!');
    }

    // Test querying with status
    const clients = db.prepare('SELECT id, name, status FROM clients LIMIT 3').all();
    console.log('\nSample clients with status:');
    clients.forEach(client => {
        console.log(`  ${client.name}: ${client.status || 'NULL'}`);
    });

    db.close();
    console.log('\n✅ Database test completed successfully!');
} catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
}
