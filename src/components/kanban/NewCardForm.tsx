'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface NewCardFormProps {
  onSubmit: (title: string) => void
  onCancel: () => void
}

export function NewCardForm({ onSubmit, onCancel }: NewCardFormProps) {
  const [title, setTitle] = useState('')

  return (
    <div className="space-y-2">
      <Input
        autoFocus
        placeholder="Kaarttitel..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && title.trim()) {
            onSubmit(title.trim())
            setTitle('')
          }
          if (e.key === 'Escape') onCancel()
        }}
      />
      <div className="flex gap-2">
        <button
          className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-medium"
          onClick={() => {
            if (title.trim()) {
              onSubmit(title.trim())
              setTitle('')
            }
          }}
        >
          Toevoegen
        </button>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={onCancel}
        >
          Annuleren
        </button>
      </div>
    </div>
  )
}
