'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { revalidatePath } from 'next/cache'

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

export async function deleteCard(cardId: string) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: card } = await supabase
      .from('kk_cards')
      .select('column_id, parent_id')
      .eq('id', cardId)
      .single()

    if (!card) throw new Error('Card not found')

    const { error: promoteError } = await supabase
      .from('kk_cards')
      .update({ parent_id: null, updated_at: new Date().toISOString() })
      .eq('parent_id', cardId)

    if (promoteError) throw promoteError

    const { error } = await supabase
      .from('kk_cards')
      .delete()
      .eq('id', cardId)

    if (error) throw error

    revalidatePath('/starred')
    revalidatePath('/boards')

    if (card.column_id) {
      const { data: column } = await supabase
        .from('kk_columns')
        .select('board_id')
        .eq('id', card.column_id)
        .single()
      if (column?.board_id) {
        revalidatePath(`/boards/${column.board_id}`)
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function toggleArchiveCard(cardId: string) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: currentCard } = await supabase
      .from('kk_cards')
      .select('is_archived, column_id')
      .eq('id', cardId)
      .single()

    if (!currentCard) throw new Error('Card not found')

    const newArchived = !currentCard.is_archived

    const { data: updatedCard } = await supabase
      .from('kk_cards')
      .update({
        is_archived: newArchived,
        ...(newArchived ? { is_starred: false } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single()

    if (!updatedCard) throw new Error('Failed to update card')

    if (newArchived) {
      revalidatePath('/starred')
      const { error: subError } = await supabase
        .from('kk_cards')
        .update({ is_archived: true, is_starred: false, updated_at: new Date().toISOString() })
        .eq('parent_id', cardId)

      if (subError) throw subError
    }

    revalidatePath('/boards')
    if (currentCard.column_id) {
      const { data: column } = await supabase
        .from('kk_columns')
        .select('board_id')
        .eq('id', currentCard.column_id)
        .single()
      if (column?.board_id) {
        revalidatePath(`/boards/${column.board_id}`)
      }
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