import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ComposeProvider } from "@/components/providers/ComposeProvider";
import { RoleProvider } from "@/components/providers/RoleProvider";
import { PWAProvider } from "@/components/providers/PWAProvider";
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
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/mm-icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MajuMail",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "MajuMail",
    title: "MajuMail",
    description: "A simple, clean shared email client for Marcel and Julien",
  },
  twitter: {
    card: "summary",
    title: "MajuMail",
    description: "A simple, clean shared email client for Marcel and Julien",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // IMPORTANT: Theme script to prevent flash of wrong theme
  // This runs BEFORE React hydrates, ensuring correct theme is applied immediately
  const themeScript = `
    (function() {
      try {
        const theme = localStorage.getItem('theme') || 'system';
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = theme === 'dark' || (theme === 'system' && systemDark);
        
        // CRITICAL: Remove dark class for light mode, add for dark mode
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {
        // If localStorage fails, default to system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        }
      }
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme script must be FIRST to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* PWA Meta Tags */}
        <link rel="icon" href="/mm-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-950`}
      >
        <SessionProvider>
          <ThemeProvider>
            <RoleProvider>
              <PWAProvider>
                <ComposeProvider>
                  <div className="flex h-screen overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 overflow-hidden">{children}</main>
                  </div>
                  <KeyboardShortcutsModal />
                </ComposeProvider>
              </PWAProvider>
            </RoleProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}