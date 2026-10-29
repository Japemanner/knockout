'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import {
  createCrudCategory,
  renameCrudCategory,
  deleteCrudCategory,
} from '@/actions/crud-categories'
import { Pencil, Plus, Trash2 } from 'lucide-react'

interface CategoryTabsProps {
  categories: { id: string; name: string }[]
  activeCategoryId: string | null
}

export function CategoryTabs({ categories, activeCategoryId }: CategoryTabsProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const tabClass = (active: boolean) =>
    `shrink-0 px-3 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors ${
      active ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background hover:bg-accent'
    }`

  const iconClass = 'p-0.5 rounded-full bg-background border shadow-sm text-muted-foreground'

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setIsCreating(true)
    const result = await createCrudCategory({ name })
    setIsCreating(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    setShowCreate(false)
    setNewName('')
    toast({ title: 'Categorie aangemaakt', description: `"${name}"` })
    router.refresh()
  }

  const handleRename = async () => {
    if (!renameTarget) return
    const name = renameValue.trim()
    if (!name) return
    setIsRenaming(true)
    const result = await renameCrudCategory({ categoryId: renameTarget.id, name })
    setIsRenaming(false)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    setRenameTarget(null)
    toast({ title: 'Hernoemd', description: `De categorie heet nu "${name}"` })
    router.refresh()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const result = await deleteCrudCategory({ categoryId: deleteTarget.id })
    setIsDeleting(false)
    setDeleteTarget(null)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Categorie verwijderd', description: 'De overzichten zijn ongecategoriseerd behouden' })
    if (deleteTarget.id === activeCategoryId) {
      router.push('/crud')
    } else {
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Link href="/crud" className={tabClass(activeCategoryId === null)}>
          Alle
        </Link>
        {categories.map((category) => (
          <div key={category.id} className="relative shrink-0 group">
            <Link
              href={`/crud?category=${category.id}`}
              className={tabClass(activeCategoryId === category.id)}
            >
              {category.name}
            </Link>
            <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex gap-0.5">
              <button
                type="button"
                title="Hernoemen"
                className={iconClass}
                onClick={() => {
                  setRenameTarget(category)
                  setRenameValue(category.name)
                }}
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Categorie verwijderen"
                className={iconClass}
                onClick={() => setDeleteTarget(category)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 rounded-full px-2"
          title="Nieuwe categorie"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe categorie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Naam</label>
              <Input
                autoFocus
                placeholder="Naam voor deze categorie..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newName.trim() && !isCreating) handleCreate() }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Annuleren</Button>
              <Button onClick={handleCreate} disabled={!newName.trim() || isCreating}>
                {isCreating ? 'Aanmaken...' : 'Aanmaken'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={renameTarget !== null} onOpenChange={(open) => { if (!open) setRenameTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorie hernoemen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Naam</label>
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && renameValue.trim() && !isRenaming) handleRename() }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenameTarget(null)}>Annuleren</Button>
              <Button onClick={handleRename} disabled={!renameValue.trim() || isRenaming}>
                {isRenaming ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorie verwijderen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            Weet je zeker dat je &quot;{deleteTarget?.name}&quot; wilt verwijderen? De overzichten in deze
            categorie blijven bestaan en worden ongecategoriseerd.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Verwijderen...' : 'Verwijderen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}