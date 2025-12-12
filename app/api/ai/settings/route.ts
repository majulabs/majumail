import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { aiSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_AI_SETTINGS, type AISettingsConfig } from "@/lib/types";

const SETTINGS_KEY = "ai_config";

// GET AI settings
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [settings] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.key, SETTINGS_KEY))
      .limit(1);

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json({ settings: DEFAULT_AI_SETTINGS });
    }

    return NextResponse.json({ 
      settings: { ...DEFAULT_AI_SETTINGS, ...(settings.value as object) } 
    });
  } catch (error) {
    console.error("Get AI settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// POST update AI settings
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const newSettings: Partial<AISettingsConfig> = body;

    // Validate settings
    const validKeys = Object.keys(DEFAULT_AI_SETTINGS);
    const invalidKeys = Object.keys(newSettings).filter(
      (key) => !validKeys.includes(key)
    );

    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Invalid settings: ${invalidKeys.join(", ")}` },
        { status: 400 }
      );
    }

    // Get existing settings
    const [existing] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.key, SETTINGS_KEY))
      .limit(1);

    const mergedSettings = {
      ...DEFAULT_AI_SETTINGS,
      ...(existing?.value as object || {}),
      ...newSettings,
    };

    if (existing) {
      // Update existing
      await db
        .update(aiSettings)
        .set({
          value: mergedSettings,
          updatedAt: new Date(),
        })
        .where(eq(aiSettings.key, SETTINGS_KEY));
    } else {
      // Create new
      await db.insert(aiSettings).values({
        key: SETTINGS_KEY,
        value: mergedSettings,
      });
    }

    return NextResponse.json({ settings: mergedSettings });
  } catch (error) {
    console.error("Update AI settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
