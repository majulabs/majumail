import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { threads, emails, threadLabels, labels } from "@/lib/db/schema";
import { eq, desc, and, or, ilike, sql, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim();
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!query) {
    return NextResponse.json({ threads: [], emails: [], total: 0 });
  }

  try {
    // Search in threads and emails
    const searchPattern = `%${query}%`;

    // Find emails matching the search
    const matchingEmails = await db
      .select({
        id: emails.id,
        threadId: emails.threadId,
        subject: emails.subject,
        fromAddress: emails.fromAddress,
        fromName: emails.fromName,
        snippet: emails.bodyText,
        sentAt: emails.sentAt,
      })
      .from(emails)
      .where(
        or(
          ilike(emails.subject, searchPattern),
          ilike(emails.bodyText, searchPattern),
          ilike(emails.fromAddress, searchPattern),
          ilike(emails.fromName, searchPattern),
          sql`array_to_string(${emails.toAddresses}, ',') ILIKE ${searchPattern}`
        )
      )
      .orderBy(desc(emails.sentAt))
      .limit(limit * 2); // Get more emails to group by thread

    // Get unique thread IDs
    const threadIds = [...new Set(matchingEmails.map((e) => e.threadId).filter(Boolean))] as string[];

    if (threadIds.length === 0) {
      return NextResponse.json({ threads: [], emails: [], total: 0 });
    }

    // Get threads with their labels
    const [threadsResult, countResult] = await Promise.all([
      db
        .select()
        .from(threads)
        .where(
          and(
            inArray(threads.id, threadIds),
            eq(threads.isTrashed, false)
          )
        )
        .orderBy(desc(threads.lastMessageAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(threads)
        .where(
          and(
            inArray(threads.id, threadIds),
            eq(threads.isTrashed, false)
          )
        ),
    ]);

    // Get labels for threads
    const threadIdsToFetch = threadsResult.map((t) => t.id);
    let labelsForThreads: Array<{
      threadId: string;
      label: typeof labels.$inferSelect;
    }> = [];

    if (threadIdsToFetch.length > 0) {
      labelsForThreads = await db
        .select({
          threadId: threadLabels.threadId,
          label: labels,
        })
        .from(threadLabels)
        .innerJoin(labels, eq(threadLabels.labelId, labels.id))
        .where(inArray(threadLabels.threadId, threadIdsToFetch));
    }

    // Group labels by thread
    const labelsByThread = labelsForThreads.reduce(
      (acc, item) => {
        if (!acc[item.threadId]) {
          acc[item.threadId] = [];
        }
        acc[item.threadId].push(item.label);
        return acc;
      },
      {} as Record<string, Array<typeof labels.$inferSelect>>
    );

    const threadsWithLabels = threadsResult.map((thread) => ({
      ...thread,
      labels: labelsByThread[thread.id] || [],
      // Add highlighted snippet if available
      matchedEmail: matchingEmails.find((e) => e.threadId === thread.id),
    }));

    return NextResponse.json({
      threads: threadsWithLabels,
      total: Number(countResult[0]?.count || 0),
      query,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search emails" },
      { status: 500 }
    );
  }
}
