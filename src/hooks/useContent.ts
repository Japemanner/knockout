'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  createPost,
  createPillar,
  deletePost,
  deleteSlot,
  movePost,
  setPillarArchived,
  updatePillar,
  updatePost,
  upsertSlot,
  type ActionResult,
} from '@/actions/content'
import { monthGridRange } from '@/lib/content/calendar'
import { contentKeys, fetchIdeas, fetchMonthPosts, fetchPillarsWithSlots } from '@/lib/content/queries'
import { useToast } from '@/components/ui/toast'
import { useAuthStore } from '@/store/authStore'
import type { ContentPillar, ContentPost, PillarColor } from '@/types/database.types'

// Reads gaan rechtstreeks vanuit de browser naar Supabase (RLS: user_id =
// auth.uid() op kk_content_pillars, kk_content_slots en kk_content_posts).
// De browser-client is singleton via src/lib/supabase/client.ts. Mutaties
// blijven server actions. Bij SSR-hydratie matchen de keys met de prefetch
// in src/app/(dashboard)/content/page.tsx (SC-004: geen read-round-trips
// na hydratie). Datalaag conform decisions/2026-09-22-uren-reads-browser-client.md.

function browserSupabase(): ReturnType<typeof createBrowserSupabaseClient> {
  return createBrowserSupabaseClient()
}

function currentUserId(): string {
  const userId = useAuthStore.getState().userId
  if (!userId) throw new Error('Niet ingelogd')
  return userId
}

/** Rastergrenzen van een maand (yyyy-MM): maandag eerste week t/m zondag laatste week */
function gridRange(ym: string): { gridStart: string; gridEnd: string } {
  const { gridStart, gridEnd } = monthGridRange(ym)
  return { gridStart, gridEnd }
}

// ============================================================
// READS
// ============================================================

export function usePillars() {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: contentKeys.pillars,
    queryFn: () => fetchPillarsWithSlots(browserSupabase(), currentUserId()),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function useMonthPosts(ym: string) {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: contentKeys.month(ym),
    queryFn: () => {
      const { gridStart, gridEnd } = gridRange(ym)
      return fetchMonthPosts(browserSupabase(), currentUserId(), gridStart, gridEnd)
    },
    enabled: !!userId && /^\d{4}-\d{2}$/.test(ym),
    staleTime: 30_000,
  })
}

export function useIdeas() {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: contentKeys.ideas,
    queryFn: () => fetchIdeas(browserSupabase(), currentUserId()),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

// ============================================================
// SOORTEN & SLOTS
// ============================================================

function useInvalidatePillars() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: contentKeys.pillars })
}

export function useCreatePillar() {
  const invalidate = useInvalidatePillars()
  return useMutation({
    mutationFn: (input: { name: string; audience?: string | null; description?: string | null; color: PillarColor }) =>
      createPillar(input),
    onSuccess: (result: ActionResult<ContentPillar>) => {
      if (result.success) invalidate()
    },
  })
}

export function useUpdatePillar() {
  const invalidate = useInvalidatePillars()
  return useMutation({
    mutationFn: ({ pillarId, patch }: { pillarId: string; patch: Parameters<typeof updatePillar>[1] }) =>
      updatePillar(pillarId, patch),
    onSuccess: (result: ActionResult<ContentPillar>) => {
      if (result.success) invalidate()
    },
  })
}

export function useSetPillarArchived() {
  const invalidate = useInvalidatePillars()
  return useMutation({
    mutationFn: ({ pillarId, archived }: { pillarId: string; archived: boolean }) =>
      setPillarArchived(pillarId, archived),
    onSuccess: (result: ActionResult<ContentPillar>) => {
      if (result.success) invalidate()
    },
  })
}

export function useUpsertSlot() {
  const invalidate = useInvalidatePillars()
  return useMutation({
    mutationFn: (input: Parameters<typeof upsertSlot>[0]) => upsertSlot(input),
    onSuccess: (result) => {
      if (result.success) invalidate()
    },
  })
}

