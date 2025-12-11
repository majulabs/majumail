import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { aiContext, emails } from "@/lib/db/schema";
import { generateDraft } from "@/lib/ai/compose";
import { eq, asc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { threadId, instruction, additionalContext, senderName } = body;

    if (!instruction) {
      return NextResponse.json(
        { error: "Instruction is required" },
        { status: 400 }
      );
    }

    // Get AI context
    const context = await db
      .select()
      .from(aiContext)
      .where(eq(aiContext.isActive, true));

    // Get thread history if replying
    let threadHistory: typeof emails.$inferSelect[] = [];
    if (threadId) {
      threadHistory = await db
        .select()
        .from(emails)
        .where(eq(emails.threadId, threadId))
        .orderBy(asc(emails.sentAt));
    }

    // Generate draft
    const result = await generateDraft({
      instruction: additionalContext
        ? `${instruction}\n\nAdditional context: ${additionalContext}`
        : instruction,
      threadHistory,
      context,
      senderName,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI compose error:", error);
    return NextResponse.json(
      { error: "Failed to generate draft" },
      { status: 500 }
    );
  }
}
