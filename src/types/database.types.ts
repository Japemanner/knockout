export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      kk_organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Organization, 'id'>>
      }
      kk_profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      kk_boards: {
        Row: Board
        Insert: Omit<Board, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Board, 'id'>>
      }
      kk_columns: {
        Row: KColumn
        Insert: Omit<KColumn, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<KColumn, 'id'>>
      }
      kk_cards: {
        Row: Card
        Insert: Omit<Card, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Card, 'id'>>
      }
      kk_time_entries: {
        Row: TimeEntry
        Insert: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TimeEntry, 'id'>>
      }
      kk_db_connections: {
        Row: DBConnection
        Insert: Omit<DBConnection, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DBConnection, 'id'>>
      }
      kk_rss_feeds: {
        Row: RSSFeed
        Insert: Omit<RSSFeed, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RSSFeed, 'id'>>
      }
      kk_focus_notes: {
        Row: FocusNote
        Insert: Omit<FocusNote, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FocusNote, 'id'>>
      }
      kk_crud_overviews: {
        Row: CRUDOverview
        Insert: Omit<CRUDOverview, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CRUDOverview, 'id'>>
      }
      kk_clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Client, 'id'>>
      }
      kk_hour_entries: {
        Row: HourEntry
        Insert: Omit<HourEntry, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<HourEntry, 'id'>>
      }
      kk_priorities: {
        Row: Priority
        Insert: Omit<Priority, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Priority, 'id'>>
      }
      kk_content_pillars: {
        Row: ContentPillar
        Insert: Omit<ContentPillar, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ContentPillar, 'id'>>
      }
      kk_content_slots: {
        Row: ContentSlot
        Insert: Omit<ContentSlot, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ContentSlot, 'id'>>
      }
      kk_content_posts: {
        Row: ContentPost
        Insert: Omit<ContentPost, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ContentPost, 'id'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export interface Organization {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id: string
  full_name: string | null
  avatar_url: string | null
  role: 'admin' | 'member'
  created_at: string
  updated_at: string
}

export interface Board {
  id: string
  user_id: string
  name: string
  is_inbox: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface KColumn {
  id: string
  board_id: string
  name: string
  position: number
  created_at: string
  updated_at: string
}

export interface Card {
  id: string
  column_id: string
  parent_id: string | null
  title: string
  description: string | null
  url: string | null
  is_starred: boolean
  is_archived: boolean
  position: number
  deadline: string | null
  created_at: string
  updated_at: string
}

export interface TimeEntry {
  id: string
  user_id: string
  task_id: string | null
  board_id: string | null
  start_time: string // ISO string
  end_time: string | null // ISO string
  duration_seconds: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface DBConnection {
  id: string
  user_id: string
  name: string
  encrypted_conn_str: string
  created_at: string
  updated_at: string
}

export interface RSSFeed {
  id: string
  user_id: string
  name: string
  url: string
  created_at: string
  updated_at: string
}

export interface FocusNote {
  id: string
  user_id: string
  date: string
  content: string
  created_at: string
  updated_at: string
}

export interface CRUDOverview {
  id: string
  user_id: string
  name: string
  connection_id: string | null
  table_name: string | null
  interaction_type: 'crud' | 'formulier'
  hidden_columns: string[]
  column_order: string[]
  column_filters: Record<string, ColumnFilter>
  position: number
  created_at: string
  updated_at: string
}

export type ColumnFilterOp =
  | 'contains'
  | 'equals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'is_true'
  | 'is_false'

export interface ColumnFilter {
  op: ColumnFilterOp
  value?: string | number | boolean
  value2?: string | number
}

export type ClientTargetPeriod = 'week' | 'month' | 'total'

export interface Client {
  id: string
  user_id: string
  name: string
  target_hours: number
  target_period: ClientTargetPeriod
  hourly_rate: number
  archived: boolean
  created_at: string
  updated_at: string
}

export interface HourEntry {
  id: string
  user_id: string
  client_id: string
  entry_date: string
  hours: number
  hourly_rate: number
  description: string | null
  start_time: string | null
  end_time: string | null
  created_at: string
  updated_at: string
}

export interface Priority {
  id: string
  user_id: string
  item_1: string
  item_2: string
  item_3: string
  created_at: string
  updated_at: string
}

// ============================================================
// CONTENT-KALENDER (feature 023)
// ============================================================

export type ContentStatus = 'idee' | 'concept' | 'klaar' | 'gepland' | 'live'
export type ContentFormat = 'tekst' | 'afbeelding' | 'carrousel' | 'video' | 'poll'
export type PillarColor = 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'yellow' | 'teal' | 'gray'

export interface ContentPillar {
  id: string
  user_id: string
  name: string
  audience: string | null
  description: string | null
  color: PillarColor
  archived: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface ContentSlot {
  id: string
  user_id: string
  pillar_id: string
  weekday: number // ISO 1-7: 1 = maandag
  post_time: string // 'HH:mm:ss' uit PostgreSQL time
  active: boolean
  created_at: string
  updated_at: string
}

export interface ContentPost {
  id: string
  user_id: string
  pillar_id: string | null
  title: string
  body: string
  format: ContentFormat
  status: ContentStatus
  planned_date: string | null // 'YYYY-MM-DD'; null = ideeënbak
  planned_time: string | null // 'HH:mm:ss' uit PostgreSQL time
  source_url: string | null
  linkedin_url: string | null
  notes: string | null
  scheduled_on_linkedin_at: string | null
  created_at: string
  updated_at: string
}
