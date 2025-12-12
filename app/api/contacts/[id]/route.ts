import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { contacts, contactKnowledge, emails } from "@/lib/db/schema";
import { eq, or, desc, sql } from "drizzle-orm";
import { extractEmailAddress } from "@/lib/utils/format";

// GET single contact with knowledge and stats
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
    // Get contact
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (!contact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Get contact knowledge
    const knowledge = await db
      .select()
      .from(contactKnowledge)
      .where(eq(contactKnowledge.contactId, id))
      .orderBy(desc(contactKnowledge.createdAt));

    // Get recent emails with this contact
    const recentEmails = await db
      .select({
        id: emails.id,
        threadId: emails.threadId,
        subject: emails.subject,
        direction: emails.direction,
        sentAt: emails.sentAt,
        snippet: sql<string>`LEFT(${emails.bodyText}, 100)`,
      })
      .from(emails)
      .where(
        or(
          eq(emails.fromAddress, contact.email),
          sql`${contact.email} = ANY(${emails.toAddresses})`
        )
      )
      .orderBy(desc(emails.sentAt))
      .limit(10);

    return NextResponse.json({
      contact,
      knowledge,
      recentEmails,
    });
  } catch (error) {
    console.error("Get contact error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

// PATCH update contact
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
    const {
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
      avatarUrl,
      communicationStyle,
      language,
    } = body;

    // Check if contact exists
    const [existing] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: Partial<typeof contacts.$inferSelect> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (company !== undefined) updateData.company = company;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (location !== undefined) updateData.location = location;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (linkedIn !== undefined) updateData.linkedIn = linkedIn;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (communicationStyle !== undefined) updateData.communicationStyle = communicationStyle;
    if (language !== undefined) updateData.language = language;

    const [updated] = await db
      .update(contacts)
      .set(updateData)
      .where(eq(contacts.id, id))
      .returning();

    return NextResponse.json({ contact: updated });
  } catch (error) {
    console.error("Update contact error:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// DELETE contact
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
    // Delete contact knowledge first (due to foreign key)
    await db.delete(contactKnowledge).where(eq(contactKnowledge.contactId, id));
    
    // Delete contact
    await db.delete(contacts).where(eq(contacts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete contact error:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
