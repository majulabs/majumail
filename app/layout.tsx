import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ComposeProvider } from "@/components/providers/ComposeProvider";
import { KeyboardShortcutsModal } from "@/components/ui/KeyboardShortcutsModal";
import { Sidebar } from "@/components/layout/Sidebar";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Theme script to prevent flash of wrong theme
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-950`}
      >
        <ThemeProvider>
          <SessionProvider>
            <ComposeProvider>
              <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-hidden lg:ml-0">{children}</main>
              </div>
              <KeyboardShortcutsModal />
            </ComposeProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}