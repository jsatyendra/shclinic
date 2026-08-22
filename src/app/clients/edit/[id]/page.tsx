"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ClientForm, {
  ClientFormValues,
  formatDateForInput,
  normalizePhoneNumberInput,
} from "../../../../components/ClientForm";
import PDFExport from "../../../../components/PDFExport";
import { useToast } from "../../../../components/Toast";
import { clientApi } from "../../../../lib/clientApi";
import { Client } from "../../../../types";

interface EditClientPageProps {
  params: Promise<{ id: string }>;
}

const valuesFromClient = (client: Client): ClientFormValues => ({
  name: client.name || "",
  age: client.age || "",
  gender: client.gender,
  height: client.height || "",
  weight: client.weight || "",
  bloodPressure: client.bloodPressure || "",
  bloodGlucose: client.bloodGlucose || "",
  address: client.address || "",
  phoneNumber: normalizePhoneNumberInput(String(client.phoneNumber || "")),
  startDate: client.startDate || formatDateForInput(new Date()),
  followUpDate: client.followUpDate || "",
  notes: client.notes || "",
  followUpFrequency: "custom",
  isAcute: Boolean(client.isAcute),
  healthInfo: { ...(client.healthInfo || {}) },
  medications: [...(client.medications || [])],
  labInvestigations: [...(client.labInvestigations || [])],
});

