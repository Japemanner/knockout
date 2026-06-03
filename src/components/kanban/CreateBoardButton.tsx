'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { CreateBoardDialog } from '@/components/kanban/CreateBoardDialog'
import { useToast } from '@/components/ui/toast'
import { createBoard } from '@/actions/boards'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CreateBoardButtonProps {
  boards: { id: string; name: string }[]
}

export function CreateBoardButton({ boards }: CreateBoardButtonProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleCreateBoard = useCallback(async (name: string): Promise<{ id: string; error?: string }> => {
    const result = await createBoard({ name })
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
        <Plus className="h-4 w-4 mr-2" /> Nieuw bord
      </Button>
      <CreateBoardDialog
        open={open}
        onOpenChange={setOpen}
        allBoards={boards}
        onCreateBoard={handleCreateBoard}
      />
    </>
  )
}