'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CreateCrudDialog } from '@/components/crud/CreateCrudDialog'
import { useToast } from '@/components/ui/toast'
import { createCrudOverview, getConnectionsForUser } from '@/actions/crud-overviews'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CreateCrudButtonProps {
  overviews: { id: string; name: string }[]
}

export function CreateCrudButton({ overviews }: CreateCrudButtonProps) {
  const [open, setOpen] = useState(false)
  const [connections, setConnections] = useState<{ id: string; name: string }[]>([])
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      getConnectionsForUser().then((result) => {
        if (result.error) {
          toast({ title: 'Fout', description: result.error, variant: 'destructive' })
        } else {
          setConnections(result.connections)
        }
      })
    }
  }, [open, toast])

  const handleCreate = useCallback(async (data: { name: string; connection_id: string | null }): Promise<{ id: string; error?: string }> => {
    const result = await createCrudOverview(data)
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
      return { id: '', error: result.error }
    }
    setOpen(false)
    router.refresh()
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
        allOverviews={overviews}
        connections={connections}
        onCreate={handleCreate}
      />
    </>
  )
}