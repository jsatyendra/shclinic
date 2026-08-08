import { getDbConnection } from "../db/connection";
import { Medication, LabInvestigation, Document } from "../types";

/** Database row shape for the clients table */
export interface DbClient {
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
  phoneNumber: string;
  startDate?: string;
  followUpDate?: string;
  notes?: string;
  status?: string;
  isAcute: number;
}

/** Converts a raw database client row into a fully-populated Client object */
export function mapRowToClient(client: DbClient) {
  const db = getDbConnection();

  const healthInfoRows = db
    .prepare("SELECT key, value FROM health_info WHERE client_id = ?")
    .all(client.id) as { key: string; value: string }[];

  const healthInfo: Record<string, string> = {};
  for (const row of healthInfoRows) {
    healthInfo[row.key] = row.value;
  }

  const medications = db
    .prepare(
      "SELECT id, name, dosage, duration, prescribedDate FROM medications WHERE client_id = ?"
    )
    .all(client.id) as Medication[];

  let labInvestigations: LabInvestigation[] = [];
  try {
    labInvestigations = db
      .prepare(
        "SELECT id, testName, testDate, results, notes FROM lab_investigations WHERE client_id = ?"
      )
      .all(client.id) as LabInvestigation[];
  } catch {
    // table may not exist in older databases
  }

  let documents: Document[] = [];
  try {
    documents = db
      .prepare(
        "SELECT id, fileName, originalName, fileType, fileSize, uploadDate, description, category FROM documents WHERE client_id = ?"
      )
      .all(client.id) as Document[];
  } catch {
    // table may not exist in older databases
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
    startDate: client.startDate || "",
    followUpDate: client.followUpDate || "",
    notes: client.notes || "",
    status: client.status || "Open",
    isAcute: Boolean(client.isAcute),
    healthInfo,
    medications,
    labInvestigations,
    documents,
  };
}
