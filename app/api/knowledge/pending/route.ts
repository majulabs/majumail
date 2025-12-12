import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { aiKnowledgePending, aiKnowledge } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// GET all pending knowledge items
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pending = await db
      .select()
      .from(aiKnowledgePending)
      .where(eq(aiKnowledgePending.status, "pending"))
      .orderBy(desc(aiKnowledgePending.createdAt));

    return NextResponse.json({ pending });
  } catch (error) {
    console.error("Get pending knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending knowledge" },
      { status: 500 }
    );
  }
}

// POST approve or reject a pending item
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, action, editedContent } = body;

    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "ID and action (approve/reject) are required" },
        { status: 400 }
      );
    }

    // Get the pending item
    const [pending] = await db
      .select()
      .from(aiKnowledgePending)
      .where(eq(aiKnowledgePending.id, id))
      .limit(1);

    if (!pending) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (action === "approve") {
      // Create the knowledge item
      await db.insert(aiKnowledge).values({
        category: pending.category,
        title: pending.title,
        content: editedContent || pending.content,
        metadata: pending.metadata,
        source: pending.source,
        sourceReference: pending.sourceReference,
        confidence: pending.confidence,
        isActive: true,
        isEditable: true,
      });
    }

    // Update pending status
    await db
      .update(aiKnowledgePending)
      .set({
        status: action === "approve" ? "approved" : "rejected",
        reviewedAt: new Date(),
      })
      .where(eq(aiKnowledgePending.id, id));

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Review pending knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to review pending knowledge" },
      { status: 500 }
    );
  }
}
