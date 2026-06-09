'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'

export function BoardHeader({
  boardName,
  onDeleteClick,
}: {
  boardName: string
  onDeleteClick: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Link href="/boards" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">{boardName}</h1>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onDeleteClick}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4 mr-1" /> Verwijderen
      </Button>
    </div>
  )
}