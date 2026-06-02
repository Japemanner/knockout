export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Organization, 'id'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id'>>
      }
      boards: {
        Row: Board
        Insert: Omit<Board, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Board, 'id'>>
      }
      columns: {
        Row: KColumn
        Insert: Omit<KColumn, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<KColumn, 'id'>>
      }
      cards: {
        Row: Card
        Insert: Omit<Card, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Card, 'id'>>
      }
      time_sessions: {
        Row: TimeSession
        Insert: Omit<TimeSession, 'id' | 'created_at'>
        Update: Partial<Omit<TimeSession, 'id'>>
      }
      db_connections: {
        Row: DBConnection
        Insert: Omit<DBConnection, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DBConnection, 'id'>>
      }
      rss_feeds: {
        Row: RSSFeed
        Insert: Omit<RSSFeed, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RSSFeed, 'id'>>
      }
      focus_notes: {
        Row: FocusNote
        Insert: Omit<FocusNote, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FocusNote, 'id'>>
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

export interface TimeSession {
  id: string
  card_id: string
  started_at: string
  ended_at: string | null
  created_at: string
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
