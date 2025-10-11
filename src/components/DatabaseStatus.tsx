"use client";

import { useState, useEffect } from "react";

// This component now just performs initial DB health check via API
export default function DatabaseStatus() {
  const [dbStatus, setDbStatus] = useState<"checking" | "ready" | "error">(
    "checking"
  );

  useEffect(() => {
    // Simple ping to check if the API is responding
    // We use a lightweight fetch - just checking if the API is available
    // without triggering database operations
    async function checkApiConnection() {
      try {
        const response = await fetch("/api/clients?check=true");
        if (response.ok) {
          setDbStatus("ready");
        } else {
          setDbStatus("error");
          console.error(
            "Database API returned an error:",
            await response.text()
          );
        }
      } catch (err) {
        setDbStatus("error");
        console.error("Failed to connect to database API:", err);
      }
    }

    checkApiConnection();
  }, []);

  // This component doesn't render anything visible
  // It just checks database connectivity on the client side
  if (dbStatus === "error" && process.env.NODE_ENV === "development") {
    return (
      <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-md shadow-lg">
        <h3 className="font-bold">Database Connection Error</h3>
        <p>
          There was a problem connecting to the database. Check server logs for
          details.
        </p>
      </div>
    );
  }

  return null;
}
