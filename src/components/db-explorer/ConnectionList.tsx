'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createConnection, deleteConnection, testConnectionAction } from '@/actions/db-connections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { Plus, Trash2, LinkIcon, CheckCircle2, XCircle } from 'lucide-react'

export function ConnectionList({ connections, onRefresh }: {
  connections: { id: string; name: string; created_at: string }[]
  onRefresh: () => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [connStr, setConnStr] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({})
  const { toast } = useToast()
  const router = useRouter()

  const handleAdd = useCallback(async () => {
    if (!name.trim() || !connStr.trim()) return
    setIsSaving(true)
    const result = await createConnection({ name: name.trim(), connectionString: connStr.trim() })
    if (result.error) {
      toast({ title: 'Fout', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Connectie toegevoegd' })
      setName('')
      setConnStr('')
      setShowAdd(false)
      onRefresh()
    }
    setIsSaving(false)
  }, [name, connStr, toast, onRefresh])

  const handleTest = useCallback(async (id: string) => {
    setTestResults((prev) => ({ ...prev, [id]: null }))
    const result = await testConnectionAction({ connectionId: id })
    setTestResults((prev) => ({ ...prev, [id]: result.success }))
    toast({ title: result.success ? 'Connectie OK' : 'Geen verbinding', variant: result.success ? undefined : 'destructive' })
  }, [toast])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Weet je zeker dat je deze connectie wilt verwijderen?')) return
    await deleteConnection({ connectionId: id })
    onRefresh()
  }, [onRefresh])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Database Connecties</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Toevoegen
        </Button>
      </div>

      <div className="space-y-2">
        {connections.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nog geen connecties. Voeg een externe PostgreSQL-database toe.</p>
        ) : (
          connections.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <button
                className="flex-1 text-left font-medium text-sm hover:text-primary"
                onClick={() => router.push(`/settings/db/${c.id}`)}
              >
                {c.name}
              </button>
              {testResults[c.id] !== undefined && (
                testResults[c.id] === null
                  ? <span className="text-xs text-muted-foreground">Testen...</span>
                  : testResults[c.id]
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <XCircle className="h-4 w-4 text-destructive" />
              )}
              <Button variant="ghost" size="sm" onClick={() => handleTest(c.id)}>Test</Button>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nieuwe database connectie</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <Input placeholder="Naam (bv. Klant-DB)" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="postgresql://user:pass@host:5432/dbname" value={connStr} onChange={(e) => setConnStr(e.target.value)} />
            <p className="text-xs text-muted-foreground">De connection string wordt versleuteld opgeslagen.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Annuleren</Button>
              <Button onClick={handleAdd} disabled={isSaving || !name.trim() || !connStr.trim()}>
                {isSaving ? 'Opslaan...' : 'Opslaan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
