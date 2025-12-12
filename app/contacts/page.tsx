"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  Plus, 
  Filter,
  Loader2,
  Mail,
  Building2,
  Phone,
  Globe,
  MapPin,
  User,
  MoreVertical,
  Sparkles,
  Trash2,
  ExternalLink,
  X,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils/cn";
import type { Contact, ContactKnowledge } from "@/lib/db/schema";
import { CONTACT_TYPES, CONTACT_STATUSES } from "@/lib/db/schema";

interface ContactWithDetails extends Contact {
  knowledge?: ContactKnowledge[];
  recentEmails?: {
    id: string;
    threadId: string;
    subject: string;
    direction: string;
    sentAt: Date;
    snippet: string;
  }[];
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterType, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchContacts]);

  const fetchContactDetail = async (id: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/contacts/${id}`);
      const data = await res.json();
      setSelectedContact({
        ...data.contact,
        knowledge: data.knowledge,
        recentEmails: data.recentEmails,
      });
    } catch (error) {
      console.error("Failed to fetch contact:", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const enrichContact = async () => {
    if (!selectedContact) return;
    setIsEnriching(true);
    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}/enrich`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.contact) {
        setSelectedContact({
          ...data.contact,
          knowledge: data.knowledge,
          recentEmails: selectedContact.recentEmails,
        });
        // Update in list
        setContacts((prev) =>
          prev.map((c) => (c.id === data.contact.id ? data.contact : c))
        );
      }
    } catch (error) {
      console.error("Failed to enrich contact:", error);
    } finally {
      setIsEnriching(false);
    }
  };

  const deleteContact = async () => {
    if (!selectedContact || !confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
        setSelectedContact(null);
      }
    } catch (error) {
      console.error("Failed to delete contact:", error);
    }
  };

  const getTypeColor = (type: string) => {
    return CONTACT_TYPES.find((t) => t.id === type)?.color || "#6b7280";
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/inbox"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Inbox</span>
              </Link>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Contacts
              </h1>
              <span className="text-sm text-gray-500">({total})</span>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-gray-100 dark:bg-gray-800")}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-3 flex gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">All Types</option>
                {CONTACT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">All Statuses</option>
                {CONTACT_STATUSES.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contact List */}
        <div className="w-full lg:w-1/2 xl:w-2/5 overflow-y-auto border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center">
              <User className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "No contacts found" : "No contacts yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => fetchContactDetail(contact.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
                    selectedContact?.id === contact.id && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                      style={{ backgroundColor: getTypeColor(contact.type || "contact") }}
                    >
                      {contact.name?.[0]?.toUpperCase() || contact.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {contact.name || contact.email}
                        </p>
                        {contact.type && contact.type !== "contact" && (
                          <span
                            className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: getTypeColor(contact.type) }}
                          >
                            {contact.type}
                          </span>
                        )}
                      </div>
                      {contact.name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {contact.email}
                        </p>
                      )}
                      {contact.company && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 truncate">
                          {contact.company}
                          {contact.role && ` · ${contact.role}`}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {contact.emailCount || 0} emails
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contact Detail */}
        <div className="hidden lg:flex flex-1 flex-col bg-white dark:bg-gray-900">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : selectedContact ? (
            <ContactDetail
              contact={selectedContact}
              onEnrich={enrichContact}
              onDelete={deleteContact}
              isEnriching={isEnriching}
              onUpdate={(updated) => {
                setSelectedContact(updated);
                setContacts((prev) =>
                  prev.map((c) => (c.id === updated.id ? updated : c))
                );
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                <p>Select a contact to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onCreated={(contact) => {
            setContacts((prev) => [contact, ...prev]);
            setTotal((t) => t + 1);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

// Contact Detail Component
function ContactDetail({
  contact,
  onEnrich,
  onDelete,
  isEnriching,
  onUpdate,
}: {
  contact: ContactWithDetails;
  onEnrich: () => void;
  onDelete: () => void;
  isEnriching: boolean;
  onUpdate: (contact: ContactWithDetails) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: contact.name || "",
    company: contact.company || "",
    role: contact.role || "",
    phone: contact.phone || "",
    website: contact.website || "",
    location: contact.location || "",
    type: contact.type || "contact",
    notes: contact.notes || "",
  });

  const saveEdit = async () => {
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate({ ...contact, ...data.contact });
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
              style={{
                backgroundColor:
                  CONTACT_TYPES.find((t) => t.id === contact.type)?.color || "#6b7280",
              }}
            >
              {contact.name?.[0]?.toUpperCase() || contact.email[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {contact.name || contact.email}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">{contact.email}</p>
              {contact.company && (
                <p className="text-sm text-gray-400">
                  {contact.role && `${contact.role} at `}
                  {contact.company}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEnrich} isLoading={isEnriching}>
              <Sparkles className="h-4 w-4 mr-1" />
              Enrich with AI
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="p-6 grid grid-cols-2 gap-4">
        <InfoCard
          icon={Building2}
          label="Company"
          value={contact.company}
          editable={isEditing}
          editValue={editForm.company}
          onEditChange={(v) => setEditForm((f) => ({ ...f, company: v }))}
        />
        <InfoCard
          icon={User}
          label="Role"
          value={contact.role}
          editable={isEditing}
          editValue={editForm.role}
          onEditChange={(v) => setEditForm((f) => ({ ...f, role: v }))}
        />
        <InfoCard
          icon={Phone}
          label="Phone"
          value={contact.phone}
          editable={isEditing}
          editValue={editForm.phone}
          onEditChange={(v) => setEditForm((f) => ({ ...f, phone: v }))}
        />
        <InfoCard
          icon={Globe}
          label="Website"
          value={contact.website}
          editable={isEditing}
          editValue={editForm.website}
          onEditChange={(v) => setEditForm((f) => ({ ...f, website: v }))}
        />
        <InfoCard
          icon={MapPin}
          label="Location"
          value={contact.location}
          editable={isEditing}
          editValue={editForm.location}
          onEditChange={(v) => setEditForm((f) => ({ ...f, location: v }))}
        />
        <InfoCard
          icon={Mail}
          label="Emails"
          value={`${contact.emailCount || 0} total`}
        />
      </div>

      {/* Edit / Save Buttons */}
      <div className="px-6 pb-4">
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Edit Contact
          </Button>
        )}
      </div>

      {/* AI Summary */}
      {contact.summary && (
        <div className="px-6 pb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            AI Summary
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            {contact.summary}
          </p>
        </div>
      )}

      {/* Knowledge */}
      {contact.knowledge && contact.knowledge.length > 0 && (
        <div className="px-6 pb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Knowledge
          </h3>
          <div className="space-y-2">
            {contact.knowledge.map((k) => (
              <div
                key={k.id}
                className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"
              >
                <span className="text-gray-400">{k.field}:</span>{" "}
                <span className="text-gray-700 dark:text-gray-300">{k.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="px-6 pb-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Notes
        </h3>
        {isEditing ? (
          <textarea
            value={editForm.notes}
            onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm"
            rows={3}
            placeholder="Add notes about this contact..."
          />
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg min-h-[60px]">
            {contact.notes || "No notes yet"}
          </p>
        )}
      </div>

      {/* Recent Emails */}
      {contact.recentEmails && contact.recentEmails.length > 0 && (
        <div className="px-6 pb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recent Emails
          </h3>
          <div className="space-y-2">
            {contact.recentEmails.map((email) => (
              <Link
                key={email.id}
                href={`/inbox/${email.threadId}`}
                className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">
                    {email.direction === "inbound" ? "Received" : "Sent"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(email.sentAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {email.subject || "(no subject)"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Info Card Component
function InfoCard({
  icon: Icon,
  label,
  value,
  editable,
  editValue,
  onEditChange,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  editable?: boolean;
  editValue?: string;
  onEditChange?: (value: string) => void;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
      <div className="flex items-center gap-2 text-gray-400 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      {editable && onEditChange ? (
        <input
          type="text"
          value={editValue || ""}
          onChange={(e) => onEditChange(e.target.value)}
          className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <p className="text-sm text-gray-900 dark:text-gray-100">
          {value || <span className="text-gray-400">—</span>}
        </p>
      )}
    </div>
  );
}

// Add Contact Modal
function AddContactModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (contact: Contact) => void;
}) {
  const [form, setForm] = useState({
    email: "",
    name: "",
    company: "",
    role: "",
    type: "contact",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) {
      setError("Email is required");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create contact");
        return;
      }

      onCreated(data.contact);
    } catch (err) {
      setError("Failed to create contact");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Add Contact
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="contact@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company
              </label>
              <Input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <Input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="Job title"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
            >
              {CONTACT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Contact
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
