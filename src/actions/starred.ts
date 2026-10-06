'use server'

import { getAuthenticatedClient } from '@/lib/supabase/actions'
import { revalidatePath } from 'next/cache'
import type { Card } from '@/types/database.types'

export type StarredTargetColumn = 'Backlog' | 'Doing' | 'Done'

export async function toggleStar(data: { cardId: string; isStarred: boolean }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.from('kk_cards').update({ is_starred: data.isStarred }).eq('id', data.cardId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function batchToggleStars(data: { cardIds: string[]; isStarred: boolean }) {
  try {
    const { supabase } = await getAuthenticatedClient()
    const { error } = await supabase.rpc('kk_batch_toggle_stars', {
      p_card_ids: data.cardIds,
      p_is_starred: data.isStarred,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}

export async function moveStarredCardByColumn(data: {
  cardId: string
  targetColumn: StarredTargetColumn
}): Promise<{ success: true; card: Card } | { success: false; error: string }> {
  try {
    const { supabase } = await getAuthenticatedClient()

    const { data: card, error: cardError } = await supabase
      .from('kk_cards')
      .select('id, is_starred, is_archived, parent_id, kk_columns!inner(id, name, board_id)')
      .eq('id', data.cardId)
      .single()

    if (cardError || !card) {
      return { success: false, error: cardError?.message ?? 'Kaart niet gevonden' }
    }

    const sourceColumn = card.kk_columns as { id: string; name: string; board_id: string } | null
    if (!sourceColumn?.board_id) {
      return { success: false, error: 'Bronkolom van de kaart niet gevonden' }
    }
    if (!card.is_starred) {
      return { success: false, error: 'Kaart is niet gesterd' }
    }
    if (card.is_archived) {
      return { success: false, error: 'Kaart is gearchiveerd' }
    }
    if (card.parent_id !== null) {
      return { success: false, error: 'Subtaken kunnen alleen op het bord verplaatst worden' }
    }

    const { data: targetColumn } = await supabase
      .from('kk_columns')
      .select('id, name')
      .eq('board_id', sourceColumn.board_id)
      .ilike('name', data.targetColumn)
      .order('position')
      .limit(1)
      .maybeSingle()

    if (!targetColumn) {
      return { success: false, error: `Doelkolom ${data.targetColumn} niet gevonden op het bronbord` }
    }

    const { data: maxPos } = await supabase
      .from('kk_cards')
      .select('position')
      .eq('column_id', targetColumn.id)
      .eq('parent_id', null)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const newPosition = (maxPos?.position ?? -1) + 1

    const { data: updatedCard, error: moveError } = await supabase
      .rpc('kk_move_card', {
        p_card_id: data.cardId,
        p_column_id: targetColumn.id,
        p_position: newPosition,
      })
      .single()

    if (moveError || !updatedCard) {
      return { success: false, error: moveError?.message ?? 'Verplaatsen mislukt' }
    }

    revalidatePath('/command-center')
    revalidatePath(`/boards/${sourceColumn.board_id}`)

    return { success: true, card: updatedCard as Card }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
}