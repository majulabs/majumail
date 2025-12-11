import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { ilike, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "10");

  try {
    const results = await db
      .select()
      .from(contacts)
      .where(
        query
          ? ilike(contacts.email, `%${query}%`)
          : undefined
      )
      .orderBy(desc(contacts.contactCount))
      .limit(limit);

    return NextResponse.json({ contacts: results });
  } catch (error) {
    console.error("Get contacts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}
