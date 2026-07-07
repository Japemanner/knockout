'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  isDecimalType,
  isIntegerType,
  normalizeForDisplay,
  parseDecimalInput,
  parseIntegerInput,
} from '@/lib/decimal'
import type { ColumnInfo, ForeignKeyInfo } from '@/actions/external-db'

interface FormFieldMapperProps {
  column: ColumnInfo
  foreignKeys: ForeignKeyInfo[]
  value: unknown
  onChange: (value: unknown) => void
  fkOptions?: { value: unknown; label: string }[]
}

export function FormFieldMapper({ column, foreignKeys, value, onChange, fkOptions }: FormFieldMapperProps) {
  const [numericError, setNumericError] = useState<string | null>(null)
  const fk = foreignKeys.find((f) => f.columnName === column.name)
  const isRequired = !column.isNullable && column.defaultValue === null && !column.isPrimaryKey

  if (fk && fkOptions) {
    return (
      <div className="flex flex-col gap-1">
        <Label>{column.name}{isRequired ? ' *' : ''}</Label>
        <Select
          value={String(value ?? '')}
          onValueChange={(v) => onChange(v)}
          options={[{ value: '', label: '— Selecteer —' }, ...fkOptions.map((o) => ({ value: String(o.value), label: o.label }))]}
        />
      </div>
    )
  }

  if (column.isPrimaryKey) {
    return (
      <div className="flex flex-col gap-1">
        <Label>{column.name}</Label>
        <Input value={String(value ?? '')} disabled placeholder="(auto)" />
      </div>
    )
  }

  if (column.dataType === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
        <Label>{column.name}</Label>
      </div>
    )
  }

  const isText = ['text', 'varchar', 'character varying', 'char', 'character', 'uuid', 'json', 'jsonb'].includes(column.dataType)
  const isNumeric = ['integer', 'int', 'int4', 'smallint', 'int2', 'bigint', 'int8', 'numeric', 'decimal', 'real', 'double precision', 'float4', 'float8'].includes(column.dataType)
  const isLongText = isText && (column.maxLength ?? 0) > 500

  if (isLongText) {
    return (
      <div className="flex flex-col gap-1">
        <Label>{column.name}{isRequired ? ' *' : ''}</Label>
        <Textarea
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      </div>
    )
  }

  if (isText || isNumeric || fk) {
    const decimalType = isDecimalType(column.dataType)
    const integerType = isIntegerType(column.dataType)
    const isNumericType = decimalType || integerType
    const displayValue = decimalType ? normalizeForDisplay(value) : (value === null || value === undefined ? '' : String(value))

    const handleNumericChange = (raw: string) => {
      const result = decimalType
        ? parseDecimalInput(raw, column.isNullable)
        : integerType
          ? parseIntegerInput(raw, column.isNullable)
          : null
      if (result) {
        setNumericError(result.ok ? null : result.error)
        onChange(result.ok ? result.value : null)
      } else {
        onChange(raw)
      }
    }

    return (
      <div className="flex flex-col gap-1">
        <Label>{column.name}{isRequired ? ' *' : ''}</Label>
        <Input
          type={isNumericType ? 'text' : 'text'}
          inputMode={decimalType ? 'decimal' : integerType ? 'numeric' : undefined}
          value={isNumericType ? displayValue : String(value ?? '')}
          onChange={(e) => isNumericType ? handleNumericChange(e.target.value) : onChange(e.target.value)}
          required={isRequired}
        />
        {numericError && <p className="text-xs text-destructive mt-1">{numericError}</p>}
      </div>
    )
  }

  const isDate = ['date', 'timestamp', 'timestamp without time zone', 'timestamp with time zone', 'timestamptz'].includes(column.dataType)

  if (isDate) {
    return (
      <div className="flex flex-col gap-1">
        <Label>{column.name}{isRequired ? ' *' : ''}</Label>
        <Input
          type={column.dataType === 'date' ? 'date' : 'datetime-local'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Label>{column.name}</Label>
      <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
