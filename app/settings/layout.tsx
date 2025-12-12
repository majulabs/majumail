"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Settings, 
  Brain, 
  Sparkles, 
  Users, 
  ArrowLeft,
  Database,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const settingsNav = [
  {
    name: "AI Knowledge",
    href: "/settings/knowledge",
    icon: Database,
    description: "Manage AI context and knowledge base",
  },
  {
    name: "AI Settings",
    href: "/settings/ai",
    icon: Sparkles,
    description: "Configure AI features and auto-learning",
  },
  {
    name: "Pending Review",
    href: "/settings/pending",
    icon: Bell,
    description: "Review AI-extracted knowledge",
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/inbox"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Back to Inbox</span>
              </Link>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Settings
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <nav className="lg:w-64 flex-shrink-0">
              <ul className="space-y-1 lg:sticky lg:top-8">
                {settingsNav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Main Content */}
            <main className="flex-1 min-w-0 pb-8">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}