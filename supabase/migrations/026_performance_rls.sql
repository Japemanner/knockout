-- 026_performance_rls.sql
-- Generated for feature 029-page-load-performance on 2026-11-06.
-- Project: ythjnatklbnjtvvgpwlr (eu-north-1).
--
-- Scope:
--   * Rewrite policies that call auth.uid(), auth.jwt(), auth.role(),
--     get_user_org_id(), is_org_admin() or is_platform_admin() without a
--     surrounding SELECT. Names, tables, permissive mode, roles and commands
--     are preserved. USING / WITH CHECK expressions are preserved apart from
--     the (select ...) wrapper.
--   * Add the 20 foreign-key indexes reported by the Supabase performance
--     advisor (unindexed_foreign_keys).
--
-- Not changed: functions, tables, grants, RLS enablement, storage policies.
-- Apply only after explicit confirmation; production has a single Supabase project.

-- ============================================================
-- RLS policies (90 rewritten)
-- ============================================================

-- public.kk_ai_assistants :: Users can create assistants in their org
DROP POLICY IF EXISTS "Users can create assistants in their org" ON public."kk_ai_assistants";
CREATE POLICY "Users can create assistants in their org" ON public."kk_ai_assistants"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id = (select get_user_org_id())));

-- public.kk_ai_assistants :: Users can delete assistants in their org
DROP POLICY IF EXISTS "Users can delete assistants in their org" ON public."kk_ai_assistants";
CREATE POLICY "Users can delete assistants in their org" ON public."kk_ai_assistants"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((organization_id = (select get_user_org_id())));

-- public.kk_ai_assistants :: Users can update assistants in their org
DROP POLICY IF EXISTS "Users can update assistants in their org" ON public."kk_ai_assistants";
CREATE POLICY "Users can update assistants in their org" ON public."kk_ai_assistants"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((organization_id = (select get_user_org_id())));

-- public.kk_ai_assistants :: Users can view assistants in their org
DROP POLICY IF EXISTS "Users can view assistants in their org" ON public."kk_ai_assistants";
CREATE POLICY "Users can view assistants in their org" ON public."kk_ai_assistants"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id = (select get_user_org_id())));

-- public.kk_assistant_knowledge_bases :: Users can create links in their org
DROP POLICY IF EXISTS "Users can create links in their org" ON public."kk_assistant_knowledge_bases";
CREATE POLICY "Users can create links in their org" ON public."kk_assistant_knowledge_bases"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM kk_ai_assistants
  WHERE ((kk_ai_assistants.id = kk_assistant_knowledge_bases.assistant_id) AND (kk_ai_assistants.organization_id = (select get_user_org_id()))))));

-- public.kk_assistant_knowledge_bases :: Users can delete links in their org
DROP POLICY IF EXISTS "Users can delete links in their org" ON public."kk_assistant_knowledge_bases";
CREATE POLICY "Users can delete links in their org" ON public."kk_assistant_knowledge_bases"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM kk_ai_assistants
  WHERE ((kk_ai_assistants.id = kk_assistant_knowledge_bases.assistant_id) AND (kk_ai_assistants.organization_id = (select get_user_org_id()))))));

-- public.kk_assistant_knowledge_bases :: Users can view links in their org
DROP POLICY IF EXISTS "Users can view links in their org" ON public."kk_assistant_knowledge_bases";
CREATE POLICY "Users can view links in their org" ON public."kk_assistant_knowledge_bases"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM kk_ai_assistants
  WHERE ((kk_ai_assistants.id = kk_assistant_knowledge_bases.assistant_id) AND (kk_ai_assistants.organization_id = (select get_user_org_id()))))));

-- public.kk_boards :: Users can create own boards
DROP POLICY IF EXISTS "Users can create own boards" ON public."kk_boards";
CREATE POLICY "Users can create own boards" ON public."kk_boards"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((select auth.uid()) = user_id));

-- public.kk_boards :: Users can delete own boards
DROP POLICY IF EXISTS "Users can delete own boards" ON public."kk_boards";
CREATE POLICY "Users can delete own boards" ON public."kk_boards"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_boards :: Users can update own boards
DROP POLICY IF EXISTS "Users can update own boards" ON public."kk_boards";
CREATE POLICY "Users can update own boards" ON public."kk_boards"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_boards :: Users can view own boards
DROP POLICY IF EXISTS "Users can view own boards" ON public."kk_boards";
CREATE POLICY "Users can view own boards" ON public."kk_boards"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_cards :: Users can create cards in own boards
DROP POLICY IF EXISTS "Users can create cards in own boards" ON public."kk_cards";
CREATE POLICY "Users can create cards in own boards" ON public."kk_cards"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (kk_columns
     JOIN kk_boards ON ((kk_boards.id = kk_columns.board_id)))
  WHERE ((kk_columns.id = kk_cards.column_id) AND (kk_boards.user_id = (select auth.uid()))))));