export function useDeleteSlot() {
  const invalidate = useInvalidatePillars()
  return useMutation({
    mutationFn: (slotId: string) => deleteSlot(slotId),
    onSuccess: (result) => {
      if (result.success) invalidate()
    },
  })
}

// ============================================================
// POSTS
// ============================================================

function useInvalidatePosts() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['content', 'month'] })
    queryClient.invalidateQueries({ queryKey: contentKeys.ideas })
  }
}

export function useCreatePost() {
  const invalidate = useInvalidatePosts()
  return useMutation({
    mutationFn: (input: Parameters<typeof createPost>[0]) => createPost(input),
    onSuccess: (result: ActionResult<ContentPost>) => {
      if (result.success) invalidate()
    },
  })
}

export function useUpdatePost() {
  const invalidate = useInvalidatePosts()
  return useMutation({
    mutationFn: ({ postId, patch }: { postId: string; patch: Parameters<typeof updatePost>[1] }) =>
      updatePost(postId, patch),
    onSuccess: (result: ActionResult<ContentPost>) => {
      if (result.success) invalidate()
    },
  })
}

export function useDeletePost() {
  const invalidate = useInvalidatePosts()
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (result) => {
      if (result.success) invalidate()
    },
  })
}

/**
 * Verplaatsen (slepen) met optimistische update volgens het uren-patroon:
 * cancelQueries + getQueriesData/setQueriesData op prefix ['content','month']
 * en ['content','ideas'], snapshot-rollback in onError + destructive toast.
 * De mutationFn gooit bij een serverweigering (gepland/live naar de
 * ideeënbak), zodat de rollback en de toast ook daar gelden (FR-033).
 */
export function useMovePost() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ postId, date, time }: { postId: string; date: string | null; time: string | null }) => {
      const result = await movePost(postId, date, time)
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    onMutate: async ({ postId, date, time }) => {
      await queryClient.cancelQueries({ queryKey: ['content', 'month'] })
      await queryClient.cancelQueries({ queryKey: contentKeys.ideas })

      const monthSnapshots = queryClient.getQueriesData<ContentPost[]>({
        queryKey: ['content', 'month'],
      })
      const ideasSnapshot = queryClient.getQueryData<ContentPost[]>(contentKeys.ideas) ?? null

      for (const [key, posts] of monthSnapshots) {
        if (!posts) continue
        queryClient.setQueryData(
          key,
          date === null
            ? posts.filter((p) => p.id !== postId)
            : posts.some((p) => p.id === postId)
              ? posts.map((p) => (p.id === postId ? { ...p, planned_date: date, planned_time: time } : p))
              : posts,
        )
      }

      if (ideasSnapshot) {
        if (date === null) {
          const source = monthSnapshots
            .map(([, posts]) => posts?.find((p) => p.id === postId))
            .find((p): p is ContentPost => !!p)
          if (source && !ideasSnapshot.some((p) => p.id === postId)) {
            queryClient.setQueryData(contentKeys.ideas, [
              { ...source, planned_date: null, planned_time: null },
              ...ideasSnapshot,
            ])
          }
        } else {
          queryClient.setQueryData(
            contentKeys.ideas,
            ideasSnapshot.some((p) => p.id === postId)
              ? ideasSnapshot.filter((p) => p.id !== postId)
              : ideasSnapshot,
          )
        }
      }

      return { monthSnapshots, ideasSnapshot }
    },
    onError: (err, _input, context) => {
      for (const [key, snapshot] of context?.monthSnapshots ?? []) {
        queryClient.setQueryData(key, snapshot)
      }
      if (context?.ideasSnapshot !== null && context?.ideasSnapshot !== undefined) {
        queryClient.setQueryData(contentKeys.ideas, context.ideasSnapshot)
      }
      toast({ title: 'Verplaatsen mislukt', description: err instanceof Error ? err.message : 'Onbekende fout', variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['content', 'month'] })
      queryClient.invalidateQueries({ queryKey: contentKeys.ideas })
    },
  })
}