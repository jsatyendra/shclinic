"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Client } from "../../types";
import { clientApi } from "../../lib/clientApi";

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [editingFollowUp, setEditingFollowUp] = useState<string | null>(null);
  const [tempFollowUpDate, setTempFollowUpDate] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    async function fetchClients() {
      setIsLoading(true);
      const clientData = await clientApi.getClients();
      setClients(clientData);
      setIsLoading(false);
    }

    if (status === "authenticated") {
      fetchClients();
    }
  }, [status, router]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const handleFollowUpEdit = (clientId: string, currentDate: string) => {
    setEditingFollowUp(clientId);
    setTempFollowUpDate(currentDate || "");
  };

  const handleFollowUpSave = async (clientId: string) => {
    if (tempFollowUpDate) {
      const selectedDate = createLocalDate(tempFollowUpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate && selectedDate <= today) {
        alert("Follow-up date must be in the future.");
        return;
      }
    }

    try {
      const result = await clientApi.updateClient(clientId, {
        followUpDate: tempFollowUpDate,
      });

      if (result) {
        // Update the local state
        setClients((prev) =>
          prev.map((client) =>
            client.id === clientId
              ? { ...client, followUpDate: tempFollowUpDate }
              : client
          )
        );
        setEditingFollowUp(null);
        setTempFollowUpDate("");
      }
    } catch (error) {
      console.error("Failed to update follow-up date:", error);
      alert("Failed to update follow-up date. Please try again.");
    }
  };

  const handleFollowUpCancel = () => {
    setEditingFollowUp(null);
    setTempFollowUpDate("");
  };

  // Helper function to create a local date from a date string (YYYY-MM-DD)
  const createLocalDate = (dateString: string) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
  };

  // Helper function to format date consistently
  const formatDate = (dateString: string) => {
    const localDate = createLocalDate(dateString);
    return localDate ? localDate.toLocaleDateString() : "";
  };

  // Helper function to compare dates (ignoring time)
  const isDateOverdue = (dateString: string) => {
    const followUpDate = createLocalDate(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return followUpDate ? followUpDate < today : false;
  };

  // Helper function to check if date is due soon (within 7 days)
  const isDateDueSoon = (dateString: string) => {
    const followUpDate = createLocalDate(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(
      today.getTime() + 7 * 24 * 60 * 60 * 1000
    );
    return followUpDate
      ? followUpDate >= today && followUpDate <= sevenDaysFromNow
      : false;
  };
  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.client_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === "loading" || isLoading) {
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
              Saaroopya Homeo Clinic
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                Welcome, {session?.user?.name}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          {" "}
          <div className="w-1/2">
            <input
              type="text"
              placeholder="Search clients by ID or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => router.push("/clients/add")}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Add Client
          </button>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            {filteredClients.length === 0 ? (
              <div className="text-center text-gray-500">
                {searchTerm
                  ? "No clients found matching your search."
                  : "No clients in the system. Add one to get started."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        ID
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Name
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Gender
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Contact Info
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Follow-up Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredClients.map((client) => (
                      <tr key={client.id}>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              router.push(`/clients/edit/${client.id}`);
                            }}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {client.client_number}
                          </a>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                          {client.name}
                        </td>{" "}
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {client.gender}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {client.phoneNumber}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              client.status === "Open"
                                ? "bg-green-100 text-green-800"
                                : client.status === "Closed"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-red-100 text-red-800" // Discontinued
                            }`}
                          >
                            {client.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {editingFollowUp === client.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={tempFollowUpDate}
                                min={new Date().toISOString().split("T")[0]}
                                onChange={(e) =>
                                  setTempFollowUpDate(e.target.value)
                                }
                                className="w-32 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                              />
                              <button
                                onClick={() => handleFollowUpSave(client.id)}
                                className="text-green-600 hover:text-green-800 text-xs"
                              >
                                ✓
                              </button>
                              <button
                                onClick={handleFollowUpCancel}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {client.followUpDate ? (
                                <span
                                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 ${
                                    isDateOverdue(client.followUpDate)
                                      ? "bg-red-100 text-red-800"
                                      : isDateDueSoon(client.followUpDate)
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                  onClick={() =>
                                    handleFollowUpEdit(
                                      client.id,
                                      client.followUpDate || ""
                                    )
                                  }
                                >
                                  {formatDate(client.followUpDate)}
                                </span>
                              ) : (
                                <span
                                  className="text-gray-400 cursor-pointer hover:text-blue-600"
                                  onClick={() =>
                                    handleFollowUpEdit(client.id, "")
                                  }
                                >
                                  Not scheduled
                                </span>
                              )}
                              <button
                                onClick={() =>
                                  handleFollowUpEdit(
                                    client.id,
                                    client.followUpDate || ""
                                  )
                                }
                                className="text-gray-400 hover:text-blue-600 text-xs ml-1"
                                title="Edit follow-up date"
                              >
                                ✏️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
