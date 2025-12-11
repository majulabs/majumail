import { Resend } from "resend";
import { Webhook } from "svix";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

interface SendEmailResult {
  id: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { from, to, cc, bcc, subject, text, html, replyTo, headers } = params;

  const result = await resend.emails.send({
    from,
    to,
    cc,
    bcc,
    subject,
    text,
    html: html || text,
    replyTo,
    headers,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return { id: result.data!.id };
}

export async function verifyWebhookSignature(
  payload: string,
  headers: Record<string, string>
): Promise<boolean> {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("RESEND_WEBHOOK_SECRET not set, skipping signature verification");
    // In production, you should return false if no secret is set
    return process.env.NODE_ENV === "development";
  }

  try {
    const wh = new Webhook(webhookSecret);
    wh.verify(payload, headers);
    return true;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return false;
  }
}

// Fetch full email details from Resend API
export async function getEmailDetails(emailId: string): Promise<{
  text?: string;
  html?: string;
} | null> {
  try {
    const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch email ${emailId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      text: data.text,
      html: data.html,
    };
  } catch (error) {
    console.error(`Error fetching email ${emailId}:`, error);
    return null;
  }
}

export { resend };