export default function EditClientPage({ params }: EditClientPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [formValues, setFormValues] = useState<ClientFormValues | null>(null);
  const [clientStatus, setClientStatus] = useState<Client["status"]>("Open");
  const [currentStatus, setCurrentStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentDescription, setDocumentDescription] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Other");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;
    void clientApi
      .getClientById(id)
      .then((loadedClient) => {
        if (!loadedClient) {
          setError("Client not found");
          return;
        }
        setClient(loadedClient);
        setClientStatus(loadedClient.status || "Open");
        setFormValues(valuesFromClient(loadedClient));
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load client",
        );
      })
      .finally(() => setIsLoading(false));
  }, [id, router, status]);

  const handleSubmit = async (values: ClientFormValues) => {
    if (!client) return;
    const updatedHealthInfo = { ...values.healthInfo };
    if (currentStatus.trim()) {
      updatedHealthInfo[`currentStatus_${new Date().toISOString()}`] =
        currentStatus.trim();
    }
    try {
      const updatedClient = await clientApi.updateClient(client.id, {
        ...values,
        healthInfo: updatedHealthInfo,
        status: clientStatus,
      });
      if (updatedClient) {
        setClient(updatedClient);
        setFormValues(valuesFromClient(updatedClient));
        showToast("Client updated successfully.", "success");
        router.push("/dashboard");
      }
    } catch (updateError) {
      showToast(
        updateError instanceof Error
          ? updateError.message
          : "Save failed. Please try again.",
        "error",
      );
    }
  };

  const handleStatusToggle = async () => {
    if (!client) return;
    const nextStatus =
      clientStatus === "Open"
        ? window.confirm(
            "Change case status to:\n\nOK = Closed\nCancel = Discontinued",
          )
          ? "Closed"
          : "Discontinued"
        : "Open";
    try {
      const updatedClient = await clientApi.updateClient(client.id, {
        status: nextStatus,
      });
      if (updatedClient) {
        setClient(updatedClient);
        setClientStatus(nextStatus);
        setFormValues(valuesFromClient(updatedClient));
      }
    } catch {
      showToast("Failed to update case status.", "error");
    }
  };

  const refreshClient = async () => {
    if (!client) return;
    const refreshedClient = await clientApi.getClientById(client.id);
    if (refreshedClient) {
      setClient(refreshedClient);
      setFormValues(valuesFromClient(refreshedClient));
    }
  };

  const handleAddDocument = async () => {
    if (!client || !selectedFile) return;
    const uploaded = await clientApi.uploadDocument(
      client.id,
      selectedFile,
      documentDescription,
      documentCategory,
    );
    if (uploaded) {
      setSelectedFile(null);
      setDocumentDescription("");
      await refreshClient();
      showToast("Document uploaded.", "success");
    }
  };

  const documentsSection = (
    <section className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-medium text-gray-900">Documents</h2>
      <div className="space-y-3">
        {(client?.documents || []).map((document) => (
          <div
            key={document.id}
            className="flex items-center justify-between rounded-md border bg-gray-50 p-3"
          >
            <div>
              <p className="font-medium">{document.originalName}</p>
              <p className="text-xs text-gray-500">{document.category}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button
                type="button"
                onClick={() => {
                  if (!client) return;
                  window.open(
                    clientApi.getDocumentDownloadUrl(client.id, document.id),
                    "_blank",
                  );
                }}
                className="text-blue-600"
              >
                View
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!client) return;
                  if (window.confirm("Delete this document?")) {
                    await clientApi.deleteDocument(client.id, document.id);
                    await refreshClient();
                  }
                }}
                className="text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
        />
        <input
          value={documentDescription}
          onChange={(event) => setDocumentDescription(event.target.value)}
          placeholder="Document description"
          className="block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <select
          value={documentCategory}
          onChange={(event) => setDocumentCategory(event.target.value)}
          className="block rounded-md border border-gray-300 px-3 py-2"
        >
          <option>Other</option>
          <option>Report</option>
          <option>Prescription</option>
          <option>Image</option>
        </select>
        <button
          type="button"
          disabled={!selectedFile}
          onClick={handleAddDocument}
          className="rounded-md bg-blue-600 px-3 py-2 text-white disabled:bg-gray-400"
        >
          Upload PDF
        </button>
      </div>
    </section>
  );

  const currentStatusSection = (
    <section className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-medium text-gray-900">Current Status</h2>
      <textarea
        value={currentStatus}
        onChange={(event) => setCurrentStatus(event.target.value)}
        rows={3}
        placeholder="Enter current health status and observations..."
        className="block w-full rounded-md border border-gray-300 px-3 py-2"
      />
    </section>
  );

  const healthHistorySection = (
    <section className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-medium text-gray-900">Health History</h2>
      <div className="space-y-4">
        {Object.entries(client?.healthInfo || {}).map(([key, value]) => {
          if (!value || key === "currentStatus") return null;

          if (key.startsWith("currentStatus_")) {
            const timestamp = key.replace("currentStatus_", "");
            return (
              <div key={key} className="border-b pb-2 last:border-0">
                <h3 className="text-sm font-medium text-blue-600">
                  Status Update: {new Date(timestamp).toLocaleString()}
                </h3>
                <p className="whitespace-pre-line text-sm">{value}</p>
              </div>
            );
          }

          if (key.startsWith("healthHistory_")) {
            const timestamp = key.replace("healthHistory_", "");
            let historyData: Record<string, string>;
            try {
              historyData = JSON.parse(value) as Record<string, string>;
            } catch {
              historyData = { Details: value };
            }
            return (
              <div key={key} className="border-b pb-2 last:border-0">
                <h3 className="text-sm font-medium text-blue-600">
                  Health History: {new Date(timestamp).toLocaleString()}
                </h3>
                <div className="mt-2 space-y-2 pl-4">
                  {Object.entries(historyData).map(([fieldKey, fieldValue]) => (
                    <p key={fieldKey} className="text-sm">
                      <span className="font-medium">
                        {fieldKey
                          .split(".")
                          .map(
                            (part) =>
                              part.charAt(0).toUpperCase() + part.slice(1),
                          )
                          .join(" - ")}
                        :{" "}
                      </span>
                      {fieldValue}
                    </p>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="border-b pb-2 last:border-0">
              <h3 className="text-sm font-medium text-gray-700">
                {key
                  .split(".")
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(" - ")}
              </h3>
              <p className="text-sm">{value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );

  if (status === "loading" || isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  if (error || !client || !formValues)
    return (
      <div className="flex h-screen items-center justify-center text-red-600">
        {error || "Error loading client"}
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {client.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {client.client_number} | {clientStatus}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleStatusToggle}
              className="rounded-md bg-orange-600 px-3 py-2 text-sm text-white"
            >
              {clientStatus === "Open" ? "Close Case" : "Reopen Case"}
            </button>
            <PDFExport client={client} />
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <ClientForm
          initialValues={formValues}
          onSubmit={handleSubmit}
          leftColumnFooter={
            <>
              {healthHistorySection}
              {currentStatusSection}
            </>
          }
          rightColumnFooter={documentsSection}
          submitLabel="Save Changes"
          statusText="Edit the saved client information and save your changes."
        />
      </main>
    </div>
  );
}