-- public.kk_cards :: Users can delete cards in own boards
DROP POLICY IF EXISTS "Users can delete cards in own boards" ON public."kk_cards";
CREATE POLICY "Users can delete cards in own boards" ON public."kk_cards"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM (kk_columns
     JOIN kk_boards ON ((kk_boards.id = kk_columns.board_id)))
  WHERE ((kk_columns.id = kk_cards.column_id) AND (kk_boards.user_id = (select auth.uid()))))));

-- public.kk_cards :: Users can update cards in own boards
DROP POLICY IF EXISTS "Users can update cards in own boards" ON public."kk_cards";
CREATE POLICY "Users can update cards in own boards" ON public."kk_cards"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM (kk_columns
     JOIN kk_boards ON ((kk_boards.id = kk_columns.board_id)))
  WHERE ((kk_columns.id = kk_cards.column_id) AND (kk_boards.user_id = (select auth.uid()))))));

-- public.kk_cards :: Users can view cards in own boards
DROP POLICY IF EXISTS "Users can view cards in own boards" ON public."kk_cards";
CREATE POLICY "Users can view cards in own boards" ON public."kk_cards"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM (kk_columns
     JOIN kk_boards ON ((kk_boards.id = kk_columns.board_id)))
  WHERE ((kk_columns.id = kk_cards.column_id) AND (kk_boards.user_id = (select auth.uid()))))));

-- public.kk_clients :: Users can create own clients
DROP POLICY IF EXISTS "Users can create own clients" ON public."kk_clients";
CREATE POLICY "Users can create own clients" ON public."kk_clients"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_clients :: Users can delete own clients
DROP POLICY IF EXISTS "Users can delete own clients" ON public."kk_clients";
CREATE POLICY "Users can delete own clients" ON public."kk_clients"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_clients :: Users can update own clients
DROP POLICY IF EXISTS "Users can update own clients" ON public."kk_clients";
CREATE POLICY "Users can update own clients" ON public."kk_clients"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_clients :: Users can view own clients
DROP POLICY IF EXISTS "Users can view own clients" ON public."kk_clients";
CREATE POLICY "Users can view own clients" ON public."kk_clients"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_columns :: Users can create columns in own boards
DROP POLICY IF EXISTS "Users can create columns in own boards" ON public."kk_columns";
CREATE POLICY "Users can create columns in own boards" ON public."kk_columns"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM kk_boards
  WHERE ((kk_boards.id = kk_columns.board_id) AND (kk_boards.user_id = (select auth.uid()))))));

-- public.kk_columns :: Users can delete columns in own boards
DROP POLICY IF EXISTS "Users can delete columns in own boards" ON public."kk_columns";
CREATE POLICY "Users can delete columns in own boards" ON public."kk_columns"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM kk_boards
  WHERE ((kk_boards.id = kk_columns.board_id) AND (kk_boards.user_id = (select auth.uid()))))));

-- public.kk_columns :: Users can update columns in own boards
DROP POLICY IF EXISTS "Users can update columns in own boards" ON public."kk_columns";
CREATE POLICY "Users can update columns in own boards" ON public."kk_columns"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM kk_boards
  WHERE ((kk_boards.id = kk_columns.board_id) AND (kk_boards.user_id = (select auth.uid()))))));

-- public.kk_columns :: Users can view columns of own boards
DROP POLICY IF EXISTS "Users can view columns of own boards" ON public."kk_columns";
CREATE POLICY "Users can view columns of own boards" ON public."kk_columns"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM kk_boards
  WHERE ((kk_boards.id = kk_columns.board_id) AND (kk_boards.user_id = (select auth.uid()))))));

