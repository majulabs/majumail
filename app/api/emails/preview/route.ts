import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { generateEmailHtml, type EmailTemplateType } from "@/lib/email/template";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      body: emailBody, 
      templateType = "branded" as EmailTemplateType,
      senderName,
    } = body;

    if (!emailBody) {
      return NextResponse.json(
        { error: "Email body is required" },
        { status: 400 }
      );
    }

    // Generate the HTML preview
    const html = generateEmailHtml(emailBody, templateType, {
      senderName,
      includeFooter: templateType === "branded",
    });

    return NextResponse.json({
      html: html || emailBody,
      templateType,
    });
  } catch (error) {
    console.error("Preview generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate preview" },
      { status: 500 }
    );
  }
}
