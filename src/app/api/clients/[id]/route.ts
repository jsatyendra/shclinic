import { NextResponse } from "next/server";
import { getDbConnection } from "../../../../db/connection";
import { Medication, LabInvestigation } from "../../../../types";

// Define a DbClient type to represent database client row
interface DbClient {
  id: string;
  client_number: string;
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  bloodPressure: string;
  bloodGlucose: string;
  address: string;
  phoneNumber: number;
  followUpDate?: string;
  status?: string;
  isAcute: number;
}

// Helper to convert database row to client object
function mapRowToClient(client: DbClient) {
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
  let labInvestigations: LabInvestigation[] = [];
  try {
    labInvestigations = db.prepare(
      'SELECT id, testName, testDate, results, notes FROM lab_investigations WHERE client_id = ?'
    ).all(client.id) as LabInvestigation[];
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
    bloodPressure: client.bloodPressure,
    bloodGlucose: client.bloodGlucose,
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

// GET endpoint to retrieve a specific client
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDbConnection();
    
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as DbClient | undefined;
    
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(mapRowToClient(client));
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a specific client
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const updatedClient = await request.json();
    const db = getDbConnection();
    
    // Check if client exists
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as DbClient | undefined;
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }
    
    // Update client basic info
    const updates: string[] = [];
    const queryParams: Array<string | number> = [];
    
    if (updatedClient.name !== undefined) {
      updates.push('name = ?');
      queryParams.push(updatedClient.name);
    }
    
    if (updatedClient.age !== undefined) {
      updates.push('age = ?');
      queryParams.push(updatedClient.age);
    }
    
    if (updatedClient.gender !== undefined) {
      updates.push('gender = ?');
      queryParams.push(updatedClient.gender);
    }
    
    if (updatedClient.height !== undefined) {
      updates.push('height = ?');
      queryParams.push(updatedClient.height);
    }
    
    if (updatedClient.weight !== undefined) {
      updates.push('weight = ?');
      queryParams.push(updatedClient.weight);
    }
    
    if (updatedClient.address !== undefined) {
      updates.push('address = ?');
      queryParams.push(updatedClient.address);
    }
    
    if (updatedClient.phoneNumber !== undefined) {
      updates.push('phoneNumber = ?');
      queryParams.push(updatedClient.phoneNumber);
    }
    
    if (updatedClient.followUpDate !== undefined) {
      updates.push('followUpDate = ?');
      queryParams.push(updatedClient.followUpDate);
    }
    
    if (updatedClient.status !== undefined) {
      updates.push('status = ?');
      queryParams.push(updatedClient.status);
    }
    
    if (updatedClient.bloodPressure !== undefined) {
      updates.push('bloodPressure = ?');
      queryParams.push(updatedClient.bloodPressure);
    }
    
    if (updatedClient.bloodGlucose !== undefined) {
      updates.push('bloodGlucose = ?');
      queryParams.push(updatedClient.bloodGlucose);
    }
    
    if (updatedClient.isAcute !== undefined) {
      updates.push('isAcute = ?');
      queryParams.push(updatedClient.isAcute ? 1 : 0);
    }
    
    if (updates.length > 0) {
      const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
      queryParams.push(id);
      db.prepare(sql).run(...queryParams);
    }
    
    // Update health info if provided
    if (updatedClient.healthInfo) {
      // Delete existing health info
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
      // Replace medications
      db.prepare('DELETE FROM medications WHERE client_id = ?').run(id);
      
      if (updatedClient.medications.length > 0) {
        const insertMedication = db.prepare(`
          INSERT INTO medications (id, client_id, name, dosage, duration, prescribedDate)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        updatedClient.medications.forEach((medication: Medication) => {
          insertMedication.run(
            medication.id,
            id,
            medication.name,
            medication.dosage,
            medication.duration || '',
            medication.prescribedDate
          );
        });      }
    }
    
    // Update lab investigations if provided
    if (updatedClient.labInvestigations) {
      // Replace lab investigations
      db.prepare('DELETE FROM lab_investigations WHERE client_id = ?').run(id);
      
      if (updatedClient.labInvestigations.length > 0) {
        const insertLabInvestigation = db.prepare(`
          INSERT INTO lab_investigations (id, client_id, testName, testDate, results, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        updatedClient.labInvestigations.forEach((lab: LabInvestigation) => {
          insertLabInvestigation.run(
            lab.id,
            id,
            lab.testName,
            lab.testDate,
            lab.results,
            lab.notes || ''
          );
        });
      }
    }
    
    // Return updated client
    const updatedData = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as DbClient;
    return NextResponse.json(mapRowToClient(updatedData));
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a specific client
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDbConnection();
    
    // Check if client exists
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as DbClient | undefined;
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }
    
    // Delete client (cascades to health_info and medications due to foreign keys)
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}