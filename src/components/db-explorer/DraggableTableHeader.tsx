'use client'

import { useDndContext, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { useMemo } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { ColumnInfo } from '@/lib/db/introspect'

interface DraggableTableHeaderProps {
  columns: ColumnInfo[]
  onReorder: (newOrder: string[]) => void
}

function SortableTh({ column, onReorder }: { column: ColumnInfo; onReorder: (newOrder: string[]) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.name })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="text-left px-3 py-2 font-medium text-muted-foreground select-none whitespace-nowrap"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 opacity-40 flex-shrink-0" />
        <span>{column.name}</span>
      </div>
    </th>
  )
}

export function DraggableTableHeader({ columns, onReorder }: DraggableTableHeaderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const columnNames = useMemo(() => columns.map((c) => c.name), [columns])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = columnNames.indexOf(String(active.id))
    const newIndex = columnNames.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    const newOrder = arrayMove(columnNames, oldIndex, newIndex)
    onReorder(newOrder)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={columnNames} strategy={horizontalListSortingStrategy}>
        <tr className="bg-muted/50">
          {columns.map((col) => (
            <SortableTh key={col.name} column={col} onReorder={onReorder} />
          ))}
        </tr>
      </SortableContext>
    </DndContext>
  )
}