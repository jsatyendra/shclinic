"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ClientForm, {
  calculateFollowUpDate,
  ClientFormValues,
  formatDateForInput,
} from "../../../components/ClientForm";
import { clientApi } from "../../../lib/clientApi";
import { Client } from "../../../types";

const createInitialValues = (): ClientFormValues => {
  const today = formatDateForInput(new Date());
  return {
    name: "",
    age: "",
    gender: "Male",
    height: "",
    weight: "",
    bloodPressure: "",
    bloodGlucose: "",
    address: "",
    phoneNumber: "",
    startDate: today,
    followUpDate: calculateFollowUpDate(today, "1week"),
    notes: "",
    followUpFrequency: "1week",
    isAcute: false,
    healthInfo: {},
    medications: [],
    labInvestigations: [],
  };
};

export default function AddClientPage() {
  const router = useRouter();
  const { status } = useSession();
  const [values, setValues] = useState<ClientFormValues>(createInitialValues);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canAutoSave = Boolean(
    values.name.trim() && /^\d{10}$/.test(values.phoneNumber.trim()),
  );

  const saveClient = async (
    nextValues: ClientFormValues,
    redirect: boolean,
  ) => {
    const canSave = Boolean(
      nextValues.name.trim() && /^\d{10}$/.test(nextValues.phoneNumber.trim()),
    );
    if (!canSave || isSaving) return;
    setIsSaving(true);
    setSaveStatus("saving");
    try {
      const payload = {
        ...nextValues,
        phoneNumber: nextValues.phoneNumber.trim(),
        client_number: "",
        status: "Open" as const,
      };
      const result = currentClientId
        ? await clientApi.updateClient(currentClientId, payload)
        : await clientApi.addClient(payload as Omit<Client, "id">);
      if (result) {
        setCurrentClientId((previous) => previous || result.id);
        setSaveStatus("saved");
        if (redirect) router.push("/dashboard");
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      } else setSaveStatus("error");
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!canAutoSave || isSaving) return;
    const timer = setTimeout(() => void saveClient(values, false), 1200);
    return () => clearTimeout(timer);
  }, [values, isSaving]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }
  if (status === "loading")
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f1f8e9]">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Add New Client
          </h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ClientForm
          initialValues={values}
          onValuesChange={setValues}
          onSubmit={async (nextValues) => {
            setValues(nextValues);
            await saveClient(nextValues, true);
          }}
          submitLabel="Save Client"
          statusText={
            saveStatus === "saving"
              ? "Saving draft..."
              : saveStatus === "saved"
                ? "Draft saved"
                : saveStatus === "error"
                  ? "Save failed. Please try again."
                  : "Enter name and phone to auto-save."
          }
        />
      </main>
    </div>
  );
}