-- public.kk_content_pillars :: Users can create own content pillars
DROP POLICY IF EXISTS "Users can create own content pillars" ON public."kk_content_pillars";
CREATE POLICY "Users can create own content pillars" ON public."kk_content_pillars"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_content_pillars :: Users can update own content pillars
DROP POLICY IF EXISTS "Users can update own content pillars" ON public."kk_content_pillars";
CREATE POLICY "Users can update own content pillars" ON public."kk_content_pillars"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_content_pillars :: Users can view own content pillars
DROP POLICY IF EXISTS "Users can view own content pillars" ON public."kk_content_pillars";
CREATE POLICY "Users can view own content pillars" ON public."kk_content_pillars"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_content_posts :: Users can create own content posts
DROP POLICY IF EXISTS "Users can create own content posts" ON public."kk_content_posts";
CREATE POLICY "Users can create own content posts" ON public."kk_content_posts"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_content_posts :: Users can delete own content posts
DROP POLICY IF EXISTS "Users can delete own content posts" ON public."kk_content_posts";
CREATE POLICY "Users can delete own content posts" ON public."kk_content_posts"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_content_posts :: Users can update own content posts
DROP POLICY IF EXISTS "Users can update own content posts" ON public."kk_content_posts";
CREATE POLICY "Users can update own content posts" ON public."kk_content_posts"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_content_posts :: Users can view own content posts
DROP POLICY IF EXISTS "Users can view own content posts" ON public."kk_content_posts";
CREATE POLICY "Users can view own content posts" ON public."kk_content_posts"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_content_slots :: Users can create own content slots
DROP POLICY IF EXISTS "Users can create own content slots" ON public."kk_content_slots";
CREATE POLICY "Users can create own content slots" ON public."kk_content_slots"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_content_slots :: Users can delete own content slots
DROP POLICY IF EXISTS "Users can delete own content slots" ON public."kk_content_slots";
CREATE POLICY "Users can delete own content slots" ON public."kk_content_slots"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_content_slots :: Users can update own content slots
DROP POLICY IF EXISTS "Users can update own content slots" ON public."kk_content_slots";
CREATE POLICY "Users can update own content slots" ON public."kk_content_slots"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_content_slots :: Users can view own content slots
DROP POLICY IF EXISTS "Users can view own content slots" ON public."kk_content_slots";
CREATE POLICY "Users can view own content slots" ON public."kk_content_slots"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_conversations :: Users can create conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public."kk_conversations";
CREATE POLICY "Users can create conversations" ON public."kk_conversations"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_conversations :: Users can update their own conversations
DROP POLICY IF EXISTS "Users can update their own conversations" ON public."kk_conversations";
CREATE POLICY "Users can update their own conversations" ON public."kk_conversations"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_conversations :: Users can view their own conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public."kk_conversations";
CREATE POLICY "Users can view their own conversations" ON public."kk_conversations"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_crud_categories :: Users can create their own CRUD categories
DROP POLICY IF EXISTS "Users can create their own CRUD categories" ON public."kk_crud_categories";
CREATE POLICY "Users can create their own CRUD categories" ON public."kk_crud_categories"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_crud_categories :: Users can delete their own CRUD categories
DROP POLICY IF EXISTS "Users can delete their own CRUD categories" ON public."kk_crud_categories";
CREATE POLICY "Users can delete their own CRUD categories" ON public."kk_crud_categories"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_crud_categories :: Users can update their own CRUD categories
DROP POLICY IF EXISTS "Users can update their own CRUD categories" ON public."kk_crud_categories";
CREATE POLICY "Users can update their own CRUD categories" ON public."kk_crud_categories"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_crud_categories :: Users can view their own CRUD categories
DROP POLICY IF EXISTS "Users can view their own CRUD categories" ON public."kk_crud_categories";
CREATE POLICY "Users can view their own CRUD categories" ON public."kk_crud_categories"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_crud_overviews :: Users can create their own CRUD overviews
DROP POLICY IF EXISTS "Users can create their own CRUD overviews" ON public."kk_crud_overviews";
CREATE POLICY "Users can create their own CRUD overviews" ON public."kk_crud_overviews"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_crud_overviews :: Users can delete their own CRUD overviews
DROP POLICY IF EXISTS "Users can delete their own CRUD overviews" ON public."kk_crud_overviews";
CREATE POLICY "Users can delete their own CRUD overviews" ON public."kk_crud_overviews"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_crud_overviews :: Users can update their own CRUD overviews
DROP POLICY IF EXISTS "Users can update their own CRUD overviews" ON public."kk_crud_overviews";
CREATE POLICY "Users can update their own CRUD overviews" ON public."kk_crud_overviews"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_crud_overviews :: Users can view their own CRUD overviews
DROP POLICY IF EXISTS "Users can view their own CRUD overviews" ON public."kk_crud_overviews";
CREATE POLICY "Users can view their own CRUD overviews" ON public."kk_crud_overviews"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_db_connections :: Users can create own db connections
DROP POLICY IF EXISTS "Users can create own db connections" ON public."kk_db_connections";
CREATE POLICY "Users can create own db connections" ON public."kk_db_connections"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((select auth.uid()) = user_id));

