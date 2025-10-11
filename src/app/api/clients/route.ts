import { NextResponse } from "next/server";
import { getDbConnection } from "../../../db/connection";
import { randomBytes } from "crypto";
import { Medication } from "../../../types";

// Define a DbClient type to represent database client row
interface DbClient {
  id: string;
  client_number: string;
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  bloodPressure?: string;
  bloodGlucose?: string;
  address: string;
  phoneNumber: number;
  followUpDate?: string;
  status?: string;
  isAcute: number;
}  // Helper to convert database row to client object
interface HealthInfoRow {
  key: string;
  value: string;
}

interface Client {
  id: string;
  client_number: string;
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  bloodPressure?: string;
  bloodGlucose?: string;
  address: string;
  phoneNumber: number;
  followUpDate?: string;
  status: string;
  isAcute: boolean;
  healthInfo: Record<string, string>;
  medications: Medication[];
  labInvestigations?: any[];
  documents?: any[];
}

function mapRowToClient(client: DbClient): Client {
  const db = getDbConnection();
  
  // Get health info
  const healthInfoRows = db.prepare(
    'SELECT key, value FROM health_info WHERE client_id = ?'
  ).all(client.id) as HealthInfoRow[];
  
  const healthInfo: Record<string, string> = {};
  healthInfoRows.forEach((row: HealthInfoRow) => {
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
    client_number: client.client_number,
    name: client.name,
    age: client.age,
    gender: client.gender,
    height: client.height,
    weight: client.weight,
    bloodPressure: client.bloodPressure || "",
    bloodGlucose: client.bloodGlucose || "",
    address: client.address,
    phoneNumber: client.phoneNumber,
    followUpDate: client.followUpDate || "",
    status: client.status || "Open",
    isAcute: Boolean(client.isAcute),
    healthInfo,
    medications,
    labInvestigations,
    documents
  };
}

// Helper to generate random IDs
function generateId(): string {
  return randomBytes(4).toString('hex');
}

// Helper to generate formatted client number
function generateClientNumber(db: any): string {
  // Get the next client number from the counter
  const counterRow = db.prepare('SELECT value FROM counters WHERE name = ?').get('client_id');
  const nextNumber = counterRow.value;
  
  // Update the counter
  db.prepare('UPDATE counters SET value = value + 1 WHERE name = ?').run('client_id');
  
  // Format the client number with leading zeros (SHC-0001, SHC-0002, etc.)
  return `SHC-${nextNumber.toString().padStart(4, '0')}`;
}

// GET endpoint to retrieve all clients
export async function GET(request: Request) {
  // Check if this is just a connectivity check - if so, don't query the database
  const url = new URL(request.url);
  const isCheck = url.searchParams.get('check') === 'true';
  
  if (isCheck) {
    // Just return a success response without any database operations
    return NextResponse.json({ status: 'ok' });
  }
  
  try {
    const db = getDbConnection();
    const rows = db.prepare('SELECT * FROM clients').all() as DbClient[];
    const clients = rows.map(mapRowToClient);
    
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

// POST endpoint to add a new client
export async function POST(request: Request) {
  try {
    const client = await request.json();
    const db = getDbConnection();
    const newId = generateId();
    const clientNumber = generateClientNumber(db);
    
    // Insert into clients table
    db.prepare(`
      INSERT INTO clients (id, client_number, name, age, gender, height, weight, bloodPressure, bloodGlucose, address, phoneNumber, followUpDate, status, isAcute)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      clientNumber,
      client.name,
      client.age,
      client.gender,
      client.height || '',
      client.weight || '',
      client.bloodPressure || '',
      client.bloodGlucose || '',
      client.address || '',
      client.phoneNumber || 0,
      client.followUpDate || '',
      client.status || 'Open',
      client.isAcute ? 1 : 0
    );
    
    // Insert health info
    if (client.healthInfo) {
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
    }
    
    // Insert medications
    if (client.medications && client.medications.length > 0) {
      const insertMedication = db.prepare(`
        INSERT INTO medications (id, client_id, name, dosage, duration, prescribedDate)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      client.medications.forEach((medication: Omit<Medication, 'id'>) => {
        insertMedication.run(
          generateId(),
          newId,
          medication.name,
          medication.dosage,
          medication.duration || '',
          medication.prescribedDate || new Date().toISOString().split('T')[0]
        );      });
    }
      // Insert lab investigations
    if (client.labInvestigations && client.labInvestigations.length > 0) {
      const insertLabInvestigation = db.prepare(`
        INSERT INTO lab_investigations (id, client_id, testName, testDate, results, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
        client.labInvestigations.forEach((lab: { testName: string; testDate: string; results: string; notes?: string }) => {
        insertLabInvestigation.run(
          generateId(),
          newId,
          lab.testName,
          lab.testDate,
          lab.results,
          lab.notes || ''
        );
      });
    }
    
    // Get the newly created client
    const newClient = mapRowToClient(db.prepare('SELECT * FROM clients WHERE id = ?').get(newId) as DbClient);
    
    return NextResponse.json(newClient);
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}