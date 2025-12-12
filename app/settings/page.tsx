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
  ArrowLeft,
  Check,
} from "lucide-react";
import Link from "next/link";

interface Mailbox {
  id: string;
  address: string;
  displayName: string | null;
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [activeSection, setActiveSection] = useState("appearance");
  const [displayName, setDisplayName] = useState(session?.user?.name || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Fetch mailboxes
    fetch("/api/mailboxes")
      .then((res) => res.json())
      .then((data) => setMailboxes(data.mailboxes || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (session?.user?.name) {
      setDisplayName(session.user.name);
    }
  }, [session?.user?.name]);

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName.trim() }),
      });

      if (res.ok) {
        // Update the session with new name
        await updateSession({ name: displayName.trim() });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        console.error("Failed to update profile");
      }
    } catch (error) {
      console.error("Failed to save display name:", error);
    } finally {
      setIsSaving(false);
    }
  };

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
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                      <ChevronRight className="h-4 w-4 ml-auto" />
                    </button>
                  );
                })}
              </div>

              {/* Sign Out Button */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </nav>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {activeSection === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Appearance
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Customize the look and feel of your inbox
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Theme
                      </label>
                      <ThemeSelector />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                      Keyboard Shortcuts
                    </h3>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        document.dispatchEvent(
                          new CustomEvent("show-shortcuts-modal")
                        )
                      }
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
                      <div className="flex gap-2">
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your name"
                          className="flex-1"
                        />
                        <Button
                          onClick={handleSaveDisplayName}
                          disabled={
                            isSaving ||
                            !displayName.trim() ||
                            displayName === session?.user?.name
                          }
                        >
                          {saveSuccess ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Saved
                            </>
                          ) : isSaving ? (
                            "Saving..."
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
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
                      Manage your sending identities
                    </p>
                  </div>

                  <div className="space-y-3">
                    {mailboxes.map((mailbox) => (
                      <div
                        key={mailbox.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {mailbox.displayName || mailbox.address}
                          </p>
                          <p className="text-sm text-gray-500">
                            {mailbox.address}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </span>
                      </div>
                    ))}

                    {mailboxes.length === 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                        No mailboxes configured
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
                    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          Browser notifications
                        </p>
                        <p className="text-sm text-gray-500">
                          Get notified when new emails arrive
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Coming soon
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          Sound alerts
                        </p>
                        <p className="text-sm text-gray-500">
                          Play a sound for new emails
                        </p>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Coming soon
                      </span>
                    </div>
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