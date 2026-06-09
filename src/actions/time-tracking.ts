'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { revalidatePath } from 'next/cache'

export interface TimeEntry {
  id: string
  user_id: string
  task_id: string | null
  board_id: string | null
  start_time: string
  end_time: string | null
  duration_seconds: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export async function startTimeTracking(data: {
  taskId?: string
  boardId?: string
  description?: string
}) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data: entry } = await supabase
      .from('kk_time_entries')
      .insert({
        user_id: userId,
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

export async function stopTimeTracking(entryId: string) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data: entry } = await supabase
      .from('kk_time_entries')
      .select('start_time')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single()

    if (!entry) throw new Error('Time entry not found')

    const endTime = new Date().toISOString()
    const start = new Date(entry.start_time)
    const durationSeconds = Math.floor((new Date(endTime).getTime() - start.getTime()) / 1000)

    const { data: updatedEntry } = await supabase
      .from('kk_time_entries')
      .update({
        end_time: endTime,
        duration_seconds: durationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('user_id', userId)
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

export async function getActiveTimeEntry() {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data: entry } = await supabase
      .from('kk_time_entries')
      .select('*')
      .eq('user_id', userId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .single()

    return entry || null
  } catch (error) {
    if (error instanceof Error && error.message.includes('PGRST116')) {
      return null
    }
    console.error('Error getting active time entry:', error)
    return null
  }
}

export async function getTimeEntries(options?: {
  limit?: number
  offset?: number
  fromDate?: string
  toDate?: string
  taskId?: string
  boardId?: string
}) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    let query = supabase
      .from('kk_time_entries')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
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

export async function updateTimeEntry(entryId: string, description: string) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data: entry } = await supabase
      .from('kk_time_entries')
      .update({ description, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .eq('user_id', userId)
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

export async function deleteTimeEntry(entryId: string) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { error } = await supabase
      .from('kk_time_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId)

    if (error) throw error
    revalidatePath('/focus')
    return { success: true }
  } catch (error) {
    console.error('Error deleting time entry:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}