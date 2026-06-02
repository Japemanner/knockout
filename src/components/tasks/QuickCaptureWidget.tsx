'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Link, Calendar } from 'lucide-react'
import { createCard } from '@/actions/cards'
import { useToast } from '@/components/ui/toast'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface QuickCaptureWidgetProps {
  compact?: boolean
  onCardCreated?: () => void
}

export function QuickCaptureWidget({ compact = false, onCardCreated }: QuickCaptureWidgetProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [deadline, setDeadline] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      toast({
        title: 'Titel vereist',
        description: 'Voer een titel in voor de taak',
        variant: 'destructive'
      })
      return
    }

    setIsSubmitting(true)
    
    try {
      const result = await createCard({
        title: title.trim(),
        description: description.trim() || undefined,
        url: url.trim() || undefined,
        deadline: deadline || undefined
      })

      if (result.success) {
        toast({
          title: 'Taak aangemaakt',
          description: 'De taak is toegevoegd aan je inbox'
        })
        
        // Reset form
        setTitle('')
        setDescription('')
        setUrl('')
        setDeadline('')
        
        if (onCardCreated) {
          onCardCreated()
        }
      } else {
        throw new Error(result.error || 'Kon taak niet aanmaken')
      }
    } catch (error) {
      console.error('Error creating card:', error)
      toast({
        title: 'Fout bij aanmaken',
        description: error instanceof Error ? error.message : 'Kon taak niet aanmaken',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Input
            placeholder="Snelle invoer: Wat moet er gebeuren?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <Button type="submit" size="sm" disabled={isSubmitting || !title.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Toevoegen
        </Button>
      </form>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Snelle invoer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Taak</Label>
            <Input
              id="title"
              placeholder="Wat moet er gebeuren?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              placeholder="Optionele details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="url" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                URL
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Deadline
              </Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? 'Aanmaken...' : 'Taak toevoegen'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}