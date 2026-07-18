'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { getUserId } from '@/lib/supabase/server'
import { getLocalPool } from '@/lib/db/local-pool'
import { revalidatePath } from 'next/cache'

interface DeleteCardResultRow {
  board_id: string | null
}

export async function createCardInColumn(data: {
  columnId: string
  title: string
  description?: string
  url?: string
  deadline?: string
}) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: card, error } = await supabase
      .rpc('kk_create_card_in_column', {
        p_column_id: data.columnId,
        p_title: data.title,
        p_description: data.description || null,
        p_url: data.url || null,
        p_deadline: data.deadline || null,
      })
      .single()

    if (error || !card) throw new Error(error?.message ?? 'Failed to create card')

    return { success: true, card }
  } catch (error) {
    console.error('Error creating card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function createCard(data: {
  title: string
  description?: string
  url?: string
  deadline?: string
}) {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data: card, error } = await supabase
      .rpc('kk_create_card_in_inbox', {
        p_user_id: userId,
        p_title: data.title,
        p_description: data.description || null,
        p_url: data.url || null,
        p_deadline: data.deadline || null,
      })
      .single()

    if (error || !card) throw new Error(error?.message ?? 'Failed to create card')

    revalidatePath('/boards')
    revalidatePath('/command-center')

    return { success: true, card }
  } catch (error) {
    console.error('Error creating card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function getInboxBoard() {
  try {
    const { supabase, userId } = await getAuthenticatedClient()

    const { data: board } = await supabase
      .from('kk_boards')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_inbox', true)
      .single()

    return board
  } catch (error) {
    if (error instanceof Error && error.message.includes('PGRST116')) {
      return null
    }
    console.error('Error getting inbox board:', error)
    return null
  }
}

export async function updateCard(cardId: string, data: Record<string, unknown>) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: updatedCard } = await supabase
      .from('kk_cards')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', cardId)
      .select()
      .single()

    if (!updatedCard) throw new Error('Failed to update card')

    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error updating card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Eén SQL-CTE vervangt 4 queries (select card, update children parent_id=null,
// delete card, select column voor board_id). Bespaart ~100-150ms per
// kaart-verwijdering. RLS-compensatie: expliciete user_id filtering via join.
const DELETE_CARD_QUERY = `
  WITH target AS (
    SELECT c.id, c.column_id, c.parent_id
    FROM kk_cards c
    JOIN kk_columns col ON c.column_id = col.id
    JOIN kk_boards b ON col.board_id = b.id
    WHERE c.id = $1 AND b.user_id = $2
  ),
  promote_children AS (
    UPDATE kk_cards
    SET parent_id = NULL, updated_at = now()
    WHERE parent_id = (SELECT id FROM target)
  ),
  deleted AS (
    DELETE FROM kk_cards
    WHERE id = (SELECT id FROM target)
    RETURNING column_id
  )
  SELECT col.board_id
  FROM deleted d
  JOIN kk_columns col ON d.column_id = col.id
`

export async function deleteCard(cardId: string) {
  try {
    const userId = await getUserId()
    if (!userId) throw new Error('Niet ingelogd')

    const pool = getLocalPool()
    const { rows, rowCount } = await pool.query<DeleteCardResultRow>(DELETE_CARD_QUERY, [
      cardId,
      userId,
    ])

    if (rowCount === 0) throw new Error('Card not found')

    revalidatePath('/starred')
    revalidatePath('/boards')
    const boardId = rows[0]?.board_id
    if (boardId) {
      revalidatePath(`/boards/${boardId}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Eén SQL-CTE vervangt 3 queries (select card, update card, optional update
// subtasks, select column voor board_id). Bespaart ~75-100ms.
// RLS-compensatie: user_id = $2 via join. Retourneert altijd de hoofdupdate-rij
// plus board_id, ongeacht of er subtasks zijn.
const TOGGLE_ARCHIVE_CARD_QUERY = `
  WITH target AS (
    SELECT c.is_archived, col.board_id
    FROM kk_cards c
    JOIN kk_columns col ON c.column_id = col.id
    JOIN kk_boards b ON col.board_id = b.id
    WHERE c.id = $1 AND b.user_id = $2
  ),
  updated AS (
    UPDATE kk_cards
    SET is_archived = NOT (SELECT is_archived FROM target),
        is_starred = CASE WHEN NOT (SELECT is_archived FROM target) THEN false ELSE is_starred END,
        updated_at = now()
    WHERE id = $1
    RETURNING *
  ),
  subtask_update AS (
    UPDATE kk_cards
    SET is_archived = true, is_starred = false, updated_at = now()
    WHERE parent_id = $1
      AND (SELECT is_archived FROM updated) = true
  )
  SELECT u.*, (SELECT board_id FROM target) AS board_id
  FROM updated u
`

interface ToggleArchiveResultRow {
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
  board_id: string | null
}

export async function toggleArchiveCard(cardId: string) {
  try {
    const userId = await getUserId()
    if (!userId) throw new Error('Niet ingelogd')

    const pool = getLocalPool()
    const { rows, rowCount } = await pool.query<ToggleArchiveResultRow>(TOGGLE_ARCHIVE_CARD_QUERY, [
      cardId,
      userId,
    ])

    if (rowCount === 0) throw new Error('Card not found')

    const updatedCard = rows[0]!
    if (updatedCard.is_archived) {
      revalidatePath('/starred')
    }
    revalidatePath('/boards')
    if (updatedCard.board_id) {
      revalidatePath(`/boards/${updatedCard.board_id}`)
    }

    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error toggling archive card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function moveCard(cardId: string, newColumnId: string, newPosition: number) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: updatedCard, error } = await supabase
      .rpc('kk_move_card', {
        p_card_id: cardId,
        p_column_id: newColumnId,
        p_position: newPosition,
      })
      .single()

    if (error || !updatedCard) throw new Error(error?.message ?? 'Failed to move card')

    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error moving card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function reorderCards(columnId: string, cardIds: string[]) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { error } = await supabase.rpc('kk_reorder_cards', { p_card_ids: cardIds })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error reordering cards:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function moveCardToBoard(cardId: string, newBoardId: string) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: updatedCard, error } = await supabase
      .rpc('kk_move_card_to_board', {
        p_card_id: cardId,
        p_board_id: newBoardId,
      })
      .single()

    if (error || !updatedCard) throw new Error(error?.message ?? 'Failed to move card')

    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error moving card to board:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function moveCardUnderParent(cardId: string, parentId: string) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: updatedCard, error } = await supabase
      .rpc('kk_move_card_under_parent', {
        p_card_id: cardId,
        p_parent_id: parentId,
      })
      .single()

    if (error || !updatedCard) throw new Error(error?.message ?? 'Failed to move card under parent')

    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error moving card under parent:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function moveCardOutOfParent(cardId: string, newColumnId: string, newPosition: number) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: updatedCard } = await supabase
      .from('kk_cards')
      .update({
        parent_id: null,
        column_id: newColumnId,
        position: newPosition,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single()

    if (!updatedCard) throw new Error('Failed to move card out of parent')

    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error moving card out of parent:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}