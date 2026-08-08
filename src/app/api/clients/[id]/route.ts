import { NextResponse } from "next/server";
import { getDbConnection } from "../../../../db/connection";
import { clientUpdateSchema } from "../../../../lib/validation";
import { DbClient, mapRowToClient } from "../../../../lib/clientDb";
import { randomBytes } from "crypto";

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
    const body = await request.json();

    // Validate input
    const parsed = clientUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const updatedClient = parsed.data;
    const db = getDbConnection();
    
    // Check if client exists
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as DbClient | undefined;
    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Wrap all mutations in a single transaction for atomicity
    const updateClientTx = db.transaction(() => {
      // Update client basic info
      const updates: string[] = [];
      const queryParams: Array<string | number> = [];
      
      if (updatedClient.name !== undefined) { updates.push('name = ?'); queryParams.push(updatedClient.name); }
      if (updatedClient.age !== undefined) { updates.push('age = ?'); queryParams.push(updatedClient.age); }
      if (updatedClient.gender !== undefined) { updates.push('gender = ?'); queryParams.push(updatedClient.gender); }
      if (updatedClient.height !== undefined) { updates.push('height = ?'); queryParams.push(updatedClient.height); }
      if (updatedClient.weight !== undefined) { updates.push('weight = ?'); queryParams.push(updatedClient.weight); }
      if (updatedClient.address !== undefined) { updates.push('address = ?'); queryParams.push(updatedClient.address); }
      if (updatedClient.phoneNumber !== undefined) { updates.push('phoneNumber = ?'); queryParams.push(updatedClient.phoneNumber); }
      if (updatedClient.startDate !== undefined) { updates.push('startDate = ?'); queryParams.push(updatedClient.startDate); }
      if (updatedClient.followUpDate !== undefined) { updates.push('followUpDate = ?'); queryParams.push(updatedClient.followUpDate); }
      if (updatedClient.notes !== undefined) { updates.push('notes = ?'); queryParams.push(updatedClient.notes); }
      if (updatedClient.status !== undefined) { updates.push('status = ?'); queryParams.push(updatedClient.status); }
      if (updatedClient.bloodPressure !== undefined) { updates.push('bloodPressure = ?'); queryParams.push(updatedClient.bloodPressure); }
      if (updatedClient.bloodGlucose !== undefined) { updates.push('bloodGlucose = ?'); queryParams.push(updatedClient.bloodGlucose); }
      if (updatedClient.isAcute !== undefined) { updates.push('isAcute = ?'); queryParams.push(updatedClient.isAcute ? 1 : 0); }
      
      if (updates.length > 0) {
        const sql = `UPDATE clients SET ${updates.join(', ')} WHERE id = ?`;
        queryParams.push(id);
        db.prepare(sql).run(...queryParams);
      }
      
      // Update health info if provided
      if (updatedClient.healthInfo) {
        db.prepare('DELETE FROM health_info WHERE client_id = ?').run(id);
        const insertHealthInfo = db.prepare(
          'INSERT INTO health_info (client_id, key, value) VALUES (?, ?, ?)'
        );
        for (const [key, value] of Object.entries(updatedClient.healthInfo)) {
          insertHealthInfo.run(id, key, value);
        }
      }
      
      // Update medications if provided
      if (updatedClient.medications) {
        db.prepare('DELETE FROM medications WHERE client_id = ?').run(id);
        if (updatedClient.medications.length > 0) {
          const insertMedication = db.prepare(`
            INSERT INTO medications (id, client_id, name, dosage, duration, prescribedDate)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          for (const medication of updatedClient.medications) {
            insertMedication.run(
              medication.id || randomBytes(4).toString('hex'),
              id,
              medication.name,
              medication.dosage,
              medication.duration || '',
              medication.prescribedDate
            );
          }
        }
      }
      
      // Update lab investigations if provided
      if (updatedClient.labInvestigations) {
        db.prepare('DELETE FROM lab_investigations WHERE client_id = ?').run(id);
        if (updatedClient.labInvestigations.length > 0) {
          const insertLabInvestigation = db.prepare(`
            INSERT INTO lab_investigations (id, client_id, testName, testDate, results, notes)
            VALUES (?, ?, ?, ?, ?, ?)
          `);
          for (const lab of updatedClient.labInvestigations) {
            insertLabInvestigation.run(
              lab.id || randomBytes(4).toString('hex'),
              id,
              lab.testName,
              lab.testDate,
              lab.results,
              lab.notes || ''
            );
          }
        }
      }
    });

    updateClientTx();
    
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