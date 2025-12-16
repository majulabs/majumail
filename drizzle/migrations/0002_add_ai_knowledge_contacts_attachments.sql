-- ============================================
-- MIGRATION: Add AI Knowledge, Contacts, Attachments
-- File: 0002_add_ai_knowledge_contacts_attachments.sql
-- ============================================

-- ============================================
-- AI KNOWLEDGE BASE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
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

CREATE INDEX IF NOT EXISTS ai_knowledge_category_idx ON ai_knowledge (category);

CREATE INDEX IF NOT EXISTS ai_knowledge_is_active_idx ON ai_knowledge (is_active);

-- ============================================
-- AI KNOWLEDGE PENDING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_knowledge_pending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
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

CREATE INDEX IF NOT EXISTS ai_knowledge_pending_status_idx ON ai_knowledge_pending (status);

-- ============================================
-- CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    company TEXT,
    role TEXT,
    type TEXT DEFAULT 'contact',
    status TEXT DEFAULT 'active',
    communication_style TEXT,
    language TEXT DEFAULT 'en',
    summary TEXT,
    avatar_url TEXT,
    last_contacted_at TIMESTAMP,
    email_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts (email);

CREATE INDEX IF NOT EXISTS contacts_company_idx ON contacts (company);

CREATE INDEX IF NOT EXISTS contacts_type_idx ON contacts(type);

-- ============================================
-- CONTACT KNOWLEDGE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contact_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    contact_id UUID REFERENCES contacts (id) ON DELETE CASCADE,
    field TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    source_reference TEXT,
    confidence INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_knowledge_contact_id_idx ON contact_knowledge (contact_id);

-- ============================================
-- ADD AI FIELDS TO EMAILS TABLE
-- ============================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'summary') THEN
    ALTER TABLE emails ADD COLUMN summary TEXT;

END IF;

IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE
        table_name = 'emails'
        AND column_name = 'sentiment'
) THEN
ALTER TABLE emails
ADD COLUMN sentiment TEXT;

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
-- Note: Each entry is unique - no duplicates or similar items
-- Content based on rechnungs-api.de, casual "Du" style
-- ============================================

-- Company Information
INSERT INTO
    ai_knowledge (
        category,
        title,
        content,
        is_active,
        is_editable,
        source,
        sort_order
    )
VALUES (
        'company',
        'Über RechnungsAPI',
        'RechnungsAPI (rechnungs-api.de) ist eine API-Lösung für rechtskonforme deutsche E-Rechnungen. Wir helfen Entwicklern und Unternehmen, XRechnung und ZUGFeRD Dokumente einfach per API zu erstellen – ohne sich mit komplexen XML-Standards rumschlagen zu müssen.',
        true,
        true,
        'manual',
        1
    ),
    (
        'company',
        'Unser Team',
        'Wir sind Marcel und Julien und haben zusammen rechnungs - api entwickelt und gegründet.Wir haben beide viel Erfahrung im Umgang mit E Rechnungen und haben eine sehr gut dokumentierte API gebaut,
weil wir selber keine gute gefunen haben.Wir kooperieren mit ferd - net.de um laufend auf dem aktuellsten Stand der regularien zu bleibne.Wir antworten persönlich und schnell !',
        true,
        true,
        'manual',
        2
    ),
    (
        'company',
        'Kontakt & Support',
        'E-Mail Support über support@mail.rechnungs-api.de. Enterprise-Anfragen an sales@rechnungs-api.de. Wir antworten in der Regel innerhalb weniger Stunden während der Geschäftszeiten (Mo-Fr).',
        true,
        true,
        'manual',
        3
    ) ON CONFLICT DO NOTHING;

-- Communication Style (Tone)
INSERT INTO
    ai_knowledge (
        category,
        title,
        content,
        is_active,
        is_editable,
        source,
        sort_order
    )
VALUES (
        'tone',
        'Kommunikationsstil',
        'Wir sind ein junges Startup und kommunizieren locker und direkt. Verwende ''Du'' statt ''Sie'' – auch bei Neukunden. Sei freundlich, hilfsbereit und lösungsorientiert. Keine steifen Floskeln, sondern echte Gespräche auf Augenhöhe.',
        true,
        true,
        'manual',
        1
    ),
    (
        'tone',
        'Sprache & Anrede',
        'Deutsche E-Mails: Immer ''Du'' verwenden. Anrede z.B. ''Hey [Name],'' oder ''Hi [Name],''. Englische E-Mails: Casual but professional, ''Hi [Name],'' works great. Sprache der Antwort immer an die Sprache der Anfrage anpassen.',
        true,
        true,
        'manual',
        2
    ),
    (
        'tone',
        'E-Mail Abschluss',
        'Deutsche E-Mails: ''Viele Grüße'' oder ''Beste Grüße'' + Absendername. NICHT ''Mit freundlichen Grüßen'' – das ist uns zu förmlich. Englische E-Mails: ''Best,'' oder ''Cheers,'' + Absendername. Halte E-Mails kurz und auf den Punkt.',
        true,
        true,
        'manual',
        3
    ) ON CONFLICT DO NOTHING;

