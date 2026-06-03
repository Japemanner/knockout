-- Knockout platform initial schema
-- From Darwin project, adapted for Knockout
-- Run this migration in the Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

------------------------------------------------------------
-- ORGANIZATIONS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_organizations ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- PROFILES (extends auth.users)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES kk_organizations(id),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_profiles ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- INVITATIONS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES kk_organizations(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID NOT NULL REFERENCES kk_profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_invitations ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- AI ASSISTANTS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_ai_assistants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES kk_organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🤖',
  type TEXT NOT NULL DEFAULT 'chat' CHECK (type IN ('chat', 'agent', 'voice')),
  n8n_webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES kk_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_ai_assistants ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- KNOWLEDGE BASES
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_knowledge_bases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES kk_organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  vector_collection_id TEXT,
  created_by UUID NOT NULL REFERENCES kk_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_knowledge_bases ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- KNOWLEDGE BASE DOCUMENTS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_base_id UUID NOT NULL REFERENCES kk_knowledge_bases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  created_by UUID NOT NULL REFERENCES kk_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_knowledge_base_documents ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- KNOWLEDGE ITEMS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES kk_knowledge_bases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  embedding_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (embedding_status IN ('pending', 'processing', 'done', 'failed')),
  created_by UUID NOT NULL REFERENCES kk_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_knowledge_items ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- ASSISTANT <-> KNOWLEDGE BASE JUNCTION
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_assistant_knowledge_bases (
  assistant_id UUID NOT NULL REFERENCES kk_ai_assistants(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES kk_knowledge_bases(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (assistant_id, knowledge_base_id)
);

ALTER TABLE kk_assistant_knowledge_bases ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- CONVERSATIONS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES kk_profiles(id),
  assistant_id UUID NOT NULL REFERENCES kk_ai_assistants(id),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_conversations ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- MESSAGES
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES kk_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_messages ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- FLOW CONFIGS
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kk_flow_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_type TEXT NOT NULL CHECK (flow_type IN ('rag_chat')),
  webhook_url TEXT NOT NULL,
  webhook_token TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES kk_organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE kk_flow_configs ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------
-- NEW USER HANDLER: auto-create profile when user signs up
------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.kk_profiles (id, organization_id, full_name, role)
  VALUES (
    NEW.id,
    (SELECT id FROM kk_organizations LIMIT 1),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
------------------------------------------------------------
-- Helper function: get user's organization_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM kk_profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- kk_organizations
DROP POLICY IF EXISTS "Users can view their own organization" ON kk_organizations;
CREATE POLICY "Users can view their own organization" ON kk_organizations FOR SELECT USING (id = get_user_org_id());

-- kk_profiles
DROP POLICY IF EXISTS "Users can view profiles in their org" ON kk_profiles;
CREATE POLICY "Users can view profiles in their org" ON kk_profiles FOR SELECT USING (organization_id = get_user_org_id());
DROP POLICY IF EXISTS "Users can update their own profile" ON kk_profiles;
CREATE POLICY "Users can update their own profile" ON kk_profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- kk_invitations
DROP POLICY IF EXISTS "Admins can view invitations in their org" ON kk_invitations;
CREATE POLICY "Admins can view invitations in their org" ON kk_invitations FOR SELECT USING (organization_id = get_user_org_id() AND EXISTS (SELECT 1 FROM kk_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admins can insert invitations in their org" ON kk_invitations;
CREATE POLICY "Admins can insert invitations in their org" ON kk_invitations FOR INSERT WITH CHECK (organization_id = get_user_org_id() AND EXISTS (SELECT 1 FROM kk_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admins can update invitations in their org" ON kk_invitations;
CREATE POLICY "Admins can update invitations in their org" ON kk_invitations FOR UPDATE USING (organization_id = get_user_org_id() AND EXISTS (SELECT 1 FROM kk_profiles WHERE id = auth.uid() AND role = 'admin'));

-- kk_ai_assistants
DROP POLICY IF EXISTS "Users can view assistants in their org" ON kk_ai_assistants;
CREATE POLICY "Users can view assistants in their org" ON kk_ai_assistants FOR SELECT USING (organization_id = get_user_org_id());
DROP POLICY IF EXISTS "Users can create assistants in their org" ON kk_ai_assistants;
CREATE POLICY "Users can create assistants in their org" ON kk_ai_assistants FOR INSERT WITH CHECK (organization_id = get_user_org_id());
DROP POLICY IF EXISTS "Users can update assistants in their org" ON kk_ai_assistants;
CREATE POLICY "Users can update assistants in their org" ON kk_ai_assistants FOR UPDATE USING (organization_id = get_user_org_id());
DROP POLICY IF EXISTS "Users can delete assistants in their org" ON kk_ai_assistants;
CREATE POLICY "Users can delete assistants in their org" ON kk_ai_assistants FOR DELETE USING (organization_id = get_user_org_id());

-- kk_knowledge_bases
DROP POLICY IF EXISTS "Users can view knowledge bases in their org" ON kk_knowledge_bases;
CREATE POLICY "Users can view knowledge bases in their org" ON kk_knowledge_bases FOR SELECT USING (organization_id = get_user_org_id());
DROP POLICY IF EXISTS "Users can create knowledge bases in their org" ON kk_knowledge_bases;
CREATE POLICY "Users can create knowledge bases in their org" ON kk_knowledge_bases FOR INSERT WITH CHECK (organization_id = get_user_org_id());
DROP POLICY IF EXISTS "Users can update knowledge bases in their org" ON kk_knowledge_bases;
CREATE POLICY "Users can update knowledge bases in their org" ON kk_knowledge_bases FOR UPDATE USING (organization_id = get_user_org_id());
DROP POLICY IF EXISTS "Users can delete knowledge bases in their org" ON kk_knowledge_bases;
CREATE POLICY "Users can delete knowledge bases in their org" ON kk_knowledge_bases FOR DELETE USING (organization_id = get_user_org_id());

-- kk_knowledge_base_documents
DROP POLICY IF EXISTS "Users can view documents in their org" ON kk_knowledge_base_documents;
CREATE POLICY "Users can view documents in their org" ON kk_knowledge_base_documents FOR SELECT USING (EXISTS (SELECT 1 FROM kk_knowledge_bases WHERE kk_knowledge_bases.id = kk_knowledge_base_documents.knowledge_base_id AND kk_knowledge_bases.organization_id = get_user_org_id()));
DROP POLICY IF EXISTS "Users can insert documents in their org" ON kk_knowledge_base_documents;
CREATE POLICY "Users can insert documents in their org" ON kk_knowledge_base_documents FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM kk_knowledge_bases WHERE kk_knowledge_bases.id = kk_knowledge_base_documents.knowledge_base_id AND kk_knowledge_bases.organization_id = get_user_org_id()));
DROP POLICY IF EXISTS "Users can delete documents in their org" ON kk_knowledge_base_documents;
CREATE POLICY "Users can delete documents in their org" ON kk_knowledge_base_documents FOR DELETE USING (EXISTS (SELECT 1 FROM kk_knowledge_bases WHERE kk_knowledge_bases.id = kk_knowledge_base_documents.knowledge_base_id AND kk_knowledge_bases.organization_id = get_user_org_id()));

-- kk_knowledge_items
DROP POLICY IF EXISTS "Users can view knowledge items in their org" ON kk_knowledge_items;
CREATE POLICY "Users can view knowledge items in their org" ON kk_knowledge_items FOR SELECT USING (EXISTS (SELECT 1 FROM kk_knowledge_bases WHERE kk_knowledge_bases.id = kk_knowledge_items.knowledge_base_id AND kk_knowledge_bases.organization_id = get_user_org_id()));
DROP POLICY IF EXISTS "Users can insert knowledge items in their org" ON kk_knowledge_items;
CREATE POLICY "Users can insert knowledge items in their org" ON kk_knowledge_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM kk_knowledge_bases WHERE kk_knowledge_bases.id = kk_knowledge_items.knowledge_base_id AND kk_knowledge_bases.organization_id = get_user_org_id()));
DROP POLICY IF EXISTS "Users can delete knowledge items in their org" ON kk_knowledge_items;
CREATE POLICY "Users can delete knowledge items in their org" ON kk_knowledge_items FOR DELETE USING (EXISTS (SELECT 1 FROM kk_knowledge_bases WHERE kk_knowledge_bases.id = kk_knowledge_items.knowledge_base_id AND kk_knowledge_bases.organization_id = get_user_org_id()));

-- kk_assistant_knowledge_bases
DROP POLICY IF EXISTS "Users can view links in their org" ON kk_assistant_knowledge_bases;
CREATE POLICY "Users can view links in their org" ON kk_assistant_knowledge_bases FOR SELECT USING (EXISTS (SELECT 1 FROM kk_ai_assistants WHERE kk_ai_assistants.id = kk_assistant_knowledge_bases.assistant_id AND kk_ai_assistants.organization_id = get_user_org_id()));
DROP POLICY IF EXISTS "Users can create links in their org" ON kk_assistant_knowledge_bases;
CREATE POLICY "Users can create links in their org" ON kk_assistant_knowledge_bases FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM kk_ai_assistants WHERE kk_ai_assistants.id = kk_assistant_knowledge_bases.assistant_id AND kk_ai_assistants.organization_id = get_user_org_id()));
DROP POLICY IF EXISTS "Users can delete links in their org" ON kk_assistant_knowledge_bases;
CREATE POLICY "Users can delete links in their org" ON kk_assistant_knowledge_bases FOR DELETE USING (EXISTS (SELECT 1 FROM kk_ai_assistants WHERE kk_ai_assistants.id = kk_assistant_knowledge_bases.assistant_id AND kk_ai_assistants.organization_id = get_user_org_id()));

-- kk_conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON kk_conversations;
CREATE POLICY "Users can view their own conversations" ON kk_conversations FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can create conversations" ON kk_conversations;
CREATE POLICY "Users can create conversations" ON kk_conversations FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own conversations" ON kk_conversations;
CREATE POLICY "Users can update their own conversations" ON kk_conversations FOR UPDATE USING (user_id = auth.uid());

-- kk_messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON kk_messages;
CREATE POLICY "Users can view messages in their conversations" ON kk_messages FOR SELECT USING (EXISTS (SELECT 1 FROM kk_conversations WHERE kk_conversations.id = kk_messages.conversation_id AND kk_conversations.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON kk_messages;
CREATE POLICY "Users can insert messages in their conversations" ON kk_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM kk_conversations WHERE kk_conversations.id = kk_messages.conversation_id AND kk_conversations.user_id = auth.uid()));

-- kk_flow_configs
DROP POLICY IF EXISTS "Anyone in org can view flow configs" ON kk_flow_configs;
CREATE POLICY "Anyone in org can view flow configs" ON kk_flow_configs FOR SELECT USING (organization_id = get_user_org_id());
DROP POLICY IF EXISTS "Admins can insert flow configs" ON kk_flow_configs;
CREATE POLICY "Admins can insert flow configs" ON kk_flow_configs FOR INSERT WITH CHECK (organization_id = get_user_org_id() AND EXISTS (SELECT 1 FROM kk_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admins can update flow configs" ON kk_flow_configs;
CREATE POLICY "Admins can update flow configs" ON kk_flow_configs FOR UPDATE USING (organization_id = get_user_org_id() AND EXISTS (SELECT 1 FROM kk_profiles WHERE id = auth.uid() AND role = 'admin'));
DROP POLICY IF EXISTS "Admins can delete flow configs" ON kk_flow_configs;
CREATE POLICY "Admins can delete flow configs" ON kk_flow_configs FOR DELETE USING (organization_id = get_user_org_id() AND EXISTS (SELECT 1 FROM kk_profiles WHERE id = auth.uid() AND role = 'admin'));

------------------------------------------------------------
-- Updated_at trigger function
------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_organizations'::regclass) THEN CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_profiles'::regclass) THEN CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_invitations'::regclass) THEN CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_ai_assistants'::regclass) THEN CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_ai_assistants FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_knowledge_bases'::regclass) THEN CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_knowledge_bases FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_knowledge_base_documents'::regclass) THEN CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_knowledge_base_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_conversations'::regclass) THEN CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_flow_configs'::regclass) THEN CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_flow_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'kk_knowledge_items'::regclass) THEN CREATE TRIGGER set_updated_at BEFORE UPDATE ON kk_knowledge_items FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
END $$;