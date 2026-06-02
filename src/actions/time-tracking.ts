'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

// Time entry data structure
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

// Create a new time entry
export async function startTimeTracking(data: {
  taskId?: string
  boardId?: string
  description?: string
}) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: entry } = await untypedClient
      .from('time_entries')
      .insert({
        user_id: user.id,
        task_id: data.taskId || null,
        board_id: data.boardId || null,
        start_time: new Date().toISOString(),
        description: data.description || null,
      })
      .select()
      .single()

    if (!entry) throw new Error('Failed to create time entry')
    revalidatePath('/focus')
    return { success: true, entry }
  } catch (error) {
    console.error('Error starting time tracking:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Stop current time tracking
export async function stopTimeTracking(entryId: string) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const endTime = new Date().toISOString()
    
    // First get the entry to calculate duration
    const { data: entry } = await untypedClient
      .from('time_entries')
      .select('start_time')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single()

    if (!entry) throw new Error('Time entry not found')

    const start = new Date(entry.start_time)
    const end = new Date(endTime)
    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000)

    const { data: updatedEntry } = await untypedClient
      .from('time_entries')
      .update({
        end_time: endTime,
        duration_seconds: durationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (!updatedEntry) throw new Error('Failed to update time entry')
    revalidatePath('/focus')
    return { success: true, entry: updatedEntry }
  } catch (error) {
    console.error('Error stopping time tracking:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get active time entry for user
export async function getActiveTimeEntry() {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: entry } = await untypedClient
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .single()

    return entry || null
  } catch (error) {
    // PGRST116 is "no rows" error which is expected when no active entry
    if (error instanceof Error && error.message.includes('PGRST116')) {
      return null
    }
    console.error('Error getting active time entry:', error)
    return null
  }
}

// Get time entries for user with optional filters
export async function getTimeEntries(options?: {
  limit?: number
  offset?: number
  fromDate?: string
  toDate?: string
  taskId?: string
  boardId?: string
}) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { entries: [], total: 0 }

    let query = untypedClient
      .from('time_entries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
    }

    if (options?.fromDate) {
      query = query.gte('start_time', options.fromDate)
    }

    if (options?.toDate) {
      query = query.lte('start_time', options.toDate)
    }

    if (options?.taskId) {
      query = query.eq('task_id', options.taskId)
    }

    if (options?.boardId) {
      query = query.eq('board_id', options.boardId)
    }

    const { data: entries, count } = await query

    return { entries: entries || [], total: count || 0 }
  } catch (error) {
    console.error('Error getting time entries:', error)
    return { entries: [], total: 0 }
  }
}

// Update time entry description
export async function updateTimeEntry(entryId: string, description: string) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: entry } = await untypedClient
      .from('time_entries')
      .update({ description, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (!entry) throw new Error('Failed to update time entry')
    revalidatePath('/focus')
    return { success: true, entry }
  } catch (error) {
    console.error('Error updating time entry:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Delete time entry
export async function deleteTimeEntry(entryId: string) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await untypedClient
      .from('time_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', user.id)

    if (error) throw error
    revalidatePath('/focus')
    return { success: true }
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}