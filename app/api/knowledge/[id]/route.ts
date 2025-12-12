import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { aiKnowledge } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET single knowledge item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [knowledge] = await db
      .select()
      .from(aiKnowledge)
      .where(eq(aiKnowledge.id, id))
      .limit(1);

    if (!knowledge) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ knowledge });
  } catch (error) {
    console.error("Get knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge" },
      { status: 500 }
    );
  }
}

// PATCH update knowledge item
export async function PATCH(
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
    const { category, title, content, metadata, isActive, sortOrder } = body;

    // Check if item exists and is editable
    const [existing] = await db
      .select()
      .from(aiKnowledge)
      .where(eq(aiKnowledge.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!existing.isEditable) {
      return NextResponse.json(
        { error: "This item cannot be edited" },
        { status: 403 }
      );
    }

    const updateData: Partial<typeof aiKnowledge.$inferSelect> = {
      updatedAt: new Date(),
    };

    if (category !== undefined) updateData.category = category;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const [updated] = await db
      .update(aiKnowledge)
      .set(updateData)
      .where(eq(aiKnowledge.id, id))
      .returning();

    return NextResponse.json({ knowledge: updated });
  } catch (error) {
    console.error("Update knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to update knowledge" },
      { status: 500 }
    );
  }
}

// DELETE knowledge item
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
    // Check if item exists and is editable
    const [existing] = await db
      .select()
      .from(aiKnowledge)
      .where(eq(aiKnowledge.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!existing.isEditable) {
      return NextResponse.json(
        { error: "This item cannot be deleted" },
        { status: 403 }
      );
    }

    await db.delete(aiKnowledge).where(eq(aiKnowledge.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to delete knowledge" },
      { status: 500 }
    );
  }
}
