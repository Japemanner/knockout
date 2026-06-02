'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { updateCard, deleteCard, toggleArchiveCard } from '@/actions/cards'
import { toggleStar } from '@/actions/starred'
import { Star, Trash2, Archive, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
  }
  onUpdated: () => void
}

export function CardDetailModal({ open, onOpenChange, card, onUpdated }: CardDetailModalProps) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [url, setUrl] = useState(card.url ?? '')
  const [deadline, setDeadline] = useState(card.deadline?.split('T')[0] ?? '')
  const [isStarred, setIsStarred] = useState(card.is_starred)
  const [isSaving, setIsSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const { toast } = useToast()

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
      onUpdated()
    }
    setIsSaving(false)
  }

  const handleToggleStar = async () => {
    const newVal = !isStarred
    setIsStarred(newVal)
    await toggleStar({ cardId: card.id, isStarred: newVal })
    onUpdated()
  }

  const handleArchive = async () => {
    await toggleArchiveCard(card.id)
    toast({ title: card.is_archived ? 'Kaart hersteld' : 'Kaart gearchiveerd' })
    onUpdated()
    onOpenChange(false)
  }

  const handleDelete = async () => {
    await deleteCard(card.id)
    toast({ title: 'Kaart verwijderd' })
    onUpdated()
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
              <Button variant="ghost" size="sm" onClick={handleArchive}>
                <Archive className="h-4 w-4 mr-1" />
                {card.is_archived ? 'Herstellen' : 'Archiveren'}
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
