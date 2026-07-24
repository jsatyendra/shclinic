import { NextResponse } from "next/server";
import { getDbConnection } from "../../../db/connection";
import { randomBytes } from "crypto";
import { clientCreateSchema } from "../../../lib/validation";
import { DbClient, mapRowToClient } from "../../../lib/clientDb";

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
    const body = await request.json();

    // Validate input
    const parsed = clientCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const client = parsed.data;
    const db = getDbConnection();
    const newId = generateId();
    const clientNumber = generateClientNumber(db);

    // Wrap all inserts in a single transaction for atomicity
    const createClient = db.transaction(() => {
      // Insert into clients table
      db.prepare(`
        INSERT INTO clients (id, client_number, name, age, gender, height, weight, bloodPressure, bloodGlucose, address, phoneNumber, startDate, followUpDate, status, isAcute)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        client.phoneNumber || '',
        client.startDate || '',
        client.followUpDate || '',
        client.status || 'Open',
        client.isAcute ? 1 : 0
      );

      // Insert health info
      if (client.healthInfo) {
        const insertHealthInfo = db.prepare(
          'INSERT INTO health_info (client_id, key, value) VALUES (?, ?, ?)'
        );
        for (const [key, value] of Object.entries(client.healthInfo)) {
          insertHealthInfo.run(newId, key, value);
        }
      }

      // Insert medications
      if (client.medications && client.medications.length > 0) {
        const insertMedication = db.prepare(`
          INSERT INTO medications (id, client_id, name, dosage, duration, prescribedDate)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const medication of client.medications) {
          insertMedication.run(
            generateId(),
            newId,
            medication.name,
            medication.dosage,
            medication.duration || '',
            medication.prescribedDate || new Date().toISOString().split('T')[0]
          );
        }
      }

      // Insert lab investigations
      if (client.labInvestigations && client.labInvestigations.length > 0) {
        const insertLabInvestigation = db.prepare(`
          INSERT INTO lab_investigations (id, client_id, testName, testDate, results, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const lab of client.labInvestigations) {
          insertLabInvestigation.run(
            generateId(),
            newId,
            lab.testName,
            lab.testDate,
            lab.results,
            lab.notes || ''
          );
        }
      }
    });

    createClient();
    
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