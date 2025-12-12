import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { contacts, contactKnowledge, emails } from "@/lib/db/schema";
import { eq, or, desc, sql } from "drizzle-orm";
import { enrichContactFromEmails } from "@/lib/ai/knowledge-extractor";

// POST enrich contact with AI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Get contact
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Get recent emails with this contact
    const recentEmails = await db
      .select()
      .from(emails)
      .where(
        or(
          eq(emails.fromAddress, contact.email),
          sql`${contact.email} = ANY(${emails.toAddresses})`
        )
      )
      .orderBy(desc(emails.sentAt))
      .limit(20);

    if (recentEmails.length === 0) {
      return NextResponse.json({ 
        message: "No emails found for this contact",
        updates: {},
        knowledge: [],
      });
    }

    // Run AI enrichment
    const { updates, knowledge } = await enrichContactFromEmails(
      contact,
      recentEmails
    );

    // Apply updates to contact
    if (Object.keys(updates).length > 0) {
      const updateData: Partial<typeof contacts.$inferSelect> = {
        ...updates,
        updatedAt: new Date(),
      };

      await db
        .update(contacts)
        .set(updateData)
        .where(eq(contacts.id, id));
    }

    // Add knowledge items
    for (const item of knowledge) {
      if (item.confidence >= 70) {
        await db.insert(contactKnowledge).values({
          contactId: id,
          field: item.field,
          value: item.value,
          source: "ai_extracted",
          confidence: item.confidence,
        });
      }
    }

    // Get updated contact
    const [updatedContact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    // Get all knowledge
    const allKnowledge = await db
      .select()
      .from(contactKnowledge)
      .where(eq(contactKnowledge.contactId, id));

    return NextResponse.json({
      contact: updatedContact,
      knowledge: allKnowledge,
      appliedUpdates: updates,
      addedKnowledge: knowledge.filter((k) => k.confidence >= 70),
    });
  } catch (error) {
    console.error("Enrich contact error:", error);
    return NextResponse.json(
      { error: "Failed to enrich contact" },
      { status: 500 }
    );
  }
}
