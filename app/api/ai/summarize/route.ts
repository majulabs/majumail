import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { emails, aiSettings } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { generateThreadSummary } from "@/lib/ai/knowledge-extractor";
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

    // Check if summaries are enabled
    const [settingsRow] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.key, "ai_config"))
      .limit(1);

    const settings = settingsRow?.value as typeof DEFAULT_AI_SETTINGS | undefined;
    if (settings && !settings.generateThreadSummaries) {
      return NextResponse.json({ summary: null });
    }

    // Get thread emails
    const threadEmails = await db
      .select()
      .from(emails)
      .where(eq(emails.threadId, threadId))
      .orderBy(asc(emails.sentAt));

    if (threadEmails.length === 0) {
      return NextResponse.json({ summary: null });
    }

    // Only generate summary for threads with 2+ emails
    if (threadEmails.length < 2) {
      return NextResponse.json({ summary: null });
    }

    // Generate summary
    const summary = await generateThreadSummary(threadEmails);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Thread summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
