'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = any

// Create a new card in a specific column
export async function createCardInColumn(data: {
  columnId: string
  title: string
  description?: string
  url?: string
  deadline?: string
}) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get the next position for the card in this column
    const { count: cardCount } = await untypedClient
      .from('kk_cards')
      .select('*', { count: 'exact', head: true })
      .eq('column_id', data.columnId)

    // Create the card
    const { data: card } = await untypedClient
      .from('kk_cards')
      .insert({
        column_id: data.columnId,
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
    return { success: true, card }
  } catch (error) {
    console.error('Error creating card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Create a new card (for inbox)
export async function createCard(data: {
  title: string
  description?: string
  url?: string
  deadline?: string
}) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Find the user's inbox board
    const { data: inboxBoard } = await untypedClient
      .from('kk_boards')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_inbox', true)
      .single()

    if (!inboxBoard) throw new Error('Inbox board not found')

    // Find the first column in the inbox board (typically "To Do")
    const { data: firstColumn } = await untypedClient
      .from('kk_columns')
      .select('id')
      .eq('board_id', inboxBoard.id)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (!firstColumn) throw new Error('No columns found in inbox board')

    // Get the next position for the card
    const { count: cardCount } = await untypedClient
      .from('kk_cards')
      .select('*', { count: 'exact', head: true })
      .eq('column_id', firstColumn.id)

    // Create the card
    const { data: card } = await untypedClient
      .from('kk_cards')
      .insert({
        column_id: firstColumn.id,
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
    revalidatePath(`/boards/${inboxBoard.id}`)

    return { success: true, card }
  } catch (error) {
    console.error('Error creating card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Get user's inbox board for quick capture
export async function getInboxBoard() {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: board } = await untypedClient
      .from('kk_boards')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_inbox', true)
      .single()

    return board
  } catch (error) {
    // PGRST116 is "no rows" error which is expected when no inbox board
    if (error instanceof Error && error.message.includes('PGRST116')) {
      return null
    }
    console.error('Error getting inbox board:', error)
    return null
  }
}

// Update a card
export async function updateCard(cardId: string, data: Record<string, unknown>) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { data: updatedCard } = await untypedClient
      .from('kk_cards')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', cardId)
      .select()
      .single()

    if (!updatedCard) throw new Error('Failed to update card')
    
    revalidatePath('/boards')
    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error updating card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Delete a card
export async function deleteCard(cardId: string) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    const { error } = await untypedClient
      .from('kk_cards')
      .delete()
      .eq('id', cardId)

    if (error) throw error
    
    revalidatePath('/boards')
    return { success: true }
  } catch (error) {
    console.error('Error deleting card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Toggle archive status of a card
export async function toggleArchiveCard(cardId: string) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    
    // First get the current card to check archive status
    const { data: currentCard } = await untypedClient
      .from('kk_cards')
      .select('is_archived')
      .eq('id', cardId)
      .single()

    if (!currentCard) throw new Error('Card not found')

    // Toggle the archive status
    const { data: updatedCard } = await untypedClient
      .from('kk_cards')
      .update({ is_archived: !currentCard.is_archived, updated_at: new Date().toISOString() })
      .eq('id', cardId)
      .select()
      .single()

    if (!updatedCard) throw new Error('Failed to update card')
    
    revalidatePath('/boards')
    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error toggling archive card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Move a card to a different column
export async function moveCard(cardId: string, newColumnId: string, newPosition: number) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    
    // Update the card's column and position
    const { data: updatedCard } = await untypedClient
      .from('kk_cards')
      .update({ 
        column_id: newColumnId, 
        position: newPosition,
        updated_at: new Date().toISOString() 
      })
      .eq('id', cardId)
      .select()
      .single()

    if (!updatedCard) throw new Error('Failed to move card')
    
    revalidatePath('/boards')
    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error moving card:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Reorder cards within a column
export async function reorderCards(columnId: string, cardIds: string[]) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    
    // Update positions for all cards in the column
    const updates = cardIds.map((cardId, index) => 
      untypedClient
      .from('kk_cards')
        .update({ position: index, updated_at: new Date().toISOString() })
        .eq('id', cardId)
    )

    // Execute all updates
    const results = await Promise.all(updates)
    
    // Check for any errors
    for (const result of results) {
      if (result.error) throw result.error
    }
    
    revalidatePath('/boards')
    return { success: true }
  } catch (error) {
    console.error('Error reordering cards:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Move a card to a different board
export async function moveCardToBoard(cardId: string, newBoardId: string) {
  try {
    const supabase = await createClient()
    const untypedClient = supabase as unknown as UntypedClient
    
    // Get the first column of the target board
    const { data: targetColumn } = await untypedClient
      .from('kk_columns')
      .select('id')
      .eq('board_id', newBoardId)
      .order('position', { ascending: true })
      .limit(1)
      .single()

    if (!targetColumn) throw new Error('Target board has no columns')

    // Move the card to the first column of the new board
    const { data: updatedCard } = await untypedClient
      .from('kk_cards')
      .update({ 
        column_id: targetColumn.id,
        updated_at: new Date().toISOString() 
      })
      .eq('id', cardId)
      .select()
      .single()

    if (!updatedCard) throw new Error('Failed to move card')
    
    revalidatePath('/boards')
    return { success: true, card: updatedCard }
  } catch (error) {
    console.error('Error moving card to board:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}