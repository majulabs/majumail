import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { contactKnowledge, contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST add knowledge to contact
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { field, value, source, sourceReference, confidence } = body;

    if (!field || !value) {
      return NextResponse.json(
        { error: "Field and value are required" },
        { status: 400 }
      );
    }

    // Verify contact exists
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const [newKnowledge] = await db
      .insert(contactKnowledge)
      .values({
        contactId: id,
        field,
        value,
        source: source || "manual",
        sourceReference,
        confidence,
      })
      .returning();

    return NextResponse.json({ knowledge: newKnowledge });
  } catch (error) {
    console.error("Add contact knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to add knowledge" },
      { status: 500 }
    );
  }
}

// DELETE knowledge from contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const searchParams = request.nextUrl.searchParams;
    const knowledgeId = searchParams.get("knowledgeId");

    if (!knowledgeId) {
      return NextResponse.json(
        { error: "knowledgeId is required" },
        { status: 400 }
      );
    }

    await db
      .delete(contactKnowledge)
      .where(eq(contactKnowledge.id, knowledgeId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete contact knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to delete knowledge" },
      { status: 500 }
    );
  }
}
