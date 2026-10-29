'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { syncCrudOverviewSchema } from '@/actions/crud-overviews'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SyncSchemaButtonProps {
  crudId: string
  knownColumns: string[]
}

export function SyncSchemaButton({ crudId, knownColumns }: SyncSchemaButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSync = async () => {
    setIsSyncing(true)
    const result = await syncCrudOverviewSchema({ crudId, knownColumns })
    setIsSyncing(false)
    if (!result.success) {
      toast({ title: 'Synchroniseren mislukt', description: result.error, variant: 'destructive' })
      return
    }
    if (result.added.length === 0 && result.removed.length === 0) {
      toast({ title: 'Structuur is actueel' })
    } else {
      toast({
        title: 'Structuur bijgewerkt',
        description: `${result.added.length} toegevoegd, ${result.removed.length} verwijderd`,
      })
    }
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
      <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
      Synchroniseren
    </Button>
  )
}