-- Products & Services
INSERT INTO
    ai_knowledge (
        category,
        title,
        content,
        is_active,
        is_editable,
        source,
        sort_order
    )
VALUES (
        'products',
        'API-Funktionen',
        'Unsere REST-API ermöglicht: Erstellung von Rechnungen, Gutschriften, Angeboten, Aufträgen, Bestellungen und Lieferscheinen. E-Rechnungen in XRechnung und ZUGFeRD Format. Anpassbare PDF-Designs mit eigenen Themes, Schriftarten und Briefpapier. Automatische Generierung von Buchungssätzen für die Finanzbuchhaltung. OpenAPI/Swagger Dokumentation.',
        true,
        true,
        'manual',
        1
    ),
    (
        'products',
        'Preise & Pläne',
        'Free Plan: Kostenlos, 3 Dokumente/Monat, perfekt zum Testen. Plus Plan: 24,99€/Monat (jährlich), 10.000 Dokumente/Monat, alle Dokumenttypen, anpassbare Designs. Enterprise: Individueller Preis, unbegrenzte Dokumente, Custom-Designs, Premium Support, Self-Hosting möglich. Alle Preise zzgl. USt.',
        true,
        true,
        'manual',
        2
    ),
    (
        'products',
        'Unterstützte Formate',
        'E-Rechnungsformate: XRechnung (für Behörden/B2G), ZUGFeRD 2.1 (für B2B). Standard PDF für B2C. Die API kümmert sich um die komplexe UBL/XML-Generierung – du schickst einfach JSON und bekommst das fertige Dokument zurück.',
        true,
        true,
        'manual',
        3
    ) ON CONFLICT DO NOTHING;

-- FAQ
INSERT INTO
    ai_knowledge (
        category,
        title,
        content,
        is_active,
        is_editable,
        source,
        sort_order
    )
VALUES (
        'faq',
        'Erste Schritte',
        'Zum Starten: 1) Kostenlos registrieren auf rechnungs-api.de/dashboard. 2) API-Key im Dashboard generieren. 3) API-Dokumentation unter rechnungs-api.de/docs checken. 4) Erste Test-Rechnung erstellen. Der Free Plan reicht zum Ausprobieren völlig aus!',
        true,
        true,
        'manual',
        1
    ),
    (
        'faq',
        'XRechnung vs ZUGFeRD',
        'XRechnung: Pflicht für Rechnungen an deutsche Behörden (B2G). Reines XML-Format nach EU-Norm EN 16931. ZUGFeRD: Hybrid-Format mit PDF + eingebettetem XML. Ideal für B2B, weil der Empfänger das PDF auch ohne spezielle Software lesen kann. Unsere API kann beides!',
        true,
        true,
        'manual',
        2
    ),
    (
        'faq',
        'Dokumentenspeicherung',
        'Generierte Dokumente werden 24 Stunden bei uns gespeichert und können in dieser Zeit abgerufen werden. Für längere Aufbewahrung: Dokumente direkt nach Erstellung in eurem eigenen System speichern. Enterprise-Kunden können längere Speicherzeiten vereinbaren.',
        true,
        true,
        'manual',
        3
    ) ON CONFLICT DO NOTHING;

-- Procedures
INSERT INTO
    ai_knowledge (
        category,
        title,
        content,
        is_active,
        is_editable,
        source,
        sort_order
    )
VALUES (
        'procedures',
        'Technischer Support',
        'Bei technischen Problemen: Schick uns die Fehlermeldung, den Request-Body (ohne sensible Daten), und den Zeitpunkt des Fehlers. Je mehr Infos, desto schneller können wir helfen.',
        true,
        true,
        'manual',
        1
    ),
    (
        'procedures',
        'Upgrade & Billing',
        'Upgrades können jederzeit im Dashboard durchgeführt werden. Zahlung läuft über Stripe (Kreditkarte). Wir finden immer eine Lösung!',
        true,
        true,
        'manual',
        2
    ),
    (
        'procedures',
        'Feature Requests',
        'Wir freuen uns über Feedback und Feature-Wünsche! Einfach per E-Mail schicken. Wir können nicht alles umsetzen, aber wir hören zu und priorisieren nach Kundenbedarf. Beliebte Requests schaffen es oft schnell in die Roadmap.',
        true,
        true,
        'manual',
        3
    ) ON CONFLICT DO NOTHING;