"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  User, 
  Building2, 
  Mail, 
  MessageSquare,
  Sparkles,
  ExternalLink,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Contact, ContactKnowledge } from "@/lib/db/schema";
import { CONTACT_TYPES } from "@/lib/db/schema";

interface ContactInsightsProps {
  email: string;
  className?: string;
}

interface ContactData {
  contact: Contact;
  knowledge: ContactKnowledge[];
  recentEmails: {
    id: string;
    threadId: string;
    subject: string;
    direction: string;
    sentAt: Date;
  }[];
}

export function ContactInsights({ email, className }: ContactInsightsProps) {
  const [data, setData] = useState<ContactData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) return;

    const fetchContact = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First, search for contact by email
        const searchRes = await fetch(`/api/contacts?q=${encodeURIComponent(email)}&limit=1`);
        const searchData = await searchRes.json();

        if (searchData.contacts && searchData.contacts.length > 0) {
          const contact = searchData.contacts[0];
          
          // Fetch full details
          const detailRes = await fetch(`/api/contacts/${contact.id}`);
          const detailData = await detailRes.json();
          
          setData({
            contact: detailData.contact,
            knowledge: detailData.knowledge || [],
            recentEmails: detailData.recentEmails || [],
          });
        } else {
          setData(null);
        }
      } catch (err) {
        console.error("Failed to fetch contact:", err);
        setError("Failed to load contact");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContact();
  }, [email]);

  if (isLoading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading contact...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <User className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error || "Contact not found"}
        </p>
        <p className="text-xs text-gray-400 mt-1">{email}</p>
      </div>
    );
  }

  const { contact, knowledge, recentEmails } = data;
  const typeConfig = CONTACT_TYPES.find((t) => t.id === contact.type);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Contact Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
          style={{ backgroundColor: typeConfig?.color || "#6b7280" }}
        >
          {contact.name?.[0]?.toUpperCase() || contact.email[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {contact.name || contact.email}
          </h3>
          {contact.name && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {contact.email}
            </p>
          )}
          {typeConfig && contact.type !== "contact" && (
            <span
              className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium text-white"
              style={{ backgroundColor: typeConfig.color }}
            >
              {typeConfig.name}
            </span>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div className="space-y-2">
        {contact.company && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {contact.role && `${contact.role} at `}
              {contact.company}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">
            {contact.emailCount || 0} emails
          </span>
        </div>
        {contact.communicationStyle && (
          <div className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300 capitalize">
              {contact.communicationStyle} style
            </span>
          </div>
        )}
      </div>

      {/* AI Summary */}
      {contact.summary && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-1">
            <Sparkles className="h-3 w-3" />
            <span>AI Summary</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {contact.summary}
          </p>
        </div>
      )}

      {/* Knowledge Items */}
      {knowledge.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Key Information
          </h4>
          <div className="space-y-2">
            {knowledge.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <span className="text-gray-400">{item.field}:</span>{" "}
                <span className="text-gray-700 dark:text-gray-300">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interests/Tags */}
      {contact.interests && contact.interests.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Interests
          </h4>
          <div className="flex flex-wrap gap-1">
            {contact.interests.map((interest, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {contact.notes && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Notes
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {contact.notes}
          </p>
        </div>
      )}

      {/* View Full Profile Link */}
      <Link
        href={`/contacts?selected=${contact.id}`}
        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
      >
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          View Full Profile
        </span>
        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
      </Link>
    </div>
  );
}
