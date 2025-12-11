import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { db } from "@/lib/db";
import { labels, threadLabels, threads, emails } from "@/lib/db/schema";
import { sql, asc, eq, and } from "drizzle-orm";
import { ClientSSERefresher } from "@/app/inbox/ClientSSERefresher";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MajuMail",
  description: "A simple, clean shared email client for Marcel and Julien",
};

async function getLabelsWithCounts() {
  const labelsWithCounts = await db
    .select({
      label: labels,
      threadCount: sql<number>`count(DISTINCT ${threadLabels.threadId})::int`,
      unreadCount: sql<number>`count(DISTINCT CASE WHEN ${threads.isRead} = false AND ${threads.isTrashed} = false THEN ${threadLabels.threadId} END)::int`,
    })
    .from(labels)
    .leftJoin(threadLabels, eq(labels.id, threadLabels.labelId))
    .leftJoin(threads, eq(threadLabels.threadId, threads.id))
    .groupBy(labels.id)
    .orderBy(asc(labels.sortOrder), asc(labels.name));

  const inboxUnreadResult = await db
    .selectDistinct({ threadId: threads.id })
    .from(threads)
    .innerJoin(emails, eq(threads.id, emails.threadId))
    .where(
      and(
        eq(emails.direction, "inbound"),
        eq(threads.isRead, false),
        eq(threads.isTrashed, false),
        eq(threads.isArchived, false)
      )
    );

  return {
    labels: labelsWithCounts.map((l) => ({
      ...l.label,
      threadCount: l.threadCount,
      unreadCount: l.unreadCount,
    })),
    inboxUnreadCount: inboxUnreadResult.length,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { labels: labelsData, inboxUnreadCount } = await getLabelsWithCounts();

  const themeScript = `
    (function() {
      const theme = localStorage.getItem('theme') || 'system';
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (theme === 'system' && systemDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-950`}>
        <ThemeProvider>
          <SessionProvider>
            <div className="flex h-screen overflow-hidden">
              <ClientSSERefresher />
              <Sidebar />
              <main className="flex-1 overflow-hidden lg:ml-0">{children}</main>
            </div>
            <KeyboardShortcutsModal />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
