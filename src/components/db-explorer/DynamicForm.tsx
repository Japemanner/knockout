'use client'

import { useState } from 'react'
import { FormFieldMapper } from '@/components/db-explorer/FormFieldMapper'
import { Button } from '@/components/ui/button'
import type { ColumnInfo, ForeignKeyInfo } from '@/actions/external-db'

interface DynamicFormProps {
  columns: ColumnInfo[]
  foreignKeys: ForeignKeyInfo[]
  fkOptions: Record<string, { value: unknown; label: string }[]>
  initialValues: Record<string, unknown>
  onSubmit: (values: Record<string, unknown>) => void
  onCancel: () => void
}

export function DynamicForm({ columns, foreignKeys, fkOptions, initialValues, onSubmit, onCancel }: DynamicFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSubmit(values)
    setSaving(false)
  }

  const nonPkColumns = columns.filter((c) => !c.isPrimaryKey)
  const pkColumn = columns.find((c) => c.isPrimaryKey)

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      {pkColumn && initialValues[pkColumn.name] !== undefined && (
        <FormFieldMapper
          column={pkColumn}
          foreignKeys={foreignKeys}
          value={initialValues[pkColumn.name]}
          onChange={() => {}}
        />
      )}
      {nonPkColumns.map((col) => (
        <FormFieldMapper
          key={col.name}
          column={col}
          foreignKeys={foreignKeys}
          value={values[col.name]}
          onChange={(v) => setValues((prev) => ({ ...prev, [col.name]: v }))}
          fkOptions={fkOptions[col.name]}
        />
      ))}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Annuleren</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Opslaan...' : 'Opslaan'}</Button>
      </div>
    </form>
  )
}
