'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { MAX_BODY_LENGTH, charCount, hookPreview, statusLabel, validateStatusChange } from '@/lib/content/ideas'
import { useDeletePost, useUpdatePost } from '@/hooks/useContent'
import { useToast } from '@/components/ui/toast'
import type { ContentPost, ContentStatus } from '@/types/database.types'

interface IdeaEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: ContentPost
  /** Actieve soorten + de huidige (mogelijk gearchiveerde) soort */
  pillarOptions: { value: string; label: string }[]
}

interface FormState {
  title: string
  pillar_id: string
  status: ContentStatus
  body: string
  source_url: string
  notes: string
}

function toFormState(post: ContentPost): FormState {
  return {
    title: post.title,
    pillar_id: post.pillar_id ?? '',
    status: post.status,
    body: post.body,
    source_url: post.source_url ?? '',
    notes: post.notes ?? '',
  }
}

const nlNumber = new Intl.NumberFormat('nl-NL')

/**
 * Detail-editor voor een idee (US1/FR-011/FR-012): titel, soort, status,
 * idee-tekst, bron-URL en notities. Format, Datum, Tijd en LinkedIn-URL
 * bestaan hier bewust niet meer. Tekenteller, hook-preview en "Kopieer tekst"
 * blijven behouden. Opslaan via knop of Ctrl/Cmd+S; sluiten met wijzigingen en
 * verwijderen vragen om een in-app bevestiging.
 */
