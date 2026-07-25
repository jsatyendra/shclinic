import { Client, Medication, LabInvestigation, Document } from "../types";

// API service for client data
export const clientApi = {
  // Get all clients
  async getClients(): Promise<Client[]> {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      return [];
    }
  },
  // Get a client by ID
  async getClientById(id: string): Promise<Client | null> {
    try {
      console.log(`Fetching client with ID: ${id}`);
      const response = await fetch(`/api/clients/${id}`);
      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log("Client not found (404)");
          return null;
        }
        const errorText = await response.text();
        console.error(`Error response: ${errorText}`);
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Client data successfully fetched");
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to fetch client ${id}:`, errorMessage);
      throw error; // Re-throw to allow the component to handle it
    }
  },

  // Add a new client
  async addClient(client: Omit<Client, 'id'>): Promise<Client | null> {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(client),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to add client:', error);
      return null;
    }
  },
  // Update an existing client
  async updateClient(id: string, updatedClient: Partial<Client>): Promise<Client | null> {
    try {
      console.log('Sending update to API:', id, updatedClient);
      
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedClient),
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        let message = `Failed to update client (HTTP ${response.status})`;

        if (contentType.includes('application/json')) {
          const errorJson = await response.json() as {
            error?: string;
            details?: Record<string, string[] | undefined>;
          };
          const detailMessages = errorJson.details
            ? Object.values(errorJson.details)
                .flat()
                .filter((value): value is string => Boolean(value && value.trim()))
            : [];

          if (detailMessages.length > 0) {
            message = detailMessages[0];
          } else if (errorJson.error) {
            message = errorJson.error;
          }
        } else {
          const errorText = await response.text();
          if (errorText.trim()) {
            message = errorText;
          }
        }

        console.error('API update error:', message);
        throw new Error(message);
      }
      
      const result = await response.json();
      console.log('Update response:', result);
      return result;
    } catch (error) {
      console.error(`Failed to update client ${id}:`, error);
      throw error;
    }
  },

  // Delete a client
  async deleteClient(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });
      
      return response.ok;
    } catch (error) {
      console.error(`Failed to delete client ${id}:`, error);
      return false;
    }
  },
  // Add medication to a client
  async addMedication(clientId: string, medication: Omit<Medication, 'id'>): Promise<Client | null> {
    try {
      // First get the current client
      const client = await this.getClientById(clientId);
      if (!client) return null;
      
      // Add the new medication to the client's medications
      const newMedication = {
        ...medication,
        id: Math.random().toString(36).substring(2, 9),
        prescribedDate: medication.prescribedDate || new Date().toISOString().split('T')[0],
      };
      
      const updatedClient = {
        medications: [...(client.medications || []), newMedication],
      };
      
      // Update the client with the new data
      return await this.updateClient(clientId, updatedClient);
    } catch (error) {
      console.error(`Failed to add medication to client ${clientId}:`, error);
      return null;
    }
  },

  // Add lab investigation to a client
  async addLabInvestigation(clientId: string, labInvestigation: Omit<LabInvestigation, 'id'>): Promise<Client | null> {
    try {
      // First get the current client
      const client = await this.getClientById(clientId);
      if (!client) return null;
      
      // Add the new lab investigation to the client's lab investigations
      const newLabInvestigation = {
        ...labInvestigation,
        id: Math.random().toString(36).substring(2, 9),
        testDate: labInvestigation.testDate || new Date().toISOString().split('T')[0],
      };
      
      const updatedClient = {
        labInvestigations: [...(client.labInvestigations || []), newLabInvestigation],
      };
      
      // Update the client with the new data
      return await this.updateClient(clientId, updatedClient);
    } catch (error) {
      console.error(`Failed to add lab investigation to client ${clientId}:`, error);
      return null;
    }
  },

  // Upload a document for a client
  async uploadDocument(clientId: string, file: File, description?: string, category?: string): Promise<any | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (description) formData.append('description', description);
      if (category) formData.append('category', category);

      const response = await fetch(`/api/clients/${clientId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to upload document for client ${clientId}:`, error);
      return null;
    }
  },

  // Delete a document
  async deleteDocument(clientId: string, documentId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/clients/${clientId}/documents?documentId=${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error(`Failed to delete document ${documentId}:`, error);
      return false;
    }
  },

  // Get download URL for a document
  getDocumentDownloadUrl(clientId: string, documentId: string): string {
    return `/api/clients/${clientId}/documents/${documentId}`;
  },
};