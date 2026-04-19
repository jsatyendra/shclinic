// find-client.js
// Search for a client by name or client number

const Database = require('better-sqlite3');
const path = require('path');

// Get search term from command line arguments
const searchTerm = process.argv[2];

if (!searchTerm) {
  console.log('Usage: node find-client.js <search term>');
  console.log('Example: node find-client.js "John Doe"');
  console.log('Example: node find-client.js SHC-0001');
  process.exit(1);
}

try {
  const dbPath = path.join(__dirname, 'src', 'db', 'clinic.db');
  const db = new Database(dbPath);
  
  console.log(`\n=== SEARCHING FOR: "${searchTerm}" ===\n`);
  
  // Search by name (partial match) or client number (exact match)
  const searchPattern = `%${searchTerm}%`;
  const clients = db.prepare(`
    SELECT * FROM clients 
    WHERE name LIKE ? OR client_number = ?
    ORDER BY name
  `).all(searchPattern, searchTerm);
  
  if (clients.length === 0) {
    console.log('No clients found matching your search criteria.');
  } else {
    console.log(`Found ${clients.length} matching client(s):\n`);
    
    clients.forEach((client, index) => {
      console.log(`--- Client ${index + 1} ---`);
      console.log(`ID: ${client.client_number}`);
      console.log(`Name: ${client.name}`);
      console.log(`Gender: ${client.gender}`);
      console.log(`Date of Birth: ${client.dateOfBirth}`);
      console.log(`Phone: ${client.phoneNumber}`);
      console.log(`Blood Pressure: ${client.bloodPressure || 'Not recorded'}`);
      console.log(`Blood Glucose: ${client.bloodGlucose || 'Not recorded'}`);
      console.log(`Case Type: ${client.isAcute ? 'Acute' : 'Regular'}`);
      console.log('');
      
      // Get health info
      const healthInfo = db.prepare('SELECT key, value FROM health_info WHERE client_id = ?').all(client.id);
      console.log(`Health Information: ${healthInfo.length} entries`);
      
      // Get medications
      const medications = db.prepare('SELECT id, name, dosage, duration, prescribedDate FROM medications WHERE client_id = ?').all(client.id);
      console.log(`Medications: ${medications.length} entries`);
      if (medications.length > 0) {
        medications.forEach(med => {
          console.log(`  - ${med.name} (${med.dosage}), prescribed: ${med.prescribedDate}`);
        });
      }
      console.log('----------------------------------');
    });
  }
  
  db.close();
} catch (error) {
  console.error('Error searching for clients:', error.message);
}
