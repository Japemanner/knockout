import { Skeleton } from '@/components/ui/skeleton'

export default function BoardDetailLoading() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh] items-start">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="min-w-[280px] max-w-[320px] flex-shrink-0 bg-muted/50 rounded-lg p-3 space-y-3">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-20 w-full rounded-md" />
            ))}
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ))}
        <Skeleton className="min-w-[280px] h-12 border-2 border-dashed rounded-md" />
      </div>
    </div>
  )
}