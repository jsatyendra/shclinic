import { Client, Medication } from "../types";
import { getDbConnection, initializeDatabase } from "../db/connection";
import { randomBytes } from "crypto";

// Define a DbClient type to represent database client row
interface DbClient {
  id: string;
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  address: string;
  phoneNumber: number;
  followUpDate?: string;
  status?: string;
  isAcute: number;
  client_number: string; // Add this line
}

// We no longer initialize the database here
// Database initialization happens only once at server startup via server-init.js

// Helper to generate random IDs
function generateId(): string {
  return randomBytes(4).toString('hex');
}

// Helper to convert client row to Client object
function mapRowToClient(client: DbClient): Client {
  const db = getDbConnection();
  
  // Get health info
  const healthInfoRows = db.prepare(
    'SELECT key, value FROM health_info WHERE client_id = ?'
  ).all(client.id) as { key: string; value: string }[];
  
  const healthInfo: Record<string, string> = {};
  healthInfoRows.forEach((row: { key: string; value: string }) => {
    healthInfo[row.key] = row.value;
  });
  
  // Get medications
  const medications = db.prepare(
    'SELECT id, name, dosage, duration, prescribedDate FROM medications WHERE client_id = ?'
  ).all(client.id) as Medication[];
  
  // Get lab investigations
  let labInvestigations: any[] = [];
  try {
    labInvestigations = db.prepare(
      'SELECT id, testName, testDate, results, notes FROM lab_investigations WHERE client_id = ?'
    ).all(client.id);
  } catch (err) {
    console.error('Error fetching lab investigations:', err);
  }
  
  // Get documents
  let documents: any[] = [];
  try {
    documents = db.prepare(
      'SELECT id, fileName, originalName, fileType, fileSize, uploadDate, description, category FROM documents WHERE client_id = ?'
    ).all(client.id);
  } catch (err) {
    console.error('Error fetching documents:', err);
  }
  return {
    id: client.id,
    client_number: client.client_number, // Add this line
    name: client.name,
    age: client.age,
    gender: client.gender as 'Male' | 'Female' | 'Other',
    height: client.height,
    weight: client.weight,
    address: client.address,
    phoneNumber: client.phoneNumber,
    followUpDate: client.followUpDate || "",
    status: (client.status as "Open" | "Closed" | "Discontinued") || "Open",
    isAcute: Boolean(client.isAcute),
    healthInfo,
    medications,
    labInvestigations,
    documents
  };
  };

// Get all clients
export const getClients = (): Client[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const db = getDbConnection();
    const rows = db.prepare('SELECT * FROM clients').all() as DbClient[];
    return rows.map(mapRowToClient);
  } catch (error) {
    console.error('Error getting clients:', error);
    return [];
  }
};

// Save all clients - this is a legacy function kept for compatibility
// but we're not using this approach with SQLite, as operations are individual
export const saveClients = (_clients: Client[]): void => {
  // This is now a no-op as we save clients individually
};

// Get a client by ID
export const getClientById = (id: string): Client | undefined => {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const db = getDbConnection();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as DbClient;
    
    if (!client) return undefined;
    
    return mapRowToClient(client);
  } catch (error) {
    console.error('Error getting client by ID:', error);
    return undefined;
  }
};

// Add a new client
export const addClient = (client: Omit<Client, 'id'>): Client => {
  if (typeof window === 'undefined') {
    throw new Error('Cannot add client during server-side rendering');
  }
  
  try {
    const db = getDbConnection();
    const newId = generateId();
    
    // Insert into clients table
    db.prepare(`
      INSERT INTO clients (id, name, age, gender, height, weight, address, phoneNumber, followUpDate, status, isAcute)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      client.name,
      client.age,
      client.gender,
      client.height,
      client.weight,
      client.address,
      client.phoneNumber,
      client.followUpDate || '',
      client.status || 'Open',
      client.isAcute ? 1 : 0
    );
    
    // Insert health info
    const insertHealthInfo = db.prepare(
      'INSERT INTO health_info (client_id, key, value) VALUES (?, ?, ?)'
    );
    
    // Use transaction for better performance
    const insertHealthInfoTx = db.transaction((clientId, healthInfo) => {
      for (const [key, value] of Object.entries(healthInfo)) {
        insertHealthInfo.run(clientId, key, value);
      }
    });
    
    insertHealthInfoTx(newId, client.healthInfo);
    
    // Insert medications
    if (client.medications && client.medications.length > 0) {
      const insertMedication = db.prepare(`
        INSERT INTO medications (id, client_id, name, dosage, duration, prescribedDate)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      client.medications.forEach(medication => {
        insertMedication.run(
          generateId(),
          newId,
          medication.name,
          medication.dosage,
          medication.duration,
          medication.prescribedDate || new Date().toISOString().split('T')[0]
        );
      });
    }
    
    // Return the newly created client
    return getClientById(newId) as Client;
  } catch (error) {
    console.error('Error adding client:', error);
    throw error;
  }
};

