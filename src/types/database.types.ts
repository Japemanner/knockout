export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: Organization; Update: Partial<Organization> }
      profiles: { Row: Profile; Insert: Profile; Update: Partial<Profile> }
      boards: { Row: Board; Insert: Board; Update: Partial<Board> }
      columns: { Row: KColumn; Insert: KColumn; Update: Partial<KColumn> }
      cards: { Row: Card; Insert: Card; Update: Partial<Card> }
      time_sessions: { Row: TimeSession; Insert: TimeSession; Update: Partial<TimeSession> }
      db_connections: { Row: DBConnection; Insert: DBConnection; Update: Partial<DBConnection> }
      rss_feeds: { Row: RSSFeed; Insert: RSSFeed; Update: Partial<RSSFeed> }
      focus_notes: { Row: FocusNote; Insert: FocusNote; Update: Partial<FocusNote> }
    }
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
