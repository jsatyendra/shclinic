"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  AcuteCaseTakingTemplate,
  CaseTakingTemplate,
  LabInvestigation,
  Medication,
} from "../types";
import caseTakingTemplate from "../case_taking.json";
import acuteCaseTakingTemplate from "../acute_case_taking.json";

export type FollowUpFrequency = "1week" | "2weeks" | "1month" | "custom";

export interface ClientFormValues {
  name: string;
  age: string;
  gender: "Male" | "Female" | "Other";
  height: string;
  weight: string;
  bloodPressure: string;
  bloodGlucose: string;
  address: string;
  phoneNumber: string;
  startDate: string;
  followUpDate: string;
  notes: string;
  followUpFrequency: FollowUpFrequency;
  isAcute: boolean;
  healthInfo: Record<string, string>;
  medications: Medication[];
  labInvestigations: LabInvestigation[];
}

interface ClientFormProps {
  initialValues: ClientFormValues;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  onValuesChange?: (values: ClientFormValues) => void;
  leftColumnFooter?: ReactNode;
  rightColumnFooter?: ReactNode;
  submitLabel: string;
  statusText?: string;
}

interface TemplateValue {
  [key: string]: string | Record<string, string>;
}

const PHONE_10_DIGIT_REGEX = /^\d{10}$/;

export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const calculateFollowUpDate = (
  startDate: string,
  frequency: FollowUpFrequency,
): string => {
  if (!startDate || frequency === "custom") return "";
  const baseDate = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(baseDate.getTime())) return "";
  const nextDate = new Date(baseDate);
  if (frequency === "1week") nextDate.setDate(nextDate.getDate() + 7);
  if (frequency === "2weeks") nextDate.setDate(nextDate.getDate() + 14);
  if (frequency === "1month") nextDate.setMonth(nextDate.getMonth() + 1);
  return formatDateForInput(nextDate);
};

export const normalizePhoneNumberInput = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 10);

const emptyHealthInfoFor = (isAcute: boolean): Record<string, string> => {
  const template = isAcute
    ? acuteCaseTakingTemplate["Acute Case Taking"]
    : caseTakingTemplate["Case Taking"];
  const result: Record<string, string> = {};
  const populate = (value: Record<string, TemplateValue>, prefix = "") => {
    Object.entries(value).forEach(([key, nestedValue]) => {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      if (nestedValue !== null && typeof nestedValue === "object") {
        populate(nestedValue as Record<string, TemplateValue>, fieldName);
      } else {
        result[fieldName] = "";
      }
    });
  };
  populate(template as unknown as Record<string, TemplateValue>);
  return result;
};

