"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Header } from "@/components/layout/Header";
import { ThemeSelector } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  User, 
  Mail, 
  Bell, 
  Shield, 
  LogOut, 
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

interface Mailbox {
  id: string;
  address: string;
  displayName: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [activeSection, setActiveSection] = useState("appearance");

  useEffect(() => {
    // Fetch mailboxes
    fetch("/api/mailboxes")
      .then((res) => res.json())
      .then((data) => setMailboxes(data.mailboxes || []))
      .catch(console.error);
  }, []);

  const sections = [
    { id: "appearance", label: "Appearance", icon: Shield },
    { id: "account", label: "Account", icon: User },
    { id: "mailboxes", label: "Mailboxes", icon: Mail },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="h-full flex flex-col">
      <Header title="Settings" showSearch={false} />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Back link */}
          <Link 
            href="/inbox" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to inbox
          </Link>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <nav className="lg:w-48 shrink-0">
              <div className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeSection === section.id
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{section.label}</span>
                      <ChevronRight className="h-4 w-4 ml-auto opacity-50" />
                    </button>
                  );
                })}
              </div>
              
              {/* Sign out button */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </nav>

            {/* Content Area */}
            <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              {activeSection === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Appearance
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Customize how MajuMail looks on your device
                    </p>
                  </div>

                  <ThemeSelector />

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Keyboard Shortcuts
                    </h3>
                    <Button
                      variant="secondary"
                      onClick={() => document.dispatchEvent(new CustomEvent("show-shortcuts-modal"))}
                    >
                      View all shortcuts
                    </Button>
                  </div>
                </div>
              )}

              {activeSection === "account" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Account
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manage your account settings
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <Input
                        value={session?.user?.email || ""}
                        disabled
                        className="bg-gray-50 dark:bg-gray-800"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Your email address is used for sign in
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Display Name
                      </label>
                      <Input
                        defaultValue={session?.user?.name || ""}
                        placeholder="Your name"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "mailboxes" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Mailboxes
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manage your sender identities
                    </p>
                  </div>

                  <div className="space-y-3">
                    {mailboxes.map((mailbox) => (
                      <div
                        key={mailbox.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {mailbox.displayName || mailbox.address}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {mailbox.address}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                          Active
                        </span>
                      </div>
                    ))}
                    {mailboxes.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                        No mailboxes configured yet
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeSection === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Notifications
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Configure how you receive notifications
                    </p>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          Browser notifications
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Get notified when new emails arrive
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          Sound
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Play a sound for new emails
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
