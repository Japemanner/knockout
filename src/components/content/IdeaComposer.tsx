'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import type { ActionResult } from '@/actions/content'
import type { ContentPillar, ContentPost } from '@/types/database.types'

interface IdeaComposerProps {
  /** Alleen actieve (niet-gearchiveerde) soorten */
  pillars: ContentPillar[]
  onCreate: (input: {
    title: string
    pillar_id?: string | null
    body?: string
    source_url?: string | null
    notes?: string | null
  }) => Promise<ActionResult<ContentPost>>
  isPending: boolean
}

/**
 * Compact vastlegformulier (US1/FR-004 t/m FR-009): titel verplicht,
 * contentsoort en idee-tekst direct zichtbaar, bron-URL en notities achter
 * "Meer details". Enter in het titelveld en Ctrl/Cmd+Enter slaan op; Enter in
 * de tekstarea voegt een regel toe. Na succes leegt het formulier en keert de
 * focus terug naar de titel.
 */
export function IdeaComposer({ pillars, onCreate, isPending }: IdeaComposerProps) {
  const [title, setTitle] = useState('')
  const [pillarId, setPillarId] = useState('')
  const [body, setBody] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const formRef = useRef<HTMLFormElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const { toast } = useToast()

  const pillarOptions = [
    { value: '', label: 'Geen soort' },
    ...pillars.map((pillar) => ({ value: pillar.id, label: pillar.name })),
  ]

  const handleSubmit = async () => {
    if (submittingRef.current || isPending) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setTitleError('De titel is verplicht.')
      titleRef.current?.focus()
      return
    }

    setTitleError(null)
    setSubmitError(null)
    submittingRef.current = true

    try {
      const result = await onCreate({
        title: trimmedTitle,
        pillar_id: pillarId || null,
        body,
        source_url: sourceUrl || null,
        notes: notes || null,
      })

      if (!result.success) {
        setSubmitError(result.error)
        toast({ title: 'Opslaan mislukt', description: result.error, variant: 'destructive' })
        return
      }

      setTitle('')
      setPillarId('')
      setBody('')
      setSourceUrl('')
      setNotes('')
      setDetailsOpen(false)
      toast({ title: 'Idee opgeslagen' })
      titleRef.current?.focus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Onbekende fout'
      setSubmitError(message)
      toast({ title: 'Opslaan mislukt', description: message, variant: 'destructive' })
    } finally {
      submittingRef.current = false
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault()
        void handleSubmit()
      }}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
          event.preventDefault()
          formRef.current?.requestSubmit()
        }
      }}
      className="rounded-lg border bg-card p-3 sm:p-4"
      data-testid="idea-composer"
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end">
        <div className="space-y-1">
          <label htmlFor="idea-title" className="text-xs font-medium text-muted-foreground">
            Titel
          </label>
          <Input
            id="idea-title"
            ref={titleRef}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              if (titleError) setTitleError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
                event.preventDefault()
                formRef.current?.requestSubmit()
              }
            }}
            placeholder="Waar gaat je idee over?"
            autoFocus
            aria-invalid={!!titleError}
            aria-describedby={titleError ? 'idea-title-error' : undefined}
            data-testid="idea-title-input"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="idea-pillar" className="text-xs font-medium text-muted-foreground">
            Contentsoort
          </label>
          <Select
            id="idea-pillar"
            value={pillarId}
            onValueChange={setPillarId}
            options={pillarOptions}
            data-testid="idea-pillar-select"
          />
        </div>

        <Button type="submit" disabled={isPending} data-testid="idea-save-button">
          Opslaan
        </Button>
      </div>

      {titleError && (
        <p id="idea-title-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {titleError}
        </p>
      )}

      <div className="mt-2 space-y-1">
        <label htmlFor="idea-body" className="text-xs font-medium text-muted-foreground">
          Idee-tekst
        </label>
        <Textarea
          id="idea-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="min-h-[70px]"
          placeholder="Optioneel: werk je idee alvast uit…"
          data-testid="idea-body-input"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {detailsOpen ? 'Minder details' : 'Meer details'}
        </button>
        <span className="text-[11px] text-muted-foreground">
          Enter in titel = opslaan · Ctrl/Cmd+Enter = opslaan
        </span>
      </div>

      {detailsOpen && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="idea-source" className="text-xs font-medium text-muted-foreground">
              Bron-URL
            </label>
            <Input
              id="idea-source"
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://…"
              data-testid="idea-source-input"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="idea-notes" className="text-xs font-medium text-muted-foreground">
              Notities
            </label>
            <Textarea
              id="idea-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[50px]"
              data-testid="idea-notes-input"
            />
          </div>
        </div>
      )}

      {submitError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {submitError}
        </p>
      )}
    </form>
  )
}
