'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'

interface CreateBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allBoards: { id: string; name: string }[]
  onCreateBoard: (name: string) => void
}

export function CreateBoardDialog({ open, onOpenChange, allBoards, onCreateBoard }: CreateBoardDialogProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsLoading(true)
    onCreateBoard(name.trim())
    setIsLoading(false)
    setName('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuw bord</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <Input
            autoFocus
            placeholder="Bordnaam..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          />
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
