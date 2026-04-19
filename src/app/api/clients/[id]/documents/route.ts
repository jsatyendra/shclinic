import { NextRequest, NextResponse } from "next/server";
import { getDbConnection } from "../../../../../db/connection";
import { writeFile } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";
import { MAX_UPLOAD_SIZE, documentCategorySchema } from "../../../../../lib/validation";

// Helper to generate random IDs
function generateId(): string {
  return randomBytes(4).toString('hex');
}

// POST endpoint to upload a document
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await context.params;
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    // Validate file type - only allow PDFs
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Validate category
    const parsedCategory = documentCategorySchema.safeParse(category);
    const safeCategory = parsedCategory.success ? parsedCategory.data : "Other";
    
    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const fileName = `${generateId()}_${Date.now()}${fileExtension}`;
    const filePath = path.join(process.cwd(), 'uploads', fileName);
    
    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);
    
    // Save document info to database
    const db = getDbConnection();
    const documentId = generateId();
    
    db.prepare(`
      INSERT INTO documents (id, client_id, fileName, originalName, fileType, fileSize, uploadDate, description, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      documentId,
      clientId,
      fileName,
      file.name,
      file.type,
      file.size,
      new Date().toISOString(),
      description || '',
      safeCategory
    );
    
    const newDocument = {
      id: documentId,
      fileName,
      originalName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      description: description || '',
      category: safeCategory
    };
    
    return NextResponse.json(newDocument);
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a document
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await context.params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }
    
    const db = getDbConnection();
    
    // Get document info before deleting
    type DocumentRow = { fileName: string };
    const document = db.prepare(
      'SELECT fileName FROM documents WHERE id = ? AND client_id = ?'
    ).get(documentId, clientId) as DocumentRow | undefined;
    
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    
    // Delete from database
    db.prepare('DELETE FROM documents WHERE id = ? AND client_id = ?')
      .run(documentId, clientId);
    
    // Delete file from filesystem
    const fs = require('fs').promises;
    const filePath = path.join(process.cwd(), 'uploads', document.fileName);
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.warn('Could not delete file from filesystem:', fileError);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
