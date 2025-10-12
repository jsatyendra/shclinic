import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "../../../../../../db/connection";
import { readFile } from "fs/promises";
import path from "path";

// GET endpoint to download a document
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id: clientId, documentId } = await context.params;
    
    const db = getDbConnection();
    
    // Define the document type
    type DocumentRow = { fileName: string; originalName: string; fileType: string };
    
    // Get document info
    const document = db.prepare(
      'SELECT fileName, originalName, fileType FROM documents WHERE id = ? AND client_id = ?'
    ).get(documentId, clientId) as DocumentRow | undefined;
    
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    
    // Read file from filesystem
    const filePath = path.join(process.cwd(), 'uploads', document.fileName);
    const fileBuffer = await readFile(filePath);
    
    // Return file with appropriate headers for PDF viewing
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': document.fileType || 'application/pdf',
        'Content-Disposition': `inline; filename="${document.originalName}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    );
  }
}
