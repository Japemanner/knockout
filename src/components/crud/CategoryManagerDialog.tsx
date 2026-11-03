'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  createCrudCategory,
  renameCrudCategory,
  deleteCrudCategory,
} from '@/actions/crud-categories'
import { Pencil, Settings2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CategoryWithCount {
  id: string
  name: string
  overviewCount: number
}

interface CategoryManagerDialogProps {
  categories: CategoryWithCount[]
  activeCategoryId: string | null
}

function countLabel(count: number) {
  return count === 1 ? '1 overzicht' : `${count} overzichten`
}

export function CategoryManagerDialog({ categories, activeCategoryId }: CategoryManagerDialogProps) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const resetTransientState = () => {
    setNewName('')
    setCreateError('')
    setRenameTarget(null)
    setRenameValue('')
    setRenameError('')
    setDeleteTarget(null)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetTransientState()
  }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) {
      setCreateError('Vul een naam in')
      return
    }
    setCreateError('')
    setIsCreating(true)
    const result = await createCrudCategory({ name })
    setIsCreating(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    setNewName('')
    toast({ title: 'Categorie aangemaakt', description: `"${name}"` })
    router.refresh()
  }

  const startRename = (category: { id: string; name: string }) => {
    setRenameTarget(category)
    setRenameValue(category.name)
    setRenameError('')
  }

  const cancelRename = () => {
    setRenameTarget(null)
    setRenameValue('')
    setRenameError('')
  }

  const handleRename = async () => {
    if (!renameTarget) return
    const name = renameValue.trim()
    if (!name) {
      setRenameError('Vul een naam in')
      return
    }
    setRenameError('')
    setIsRenaming(true)
    const result = await renameCrudCategory({ categoryId: renameTarget.id, name })
    setIsRenaming(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    setRenameTarget(null)
    setRenameValue('')
    toast({ title: 'Hernoemd', description: `De categorie heet nu "${name}"` })
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setIsDeleting(true)
    const result = await deleteCrudCategory({ categoryId: target.id })
    setIsDeleting(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    setDeleteTarget(null)
    toast({ title: 'Categorie verwijderd', description: 'De overzichten zijn ongecategoriseerd behouden' })
    if (target.id === activeCategoryId) {
      router.push('/crud')
    } else {
      router.refresh()
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4 mr-2" /> Categorieën beheren
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTarget ? 'Categorie verwijderen?' : 'Categorieën beheren'}</DialogTitle>
          </DialogHeader>

          {deleteTarget ? (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Weet je zeker dat je &quot;{deleteTarget.name}&quot; wilt verwijderen? De overzichten in deze
                categorie blijven bestaan en worden ongecategoriseerd.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                  Annuleren
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? 'Verwijderen...' : 'Verwijderen'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label htmlFor="new-category-name" className="text-sm font-medium">
                  Nieuwe categorie
                </label>
                <div className="flex gap-2">
                  <Input
                    id="new-category-name"
                    placeholder="Naam voor de nieuwe categorie..."
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value)
                      if (createError) setCreateError('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isCreating) handleCreate()
                    }}
                  />
                  <Button onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? 'Toevoegen...' : 'Toevoegen'}
                  </Button>
                </div>
                {createError && <p className="text-xs text-destructive">{createError}</p>}
              </div>

              <div className="border-t pt-4">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nog geen categorieën. Maak je eerste categorie hierboven aan.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-[45vh] overflow-y-auto">
                    {categories.map((category) => (
                      <li key={category.id} className="rounded-md border px-3 py-2">
                        {renameTarget?.id === category.id ? (
                          <div className="space-y-2">
                            <Input
                              autoFocus
                              aria-label={`Nieuwe naam voor ${category.name}`}
                              value={renameValue}
                              onChange={(e) => {
                                setRenameValue(e.target.value)
                                if (renameError) setRenameError('')
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isRenaming) handleRename()
                                if (e.key === 'Escape') {
                                  e.stopPropagation()
                                  cancelRename()
                                }
                              }}
                            />
                            {renameError && <p className="text-xs text-destructive">{renameError}</p>}
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={cancelRename} disabled={isRenaming}>
                                Annuleren
                              </Button>
                              <Button size="sm" onClick={handleRename} disabled={isRenaming}>
                                {isRenaming ? 'Opslaan...' : 'Opslaan'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium break-words">{category.name}</p>
                              <p className="text-xs text-muted-foreground">{countLabel(category.overviewCount)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Hernoemen: ${category.name}`}
                                onClick={() => startRename(category)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Verwijderen: ${category.name}`}
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteTarget({ id: category.id, name: category.name })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