export default function ClientForm({
  initialValues,
  onSubmit,
  onValuesChange,
  leftColumnFooter,
  rightColumnFooter,
  submitLabel,
  statusText,
}: ClientFormProps) {
  const [values, setValues] = useState<ClientFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newMedication, setNewMedication] = useState({
    name: "",
    dosage: "",
    duration: "",
  });
  const [newLabInvestigation, setNewLabInvestigation] = useState({
    testName: "",
    testDate: formatDateForInput(new Date()),
    results: "",
    notes: "",
  });
  const [isCaseTakingExpanded, setIsCaseTakingExpanded] = useState(false);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    onValuesChange?.(values);
  }, [values, onValuesChange]);

  useEffect(() => {
    if (values.followUpFrequency === "custom") return;
    setValues((previous) => ({
      ...previous,
      followUpDate: calculateFollowUpDate(
        previous.startDate,
        previous.followUpFrequency,
      ),
    }));
  }, [values.startDate, values.followUpFrequency]);

  const handlePersonalInfoChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;
    const nextValue =
      name === "phoneNumber" ? normalizePhoneNumberInput(value) : value;
    setValues((previous) => ({ ...previous, [name]: nextValue }));
    setErrors((previous) => {
      if (!previous[name]) return previous;
      const nextErrors = { ...previous };
      delete nextErrors[name];
      return nextErrors;
    });
  };

  const toggleAcuteCase = () => {
    setValues((previous) => ({
      ...previous,
      isAcute: !previous.isAcute,
      healthInfo: {
        ...emptyHealthInfoFor(!previous.isAcute),
        ...previous.healthInfo,
      },
    }));
  };

  const addMedication = () => {
    if (!newMedication.name || !newMedication.dosage) return;
    setValues((previous) => ({
      ...previous,
      medications: [
        ...previous.medications,
        {
          ...newMedication,
          id: "",
          prescribedDate: formatDateForInput(new Date()),
        },
      ],
    }));
    setNewMedication({ name: "", dosage: "", duration: "" });
  };

  const addLabInvestigation = () => {
    if (!newLabInvestigation.testName || !newLabInvestigation.testDate) return;
    setValues((previous) => ({
      ...previous,
      labInvestigations: [
        ...previous.labInvestigations,
        { ...newLabInvestigation, id: "" },
      ],
    }));
    setNewLabInvestigation({
      testName: "",
      testDate: formatDateForInput(new Date()),
      results: "",
      notes: "",
    });
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.name.trim()) nextErrors.name = "Name is required";
    if (!values.phoneNumber.trim()) {
      nextErrors.phoneNumber = "Phone number is required";
    } else if (!PHONE_10_DIGIT_REGEX.test(values.phoneNumber.trim())) {
      nextErrors.phoneNumber = "Phone number must be exactly 10 digits";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validate()) await onSubmit(values);
  };

  const template = values.isAcute
    ? (acuteCaseTakingTemplate as AcuteCaseTakingTemplate)["Acute Case Taking"]
    : (caseTakingTemplate as CaseTakingTemplate)["Case Taking"];
  const medicationsByDate = values.medications.reduce<
    Record<string, { medication: Medication; index: number }[]>
  >((groups, medication, index) => {
    const date = medication.prescribedDate || "Unknown date";
    groups[date] ??= [];
    groups[date].push({ medication, index });
    return groups;
  }, {});
  const labInvestigationsByDate = values.labInvestigations.reduce<
    Record<string, LabInvestigation[]>
  >((groups, lab) => {
    const date = lab.testDate || "Unknown date";
    groups[date] ??= [];
    groups[date].push(lab);
    return groups;
  }, {});

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-gray-600">{statusText}</p>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {submitLabel}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="col-span-1 space-y-6 lg:col-span-8">
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ["name", "Full Name *", "text"],
                ["age", "Age", "number"],
                ["height", "Height (cm)", "text"],
                ["weight", "Weight (kg)", "text"],
                ["bloodPressure", "Blood Pressure", "text"],
                ["bloodGlucose", "Blood Glucose (mg/dL)", "text"],
                ["phoneNumber", "Phone *", "tel"],
                ["startDate", "Start Date", "date"],
                ["followUpDate", "Follow-up Date", "date"],
              ].map(([name, label, type]) => (
                <div
                  key={name}
                  className={name === "name" ? "sm:col-span-2" : ""}
                >
                  <label
                    htmlFor={name}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {label}
                  </label>
                  <input
                    type={type}
                    id={name}
                    name={name}
                    inputMode={name === "phoneNumber" ? "numeric" : undefined}
                    maxLength={name === "phoneNumber" ? 10 : undefined}
                    value={values[name as keyof ClientFormValues] as string}
                    onChange={handlePersonalInfoChange}
                    className={`mt-1 block w-full rounded-md border ${errors[name] ? "border-red-500" : "border-gray-300"} px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500`}
                  />
                  {errors[name] && (
                    <p className="mt-1 text-sm text-red-600">{errors[name]}</p>
                  )}
                </div>
              ))}
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
                  value={values.gender}
                  onChange={handlePersonalInfoChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
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
                  value={values.followUpFrequency}
                  onChange={(event) =>
                    setValues((previous) => ({
                      ...previous,
                      followUpFrequency: event.target
                        .value as FollowUpFrequency,
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="1week">1 Week</option>
                  <option value="2weeks">2 Weeks</option>
                  <option value="1month">1 Month</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700"
                >
                  Address
                </label>
                <input
                  id="address"
                  name="address"
                  value={values.address}
                  onChange={handlePersonalInfoChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={values.isAcute}
                  onChange={toggleAcuteCase}
                  className="h-4 w-4"
                />
                Chronic Case
              </label>
            </div>
          </section>
          <section className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between border-b pb-1">
              <h2 className="text-lg font-medium text-gray-900">
                {values.isAcute ? "Chronic Case Taking" : "Acute Case Taking"}
              </h2>
              <button
                type="button"
                onClick={() => setIsCaseTakingExpanded((expanded) => !expanded)}
                aria-expanded={isCaseTakingExpanded}
                aria-label={
                  isCaseTakingExpanded
                    ? "Collapse case taking"
                    : "Expand case taking"
                }
                title={
                  isCaseTakingExpanded
                    ? "Collapse case taking"
                    : "Expand case taking"
                }
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-lg font-medium text-gray-700 hover:bg-gray-100"
              >
                {isCaseTakingExpanded ? "−" : "+"}
              </button>
            </div>
            {isCaseTakingExpanded && (
              <div className="space-y-6">
                {Object.entries(template).map(([key, value]) =>
                  value !== null && typeof value === "object" ? (
                    <div key={key}>
                      <h3 className="mb-3 border-b pb-1 font-medium text-gray-700">
                        {key}
                      </h3>
                      <div className="space-y-4 pl-4">
                        {Object.entries(value as Record<string, string>).map(
                          ([subKey]) => (
                            <div key={subKey}>
                              <label className="text-sm font-medium text-gray-600">
                                {subKey}
                              </label>
                              <textarea
                                name={`${key}.${subKey}`}
                                rows={1}
                                value={
                                  values.healthInfo[`${key}.${subKey}`] || ""
                                }
                                onChange={(event) =>
                                  setValues((previous) => ({
                                    ...previous,
                                    healthInfo: {
                                      ...previous.healthInfo,
                                      [event.target.name]: event.target.value,
                                    },
                                  }))
                                }
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                              />
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ) : (
                    <div key={key}>
                      <label className="text-sm font-medium text-gray-600">
                        {key}
                      </label>
                      <textarea
                        name={key}
                        rows={1}
                        value={values.healthInfo[key] || ""}
                        onChange={(event) =>
                          setValues((previous) => ({
                            ...previous,
                            healthInfo: {
                              ...previous.healthInfo,
                              [event.target.name]: event.target.value,
                            },
                          }))
                        }
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
          {leftColumnFooter}
        </div>
        <div className="col-span-1 space-y-6 lg:col-span-4">
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              Prescribed Medications
            </h2>
            <div className="space-y-3 rounded-md bg-gray-50 p-4">
              <input
                placeholder="Medication name"
                value={newMedication.name}
                onChange={(event) =>
                  setNewMedication((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                placeholder="Dosage"
                value={newMedication.dosage}
                onChange={(event) =>
                  setNewMedication((previous) => ({
                    ...previous,
                    dosage: event.target.value,
                  }))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                placeholder="Duration"
                value={newMedication.duration}
                onChange={(event) =>
                  setNewMedication((previous) => ({
                    ...previous,
                    duration: event.target.value,
                  }))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <button
                type="button"
                onClick={addMedication}
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-white"
              >
                Add Medication
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {Object.entries(medicationsByDate).map(([date, medications]) => (
                <div key={date} className="">
                  <h3 className="mb-2 text-sm font-medium text-gray-700 border-b pb-1">
                    {date === "Unknown date"
                      ? date
                      : `Prescribed on ${new Date(`${date}T00:00:00`).toLocaleDateString()}`}
                  </h3>
                  <div className="space-y-2">
                    {medications.map(({ medication, index }) => (
                      <div
                        key={`${medication.id}-${index}`}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{medication.name}</p>
                          <p className="text-sm text-gray-600">
                            {medication.dosage}
                            {medication.duration &&
                              ` for ${medication.duration}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              Lab Investigations
            </h2>
            <div className="space-y-3 rounded-md bg-gray-50 p-4">
              <input
                placeholder="Test name"
                value={newLabInvestigation.testName}
                onChange={(event) =>
                  setNewLabInvestigation((previous) => ({
                    ...previous,
                    testName: event.target.value,
                  }))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                type="date"
                value={newLabInvestigation.testDate}
                onChange={(event) =>
                  setNewLabInvestigation((previous) => ({
                    ...previous,
                    testDate: event.target.value,
                  }))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <input
                placeholder="Results"
                value={newLabInvestigation.results}
                onChange={(event) =>
                  setNewLabInvestigation((previous) => ({
                    ...previous,
                    results: event.target.value,
                  }))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <textarea
                placeholder="Notes"
                value={newLabInvestigation.notes}
                onChange={(event) =>
                  setNewLabInvestigation((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              <button
                type="button"
                onClick={addLabInvestigation}
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-white"
              >
                Add Investigation
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {Object.entries(labInvestigationsByDate).map(([date, labs]) => (
                <div key={date} className="rounded-md">
                  <h3 className="mb-2 text-sm font-medium text-gray-700 border-b pb-1">
                    {date === "Unknown date"
                      ? date
                      : `Tested on ${new Date(`${date}T00:00:00`).toLocaleDateString()}`}
                  </h3>
                  <div className="space-y-2">
                    {labs.map((lab, index) => (
                      <div key={`${lab.id}-${index}`} className="">
                        <p className="font-medium">{lab.testName}</p>
                        <p className="text-sm text-gray-600">{lab.results}</p>
                        {lab.notes && (
                          <p className="text-sm text-gray-600">{lab.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
          {rightColumnFooter}
          <section className="rounded-lg bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Case Notes</h2>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save Notes
              </button>
            </div>
            <textarea
              id="notes"
              name="notes"
              rows={5}
              value={values.notes}
              onChange={handlePersonalInfoChange}
              placeholder="Add or edit case notes..."
              className="block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </section>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
