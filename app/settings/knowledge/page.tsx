"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight,
  Building2,
  Package,
  MessageSquare,
  HelpCircle,
  Workflow,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils/cn";
import type { AIKnowledge } from "@/lib/db/schema";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  company: Building2,
  products: Package,
  tone: MessageSquare,
  faq: HelpCircle,
  procedures: Workflow,
  custom: FileText,
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  company: "Information about your company, team, and mission that the AI will use when composing emails.",
  products: "Details about your products and services to help the AI answer questions accurately.",
  tone: "Guidelines for how emails should be written - tone, formality, language preferences.",
  faq: "Common questions and their answers that the AI can use to respond to similar queries.",
  procedures: "Business processes and workflows that the AI should be aware of.",
  custom: "Any other relevant information that doesn't fit the other categories.",
};

interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
}

export default function KnowledgeSettingsPage() {
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [knowledge, setKnowledge] = useState<AIKnowledge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["company", "products", "tone"]));
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; content: string }>({ title: "", content: "" });
  const [isAddingNew, setIsAddingNew] = useState<string | null>(null);
  const [newForm, setNewForm] = useState<{ title: string; content: string }>({ title: "", content: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const fetchKnowledge = async () => {
    try {
      const res = await fetch("/api/knowledge?activeOnly=false");
      const data = await res.json();
      setKnowledge(data.knowledge || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to fetch knowledge:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const startEditing = (item: AIKnowledge) => {
    setEditingItem(item.id);
    setEditForm({ title: item.title, content: item.content });
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditForm({ title: "", content: "" });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.title.trim() || !editForm.content.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        const data = await res.json();
        setKnowledge((prev) =>
          prev.map((k) => (k.id === id ? data.knowledge : k))
        );
        cancelEditing();
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const startAddingNew = (categoryId: string) => {
    setIsAddingNew(categoryId);
    setNewForm({ title: "", content: "" });
  };

  const cancelAddingNew = () => {
    setIsAddingNew(null);
    setNewForm({ title: "", content: "" });
  };

  const saveNew = async (categoryId: string) => {
    if (!newForm.title.trim() || !newForm.content.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categoryId,
          title: newForm.title,
          content: newForm.content,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setKnowledge((prev) => [...prev, data.knowledge]);
        cancelAddingNew();
      }
    } catch (error) {
      console.error("Failed to create:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this knowledge item?")) return;

    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setKnowledge((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (res.ok) {
        const data = await res.json();
        setKnowledge((prev) =>
          prev.map((k) => (k.id === id ? data.knowledge : k))
        );
      }
    } catch (error) {
      console.error("Failed to toggle:", error);
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          AI Knowledge Base
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage the information that Claude uses when composing and classifying emails.
        </p>
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.id] || FileText;
          const isExpanded = expandedCategories.has(category.id);
          const categoryItems = knowledge.filter((k) => k.category === category.id);

          return (
            <div
              key={category.id}
              className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {categoryItems.length} item{categoryItems.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {/* Category Content */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-800">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/30">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {CATEGORY_DESCRIPTIONS[category.id] || category.description}
                    </p>
                  </div>

                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "p-4",
                          !item.isActive && "opacity-50"
                        )}
                      >
                        {editingItem === item.id ? (
                          <div className="space-y-3">
                            <Input
                              value={editForm.title}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, title: e.target.value }))
                              }
                              placeholder="Title"
                            />
                            <Textarea
                              value={editForm.content}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, content: e.target.value }))
                              }
                              placeholder="Content"
                              rows={4}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditing}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => saveEdit(item.id)}
                                isLoading={isSaving}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                  {item.title}
                                </h4>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                  {item.content}
                                </p>
                                {item.source !== "manual" && (
                                  <p className="mt-2 text-xs text-gray-400">
                                    Source: {item.source}
                                    {item.confidence && ` (${item.confidence}% confidence)`}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 ml-4">
                                <button
                                  onClick={() => toggleActive(item.id, item.isActive ?? true)}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    item.isActive
                                      ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                                      : "text-gray-400 bg-gray-100 dark:bg-gray-800"
                                  )}
                                  title={item.isActive ? "Disable" : "Enable"}
                                >
                                  <div className={cn(
                                    "w-3 h-3 rounded-full",
                                    item.isActive ? "bg-green-500" : "bg-gray-400"
                                  )} />
                                </button>
                                {item.isEditable && (
                                  <>
                                    <button
                                      onClick={() => startEditing(item)}
                                      className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteItem(item.id)}
                                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add New Item */}
                    {isAddingNew === category.id ? (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
                        <div className="space-y-3">
                          <Input
                            value={newForm.title}
                            onChange={(e) =>
                              setNewForm((f) => ({ ...f, title: e.target.value }))
                            }
                            placeholder="Title"
                            autoFocus
                          />
                          <Textarea
                            value={newForm.content}
                            onChange={(e) =>
                              setNewForm((f) => ({ ...f, content: e.target.value }))
                            }
                            placeholder="Content"
                            rows={4}
                          />
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={cancelAddingNew}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveNew(category.id)}
                              isLoading={isSaving}
                              disabled={!newForm.title.trim() || !newForm.content.trim()}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <button
                          onClick={() => startAddingNew(category.id)}
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Plus className="h-4 w-4" />
                          Add {category.name.toLowerCase()} item
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
