import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { emails, threadLabels, aiLabelRules } from "@/lib/db/schema";
import { classifyEmail, buildLabelRulesFromDb } from "@/lib/ai/classify";
import { eq, asc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { threadId, applyLabels = false, minConfidence = 70 } = body;

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    // Get most recent email in thread
    const [latestEmail] = await db
      .select()
      .from(emails)
      .where(eq(emails.threadId, threadId))
      .orderBy(asc(emails.sentAt))
      .limit(1);

    if (!latestEmail) {
      return NextResponse.json(
        { error: "No emails found in thread" },
        { status: 404 }
      );
    }

    // Get classification rules
    const rules = await db.query.aiLabelRules.findMany({
      where: eq(aiLabelRules.isActive, true),
      with: {
        label: true,
      },
    });

    const labelRules = buildLabelRulesFromDb(rules);

    if (labelRules.length === 0) {
      return NextResponse.json({ labels: [] });
    }

    // Run classification
    const classifications = await classifyEmail(
      {
        from: latestEmail.fromAddress,
        subject: latestEmail.subject || "",
        body: latestEmail.bodyText || "",
      },
      labelRules
    );

    // Optionally apply labels
    if (applyLabels) {
      for (const classification of classifications) {
        if (classification.confidence >= minConfidence) {
          await db
            .insert(threadLabels)
            .values({
              threadId,
              labelId: classification.labelId,
              appliedBy: "ai",
              confidence: classification.confidence,
            })
            .onConflictDoNothing();
        }
      }
    }

    return NextResponse.json({ labels: classifications });
  } catch (error) {
    console.error("AI classify error:", error);
    return NextResponse.json(
      { error: "Failed to classify" },
      { status: 500 }
    );
  }
}
