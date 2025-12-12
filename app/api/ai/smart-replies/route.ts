import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { emails, aiKnowledge, aiSettings } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { generateSmartReplies } from "@/lib/ai/knowledge-extractor";
import { DEFAULT_AI_SETTINGS } from "@/lib/types";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { threadId } = body;

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    // Check if smart replies are enabled
    const [settingsRow] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.key, "ai_config"))
      .limit(1);

    const settings = settingsRow?.value as typeof DEFAULT_AI_SETTINGS | undefined;
    if (settings && !settings.generateSmartReplies) {
      return NextResponse.json({ replies: [] });
    }

    // Get thread emails
    const threadEmails = await db
      .select()
      .from(emails)
      .where(eq(emails.threadId, threadId))
      .orderBy(asc(emails.sentAt));

    if (threadEmails.length === 0) {
      return NextResponse.json({ replies: [] });
    }

    // Get relevant context knowledge
    const knowledge = await db
      .select()
      .from(aiKnowledge)
      .where(eq(aiKnowledge.isActive, true));

    const contextText = knowledge
      .filter((k) => ["company", "products", "tone"].includes(k.category))
      .map((k) => `### ${k.title}\n${k.content}`)
      .join("\n\n");

    // Generate smart replies
    const replies = await generateSmartReplies(threadEmails, contextText);

    return NextResponse.json({ replies });
  } catch (error) {
    console.error("Smart replies error:", error);
    return NextResponse.json(
      { error: "Failed to generate smart replies" },
      { status: 500 }
    );
  }
}
