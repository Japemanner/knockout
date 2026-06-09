'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { deleteCrudOverview } from '@/actions/crud-overviews'
import { Table2, FormInput, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CrudOverviewCardProps {
  id: string
  name: string
  table_name: string | null
  interaction_type: 'crud' | 'formulier'
}

export function CrudOverviewCard({ id, name, table_name, interaction_type }: CrudOverviewCardProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDeleting(true)
    const result = await deleteCrudOverview({ crudId: id })
    setIsDeleting(false)
    setShowDelete(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Verwijderd', description: `"${name}" is verwijderd` })
    router.refresh()
  }

  return (
    <>
      <div className="relative group">
        <Link href={`/crud/${id}`}>
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 pr-8">
                {interaction_type === 'formulier' ? (
                  <FormInput className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Table2 className="h-5 w-5 text-muted-foreground" />
                )}
                {name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Eigen project
                {table_name && ` · ${table_name}`}
              </p>
            </CardContent>
          </Card>
        </Link>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDelete(true) }}
          className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Verwijderen"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

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