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
  position: number
  created_at: string
  updated_at: string
}

export type ClientTargetPeriod = 'week' | 'month' | 'total'

export interface Client {
  id: string
  user_id: string
  name: string
  target_hours: number
  target_period: ClientTargetPeriod
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
  description: string | null
  created_at: string
  updated_at: string
}
