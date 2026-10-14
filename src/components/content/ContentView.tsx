'use client'

import { useCallback, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  buildMonthGridForYm,
  computeSlotOccurrences,
  matchSlots,
  resolveDropTime,
  type SlotOccurrence,
} from '@/lib/content/calendar'
import { amsterdamTodayISO } from '@/lib/hours/dates'
import { useCreatePost, useIdeas, useMonthPosts, useMovePost, usePillars } from '@/hooks/useContent'
import { MonthGrid, MobileDayList } from '@/components/content/MonthGrid'
import { IdeasPanel } from '@/components/content/IdeasPanel'
import { PostChip } from '@/components/content/PostChip'
import { PillarsDialog } from '@/components/content/PillarsDialog'
import { PostEditorDialog } from '@/components/content/PostEditorDialog'
import type { ContentPost } from '@/types/database.types'

function shiftYm(ym: string, delta: number): string {
  const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + delta, 1)
  return format(d, 'yyyy-MM')
}

function ymLabel(ym: string): string {
  const d = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1)
  return format(d, 'MMMM yyyy', { locale: nl })
}

interface ContentViewProps {
  /** Amsterdamse huidige maand ('yyyy-MM') als startpunt van de kalender */
  initialYm: string
}

/**
 * Hoofdweergave van de content-kalender (US2): maandnavigatie, raster van
 * hele weken met posts en lege slots (slotmatching per ISO-week en per
 * contentsoort), ideeënbak ernaast, mobiele lijstweergave onder 768 px.
 * Slepen: idee → dagcel, post → andere dag (gepland met LinkedIn-melding),
 * post → ideeënbak alleen bij Idee/Concept/Klaar; Live is niet sleepbaar.
 */
