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
  AlertCircle,
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

// Detailed descriptions that explain how each category influences AI composition
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  company: "Firmeninfos (Name, Team, Kontakt), die die AI in E-Mails verwendet wenn es um euer Unternehmen geht.",
  products: "Produkt- und Service-Details, die die AI nutzt um Kundenfragen zu euren Angeboten zu beantworten.",
  tone: "Kommunikationsrichtlinien (Ton, Sprache, Anrede, Grußformel), die die AI in JEDER E-Mail befolgt.",
  faq: "Häufige Fragen und Antworten, aus denen die AI bei ähnlichen Anfragen schöpfen kann.",
  procedures: "Prozesse (Support, Billing, Feature Requests), die bestimmen wie die AI verschiedene Situationen handhabt.",
  custom: "Sonstige relevante Infos, die in keine andere Kategorie passen aber die AI kennen sollte.",
};

// Example titles for each category to guide users
const CATEGORY_EXAMPLES: Record<string, string[]> = {
  company: ["Über RechnungsAPI", "Unser Team", "Kontakt & Support"],
  products: ["API-Funktionen", "Preise & Pläne", "Unterstützte Formate"],
  tone: ["Kommunikationsstil", "Sprache & Anrede", "E-Mail Abschluss"],
  faq: ["Erste Schritte", "XRechnung vs ZUGFeRD", "Dokumentenspeicherung"],
  procedures: ["Technischer Support", "Upgrade & Billing", "Feature Requests"],
  custom: ["Partner-Infos", "Saisonale Hinweise", "Aktuelle Aktionen"],
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["company", "tone"]));
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; content: string }>({ title: "", content: "" });
  const [isAddingNew, setIsAddingNew] = useState<string | null>(null);
  const [newForm, setNewForm] = useState<{ title: string; content: string }>({ title: "", content: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

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
    setDuplicateWarning(null);
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditForm({ title: "", content: "" });
    setDuplicateWarning(null);
  };

  // Check for duplicate titles within the same category
  const checkForDuplicates = (categoryId: string, title: string, excludeId?: string): boolean => {
    const normalizedTitle = title.toLowerCase().trim();
    const existingItems = knowledge.filter(k => 
      k.category === categoryId && 
      k.id !== excludeId &&
      k.title.toLowerCase().trim() === normalizedTitle
    );
    return existingItems.length > 0;
  };

  // Check for similar titles
  const checkForSimilar = (categoryId: string, title: string, excludeId?: string): string[] => {
    const normalizedTitle = title.toLowerCase().trim();
    const words = normalizedTitle.split(/\s+/).filter(w => w.length > 3);
    
    const similarItems = knowledge.filter(k => {
      if (k.category !== categoryId || k.id === excludeId) return false;
      const existingWords = k.title.toLowerCase().split(/\s+/);
      const matchingWords = words.filter(w => existingWords.some(ew => ew.includes(w) || w.includes(ew)));
      return matchingWords.length >= 1;
    });

    return similarItems.map(k => k.title);
  };

  const saveEdit = async (id: string) => {
    if (!editForm.title.trim() || !editForm.content.trim()) return;

    const item = knowledge.find(k => k.id === id);
    if (!item) return;

    // Check for duplicates
    if (checkForDuplicates(item.category, editForm.title, id)) {
      setDuplicateWarning(`Ein Eintrag mit dem Titel "${editForm.title}" existiert bereits in dieser Kategorie.`);
      return;
    }

    // Check for similar items and warn
    const similar = checkForSimilar(item.category, editForm.title, id);
    if (similar.length > 0 && !duplicateWarning) {
      setDuplicateWarning(`Ähnliche Einträge existieren: ${similar.join(", ")}. Nochmal speichern zum Bestätigen.`);
      return;
    }

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
    setDuplicateWarning(null);
  };

  const cancelAddingNew = () => {
    setIsAddingNew(null);
    setNewForm({ title: "", content: "" });
    setDuplicateWarning(null);
  };

  const saveNew = async (categoryId: string) => {
    if (!newForm.title.trim() || !newForm.content.trim()) return;

    // Check for duplicates
    if (checkForDuplicates(categoryId, newForm.title)) {
      setDuplicateWarning(`Ein Eintrag mit dem Titel "${newForm.title}" existiert bereits in dieser Kategorie.`);
      return;
    }

    // Check for similar items and warn
    const similar = checkForSimilar(categoryId, newForm.title);
    if (similar.length > 0 && !duplicateWarning) {
      setDuplicateWarning(`Ähnliche Einträge existieren: ${similar.join(", ")}. Nochmal speichern zum Bestätigen.`);
      return;
    }

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
    if (!confirm("Bist du sicher, dass du diesen Eintrag löschen möchtest?")) return;

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
          Verwalte die Informationen, die die AI beim Schreiben von E-Mails verwendet.
          Jede Kategorie beeinflusst unterschiedliche Aspekte der generierten E-Mails.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">So funktioniert's:</p>
            <p>
              Die AI liest alle aktiven Einträge beim Schreiben von E-Mails. Füge einzigartige, 
              spezifische Informationen in jeder Kategorie hinzu. Vermeide Duplikate oder 
              überlappende Einträge – das kann die AI verwirren.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.id] || FileText;
          const isExpanded = expandedCategories.has(category.id);
          const categoryItems = knowledge.filter((k) => k.category === category.id);
          const activeCount = categoryItems.filter(k => k.isActive).length;
          const examples = CATEGORY_EXAMPLES[category.id] || [];

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
                      {activeCount} active / {categoryItems.length} total
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
                  {/* Description and examples */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/30 space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {CATEGORY_DESCRIPTIONS[category.id] || category.description}
                    </p>
                    {examples.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        <span className="font-medium">Example titles:</span> {examples.join(", ")}
                      </p>
                    )}
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
                          // Edit mode
                          <div className="space-y-3">
                            <Input
                              value={editForm.title}
                              onChange={(e) => {
                                setEditForm({ ...editForm, title: e.target.value });
                                setDuplicateWarning(null);
                              }}
                              placeholder="Titel"
                              className="font-medium"
                            />
                            <Textarea
                              value={editForm.content}
                              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                              placeholder="Inhalt - Sei spezifisch und detailliert"
                              rows={4}
                            />
                            {duplicateWarning && (
                              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" />
                                {duplicateWarning}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEdit(item.id)}
                                disabled={isSaving}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                                <span className="ml-1">Speichern</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEditing}
                              >
                                <X className="h-4 w-4" />
                                <span className="ml-1">Abbrechen</span>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div className="flex items-start justify-between gap-4">
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
                                  {item.confidence && ` • Confidence: ${item.confidence}%`}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => toggleActive(item.id, item.isActive ?? true)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors",
                                  item.isActive
                                    ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                                    : "text-gray-400 bg-gray-100 dark:bg-gray-800"
                                )}
                                title={item.isActive ? "Deaktivieren (AI nutzt das nicht)" : "Aktivieren (AI nutzt das)"}
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
                                    title="Bearbeiten"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteItem(item.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                    title="Löschen"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add New Item */}
                    {isAddingNew === category.id ? (
                      <div className="p-4 space-y-3">
                        <Input
                          value={newForm.title}
                          onChange={(e) => {
                            setNewForm({ ...newForm, title: e.target.value });
                            setDuplicateWarning(null);
                          }}
                          placeholder={`Titel (z.B. ${examples[0] || "Neuer Eintrag"})`}
                          className="font-medium"
                          autoFocus
                        />
                        <Textarea
                          value={newForm.content}
                          onChange={(e) => setNewForm({ ...newForm, content: e.target.value })}
                          placeholder="Inhalt - Sei spezifisch und detailliert, damit die AI die Info effektiv nutzen kann"
                          rows={4}
                        />
                        {duplicateWarning && (
                          <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {duplicateWarning}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveNew(category.id)}
                            disabled={isSaving || !newForm.title.trim() || !newForm.content.trim()}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            <span className="ml-1">Speichern</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelAddingNew}
                          >
                            <X className="h-4 w-4" />
                            <span className="ml-1">Abbrechen</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startAddingNew(category.id)}
                          className="w-full justify-center border border-dashed border-gray-300 dark:border-gray-700"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {category.name} Eintrag hinzufügen
                        </Button>
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