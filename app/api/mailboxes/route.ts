import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { mailboxes } from "@/lib/db/schema";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await db.select().from(mailboxes);

    return NextResponse.json({ mailboxes: results });
  } catch (error) {
    console.error("Get mailboxes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mailboxes" },
      { status: 500 }
    );
  }
}
