'use client'

import { useMemo, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { countIdeasByPillar } from '@/lib/content/ideas'
import { useCreatePost, usePillars, usePosts } from '@/hooks/useContent'
import { IdeaComposer } from '@/components/content/IdeaComposer'
import { IdeaList } from '@/components/content/IdeaList'
import { ContentOverview } from '@/components/content/ContentOverview'
import { IdeaEditorDialog } from '@/components/content/IdeaEditorDialog'
import { PillarsDialog } from '@/components/content/PillarsDialog'
import type { ContentPost } from '@/types/database.types'

type ContentViewName = 'ideeen' | 'overzicht'

const TABS: { id: ContentViewName; label: string }[] = [
  { id: 'ideeen', label: 'Ideeën' },
  { id: 'overzicht', label: 'Overzicht' },
]

/**
 * Shell van de content-ideeënfeature (US1/US2): twee views als toegankelijke
 * tabbladen. "Ideeën" is de default en bevat de composer + lijst; "Overzicht"
 * toont de tellingen per contentsoort. Geen kalender, slots of drag-and-drop.
 */
export function ContentView() {
  const [view, setView] = useState<ContentViewName>('ideeen')
  const [pillarsOpen, setPillarsOpen] = useState(false)
  const [editorPostId, setEditorPostId] = useState<string | null>(null)

  const pillarsQuery = usePillars()
  const postsQuery = usePosts()
  const createPost = useCreatePost()

  const pillars = useMemo(() => pillarsQuery.data ?? [], [pillarsQuery.data])
  const posts = useMemo(() => postsQuery.data ?? [], [postsQuery.data])

  const pillarById = useMemo(() => new Map(pillars.map((pillar) => [pillar.id, pillar])), [pillars])
  const counts = useMemo(() => countIdeasByPillar(posts, pillars), [posts, pillars])
  const activePillars = useMemo(() => pillars.filter((pillar) => !pillar.archived), [pillars])

  const editorPost = useMemo(
    () => posts.find((post) => post.id === editorPostId) ?? null,
    [posts, editorPostId],
  )

  const editorPillarOptions = useMemo(() => {
    const options = activePillars.map((pillar) => ({ value: pillar.id, label: pillar.name }))
    const current = editorPost?.pillar_id ? pillarById.get(editorPost.pillar_id) : null
    if (current?.archived && !options.some((option) => option.value === current.id)) {
      options.push({ value: current.id, label: `${current.name} (gearchiveerd)` })
    }
    return options
  }, [activePillars, editorPost, pillarById])

  const handleCreate = (input: Parameters<typeof createPost.mutateAsync>[0]) => createPost.mutateAsync(input)

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const delta = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (index + delta + TABS.length) % TABS.length
    const next = TABS[nextIndex]
    if (!next) return
    setView(next.id)
    document.getElementById(`content-tab-${next.id}`)?.focus()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Content</h1>

        <div role="tablist" aria-label="Content weergaven" className="inline-flex rounded-md border p-0.5">
          {TABS.map((tab, index) => {
            const selected = view === tab.id
            return (
              <button
                key={tab.id}
                id={`content-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`content-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setView(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={cn(
                  'rounded px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  selected ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
                )}
                data-testid={`content-tab-${tab.id}`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={() => setPillarsOpen(true)}>
          <Settings2 className="mr-1 h-4 w-4" />
          Soorten
        </Button>
      </div>

      <div
        id="content-panel-ideeen"
        role="tabpanel"
        aria-labelledby="content-tab-ideeen"
        hidden={view !== 'ideeen'}
        data-testid="content-panel-ideeen"
      >
        <div className="space-y-3">
          <IdeaComposer
            pillars={activePillars}
            onCreate={handleCreate}
            isPending={createPost.isPending}
          />
          <IdeaList
            posts={posts}
            pillarById={pillarById}
            onOpen={(post: ContentPost) => setEditorPostId(post.id)}
            isLoading={postsQuery.isLoading}
            isError={postsQuery.isError}
          />
        </div>
      </div>

      <div
        id="content-panel-overzicht"
        role="tabpanel"
        aria-labelledby="content-tab-overzicht"
        hidden={view !== 'overzicht'}
        data-testid="content-panel-overzicht"
      >
        <ContentOverview counts={counts} hasPillars={pillars.length > 0} />
      </div>

      {pillarsOpen && (
        <PillarsDialog open={pillarsOpen} onOpenChange={setPillarsOpen} pillars={pillars} />
      )}

      {editorPost && (
        <IdeaEditorDialog
          open={!!editorPost}
          onOpenChange={(next) => { if (!next) setEditorPostId(null) }}
          post={editorPost}
          pillarOptions={editorPillarOptions}
        />
      )}
    </div>
  )
}
