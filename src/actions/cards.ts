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

    const { count: cardCount } = await supabase
      .from('kk_cards')
      .select('*', { count: 'exact', head: true })
      .eq('column_id', data.columnId)

    const { data: card } = await supabase
      .from('kk_cards')
      .insert({
        column_id: data.columnId,
        parent_id: null,
        title: data.title,
        description: data.description || null,
        url: data.url || null,
        deadline: data.deadline || null,
        position: cardCount || 0,
        is_starred: false,
        is_archived: false,
      })
      .select()
      .single()

    if (!card) throw new Error('Failed to create card')

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

    const { data: inboxBoard } = await supabase
      .from('kk_boards')
      .select('id')
      .eq('user_id', userId)
      .eq('is_inbox', true)
      .single()

    if (!inboxBoard) throw new Error('Inbox board not found')

    const { data: firstColumn } = await supabase
      .from('kk_columns')
      .select('id')
      .eq('board_id', inboxBoard.id)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (!firstColumn) throw new Error('No columns found in inbox board')

    const { count: cardCount } = await supabase
      .from('kk_cards')
      .select('*', { count: 'exact', head: true })
      .eq('column_id', firstColumn.id)

    const { data: card } = await supabase
      .from('kk_cards')
      .insert({
        column_id: firstColumn.id,
        parent_id: null,
        title: data.title,
        description: data.description || null,
        url: data.url || null,
        deadline: data.deadline || null,
        position: cardCount || 0,
        is_starred: false,
        is_archived: false,
      })
      .select()
      .single()

    if (!card) throw new Error('Failed to create card')

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

    const { data: column } = await supabase
      .from('kk_columns')
      .select('name')
      .eq('id', newColumnId)
      .single()

    const isDoneColumn = column?.name?.toLowerCase() === 'done'

    const { data: updatedCard } = await supabase
      .from('kk_cards')
      .update({
        column_id: newColumnId,
        position: newPosition,
        ...(isDoneColumn ? { is_starred: false } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single()

    if (!updatedCard) throw new Error('Failed to move card')

    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error moving card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function reorderCards(columnId: string, cardIds: string[]) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const updates = cardIds.map((cardId, index) =>
      supabase
        .from('kk_cards')
        .update({ position: index, updated_at: new Date().toISOString() })
        .eq('id', cardId)
    )

    const results = await Promise.all(updates)

    for (const result of results) {
      if (result.error) throw result.error
    }

    return { success: true }
  } catch (error) {
    console.error('Error reordering cards:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function moveCardToBoard(cardId: string, newBoardId: string) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: targetColumn } = await supabase
      .from('kk_columns')
      .select('id, name')
      .eq('board_id', newBoardId)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (!targetColumn) throw new Error('Target board has no columns')

    const isDoneColumn = targetColumn.name?.toLowerCase() === 'done'

    const { data: updatedCard } = await supabase
      .from('kk_cards')
      .update({
        column_id: targetColumn.id,
        parent_id: null,
        ...(isDoneColumn ? { is_starred: false } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single()

    if (!updatedCard) throw new Error('Failed to move card')

    if (isDoneColumn) revalidatePath('/starred')

    const { error: subError } = await supabase
      .from('kk_cards')
      .update({
        column_id: targetColumn.id,
        updated_at: new Date().toISOString()
      })
      .eq('parent_id', cardId)

    if (subError) throw subError

    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error moving card to board:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function moveCardUnderParent(cardId: string, parentId: string) {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: parent } = await supabase
      .from('kk_cards')
      .select('id, column_id, parent_id')
      .eq('id', parentId)
      .single()

    if (!parent) throw new Error('Parent card not found')

    if (parent.parent_id !== null) throw new Error('Cannot nest under a subtask')

    const { data: parentColumn } = await supabase
      .from('kk_columns')
      .select('name')
      .eq('id', parent.column_id)
      .single()

    const isDoneColumn = parentColumn?.name?.toLowerCase() === 'done'

    const { data: child } = await supabase
      .from('kk_cards')
      .select('id, parent_id')
      .eq('id', cardId)
      .single()

    if (!child) throw new Error('Card not found')

    if (child.parent_id === parentId) return { success: true }

    let current = parent
    while (current.parent_id) {
      if (current.parent_id === cardId) throw new Error('Cyclic reference detected')
      const { data: ancestor } = await supabase
        .from('kk_cards')
        .select('parent_id')
        .eq('id', current.parent_id)
        .single()
      if (!ancestor) break
      current = ancestor as { parent_id: string | null }
    }

    const { count: subCount } = await supabase
      .from('kk_cards')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parentId)

    const { data: updatedCard } = await supabase
      .from('kk_cards')
      .update({
        parent_id: parentId,
        column_id: parent.column_id,
        position: subCount || 0,
        ...(isDoneColumn ? { is_starred: false } : {}),
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId)
      .select()
      .single()

    if (!updatedCard) throw new Error('Failed to move card under parent')

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