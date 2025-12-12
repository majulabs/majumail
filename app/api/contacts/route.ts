import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { contacts, contactKnowledge, CONTACT_TYPES, CONTACT_STATUSES } from "@/lib/db/schema";
import { ilike, desc, eq, or, sql } from "drizzle-orm";

// GET contacts with filtering and search
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const sortBy = searchParams.get("sortBy") || "lastContactedAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  try {
    // Build where conditions
    const conditions = [];
    
    if (query) {
      conditions.push(
        or(
          ilike(contacts.email, `%${query}%`),
          ilike(contacts.name, `%${query}%`),
          ilike(contacts.company, `%${query}%`)
        )
      );
    }
    
    if (type) {
      conditions.push(eq(contacts.type, type));
    }
    
    if (status) {
      conditions.push(eq(contacts.status, status));
    }

    // Build query
    let baseQuery = db.select().from(contacts);
    
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(
        conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`
      ) as typeof baseQuery;
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`) : undefined);
    
    const total = countResult[0]?.count || 0;

    // Get paginated results
    const orderColumn = sortBy === "name" ? contacts.name 
      : sortBy === "email" ? contacts.email 
      : sortBy === "company" ? contacts.company
      : sortBy === "emailCount" ? contacts.emailCount
      : contacts.lastContactedAt;

    const results = await baseQuery
      .orderBy(sortOrder === "asc" ? orderColumn : desc(orderColumn))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ 
      contacts: results,
      total,
      types: CONTACT_TYPES,
      statuses: CONTACT_STATUSES,
    });
  } catch (error) {
    console.error("Get contacts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// POST create new contact
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      email,
      name,
      company,
      role,
      phone,
      website,
      location,
      timezone,
      linkedIn,
      type,
      status,
      notes,
      tags,
    } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if contact already exists
    const [existing] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Contact with this email already exists", contact: existing },
        { status: 409 }
      );
    }

    const [newContact] = await db
      .insert(contacts)
      .values({
        email: email.toLowerCase(),
        name,
        company,
        role,
        phone,
        website,
        location,
        timezone,
        linkedIn,
        type: type || "contact",
        status: status || "active",
        notes,
        tags,
        firstContactedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ contact: newContact });
  } catch (error) {
    console.error("Create contact error:", error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    );
  }
}
