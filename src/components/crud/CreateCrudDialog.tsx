'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

interface Connection {
  id: string
  name: string
}

interface CreateCrudDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allOverviews: { id: string; name: string }[]
  connections: Connection[]
  onCreate: (data: { name: string; connection_id: string | null }) => Promise<{ id: string; error?: string }>
}

export function CreateCrudDialog({ open, onOpenChange, connections, onCreate }: CreateCrudDialogProps) {
  const [name, setName] = useState('')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsLoading(true)
    const result = await onCreate({ name: name.trim(), connection_id: connectionId })
    setIsLoading(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    setName('')
    setConnectionId(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuw CRUD overzicht</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Naam</label>
            <Input
              autoFocus
              placeholder="Naam voor dit overzicht..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Supabase project</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={connectionId ?? '__local__'}
              onChange={(e) => setConnectionId(e.target.value === '__local__' ? null : e.target.value)}
            >
              <option value="__local__">Eigen project</option>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Kies &quot;Eigen project&quot; voor je eigen Supabase-database, of een externe connectie.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button onClick={handleCreate} disabled={isLoading || !name.trim()}>
              Aanmaken
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}