"use client";

import { useRouter } from "next/navigation";
import { Client } from "../types";
import { generatePDF } from "./PDFExport";

interface ClientListProps {
  clients: Client[];
  searchTerm: string;
}

export default function ClientList({ clients, searchTerm }: ClientListProps) {
  const router = useRouter();

  // Filter clients based on search term
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
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
                    Name
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Gender
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Contact Info
                  </th>
                  <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredClients.map((client) => (
                  <tr key={client.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {client.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {client.gender}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {client.phoneNumber}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() =>
                          router.push(`/clients/edit/${client.id}`)
                        }
                        className="mr-2 text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => generatePDF(client)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Export PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
