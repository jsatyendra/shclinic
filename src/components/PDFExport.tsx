import { Client } from "../types";
import jsPDF from "jspdf";

interface PDFExportProps {
  client: Client;
}

// Add a proper type for the jsPDF internal object
interface JsPDFWithInternals extends jsPDF {
  internal: jsPDF["internal"] & {
    pageSize: {
      getWidth: () => number;
      getHeight: () => number;
    };
    getNumberOfPages: () => number;
  };
}

// Helper function to organize health information with timestamps
const organizeHealthInfo = (healthInfo: Record<string, string>) => {
  // Create a map to store regular health information with their latest values
  const regularEntries = new Map<string, string>();

  // Create arrays to store timestamped entries
  const statusUpdates: { timestamp: string; content: string }[] = [];
  const historyEntries: { timestamp: string; data: Record<string, string> }[] =
    [];

  // Process all entries in healthInfo
  Object.entries(healthInfo).forEach(([key, value]) => {
    if (key.startsWith("currentStatus_")) {
      // Extract timestamp and add to status updates
      const timestamp = key.replace("currentStatus_", "");
      statusUpdates.push({ timestamp, content: value });
    } else if (key.startsWith("healthHistory_")) {
      // Extract timestamp and parse JSON data
      const timestamp = key.replace("healthHistory_", "");
      try {
        const historyData = JSON.parse(value);
        historyEntries.push({ timestamp, data: historyData });

        // Also update regular entries with the latest values
        Object.entries(historyData).forEach(([historyKey, historyValue]) => {
          regularEntries.set(historyKey, String(historyValue));
        });
      } catch (e) {
        console.error("Failed to parse history data:", e);
      }
    } else if (value && value.trim()) {
      // Only update if the current key doesn't already exist or if it has a new value
      if (!regularEntries.has(key) || regularEntries.get(key) !== value) {
        regularEntries.set(key, value);
      }
    }
  });

  // Sort timestamped entries by date (newest first)
  statusUpdates.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  historyEntries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    regularEntries: Array.from(regularEntries.entries()),
    statusUpdates,
    historyEntries,
  };
};

