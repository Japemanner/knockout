'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { availableOps, filterKindForColumn, isFilterComplete } from '@/lib/column-filters'
import type { ColumnFilter, ColumnFilterOp } from '@/types/database.types'
import type { ColumnInfo } from '@/lib/db/introspect'

interface ColumnFilterPopoverProps {
  column: ColumnInfo
  filter: ColumnFilter | undefined
  onChange: (filter: ColumnFilter | undefined) => void
}

const OP_LABELS: Record<ColumnFilterOp, string> = {
  contains: 'bevat',
  equals: 'is gelijk aan',
  gt: 'groter dan',
  gte: 'groter of gelijk',
  lt: 'kleiner dan',
  lte: 'kleiner of gelijk',
  between: 'tussen',
  is_true: 'ja',
  is_false: 'nee',
}

export function ColumnFilterPopover({ column, filter, onChange }: ColumnFilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const kind = filterKindForColumn(column)
  const ops = availableOps(kind)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const currentOp: ColumnFilterOp = filter?.op ?? ops[0] ?? 'contains'

  const setOp = (op: ColumnFilterOp) => {
    if (op === 'is_true' || op === 'is_false') {
      onChange({ op })
      return
    }
    onChange({ op, value: '', ...(op === 'between' ? { value2: '' } : {}) })
  }

  const setValue = (key: 'value' | 'value2', raw: string) => {
    if (!filter) return
    const v = kind === 'number' ? (raw === '' ? '' : Number(raw)) : raw
    onChange({ ...filter, [key]: v } as ColumnFilter)
  }

  const clear = () => {
    onChange(undefined)
    setOpen(false)
  }

  const inputType = kind === 'number' ? 'number' : kind === 'date' ? 'date' : 'text'

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        aria-label={`Filter op ${column.name}`}
        className={(filter && isFilterComplete(filter))
          ? 'text-foreground'
          : 'text-muted-foreground/40 hover:text-muted-foreground'}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 top-full left-0 mt-1 p-3 w-64 rounded-lg border bg-background shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Filter: {column.name}</span>
            {filter && isFilterComplete(filter) && (
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={clear}>
                Wissen
              </button>
            )}
          </div>

          {kind === 'boolean' ? (
            <Select
              value={currentOp}
              onValueChange={(v) => setOp(v as ColumnFilterOp)}
              options={ops.map((op) => ({ value: op, label: OP_LABELS[op] }))}
            />
          ) : (
            <div className="space-y-2">
              <Select
                value={currentOp}
                onValueChange={(v) => setOp(v as ColumnFilterOp)}
                options={ops.map((op) => ({ value: op, label: OP_LABELS[op] }))}
              />
              {currentOp !== 'is_true' && currentOp !== 'is_false' && (
                <Input
                  type={inputType}
                  value={String(filter?.value ?? '')}
                  onChange={(e) => setValue('value', e.target.value)}
                  placeholder={kind === 'text' ? 'Zoekterm...' : ''}
                  className="h-8 text-sm"
                />
              )}
              {currentOp === 'between' && (
                <Input
                  type={inputType}
                  value={String(filter?.value2 ?? '')}
                  onChange={(e) => setValue('value2', e.target.value)}
                  className="h-8 text-sm"
                />
              )}
            </div>
          )}

          <div className="flex justify-between mt-3 pt-2 border-t">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>Wissen</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>Klaar</Button>
          </div>
        </div>
      )}
    </div>
  )
}