'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function DeleteBoardDialog({
  open,
  onOpenChange,
  boardName,
  isDeleting,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardName: string
  isDeleting: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bord verwijderen?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-2">
          Weet je zeker dat je &quot;{boardName}&quot; wilt verwijderen? Alle kolommen en kaarten worden ook verwijderd. Dit kan niet ongedaan worden gemaakt.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Verwijderen...' : 'Verwijderen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}