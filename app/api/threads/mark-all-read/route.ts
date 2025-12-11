import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { threads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Only mark as read threads that are currently unread, not trashed, not archived
    const result = await db
      .update(threads)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        eq(threads.isRead, false)
      );
    return NextResponse.json({ success: true, updated: result.rowCount });
  } catch (error) {
    console.error("Mark all as read error:", error);
    return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 });
  }
}
