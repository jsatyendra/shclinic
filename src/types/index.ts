export interface Client {
    id: string;
    client_number: string;  // Format: SHC-0001, SHC-0002, etc.
    name: string;
    age: string;
    gender: 'Male' | 'Female' | 'Other';
    height: string; // in cm
    weight: string; // in kg
    bloodPressure?: string;
    bloodGlucose?: string;
    address: string;
    phoneNumber: string;
    startDate?: string; // Case start date
    followUpDate?: string; // Follow-up appointment date
    notes?: string; // Case notes
    status: 'Open' | 'Closed' | 'Discontinued'; // Case status
    isAcute: boolean; // Flag to indicate if this is an acute case
    healthInfo: {
      [key: string]: string; // Symptoms as key-value pairs
    };
    medications: Medication[];
    labInvestigations?: LabInvestigation[];
    documents?: Document[];
  }
  
  export interface Medication {
    id: string;
    name: string;
    dosage: string;
    duration: string;
    prescribedDate: string;
  }
  
  export interface LabInvestigation {
    id: string;
    testName: string;
    testDate: string;
    results: string;
    notes?: string;
  }
  
  export interface Document {
    id: string;
    fileName: string;
    originalName: string;
    fileType: string;
    fileSize: number;
    uploadDate: string;
    description?: string;
    category: 'Report' | 'Prescription' | 'Image' | 'Other';
  }
  
  export interface User {
    id: string;
    username: string;
    password: string;
    name: string;
  }

  // Template interfaces for case taking forms
  export interface CaseTakingSectionField {
    [key: string]: string | Record<string, string>;
  }

  export interface CaseTakingTemplate {
    "Case Taking": Record<string, string | Record<string, string>>;
  }

  export interface AcuteCaseTakingTemplate {
    "Acute Case Taking": Record<string, string | Record<string, string>>;
  }

  export type TemplateType = CaseTakingTemplate | AcuteCaseTakingTemplate;