'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'

interface AddColumnFormProps {
  onAddColumn: (name: string) => Promise<void>
}

export function AddColumnForm({ onAddColumn }: AddColumnFormProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  if (!adding) {
    return (
      <Button
        variant="ghost"
        className="min-w-[280px] flex-shrink-0 h-12 border-2 border-dashed"
        onClick={() => setAdding(true)}
      >
        <Plus className="h-4 w-4 mr-2" /> Kolom toevoegen
      </Button>
    )
  }

  return (
    <div className="min-w-[280px] max-w-[320px] flex-shrink-0 bg-card border rounded-lg p-3">
      <Input
        autoFocus
        placeholder="Kolomnaam..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onAddColumn(name.trim())
            setName('')
            setAdding(false)
          }
          if (e.key === 'Escape') setAdding(false)
        }}
        className="mb-2"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={async () => {
          await onAddColumn(name.trim())
          setName('')
          setAdding(false)
        }}>Toevoegen</Button>
        <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Annuleren</Button>
      </div>
    </div>
  )
}