// Update an existing client
export const updateClient = (id: string, updatedClient: Partial<Client>): Client | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const db = getDbConnection();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as DbClient;
    
    if (!client) return null;
    
    // Update client basic info
    if (updatedClient.name || updatedClient.age || updatedClient.gender ||
        updatedClient.height || updatedClient.weight || updatedClient.address ||
        updatedClient.phoneNumber !== undefined || updatedClient.followUpDate !== undefined || 
        updatedClient.status !== undefined || updatedClient.isAcute !== undefined) {
      
      const updates = [];
      const params = [];
      
      if (updatedClient.name) {
        updates.push('name = ?');
        params.push(updatedClient.name);
      }
      
      if (updatedClient.age) {
        updates.push('age = ?');
        params.push(updatedClient.age);
      }
      
      if (updatedClient.gender) {
        updates.push('gender = ?');
        params.push(updatedClient.gender);
      }
      
      if (updatedClient.height) {
        updates.push('height = ?');
        params.push(updatedClient.height);
      }
      
      if (updatedClient.weight) {
        updates.push('weight = ?');
        params.push(updatedClient.weight);
      }
      
      if (updatedClient.address) {
        updates.push('address = ?');
        params.push(updatedClient.address);
      }
      
      if (updatedClient.phoneNumber !== undefined) {
        updates.push('phoneNumber = ?');
        params.push(updatedClient.phoneNumber);
      }
      
      if (updatedClient.followUpDate !== undefined) {
        updates.push('followUpDate = ?');
        params.push(updatedClient.followUpDate);
      }
      
      if (updatedClient.status !== undefined) {
        updates.push('status = ?');
        params.push(updatedClient.status);
      }
      
      if (updatedClient.isAcute !== undefined) {
        updates.push('isAcute = ?');
        params.push(updatedClient.isAcute ? 1 : 0);
      }
      
      if (updates.length > 0) {
        const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        params.push(id);
        db.prepare(sql).run(...params);
      }
    }
    
    // Update health info
    if (updatedClient.healthInfo) {
      // Delete existing health info for this client
      db.prepare('DELETE FROM health_info WHERE client_id = ?').run(id);
      
      // Insert new health info
      const insertHealthInfo = db.prepare(
        'INSERT INTO health_info (client_id, key, value) VALUES (?, ?, ?)'
      );
      
      const insertHealthInfoTx = db.transaction((clientId, healthInfo) => {
        for (const [key, value] of Object.entries(healthInfo)) {
          insertHealthInfo.run(clientId, key, value);
        }
      });
      
      insertHealthInfoTx(id, updatedClient.healthInfo);
    }
    
    // Update medications if provided
    if (updatedClient.medications) {
      // Replace all medications for the client
      db.prepare('DELETE FROM medications WHERE client_id = ?').run(id);
      
      const insertMedication = db.prepare(`
        INSERT INTO medications (id, client_id, name, dosage, duration, prescribedDate)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      updatedClient.medications.forEach(medication => {
        insertMedication.run(
          medication.id || generateId(),
          id,
          medication.name,
          medication.dosage,
          medication.duration,
          medication.prescribedDate
        );
      });
    }
    
    return getClientById(id) as Client;
  } catch (error) {
    console.error('Error updating client:', error);
    return null;
  }
};

// Add a medication to a client
export const addMedication = (clientId: string, medication: Omit<Medication, 'id'>): Medication | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const db = getDbConnection();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as DbClient;
    
    if (!client) return null;
    
    const medicationId = generateId();
    const prescribedDate = medication.prescribedDate || new Date().toISOString().split('T')[0];
    
    db.prepare(`
      INSERT INTO medications (id, client_id, name, dosage, duration, prescribedDate)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      medicationId,
      clientId,
      medication.name,
      medication.dosage,
      medication.duration || '',
      prescribedDate
    );
    
    return {
      id: medicationId,
      name: medication.name,
      dosage: medication.dosage,
      duration: medication.duration || '',
      prescribedDate
    };
  } catch (error) {
    console.error('Error adding medication:', error);
    return null;
  }
};

// Initialize with some sample data
export const seedSampleData = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const db = getDbConnection();
    const count = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
    
    if (count.count === 0) {
      const sampleClient: Omit<Client, 'id'> = {
        client_number: 'CL-0001',
        name: 'John Doe',
        age: '44',
        gender: 'Male',
        height: '180',
        weight: '75',
        address: '123 Main St, Anytown, USA',
        phoneNumber: 5551234567,
        status: 'Open',
        healthInfo: {
          bloodPressure: '120/80',
          allergies: 'Penicillin',
          chronicConditions: 'None',
        },
        medications: [
          {
            id: 'med1',
            name: 'Amoxicillin',
            dosage: '500mg twice daily',
            duration: '7 days',
            prescribedDate: '2023-01-15',
          },
        ],
        isAcute: false,
      };
      
      addClient(sampleClient);
      console.log('Seeded sample data');
    }
  } catch (error) {
    console.error('Error seeding sample data:', error);
  }
};

// Initialize the database if we're in the browser
export const initializeDb = (): void => {
  if (typeof window === 'undefined') return;
  
  initializeDatabase();
  seedSampleData();
};