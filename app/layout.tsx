import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ComposeProvider } from "@/components/providers/ComposeProvider";
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
    { media: "(prefers-color-scheme: light)", color: "#20293A" },
    { media: "(prefers-color-scheme: dark)", color: "#20293A" },
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
        {/* PWA Meta Tags */}
        <link rel="icon" href="/mm-icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-152x152.png" />
        {/* iOS Splash Screens - optional, create these images if needed */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MajuMail" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#20293A" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-950`}
      >
        <ThemeProvider>
          <SessionProvider>
            <PWAProvider>
              <ComposeProvider>
                <div className="flex h-screen h-[100dvh] overflow-hidden">
                  <Sidebar />
                  <main className="flex-1 overflow-hidden lg:ml-0">{children}</main>
                </div>
                <KeyboardShortcutsModal />
              </ComposeProvider>
            </PWAProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}