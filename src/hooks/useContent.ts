'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  createPillar,
  createPost,
  deletePost,
  setPillarArchived,
  updatePillar,
  updatePost,
  type ActionResult,
} from '@/actions/content'
import { contentKeys, fetchPillars, fetchPosts } from '@/lib/content/queries'
import { useAuthStore } from '@/store/authStore'
import type { ContentPillar, ContentPost, PillarColor } from '@/types/database.types'

// Reads gaan rechtstreeks vanuit de browser naar Supabase (RLS: user_id =
// auth.uid() op kk_content_pillars en kk_content_posts). De browser-client is
// singleton via src/lib/supabase/client.ts. Mutaties blijven server actions.
// Bij SSR-hydratie matchen de keys met de prefetch in
// src/app/(dashboard)/content/page.tsx (SC-002/SC-003: geen read-round-trips
// na hydratie). Datalaag conform decisions/2026-09-22-uren-reads-browser-client.md.

function browserSupabase(): ReturnType<typeof createBrowserSupabaseClient> {
  return createBrowserSupabaseClient()
}

function currentUserId(): string {
  const userId = useAuthStore.getState().userId
  if (!userId) throw new Error('Niet ingelogd')
  return userId
}

// ============================================================
// READS
// ============================================================

export function usePillars() {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: contentKeys.pillars,
    queryFn: () => fetchPillars(browserSupabase(), currentUserId()),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

export function usePosts() {
  const userId = useAuthStore((s) => s.userId)
  return useQuery({
    queryKey: contentKeys.posts,
    queryFn: () => fetchPosts(browserSupabase(), currentUserId()),
    enabled: !!userId,
    staleTime: 30_000,
  })
}

// ============================================================
// SOORTEN
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

// ============================================================
// IDEEËN
// ============================================================

export function useCreatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof createPost>[0]) => createPost(input),
    onSuccess: (result: ActionResult<ContentPost>) => {
      if (!result.success) return
      queryClient.setQueryData<ContentPost[]>(contentKeys.posts, (old) => {
        const current = old ?? []
        return [result.data, ...current.filter((post) => post.id !== result.data.id)]
      })
      queryClient.invalidateQueries({ queryKey: contentKeys.posts })
    },
  })
}

export function useUpdatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, patch }: { postId: string; patch: Parameters<typeof updatePost>[1] }) =>
      updatePost(postId, patch),
    onSuccess: (result: ActionResult<ContentPost>) => {
      if (!result.success) return
      queryClient.setQueryData<ContentPost[]>(contentKeys.posts, (old) =>
        (old ?? []).map((post) => (post.id === result.data.id ? result.data : post)),
      )
      queryClient.invalidateQueries({ queryKey: contentKeys.posts })
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (result: ActionResult<null>, postId: string) => {
      if (!result.success) return
      queryClient.setQueryData<ContentPost[]>(contentKeys.posts, (old) =>
        (old ?? []).filter((post) => post.id !== postId),
      )
      queryClient.invalidateQueries({ queryKey: contentKeys.posts })
    },
  })
}