-- public.kk_db_connections :: Users can delete own db connections
DROP POLICY IF EXISTS "Users can delete own db connections" ON public."kk_db_connections";
CREATE POLICY "Users can delete own db connections" ON public."kk_db_connections"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_db_connections :: Users can update own db connections
DROP POLICY IF EXISTS "Users can update own db connections" ON public."kk_db_connections";
CREATE POLICY "Users can update own db connections" ON public."kk_db_connections"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_db_connections :: Users can view own db connections
DROP POLICY IF EXISTS "Users can view own db connections" ON public."kk_db_connections";
CREATE POLICY "Users can view own db connections" ON public."kk_db_connections"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_flow_configs :: Admins can delete flow configs
DROP POLICY IF EXISTS "Admins can delete flow configs" ON public."kk_flow_configs";
CREATE POLICY "Admins can delete flow configs" ON public."kk_flow_configs"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((organization_id = (select get_user_org_id())) AND (EXISTS ( SELECT 1
   FROM kk_profiles
  WHERE ((kk_profiles.id = (select auth.uid())) AND (kk_profiles.role = 'admin'::text))))));

-- public.kk_flow_configs :: Admins can insert flow configs
DROP POLICY IF EXISTS "Admins can insert flow configs" ON public."kk_flow_configs";
CREATE POLICY "Admins can insert flow configs" ON public."kk_flow_configs"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((organization_id = (select get_user_org_id())) AND (EXISTS ( SELECT 1
   FROM kk_profiles
  WHERE ((kk_profiles.id = (select auth.uid())) AND (kk_profiles.role = 'admin'::text))))));

-- public.kk_flow_configs :: Admins can update flow configs
DROP POLICY IF EXISTS "Admins can update flow configs" ON public."kk_flow_configs";
CREATE POLICY "Admins can update flow configs" ON public."kk_flow_configs"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((organization_id = (select get_user_org_id())) AND (EXISTS ( SELECT 1
   FROM kk_profiles
  WHERE ((kk_profiles.id = (select auth.uid())) AND (kk_profiles.role = 'admin'::text))))));

-- public.kk_flow_configs :: Anyone in org can view flow configs
DROP POLICY IF EXISTS "Anyone in org can view flow configs" ON public."kk_flow_configs";
CREATE POLICY "Anyone in org can view flow configs" ON public."kk_flow_configs"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id = (select get_user_org_id())));

-- public.kk_focus_notes :: Users can create own focus notes
DROP POLICY IF EXISTS "Users can create own focus notes" ON public."kk_focus_notes";
CREATE POLICY "Users can create own focus notes" ON public."kk_focus_notes"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((select auth.uid()) = user_id));

-- public.kk_focus_notes :: Users can update own focus notes
DROP POLICY IF EXISTS "Users can update own focus notes" ON public."kk_focus_notes";
CREATE POLICY "Users can update own focus notes" ON public."kk_focus_notes"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_focus_notes :: Users can view own focus notes
DROP POLICY IF EXISTS "Users can view own focus notes" ON public."kk_focus_notes";
CREATE POLICY "Users can view own focus notes" ON public."kk_focus_notes"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_hour_entries :: Users can create own hour entries
DROP POLICY IF EXISTS "Users can create own hour entries" ON public."kk_hour_entries";
CREATE POLICY "Users can create own hour entries" ON public."kk_hour_entries"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_hour_entries :: Users can delete own hour entries
DROP POLICY IF EXISTS "Users can delete own hour entries" ON public."kk_hour_entries";
CREATE POLICY "Users can delete own hour entries" ON public."kk_hour_entries"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_hour_entries :: Users can update own hour entries
DROP POLICY IF EXISTS "Users can update own hour entries" ON public."kk_hour_entries";
CREATE POLICY "Users can update own hour entries" ON public."kk_hour_entries"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_hour_entries :: Users can view own hour entries
DROP POLICY IF EXISTS "Users can view own hour entries" ON public."kk_hour_entries";
CREATE POLICY "Users can view own hour entries" ON public."kk_hour_entries"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_invitations :: Admins can insert invitations in their org
DROP POLICY IF EXISTS "Admins can insert invitations in their org" ON public."kk_invitations";
CREATE POLICY "Admins can insert invitations in their org" ON public."kk_invitations"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((organization_id = (select get_user_org_id())) AND (EXISTS ( SELECT 1
   FROM kk_profiles
  WHERE ((kk_profiles.id = (select auth.uid())) AND (kk_profiles.role = 'admin'::text))))));

