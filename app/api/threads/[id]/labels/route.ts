import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { threadLabels } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: threadId } = await params;

  try {
    const body = await request.json();
    const { labelId } = body;

    if (!labelId) {
      return NextResponse.json(
        { error: "labelId is required" },
        { status: 400 }
      );
    }

    await db
      .insert(threadLabels)
      .values({
        threadId,
        labelId,
        appliedBy: "user",
      })
      .onConflictDoNothing();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add label error:", error);
    return NextResponse.json(
      { error: "Failed to add label" },
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

  const { id: threadId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const labelId = searchParams.get("labelId");

  if (!labelId) {
    return NextResponse.json(
      { error: "labelId is required" },
      { status: 400 }
    );
  }

  try {
    await db
      .delete(threadLabels)
      .where(
        and(
          eq(threadLabels.threadId, threadId),
          eq(threadLabels.labelId, labelId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove label error:", error);
    return NextResponse.json(
      { error: "Failed to remove label" },
      { status: 500 }
    );
  }
}
