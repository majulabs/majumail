import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { labels } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
    const [label] = await db
      .select()
      .from(labels)
      .where(eq(labels.id, id))
      .limit(1);

    if (!label) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    return NextResponse.json({ label });
  } catch (error) {
    console.error("Get label error:", error);
    return NextResponse.json(
      { error: "Failed to fetch label" },
      { status: 500 }
    );
  }
}

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
    const { name, color, description, autoClassify } = body;

    // Check if system label
    const [existing] = await db
      .select()
      .from(labels)
      .where(eq(labels.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    if (existing.isSystem && name && name !== existing.name) {
      return NextResponse.json(
        { error: "Cannot rename system labels" },
        { status: 400 }
      );
    }

    const updateData: Partial<typeof labels.$inferSelect> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;
    if (autoClassify !== undefined) updateData.autoClassify = autoClassify;

    const [updated] = await db
      .update(labels)
      .set(updateData)
      .where(eq(labels.id, id))
      .returning();

    return NextResponse.json({ label: updated });
  } catch (error) {
    console.error("Update label error:", error);
    return NextResponse.json(
      { error: "Failed to update label" },
      { status: 500 }
    );
  }
}

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
    // Check if system label
    const [existing] = await db
      .select()
      .from(labels)
      .where(eq(labels.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Label not found" }, { status: 404 });
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system labels" },
        { status: 400 }
      );
    }

    await db.delete(labels).where(eq(labels.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete label error:", error);
    return NextResponse.json(
      { error: "Failed to delete label" },
      { status: 500 }
    );
  }
}