export const generatePDF = (client: Client): void => {
  try {
    console.log("Generating PDF for client:", client);

    // Validate client data
    if (!client) {
      throw new Error("Client data is missing");
    }

    if (!client.name) {
      throw new Error("Client name is missing");
    }

    if (!client.client_number) {
      throw new Error("Client ID is missing");
    }

    // Create new PDF document
    const doc = new jsPDF() as JsPDFWithInternals;

    // Check if jsPDF has initialized correctly
    if (!doc) {
      throw new Error("Failed to initialize PDF document");
    }

    const pageWidth = doc.internal.pageSize.getWidth();

    // Add title
    doc.setFontSize(18);
    doc.text(`Medical Record: ${client.name}`, 14, 22);

    doc.setFontSize(14);
    doc.text(`ID: ${client.client_number}`, 14, 30);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 38);
    doc.text(
      `Case Type: ${client.isAcute ? "Acute" : "Regular"}`,
      pageWidth - 14,
      38,
      { align: "right" }
    );
    // Add horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 42, pageWidth - 14, 42);

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Personal Information
    doc.setFontSize(14);
    doc.text("Personal Information", 14, 45);

    doc.setFontSize(10);
    let y = 55;

    // Use optional chaining and default values for potentially missing data
    doc.text(`Age: ${client.age || "Not recorded"}`, 14, y);
    y += 7;
    doc.text(`Gender: ${client.gender || "Not specified"}`, 14, y);
    y += 7;
    if (client.height) {
      doc.text(`Height: ${client.height} cm`, 14, y);
      y += 7;
    }
    if (client.weight) {
      doc.text(`Weight: ${client.weight} kg`, 14, y);
      y += 7;
    }
    if (client.bloodPressure) {
      doc.text(`Blood Pressure: ${client.bloodPressure}`, 14, y);
      y += 7;
    }
    if (client.bloodGlucose) {
      doc.text(`Blood Glucose: ${client.bloodGlucose} mg/dL`, 14, y);
      y += 7;
    }
    doc.text(`Address: ${client.address || "Not provided"}`, 14, y);
    y += 7;
    doc.text(`Contact: ${client.phoneNumber || "Not provided"}`, 14, y);
    y += 7;
    if (client.followUpDate) {
      doc.text(
        `Follow-up Date: ${new Date(client.followUpDate).toLocaleDateString()}`,
        14,
        y
      );
      y += 7;
    }
    y += 5;
    // Health Information
    doc.setFontSize(14);
    doc.text("Health Information", 14, y);
    y += 10;

    doc.setFontSize(10);
    // Use the organizeHealthInfo function to structure health data
    const { regularEntries, statusUpdates, historyEntries } =
      organizeHealthInfo(client.healthInfo);

    // Display regular health information entries first (current data)
    if (regularEntries.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 150);
      doc.text("Current Health Data", 14, y);
      y += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      regularEntries.forEach(([key, value]) => {
        // Skip special keys that are handled separately
        if (
          key.startsWith("currentStatus_") ||
          key.startsWith("healthHistory_")
        ) {
          return;
        }

        // Format the key by capitalizing first letter and adding spaces
        const formattedKey = key
          .split(".")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" - ");

        const text = `${formattedKey}: ${value}`;
        const textLines = doc.splitTextToSize(text, pageWidth - 30);

        textLines.forEach((line: string) => {
          doc.text(line, 14, y);
          y += 5;
        });

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      y += 8;
    }

    // Display Status Updates with timestamps (newest first)
    if (statusUpdates.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 150);
      doc.text("Status Updates", 14, y);
      y += 8;
      doc.setTextColor(0, 0, 0);

      statusUpdates.forEach((status) => {
        const date = new Date(status.timestamp);
        const formattedDate = date.toLocaleString();

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 150);
        doc.text(`Update from ${formattedDate}`, 14, y);
        y += 7;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        // Handle multi-line status text
        const textLines = doc.splitTextToSize(status.content, pageWidth - 30);
        textLines.forEach((line: string) => {
          doc.text(line, 16, y);
          y += 5;
        });

        y += 5; // Add extra space after each status update

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      y += 8;
    }

    // Display Health History entries with timestamps (newest first)
    if (historyEntries.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 150);
      doc.text("Health History", 14, y);
      y += 8;
      doc.setTextColor(0, 0, 0);

      historyEntries.forEach((entry) => {
        const date = new Date(entry.timestamp);
        const formattedDate = date.toLocaleString();

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 150);
        doc.text(`Record from ${formattedDate}`, 14, y);
        y += 7;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        // Print each field in the history entry
        Object.entries(entry.data).forEach(([fieldKey, fieldValue]) => {
          const formattedFieldKey = fieldKey
            .split(".")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" - ");

          const text = `${formattedFieldKey}: ${fieldValue}`;
          const textLines = doc.splitTextToSize(text, pageWidth - 35);

          textLines.forEach((line: string) => {
            doc.text(line, 18, y);
            y += 5;
          });

          if (y > 270) {
            doc.addPage();
            y = 20;
          }
        });

        y += 5; // Add extra space after each history entry
      });
    }

    y += 5;
    // Medications
    doc.setFontSize(14);
    doc.text("Medications", 14, y);
    y += 10;

    doc.setFontSize(10);
    if (!client.medications || client.medications.length === 0) {
      doc.text("No medications prescribed.", 14, y);
      y += 7;
    } else {
      client.medications.forEach((med, index) => {
        doc.text(`${index + 1}. ${med.name}`, 14, y);
        y += 6;
        doc.text(`   Dosage: ${med.dosage}`, 20, y);
        y += 6;
        doc.text(`   Duration: ${med.duration}`, 20, y);
        y += 6;
        doc.text(`   Prescribed: ${med.prescribedDate}`, 20, y);
        y += 10;

        // Add a new page if needed
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    }

    // Add Lab Investigations section if present
    if (client.labInvestigations && client.labInvestigations.length > 0) {
      y += 5;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Lab Investigations", 14, y);
      y += 10;

      doc.setFontSize(10);
      client.labInvestigations.forEach((lab, index) => {
        doc.text(`${index + 1}. ${lab.testName}`, 14, y);
        y += 6;
        doc.text(`   Date: ${lab.testDate}`, 20, y);
        y += 6;
        doc.text(`   Results: ${lab.results}`, 20, y);
        y += 6;
        if (lab.notes) {
          doc.text(`   Notes: ${lab.notes}`, 20, y);
          y += 6;
        }
        y += 4;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
    }
    // Footer
    // Make sure we're using the correct method to get page count
    const pageCount = doc.internal.pages
      ? doc.internal.pages.length - 1
      : doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, 290, {
        align: "center",
      });
    }

    // Save the PDF with client number and name for better organization
    doc.save(`${client.client_number}_${client.name}_medical_record.pdf`);
  } catch (error) {
    console.error("Error in PDF generation:", error);
    throw error; // Rethrow to be caught in the handler
  }
};

export default function PDFExport({ client }: PDFExportProps) {
  const handleExport = () => {
    console.log("Export button clicked for client:", client.name);
    try {
      console.log("Starting PDF generation...");

      // Check if client data is complete
      if (!client || !client.name || !client.client_number) {
        console.error("Client data is incomplete:", client);
        alert("Cannot generate PDF: Client data is incomplete");
        return;
      }

      generatePDF(client);
      console.log("PDF generation completed successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(
        `Error generating PDF: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  return (
    <button
      onClick={handleExport}
      className="rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
    >
      Export to PDF
    </button>
  );
}
