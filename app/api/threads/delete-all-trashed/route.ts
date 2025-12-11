import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { threads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(request: NextRequest) {
  try {
    await db.delete(threads).where(eq(threads.isTrashed, true));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete all trashed threads error:", error);
    return NextResponse.json({ error: "Failed to delete all trashed threads" }, { status: 500 });
  }
}
