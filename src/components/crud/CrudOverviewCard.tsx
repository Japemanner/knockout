'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { deleteCrudOverview, setCrudOverviewCategory } from '@/actions/crud-overviews'
import { Table2, FormInput, Trash2, FolderInput, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CrudOverviewCardProps {
  id: string
  name: string
  table_name: string | null
  interaction_type: 'crud' | 'formulier'
  categories: { id: string; name: string }[]
  category_id: string | null
}

export function CrudOverviewCard({ id, name, table_name, interaction_type, categories, category_id }: CrudOverviewCardProps) {
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [isMoving, setIsMoving] = useState<string | null>(null)
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

  const handleMove = async (targetCategoryId: string | null) => {
    setIsMoving(targetCategoryId ?? '')
    const result = await setCrudOverviewCategory({ crudId: id, categoryId: targetCategoryId })
    setIsMoving(null)
    setShowMove(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    const targetName = targetCategoryId
      ? categories.find((c) => c.id === targetCategoryId)?.name
      : 'Geen categorie'
    toast({ title: 'Verplaatst', description: `"${name}" hoort nu bij "${targetName}"` })
    router.refresh()
  }

  return (
    <>
      <div className="relative group">
        <Link href={`/crud/${id}`}>
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 pr-16">
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
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {categories.length > 0 && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMove(true) }}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
              title="Verplaatsen naar categorie"
            >
              <FolderInput className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDelete(true) }}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            title="Verwijderen"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={showMove} onOpenChange={setShowMove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verplaatsen naar categorie</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mt-2">
            <button
              type="button"
              onClick={() => handleMove(null)}
              disabled={isMoving !== null}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors ${
                category_id === null
                  ? 'border-primary bg-primary/10 font-medium'
                  : 'border-input bg-background hover:bg-accent'
              }`}
            >
              Geen categorie
              {category_id === null && <Check className="h-4 w-4" />}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleMove(c.id)}
                disabled={isMoving !== null}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md border text-sm transition-colors ${
                  category_id === c.id
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-input bg-background hover:bg-accent'
                }`}
              >
                {c.name}
                {category_id === c.id && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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