"use client";

import { useState, useEffect } from "react";
import { 
  Loader2, 
  Save,
  Brain,
  Sparkles,
  Users,
  FileText,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { AISettingsConfig } from "@/lib/types";
import { DEFAULT_AI_SETTINGS } from "@/lib/types";

interface SettingToggleProps {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function SettingToggle({ icon: Icon, title, description, enabled, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between py-4">
      <div className="flex gap-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg h-fit">
          <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100">{title}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            enabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

interface SettingSliderProps {
  icon: React.ElementType;
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

function SettingSlider({ icon: Icon, title, description, value, onChange, min, max, step, unit = "%" }: SettingSliderProps) {
  return (
    <div className="py-4">
      <div className="flex gap-3">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg h-fit">
          <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-gray-100">{title}</h4>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {value}{unit}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full mt-3 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{min}{unit}</span>
            <span>{max}{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AISettingsPage() {
  const [settings, setSettings] = useState<AISettingsConfig>(DEFAULT_AI_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/ai/settings");
      const data = await res.json();
      setSettings(data.settings || DEFAULT_AI_SETTINGS);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = <K extends keyof AISettingsConfig>(
    key: K,
    value: AISettingsConfig[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setHasChanges(false);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            AI Settings
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Configure how AI features work in MajuMail.
          </p>
        </div>
        {hasChanges && (
          <Button onClick={saveSettings} isLoading={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        {/* Auto-Learning Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Auto-Learning
          </h3>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            <SettingToggle
              icon={Brain}
              title="Learn from Emails"
              description="Automatically extract and store useful information from incoming and outgoing emails."
              enabled={settings.autoLearnFromEmails}
              onChange={(v) => updateSetting("autoLearnFromEmails", v)}
            />
            <SettingSlider
              icon={Sparkles}
              title="Auto-Learn Confidence Threshold"
              description="Minimum confidence level for automatically adding extracted knowledge. Lower values add more items but may include less accurate information."
              value={settings.autoLearnConfidenceThreshold}
              onChange={(v) => updateSetting("autoLearnConfidenceThreshold", v)}
              min={50}
              max={100}
              step={5}
            />
            <SettingToggle
              icon={Users}
              title="Auto-Create Contacts"
              description="Automatically create contact entries for new email addresses."
              enabled={settings.autoCreateContacts}
              onChange={(v) => updateSetting("autoCreateContacts", v)}
            />
          </div>
        </div>

        {/* AI Features Section */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            AI Features
          </h3>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            <SettingToggle
              icon={MessageSquare}
              title="Thread Summaries"
              description="Generate AI summaries for email threads with multiple messages."
              enabled={settings.generateThreadSummaries}
              onChange={(v) => updateSetting("generateThreadSummaries", v)}
            />
            <SettingToggle
              icon={Sparkles}
              title="Smart Reply Suggestions"
              description="Show AI-generated quick reply suggestions when viewing emails."
              enabled={settings.generateSmartReplies}
              onChange={(v) => updateSetting("generateSmartReplies", v)}
            />
            <SettingToggle
              icon={FileText}
              title="Attachment Summaries"
              description="Automatically summarize attachments (PDFs, documents, images) using AI."
              enabled={settings.summarizeAttachments}
              onChange={(v) => updateSetting("summarizeAttachments", v)}
            />
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100">
          About AI Features
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
          AI features use Claude by Anthropic to help you manage emails more efficiently. 
          All AI processing happens securely and your data is not used to train AI models.
          Knowledge extracted with confidence below the threshold will be queued for your review.
        </p>
      </div>
    </div>
  );
}
