'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PostChip } from '@/components/content/PostChip'
import type { ContentPillar, ContentPost } from '@/types/database.types'

interface IdeasPanelProps {
  posts: ContentPost[]
  pillarById: Map<string, ContentPillar>
  today: string
  onOpenPost: (post: ContentPost) => void
  /** Titel + Enter maakt een nieuw idee (status Idee, geen datum) — FR-028 */
  onQuickAdd: (title: string) => void
}

/**
 * Ideeënbak naast het maandraster: alle posts zonder datum, nieuwste bovenaan,
 * met quick-add-invoer bovenin. Droppable met id `ideas`: een post hiernaartoe
 * slepen wist datum en tijd (alleen Idee/Concept/Klaar — de weigering bij
 * Gepland en het uitsluiten van Live gebeurt in ContentView, FR-030/FR-032).
 */
export function IdeasPanel({ posts, pillarById, today, onOpenPost, onQuickAdd }: IdeasPanelProps) {
  const [title, setTitle] = useState('')
  const { setNodeRef, isOver } = useDroppable({ id: 'ideas' })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const trimmed = title.trim()
    if (!trimmed) return
    e.preventDefault()
    onQuickAdd(trimmed)
    setTitle('')
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex max-h-[75vh] flex-col rounded-lg border bg-card',
        isOver && 'ring-2 ring-primary/50',
      )}
    >
      <div className="flex items-center gap-2 border-b p-3">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <h3 className="text-sm font-medium">Ideeënbak</h3>
        <span className="text-xs text-muted-foreground">{posts.length}</span>
      </div>

      <div className="p-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nieuw idee — titel typen en Enter"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="min-h-[40px] flex-1 space-y-1.5 overflow-y-auto p-3 pt-0">
        {posts.map((post) => (
          <PostChip
            key={post.id}
            post={post}
            pillar={post.pillar_id ? pillarById.get(post.pillar_id) ?? null : null}
            today={today}
            onOpen={onOpenPost}
          />
        ))}
        {posts.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Nog geen ideeën. Typ hierboven een titel en druk op Enter.
          </p>
        )}
      </div>
    </div>
  )
}