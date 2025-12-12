import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { aiKnowledge, AI_KNOWLEDGE_CATEGORIES } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

// GET all knowledge items, optionally filtered by category
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const activeOnly = searchParams.get("activeOnly") !== "false";

  try {
    let query = db.select().from(aiKnowledge);
    
    const conditions = [];
    if (category) {
      conditions.push(eq(aiKnowledge.category, category));
    }
    if (activeOnly) {
      conditions.push(eq(aiKnowledge.isActive, true));
    }
    
    const results = await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(aiKnowledge.sortOrder), asc(aiKnowledge.createdAt));

    return NextResponse.json({ 
      knowledge: results,
      categories: AI_KNOWLEDGE_CATEGORIES,
    });
  } catch (error) {
    console.error("Get knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge" },
      { status: 500 }
    );
  }
}

// POST create new knowledge item
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { category, title, content, metadata, source, sourceReference, confidence, sortOrder } = body;

    if (!category || !title || !content) {
      return NextResponse.json(
        { error: "Category, title, and content are required" },
        { status: 400 }
      );
    }

    const [newKnowledge] = await db
      .insert(aiKnowledge)
      .values({
        category,
        title,
        content,
        metadata: metadata || {},
        source: source || "manual",
        sourceReference,
        confidence,
        sortOrder: sortOrder || 0,
        isActive: true,
        isEditable: true,
      })
      .returning();

    return NextResponse.json({ knowledge: newKnowledge });
  } catch (error) {
    console.error("Create knowledge error:", error);
    return NextResponse.json(
      { error: "Failed to create knowledge" },
      { status: 500 }
    );
  }
}