-- public.kk_invitations :: Admins can update invitations in their org
DROP POLICY IF EXISTS "Admins can update invitations in their org" ON public."kk_invitations";
CREATE POLICY "Admins can update invitations in their org" ON public."kk_invitations"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((organization_id = (select get_user_org_id())) AND (EXISTS ( SELECT 1
   FROM kk_profiles
  WHERE ((kk_profiles.id = (select auth.uid())) AND (kk_profiles.role = 'admin'::text))))));

-- public.kk_invitations :: Admins can view invitations in their org
DROP POLICY IF EXISTS "Admins can view invitations in their org" ON public."kk_invitations";
CREATE POLICY "Admins can view invitations in their org" ON public."kk_invitations"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((organization_id = (select get_user_org_id())) AND (EXISTS ( SELECT 1
   FROM kk_profiles
  WHERE ((kk_profiles.id = (select auth.uid())) AND (kk_profiles.role = 'admin'::text))))));

-- public.kk_knowledge_base_documents :: Users can delete documents in their org
DROP POLICY IF EXISTS "Users can delete documents in their org" ON public."kk_knowledge_base_documents";
CREATE POLICY "Users can delete documents in their org" ON public."kk_knowledge_base_documents"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM kk_knowledge_bases
  WHERE ((kk_knowledge_bases.id = kk_knowledge_base_documents.knowledge_base_id) AND (kk_knowledge_bases.organization_id = (select get_user_org_id()))))));

-- public.kk_knowledge_base_documents :: Users can insert documents in their org
DROP POLICY IF EXISTS "Users can insert documents in their org" ON public."kk_knowledge_base_documents";
CREATE POLICY "Users can insert documents in their org" ON public."kk_knowledge_base_documents"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM kk_knowledge_bases
  WHERE ((kk_knowledge_bases.id = kk_knowledge_base_documents.knowledge_base_id) AND (kk_knowledge_bases.organization_id = (select get_user_org_id()))))));

-- public.kk_knowledge_base_documents :: Users can view documents in their org
DROP POLICY IF EXISTS "Users can view documents in their org" ON public."kk_knowledge_base_documents";
CREATE POLICY "Users can view documents in their org" ON public."kk_knowledge_base_documents"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM kk_knowledge_bases
  WHERE ((kk_knowledge_bases.id = kk_knowledge_base_documents.knowledge_base_id) AND (kk_knowledge_bases.organization_id = (select get_user_org_id()))))));

-- public.kk_knowledge_bases :: Users can create knowledge bases in their org
DROP POLICY IF EXISTS "Users can create knowledge bases in their org" ON public."kk_knowledge_bases";
CREATE POLICY "Users can create knowledge bases in their org" ON public."kk_knowledge_bases"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((organization_id = (select get_user_org_id())));

-- public.kk_knowledge_bases :: Users can delete knowledge bases in their org
DROP POLICY IF EXISTS "Users can delete knowledge bases in their org" ON public."kk_knowledge_bases";
CREATE POLICY "Users can delete knowledge bases in their org" ON public."kk_knowledge_bases"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((organization_id = (select get_user_org_id())));

-- public.kk_knowledge_bases :: Users can update knowledge bases in their org
DROP POLICY IF EXISTS "Users can update knowledge bases in their org" ON public."kk_knowledge_bases";
CREATE POLICY "Users can update knowledge bases in their org" ON public."kk_knowledge_bases"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((organization_id = (select get_user_org_id())));

-- public.kk_knowledge_bases :: Users can view knowledge bases in their org
DROP POLICY IF EXISTS "Users can view knowledge bases in their org" ON public."kk_knowledge_bases";
CREATE POLICY "Users can view knowledge bases in their org" ON public."kk_knowledge_bases"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id = (select get_user_org_id())));

