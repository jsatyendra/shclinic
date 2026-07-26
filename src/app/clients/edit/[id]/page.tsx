"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { clientApi } from "../../../../lib/clientApi";
import {
  Client,
  Medication,
  LabInvestigation,
  CaseTakingTemplate,
  AcuteCaseTakingTemplate,
} from "../../../../types";
import caseTakingTemplate from "../../../../case_taking.json";
import acuteCaseTakingTemplate from "../../../../acute_case_taking.json";
import PDFExport from "../../../../components/PDFExport";
import { useToast } from "../../../../components/Toast";

// Define a proper type for template data
interface TemplateValue {
  [key: string]: string | Record<string, string>;
}

interface TemplateSection {
  [key: string]: TemplateValue;
}

interface EditClientPageProps {
  params: Promise<{
    id: string;
  }>;
}

const PHONE_10_DIGIT_REGEX = /^\d{10}$/;

const normalizePhoneNumberInput = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 10);

export default function EditClientPage({ params }: EditClientPageProps) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [client, setClient] = useState<Client | null>(null);
  const [isAcute, setIsAcute] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    age: "",
    gender: "Male" as "Male" | "Female" | "Other",
    height: "",
    weight: "",
    bloodPressure: "",
    bloodGlucose: "",
    address: "",
    phoneNumber: "",
    followUpDate: "",
  });
  const [clientStatus, setClientStatus] = useState<
    "Open" | "Closed" | "Discontinued"
  >("Open"); // Separate status state
  const [healthInfo, setHealthInfo] = useState<Record<string, string>>({});
  const [currentStatus, setCurrentStatus] = useState(""); // New state for current status
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMedication, setNewMedication] = useState({
    name: "",
    dosage: "",
    duration: "",
  });
  const [newLabInvestigation, setNewLabInvestigation] = useState({
    testName: "",
    testDate: new Date().toISOString().split("T")[0],
    results: "",
    notes: "",
  });

  // State for toggling add medication and add investigation forms
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showAddInvestigation, setShowAddInvestigation] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [formErrors, setFormErrors] = useState<{ phoneNumber?: string }>({});

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentDescription, setDocumentDescription] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Other");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    async function loadClient() {
      try {
        setIsLoading(true);
        console.log("Loading client with ID:", id);
        const clientData = await clientApi.getClientById(id);
        console.log("Client data received:", clientData);
        if (clientData) {
          setClient(clientData);
          setIsAcute(clientData.isAcute || false);
          setPersonalInfo({
            age: clientData.age || "",
            gender: clientData.gender,
            height: clientData.height,
            weight: clientData.weight,
            bloodPressure: clientData.bloodPressure || "",
            bloodGlucose: clientData.bloodGlucose || "",
            address: clientData.address,
            phoneNumber: normalizePhoneNumberInput(
              String(clientData.phoneNumber || ""),
            ),
            followUpDate: clientData.followUpDate || "",
          });
          setClientStatus(clientData.status || "Open"); // Set client status separately
          setHealthInfo(clientData.healthInfo || {});
        } else {
          setError("Client not found");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Error loading client data:", errorMessage);
        setError(`Error loading client data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated") {
      loadClient();
    }
  }, [id, status, router]);
  useEffect(() => {
    if (!client) return;

    const template = isAcute
      ? (acuteCaseTakingTemplate as AcuteCaseTakingTemplate)
      : (caseTakingTemplate as CaseTakingTemplate);

    const templateData = isAcute
      ? (template as AcuteCaseTakingTemplate)["Acute Case Taking"]
      : (template as CaseTakingTemplate)["Case Taking"];

    setHealthInfo((prev) => {
      const baseHealthInfo =
        Object.keys(prev).length > 0 ? prev : (client.healthInfo ?? {});
      const updatedHealthInfo: Record<string, string> = { ...baseHealthInfo };

      const populateFields = (
        obj: Record<string, TemplateValue>,
        prefix = "",
      ) => {
        Object.entries(obj).forEach(([key, value]) => {
          const fieldName = prefix ? `${prefix}.${key}` : key;
          if (value !== null && typeof value === "object") {
            populateFields(value as Record<string, TemplateValue>, fieldName);
          } else if (
            !Object.prototype.hasOwnProperty.call(updatedHealthInfo, fieldName)
          ) {
            updatedHealthInfo[fieldName] = "";
          }
        });
      };

      if (templateData) {
        populateFields(
          templateData as unknown as Record<string, TemplateValue>,
        );
      }

      if (JSON.stringify(updatedHealthInfo) === JSON.stringify(prev)) {
        return prev;
      }

      return updatedHealthInfo;
    });
  }, [isAcute, client]);

  // Debug the state to help identify issues
  useEffect(() => {
    if (client) {
      console.log("Current client state:", {
        client,
        personalInfo,
        healthInfo,
        isAcute,
      });
    }
  }, [client, personalInfo, healthInfo, isAcute]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl text-red-600">
          {error || "Error loading client"}
        </div>
      </div>
    );
  }
  const handlePersonalInfoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const nextValue =
      name === "phoneNumber" ? normalizePhoneNumberInput(value) : value;

    // Validate follow-up date to ensure it's in the future
    if (name === "followUpDate" && value) {
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to compare only dates

      if (selectedDate <= today) {
        showToast("Follow-up date must be in the future.", "warning");
        return; // Don't update the state if validation fails
      }
    }

    // Reset status to "Open" when editing a closed or discontinued case
    if (clientStatus === "Closed" || clientStatus === "Discontinued") {
      setClientStatus("Open");
    }

    if (name === "phoneNumber" && PHONE_10_DIGIT_REGEX.test(value.trim())) {
      setFormErrors((prev) => ({ ...prev, phoneNumber: undefined }));
    }

    setPersonalInfo((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleHealthInfoChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setHealthInfo((prev) => ({ ...prev, [name]: value }));
  };
  const handleMedicationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewMedication((prev) => ({ ...prev, [name]: value }));
  };
  const handleLabInvestigationChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setNewLabInvestigation((prev) => ({ ...prev, [name]: value }));
  };

  const handleCurrentStatusChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setCurrentStatus(e.target.value);
  };

  const handleStatusToggle = async () => {
    let newStatus: "Open" | "Closed" | "Discontinued";

    if (clientStatus === "Open") {
      // Show options to change to Closed or Discontinued
      const choice = window.confirm(
        "Change case status to:\n\nOK = Closed\nCancel = Discontinued",
      );
      newStatus = choice ? "Closed" : "Discontinued";
    } else {
      // Change back to Open
      newStatus = "Open";
    }

    try {
      const result = await clientApi.updateClient(client.id, {
        status: newStatus,
      });

      if (result) {
        setClientStatus(newStatus);
        // Update the local client state
        setClient((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (error) {
      console.error("Failed to update case status:", error);
      showToast("Failed to update case status. Please try again.", "error");
    }
  };

  const toggleAcuteCase = () => {
    setIsAcute(!isAcute);
  };
  const handleAddMedication = async () => {
    if (!newMedication.name || !newMedication.dosage) {
      return;
    }

    const medication = {
      ...newMedication,
      prescribedDate: new Date().toISOString().split("T")[0],
    };

    try {
      const updatedClient = await clientApi.addMedication(
        client.id,
        medication,
      );
      if (updatedClient) {
        setClient(updatedClient);
        setNewMedication({ name: "", dosage: "", duration: "" });
        setShowAddMedication(false); // Hide the form after successful submission
      } else {
        showToast("Failed to add medication. Please try again.", "error");
      }
    } catch (err) {
      console.error("Failed to add medication:", err);
      const errorMessage =
        err instanceof Error && err.message.trim()
          ? err.message
          : "Failed to add medication. Please try again.";
      showToast(errorMessage, "error");
    }
  };

  const handleAddLabInvestigation = async () => {
    if (!newLabInvestigation.testName || !newLabInvestigation.testDate) {
      return;
    }

    try {
      const labInvestigation = {
        ...newLabInvestigation,
        testDate:
          newLabInvestigation.testDate ||
          new Date().toISOString().split("T")[0],
      };

      const updatedClient = await clientApi.addLabInvestigation(
        client.id,
        labInvestigation,
      );

      if (updatedClient) {
        setClient(updatedClient);
        setNewLabInvestigation({
          testName: "",
          testDate: new Date().toISOString().split("T")[0],
          results: "",
          notes: "",
        });
        setShowAddInvestigation(false); // Hide the form after successful submission
      } else {
        showToast(
          "Failed to add lab investigation. Please try again.",
          "error",
        );
      }
    } catch (err) {
      console.error("Failed to add lab investigation:", err);
      const errorMessage =
        err instanceof Error && err.message.trim()
          ? err.message
          : "Failed to add lab investigation. Please try again.";
      showToast(errorMessage, "error");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file && file.type !== "application/pdf") {
      showToast("Only PDF files are allowed.", "warning");
      e.target.value = ""; // Clear the input
      setSelectedFile(null);
      return;
    }

    // Check file size (10MB limit)
    if (file && file.size > 10 * 1024 * 1024) {
      showToast("File size must be less than 10MB.", "warning");
      e.target.value = ""; // Clear the input
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file || null);
  };

  const handleAddDocument = async () => {
    if (!selectedFile) {
      showToast("Please select a file to upload.", "warning");
      return;
    }

    try {
      const uploadedDocument = await clientApi.uploadDocument(
        client.id,
        selectedFile,
        documentDescription,
        documentCategory,
      );

      if (uploadedDocument) {
        // Refresh client data to get updated documents
        const updatedClient = await clientApi.getClientById(client.id);
        if (updatedClient) {
          setClient(updatedClient);
        }

        // Reset form
        setSelectedFile(null);
        setDocumentDescription("");
        setDocumentCategory("Other");
        setShowAddDocument(false);

        // Reset file input
        const fileInput = document.getElementById(
          "documentFile",
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    } catch (err) {
      console.error("Failed to upload document:", err);
      showToast("Failed to upload document. Please try again.", "error");
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const success = await clientApi.deleteDocument(client.id, documentId);
      if (success) {
        // Refresh client data
        const updatedClient = await clientApi.getClientById(client.id);
        if (updatedClient) {
          setClient(updatedClient);
        }
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      showToast("Failed to delete document. Please try again.", "error");
    }
  };

  const handleViewDocument = (documentId: string) => {
    const viewUrl = clientApi.getDocumentDownloadUrl(client.id, documentId);
    window.open(viewUrl, "_blank");
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!client) return;

    const normalizedPhoneNumber = String(personalInfo.phoneNumber || "").trim();

    if (!normalizedPhoneNumber) {
      setFormErrors({ phoneNumber: "Phone number is required" });
      showToast("Phone number is required before saving.", "warning");
      return;
    }

    if (!PHONE_10_DIGIT_REGEX.test(normalizedPhoneNumber)) {
      setFormErrors({
        phoneNumber: "Phone number must be exactly 10 digits",
      });
      showToast("Phone number must be exactly 10 digits.", "warning");
      return;
    }

    setFormErrors({});

    try {
      // Create a timestamp for this update
      const currentTimestamp = new Date().toISOString();

      // Create a history entry for any health info changes
      const historyEntry: { [key: string]: string } = {};

      // Collect all non-empty health info values that have changed
      Object.entries(healthInfo).forEach(([key, value]) => {
        if (value && value.trim() && value !== client?.healthInfo[key]) {
          // Store the field in the combined history entry
          historyEntry[key] = value;
        }
      });

      // Start with existing health info and add any changes
      const updatedHealthInfo = { ...healthInfo };

      // Add current status with timestamp if it's not empty
      if (currentStatus.trim()) {
        updatedHealthInfo[`currentStatus_${currentTimestamp}`] = currentStatus;
      }

      // If we have any changed health info, create a timestamped history entry
      if (Object.keys(historyEntry).length > 0) {
        updatedHealthInfo[`healthHistory_${currentTimestamp}`] =
          JSON.stringify(historyEntry);
      }

      // Create a deep copy of the current client to avoid state mutation issues
      const updatedClient: Partial<Client> = {
        age: personalInfo.age,
        gender: personalInfo.gender,
        height: personalInfo.height,
        weight: personalInfo.weight,
        bloodPressure: personalInfo.bloodPressure,
        bloodGlucose: personalInfo.bloodGlucose,
        address: personalInfo.address,
        phoneNumber: normalizedPhoneNumber,
        followUpDate: personalInfo.followUpDate,
        status: clientStatus, // Use clientStatus instead of personalInfo.status
        isAcute: isAcute,
        healthInfo: updatedHealthInfo,
      };

      console.log("Submitting updated client:", updatedClient);

      const result = await clientApi.updateClient(client.id, updatedClient);
      if (result) {
        console.log("Client updated successfully");
        showToast("Client updated successfully.", "success");
        router.push("/dashboard");
      } else {
        showToast(
          "Save failed. Phone number is required and all values must be valid.",
          "error",
        );
      }
    } catch (err) {
      console.error("Failed to update client:", err);
      const errorMessage =
        err instanceof Error && err.message.trim()
          ? err.message
          : "Save failed. Please try again.";
      showToast(errorMessage, "error");
    }
  };

  const healthHistoryRows = Object.entries(healthInfo)
    .map(([key, value], index) => {
      // Timestamped current status entries.
      if (key.startsWith("currentStatus_")) {
        const timestamp = key.replace("currentStatus_", "");
        const date = new Date(timestamp);
        return (
          <div key={index} className="border-b pb-2 mb-2 last:border-0">
            <h4 className="text-sm font-medium text-blue-600">
              Status Update: {date.toLocaleString()}
            </h4>
            <p className="text-sm whitespace-pre-line">{value}</p>
          </div>
        );
      }

      // Timestamped health history entries.
      if (key.startsWith("healthHistory_")) {
        const timestamp = key.replace("healthHistory_", "");
        const date = new Date(timestamp);

        try {
          const historyData = JSON.parse(value);

          return (
            <div key={index} className="border-b pb-2 mb-2 last:border-0">
              <h4 className="text-sm font-medium text-blue-600">
                Health History: {date.toLocaleString()}
              </h4>
              <div className="pl-4 mt-2 space-y-2">
                {Object.entries(historyData).map(
                  ([fieldKey, fieldValue], fieldIndex) => {
                    const formattedFieldKey = fieldKey
                      .split(".")
                      .map(
                        (part) => part.charAt(0).toUpperCase() + part.slice(1),
                      )
                      .join(" - ");

                    return (
                      <div key={fieldIndex} className="text-sm">
                        <span className="font-medium">
                          {formattedFieldKey}:{" "}
                        </span>
                        <span>{String(fieldValue)}</span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          );
        } catch {
          return (
            <div key={index} className="border-b pb-2 mb-2 last:border-0">
              <h4 className="text-sm font-medium text-blue-600">
                Health History: {date.toLocaleString()}
              </h4>
              <p className="text-sm">{value}</p>
            </div>
          );
        }
      }

      const formattedKey = key
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" - ");

      if (value && value.trim()) {
        return (
          <div key={index} className="border-b pb-2 mb-2 last:border-0">
            <h4 className="text-sm font-medium text-gray-700">
              {formattedKey}
            </h4>
            <p className="text-sm">{value}</p>
          </div>
        );
      }
      return null;
    })
    .filter(Boolean);

  const medicationsByDate = (client.medications || []).reduce(
    (groups, medication) => {
      const dateKey = medication.prescribedDate || "Unknown Date";
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(medication);
      return groups;
    },
    {} as Record<string, Medication[]>,
  );
  const medicationDateGroups = Object.entries(medicationsByDate).sort(
    ([dateA], [dateB]) => {
      const isUnknownA = dateA === "Unknown Date";
      const isUnknownB = dateB === "Unknown Date";
      if (isUnknownA && !isUnknownB) return 1;
      if (!isUnknownA && isUnknownB) return -1;
      if (isUnknownA && isUnknownB) return 0;

      return dateB.localeCompare(dateA);
    },
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {client.name}
                {", "}
                <span className="text-lg font-medium text-gray-500">
                  {client.gender}
                </span>
              </h1>
              <div className="mt-1 flex items-center space-x-2">
                <span
                  className={`inline-flex items-center rounded-full ${
                    isAcute
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  } px-2.5 py-0.5 text-xs font-medium`}
                >
                  {client.client_number}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    clientStatus === "Open"
                      ? "bg-green-100 text-green-800"
                      : clientStatus === "Closed"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-red-100 text-red-800" // Discontinued
                  }`}
                >
                  {clientStatus}
                </span>
              </div>{" "}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleStatusToggle}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  clientStatus === "Open"
                    ? "bg-orange-600 text-white hover:bg-orange-700"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {clientStatus === "Open" ? "Close Case" : "Reopen Case"}
              </button>
              <PDFExport client={client} />
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="col-span-1 space-y-6 lg:col-span-8">
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-medium text-gray-900">
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="gender"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Gender
                    </label>
                    <div className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700">
                      {personalInfo.gender}
                    </div>
                    <input
                      type="hidden"
                      id="gender"
                      name="gender"
                      value={personalInfo.gender}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="age"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Age
                    </label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={personalInfo.age}
                      onChange={handlePersonalInfoChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="height"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Height (cm)
                    </label>
                    <input
                      type="text"
                      id="height"
                      name="height"
                      value={personalInfo.height}
                      onChange={handlePersonalInfoChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="weight"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Weight (kg)
                    </label>
                    <input
                      type="text"
                      id="weight"
                      name="weight"
                      value={personalInfo.weight}
                      onChange={handlePersonalInfoChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bloodPressure"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Blood Pressure
                    </label>
                    <input
                      type="text"
                      id="bloodPressure"
                      name="bloodPressure"
                      placeholder="e.g., 120/80"
                      value={personalInfo.bloodPressure}
                      onChange={handlePersonalInfoChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="bloodGlucose"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Blood Glucose (mg/dL)
                    </label>
                    <input
                      type="text"
                      id="bloodGlucose"
                      name="bloodGlucose"
                      placeholder="e.g., 90"
                      value={personalInfo.bloodGlucose}
                      onChange={handlePersonalInfoChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phoneNumber"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      inputMode="numeric"
                      maxLength={10}
                      value={personalInfo.phoneNumber}
                      onChange={handlePersonalInfoChange}
                      className={`mt-1 block w-full rounded-md border ${
                        formErrors.phoneNumber
                          ? "border-red-500"
                          : "border-gray-300"
                      } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500`}
                    />
                    {formErrors.phoneNumber && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.phoneNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="followUpDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Follow-up Date
                    </label>
                    <input
                      type="date"
                      id="followUpDate"
                      name="followUpDate"
                      value={personalInfo.followUpDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={handlePersonalInfoChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="address"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={personalInfo.address}
                      onChange={handlePersonalInfoChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isAcute"
                      name="isAcute"
                      checked={isAcute}
                      onChange={toggleAcuteCase}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="isAcute"
                      className="text-sm font-medium text-gray-700"
                    >
                      Mark as Chronic Case
                    </label>
                    <span className="ml-2 text-xs text-gray-500">
                      (Chronic cases require immediate attention)
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-medium border-b pb-1 text-gray-900">
                  Health Information
                </h2>
                <div className="space-y-6">
                  {/* Display health information as a summary */}
                  <div className="rounded-md bg-gray-50 p-4">
                    <h3 className="text-md font-medium text-gray-700 mb-4">
                      Health History
                    </h3>

                    {healthHistoryRows.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No health information available.
                      </p>
                    ) : (
                      <div className="space-y-4">{healthHistoryRows}</div>
                    )}
                  </div>
                  {/* Current Status textarea */}
                  <div>
                    <h3 className="text-md font-medium text-gray-700 mb-2">
                      Current Status
                    </h3>
                    <textarea
                      id="currentStatus"
                      name="currentStatus"
                      rows={4}
                      value={currentStatus}
                      onChange={handleCurrentStatusChange}
                      placeholder="Enter current health status and observations..."
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    ></textarea>
                    <p className="text-xs text-gray-500 mt-1">
                      This will be saved with the current date and time.
                    </p>
                  </div>{" "}
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
            <div className="col-span-1 lg:col-span-4 space-y-6">
              {/* Medications Card */}
              <div className="rounded-lg bg-white p-6 shadow mb-6">
                <h2 className="mb-4 text-lg font-medium text-gray-900">
                  Medications
                </h2>
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="mb-3 text-md font-medium text-gray-700">
                      Current Prescriptions
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddMedication(!showAddMedication)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showAddMedication ? "Cancel" : "+ Add Medication"}
                    </button>
                  </div>

                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {client.medications.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No medications prescribed.
                      </p>
                    ) : (
                      medicationDateGroups.map(([prescribedDate, meds]) => (
                        <div
                          key={prescribedDate}
                          className="rounded-md border border-gray-200 bg-gray-50 p-3"
                        >
                          <p className="text-xs font-medium text-gray-500">
                            Prescribed: {prescribedDate}
                          </p>
                          <div className="mt-2 space-y-2">
                            {meds.map((medication) => (
                              <div
                                key={medication.id}
                                className="border-l-2 border-gray-200 pl-3"
                              >
                                <p className="font-medium">{medication.name}</p>
                                <p className="text-sm text-gray-600">
                                  {medication.dosage}
                                  {medication.duration &&
                                    ` for ${medication.duration}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {showAddMedication && (
                  <div className="space-y-4 rounded-md bg-gray-50 p-4 mt-4">
                    <h3 className="text-md font-medium text-gray-700">
                      Add New Medication
                    </h3>
                    <div>
                      <label
                        htmlFor="medName"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Medication Name
                      </label>
                      <input
                        type="text"
                        id="medName"
                        name="name"
                        value={newMedication.name}
                        onChange={handleMedicationChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="dosage"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Dosage
                      </label>
                      <input
                        type="text"
                        id="dosage"
                        name="dosage"
                        value={newMedication.dosage}
                        onChange={handleMedicationChange}
                        placeholder="e.g., 10mg twice daily"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="duration"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Duration
                      </label>
                      <input
                        type="text"
                        id="duration"
                        name="duration"
                        value={newMedication.duration}
                        onChange={handleMedicationChange}
                        placeholder="e.g., 7 days"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddMedication();
                        // Note: Setting to false is redundant here since handleAddMedication already does this,
                        // but keeping it for clarity and in case the API call fails
                      }}
                      className="w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                    >
                      Add Medication
                    </button>
                  </div>
                )}
              </div>

              {/* Lab Investigations Card */}
              <div className="rounded-lg bg-white p-6 shadow mb-6">
                <h2 className="mb-4 text-lg font-medium text-gray-900">
                  Lab Investigations
                </h2>

                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="mb-3 text-md font-medium text-gray-700">
                      Previous Investigations
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setShowAddInvestigation(!showAddInvestigation)
                      }
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showAddInvestigation ? "Cancel" : "+ Add Investigation"}
                    </button>
                  </div>

                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {!client.labInvestigations ||
                    client.labInvestigations.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No lab investigations recorded.
                      </p>
                    ) : (
                      client.labInvestigations.map((lab) => (
                        <div
                          key={lab.id}
                          className="rounded-md border border-gray-200 bg-gray-50 p-3"
                        >
                          <p className="font-medium">{lab.testName}</p>
                          <p className="text-sm text-gray-600">
                            Date: {lab.testDate}
                          </p>
                          <p className="text-sm text-gray-600">
                            Results: {lab.results}
                          </p>
                          {lab.notes && (
                            <p className="text-sm text-gray-600">
                              Notes: {lab.notes}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {showAddInvestigation && (
                  <div className="space-y-4 rounded-md bg-gray-50 p-4 mt-4">
                    <h3 className="text-md font-medium text-gray-700">
                      Add New Investigation
                    </h3>
                    <div>
                      <label
                        htmlFor="testName"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Test Name
                      </label>
                      <input
                        type="text"
                        id="testName"
                        name="testName"
                        value={newLabInvestigation.testName}
                        onChange={handleLabInvestigationChange}
                        placeholder="e.g., Blood Sugar, CBC, Thyroid"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="testDate"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Test Date
                      </label>
                      <input
                        type="date"
                        id="testDate"
                        name="testDate"
                        value={newLabInvestigation.testDate}
                        onChange={handleLabInvestigationChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="results"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Results
                      </label>
                      <input
                        type="text"
                        id="results"
                        name="results"
                        value={newLabInvestigation.results}
                        onChange={handleLabInvestigationChange}
                        placeholder="e.g., 120 mg/dL, Normal, Elevated"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="notes"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Notes (Optional)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={2}
                        value={newLabInvestigation.notes}
                        onChange={handleLabInvestigationChange}
                        placeholder="Any additional notes about the test"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      ></textarea>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddLabInvestigation();
                        // Note: Setting to false is redundant here since handleAddLabInvestigation already does this,
                        // but keeping it for clarity and in case the API call fails
                      }}
                      className="w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
                    >
                      Add Investigation
                    </button>
                  </div>
                )}
              </div>

              {/* Documents Card */}
              <div className="rounded-lg bg-white p-6 shadow mb-6">
                <h2 className="mb-4 text-lg font-medium text-gray-900">
                  Documents
                </h2>

                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="mb-3 text-md font-medium text-gray-700"></h3>
                    <button
                      type="button"
                      onClick={() => setShowAddDocument(!showAddDocument)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showAddDocument ? "Cancel" : "+ Add PDF"}
                    </button>
                  </div>

                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {client.documents && client.documents.length > 0 ? (
                      client.documents.map((document) => (
                        <div
                          key={document.id}
                          className="rounded-md border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {document.originalName}
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>{document.category}</span>
                                <span>•</span>
                                <span>{formatFileSize(document.fileSize)}</span>
                                <span>•</span>
                                <span>
                                  {new Date(
                                    document.uploadDate,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                              {document.description && (
                                <p className="text-xs text-gray-600 mt-1">
                                  {document.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              <button
                                type="button"
                                onClick={() => handleViewDocument(document.id)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                              >
                                View PDF
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteDocument(document.id)
                                }
                                className="text-red-600 hover:text-red-800 text-xs font-medium ml-2"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        No PDF documents attached.
                      </p>
                    )}
                  </div>
                </div>

                {showAddDocument && (
                  <div className="space-y-4 rounded-md bg-gray-50 p-4 mt-4">
                    <h3 className="text-md font-medium text-gray-700">
                      Add New PDF Document
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        PDF File
                      </label>
                      <input
                        type="file"
                        id="documentFile"
                        onChange={handleFileSelect}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        accept=".pdf"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Only PDF files are supported. Max file size: 10MB
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <input
                        type="text"
                        value={documentDescription}
                        onChange={(e) => setDocumentDescription(e.target.value)}
                        placeholder="Document description"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select
                        value={documentCategory}
                        onChange={(e) => setDocumentCategory(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Medical Report">Medical Report</option>
                        <option value="Lab Result">Lab Result</option>
                        <option value="Prescription">Prescription</option>
                        <option value="Insurance">Insurance</option>
                        <option value="ID Document">ID Document</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddDocument}
                      disabled={!selectedFile}
                      className="w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      Upload PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
