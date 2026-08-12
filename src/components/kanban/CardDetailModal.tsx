'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { updateCard, deleteCard, moveCard } from '@/actions/cards'
import { toggleStar } from '@/actions/starred'
import { Star, Trash2, ExternalLink, ArrowUp, ArrowRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Card } from '@/types/database.types'

interface KanbanColumnRef {
  id: string
  name: string
  position: number
}

interface CardDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: {
    id: string
    title: string
    description: string | null
    url: string | null
    is_starred: boolean
    is_archived: boolean
    deadline: string | null
    parent_id: string | null
    column_id: string
  }
  allCards: Card[]
  columns: KanbanColumnRef[]
  onUpdated: (updatedCard?: Card) => void
  onDeleted: (cardId: string) => void
}

export function CardDetailModal({ open, onOpenChange, card, allCards, columns, onUpdated, onDeleted }: CardDetailModalProps) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [url, setUrl] = useState(card.url ?? '')
  const [deadline, setDeadline] = useState(card.deadline?.split('T')[0] ?? '')
  const [isStarred, setIsStarred] = useState(card.is_starred)
  const [isSaving, setIsSaving] = useState(false)
  const [isMoving, setIsMoving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setTitle(card.title)
    setDescription(card.description ?? '')
    setUrl(card.url ?? '')
    setDeadline(card.deadline?.split('T')[0] ?? '')
    setIsStarred(card.is_starred)
  }, [card])

  const parentCard = useMemo(
    () => card.parent_id ? allCards.find((c) => c.id === card.parent_id) : null,
    [card.parent_id, allCards],
  )

  const subtasks = useMemo(
    () => allCards.filter((c) => c.parent_id === card.id && !c.is_archived),
    [card.id, allCards],
  )

  const nextColumn = useMemo<KanbanColumnRef | null>(() => {
    const current = columns.find((c) => c.id === card.column_id)
    const currentPos = current?.position ?? -1
    return columns
      .filter((c) => c.position > currentPos)
      .sort((a, b) => a.position - b.position)[0] ?? null
  }, [columns, card.column_id])

  const handleSave = async () => {
    setIsSaving(true)
    const result = await updateCard(card.id, {
      title,
      description: description || undefined,
      url: url || undefined,
      deadline: deadline || undefined,
    })
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
    } else {
      onUpdated(result.card)
    }
    setIsSaving(false)
  }

  const handleToggleStar = async () => {
    const newVal = !isStarred
    setIsStarred(newVal)
    const result = await toggleStar({ cardId: card.id, isStarred: newVal })
    if (result.error) {
      setIsStarred(!newVal)
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    const fullCard = allCards.find((c) => c.id === card.id)
    if (fullCard) onUpdated({ ...fullCard, is_starred: newVal })
  }

  const handleMoveNext = async () => {
    if (!nextColumn) return
    setIsMoving(true)
    const result = await moveCard(card.id, nextColumn.id, 999)
    setIsMoving(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Verplaatst', description: `Naar ${nextColumn.name}` })
    if (result.card) onUpdated(result.card)
    onOpenChange(false)
  }

  const handleDelete = async () => {
    const result = await deleteCard(card.id)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Kaart verwijderd' })
    onDeleted(card.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
            />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {parentCard && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowUp className="h-3 w-3" />
              Subtaak van:
              <span className="font-medium text-foreground">{parentCard.title}</span>
            </div>
          )}

          {subtasks.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Subtaken ({subtasks.length})
              </label>
              <div className="space-y-1">
                {subtasks.map((sub) => (
                  <div key={sub.id} className="text-sm bg-muted/50 rounded px-2 py-1 flex items-center gap-2">
                    {sub.is_starred && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />}
                    <span className="truncate">{sub.title}</span>
                    {sub.deadline && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(sub.deadline).toLocaleDateString('nl-NL')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary flex items-center gap-1 hover:underline">
              <ExternalLink className="h-3 w-3" /> {url}
            </a>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Omschrijving</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Markdown ondersteund..."
              rows={5}
              className="font-mono text-sm"
            />
            {description && (
              <div className="mt-3 p-3 bg-muted/50 rounded-md prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Deadline</label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleToggleStar}>
                <Star className={`h-4 w-4 mr-1 ${isStarred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                {isStarred ? 'Gesterd' : 'Niet gesterd'}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleMoveNext} disabled={!nextColumn || isMoving}>
                <ArrowRight className="h-4 w-4 mr-1" />
                {nextColumn ? `Naar ${nextColumn.name}` : 'Laatste kolom'}
              </Button>
              {!showDelete ? (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setShowDelete(true)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
                </Button>
              ) : (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-destructive">Zeker weten?</span>
                  <Button size="sm" variant="destructive" onClick={handleDelete}>Ja</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDelete(false)}>Nee</Button>
                </div>
              )}
            </div>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