-- public.kk_knowledge_items :: Users can delete knowledge items in their org
DROP POLICY IF EXISTS "Users can delete knowledge items in their org" ON public."kk_knowledge_items";
CREATE POLICY "Users can delete knowledge items in their org" ON public."kk_knowledge_items"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((EXISTS ( SELECT 1
   FROM kk_knowledge_bases
  WHERE ((kk_knowledge_bases.id = kk_knowledge_items.knowledge_base_id) AND (kk_knowledge_bases.organization_id = (select get_user_org_id()))))));

-- public.kk_knowledge_items :: Users can insert knowledge items in their org
DROP POLICY IF EXISTS "Users can insert knowledge items in their org" ON public."kk_knowledge_items";
CREATE POLICY "Users can insert knowledge items in their org" ON public."kk_knowledge_items"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM kk_knowledge_bases
  WHERE ((kk_knowledge_bases.id = kk_knowledge_items.knowledge_base_id) AND (kk_knowledge_bases.organization_id = (select get_user_org_id()))))));

-- public.kk_knowledge_items :: Users can view knowledge items in their org
DROP POLICY IF EXISTS "Users can view knowledge items in their org" ON public."kk_knowledge_items";
CREATE POLICY "Users can view knowledge items in their org" ON public."kk_knowledge_items"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM kk_knowledge_bases
  WHERE ((kk_knowledge_bases.id = kk_knowledge_items.knowledge_base_id) AND (kk_knowledge_bases.organization_id = (select get_user_org_id()))))));

-- public.kk_messages :: Users can insert messages in their conversations
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public."kk_messages";
CREATE POLICY "Users can insert messages in their conversations" ON public."kk_messages"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM kk_conversations
  WHERE ((kk_conversations.id = kk_messages.conversation_id) AND (kk_conversations.user_id = (select auth.uid()))))));

-- public.kk_messages :: Users can view messages in their conversations
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public."kk_messages";
CREATE POLICY "Users can view messages in their conversations" ON public."kk_messages"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((EXISTS ( SELECT 1
   FROM kk_conversations
  WHERE ((kk_conversations.id = kk_messages.conversation_id) AND (kk_conversations.user_id = (select auth.uid()))))));

-- public.kk_organizations :: Users can view their own organization
DROP POLICY IF EXISTS "Users can view their own organization" ON public."kk_organizations";
CREATE POLICY "Users can view their own organization" ON public."kk_organizations"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((id = (select get_user_org_id())));

-- public.kk_priorities :: Users can delete own priorities
DROP POLICY IF EXISTS "Users can delete own priorities" ON public."kk_priorities";
CREATE POLICY "Users can delete own priorities" ON public."kk_priorities"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_priorities :: Users can update own priorities
DROP POLICY IF EXISTS "Users can update own priorities" ON public."kk_priorities";
CREATE POLICY "Users can update own priorities" ON public."kk_priorities"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((user_id = (select auth.uid())))
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_priorities :: Users can upsert own priorities
DROP POLICY IF EXISTS "Users can upsert own priorities" ON public."kk_priorities";
CREATE POLICY "Users can upsert own priorities" ON public."kk_priorities"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK ((user_id = (select auth.uid())));

-- public.kk_priorities :: Users can view own priorities
DROP POLICY IF EXISTS "Users can view own priorities" ON public."kk_priorities";
CREATE POLICY "Users can view own priorities" ON public."kk_priorities"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((user_id = (select auth.uid())));

-- public.kk_profiles :: Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public."kk_profiles";
CREATE POLICY "Users can update their own profile" ON public."kk_profiles"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING ((id = (select auth.uid())))
  WITH CHECK ((id = (select auth.uid())));

-- public.kk_profiles :: Users can view profiles in their org
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public."kk_profiles";
CREATE POLICY "Users can view profiles in their org" ON public."kk_profiles"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((organization_id = (select get_user_org_id())));

-- public.kk_rss_feeds :: Users can create own rss feeds
DROP POLICY IF EXISTS "Users can create own rss feeds" ON public."kk_rss_feeds";
CREATE POLICY "Users can create own rss feeds" ON public."kk_rss_feeds"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((select auth.uid()) = user_id));

