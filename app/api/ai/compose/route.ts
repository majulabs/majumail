import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { composeEmail, improveDraft } from "@/lib/ai/compose";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { threadId, instruction, additionalContext, senderName, existingBody } = body;

    if (!instruction) {
      return NextResponse.json(
        { error: "Instruction is required" },
        { status: 400 }
      );
    }

    // If there's existing body text, use improveDraft to modify it
    if (existingBody && existingBody.trim()) {
      const improvedDraft = await improveDraft(existingBody, instruction);
      return NextResponse.json({ draft: improvedDraft });
    }

    // Otherwise, generate a new draft using composeEmail
    const result = await composeEmail({
      threadId,
      instruction,
      additionalContext,
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