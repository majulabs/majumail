-- Migration: Add AI Knowledge Base, Enhanced Contacts, and Attachments
-- Generated for MajuMail enhancement

-- ============================================
-- ATTACHMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  storage_url TEXT,
  storage_key TEXT,
  summary TEXT,
  extracted_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS attachments_email_id_idx ON attachments(email_id);

-- ============================================
-- AI KNOWLEDGE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_editable BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'manual',
  source_reference TEXT,
  confidence INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_knowledge_category_idx ON ai_knowledge(category);
CREATE INDEX IF NOT EXISTS ai_knowledge_is_active_idx ON ai_knowledge(is_active);

-- ============================================
-- AI KNOWLEDGE PENDING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_knowledge_pending (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  source TEXT NOT NULL,
  source_reference TEXT,
  confidence INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_knowledge_pending_status_idx ON ai_knowledge_pending(status);

-- ============================================
-- AI SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ENHANCED CONTACTS TABLE
-- Add new columns to existing contacts table
-- ============================================

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Structured data columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'company') THEN
    ALTER TABLE contacts ADD COLUMN company TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'role') THEN
    ALTER TABLE contacts ADD COLUMN role TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'phone') THEN
    ALTER TABLE contacts ADD COLUMN phone TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'website') THEN
    ALTER TABLE contacts ADD COLUMN website TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'location') THEN
    ALTER TABLE contacts ADD COLUMN location TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'timezone') THEN
    ALTER TABLE contacts ADD COLUMN timezone TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'linkedin') THEN
    ALTER TABLE contacts ADD COLUMN linkedin TEXT;
  END IF;
  
  -- Relationship data columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'type') THEN
    ALTER TABLE contacts ADD COLUMN type TEXT DEFAULT 'contact';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'status') THEN
    ALTER TABLE contacts ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
  
  -- AI-populated columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'summary') THEN
    ALTER TABLE contacts ADD COLUMN summary TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'interests') THEN
    ALTER TABLE contacts ADD COLUMN interests TEXT[];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'communication_style') THEN
    ALTER TABLE contacts ADD COLUMN communication_style TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'language') THEN
    ALTER TABLE contacts ADD COLUMN language TEXT DEFAULT 'de';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'last_interaction_summary') THEN
    ALTER TABLE contacts ADD COLUMN last_interaction_summary TEXT;
  END IF;
  
  -- User-editable columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'avatar_url') THEN
    ALTER TABLE contacts ADD COLUMN avatar_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'notes') THEN
    ALTER TABLE contacts ADD COLUMN notes TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'tags') THEN
    ALTER TABLE contacts ADD COLUMN tags TEXT[];
  END IF;
  
  -- Stats columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'email_count') THEN
    ALTER TABLE contacts ADD COLUMN email_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'inbound_count') THEN
    ALTER TABLE contacts ADD COLUMN inbound_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'outbound_count') THEN
    ALTER TABLE contacts ADD COLUMN outbound_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'first_contacted_at') THEN
    ALTER TABLE contacts ADD COLUMN first_contacted_at TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'updated_at') THEN
    ALTER TABLE contacts ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for contacts
CREATE INDEX IF NOT EXISTS contacts_type_idx ON contacts(type);
CREATE INDEX IF NOT EXISTS contacts_status_idx ON contacts(status);

-- ============================================
-- CONTACT KNOWLEDGE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contact_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  source_reference TEXT,
  confidence INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_knowledge_contact_id_idx ON contact_knowledge(contact_id);

-- ============================================
-- ADD AI FIELDS TO EMAILS TABLE
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'summary') THEN
    ALTER TABLE emails ADD COLUMN summary TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'sentiment') THEN
    ALTER TABLE emails ADD COLUMN sentiment TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'action_items') THEN
    ALTER TABLE emails ADD COLUMN action_items TEXT[];
  END IF;
END $$;

-- ============================================
-- INSERT DEFAULT AI SETTINGS
-- ============================================
INSERT INTO ai_settings (key, value)
VALUES ('ai_config', '{
  "autoLearnFromEmails": true,
  "autoLearnConfidenceThreshold": 80,
  "autoCreateContacts": true,
  "generateThreadSummaries": true,
  "generateSmartReplies": true,
  "summarizeAttachments": true
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- INSERT SAMPLE KNOWLEDGE ENTRIES
-- ============================================
INSERT INTO ai_knowledge (category, title, content, is_active, is_editable, source, sort_order)
VALUES 
  ('company', 'Company Name', 'rechnungs-api.de - German invoice API service', true, true, 'manual', 1),
  ('company', 'Team', 'Marcel and Julien are the main team members handling customer communications.', true, true, 'manual', 2),
  ('tone', 'Communication Style', 'We communicate in a professional but friendly manner. Use German (Sie form) for German clients, English for international clients. Keep emails concise and helpful.', true, true, 'manual', 1),
  ('tone', 'Signature', 'Always sign off with "Mit freundlichen Grüßen" for German emails and "Best regards" for English emails.', true, true, 'manual', 2)
ON CONFLICT DO NOTHING;
