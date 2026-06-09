'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { CreateCrudDialog } from '@/components/crud/CreateCrudDialog'
import { useToast } from '@/components/ui/toast'
import { createCrudOverview } from '@/actions/crud-overviews'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CreateCrudButtonProps {
  overviews: { id: string; name: string }[]
}

export function CreateCrudButton({ overviews }: CreateCrudButtonProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreate = useCallback(async (data: {
    name: string
    table_name: string
    interaction_type: 'crud' | 'formulier'
  }): Promise<{ id: string; error?: string }> => {
    const result = await createCrudOverview({
      name: data.name,
      connection_id: null,
      table_name: data.table_name,
      interaction_type: data.interaction_type,
    })
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return { id: '', error: result.error }
    }
    setOpen(false)
    router.push(`/crud/${result.id}`)
    return { id: result.id }
  }, [toast, router])

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" /> Nieuwe CRUD
      </Button>
      <CreateCrudDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={handleCreate}
      />
    </>
  )
}