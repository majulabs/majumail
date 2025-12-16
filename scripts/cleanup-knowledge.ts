#!/usr/bin/env tsx
/**
 * MajuMail Knowledge Base Cleanup Script
 * 
 * This script removes duplicate and similar knowledge entries from the database.
 * Run this BEFORE reseeding to clean up existing duplicates.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-knowledge.ts
 *   npm run db:cleanup-knowledge  (add to package.json scripts)
 */

import "dotenv/config";
import { db } from "../lib/db";
import { aiKnowledge } from "../lib/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";

/**
 * Patterns that identify duplicate/similar entries
 * These will be removed before reseeding with clean data
 */
const DUPLICATE_PATTERNS = [
  // Exact title matches that are duplicates
  { category: "company", titlePattern: "Company Name" },
  { category: "company", titlePattern: "Team Members" },
  { category: "company", titlePattern: "Team" },
  { category: "tone", titlePattern: "Communication Style" },
  { category: "tone", titlePattern: "Email Signature" },
  { category: "tone", titlePattern: "Signature" },
  { category: "tone", titlePattern: "Language Detection" },
];

async function cleanupDuplicates() {
  console.log("🧹 Starting knowledge base cleanup...\n");

  let totalDeleted = 0;

  // First, let's see what we have
  const allKnowledge = await db.select().from(aiKnowledge);
  console.log(`📊 Found ${allKnowledge.length} total knowledge entries\n`);

  // Group by category and title to find duplicates
  const groupedByKey: Record<string, typeof allKnowledge> = {};
  
  for (const item of allKnowledge) {
    // Normalize the key for comparison
    const normalizedTitle = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const key = `${item.category}:${normalizedTitle}`;
    
    if (!groupedByKey[key]) {
      groupedByKey[key] = [];
    }
    groupedByKey[key].push(item);
  }

  // Find and report duplicates
  console.log("🔍 Checking for duplicates...\n");
  
  for (const [key, items] of Object.entries(groupedByKey)) {
    if (items.length > 1) {
      console.log(`  ⚠️  Duplicate found: "${key}" (${items.length} entries)`);
      items.forEach((item, idx) => {
        console.log(`      ${idx + 1}. ID: ${item.id.substring(0, 8)}... Title: "${item.title}"`);
      });
      
      // Keep the first one (oldest by creation), delete the rest
      const [keep, ...remove] = items.sort((a, b) => 
        (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
      );
      
      console.log(`      → Keeping: ${keep.id.substring(0, 8)}...`);
      
      for (const item of remove) {
        await db.delete(aiKnowledge).where(eq(aiKnowledge.id, item.id));
        console.log(`      → Deleted: ${item.id.substring(0, 8)}...`);
        totalDeleted++;
      }
      console.log("");
    }
  }

  // Check for similar titles that should be merged
  console.log("🔍 Checking for similar entries that might be duplicates...\n");
  
  const similarPatterns = [
    { patterns: ["company name", "company overview"], suggestion: "Company Overview" },
    { patterns: ["team", "team members", "team & contacts"], suggestion: "Team & Contacts" },
    { patterns: ["communication style", "general tone"], suggestion: "General Tone" },
    { patterns: ["email signature", "signature", "email formatting"], suggestion: "Email Formatting" },
    { patterns: ["language detection", "language guidelines"], suggestion: "Language Guidelines" },
  ];

  for (const { patterns, suggestion } of similarPatterns) {
    const conditions = patterns.map(p => ilike(aiKnowledge.title, `%${p}%`));
    const matches = await db
      .select()
      .from(aiKnowledge)
      .where(or(...conditions));
    
    if (matches.length > 1) {
      console.log(`  📝 Similar entries found for "${suggestion}":`);
      matches.forEach(m => {
        console.log(`      - "${m.title}" (${m.category})`);
      });
      console.log(`      → Consider consolidating these into a single "${suggestion}" entry\n`);
    }
  }

  // Delete all entries matching duplicate patterns (will be replaced by seed)
  console.log("🗑️  Removing known duplicate patterns...\n");
  
  for (const pattern of DUPLICATE_PATTERNS) {
    const deleted = await db
      .delete(aiKnowledge)
      .where(
        and(
          eq(aiKnowledge.category, pattern.category),
          eq(aiKnowledge.title, pattern.titlePattern)
        )
      )
      .returning();
    
    if (deleted.length > 0) {
      console.log(`  ✓ Removed ${deleted.length} "${pattern.titlePattern}" entries from ${pattern.category}`);
      totalDeleted += deleted.length;
    }
  }

  console.log(`\n✅ Cleanup complete! Removed ${totalDeleted} duplicate/similar entries.`);
  console.log("\n💡 Next steps:");
  console.log("   1. Run 'npm run db:seed' to add clean knowledge entries");
  console.log("   2. Or run 'npm run db:reset' to fully reset and reseed\n");
}

// Run
cleanupDuplicates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Cleanup failed:", error);
    process.exit(1);
  });