export function ContentView({ initialYm }: ContentViewProps) {
  const [ym, setYm] = useState(initialYm)
  const [pillarsOpen, setPillarsOpen] = useState(false)
  const [editorPostId, setEditorPostId] = useState<string | null>(null)
  const [activePost, setActivePost] = useState<ContentPost | null>(null)

  const { data: pillars = [] } = usePillars()
  const { data: monthPosts = [] } = useMonthPosts(ym)
  const { data: ideas = [] } = useIdeas()
  const createPost = useCreatePost()
  const movePost = useMovePost()
  const { toast } = useToast()

  const today = amsterdamTodayISO()

  const weeks = useMemo(() => buildMonthGridForYm(ym), [ym])
  const gridDates = useMemo(() => weeks.flat().map((d) => d.date), [weeks])
  const allSlots = useMemo(() => pillars.flatMap((p) => p.slots), [pillars])

  const occurrences = useMemo(() => computeSlotOccurrences(gridDates, pillars, allSlots), [gridDates, pillars, allSlots])
  const unfilledSlots = useMemo(() => matchSlots(occurrences, monthPosts), [occurrences, monthPosts])

  const postsByDate = useMemo(() => {
    const map = new Map<string, ContentPost[]>()
    for (const post of monthPosts) {
      if (!post.planned_date) continue
      const list = map.get(post.planned_date) ?? []
      list.push(post)
      map.set(post.planned_date, list)
    }
    return map
  }, [monthPosts])

  const slotsByDate = useMemo(() => {
    const map = new Map<string, SlotOccurrence[]>()
    for (const slot of unfilledSlots) {
      const list = map.get(slot.date) ?? []
      list.push(slot)
      map.set(slot.date, list)
    }
    return map
  }, [unfilledSlots])

  const pillarById = useMemo(() => new Map(pillars.map((p) => [p.id, p])), [pillars])
  const allPosts = useMemo(() => [...monthPosts, ...ideas], [monthPosts, ideas])
  const editorPost = useMemo(() => allPosts.find((p) => p.id === editorPostId) ?? null, [allPosts, editorPostId])

  const activePillarOptions = useMemo(
    () =>
      pillars
        .filter((p) => !p.archived)
        .map((p) => ({ value: p.id, label: p.name })),
    [pillars],
  )

  const editorPillarOptions = useMemo(() => {
    const current = editorPost?.pillar_id ? pillarById.get(editorPost.pillar_id) : null
    if (current?.archived && !activePillarOptions.some((o) => o.value === current.id)) {
      return [...activePillarOptions, { value: current.id, label: `${current.name} (gearchiveerd)` }]
    }
    return activePillarOptions
  }, [activePillarOptions, editorPost, pillarById])

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleOpenPost = useCallback((post: ContentPost) => setEditorPostId(post.id), [])

  const handleSlotClick = useCallback(
    (occurrence: SlotOccurrence) => {
      // Klik op leeg slot: nieuwe post met datum, tijd en soort ingevuld,
      // status Concept, editor openen (FR-013)
      createPost.mutate(
        {
          title: 'Nieuwe post',
          status: 'concept',
          pillar_id: occurrence.pillarId,
          planned_date: occurrence.date,
          planned_time: occurrence.time,
        },
        {
          onSuccess: (result) => {
            if (result.success) {
              setEditorPostId(result.data.id)
            } else {
              toast({ title: 'Kon post niet aanmaken', description: result.error, variant: 'destructive' })
            }
          },
        },
      )
    },
    [createPost, toast],
  )

  const handleNewPost = useCallback(() => {
    // "Nieuwe post" opent de editor voor een post zonder datum, status Idee
    createPost.mutate(
      { title: 'Nieuwe post', status: 'idee' },
      {
        onSuccess: (result) => {
          if (result.success) {
            setEditorPostId(result.data.id)
          } else {
            toast({ title: 'Kon post niet aanmaken', description: result.error, variant: 'destructive' })
          }
        },
      },
    )
  }, [createPost, toast])

  const handleQuickAdd = useCallback(
    (title: string) => {
      createPost.mutate(
        { title, status: 'idee' },
        {
          onSuccess: (result) => {
            if (!result.success) toast({ title: 'Kon idee niet aanmaken', description: result.error, variant: 'destructive' })
          },
        },
      )
    },
    [createPost, toast],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const post = allPosts.find((p) => p.id === event.active.id)
      setActivePost(post ?? null)
    },
    [allPosts],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActivePost(null)
      if (!over) return

      const post = allPosts.find((p) => p.id === active.id)
      if (!post) return

      const overId = String(over.id)

      if (overId === 'ideas') {
        // Post → ideeënbak: datum en tijd wissen; alleen Idee/Concept/Klaar (FR-030).
        // Live is niet sleepbaar (PostChip); gepland wordt hier geweigerd.
        if (post.status === 'gepland' || post.status === 'live') {
          toast({
            title: 'Kan niet naar de ideeënbak',
            description:
              post.status === 'gepland'
                ? 'Een geplande post hoort een datum te houden. Pas de status aan of verplaats naar een andere dag.'
                : 'Een live post kan niet naar de ideeënbak.',
          })
          return
        }
        if (!post.planned_date) return
        movePost.mutate({ postId: post.id, date: null, time: null })
        return
      }

      if (overId.startsWith('day:')) {
        const date = overId.slice(4)
        if (date === post.planned_date) return
        const time = resolveDropTime(post, date, unfilledSlots)
        const wasGepland = post.status === 'gepland'
        const oldDate = post.planned_date
        movePost.mutate({ postId: post.id, date, time })
        // Melding bij verplaatsen van een geplande post (FR-031)
        if (wasGepland && oldDate) {
          toast({ title: 'Pas de datum ook aan in LinkedIn' })
        }
      }
    },
    [allPosts, movePost, toast, unfilledSlots],
  )

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header: maandnavigatie, Vandaag, Nieuwe post, Soorten & slots (FR-009) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setYm((v) => shiftYm(v, -1))} aria-label="Vorige maand">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setYm((v) => shiftYm(v, 1))} aria-label="Volgende maand">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h1 className="ml-2 min-w-[11rem] text-lg font-semibold capitalize">{ymLabel(ym)}</h1>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setYm(amsterdamTodayISO().slice(0, 7))}>
            Vandaag
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" size="sm" onClick={handleNewPost} disabled={createPost.isPending}>
              <Plus className="mr-1 h-4 w-4" />
              Nieuwe post
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPillarsOpen(true)}>
              <Settings2 className="mr-1 h-4 w-4" />
              Soorten &amp; slots
            </Button>
          </div>
        </div>

        {/* Raster + ideeënbak (desktop) / daglijst + ideeënbak eronder (mobiel, FR-034) */}
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="hidden md:block">
              <MonthGrid
                weeks={weeks}
                postsByDate={postsByDate}
                slotsByDate={slotsByDate}
                pillarById={pillarById}
                today={today}
                onOpenPost={handleOpenPost}
                onSlotClick={handleSlotClick}
              />
            </div>
            <div className="md:hidden">
              <MobileDayList
                weeks={weeks}
                postsByDate={postsByDate}
                slotsByDate={slotsByDate}
                pillarById={pillarById}
                today={today}
                onOpenPost={handleOpenPost}
                onSlotClick={handleSlotClick}
              />
            </div>
          </div>
          <div className="w-full shrink-0 lg:w-80">
            <IdeasPanel
              posts={ideas}
              pillarById={pillarById}
              today={today}
              onOpenPost={handleOpenPost}
              onQuickAdd={handleQuickAdd}
            />
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Knockout publiceert niet zelf — plan de post in LinkedIn en zet de status daarna hier op &quot;Gepland&quot;.
        </p>
      </div>

      <DragOverlay>
        {activePost && (
          <div className="w-48">
            <PostChip
              post={activePost}
              pillar={activePost.pillar_id ? pillarById.get(activePost.pillar_id) ?? null : null}
              today={today}
              onOpen={() => {}}
              draggable={false}
            />
          </div>
        )}
      </DragOverlay>

      {pillarsOpen && (
        <PillarsDialog open={pillarsOpen} onOpenChange={setPillarsOpen} pillars={pillars} />
      )}

      {editorPost && (
        <PostEditorDialog
          open={!!editorPost}
          onOpenChange={(next) => { if (!next) setEditorPostId(null) }}
          post={editorPost}
          pillarOptions={editorPillarOptions}
        />
      )}
    </DndContext>
  )
}