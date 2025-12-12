import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { attachments, emails } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { summarizeAttachment } from "@/lib/ai/attachment-summarizer";
import { put } from "@vercel/blob";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "text/html",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// POST upload attachment
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const emailId = formData.get("emailId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Content = buffer.toString("base64");

    // Upload to Vercel Blob (or your storage)
    let storageUrl: string | undefined;
    let storageKey: string | undefined;

    try {
      const blob = await put(file.name, buffer, {
        access: "public",
        contentType: file.type,
        addRandomSuffix: true,
      });
      storageUrl = blob.url;
      storageKey = blob.pathname;
    } catch (storageError) {
      console.error("Storage upload error:", storageError);
      // Continue without storage - attachment will be stored in DB only
    }

    // Create attachment record
    const [attachment] = await db
      .insert(attachments)
      .values({
        emailId: emailId || undefined,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        storageUrl,
        storageKey,
      })
      .returning();

    // Summarize attachment in background (don't await)
    summarizeAttachmentAsync(attachment.id, {
      filename: file.name,
      contentType: file.type,
      content: base64Content,
      size: file.size,
    });

    return NextResponse.json({ attachment });
  } catch (error) {
    console.error("Upload attachment error:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}

// Background summarization
async function summarizeAttachmentAsync(
  attachmentId: string,
  file: {
    filename: string;
    contentType: string;
    content: string;
    size: number;
  }
) {
  try {
    const summary = await summarizeAttachment(file);
    
    await db
      .update(attachments)
      .set({
        summary: summary.summary,
        extractedText: summary.extractedText,
      })
      .where(eq(attachments.id, attachmentId));
  } catch (error) {
    console.error("Background summarization error:", error);
  }
}

// GET attachments for an email
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const emailId = searchParams.get("emailId");

  if (!emailId) {
    return NextResponse.json(
      { error: "emailId is required" },
      { status: 400 }
    );
  }

  try {
    const emailAttachments = await db
      .select()
      .from(attachments)
      .where(eq(attachments.emailId, emailId));

    return NextResponse.json({ attachments: emailAttachments });
  } catch (error) {
    console.error("Get attachments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}
