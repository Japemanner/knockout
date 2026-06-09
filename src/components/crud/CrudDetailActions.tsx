'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { deleteCrudOverview } from '@/actions/crud-overviews'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function CrudDetailActions({ crudId, name }: { crudId: string; name: string }) {
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteCrudOverview({ crudId })
    setIsDeleting(false)
    setShowDelete(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Verwijderd', description: `"${name}" is verwijderd` })
    router.push('/crud')
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDelete(true)}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
      </Button>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overzicht verwijderen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Weet je zeker dat je &quot;{name}&quot; wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDelete(false)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Verwijderen...' : 'Verwijderen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}