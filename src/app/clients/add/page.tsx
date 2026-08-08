"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { clientApi } from "../../../lib/clientApi";
import {
  Client,
  Medication,
  LabInvestigation,
  CaseTakingTemplate,
  AcuteCaseTakingTemplate,
} from "../../../types";
import caseTakingTemplate from "../../../case_taking.json";
import acuteCaseTakingTemplate from "../../../acute_case_taking.json";

// Define proper types for template data
interface TemplateValue {
  [key: string]: string | Record<string, string>;
}

interface TemplateSection {
  [key: string]: TemplateValue;
}

type FollowUpFrequency = "1week" | "2weeks" | "1month" | "custom";

const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const calculateFollowUpDate = (
  startDate: string,
  frequency: FollowUpFrequency,
): string => {
  if (!startDate || frequency === "custom") {
    return "";
  }

  const baseDate = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) {
    return "";
  }

  const nextDate = new Date(baseDate);
  if (frequency === "1week") {
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (frequency === "2weeks") {
    nextDate.setDate(nextDate.getDate() + 14);
  } else {
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return formatDateForInput(nextDate);
};

const PHONE_10_DIGIT_REGEX = /^\d{10}$/;

const normalizePhoneNumberInput = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 10);

export default function AddClientPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const today = formatDateForInput(new Date());

  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    age: "",
    gender: "Male" as "Male" | "Female" | "Other",
    height: "",
    weight: "",
    bloodPressure: "",
    bloodGlucose: "",
    address: "",
    phoneNumber: "",
    startDate: today,
    followUpDate: calculateFollowUpDate(today, "1week"),
    notes: "",
  });
  const [followUpFrequency, setFollowUpFrequency] =
    useState<FollowUpFrequency>("1week");

  const [isAcute, setIsAcute] = useState(false);
  const [healthInfo, setHealthInfo] = useState<Record<string, string>>({});
  const [medications, setMedications] = useState<
    Omit<Medication, "id" | "prescribedDate">[]
  >([]);
  const [labInvestigations, setLabInvestigations] = useState<
    Omit<LabInvestigation, "id">[]
  >([]);

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

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePersonalInfoChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    const nextValue =
      name === "phoneNumber" ? normalizePhoneNumberInput(value) : value;

    setPersonalInfo((prev) => ({ ...prev, [name]: nextValue }));
    // Clear error when field is updated
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFollowUpFrequencyChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setFollowUpFrequency(e.target.value as FollowUpFrequency);
  };

  const toggleAcuteCase = () => {
    setIsAcute(!isAcute);

    // Reset health info when toggling between acute and regular
    const template = !isAcute
      ? acuteCaseTakingTemplate["Acute Case Taking"]
      : caseTakingTemplate["Case Taking"];

    const newHealthInfo: Record<string, string> = {};
    const populateFields = (
      obj: Record<string, TemplateValue>,
      prefix = "",
    ) => {
      Object.entries(obj).forEach(([key, value]) => {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === "object") {
          populateFields(value as Record<string, TemplateValue>, fieldName);
        } else {
          newHealthInfo[fieldName] = "";
        }
      });
    };

    populateFields(template as unknown as Record<string, TemplateValue>);
    setHealthInfo(newHealthInfo);
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

  const addMedicationToList = () => {
    if (!newMedication.name || !newMedication.dosage) {
      return;
    }

    setMedications((prev) => [...prev, { ...newMedication }]);
    setNewMedication({ name: "", dosage: "", duration: "" });
  };

  const removeMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLabInvestigationChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setNewLabInvestigation((prev) => ({ ...prev, [name]: value }));
  };

  const addLabInvestigationToList = () => {
    if (
      !newLabInvestigation.testName ||
      !newLabInvestigation.testDate ||
      !newLabInvestigation.results
    ) {
      return;
    }

    setLabInvestigations((prev) => [...prev, { ...newLabInvestigation }]);
    setNewLabInvestigation({
      testName: "",
      testDate: new Date().toISOString().split("T")[0],
      results: "",
      notes: "",
    });
  };

  const removeLabInvestigation = (index: number) => {
    setLabInvestigations((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (followUpFrequency === "custom") {
      return;
    }

    setPersonalInfo((prev) => ({
      ...prev,
      followUpDate: calculateFollowUpDate(prev.startDate, followUpFrequency),
    }));
  }, [personalInfo.startDate, followUpFrequency]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!personalInfo.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!personalInfo.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!PHONE_10_DIGIT_REGEX.test(personalInfo.phoneNumber.trim())) {
      newErrors.phoneNumber = "Phone number must be exactly 10 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canAutoSave = () =>
    Boolean(
      personalInfo.name.trim() &&
      PHONE_10_DIGIT_REGEX.test(personalInfo.phoneNumber.trim()),
    );

  const buildClientPayload = (): Omit<Client, "id"> => {
    const currentTimestamp = new Date().toISOString();
    const healthInfoObj: { [key: string]: string } = {};
    const historyEntry: { [key: string]: string } = {};

    Object.entries(healthInfo).forEach(([key, value]) => {
      if (value && value.trim()) {
        historyEntry[key] = value;
      }
    });

    if (Object.keys(historyEntry).length > 0) {
      healthInfoObj[`healthHistory_${currentTimestamp}`] =
        JSON.stringify(historyEntry);
    }

    return {
      ...personalInfo,
      phoneNumber: personalInfo.phoneNumber.trim(),
      age: personalInfo.age || "",
      client_number: "", // TODO: Set appropriate client number here
      status: "Open", // New clients start with Open status
      isAcute,
      healthInfo: healthInfoObj,
      medications: medications.map((med) => ({
        ...med,
        id: "", // This will be generated on the server
        prescribedDate: new Date().toISOString().split("T")[0],
      })),
      labInvestigations: labInvestigations.map((lab) => ({
        ...lab,
        id: "", // This will be generated on the server
      })),
    };
  };

  const saveClient = async (redirectOnSuccess: boolean) => {
    if (!canAutoSave() || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const payload = buildClientPayload();
      let result: Client | null = null;

      if (currentClientId) {
        result = await clientApi.updateClient(currentClientId, payload);
      } else {
        result = await clientApi.addClient(payload);
      }

      if (result) {
        if (!currentClientId) {
          setCurrentClientId(result.id);
        }
        setSaveStatus("saved");
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }

      if (result && redirectOnSuccess) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to add client:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await saveClient(true);
  };

  useEffect(() => {
    if (!canAutoSave() || isSaving) {
      return;
    }

    const timer = setTimeout(() => {
      saveClient(false);
    }, 1200);

    return () => clearTimeout(timer);
    // Watch all form states that should trigger autosave.
  }, [personalInfo, isAcute, healthInfo, medications, labInvestigations]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Initialize health info fields from template
  useEffect(() => {
    const template = isAcute
      ? acuteCaseTakingTemplate["Acute Case Taking"]
      : caseTakingTemplate["Case Taking"];

    const newHealthInfo: Record<string, string> = {};
    const populateFields = (
      obj: Record<string, TemplateValue>,
      prefix = "",
    ) => {
      Object.entries(obj).forEach(([key, value]) => {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === "object") {
          populateFields(value as Record<string, TemplateValue>, fieldName);
        } else {
          newHealthInfo[fieldName] = "";
        }
      });
    };

    populateFields(template as unknown as Record<string, TemplateValue>);
    setHealthInfo(newHealthInfo);
  }, [isAcute]);

  // Handle authentication states
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f1f8e9] font-['Segoe_UI',Tahoma,Geneva,Verdana,sans-serif]">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#f1f8e9] font-['Segoe_UI',Tahoma,Geneva,Verdana,sans-serif]">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Add New Client
            </h1>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow">
            <p className="text-sm text-gray-600">
              {saveStatus === "saving" && "Saving draft..."}
              {saveStatus === "saved" && "Draft saved"}
              {saveStatus === "error" && "Save failed. Please try again."}
              {saveStatus === "idle" && "Enter name and phone to auto-save."}
            </p>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Client
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column - Personal Information and Health Information */}
            <div className="col-span-1 lg:col-span-8 space-y-6">
              {/* Personal Information Section */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-medium text-gray-900">
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={personalInfo.name}
                      onChange={handlePersonalInfoChange}
                      className={`mt-1 block w-full rounded-md border ${
                        errors.name ? "border-red-500" : "border-gray-300"
                      } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
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
                      htmlFor="gender"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Gender
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={personalInfo.gender}
                      onChange={handlePersonalInfoChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="phoneNumber"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Phone *
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
                        errors.phoneNumber
                          ? "border-red-500"
                          : "border-gray-300"
                      } px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500`}
                    />
                    {errors.phoneNumber && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.phoneNumber}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="startDate"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={personalInfo.startDate}
                      onChange={handlePersonalInfoChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="followUpFrequency"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Follow-up Frequency
                    </label>
                    <select
                      id="followUpFrequency"
                      name="followUpFrequency"
                      value={followUpFrequency}
                      onChange={handleFollowUpFrequencyChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      <option value="1week">1 Week</option>
                      <option value="2weeks">2 Weeks</option>
                      <option value="1month">1 Month</option>
                      <option value="custom">Custom</option>
                    </select>
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
                      type="float"
                      id="height"
                      name="height"
                      value={personalInfo.height}
                      onChange={handlePersonalInfoChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>{" "}
                  <div>
                    <label
                      htmlFor="weight"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Weight (kg)
                    </label>
                    <input
                      type="float"
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
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Case Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={personalInfo.notes}
                      onChange={handlePersonalInfoChange}
                      placeholder="Add case notes here..."
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>
                  {/* Add the Acute Case checkbox */}
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
                      Chronic Case
                    </label>
                  </div>
                </div>
              </div>

              {/* Case Taking Section - Dynamically Generated */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-medium border-b pb-1 text-gray-900">
                  {isAcute ? "Chronic Case Taking" : "Acute Case Taking"}
                </h2>
                <div className="space-y-6">
                  {(() => {
                    const template = isAcute
                      ? (acuteCaseTakingTemplate as AcuteCaseTakingTemplate)
                      : (caseTakingTemplate as CaseTakingTemplate);

                    const templateData = isAcute
                      ? (template as AcuteCaseTakingTemplate)[
                          "Acute Case Taking"
                        ]
                      : (template as CaseTakingTemplate)["Case Taking"];

                    return (
                      templateData &&
                      Object.entries(templateData).map(
                        ([key, value], index) => {
                          // Check if the value is an object (for nested sections)
                          if (value !== null && typeof value === "object") {
                            return (
                              <div key={index} className="mt-4">
                                <h3 className="mb-3 text-md font-medium text-gray-700 border-b pb-1">
                                  {key}
                                </h3>
                                <div className="pl-4 space-y-4">
                                  {Object.entries(
                                    value as Record<string, string>,
                                  ).map(([subKey, subValue], subIndex) => (
                                    <div key={`${index}-${subIndex}`}>
                                      <h4 className="mb-1 text-sm font-medium text-gray-600">
                                        {subKey}
                                      </h4>
                                      <textarea
                                        id={`${key
                                          .replace(/\s+/g, "_")
                                          .toLowerCase()}_${subKey
                                          .replace(/\s+/g, "_")
                                          .toLowerCase()}`}
                                        name={`${key}.${subKey}`}
                                        rows={1}
                                        value={
                                          healthInfo[`${key}.${subKey}`] || ""
                                        }
                                        onChange={handleHealthInfoChange}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                                      ></textarea>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          } else {
                            // Regular string value (not nested)
                            return (
                              <div key={index}>
                                <h3 className="mb-2 text-md font-medium text-gray-600">
                                  {key}
                                </h3>
                                <textarea
                                  id={key.replace(/\s+/g, "_").toLowerCase()}
                                  name={key}
                                  rows={1}
                                  value={healthInfo[key] || ""}
                                  onChange={handleHealthInfoChange}
                                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                                ></textarea>
                              </div>
                            );
                          }
                        },
                      )
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right Column - Medications and Lab Investigations */}
            <div className="col-span-1 lg:col-span-4 space-y-6">
              {/* Medications Section */}
              <div className="rounded-lg bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-medium text-gray-900">
                  Prescribed Medications
                </h2>

                {/* Add new medication */}
                <div className="mb-6 space-y-4 rounded-md bg-gray-50 p-4">
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
                    onClick={addMedicationToList}
                    className="w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Add Medication
                  </button>
                </div>

                {/* List of medications */}
                <div className="space-y-2">
                  <h3 className="text-md font-medium text-gray-700">
                    Current Prescriptions
                  </h3>
                  {medications.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No medications added yet.
                    </p>
                  ) : (
                    medications.map((medication, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3"
                      >
                        <div>
                          <p className="font-medium">{medication.name}</p>
                          <p className="text-sm text-gray-600">
                            {medication.dosage}
                            {medication.duration &&
                              ` for ${medication.duration}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedication(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Lab Investigations Section */}
              <div className="rounded-lg bg-white p-6 shadow mt-6">
                <h2 className="mb-4 text-lg font-medium text-gray-900">
                  Lab Investigations
                </h2>

                {/* Add new lab investigation */}
                <div className="mb-6 space-y-4 rounded-md bg-gray-50 p-4">
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
                    onClick={addLabInvestigationToList}
                    className="w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Add Investigation
                  </button>
                </div>

                {/* List of lab investigations */}
                <div className="space-y-2">
                  <h3 className="text-md font-medium text-gray-700">
                    Current Investigations
                  </h3>
                  {labInvestigations.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No lab investigations added yet.
                    </p>
                  ) : (
                    labInvestigations.map((lab, index) => (
                      <div
                        key={index}
                        className="rounded-md border border-gray-200 bg-white p-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{lab.testName}</p>
                          <button
                            type="button"
                            onClick={() => removeLabInvestigation(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
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
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Client
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