-- public.kk_rss_feeds :: Users can delete own rss feeds
DROP POLICY IF EXISTS "Users can delete own rss feeds" ON public."kk_rss_feeds";
CREATE POLICY "Users can delete own rss feeds" ON public."kk_rss_feeds"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_rss_feeds :: Users can update own rss feeds
DROP POLICY IF EXISTS "Users can update own rss feeds" ON public."kk_rss_feeds";
CREATE POLICY "Users can update own rss feeds" ON public."kk_rss_feeds"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_rss_feeds :: Users can view own rss feeds
DROP POLICY IF EXISTS "Users can view own rss feeds" ON public."kk_rss_feeds";
CREATE POLICY "Users can view own rss feeds" ON public."kk_rss_feeds"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_time_entries :: Users can create own time entries
DROP POLICY IF EXISTS "Users can create own time entries" ON public."kk_time_entries";
CREATE POLICY "Users can create own time entries" ON public."kk_time_entries"
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((select auth.uid()) = user_id));

-- public.kk_time_entries :: Users can delete own time entries
DROP POLICY IF EXISTS "Users can delete own time entries" ON public."kk_time_entries";
CREATE POLICY "Users can delete own time entries" ON public."kk_time_entries"
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_time_entries :: Users can update own time entries
DROP POLICY IF EXISTS "Users can update own time entries" ON public."kk_time_entries";
CREATE POLICY "Users can update own time entries" ON public."kk_time_entries"
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((select auth.uid()) = user_id));

-- public.kk_time_entries :: Users can view own time entries
DROP POLICY IF EXISTS "Users can view own time entries" ON public."kk_time_entries";
CREATE POLICY "Users can view own time entries" ON public."kk_time_entries"
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((select auth.uid()) = user_id));

-- ============================================================
-- Foreign-key indexes (20)
-- ============================================================

CREATE INDEX IF NOT EXISTS kk_ai_assistants_created_by_idx ON public.kk_ai_assistants (created_by);
CREATE INDEX IF NOT EXISTS kk_ai_assistants_organization_id_idx ON public.kk_ai_assistants (organization_id);
CREATE INDEX IF NOT EXISTS kk_assistant_knowledge_bases_knowledge_base_id_idx ON public.kk_assistant_knowledge_bases (knowledge_base_id);
CREATE INDEX IF NOT EXISTS kk_content_posts_pillar_id_idx ON public.kk_content_posts (pillar_id);
CREATE INDEX IF NOT EXISTS kk_conversations_assistant_id_idx ON public.kk_conversations (assistant_id);
CREATE INDEX IF NOT EXISTS kk_conversations_user_id_idx ON public.kk_conversations (user_id);
CREATE INDEX IF NOT EXISTS kk_crud_overviews_category_id_idx ON public.kk_crud_overviews (category_id);
CREATE INDEX IF NOT EXISTS kk_crud_overviews_connection_id_idx ON public.kk_crud_overviews (connection_id);
CREATE INDEX IF NOT EXISTS kk_flow_configs_organization_id_idx ON public.kk_flow_configs (organization_id);
CREATE INDEX IF NOT EXISTS kk_hour_entries_client_id_idx ON public.kk_hour_entries (client_id);
CREATE INDEX IF NOT EXISTS kk_invitations_invited_by_idx ON public.kk_invitations (invited_by);
CREATE INDEX IF NOT EXISTS kk_invitations_organization_id_idx ON public.kk_invitations (organization_id);
CREATE INDEX IF NOT EXISTS kk_knowledge_base_documents_created_by_idx ON public.kk_knowledge_base_documents (created_by);
CREATE INDEX IF NOT EXISTS kk_knowledge_base_documents_knowledge_base_id_idx ON public.kk_knowledge_base_documents (knowledge_base_id);
CREATE INDEX IF NOT EXISTS kk_knowledge_bases_created_by_idx ON public.kk_knowledge_bases (created_by);
CREATE INDEX IF NOT EXISTS kk_knowledge_bases_organization_id_idx ON public.kk_knowledge_bases (organization_id);
CREATE INDEX IF NOT EXISTS kk_knowledge_items_created_by_idx ON public.kk_knowledge_items (created_by);
CREATE INDEX IF NOT EXISTS kk_knowledge_items_knowledge_base_id_idx ON public.kk_knowledge_items (knowledge_base_id);
CREATE INDEX IF NOT EXISTS kk_messages_conversation_id_idx ON public.kk_messages (conversation_id);
CREATE INDEX IF NOT EXISTS kk_profiles_organization_id_idx ON public.kk_profiles (organization_id);
