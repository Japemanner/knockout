'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  MAX_BODY_LENGTH,
  charCount,
  displayTime,
  formatLabel,
  hookPreview,
  statusLabel,
  validateStatusChange,
} from '@/lib/content/calendar'
import { useDeletePost, useUpdatePost } from '@/hooks/useContent'
import { useToast } from '@/components/ui/toast'
import type { ContentFormat, ContentPost, ContentStatus } from '@/types/database.types'

interface PostEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: ContentPost
  /** Actieve (niet-gearchiveerde) soorten + de soort van deze post */
  pillarOptions: { value: string; label: string }[]
}

interface FormState {
  title: string
  pillar_id: string
  format: ContentFormat
  status: ContentStatus
  planned_date: string
  planned_time: string
  body: string
  source_url: string
  linkedin_url: string
  notes: string
}

function toFormState(post: ContentPost): FormState {
  return {
    title: post.title,
    pillar_id: post.pillar_id ?? '',
    format: post.format,
    status: post.status,
    planned_date: post.planned_date ?? '',
    planned_time: displayTime(post.planned_time) ?? '',
    body: post.body,
    source_url: post.source_url ?? '',
    linkedin_url: post.linkedin_url ?? '',
    notes: post.notes ?? '',
  }
}

const nlNumber = new Intl.NumberFormat('nl-NL')

/**
 * Post-editor (US3): titel, contentsoort, format, status, datum, tijd,
 * posttekst (tekenteller + hook-preview + kopieerknop), bron-URL,
 * LinkedIn-URL en notities. Statusovergangen bewaakt door dezelfde
 * validateStatusChange als server-side. Opslaan expliciet (knop en
 * Ctrl/Cmd+S); sluiten met wijzigingen en verwijderen vragen om
 * bevestiging in een in-app dialoog — geen browserdialogen.
 */
export function PostEditorDialog({ open, onOpenChange, post, pillarOptions }: PostEditorDialogProps) {
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

  const buildPatch = (): Parameters<typeof updatePost.mutate>[0]['patch'] => ({
    title: form.title,
    pillar_id: form.pillar_id || null,
    format: form.format,
    status: form.status,
    planned_date: form.planned_date || null,
    planned_time: form.planned_time || null,
    body: form.body,
    source_url: form.source_url || null,
    linkedin_url: form.linkedin_url || null,
    notes: form.notes,
  })

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: 'De titel is verplicht.' })
      return
    }
    const check = validateStatusChange(
      {
        body: form.body,
        planned_date: form.planned_date || null,
        planned_time: form.planned_time || null,
        linkedin_url: form.linkedin_url || null,
        status: form.status,
      },
      form.status,
    )
    if (!check.ok) {
      toast({ title: 'Status niet geldig', description: check.reason, variant: 'destructive' })
      return
    }

    updatePost.mutate(
      { postId: post.id, patch: buildPatch() },
      {
        onSuccess: (result) => {
          if (!result.success) {
            toast({ title: 'Opslaan mislukt', description: result.error, variant: 'destructive' })
            return
          }
          // Direct resyncen op het opgeslagen resultaat: niet-opgeslagen-wijzigingen-
          // detectie staat daarna weer op schoon en de editor sluit zonder bevestiging
          setForm(toFormState(result.data))
          toast({ title: 'Opgeslagen' })
          // LinkedIn-melding bij datum- of tijdwijziging van een geplande post (FR-031)
          const dateChanged = form.planned_date !== (post.planned_date ?? '')
          const timeChanged = form.planned_time !== (displayTime(post.planned_time) ?? '')
          if (post.status === 'gepland' && (dateChanged || timeChanged)) {
            toast({ title: 'Pas de datum ook aan in LinkedIn', variant: 'default' })
          }
        },
      },
    )
  }

  // Ctrl/Cmd+S opent opslaan (FR-026)
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form, post])

  const handleStatusChange = (next: string) => {
    const nextStatus = next as ContentStatus
    const check = validateStatusChange(
      {
        body: form.body,
        planned_date: form.planned_date || null,
        planned_time: form.planned_time || null,
        linkedin_url: form.linkedin_url || null,
        status: form.status,
      },
      nextStatus,
    )
    if (!check.ok) {
      toast({ title: 'Status niet gewijzigd', description: check.reason })
      return
    }
    setForm((f) => ({ ...f, status: nextStatus }))
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(form.body)
      toast({ title: 'Posttekst gekopieerd', description: 'De volledige tekst staat op het klembord.' })
    } catch {
      toast({ title: 'Kopiëren mislukt', description: 'Kon het klembord niet gebruiken.', variant: 'destructive' })
    }
  }

  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: (result) => {
        setConfirmDelete(false)
        if (!result.success) {
          toast({ title: 'Verwijderen mislukt', description: result.error, variant: 'destructive' })
          return
        }
        toast({ title: 'Post verwijderd' })
        onOpenChange(false)
      },
    })
  }

  const formatOptions: { value: string; label: string }[] = (
    ['tekst', 'afbeelding', 'carrousel', 'video', 'poll'] as ContentFormat[]
  ).map((f) => ({ value: f, label: formatLabel(f) }))

  const statusOptions: { value: string; label: string }[] = (
    ['idee', 'concept', 'klaar', 'gepland', 'live'] as ContentStatus[]
  ).map((s) => ({ value: s, label: statusLabel(s) }))

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose() }}>
        <div className="w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Post bewerken</DialogTitle>
            <DialogDescription>
              {post.status === 'gepland' && post.scheduled_on_linkedin_at
                ? `Ingepland in LinkedIn op ${new Date(post.scheduled_on_linkedin_at).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}.`
                : 'Publiceren doe je zelf in LinkedIn; hier plan, schrijf en houd je bij.'}
            </DialogDescription>
          </DialogHeader>
          <DialogContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Titel (intern, verplicht)</label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Contentsoort</label>
                <Select
                  value={form.pillar_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, pillar_id: v }))}
                  options={[{ value: '', label: 'Geen soort' }, ...pillarOptions]}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Format</label>
                <Select
                  value={form.format}
                  onValueChange={(v) => setForm((f) => ({ ...f, format: v as ContentFormat }))}
                  options={formatOptions}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={handleStatusChange} options={statusOptions} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Datum</label>
                  <Input
                    type="date"
                    value={form.planned_date}
                    onChange={(e) => setForm((f) => ({ ...f, planned_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Tijd</label>
                  <Input
                    type="time"
                    value={form.planned_time}
                    onChange={(e) => setForm((f) => ({ ...f, planned_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Posttekst</label>
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
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  className="min-h-[180px]"
                  placeholder="De volledige LinkedIn-tekst…"
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
                <label className="text-xs font-medium text-muted-foreground">Bron-URL</label>
                <Input
                  type="url"
                  value={form.source_url}
                  onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">LinkedIn-URL</label>
                <Input
                  type="url"
                  value={form.linkedin_url}
                  onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                  placeholder="https://www.linkedin.com/…"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Notities</label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="min-h-[60px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Verwijderen
              </button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={requestClose}>
                  Sluiten
                </Button>
                <Button type="button" onClick={handleSave} disabled={updatePost.isPending}>
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
            <DialogTitle>Post verwijderen?</DialogTitle>
          </DialogHeader>
          <DialogContent>
            <p className="text-sm text-muted-foreground">
              Wil je &quot;{post.title}&quot; definitief verwijderen? Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                Annuleren
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deletePost.isPending}>
                Verwijderen
              </Button>
            </div>
          </DialogContent>
        </div>
      </Dialog>
    </>
  )
}