export function IdeaEditorDialog({ open, onOpenChange, post, pillarOptions }: IdeaEditorDialogProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(post))
  const [confirmClose, setConfirmClose] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updatePost = useUpdatePost()
  const deletePost = useDeletePost()
  const { toast } = useToast()

  // Resync na serverwijziging (updated_at verandert bij elke opslag). Niet op
  // het post-object zelf: een cache-refetch met gelijke waarden mag het
  // formulier tijdens het typen niet resetten.
  useEffect(() => {
    setForm(toFormState(post))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync alleen bij serverwijziging, niet bij elke cache-refetch
  }, [post.id, post.updated_at])

  const dirty = useMemo(() => {
    const initial = toFormState(post)
    return (Object.keys(initial) as (keyof FormState)[]).some((key) => form[key] !== initial[key])
  }, [form, post])

  const count = charCount(form.body)
  const { preview, truncated } = useMemo(() => hookPreview(form.body), [form.body])

  const requestClose = () => {
    if (dirty) {
      setConfirmClose(true)
    } else {
      onOpenChange(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'De titel is verplicht.' })
      return
    }
    const check = validateStatusChange({ body: form.body, status: form.status }, form.status)
    if (!check.ok) {
      toast({ title: 'Status niet geldig', description: check.reason, variant: 'destructive' })
      return
    }

    try {
      const result = await updatePost.mutateAsync({
        postId: post.id,
        patch: {
          title: form.title,
          pillar_id: form.pillar_id || null,
          status: form.status,
          body: form.body,
          source_url: form.source_url || null,
          notes: form.notes || null,
        },
      })

      if (!result.success) {
        toast({ title: 'Opslaan mislukt', description: result.error, variant: 'destructive' })
        return
      }

      setForm(toFormState(result.data))
      toast({ title: 'Opgeslagen' })
    } catch (err) {
      toast({
        title: 'Opslaan mislukt',
        description: err instanceof Error ? err.message : 'Onbekende fout',
        variant: 'destructive',
      })
    }
  }

  // Ctrl/Cmd+S opent opslaan (FR-011)
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form, post])

  const handleStatusChange = (next: string) => {
    const nextStatus = next as ContentStatus
    const check = validateStatusChange({ body: form.body, status: form.status }, nextStatus)
    if (!check.ok) {
      toast({ title: 'Status niet gewijzigd', description: check.reason })
      return
    }
    setForm((current) => ({ ...current, status: nextStatus }))
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(form.body)
      toast({ title: 'Idee-tekst gekopieerd', description: 'De volledige tekst staat op het klembord.' })
    } catch {
      toast({ title: 'Kopiëren mislukt', description: 'Kon het klembord niet gebruiken.', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    try {
      const result = await deletePost.mutateAsync(post.id)
      setConfirmDelete(false)
      if (!result.success) {
        toast({ title: 'Verwijderen mislukt', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Idee verwijderd' })
      onOpenChange(false)
    } catch (err) {
      setConfirmDelete(false)
      toast({
        title: 'Verwijderen mislukt',
        description: err instanceof Error ? err.message : 'Onbekende fout',
        variant: 'destructive',
      })
    }
  }

  const statusOptions: { value: string; label: string }[] = (
    ['idee', 'concept', 'klaar', 'gepland', 'live'] as ContentStatus[]
  ).map((status) => ({ value: status, label: statusLabel(status) }))

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose() }}>
        <div className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Idee bewerken</DialogTitle>
            <DialogDescription>
              Werk je idee uit. Publiceren of inplannen doe je zelf in LinkedIn; hier bewaar je alleen het idee.
            </DialogDescription>
          </DialogHeader>
          <DialogContent className="space-y-3" data-testid="idea-editor">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="idea-editor-title" className="text-xs font-medium text-muted-foreground">
                  Titel (verplicht)
                </label>
                <Input
                  id="idea-editor-title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  data-testid="idea-editor-title"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="idea-editor-pillar" className="text-xs font-medium text-muted-foreground">
                  Contentsoort
                </label>
                <Select
                  id="idea-editor-pillar"
                  value={form.pillar_id}
                  onValueChange={(value) => setForm((current) => ({ ...current, pillar_id: value }))}
                  options={[{ value: '', label: 'Geen soort' }, ...pillarOptions]}
                  data-testid="idea-editor-pillar"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="idea-editor-status" className="text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <Select
                  id="idea-editor-status"
                  value={form.status}
                  onValueChange={handleStatusChange}
                  options={statusOptions}
                  data-testid="idea-editor-status"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="idea-editor-body" className="text-xs font-medium text-muted-foreground">
                    Idee-tekst
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs tabular-nums text-muted-foreground', count > MAX_BODY_LENGTH && 'font-medium text-red-600 dark:text-red-400')}>
                      {nlNumber.format(count)} / 3.000
                    </span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Kopieer tekst
                    </button>
                  </div>
                </div>
                <Textarea
                  id="idea-editor-body"
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  className="min-h-[180px]"
                  placeholder="Werk je idee uit…"
                  data-testid="idea-editor-body"
                />
                {(preview || truncated) && (
                  <div className="rounded-md border border-dashed bg-muted/40 p-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Opening in de feed (benadering)
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm">
                      {preview}
                      {truncated && <span className="text-muted-foreground"> …meer</span>}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label htmlFor="idea-editor-source" className="text-xs font-medium text-muted-foreground">
                  Bron-URL
                </label>
                <Input
                  id="idea-editor-source"
                  type="url"
                  value={form.source_url}
                  onChange={(event) => setForm((current) => ({ ...current, source_url: event.target.value }))}
                  placeholder="https://…"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="idea-editor-notes" className="text-xs font-medium text-muted-foreground">
                  Notities
                </label>
                <Textarea
                  id="idea-editor-notes"
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  className="min-h-[60px]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                data-testid="idea-editor-delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Verwijderen
              </button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={requestClose}>
                  Sluiten
                </Button>
                <Button type="button" onClick={() => void handleSave()} disabled={updatePost.isPending} data-testid="idea-editor-save">
                  Opslaan
                </Button>
              </div>
            </div>
          </DialogContent>
        </div>
      </Dialog>

      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <div className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Niet-opgeslagen wijzigingen</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <p className="text-sm text-muted-foreground">
              Je hebt wijzigingen die nog niet zijn opgeslagen. Wil je sluiten zonder op te slaan?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmClose(false)}>
                Blijf bewerken
              </Button>
              <Button type="button" variant="destructive" onClick={() => { setConfirmClose(false); onOpenChange(false) }}>
                Sluiten zonder opslaan
              </Button>
            </div>
          </DialogContent>
        </div>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <div className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Idee verwijderen?</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <p className="text-sm text-muted-foreground">
              Wil je &quot;{post.title}&quot; definitief verwijderen? Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                Annuleren
              </Button>
              <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={deletePost.isPending}>
                Verwijderen
              </Button>
            </div>
          </DialogContent>
        </div>
      </Dialog>
    </>
  )
}
